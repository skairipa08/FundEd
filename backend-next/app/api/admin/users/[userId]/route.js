import { getDb } from "../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../lib/response.js";
import { requireRole } from "../../../../../lib/auth.js";
import { nowIso } from "../../../../../lib/ids.js";

export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const admin = await requireRole(request, db, ["admin"]);
    const userId = params.userId;

    if (userId === admin.user_id) {
      throw new ApiError(400, "Cannot delete yourself");
    }

    const user = await db.collection("users").findOne(
      { user_id: userId },
      { projection: { _id: 0 } }
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    await db.collection("users").updateOne(
      { user_id: userId },
      { $set: { deleted: true, deleted_at: nowIso() } }
    );

    await db.collection("user_sessions").deleteMany({ user_id: userId });

    return jsonResponse(request, { success: true, message: "User deleted" });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
