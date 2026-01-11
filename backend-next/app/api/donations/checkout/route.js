import Stripe from "stripe";
import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { getCurrentUser } from "../../../../lib/auth.js";
import { createPaymentTransaction } from "../../../../lib/models.js";
import crypto from "crypto";

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    const campaignId = body?.campaign_id;
    const amountRaw = body?.amount;
    const donorName = body?.donor_name || "Anonymous";
    const donorEmail = body?.donor_email;
    const anonymous = Boolean(body?.anonymous);
    const originUrl = body?.origin_url;
    let idempotencyKey = body?.idempotency_key;

    if (!campaignId || !amountRaw) {
      throw new ApiError(400, "campaign_id and amount are required");
    }

    const amount = Number(amountRaw);
    if (Number.isNaN(amount)) {
      throw new ApiError(400, "Invalid amount");
    }
    if (amount <= 0 || amount > 100000) {
      throw new ApiError(400, "Amount must be between $0.01 and $100,000");
    }

    if (!originUrl) {
      throw new ApiError(400, "origin_url is required");
    }

    if (!idempotencyKey) {
      idempotencyKey = `${campaignId}_${amount}_${crypto.randomUUID().slice(0, 16)}`;
    }

    const existing = await db.collection("payment_transactions").findOne(
      { idempotency_key: idempotencyKey },
      { projection: { _id: 0 } }
    );

    if (existing) {
      return jsonResponse(request, {
        success: true,
        data: {
          url: existing.checkout_url,
          session_id: existing.session_id
        },
        message: "Existing checkout session returned"
      });
    }

    const campaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }
    if (campaign.status !== "active") {
      throw new ApiError(400, "Campaign is not accepting donations");
    }

    const user = await getCurrentUser(request, db);
    const donorId = user?.user_id || null;
    const resolvedDonorEmail = donorEmail || user?.email || null;

    const stripeApiKey = process.env.STRIPE_API_KEY;
    if (!stripeApiKey) {
      throw new ApiError(503, "Payment service not configured");
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: "2024-06-20" });

    const successUrl = `${originUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}&campaign_id=${campaignId}`;
    const cancelUrl = `${originUrl}/campaign/${campaignId}`;

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Donation: ${(campaign.title || "Campaign").slice(0, 50)}`,
                description: "Supporting education"
              },
              unit_amount: Math.round(amount * 100)
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: resolvedDonorEmail || undefined,
        metadata: {
          campaign_id: campaignId,
          donor_id: donorId || "",
          donor_name: donorName,
          anonymous: String(anonymous),
          idempotency_key: idempotencyKey
        }
      },
      { idempotencyKey }
    );

    const transaction = createPaymentTransaction({
      sessionId: session.id,
      campaignId,
      donorId,
      donorName,
      donorEmail: resolvedDonorEmail,
      amount,
      anonymous,
      metadata: {
        idempotency_key: idempotencyKey,
        checkout_url: session.url
      }
    });

    await db.collection("payment_transactions").insertOne({
      ...transaction,
      idempotency_key: idempotencyKey,
      checkout_url: session.url
    });

    return jsonResponse(request, {
      success: true,
      data: {
        url: session.url,
        session_id: session.id
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
