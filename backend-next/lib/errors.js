import { jsonResponse } from "./response.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(request, error) {
  if (error instanceof ApiError) {
    return jsonResponse(request, { detail: error.message }, { status: error.status });
  }

  console.error("Unhandled API error:", error);
  return jsonResponse(request, { detail: "Internal server error" }, { status: 500 });
}
