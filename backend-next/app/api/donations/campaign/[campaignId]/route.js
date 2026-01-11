import { getDb } from "../../../../../lib/mongodb.js";
import { jsonResponse, noContent } from "../../../../../lib/response.js";
import { errorResponse } from "../../../../../lib/errors.js";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const campaignId = params.campaignId;

    const donations = await db
      .collection("donations")
      .find({ campaign_id: campaignId, payment_status: "paid" }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();

    const donorWall = donations.map((donation) => ({
      name: donation.anonymous ? "Anonymous" : donation.donor_name || "Anonymous",
      amount: donation.amount,
      date: donation.created_at,
      anonymous: donation.anonymous || false
    }));

    return jsonResponse(request, { success: true, data: donorWall });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
