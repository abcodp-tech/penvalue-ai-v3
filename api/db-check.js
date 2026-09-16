import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const info = await sql`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr() AS server_address,
        inet_server_port() AS server_port,
        (SELECT COUNT(*)::int FROM submissions) AS submission_count
    `;

    return res.status(200).json(info[0]);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
