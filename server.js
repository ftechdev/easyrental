// Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
const db = require("./config/DB");
const passport = require("passport");

require("./services/passportService");

// Verify required environment variables
const requiredEnvVars = ["ACCESS_TOKEN_SECRET", "FRONTEND_URL"];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Initialize database (MySQL)
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ MySQL Connected");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Connection Error:", error);
    process.exit(1);
  }
})();

// Create Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: 'lax',
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration - specify frontend URL for better security
const allowedOrigins = [
  "http://localhost:8080",         // local dev frontend
  "http://localhost:8081",         // local dev frontend (vite alternate)
  "https://easyrental.com",         // production frontend
  "https://www.easyrental.com",         // production frontend
  "https://blanchedalmond-eel-117582.hostingersite.com", // hosted frontend
  "https://blanchedalmond-eel-117582.hostingersite.com/", // hosted frontend with trailing slash
  "https://amirhost.in/easyrental", // new production frontend
  "https://amirhost.in/easyrental/", // new production frontend with trailing slash
  "https://easyrental-theta.vercel.app", // Vercel frontend
  "https://easyrental-theta.vercel.app/", // Vercel frontend with trailing slash
  "https://blue-jellyfish-713792.hostingersite.com", // OAuth callback domain
  "https://blue-jellyfish-713792.hostingersite.com/", // OAuth callback domain with trailing slash
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like curl or mobile apps)
      if (!origin) return callback(null, true);

      // In non-production, allow local dev without fighting CORS
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        const err = new Error("Not allowed by CORS");
        err.status = 403;
        return callback(err);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);


// Routes
app.use("/api/seo", require("./routes/seoRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/email", require("./routes/emailRoutes"));
app.use('/api/tabby', require('./routes/tabbyRoutes'));
app.use("/api/cars", require("./routes/carsRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/locations", require("./routes/locationRoutes"));
app.use("/api/addresses", require("./routes/addressRoutes"));
//app.use("/api/booking", require("./routes/bookingRoutes")); // live route
app.use("/api/booking", require("./routes/bookingRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/leasing", require("./routes/leasingRoutes"));
app.use("/api/subscribers", require("./routes/subscribersRoutes"));
app.use("/api/woocommerce", require("./routes/woocommerceRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/whatsapp", require("./routes/whatsappRoutes"));
app.use("/api/email-test", require("./routes/emailTestRoutes"));


// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err?.statusCode || err?.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  if (err?.message === "Not allowed by CORS") {
    return res.status(statusCode).json({
      success: false,
      code: statusCode,
      message: err.message,
    });
  }

  // Multer errors (file too large, invalid file type, etc.)
  if (err?.name === "MulterError") {
    return res.status(400).json({
      success: false,
      code: 400,
      message: err.message,
    });
  }

  console.error("❌ Error Details:", {
    message: err?.message,
    stack: err?.stack,
    name: err?.name,
    statusCode,
    path: req?.path,
    method: req?.method,
  });
  
  res.status(statusCode).json({
    success: false,
    code: statusCode,
    message: isProd ? "Something broke!" : err?.message || "Something broke!",
    ...(isProd ? {} : { details: err?.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
