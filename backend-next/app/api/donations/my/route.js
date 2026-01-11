import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { getCurrentUser } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request, db);

    if (!user) {
      throw new ApiError(401, "Not authenticated");
    }

    const donations = await db
      .collection("donations")
      .find({ donor_id: user.user_id, payment_status: "paid" }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();

    const enriched = [];
    for (const donation of donations) {
      const campaign = await db.collection("campaigns").findOne(
        { campaign_id: donation.campaign_id },
        { projection: { _id: 0 } }
      );
      enriched.push({ ...donation, campaign });
    }

    return jsonResponse(request, { success: true, data: enriched });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
