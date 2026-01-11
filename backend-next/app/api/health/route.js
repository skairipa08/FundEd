import { jsonResponse, noContent } from "../../../lib/response.js";
import { getDb } from "../../../lib/mongodb.js";

export async function GET(request) {
  let dbStatus = "healthy";
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
  } catch (error) {
    dbStatus = "unhealthy";
  }

  return jsonResponse(request, {
    status: dbStatus === "healthy" ? "healthy" : "degraded",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
}

export async function OPTIONS(request) {
  return noContent(request);
}
