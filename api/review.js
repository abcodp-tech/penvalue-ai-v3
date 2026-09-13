import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, email, rating, review } = req.body || {};

    const cleanId = String(id || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanReview = String(review || "").trim().slice(0, 1000);
    const ratingNumber = Number(rating);

    if (
      !cleanId ||
      !cleanEmail ||
      !Number.isInteger(ratingNumber) ||
      ratingNumber < 1 ||
      ratingNumber > 5 ||
      !cleanReview
    ) {
      return res.status(400).json({
        error: "Please complete all review fields."
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      UPDATE submissions
      SET
        rating = ${ratingNumber},
        feedback = ${cleanReview},
        review_consent = TRUE,
        feedback_created_at = NOW()
      WHERE id = ${cleanId}
        AND LOWER(email) = ${cleanEmail}
      RETURNING id
    `;

    if (!rows.length) {
      return res.status(404).json({
        error: "We could not match that valuation reference and email address."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thank you — your review has been saved."
    });

  } catch (error) {
    console.error("Review error:", error);

    return res.status(500).json({
      error: "Your review could not be saved. Please try again."
    });
  }
}
