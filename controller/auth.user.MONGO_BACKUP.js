const User = require("../models/usermodel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
require("dotenv").config();
const nodemailer = require("nodemailer");
const Token = require("../models/Token");
const sendMail = require("../services/Mail/nodemailer");
const { OAuth2Client } = require('google-auth-library');
const resetPasswordEmailTemplate = require("../services/emailTemplates/resetPasswordEmail");
const verificationEmailTemplate = require("../services/emailTemplates/verificationEmail");

// Initialize Google client
const googleClient = new OAuth2Client();

// Utility function to generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );
};

const generateRefreshToken = async (userId) => {
  const token = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  // Store in DB
  await Token.create({ userId, token });
  return token;
};
// =======================
// MOBILE GOOGLE LOGIN
// =======================
const googleMobileLogin = async (req, res) => {
    try {
        const { idToken, platform } = req.body;

        if (!idToken || !platform) {
            return res.status(400).json({
                success: false,
                message: 'Missing ID token or platform'
            });
        }

        // Validate platform
        const validPlatforms = ['android', 'ios'];
        if (!validPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid platform specified'
            });
        }

        // Determine audience based on platform
        const audience = platform === 'ios'
            ? process.env.GOOGLE_IOS_CLIENT_ID
            : process.env.GOOGLE_ANDROID_CLIENT_ID;

        // Verify ID token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience
        });

        const payload = ticket.getPayload();

        if (!payload.email_verified) {
            return res.status(403).json({
                success: false,
                message: 'Google email not verified'
            });
        }

        // Find or create user
        let user = await User.findOne({
            $or: [
                { googleId: payload.sub },
                { email: payload.email.toLowerCase() }
            ]
        });

        if (!user) {
            // If user doesn't exist, create a new one with available Google info
            user = await User.create({
                firstName: payload.given_name || 'Google',
                lastName: payload.family_name || 'User',
                email: payload.email.toLowerCase(),
                googleId: payload.sub,
                isVerified: true, // Google verified email is already confirmed
                // Default values for other fields if necessary or leave as undefined/null
            });
        } else if (!user.googleId) {
            // If a user with this email exists but no googleId, link the googleId
            user.googleId = payload.sub;
            await user.save();
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user._id);

        // --- START OF MODIFIED SECTION ---
        // ✅ CRUCIAL CHANGE: Wrap the data inside a 'data' object
        return res.json({
            success: true,
            // Assuming your normal login also sends a message and code,
            // You might want to add them here for consistency,
            // or modify your Flutter AuthResponse to make them optional (as previously discussed)
            // For now, let's focus on the `data` wrapper.
            code: 200, // Or whatever success code you use for normal login
            message: "Google login successful", // Or a dynamic message

            data: { // <--- THIS IS THE KEY CHANGE
                accessToken: accessToken,
                refreshToken: refreshToken,
                user: {
                    userId: user.userId ?? null,
                    firstName: user.firstName ?? null,
                    lastName: user.lastName ?? null,
                    email: user.email ?? null,
                    role: user.role ?? null,
                    phone: user.phone ?? null,
                    alternativePhone: user.alternativePhone ?? null,
                    addressId: user.addressId ?? null,
                    avatarUrl: user.avatarUrl ?? null,
                    dateOfBirth: user.dateOfBirth ?? null,
                    isUaeResident: user.isUaeResident ?? null,
                    emiratesIdFront: user.emiratesIdFront ?? null,
                    emiratesIdBack: user.emiratesIdBack ?? null,
                    licenseFront: user.licenseFront ?? null,
                    licenseBack: user.licenseBack ?? null,
                    passportFront: user.passportFront ?? null,
                    passportBack: user.passportBack ?? null,
                    drivingLicense: user.drivingLicense ?? null,
                    drivingLicenseNumber: user.drivingLicenseNumber ?? null,
                    licenseOlderThan6Months: user.licenseOlderThan6Months ?? null,
                    isVerified: user.isVerified ?? null,
                    googleId: user.googleId ?? null,
                    createdAt: user.createdAt ?? null,
                    updatedAt: user.updatedAt ?? null,
                    // Ensure all other relevant User model fields are included here
                }
            }
        });
        // --- END OF MODIFIED SECTION ---

    } catch (error) {
        console.error('Mobile Google login error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Refresh Access Token
const refreshAccessToken = async (req, res) => {
  console.log("=== 🌀 Incoming Refresh Token Request ===");
  console.log("🍪 Cookies:", req.cookies);
  console.log("✅ req.headers.authorization:", req.headers.authorization);
  console.log("📦 Body:", req.body);
  console.log("📝 Headers:", req.headers);

  const token = (req.cookies && req.cookies.refreshToken) ||
    (req.body && req.body.refreshToken);

  if (!token) {
    console.warn("⚠️ No refresh token provided");
    return res.status(401).json({
      success: false,
      code: 401,
      message: "Refresh token missing",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    console.log("🔑 Decoded refresh token:", decoded);

    const existingToken = await Token.findOne({
      userId: decoded.userId,
      token,
    });
    console.log("🔍 Existing token:", existingToken);

    if (!existingToken) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(decoded.userId);
    console.log("👤 User found:", user);

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
      });
    }

    await Token.deleteOne({ _id: existingToken._id });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user._id);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      code: 200,
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("❌ Refresh token error:", error);
    res.status(403).json({
      success: false,
      code: 403,
      message: "Invalid or expired refresh token",
    });
  }
};

// Change Password controller
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Please provide both old and new passwords",
        data: null,
      });
    }

    const user = await User.findOne({ userId: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const isMatch = bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Old password is incorrect",
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Password changed successfully",
      data: null,
    });
  } catch (error) {
    console.error("❌ Change password error:", error.message);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to change password",
      details: error.message,
      data: null,
    });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Please provide an email",
        data: null,
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: { email },
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.RESET_PASSWORD_SECRET,
      { expiresIn: "1h" }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password-confirmation?token=${resetToken}`;

    const htmlContent = resetPasswordEmailTemplate({
      userName: user.firstName,
      resetLink: resetUrl,
    });

    // Send email using Resend
    await sendMail(user.email, "Reset Your Password", htmlContent);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Reset password email sent successfully",
      data: { email },
    });
  } catch (error) {
    console.error("❌ Reset password error:", error.message);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to send reset password email",
      details: error.message,
      data: null,
    });
  }
};

const resetPasswordConfirm = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Token and new password are required",
        data: null,
      });
    }

    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Password reset successful",
      data: null,
    });
  } catch (error) {
    console.error("❌ Password reset confirm error:", error.message);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Password reset failed",
      details: error.message,
      data: null,
    });
  }
};

// Logout controller
const logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await Token.deleteOne({ token });
    res.clearCookie("refreshToken");
  }

  res.status(200).json({
    success: true,
    code: 200,
    message: "Logged out successfully",
  });
};



const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=false&reason=missing_token`
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    } catch (err) {
      console.error("❌ Token verification failed:", err.message);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=false&reason=invalid_or_expired_token`
      );
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=false&reason=user_not_found`
      );
    }

    if (user.isVerified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=true&reason=already_verified`
      );
    }

    user.isVerified = true;
    await user.save();

    return res.redirect(
      `${process.env.FRONTEND_URL}/login?verified=true&reason=success`
    );
  } catch (error) {
    console.error("❌ Email verification error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?verified=false&reason=server_error`
    );
  }
};

const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      googleId,
      drivingLicenseNumber,
      role,
    } = req.body;

    const isGuest = role === "guest";

    // Check for required fields
    if (googleId && !email) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Please provide email and Google ID",
        data: { googleId },
      });
    }

    if (
      !googleId &&
      !isGuest &&
      (!firstName || !lastName || !email || !password || !drivingLicenseNumber)
    ) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Please provide all required fields",
        data: null,
      });
    }

    if (!googleId && isGuest && (!firstName || !lastName || !email)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Please provide name and email for guest user",
        data: null,
      });
    }

    // Check if email is already used
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Email already in use",
        data: { email },
      });
    }

    if (googleId) {
      const existingGoogleUser = await User.findOne({ googleId });
      if (existingGoogleUser) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Google ID already in use",
          data: { googleId },
        });
      }
    }

    if (!isGuest && drivingLicenseNumber) {
      const existingLicense = await User.findOne({ drivingLicenseNumber });
      if (existingLicense) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "Driving License already registered",
          data: { drivingLicenseNumber },
        });
      }
    }

    // Create new user
    let user;

    if (googleId) {
      user = new User({
        email,
        googleId,
        firstName: firstName || "Google",
        lastName: lastName || "User",
        role: role || "user",
        isVerified: isGuest ? true : false,
      });
    } else if (isGuest) {
      user = new User({
        firstName,
        lastName,
        email,
        role: "guest",
        isVerified: true,
      });
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        drivingLicenseNumber,
        role: role || "user",
        isVerified: false,
      });
    }

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    if (isGuest) {
      return res.status(201).json({
        code: 201,
        success: true,
        message: "Guest user registered and logged in successfully.",
        data: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: {
            userId: user.userId ?? null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            email: user.email ?? null,
            role: user.role ?? null,
            phone: user.phone ?? null,
            alternativePhone: user.alternativePhone ?? null,
            addressId: user.addressId ?? null,
            avatarUrl: user.avatarUrl ?? null,
            dateOfBirth: user.dateOfBirth ?? null,
            isUaeResident: user.isUaeResident ?? null,
            emiratesIdFront: user.emiratesIdFront ?? null,
            emiratesIdBack: user.emiratesIdBack ?? null,
            licenseFront: user.licenseFront ?? null,
            licenseBack: user.licenseBack ?? null,
            passportFront: user.passportFront ?? null,
            passportBack: user.passportBack ?? null,
            drivingLicense: user.drivingLicense ?? null,
            drivingLicenseNumber: user.drivingLicenseNumber ?? null,
            licenseOlderThan6Months: user.licenseOlderThan6Months ?? null,
            isVerified: user.isVerified ?? null,
            createdAt: user.createdAt ?? null,
            updatedAt: user.updatedAt ?? null,
          },
        },
      });
    }

    // Send email verification for non-guest users
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.EMAIL_VERIFICATION_SECRET,
      { expiresIn: "1d" }
    );

    const verificationUrl = `https://alrascar-api.onrender.com/api/auth/verify-email?token=${verificationToken}`;
    const htmlContent = verificationEmailTemplate(user, verificationUrl);

    try {
      await sendMail(user.email, "Verify Your Email Address", htmlContent);
    } catch (emailError) {
      console.error(
        "❌ Failed to send verification email:",
        emailError.message
      );
    }

    return res.status(201).json({
      code: 201,
      success: true,
      message: "User registered successfully. Verification email sent.",
      data: { email: user.email },
    });
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Internal Server Error",
      details: error.message,
      data: null,
    });
  }
};

// Login controller
const login = async (req, res) => {
  try {
    const { email, password, googleId } = req.body;

    console.log("📥 Login payload:", {
      email,
      passwordProvided: !!password,
      googleId,
    });

    if (!email && !googleId) {
      return res.status(400).json({
        code: 400,
        success: false,
        data: null,
        message: "Please provide email or Google ID",
      });
    }

    if (email && !password) {
      return res.status(400).json({
        success: false,
        code: 400,
        data: email,
        message: "Please provide a password",
      });
    }

    let user;

    if (googleId) {
      console.log("🔍 Checking user with Google ID:", googleId);
      user = await User.findOne({ googleId });
    } else {
      user = await User.findOne({ email });

      if (user && !bcrypt.compare(password, user.password)) {
        console.log("❌ Password mismatch");
        return res.status(401).json({
          success: false,
          code: 401,
          data: email,
          message: "Password does not match",
        });
      }
    }

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        success: false,
        code: 401,
        data: googleId || email,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        code: 401,
        data: user.email,
        message: "Please verify your email before logging in.",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user._id);
    console.log("🔑 Generated tokens:", { accessToken, refreshToken });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      code: 200,
      message: "Login successful",
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          userId: user.userId ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          email: user.email ?? null,
          role: user.role ?? null,
          phone: user.phone ?? null,
          alternativePhone: user.alternativePhone ?? null,
          addressId: user.addressId ?? null,
          avatarUrl: user.avatarUrl ?? null,
          dateOfBirth: user.dateOfBirth ?? null,
          isUaeResident: user.isUaeResident ?? null,
          emiratesIdFront: user.emiratesIdFront ?? null,
          emiratesIdBack: user.emiratesIdBack ?? null,
          licenseFront: user.licenseFront ?? null,
          licenseBack: user.licenseBack ?? null,
          passportFront: user.passportFront ?? null,
          passportBack: user.passportBack ?? null,
          drivingLicense: user.drivingLicense ?? null,
          drivingLicenseNumber: user.drivingLicenseNumber ?? null,
          licenseOlderThan6Months: user.licenseOlderThan6Months ?? null,
          isVerified: user.isVerified ?? null,
          createdAt: user.createdAt ?? null,
          updatedAt: user.updatedAt ?? null,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: "Login failed",
      data: null,
      details: error.message,
    });
  }
};

// Get Profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select(
      "-password -__v"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const profile = {
      userId: user.userId ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      phone: user.phone ?? null,
      alternativePhone: user.alternativePhone ?? null,
      addressId: user.addressId ?? null,
      avatarUrl: user.avatarUrl ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      isUaeResident: user.isUaeResident ?? null,
      emiratesIdFront: user.emiratesIdFront ?? null,
      emiratesIdBack: user.emiratesIdBack ?? null,
      licenseFront: user.licenseFront ?? null,
      licenseBack: user.licenseBack ?? null,
      passportFront: user.passportFront ?? null,
      passportBack: user.passportBack ?? null,
      licenseOlderThan6Months: user.licenseOlderThan6Months ?? null,
      drivingLicenseNumber: user.drivingLicenseNumber ?? null,
      isVerified: user.isVerified ?? null,
      googleId: user.googleId ?? null, // include if present
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    };

    res.status(200).json({
      success: true,
      code: 200,
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch profile",
      data: null,
      details: error.message,
    });
  }
};

const getProfileByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findOne({ userId }).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const profile = {
      userId: user.userId ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
      phone: user.phone ?? null,
      alternativePhone: user.alternativePhone ?? null,
      addressId: user.addressId ?? null,
      avatarUrl: user.avatarUrl ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      isUaeResident: user.isUaeResident ?? null,
      emiratesIdFront: user.emiratesIdFront ?? null,
      emiratesIdBack: user.emiratesIdBack ?? null,
      licenseFront: user.licenseFront ?? null,
      licenseBack: user.licenseBack ?? null,
      passportFront: user.passportFront ?? null,
      passportBack: user.passportBack ?? null,
      licenseOlderThan6Months: user.licenseOlderThan6Months ?? null,
      drivingLicenseNumber: user.drivingLicenseNumber ?? null,
      isVerified: user.isVerified ?? null,
      googleId: user.googleId ?? null,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    };

    res.status(200).json({
      success: true,
      code: 200,
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch profile",
      data: null,
      details: error.message,
    });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -__v");

    if (!users.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "No users found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to fetch users",
      data: null,
      details: error.message,
    });
  }
};

const getCloudinaryPublicId = (imageUrl) => {
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split("/");
  const filePath = pathParts.slice(5).join("/");
  return filePath.replace(/\.[^/.]+$/, ""); // remove extension
};

const updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Unauthorized: Invalid user token",
        data: null,
      });
    }

    const { userId: requesterId, role } = req.user;

    let targetUserId;
    if (role === "admin" && req.body.userId) {
      // Admin wants to update another user
      targetUserId = req.body.userId;
    } else {
      // User can update only their own profile
      targetUserId = requesterId;
    }

    const existingUser = await User.findOne({ userId: targetUserId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    // Prepare updates
    const updates = { ...req.body };

    // No one can update email or password here
    delete updates.email;
    delete updates.password;

    // If not admin, also prevent updating userType
    if (role !== "admin") {
      delete updates.userType;
    }

    // Flatten multipart form-data fields
    for (const key in updates) {
      if (Array.isArray(updates[key]) && updates[key].length === 1) {
        updates[key] = updates[key][0];
      }
    }

    // Handle image uploads
    if (req.files) {
      const firstName = existingUser.firstName || "";
      const lastName = existingUser.lastName || "";
      const last4UserId = String(targetUserId).slice(-4);
      const cleanFirst = firstName.trim().replace(/\s/g, "");
      const cleanLast = lastName.trim().replace(/\s/g, "");
      const fileName = `${cleanFirst}${cleanLast}${last4UserId}`;

      for (const field in req.files) {
        const file = req.files[field][0];
        if (file?.buffer) {
          // Delete old image
          if (existingUser[field]) {
            try {
              const publicId = getCloudinaryPublicId(existingUser[field]);
              await cloudinary.uploader.destroy(publicId);
              console.log(`🗑️ Deleted old image: ${publicId}`);
            } catch (err) {
              console.warn("⚠️ Error deleting old image:", err.message);
            }
          }

          // Upload new image
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream({ folder: `users/${fileName}` }, (err, result) =>
                err ? reject(err) : resolve(result)
              )
              .end(file.buffer);
          });

          console.log(`✅ New image uploaded: ${uploadResult.secure_url}`);
          updates[field] = uploadResult.secure_url;
        }
      }
    }

    // Perform update
    const updatedUser = await User.findOneAndUpdate(
      { userId: targetUserId },
      updates,
      { new: true, runValidators: true }
    ).select("-password -__v");

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Profile update error:", error.message);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to update profile",
      data: null,
      details: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "User ID is required",
      });
    }

    const user = await User.findOne({ userId }); // Find user by UUID
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
      });
    }

    // ✅ Use ObjectId for Token model if it expects ObjectId
    await Token.deleteMany({ userId: user._id });

    if (user.avatarUrl && user.avatarUrl.includes("cloudinary")) {
      try {
        const publicId = getCloudinaryPublicId(user.avatarUrl);
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("⚠️ Cloudinary delete failed:", err.message);
      }
    }

    await User.deleteOne({ userId });

    return res.status(200).json({
      success: true,
      code: 200,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error.message);
    return res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete user",
      details: error.message,
    });
  }
};

module.exports = {
  googleMobileLogin,
  deleteUser,
  registerUser,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  refreshAccessToken,
  logout,
  changePassword,
  verifyEmail,
  resetPassword,
  resetPasswordConfirm,
  getProfileByUserId,
};
