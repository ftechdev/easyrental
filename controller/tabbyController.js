const axios = require("axios");

const createCheckoutSession = async (req, res) => {
  try {
    const {
      amount, // Expected to be a number or string
      currency = "AED",
      phone,
      email,
      name,
      orderReferenceId,
      bookingId,
      items = [], // Array of item objects
    } = req.body;

    // --- 1. Input Validation ---
    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) { // Ensure amount is a positive number
      return res.status(400).json({ error: "Amount must be a positive number." });
    }
    if (!phone || !email || !name) {
      return res.status(400).json({ error: "Missing required buyer fields (phone, email, name)." });
    }

    // --- 2. Data Transformation (Amount to String) ---
    // Tabby expects amount as a string with two decimal places.
    const amountString = parseFloat(amount).toFixed(2);

    // Transform items to ensure unit_price and total_amount are strings
    const transformedItems = items.length > 0
      ? items.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price).toFixed(2),
          total_amount: parseFloat(item.total_amount).toFixed(2),
        }))
      : [
          // Default item if 'items' array is empty
          {
            title: "Car Rental",
            description: "Default Rental Item",
            quantity: 1,
            unit_price: amountString, // Use the transformed amount
            total_amount: amountString, // Use the transformed amount
          },
        ];

    // --- 3. Construct Tabby API Payload ---
    const payload = {
      payment: {
        amount: amountString, // Use the stringified amount here
        currency,
        description: `Booking for ${name} (ID: ${bookingId})`, // Add a meaningful description
        buyer: {
          phone,
          email,
          name,
          // dob: "YYYY-MM-DD", // Optional: If you have DOB, include it
        },
        // It's good to provide accurate buyer history if you have it
        buyer_history: {
          // registered_since: "2023-01-01T00:00:00+00:00", // Consider making this dynamic based on user registration date
          // loyalty_level: 1, // Optional
          // wishlist_count: 0, // Optional
          // is_first_order: false, // Make this dynamic based on user's order history
          // You might fetch this from your DB
          registered_since: "2023-01-01T00:00:00+00:00", // Placeholder: Replace with actual user registration date
          is_first_order: true, // Placeholder: Replace with logic to check if it's the user's first order
        },
        order: {
          reference_id: orderReferenceId || `ORDER-${bookingId}-${Date.now()}`, // More robust default reference ID
          items: transformedItems,
          // shipping_amount: "0.00", // Optional, as strings
          // tax_amount: "0.00",      // Optional, as strings
          // discount_amount: "0.00", // Optional, as strings
        },
        // meta: { bookingId: bookingId }, // Optional: You can send additional metadata
      },
      lang: "en", // Or "ar"
      merchant_code: process.env.TABBY_MERCHANT_CODE, // Use consistent naming (e.g., TABBY_MERCHANT_CODE)
      merchant_urls: {
        // Ensure these URLs are absolute and accessible from Tabby
        success: `${process.env.FRONTEND_URL}/payment-success?bookingId=${bookingId}`,
        cancel: `${process.env.FRONTEND_URL}/payment-cancel`,
        failure: `${process.env.FRONTEND_URL}/payment-failed`,
      },
      // token: null, // Only pass if you have an existing token
    };

    // --- Debugging Payload (Disable in Production) ---
    console.log("Sending payload to Tabby:", JSON.stringify(payload, null, 2));

    // --- 4. Call Tabby API ---
    // Use an environment variable for the Tabby API base URL (e.g., TABBY_API_BASE_URL)
    // IMPORTANT: Verify the correct API base URL for your TEST/LIVE environment from Tabby docs.
    const TABBY_API_BASE_URL = process.env.TABBY_API_BASE_URL || "https://api.tabby.ai"; // Default to live if not set

    const response = await axios.post(
      `${TABBY_API_BASE_URL}/api/v2/checkout`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.TABBY_SECRET_KEY}`,
        },
        timeout: 15000, // Increased timeout to 15 seconds for external API calls
      }
    );

    // --- 5. Process Tabby Response ---
    const sessionId = response.data.id;
    const tabbyStatus = response.data.status; // "created", "rejected", "approved", etc.

    // IMPORTANT: Construct the Tabby Hosted Payment Page URL.
    // Based on common patterns and your previous findings, it's likely:
    // `https://checkout.tabby.ai/checkout/${sessionId}`.
    // CONFIRM this exact URL format with Tabby's official integration guide.
    const checkoutUrl = `https://checkout.tabby.ai/checkout/${sessionId}`;

    // Handle different Tabby session statuses
    if (tabbyStatus === 'created' || tabbyStatus === 'approved') {
      res.status(200).json({
        sessionId: sessionId,
        checkoutUrl: checkoutUrl, // Send the constructed URL to the frontend
        status: tabbyStatus, // Also send the status for frontend context
      });
    } else if (tabbyStatus === 'rejected') {
      // Tabby rejected the session (e.g., customer not eligible)
      res.status(400).json({
        error: "Payment with Tabby was rejected. No available products for this customer/order.",
        tabbyStatus: tabbyStatus,
        details: response.data, // Send Tabby's full response for more details
      });
    } else {
      // Handle other unexpected statuses
      res.status(500).json({
        error: `Unexpected Tabby session status: ${tabbyStatus}`,
        tabbyStatus: tabbyStatus,
        details: response.data,
      });
    }

  } catch (error) {
    // --- 6. Robust Error Handling ---
    console.error("Tabby session creation error:", {
      message: error.message,
      response: {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      },
      stack: error.stack
    });

    res.status(500).json({
      error: "Failed to create Tabby session",
      details: error.response?.data || error.message,
    });
  }
};

module.exports = { createCheckoutSession };