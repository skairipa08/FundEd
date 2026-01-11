import crypto from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../lib/errors.js";
import { noContent, withCors } from "../../../../../lib/response.js";
import { getGoogleConfig } from "../../../../../lib/oauth.js";
import { createSession, createUser } from "../../../../../lib/models.js";
import { nowIso } from "../../../../../lib/ids.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (!code) {
      throw new ApiError(400, "Authorization code is required");
    }

    const config = getGoogleConfig();
    if (!config) {
      throw new ApiError(503, "OAuth not configured");
    }

    const tokenResponse = await fetch(config.tokenUri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new ApiError(400, `Failed to exchange code: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new ApiError(400, "No access token received");
    }

    const userInfoResponse = await fetch(config.userinfoUri, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userInfoResponse.ok) {
      throw new ApiError(400, "Failed to get user info");
    }

    const userinfo = await userInfoResponse.json();
    const email = userinfo.email;
    const name = userinfo.name;
    const picture = userinfo.picture;

    if (!email) {
      throw new ApiError(400, "Email not provided by Google");
    }

    const db = await getDb();
    const users = db.collection("users");

    let userId;
    const existingUser = await users.findOne({ email }, { projection: { _id: 0 } });

    if (existingUser) {
      userId = existingUser.user_id;
      await users.updateOne(
        { user_id: userId },
        { $set: { name, picture, updated_at: nowIso() } }
      );
    } else {
      const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || "").toLowerCase();
      const isAdmin = initialAdminEmail && email.toLowerCase() === initialAdminEmail;
      const newUser = createUser({
        email,
        name,
        picture,
        role: isAdmin ? "admin" : "donor"
      });
      userId = newUser.user_id;
      await users.insertOne(newUser);
    }

    const sessionToken = crypto.randomBytes(64).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const session = createSession({ userId, sessionToken, expiresAt });

    await db.collection("user_sessions").deleteMany({ user_id: userId });
    await db.collection("user_sessions").insertOne(session);

    const userDoc = await users.findOne({ user_id: userId }, { projection: { _id: 0 } });

    const isProduction = process.env.ENVIRONMENT === "production";
    const response = NextResponse.json({
      success: true,
      data: userDoc,
      message: "Login successful"
    });

    response.cookies.set({
      name: "session_token",
      value: sessionToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return withCors(response, request);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
