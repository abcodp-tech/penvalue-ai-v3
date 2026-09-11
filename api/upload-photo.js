import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { submissionId, photo, photoNumber } = req.body || {};

    if (!submissionId || !photo) {
      return res.status(400).json({
        error: "Submission ID and photo are required"
      });
    }

    const match = photo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!match) {
      return res.status(400).json({
        error: "Invalid photo data"
      });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const extension =
      contentType === "image/png" ? "png" :
      contentType === "image/webp" ? "webp" :
      "jpg";

    const filename =
      `penvalue/${submissionId}/photo-${photoNumber || Date.now()}.${extension}`;

    const blob = await put(filename, buffer, {
      access: "private",
      contentType,
      addRandomSuffix: true
    });

    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname
    });
  } catch (error) {
    console.error("Photo upload error:", error);

    return res.status(500).json({
      error: error.message || "Photo upload failed"
    });
  }
}
