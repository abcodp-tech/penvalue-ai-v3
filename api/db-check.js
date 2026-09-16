import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT
        current_setting('neon.endpoint_id', true) AS endpoint_id,
        COUNT(*)::int AS submission_count
      FROM submissions
    `;

    return res.status(200).json(result[0]);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
