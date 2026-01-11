import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { getCurrentUser } from "../../../../lib/auth.js";
import { noContent, withCors } from "../../../../lib/response.js";

export async function POST(request) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request, db);

    if (user) {
      await db.collection("user_sessions").deleteMany({ user_id: user.user_id });
    }

    const isProduction = process.env.ENVIRONMENT === "production";
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully"
    });

    response.cookies.set({
      name: "session_token",
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 0
    });

    return withCors(response, request);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
