require("dotenv").config();
const Stripe = require("stripe");

const stripe = (type) => {
  const key =
    type === "live"
      ? process.env.STRIPE_SECRET_KEY_LIVE
      : process.env.STRIPE_SECRET_KEY_TEST;

  return Stripe(key);
};

module.exports = stripe;
