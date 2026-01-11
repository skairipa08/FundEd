import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireRole } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    const user = await requireRole(request, db, ["student", "admin"]);

    const campaigns = await db
      .collection("campaigns")
      .find({ student_id: user.user_id }, { projection: { _id: 0 } })
      .toArray();

    return jsonResponse(request, { success: true, data: campaigns });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
