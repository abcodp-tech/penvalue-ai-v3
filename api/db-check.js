import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const parsedUrl = new URL(databaseUrl);

    const sql = neon(databaseUrl);

    const info = await sql`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        (SELECT COUNT(*)::int FROM submissions) AS submission_count
    `;

    return res.status(200).json({
      ...info[0],
      database_host: parsedUrl.hostname
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
