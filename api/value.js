export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { image, images, brand, model, notes } = req.body;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.4",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `You are a fountain pen valuation expert.

Identify and value this fountain pen from the photo and details.

Brand supplied: ${brand || "Unknown"}
Model supplied: ${model || "Unknown"}
Notes: ${notes || "None"}

Give:
1. Likely brand and model
2. Approximate age
3. Low, likely and high value in GBP
4. Condition observations
5. Why it has this value
6. What additional photos/details would improve confidence
7. An optimized eBay title and description
8. An optimized Vinted title and description
Important accuracy rules:
- Separate confirmed facts from visual guesses.
- Only name an exact model when markings or distinctive features clearly confirm it.
- Otherwise state: "Exact model not confirmed" and give up to 3 possible models.
- Give a confidence level: Low, Moderate or High.
- Use conservative, repeatable GBP price ranges rounded to the nearest £5.
- Do not claim to have checked live listings or sold prices.
- Do not describe reflections, shadows, dried ink or unclear areas as damage.
- If condition cannot be confirmed from the photos, say it is uncertain.
- Do not call a nib solid gold unless a clear gold hallmark such as 14K, 18K, 585 or 750 is visible.
- When the same photos and details are supplied again, keep the identification and valuation range as consistent as possible.
Clearly say when identification or valuation is uncertain.`
                },
                ...(images || [image])
                  .filter(Boolean)
                  .slice(0, 8)
                  .map((img) => ({
                    type: "input_image",
                    image_url: img
                  }))
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI request failed"
      });
    }

    const valuation =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text)
        .join("\n") ||
      "";

    return res.status(200).json({ valuation });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Something went wrong"
    });
  }
}
