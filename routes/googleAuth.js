// routes/googleAuth.js
const express = require("express");
const passport = require("../services/auth/passportService");
const jwt = require("jsonwebtoken");

const router = express.Router();

// routes/googleAuth.js

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("📥 Google OAuth callback hit");
    next();
  },
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth-failure`,
  }),
  (req, res) => {
    try {
      console.log("✅ Google user authenticated:", req.user);

      if (!req.user) {
        console.warn("⚠️ No user found in request.");
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=user-missing`
        );
      }

      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );

      console.log("🔐 JWT generated:", token);

      res.redirect(`${process.env.FRONTEND_URL}/login/success?token=${token}`);
    } catch (err) {
      console.error("❌ OAuth Callback Error:", err);
      res.status(500).send("Something went wrong during authentication.");
    }
  }
);

module.exports = router;
