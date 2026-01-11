import Stripe from "stripe";
import { getDb } from "../../../../lib/mongodb.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { errorResponse } from "../../../../lib/errors.js";
import { createDonation } from "../../../../lib/models.js";
import { nowIso } from "../../../../lib/ids.js";

async function processSuccessfulPayment(db, sessionId, metadata) {
  const existingDonation = await db.collection("donations").findOne(
    { stripe_session_id: sessionId },
    { projection: { _id: 0 } }
  );

  if (existingDonation) {
    console.info(`Payment ${sessionId} already processed, skipping`);
    return;
  }

  const transaction = await db.collection("payment_transactions").findOne(
    { session_id: sessionId },
    { projection: { _id: 0 } }
  );

  if (!transaction) {
    console.error(`Transaction not found for session ${sessionId}`);
    return;
  }

  const donation = createDonation({
    campaignId: transaction.campaign_id,
    donorId: transaction.donor_id,
    donorName: transaction.donor_name || "Anonymous",
    donorEmail: transaction.donor_email,
    amount: transaction.amount,
    anonymous: transaction.anonymous,
    stripeSessionId: sessionId,
    status: "paid"
  });

  await db.collection("donations").insertOne({
    ...donation,
    stripe_payment_intent: metadata.payment_intent
  });

  await db.collection("payment_transactions").updateOne(
    { session_id: sessionId },
    {
      $set: {
        payment_status: "paid",
        stripe_payment_intent: metadata.payment_intent,
        updated_at: nowIso()
      }
    }
  );

  await db.collection("campaigns").updateOne(
    { campaign_id: transaction.campaign_id },
    {
      $inc: {
        raised_amount: transaction.amount,
        donor_count: 1
      },
      $set: { updated_at: nowIso() }
    }
  );

  const campaign = await db.collection("campaigns").findOne(
    { campaign_id: transaction.campaign_id },
    { projection: { _id: 0 } }
  );

  if (campaign && campaign.raised_amount >= campaign.target_amount) {
    await db.collection("campaigns").updateOne(
      { campaign_id: transaction.campaign_id },
      { $set: { status: "completed" } }
    );
  }

  console.info(`Successfully processed payment ${sessionId}`);
}

async function processPaymentFailure(db, sessionId) {
  await db.collection("payment_transactions").updateOne(
    { session_id: sessionId },
    { $set: { payment_status: "failed", updated_at: nowIso() } }
  );
  console.info(`Marked payment ${sessionId} as failed`);
}

async function processRefund(db, paymentIntentId, refundAmount) {
  const donation = await db.collection("donations").findOne(
    { stripe_payment_intent: paymentIntentId },
    { projection: { _id: 0 } }
  );

  if (!donation) {
    console.warn(`No donation found for refunded payment intent ${paymentIntentId}`);
    return;
  }

  await db.collection("donations").updateOne(
    { stripe_payment_intent: paymentIntentId },
    {
      $set: {
        payment_status: "refunded",
        refund_amount: refundAmount,
        refunded_at: nowIso()
      }
    }
  );

  await db.collection("campaigns").updateOne(
    { campaign_id: donation.campaign_id },
    {
      $inc: {
        raised_amount: -refundAmount,
        donor_count: -1
      },
      $set: { updated_at: nowIso() }
    }
  );

  console.info(`Processed refund for payment intent ${paymentIntentId}`);
}

export async function POST(request) {
  try {
    const stripeApiKey = process.env.STRIPE_API_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeApiKey) {
      return jsonResponse(request, { error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: "2024-06-20" });
    const signature = request.headers.get("stripe-signature");
    const payload = await request.text();

    let event;
    if (webhookSecret) {
      if (!signature) {
        return jsonResponse(request, { detail: "Missing signature" }, { status: 400 });
      }
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      console.warn("Webhook signature verification disabled - set STRIPE_WEBHOOK_SECRET for production");
      event = JSON.parse(payload);
    }

    const db = await getDb();
    const eventType = event.type;

    try {
      if (eventType === "checkout.session.completed") {
        const session = event.data.object;
        if (session.payment_status === "paid") {
          await processSuccessfulPayment(db, session.id, { payment_intent: session.payment_intent });
        }
      } else if (eventType === "checkout.session.async_payment_succeeded") {
        const session = event.data.object;
        await processSuccessfulPayment(db, session.id, { payment_intent: session.payment_intent });
      } else if (eventType === "checkout.session.async_payment_failed") {
        const session = event.data.object;
        await processPaymentFailure(db, session.id);
      } else if (eventType === "checkout.session.expired") {
        const session = event.data.object;
        await db.collection("payment_transactions").updateOne(
          { session_id: session.id },
          { $set: { payment_status: "expired", updated_at: nowIso() } }
        );
      } else if (eventType === "charge.refunded") {
        const charge = event.data.object;
        const refundAmount = (charge.amount_refunded || 0) / 100;
        await processRefund(db, charge.payment_intent, refundAmount);
      }

      return jsonResponse(request, { success: true, event_type: eventType });
    } catch (innerError) {
      console.error(`Error processing webhook ${eventType}:`, innerError);
      return jsonResponse(request, { success: false, error: innerError.message }, { status: 200 });
    }
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
