import { MongoClient } from "mongodb";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "funded_db";

let clientPromise;
const globalWithMongo = global;

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(mongoUrl);
  globalWithMongo._mongoClientPromise = client.connect();
}

clientPromise = globalWithMongo._mongoClientPromise;

let initialized = false;

async function ensureIndexes(db) {
  if (initialized) return;

  await Promise.all([
    db.collection("users").createIndex("user_id", { unique: true }),
    db.collection("users").createIndex("email", { unique: true }),
    db.collection("users").createIndex("role"),
    db.collection("user_sessions").createIndex("session_token", { unique: true }),
    db.collection("user_sessions").createIndex("user_id"),
    db.collection("user_sessions").createIndex("expires_at", { expireAfterSeconds: 0 }),
    db.collection("campaigns").createIndex("campaign_id", { unique: true }),
    db.collection("campaigns").createIndex("student_id"),
    db.collection("campaigns").createIndex("status"),
    db.collection("campaigns").createIndex({ title: "text", story: "text" }),
    db.collection("donations").createIndex("donation_id", { unique: true }),
    db.collection("donations").createIndex("campaign_id"),
    db.collection("donations").createIndex("donor_id"),
    db.collection("donations").createIndex("stripe_session_id", { unique: true, sparse: true }),
    db.collection("payment_transactions").createIndex("session_id", { unique: true }),
    db.collection("payment_transactions").createIndex("idempotency_key", { unique: true, sparse: true }),
    db.collection("student_profiles").createIndex("user_id", { unique: true }),
    db.collection("student_profiles").createIndex("verification_status")
  ]);

  initialized = true;
}

export async function getDb() {
  const client = await clientPromise;
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
}
