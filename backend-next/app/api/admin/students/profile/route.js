import { getDb } from "../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../lib/response.js";
import { requireAuth } from "../../../../../lib/auth.js";
import { createStudentProfile } from "../../../../../lib/models.js";
import { nowIso } from "../../../../../lib/ids.js";

export async function POST(request) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);
    const body = await request.json();

    const existing = await db.collection("student_profiles").findOne(
      { user_id: user.user_id },
      { projection: { _id: 0 } }
    );

    if (existing) {
      throw new ApiError(400, "Student profile already exists");
    }

    if (!body?.country || !body?.field_of_study || !body?.university) {
      throw new ApiError(400, "Missing required profile fields");
    }

    const profile = createStudentProfile({
      userId: user.user_id,
      country: body.country,
      fieldOfStudy: body.field_of_study,
      university: body.university,
      verificationDocuments: body.verification_documents || []
    });

    await db.collection("student_profiles").insertOne(profile);

    await db.collection("users").updateOne(
      { user_id: user.user_id },
      { $set: { role: "student", updated_at: nowIso() } }
    );

    return jsonResponse(request, {
      success: true,
      data: profile,
      message: "Student profile created. Awaiting verification."
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
