import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);

    let studentProfile = null;
    if (user.role === "student") {
      studentProfile = await db.collection("student_profiles").findOne(
        { user_id: user.user_id },
        { projection: { _id: 0 } }
      );
    }

    return jsonResponse(request, {
      success: true,
      data: {
        ...user,
        student_profile: studentProfile
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
