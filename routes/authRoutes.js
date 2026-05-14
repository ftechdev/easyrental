const express = require("express");
const passport = require("../services/passportService");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

const {
  registerUser,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  refreshAccessToken,
  logout,
  changePassword,
  resetPassword,
  verifyEmail,
  resetPasswordConfirm,
  getProfileByUserId,
  deleteUser,
  googleMobileLogin, // ✅ Mobile login controller
} = require("../controller/auth.user");

const checkAuthMiddle = require("../middlewares/authMiddleware");
const checkAdmin = require("../middlewares/checkAdmin");
const { upload } = require("../utils/multer");

dotenv.config();
const router = express.Router();

// ====== OAuth Success Handler (Web) ======
function handleOAuthSuccess(req, res) {
  console.log("🌟 OAuth Success handler triggered");

  // Check if req.user is populated by Passport
  if (!req.user) {
    console.warn("⚠️ OAuth login failed: No user found in req.user.");
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://alrascars.com";
    return res.send(`
      <script>
        console.warn('Frontend received: OAuth login failed - No user found');
        window.opener.postMessage(
          { type: 'OAUTH_ERROR', message: 'OAuth login failed: No user found' },
          "${FRONTEND_URL}"
        );
        window.close();
      </script>
    `);
  }
  
  // Start the try-catch block for token generation and sending the response
  try {
    console.log("✅ User object from Passport:", req.user);

    // Convert the user object to a plain object. This handles both Mongoose documents and plain objects.
    const userObj = req.user.toObject ? req.user.toObject() : { ...req.user };
    
    console.log("✅ Converted user object:", userObj);
    
    // Clean up sensitive data before sending to the frontend
    delete userObj.password;
    delete userObj.__v;
    
    console.log("✅ Cleaned user object for token payload:", userObj);
    
    // Validate required environment variables for JWT signing
    if (!process.env.ACCESS_TOKEN_SECRET) {
      console.error("❌ Missing required environment variable: ACCESS_TOKEN_SECRET");
      throw new Error("Missing ACCESS_TOKEN_SECRET");
    }
    if (!process.env.REFRESH_TOKEN_SECRET) {
      console.error("❌ Missing required environment variable: REFRESH_TOKEN_SECRET");
      throw new Error("Missing REFRESH_TOKEN_SECRET");
    }

    // Generate the access token
    const token = jwt.sign(
      {
        userId: userObj.userId || userObj._id, // Use userId or _id for consistency
        email: userObj.email,
        role: userObj.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    console.log("✅ Access token generated successfully.");

    // Generate the refresh token
    const refreshToken = jwt.sign(
      { id: userObj.userId || userObj._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    console.log("✅ Refresh token generated successfully.");

    const FRONTEND_URL = process.env.FRONTEND_URL || "https://alrascars.com";

    console.log("✅ Sending OAuth success message to the frontend at:", FRONTEND_URL);

    // Respond with a script that communicates the tokens and user info back to the frontend
    res.send(`
      <script>
        window.opener.postMessage(
          {
            type: "OAUTH_SUCCESS",
            token: "${token}",
            refreshToken: "${refreshToken}",
            user: ${JSON.stringify(userObj)},
          },
          "${FRONTEND_URL}"
        );
        console.log('Frontend received: OAuth success message');
        setTimeout(() => window.close(), 100);
      </script>
    `);
  } catch (err) {
    console.error("❌ OAuth Token/Response Generation Error:", err);
    
    // Sanitize the error message to avoid XSS and ensure it's a valid string for JSON.stringify
    const errorMessage = JSON.stringify(err.message || "An unknown error occurred during token generation.");
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://alrascars.com";

    res.send(`
      <script>
        console.error('Frontend received: OAuth error message', ${errorMessage});
        window.opener.postMessage(
          { type: 'OAUTH_ERROR', message: ${errorMessage} },
          "${FRONTEND_URL}"
        );
        window.close();
      </script>
    `);
  }
}


// ====== Basic Auth Routes ======
router.post("/register", registerUser);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/refreshtoken", refreshAccessToken);
router.post("/logout", logout);
router.post("/resetpassword", resetPassword);
router.post("/resetpasswordconfirm", resetPasswordConfirm);

// ====== Google Login for Android/Flutter ====== ✅ NEW
router.post("/google-mobile", googleMobileLogin);

// ====== Protected Routes ======
router.delete("/deleteuser/:userId", checkAuthMiddle, deleteUser);
router.get("/profile", checkAuthMiddle, getProfile);
router.post("/changepassword", checkAuthMiddle, changePassword);
router.put(
  "/updateprofile",
  checkAuthMiddle,
  upload.fields([
    { name: "avatarUrl", maxCount: 1 },
    { name: "emiratesIdFront", maxCount: 1 },
    { name: "emiratesIdBack", maxCount: 1 },
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
    { name: "passportFront", maxCount: 1 },
    { name: "passportBack", maxCount: 1 },
  ]),
  updateProfile
);
router.get("/user/:userId", checkAuthMiddle, getProfileByUserId);
router.get("/getallusers", checkAuthMiddle, checkAdmin, getAllUsers);


// ====== Google OAuth (Web) ======
router.get(
  "/google",
  (req, res, next) => {
    console.log("🔵 Initiating Google OAuth login");
    next();
  },
  // Use 'google-web' here
  passport.authenticate("google-web", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("🔵 Google OAuth callback triggered");
    next();
  },
  // And also use 'google-web' here
  passport.authenticate("google-web", {
    failureRedirect: `${process.env.FRONTEND_URL}/login-failed`,
    session: false,
  }),
  handleOAuthSuccess
);

// ====== Facebook OAuth ======
router.get(
  "/facebook",
  (req, res, next) => {
    console.log("🔵 Initiating Facebook OAuth login");
    next();
  },
  passport.authenticate("facebook", {
    scope: ["email"],
  })
);

router.get(
  "/facebook/callback",
  (req, res, next) => {
    console.log("🔵 Facebook OAuth callback triggered");
    next();
  },
  passport.authenticate("facebook", {
    failureRedirect: `${process.env.FRONTEND_URL}/login-failed`,
    session: false,
  }),
  handleOAuthSuccess
);

// ====== Apple OAuth ======
router.get(
  "/apple",
  (req, res, next) => {
    console.log("🔵 Initiating Apple OAuth login");
    next();
  },
  passport.authenticate("apple", {
    scope: ["name", "email"],
  })
);

router.post(
  "/apple/callback",
  (req, res, next) => {
    console.log("🔵 Apple OAuth callback triggered");
    next();
  },
  passport.authenticate("apple", {
    failureRedirect: `${process.env.FRONTEND_URL}/login-failed`,
    session: false,
  }),
  handleOAuthSuccess
);

module.exports = router;
