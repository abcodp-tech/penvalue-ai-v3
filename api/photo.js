import { get } from "@vercel/blob";
import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pathname = req.query?.path;

    if (!pathname) {
      return res.status(400).json({ error: "Photo path is required" });
    }

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

    if (!pathname.startsWith("penvalue/")) {
      return res.status(400).json({ error: "Invalid photo path" });
    }

    const result = await get(pathname, {
      access: "private"
    });

    if (!result) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const { stream, blob } = result;

    res.setHeader("Content-Type", blob.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=300");

    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();
  } catch (error) {
    console.error("Private photo read error:", error);

    return res.status(500).json({
      error: error.message || "Photo could not be loaded"
    });
  }
}
