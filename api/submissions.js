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
      const rows = await sql`
        SELECT * FROM submissions
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
        status
      } = req.body || {};

      if (!id || !name || !email) {
        return res.status(400).json({
          error: "ID, name and email are required"
        });
      }

      const rows = await sql`
        INSERT INTO submissions (
          id, name, email, brand, model, source,
                question, notes, photo_count, photo_data, ai_valuation, status
        )
        VALUES (
          ${id}, ${name}, ${email}, ${brand || null},
          ${model || null}, ${source || null},
          ${question || null}, ${notes || null},
                ${Number(photoCount) || 0}, ${JSON.stringify(photoData || [])}::jsonb, ${aiValuation || null},
          ${status || "Awaiting valuation"}
        )
        ON CONFLICT (id) DO UPDATE SET
          brand = EXCLUDED.brand,
          model = EXCLUDED.model,
          ai_valuation = EXCLUDED.ai_valuation,
          status = EXCLUDED.status
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
