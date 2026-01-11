import { getDb } from "../../../../lib/mongodb.js";
import { errorResponse } from "../../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../../lib/response.js";
import { requireRole } from "../../../../lib/auth.js";

export async function GET(request) {
  try {
    const db = await getDb();
    await requireRole(request, db, ["admin"]);

    const usersCollection = db.collection("users");
    const profilesCollection = db.collection("student_profiles");
    const campaignsCollection = db.collection("campaigns");
    const donationsCollection = db.collection("donations");

    const [
      totalUsers,
      totalStudents,
      totalDonors,
      totalAdmins,
      pendingVerifications,
      verifiedStudents,
      rejectedStudents,
      totalCampaigns,
      activeCampaigns,
      completedCampaigns
    ] = await Promise.all([
      usersCollection.countDocuments({ deleted: { $ne: true } }),
      usersCollection.countDocuments({ role: "student", deleted: { $ne: true } }),
      usersCollection.countDocuments({ role: "donor", deleted: { $ne: true } }),
      usersCollection.countDocuments({ role: "admin", deleted: { $ne: true } }),
      profilesCollection.countDocuments({ verification_status: "pending" }),
      profilesCollection.countDocuments({ verification_status: "verified" }),
      profilesCollection.countDocuments({ verification_status: "rejected" }),
      campaignsCollection.countDocuments({}),
      campaignsCollection.countDocuments({ status: "active" }),
      campaignsCollection.countDocuments({ status: "completed" })
    ]);

    const donationStats = await donationsCollection
      .aggregate([
        { $match: { payment_status: "paid" } },
        {
          $group: {
            _id: null,
            total_amount: { $sum: "$amount" },
            total_donations: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const totalRaised = donationStats[0]?.total_amount || 0;
    const totalDonations = donationStats[0]?.total_donations || 0;

    return jsonResponse(request, {
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: totalStudents,
          donors: totalDonors,
          admins: totalAdmins
        },
        verifications: {
          pending: pendingVerifications,
          verified: verifiedStudents,
          rejected: rejectedStudents
        },
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns
        },
        donations: {
          total_amount: totalRaised,
          total_count: totalDonations
        }
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
