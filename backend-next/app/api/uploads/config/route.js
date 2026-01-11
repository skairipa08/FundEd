import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { getCloudinaryConfig, generateSignature } from "../../../../lib/cloudinary.js";

export async function GET(request) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);

    const config = getCloudinaryConfig();
    if (!config) {
      throw new ApiError(503, "File uploads not configured. Set CLOUDINARY_* environment variables.");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `funded/${user.user_id}`;

    const params = {
      timestamp,
      folder,
      upload_preset: "funded_uploads"
    };

    const signature = generateSignature(params, config.apiSecret);

    return jsonResponse(request, {
      success: true,
      data: {
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        signature,
        timestamp,
        folder,
        upload_url: `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
