import { NextResponse } from "next/server";

function getCorsOrigins() {
  const environment = process.env.ENVIRONMENT || "development";
  if (environment !== "production") {
    return "*";
  }

  const corsOrigins = process.env.CORS_ORIGINS || "http://localhost:3000";
  if (corsOrigins === "*") {
    return "*";
  }
  return corsOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);
}

export function buildCorsHeaders(request) {
  const origin = request.headers.get("origin");
  const allowed = getCorsOrigins();
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Stripe-Signature",
    "Access-Control-Allow-Credentials": "true"
  };

  if (!origin) {
    return headers;
  }

  if (allowed === "*") {
    headers["Access-Control-Allow-Origin"] = origin;
    return headers;
  }

  if (Array.isArray(allowed) && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function withCors(response, request, extraHeaders = {}) {
  const corsHeaders = buildCorsHeaders(request);
  Object.entries({ ...corsHeaders, ...extraHeaders }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function jsonResponse(request, payload, { status = 200, headers = {} } = {}) {
  const response = NextResponse.json(payload, { status });
  return withCors(response, request, headers);
}

export function noContent(request) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, request);
}
