const getStripeInstance = require("../config/stripe");

const createCheckoutSession = async (req, res) => {
  const { amount, currency, item, bookingId, type } = req.body;

  if (!amount || !currency || !item || !type || !bookingId) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "Missing required fields: amount, currency, item, type, bookingId",
    });
  }

  const stripe = getStripeInstance(type);

  try {
    const product = await stripe.products.create({ name: item });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/payment-success?bookingId=${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-failed?bookingId=${bookingId}`,
      metadata: {
        bookingId,
        item,
        amount: amount.toString()
      }
    });

    res.status(200).json({
      success: true,
      code: 200,
      sessionId: session.id,
      url: session.url // Optional: use for redirecting in web
    });
  } catch (err) {
    console.error("Stripe Checkout Session Error:", err);
    res.status(500).json({
      success: false,
      code: 500,
      message: err.message || "Failed to create Stripe checkout session",
    });
  }
};

const createPaymentIntent = async (req, res) => {
  const {
    amount,
    currency = "USD",
    bookingId,
    userId,
    customerEmail,
    type,
    savePaymentMethod = false
  } = req.body;

  if (!amount || !bookingId || !userId || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: amount, bookingId, userId, type",
    });
  }

  const stripe = getStripeInstance(type);

  try {
    // Check if customer exists
    let customer;
    if (customerEmail) {
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      customer = existingCustomers.data.length
        ? existingCustomers.data[0]
        : await stripe.customers.create({
            email: customerEmail,
            metadata: { userId },
          });
    } else {
      // Create customer with only metadata
      customer = await stripe.customers.create({
        metadata: { userId },
      });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2023-08-16" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: customer.id,
      setup_future_usage: savePaymentMethod ? "off_session" : undefined,
      metadata: {
        bookingId,
        userId,
        email: customerEmail || "N/A"
      },
      payment_method_types: ["card"],
    });

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      ephemeralKey: ephemeralKey.secret,
      publishableKey:
       process.env.STRIPE_PUBLISHABLE_KEY_LIVE 
    });
  } catch (error) {
    console.error("Stripe PaymentIntent Error:", error);
     console.error("Stripe Secret Key (Live):", process.env.STRIPE_SECRET_KEY_LIVE);
    return res.status(500).json({
      success: false,
      message: error.message || "PaymentIntent creation failed",
    });
  }
};

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
};
