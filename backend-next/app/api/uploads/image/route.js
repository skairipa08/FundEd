import { getDb } from "../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireAuth } from "../../../../lib/auth.js";
import { getCloudinaryConfig, generateSignature } from "../../../../lib/cloudinary.js";
import crypto from "crypto";

export async function POST(request) {
  try {
    const db = await getDb();
    const user = await requireAuth(request, db);

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "general";

    if (!file || typeof file === "string") {
      throw new ApiError(400, "File is required");
    }

    const config = getCloudinaryConfig();
    if (!config) {
      throw new ApiError(503, "File uploads not configured");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new ApiError(400, `Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) {
      throw new ApiError(400, "File too large. Maximum size is 10MB");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `funded/${folder}/${user.user_id}_${crypto.randomUUID().slice(0, 8)}`;
    const params = { timestamp, public_id: publicId };
    const signature = generateSignature(params, config.apiSecret);

    const uploadForm = new FormData();
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("public_id", publicId);
    uploadForm.append("signature", signature);
    uploadForm.append("api_key", config.apiKey);
    uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      {
        method: "POST",
        body: uploadForm
      }
    );

    if (!response.ok) {
      throw new ApiError(500, "Failed to upload image");
    }

    const result = await response.json();

    return jsonResponse(request, {
      success: true,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
