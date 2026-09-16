import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const info = await sql`
      SELECT
        current_database() AS database,
        current_user AS user,
        COUNT(*)::int AS submission_count
      FROM submissions
    `;

    return res.status(200).json(info[0]);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
