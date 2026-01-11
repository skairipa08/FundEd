import { jsonResponse, noContent } from "../../lib/response.js";

export async function GET(request) {
  return jsonResponse(request, {
    message: "FundEd API is running",
    version: "2.0.0",
    docs: "/docs"
  });
}

export async function OPTIONS(request) {
  return noContent(request);
}
