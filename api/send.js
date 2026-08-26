function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      email,
      brand = "Fountain pen",
      model = "",
      low = "",
      likely = "",
      high = "",
      confidence = "",
      explanation = ""
    } = req.body || {};

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid customer email is required." });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "Email service is not configured." });
    }

    const penName = `${brand} ${model}`.trim();
    const safeExplanation = escapeHtml(explanation).replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replaceAll("\n","<br>");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "PenValue AI <onboarding@resend.dev>",
        to: [email],
        subject: `Your PenValue AI valuation – ${penName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2b2118">
            <h1 style="color:#7a451b">PenValue AI</h1>
            <h2>Your fountain pen valuation</h2>
            <p><strong>Item:</strong> ${escapeHtml(penName)}</p>
            <p><strong>Estimated range:</strong> £${escapeHtml(low)}–£${escapeHtml(high)}</p>
            <p><strong>Likely value:</strong> £${escapeHtml(likely)}</p>
            <p><strong>Confidence:</strong> ${escapeHtml(confidence)}</p>
            <hr>
            <p>${safeExplanation}</p>
            <hr>
            <p style="font-size:12px;color:#666">
              This is an indicative valuation, not a formal authentication or guarantee.
            </p>
          </div>
        `
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: result.message || "Email could not be sent."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Valuation email sent.",
      id: result.id
    });
  } catch (error) {
    return res.status(500).json({
      error: "Email could not be sent. Please try again."
    });
  }
}
