import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireRole } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);

    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 50);

    const query = {};
    if (role) {
      query.role = role;
    }

    const skip = (page - 1) * limit;
    const users = await db
      .collection("users")
      .find(query, { projection: { _id: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection("users").countDocuments(query);

    return jsonResponse(request, {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
