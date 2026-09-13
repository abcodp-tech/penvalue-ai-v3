import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
 if (req.method !== "GET" && req.method !== "POST") {
  return res.status(405).send("Method not allowed");
}

try {
const params =
  req.method === "POST"
    ? typeof req.body === "string"
      ? Object.fromEntries(new URLSearchParams(req.body))
      : req.body || {}
    : req.query || {};

const { id, rating, expires, token } = params;
    const ratingNumber = Number(rating);
    const expiryTime = Number(expires);

    if (
      !id ||
      !Number.isInteger(ratingNumber) ||
      ratingNumber < 1 ||
      ratingNumber > 5 ||
      !Number.isFinite(expiryTime) ||
      !token
    ) {
      return res.status(400).send("Invalid feedback link.");
    }

    if (Date.now() > expiryTime) {
      return res.status(401).send("This feedback link has expired.");
    }

    if (!process.env.FOLLOWUP_LINK_SECRET) {
      return res.status(500).send("Feedback is not configured.");
    }

    const expectedToken = crypto
      .createHmac("sha256", process.env.FOLLOWUP_LINK_SECRET)
      .update(`${id}:${ratingNumber}:${expires}`)
      .digest("hex");

    const supplied = Buffer.from(String(token), "utf8");
    const expected = Buffer.from(expectedToken, "utf8");

    const valid =
      supplied.length === expected.length &&
      crypto.timingSafeEqual(supplied, expected);

    if (!valid) {
      return res.status(401).send("Invalid feedback link.");
    }

    const sql = neon(process.env.DATABASE_URL);
const feedbackText =
  req.method === "POST" ? String(params.feedback || "").trim().slice(0, 1000) : "";

const reviewConsent =
  req.method === "POST" && params.review_consent === "yes";
  const rows = req.method === "POST"
  ? await sql`
      UPDATE submissions
      SET
        rating = ${ratingNumber},
        feedback = ${feedbackText},
        review_consent = ${reviewConsent},
        feedback_created_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
  : await sql`
      UPDATE submissions
      SET rating = ${ratingNumber}
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length) {
      return res.status(404).send("Valuation not found.");
    }

    return res.status(200).send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Thank you — PenValue AI</title>
        </head>

        <body style="margin:0;background:#071a33;color:white;font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">

          <div style="max-width:520px;margin:auto;background:#10233f;border:1px solid #d4af37;border-radius:18px;padding:32px;">

            <h1 style="color:#d4af37;">Thank you!</h1>

            <p style="font-size:18px;">
              You rated your PenValue AI valuation
              ${ratingNumber} out of 5 stars.
            </p>

           <p style="margin-bottom:18px;">
  Your feedback helps us improve our valuations.
</p>

${req.method === "GET" ? `
<form method="POST" action="/api/feedback">

  <input type="hidden" name="id" value="${id}">
  <input type="hidden" name="rating" value="${ratingNumber}">
  <input type="hidden" name="expires" value="${expires}">
  <input type="hidden" name="token" value="${token}">

  <textarea
    name="feedback"
    placeholder="Tell us what you thought about your valuation..."
    maxlength="1000"
    style="width:100%;min-height:110px;padding:12px;border-radius:10px;border:1px solid #d4af37;box-sizing:border-box;font-size:16px;"
  ></textarea>

  <label style="display:block;margin-top:14px;font-size:14px;text-align:left;">
    <input type="checkbox" name="review_consent" value="yes">
    I’m happy for PenValue AI to use my comments as a public review.
  </label>

  <button
    type="submit"
    style="margin-top:18px;background:#d4af37;color:#071a33;border:0;padding:12px 18px;border-radius:10px;font-weight:bold;cursor:pointer;"
  >
    Send feedback
  </button>

</form>
` : `
<p style="font-size:18px;margin-top:20px;">
  Thank you — your feedback has been saved.
</p>
`}
            <a
              href="https://penvalueai.co.uk"
              style="display:inline-block;margin-top:18px;background:#d4af37;color:#071a33;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px;"
            >
              Return to PenValue AI
            </a>

          </div>

        </body>
      </html>
    `);

  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).send("Feedback could not be saved.");
  }
}
