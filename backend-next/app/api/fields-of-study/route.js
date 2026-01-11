import { FIELDS_OF_STUDY } from "../../../lib/static-data.js";
import { jsonResponse, noContent } from "../../../lib/response.js";

export async function GET(request) {
  return jsonResponse(request, { success: true, data: FIELDS_OF_STUDY });
}

export async function OPTIONS(request) {
  return noContent(request);
}
