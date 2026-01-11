import { jsonResponse, noContent } from "../../../../lib/response.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { buildGoogleAuthUrl, getGoogleConfig } from "../../../../lib/oauth.js";

export async function GET(request) {
  try {
    const config = getGoogleConfig();
    if (!config) {
      throw new ApiError(503, "OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }

    const { url, state } = buildGoogleAuthUrl(config);

    return jsonResponse(request, {
      success: true,
      data: {
        auth_url: url,
        state,
        client_id: config.clientId
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
