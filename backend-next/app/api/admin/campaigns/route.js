import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireRole } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const query = {};
    if (status) {
      query.status = status;
    }

    const campaigns = await db
      .collection("campaigns")
      .find(query, { projection: { _id: 0 } })
      .toArray();

    const enriched = [];
    for (const campaign of campaigns) {
      const student = await db.collection("users").findOne(
        { user_id: campaign.student_id },
        { projection: { _id: 0 } }
      );
      const studentProfile = await db.collection("student_profiles").findOne(
        { user_id: campaign.student_id },
        { projection: { _id: 0 } }
      );
      enriched.push({
        ...campaign,
        student,
        student_profile: studentProfile
      });
    }

    return jsonResponse(request, { success: true, data: enriched });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
