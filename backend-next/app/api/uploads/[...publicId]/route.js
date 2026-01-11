import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { getCloudinaryConfig, generateSignature } from "../../../../lib/cloudinary.js";

export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);

    const publicId = Array.isArray(params.publicId) ? params.publicId.join("/") : params.publicId;

    if (!publicId) {
      throw new ApiError(400, "public_id is required");
    }

    if (!publicId.includes(user.user_id) && user.role !== "admin") {
      throw new ApiError(403, "Cannot delete files belonging to other users");
    }

    const config = getCloudinaryConfig();
    if (!config) {
      throw new ApiError(503, "File uploads not configured");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = { timestamp, public_id: publicId };
    const signature = generateSignature(paramsToSign, config.apiSecret);

    const body = new URLSearchParams({
      timestamp: String(timestamp),
      public_id: publicId,
      signature,
      api_key: config.apiKey
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
      {
        method: "POST",
        body
      }
    );

    if (!response.ok) {
      throw new ApiError(500, "Failed to delete file");
    }

    return jsonResponse(request, { success: true, message: "File deleted successfully" });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
