import { getDb } from "../../../../../lib/mongodb.js";
import { errorResponse } from "../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../lib/response.js";
import { requireRole } from "../../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);

    const profiles = await db
      .collection("student_profiles")
      .find({ verification_status: "pending" }, { projection: { _id: 0 } })
      .toArray();

    const enriched = [];
    for (const profile of profiles) {
      const user = await db.collection("users").findOne(
        { user_id: profile.user_id },
        { projection: { _id: 0 } }
      );
      if (user) {
        enriched.push({ ...profile, user });
      }
    }

    return jsonResponse(request, { success: true, data: enriched });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
