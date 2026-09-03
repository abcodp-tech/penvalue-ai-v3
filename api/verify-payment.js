import { neon } from "@neondatabase/serverless";

const PAYMENT_LINK_ID = "plink_1UBiDDRrFY8TDTH5GBzhr41g";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?payment_link=${PAYMENT_LINK_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      }
    );

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return res.status(500).json({ error: "Could not check payment" });
    }

    const paidSessions
