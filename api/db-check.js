import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const parsedUrl = new URL(databaseUrl);
    const sql = neon(databaseUrl);

    const rows = await sql`
      SELECT id, created_at
      FROM submissions
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      database_host: parsedUrl.hostname,
      submission_count: rows.length,
      submissions: rows
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
