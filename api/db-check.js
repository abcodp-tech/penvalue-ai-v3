import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT id, created_at
      FROM submissions
      WHERE id = 'PV-604736'
    `;

    return res.status(200).json({
      found: result.length > 0,
      submission: result[0] || null
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
