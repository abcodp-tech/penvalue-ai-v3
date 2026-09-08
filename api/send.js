import crypto from "node:crypto";
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
      id = "",
      brand = "Fountain pen",
      model = "",
      low = "",
      likely = "",
      high = "",
      confidence = "",
      explanation = "",
      extraPhotoRequest = "",
      language = "en"
    } = req.body || {};

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        error: "A valid customer email is required."
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error: "Email service is not configured."
      });
    }

    const translations = {
      en: {
        subject: "Your PenValue AI valuation",
        heading: "FOUNTAIN PEN VALUATION",
        hello: "Hello,",
        ready: "Thank you for using PenValue AI. Your valuation is ready.",
        range: "Estimated range:",
        likely: "Most likely value:",
        confidence: "Confidence:",
        explanation: "Valuation explanation",
        disclaimer: "This is an indicative valuation based on the photos, information provided and available market evidence. Condition and authenticity may affect the final value.",
        tagline: "Smart valuations for fountain-pen owners",
        high: "High",
        medium: "Medium",
        low: "Low"
      },

      es: {
        subject: "Tu valoración de PenValue AI",
        heading: "VALORACIÓN DE PLUMA ESTILOGRÁFICA",
        hello: "Hola,",
        ready: "Gracias por usar PenValue AI. Tu valoración está lista.",
        range: "Rango estimado:",
        likely: "Valor más probable:",
        confidence: "Confianza:",
        explanation: "Explicación de la valoración",
        disclaimer: "Esta es una valoración orientativa basada en las fotos, la información proporcionada y la evidencia de mercado disponible. El estado y la autenticidad pueden afectar al valor final.",
        tagline: "Valoraciones inteligentes para propietarios de plumas estilográficas",
        high: "Alta",
        medium: "Media",
        low: "Baja"
      },

      fr: {
        subject: "Votre estimation PenValue AI",
        heading: "ESTIMATION DE STYLO-PLUME",
        hello: "Bonjour,",
        ready: "Merci d'avoir utilisé PenValue AI. Votre estimation est prête.",
        range: "Fourchette estimée :",
        likely: "Valeur la plus probable :",
        confidence: "Niveau de confiance :",
        explanation: "Explication de l'estimation",
        disclaimer: "Cette estimation est indicative et repose sur les photos, les informations fournies et les données de marché disponibles. L'état et l'authenticité peuvent influencer la valeur finale.",
        tagline: "Estimations intelligentes pour les propriétaires de stylos-plume",
        high: "Élevée",
        medium: "Moyenne",
        low: "Faible"
      },

      de: {
        subject: "Ihre PenValue AI Bewertung",
        heading: "FÜLLFEDERHALTER-BEWERTUNG",
        hello: "Hallo,",
        ready: "Vielen Dank, dass Sie PenValue AI genutzt haben. Ihre Bewertung ist fertig.",
        range: "Geschätzte Preisspanne:",
        likely: "Wahrscheinlichster Wert:",
        confidence: "Sicherheit:",
        explanation: "Erläuterung der Bewertung",
        disclaimer: "Diese Bewertung dient als Orientierung und basiert auf den Fotos, den bereitgestellten Informationen und verfügbaren Marktdaten. Zustand und Authentizität können den endgültigen Wert beeinflussen.",
        tagline: "Intelligente Bewertungen für Füllfederhalter-Besitzer",
        high: "Hoch",
        medium: "Mittel",
        low: "Niedrig"
      },

      it: {
        subject: "La tua valutazione PenValue AI",
        heading: "VALUTAZIONE PENNA STILOGRAFICA",
        hello: "Ciao,",
        ready: "Grazie per aver utilizzato PenValue AI. La tua valutazione è pronta.",
        range: "Intervallo stimato:",
        likely: "Valore più probabile:",
        confidence: "Affidabilità:",
        explanation: "Spiegazione della valutazione",
        disclaimer: "Questa è una valutazione indicativa basata sulle foto, sulle informazioni fornite e sulle prove di mercato disponibili. Condizioni e autenticità possono influire sul valore finale.",
        tagline: "Valutazioni intelligenti per i proprietari di penne stilografiche",
        high: "Alta",
        medium: "Media",
        low: "Bassa"
      },

      pt: {
        subject: "A sua avaliação PenValue AI",
        heading: "AVALIAÇÃO DE CANETA-TINTEIRO",
        hello: "Olá,",
        ready: "Obrigado por usar o PenValue AI. A sua avaliação está pronta.",
        range: "Intervalo estimado:",
        likely: "Valor mais provável:",
        confidence: "Confiança:",
        explanation: "Explicação da avaliação",
        disclaimer: "Esta é uma avaliação indicativa baseada nas fotografias, nas informações fornecidas e nas evidências de mercado disponíveis. O estado e a autenticidade podem afetar o valor final.",
        tagline: "Avaliações inteligentes para proprietários de canetas-tinteiro",
        high: "Alta",
        medium: "Média",
        low: "Baixa"
      }
    };

    const copy = translations[language] || translations.en;

    const confidenceText =
      confidence === "High"
        ? copy.high
        : confidence === "Medium"
        ? copy.medium
        : confidence === "Low"
        ? copy.low
        : confidence;

    const penName = `${brand} ${model}`.trim();

    const customerExplanation =
  language === "de"
    ? explanation
        .replace(/Identified brand:/g, "Identifizierte Marke:")
        .replace(/Identified model:/g, "Identifiziertes Modell:")
        .replace(/Identification confidence:/g, "Identifikationssicherheit:")
        .replace(/\bUnconfirmed\b/g, "Nicht bestätigt")
        .replace(/\bHigh\b/g, "Hoch")
        .replace(/\bMedium\b/g, "Mittel")
        .replace(/\bLow\b/g, "Niedrig")
        .replace(/\bLikely:/g, "Wahrscheinlich:")
        .replace(/\bHigh:/g, "Höchstwert:")
        .replace(/\bLow:/g, "Mindestwert:")
    : explanation;

    const safeExplanation = escapeHtml(customerExplanation)
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*PenValue AI\*\*[\s\S]*$/i, "")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\n\s*-\s+/g, "\n• ")
  .replace(/\n{2,}/g, "\n\n");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from: "PenValue AI <onboarding@resend.dev>",
        to: [email],
        subject: `${copy.subject} - ${penName}`,

        html: `
          <div style="margin:0;background:#f4f1e8;padding:24px 12px;font-family:Arial,sans-serif;color:#172033;">
            <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #d8cfb8;border-radius:14px;overflow:hidden;">

              <div style="background:#0d2340;padding:26px;text-align:center;">
                <div style="color:#d6ad55;font-size:28px;font-weight:bold;">PV</div>
                <h1 style="margin:6px 0;color:#ffffff;">PenValue AI</h1>
                <p style="margin:0;color:#d6ad55;letter-spacing:2px;">${copy.heading}</p>
              </div>

              <div style="padding:26px;">
                <p>${copy.hello}</p>
                <p>${copy.ready}</p>

                <h2 style="color:#0d2340;">
                  ${escapeHtml(penName)}
                </h2>

                <div style="background:#f7f4ec;border-left:5px solid #d6ad55;padding:16px;border-radius:6px;">
                  <p>
                    <strong>${copy.range}</strong>
                    £${escapeHtml(low)} - £${escapeHtml(high)}
                  </p>

                  <p>
                    <strong>${copy.likely}</strong>
                    £${escapeHtml(likely)}
                  </p>

                  <p>
                    <strong>${copy.confidence}</strong>
                    ${escapeHtml(confidenceText)}
                  </p>
                </div>

                <h3 style="color:#0d2340;margin-top:26px;">
                  ${copy.explanation}
                </h3>

                <div style="line-height:1.7;white-space:pre-wrap;font-size:16px;color:#172033;">
                  ${safeExplanation}
                </div>
${extraPhotoRequest ? `
<div style="margin-top:22px;padding:16px;border:1px solid #d4af37;border-radius:12px;background:#fffaf0;">
  <h3 style="margin:0 0 8px;color:#0d2a4d;">Extra photos requested</h3>
  <p style="margin:0 0 10px;">${escapeHtml(extraPhotoRequest)}</p>
  <p style="margin:0;"><strong>You can send these extra photos for one free updated valuation.</strong></p>
</div>
` : ""}
                <p style="margin-top:26px;padding-top:18px;border-top:1px solid #dddddd;font-size:12px;color:#666666;">
                  ${copy.disclaimer}
                </p>

                <p style="color:#0d2340;">
  <strong>PenValue AI</strong><br>
  ${copy.tagline}<br>
  <strong>Contact:</strong> hello.penvalueai@gmail.com
</p>
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
