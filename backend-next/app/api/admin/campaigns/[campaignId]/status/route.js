import { getDb } from "../../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../../lib/response.js";
import { requireRole } from "../../../../../../lib/auth.js";
import { nowIso } from "../../../../../../lib/ids.js";

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);

    const campaignId = params.campaignId;
    const body = await request.json();
    const newStatus = body?.status;
    const reason = body?.reason || "";

    if (!newStatus || !["active", "suspended", "cancelled"].includes(newStatus)) {
      throw new ApiError(400, "Invalid status");
    }

    const campaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );

    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    await db.collection("campaigns").updateOne(
      { campaign_id: campaignId },
      { $set: { status: newStatus, status_reason: reason, updated_at: nowIso() } }
    );

    return jsonResponse(request, {
      success: true,
      message: `Campaign status updated to ${newStatus}`
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
