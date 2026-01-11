import { getDb } from "../../../lib/mongodb.js";
import { errorResponse, ApiError } from "../../../lib/errors.js";
import { jsonResponse, noContent } from "../../../lib/response.js";
import { requireRole } from "../../../lib/auth.js";
import { createCampaign } from "../../../lib/models.js";

export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const country = url.searchParams.get("country");
    const fieldOfStudy = url.searchParams.get("field_of_study");
    const search = url.searchParams.get("search");
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 12);

    const query = { status: "active" };
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { story: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    const campaigns = await db
      .collection("campaigns")
      .find(query, { projection: { _id: 0 } })
      .skip(skip)
      .limit(limit)
      .toArray();

    let filteredCampaigns = campaigns;
    if (country || fieldOfStudy) {
      const next = [];
      for (const campaign of campaigns) {
        const studentProfile = await db.collection("student_profiles").findOne(
          { user_id: campaign.student_id },
          { projection: { _id: 0 } }
        );
        if (studentProfile) {
          if (country && studentProfile.country !== country) {
            continue;
          }
          if (fieldOfStudy && studentProfile.field_of_study !== fieldOfStudy) {
            continue;
          }
        }
        next.push(campaign);
      }
      filteredCampaigns = next;
    }

    const enriched = [];
    for (const campaign of filteredCampaigns) {
      const student = await db.collection("users").findOne(
        { user_id: campaign.student_id },
        { projection: { _id: 0 } }
      );
      const studentProfile = await db.collection("student_profiles").findOne(
        { user_id: campaign.student_id },
        { projection: { _id: 0 } }
      );

      enriched.push({
        ...campaign,
        student: {
          name: student?.name || "Unknown",
          picture: student?.picture || null,
          country: studentProfile?.country || null,
          field_of_study: studentProfile?.field_of_study || null,
          university: studentProfile?.university || null,
          verification_status: studentProfile?.verification_status || null
        }
      });
    }

    const total = await db.collection("campaigns").countDocuments(query);

    return jsonResponse(request, {
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        total_pages: total > 0 ? Math.ceil(total / limit) : 0
      }
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const user = await requireRole(request, db, ["student"]);
    const body = await request.json();

    const studentProfile = await db.collection("student_profiles").findOne(
      { user_id: user.user_id },
      { projection: { _id: 0 } }
    );

    if (!studentProfile) {
      throw new ApiError(400, "You must create a student profile first");
    }

    if (studentProfile.verification_status !== "verified") {
      throw new ApiError(
        403,
        `Only verified students can create campaigns. Your verification status: ${studentProfile.verification_status || "pending"}`
      );
    }

    if (!body?.title || !body?.story || !body?.category || !body?.target_amount || !body?.timeline) {
      throw new ApiError(400, "Missing required campaign fields");
    }

    const campaign = createCampaign({
      studentId: user.user_id,
      title: body.title,
      story: body.story,
      category: body.category,
      targetAmount: body.target_amount,
      timeline: body.timeline,
      impactLog: body.impact_log
    });

    await db.collection("campaigns").insertOne(campaign);

    return jsonResponse(request, {
      success: true,
      data: campaign,
      message: "Campaign created successfully"
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export async function OPTIONS(request) {
  return noContent(request);
}
