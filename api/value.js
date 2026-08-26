export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { images = [], brand, model, notes } = req.body || {};

    const photoList = Array.isArray(images)
      ? images.filter(Boolean).slice(0, 8)
      : [];

    if (photoList.length === 0) {
      return res.status(400).json({
        error: "No photos were received."
      });
    }

    const content = [
      {
        type: "input_text",
        text: `You are an expert fountain pen identifier and valuer.

Study ALL of the supplied photos together before reaching a conclusion.

Brand supplied by customer: ${brand || "Unknown"}
Model supplied by customer: ${model || "Unknown"}
Customer notes: ${notes || "None"}

Give a careful valuation containing:

1. Most likely brand and exact model
2. Approximate age/date
3. Low, likely and high value in GBP
4. Condition observations from all photos
5. Nib type/material and markings if visible
6. Filling system if identifiable
7. Any barrel, cap, clip, hallmark or model markings visible
8. Rarity and collector demand
9. Why it has this value
10. What additional information would improve confidence
11. Optimized eBay title and description
12. Optimized Vinted title and description

Important:
- Compare information across ALL photos.
- Do not invent markings that cannot be seen.
- Do not assume the customer-supplied brand is correct if the photos disagree.
- Clearly state uncertainty.
- Give the most realistic current resale estimate rather than an optimistic asking price.`
    


      ...photoList.map((img) => ({
        type: "input_image",
        image_url: img
      }))
    ];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: [
            {
              role: "user",
              content
            }
          ]
        })
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: "AI returned an unexpected response."
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI request failed."
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

    if (!valuation) {
      return res.status(502).json({
        error: "No valuation was returned by the AI."
      });
    }

    return res.status(200).json({
      valuation
    });

  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Something went wrong."
    });
  }
}
