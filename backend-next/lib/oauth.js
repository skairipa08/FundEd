import crypto from "crypto";

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/callback";

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    authUri: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri: "https://oauth2.googleapis.com/token",
    userinfoUri: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"]
  };
}

export function buildGoogleAuthUrl(config) {
  const state = crypto.randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent"
  });

  return {
    url: `${config.authUri}?${params.toString()}`,
    state
  };
}
