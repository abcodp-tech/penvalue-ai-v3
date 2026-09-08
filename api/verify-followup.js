import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, expires, token } = req.body || {};

    if (!id || !expires || !token) {
      return res.status(400).json({
        valid: false,
        error: "Invalid follow-up link."
      });
    }

    const expiryTime = Number(expires);

    if (!Number.isFinite(expiryTime) || Date.now() > expiryTime) {
      return res.status(401).json({
        valid: false,
        error: "This free follow-up link has expired."
      });
    }

    if (!process.env.FOLLOWUP_LINK_SECRET) {
      return res.status(500).json({
        valid: false,
        error: "Follow-up verification is not configured."
      });
    }

    const expectedToken = crypto
      .createHmac("sha256", process.env.FOLLOWUP_LINK_SECRET)
      .update(`${id}:${expires}`)
      .digest("hex");

    const supplied = Buffer.from(String(token), "utf8");
    const expected = Buffer.from(expectedToken, "utf8");

    const valid =
      supplied.length === expected.length &&
      crypto.timingSafeEqual(supplied, expected);

    if (!valid) {
      return res.status(401).json({
        valid: false,
        error: "Invalid follow-up link."
      });
    }

    return res.status(200).json({
      valid: true,
      id
    });
  } catch (error) {
    return res.status(500).json({
      valid: false,
      error: "Follow-up verification failed."
    });
  }
}
