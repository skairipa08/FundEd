import { buildId, nowIso } from "./ids.js";

export function createUser({ email, name, picture, role }) {
  const timestamp = nowIso();
  return {
    user_id: buildId("user"),
    email,
    name,
    picture: picture || null,
    role: role || "donor",
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function createSession({ userId, sessionToken, expiresAt }) {
  return {
    session_id: buildId("session"),
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt,
    created_at: nowIso()
  };
}

export function createCampaign({ studentId, title, story, category, targetAmount, timeline, impactLog }) {
  const timestamp = nowIso();
  return {
    campaign_id: buildId("campaign"),
    student_id: studentId,
    title,
    story,
    category,
    target_amount: targetAmount,
    raised_amount: 0,
    donor_count: 0,
    timeline,
    impact_log: impactLog || null,
    status: "active",
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function createDonation({ campaignId, donorId, donorName, donorEmail, amount, anonymous, stripeSessionId, status }) {
  return {
    donation_id: buildId("donation"),
    campaign_id: campaignId,
    donor_id: donorId || null,
    donor_name: donorName,
    donor_email: donorEmail || null,
    amount,
    anonymous: Boolean(anonymous),
    stripe_session_id: stripeSessionId || null,
    payment_status: status || "pending",
    created_at: nowIso()
  };
}

export function createPaymentTransaction({ sessionId, campaignId, donorId, donorName, donorEmail, amount, currency, anonymous, metadata, status }) {
  const timestamp = nowIso();
  return {
    transaction_id: buildId("txn"),
    session_id: sessionId,
    campaign_id: campaignId,
    donor_id: donorId || null,
    donor_name: donorName,
    donor_email: donorEmail || null,
    amount,
    currency: currency || "usd",
    anonymous: Boolean(anonymous),
    payment_status: status || "initiated",
    metadata: metadata || null,
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function createStudentProfile({ userId, country, fieldOfStudy, university, verificationDocuments }) {
  const timestamp = nowIso();
  return {
    profile_id: buildId("profile"),
    user_id: userId,
    country,
    field_of_study: fieldOfStudy,
    university,
    verification_status: "pending",
    verification_documents: verificationDocuments || [],
    created_at: timestamp,
    updated_at: timestamp
  };
}
