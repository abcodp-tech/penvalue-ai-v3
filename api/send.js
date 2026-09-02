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
    const safeExplanation = escapeHtml(explanation)
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

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
          <div style="margin:0;background:#f4f1e8;padding:24px 12px;font-family:Arial,sans-serif;color:#172033;">
  <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #d8cfb8;border-radius:14px;overflow:hidden;">
    <div style="background:#0d2340;padding:26px;text-align:center;">
      <div style="color:#d6ad55;font-size:28px;font-weight:bold;">PV</div>
      <h1 style="margin:6px 0;color:#ffffff;">PenValue AI</h1>
      <p style="margin:0;color:#d6ad55;letter-spacing:2px;">FOUNTAIN PEN VALUATION</p>
    </div>
    <div style="padding:26px;">
      <p>Hello,</p>
      <p>Thank you for using PenValue AI. Your fountain pen valuation is ready.</p>
      <h2 style="color:#0d2340;">${escapeHtml(penName)}</h2>
      <div style="background:#f7f4ec;border-left:5px solid #d6ad55;padding:16px;border-radius:6px;">
        <p><strong>Estimated range:</strong> £${escapeHtml(low)} – £${escapeHtml(high)}</p>
        <p><strong>Most likely value:</strong> £${escapeHtml(likely)}</p>
        <p><strong>Confidence:</strong> ${escapeHtml(confidence)}</p>
      </div>
      <h3 style="color:#0d2340;margin-top:26px;">Valuation explanation</h3>
      <div style="line-height:1.6;white-space:pre-wrap;">${safeExplanation}</div>
      <p style="margin-top:26px;padding-top:18px;border-top:1px solid #dddddd;font-size:12px;color:#666666;">
        This is an indicative valuation based on the submitted photographs and available market evidence. Condition and final identification may affect the selling price.
      </p>
      <p style="color:#0d2340;"><strong>PenValue AI</strong><br>Smart valuations for fountain-pen owners</p>
    </div>
  </div>
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
