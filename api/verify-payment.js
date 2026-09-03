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
      return res.status(500).json({ error: stripeData.error?.message || "Could not check payment" });
    }

        const paidSessions = (stripeData.data || [])
      .filter(session => {
        const paymentEmail = String(
          session.customer_details?.email ||
          session.customer_email ||
          ""
        ).toLowerCase();

        return (
          session.payment_status === "paid" &&
          paymentEmail === email
        );
      })
      .sort((a, b) => b.created - a.created);

    if (!paidSessions.length) {
      return res.status(402).json({
        paid: false,
        error: "No completed £4.99 payment found for this email"
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS used_payments (
        session_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        used_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    for (const session of paidSessions) {
      const saved = await sql`
        INSERT INTO used_payments (session_id, email)
        VALUES (${session.id}, ${email})
        ON CONFLICT (session_id) DO NOTHING
        RETURNING session_id
      `;

      if (saved.length) {
        return res.status(200).json({
          paid: true,
          sessionId: session.id
        });
      }
    }

    return res.status(409).json({
      paid: false,
      error: "This payment has already been used"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Payment verification failed"
    });
  }
}
