import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { nowIso } from "../../../../lib/ids.js";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const campaignId = params.campaignId;

    const campaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );

    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    const student = await db.collection("users").findOne(
      { user_id: campaign.student_id },
      { projection: { _id: 0 } }
    );
    const studentProfile = await db.collection("student_profiles").findOne(
      { user_id: campaign.student_id },
      { projection: { _id: 0 } }
    );

    const donations = await db
      .collection("donations")
      .find({ campaign_id: campaignId, payment_status: "paid" }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const donorWall = donations.map((donation) => ({
      name: donation.anonymous ? "Anonymous" : donation.donor_name || "Anonymous",
      amount: donation.amount,
      date: donation.created_at,
      anonymous: donation.anonymous || false
    }));

    return jsonResponse(request, {
      success: true,
      data: {
        ...campaign,
        student: {
          user_id: student?.user_id || null,
          name: student?.name || "Unknown",
          email: student?.email || null,
          picture: student?.picture || null,
          country: studentProfile?.country || null,
          field_of_study: studentProfile?.field_of_study || null,
          university: studentProfile?.university || null,
          verification_status: studentProfile?.verification_status || null,
          verification_documents: studentProfile?.verification_documents || []
        },
        donors: donorWall
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);
    const campaignId = params.campaignId;
    const body = await request.json();

    const campaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );

    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.student_id !== user.user_id && user.role !== "admin") {
      throw new ApiError(403, "Not authorized to update this campaign");
    }

    const updateData = { ...body, updated_at: nowIso() };

    await db.collection("campaigns").updateOne(
      { campaign_id: campaignId },
      { $set: updateData }
    );

    const updatedCampaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );

    return jsonResponse(request, {
      success: true,
      data: updatedCampaign,
      message: "Campaign updated successfully"
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);
    const campaignId = params.campaignId;

    const campaign = await db.collection("campaigns").findOne(
      { campaign_id: campaignId },
      { projection: { _id: 0 } }
    );

    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.student_id !== user.user_id && user.role !== "admin") {
      throw new ApiError(403, "Not authorized to cancel this campaign");
    }

    await db.collection("campaigns").updateOne(
      { campaign_id: campaignId },
      {
        $set: {
          status: "cancelled",
          updated_at: nowIso()
        }
      }
    );

    return jsonResponse(request, { success: true, message: "Campaign cancelled successfully" });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
