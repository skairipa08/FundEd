import { ApiError } from "./errors.js";

export async function getCurrentUser(request, db) {
  let sessionToken = request.cookies.get("session_token")?.value;

  if (!sessionToken) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      sessionToken = authHeader.replace("Bearer ", "");
    }
  }

  if (!sessionToken) {
    return null;
  }

  const session = await db.collection("user_sessions").findOne({ session_token: sessionToken }, { projection: { _id: 0 } });

  if (!session) {
    return null;
  }

  const expiresAt = typeof session.expires_at === "string" ? new Date(session.expires_at) : session.expires_at;
  if (expiresAt && expiresAt < new Date()) {
    await db.collection("user_sessions").deleteOne({ session_token: sessionToken });
    return null;
  }

  const user = await db.collection("users").findOne(
    { user_id: session.user_id, deleted: { $ne: true } },
    { projection: { _id: 0 } }
  );

  return user || null;
}

export async function requireAuth(request, db) {
  const user = await getCurrentUser(request, db);
  if (!user) {
    throw new ApiError(401, "Not authenticated");
  }
  return user;
}

export async function requireRole(request, db, roles) {
  const user = await requireAuth(request, db);
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return user;
}
