function getText(data) {
  return data.output_text || data.output?.flatMap(x => x.content || [])
    .filter(x => x.type === "output_text").map(x => x.text).join("\n") || "";
}

async function ask(body, headers) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed");
  }

  return getText(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { image, images, brand, model, notes } = req.body;
    const photos = (images || [image]).filter(Boolean).slice(0, 8);

    if (!photos.length) {
      return res.status(400).json({
        error: "Please add at least one photo"
      });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    };

    const fingerprint = await ask({
      model: "gpt-5.4",
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `Act as a meticulous fountain-pen identification examiner. Inspect only the supplied photos.

User-supplied brand: ${brand || "Unknown"}
User-supplied model: ${model || "Unknown"}
User notes: ${notes || "None"}

Create a LOCKED VISUAL FINGERPRINT containing:
1. Every confirmed word, number, hallmark and logo. Quote only what is legible.
2. Cap, barrel, clip, cap-band and finial shape.
3. Nib shape, exposure or hooding, colour, visible inscriptions, feed and section.
4. Filling system, dimensions, box and accessories if visible.
5. Condition facts, separating visible damage from reflections, ink or uncertainty.
6. Up to three model candidates. For each, list matching and conflicting visible features.
7. Identification confidence: Low, Moderate or High.

Do not browse, value the pen, invent unreadable markings, or call the nib solid gold unless 14K, 18K, 585 or 750 is clearly visible. The fingerprint must describe what the photos show even if the supplied brand or model is wrong.`
        }, ...photos.map(photo => ({
          type: "input_image",
          image_url: photo
        }))]
      }]
    }, headers);

    const valuation = await ask({
      model: "gpt-5.4",
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `Act as a fountain-pen researcher and valuer. The visual examination below is locked evidence. Do not change or embellish it.

LOCKED VISUAL FINGERPRINT:
${fingerprint}

CUSTOMER DETAILS:
Brand supplied: ${brand || "Unknown"}
Model supplied: ${model || "Unknown"}
Notes: ${notes || "None"}

Search reliable manufacturer pages, specialist pen references and market evidence.

Test every candidate against the locked nib layout, clip, finial, cap, barrel, filling system and markings. Reject candidates with important conflicts. Do not let a listing title override the photographed features.

For prices, prioritize genuinely sold or completed examples of the confirmed or strongest matching model. Clearly separate sold prices from asking and dealer prices. Never use a different high-value model as a comparable.

If exact sold evidence is unavailable, say so and use a conservative range. Give source names as Markdown links.

Return these sections:
1. Likely brand and model — confirmed facts, exact-model status, ranked candidates, matches, conflicts and confidence
2. Approximate age
3. Low, likely and high value in GBP, rounded to £5
4. Condition observations
5. Why it has this value, with sold evidence separate from asking evidence
6. The single most useful missing photo, followed by other helpful details
7. Optimized eBay title and honest description
8. Optimized Vinted title and honest description
9. Sources

Be concise. Do not claim solid gold without a visible hallmark. Clearly label uncertainty.`
        }]
      }]
    }, headers);

    return res.status(200).json({ valuation });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Something went wrong"
    });
  }
}
