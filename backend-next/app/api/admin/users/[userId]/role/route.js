import { getDb } from "../../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../../lib/response.js";
import { requireRole } from "../../../../../../lib/auth.js";
import { nowIso } from "../../../../../../lib/ids.js";

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const admin = await requireRole(request, db, ["admin"]);
    const userId = params.userId;
    const body = await request.json();
    const newRole = body?.role;

    if (!newRole || !["donor", "student", "admin", "institution"].includes(newRole)) {
      throw new ApiError(400, "Invalid role");
    }

    if (userId === admin.user_id && newRole !== "admin") {
      throw new ApiError(400, "Cannot demote yourself");
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
      { $set: { role: newRole, updated_at: nowIso() } }
    );

    return jsonResponse(request, {
      success: true,
      message: `User role updated to ${newRole}`
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
