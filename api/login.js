import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const savedPassword = process.env.VALUER_PASSWORD;
  const enteredPassword = String(req.body?.password || "");

  if (!savedPassword) {
    return res.status(500).json({ error: "Password is not configured" });
  }

  const saved = Buffer.from(savedPassword);
  const entered = Buffer.from(enteredPassword);

  const correct =
    saved.length === entered.length &&
    crypto.timingSafeEqual(saved, entered);

  if (!correct) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = crypto
    .createHash("sha256")
    .update(savedPassword)
    .digest("hex");

  res.setHeader(
    "Set-Cookie",
    `penvalue_auth=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  );

  return res.status(200).json({ success: true });
}
