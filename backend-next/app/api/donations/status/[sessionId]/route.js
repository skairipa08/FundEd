import { getDb } from "../../../../../lib/mongodb.js";
import { ApiError, errorResponse } from "../../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../../lib/response.js";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const sessionId = params.sessionId;

    const transaction = await db.collection("payment_transactions").findOne(
      { session_id: sessionId },
      { projection: { _id: 0 } }
    );

    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }

    return jsonResponse(request, {
      success: true,
      data: {
        status: transaction.payment_status,
        payment_status: transaction.payment_status,
        amount: transaction.amount,
        campaign_id: transaction.campaign_id
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
