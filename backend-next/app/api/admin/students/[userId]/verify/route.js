import { getDb } from "../../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../../lib/response.js";
import { requireRole } from "../../../../../../lib/auth.js";
import { nowIso } from "../../../../../../lib/ids.js";

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);
    const userId = params.userId;
    const body = await request.json();

    const action = body?.action;
    const reason = body?.reason || "";

    if (!action || !["approve", "reject"].includes(action)) {
      throw new ApiError(400, "action must be 'approve' or 'reject'");
    }

    const profile = await db.collection("student_profiles").findOne(
      { user_id: userId },
      { projection: { _id: 0 } }
    );

    if (!profile) {
      throw new ApiError(404, "Student profile not found");
    }

    const newStatus = action === "approve" ? "verified" : "rejected";

    const updateData = {
      verification_status: newStatus,
      verified_at: action === "approve" ? nowIso() : null,
      rejection_reason: action === "reject" ? reason : null,
      updated_at: nowIso()
    };

    await db.collection("student_profiles").updateOne(
      { user_id: userId },
      { $set: updateData }
    );

    if (action === "approve" && profile.verification_documents) {
      const docs = profile.verification_documents.map((doc) => ({
        ...doc,
        verified: true
      }));
      await db.collection("student_profiles").updateOne(
        { user_id: userId },
        { $set: { verification_documents: docs } }
      );
    }

    return jsonResponse(request, {
      success: true,
      message: `Student ${action}d successfully`
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
