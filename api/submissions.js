import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";
export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        source TEXT,
        question TEXT,
        notes TEXT,
        photo_count INTEGER DEFAULT 0,
        ai_valuation TEXT,
        status TEXT DEFAULT 'Awaiting valuation',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE submissions
      ADD COLUMN IF NOT EXISTS photo_data JSONB DEFAULT '[]'::jsonb
    `;

    await sql`
  ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'
`;
    await sql`
  ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS followup_used BOOLEAN DEFAULT FALSE
`;
    if (req.method === "GET") {
      const expectedToken = crypto
  .createHash("sha256")
  .update(process.env.VALUER_PASSWORD || "")
  .digest("hex");

const authCookie = (req.headers.cookie || "")
  .split(";")
  .map(item => item.trim())
  .find(item => item.startsWith("penvalue_auth="));

const receivedToken = authCookie?.split("=")[1] || "";

if (!process.env.VALUER_PASSWORD || receivedToken !== expectedToken) {
  return res.status(401).json({ error: "Password required" });
}
      const submissionId = req.query?.id;

if (submissionId) {
  const photoRows = await sql`
    SELECT *
    FROM submissions
    WHERE id = ${submissionId}
    LIMIT 1
  `;

  if (!photoRows.length) {
    return res.status(404).json({ error: "Submission not found" });
  }

  return res.status(200).json({
    submission: photoRows[0]
  });
}
     const rows = await sql`
  SELECT
    id,
    name,
    email,
    brand,
    model,
    source,
    question,
    notes,
    photo_count,
    ai_valuation,
    status,
    created_at,
    language,
    followup_used
  FROM submissions
  ORDER BY created_at DESC
`;
      return res.status(200).json({ submissions: rows });
    }

    if (req.method === "POST") {
      const {
        id,
        name,
        email,
        brand,
        model,
        source,
        question,
        notes,
        photoCount,
                photoData,
        aiValuation,
        status,
        followupUsed,
language
      } = req.body || {};

      if (!id || !name || !email) {
        return res.status(400).json({
          error: "ID, name and email are required"
        });
      }

      const rows = await sql`
        INSERT INTO submissions (
          id, name, email, brand, model, source,
                question, notes, photo_count, photo_data, ai_valuation, status, followup_used, language
        )
        VALUES (
          ${id}, ${name}, ${email}, ${brand || null},
          ${model || null}, ${source || null},
          ${question || null}, ${notes || null},
                ${Number(photoCount) || 0}, ${JSON.stringify(photoData || [])}::jsonb, ${aiValuation || null},
          ${status || "Awaiting valuation"}, ${followupUsed === true}, ${language || "en"}
        )
        ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  source = EXCLUDED.source,
  question = EXCLUDED.question,
  notes = EXCLUDED.notes,
  photo_count = EXCLUDED.photo_count,
  photo_data = EXCLUDED.photo_data,
  ai_valuation = EXCLUDED.ai_valuation,
 language = EXCLUDED.language,
status = EXCLUDED.status,
followup_used = submissions.followup_used OR EXCLUDED.followup_used
 
  RETURNING *
      `;

      return res.status(200).json({ submission: rows[0] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Database error"
    });
  }
}
