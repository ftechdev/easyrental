const pool = require("../config/DB");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
require("dotenv").config();
const sendMail = require("../services/Mail/nodemailer");
const { sendUserRegistrationToAdmins } = require("../services/adminEmailService");
const { OAuth2Client } = require('google-auth-library');
const resetPasswordEmailTemplate = require("../services/emailTemplates/resetPasswordEmail");
const verificationEmailTemplate = require("../services/emailTemplates/verificationEmail");

// Initialize Google client
const googleClient = new OAuth2Client();

// Utility function to generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id || user.userId,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
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

  // Store in auth_tokens table
  await pool.query(
    "INSERT INTO auth_tokens (user_id, token) VALUES (?, ?)",
    [userId, token]
  );
  return token;
};

// Helper to map MySQL profile row to API user object
const mapProfileToUser = (profile) => ({
  userId: profile.id,
  firstName: profile.first_name,
  lastName: profile.last_name,
  email: profile.email,
  role: profile.role,
  phone: profile.phone,
  alternativePhone: profile.alternative_phone,
  addressId: profile.address_id,
  avatarUrl: profile.avatar_url,
  dateOfBirth: profile.date_of_birth,
  isUaeResident: profile.is_uae_resident === 1 || profile.is_uae_resident === true,
  emiratesIdFront: profile.emirates_id_front,
  emiratesIdBack: profile.emirates_id_back,
  licenseFront: profile.license_front,
  licenseBack: profile.license_back,
  passportFront: profile.passport_front,
  passportBack: profile.passport_back,
  drivingLicenseNumber: profile.driving_license_number,
  licenseOlderThan6Months: profile.license_older_than_6_months === 1 || profile.license_older_than_6_months === true,
  isVerified: profile.is_verified === 1 || profile.is_verified === true,
  googleId: profile.google_id,
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
});

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

    const validPlatforms = ['android', 'ios'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform specified'
      });
    }

    const audience = platform === 'ios'
      ? process.env.GOOGLE_IOS_CLIENT_ID
      : process.env.GOOGLE_ANDROID_CLIENT_ID;

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

    const normalizedEmail = payload.email.toLowerCase();

    // Find or create user in profiles
    const [rows] = await pool.query(
      'SELECT * FROM profiles WHERE google_id = ? OR email = ? LIMIT 1',
      [payload.sub, normalizedEmail]
    );

    let user = rows[0];

    if (!user) {
      // Create new profile
      await pool.query(
        `INSERT INTO profiles (
          id, email, first_name, last_name, google_id, is_verified, role
        ) VALUES (UUID(), ?, ?, ?, ?, 1, 'user')`,
        [
          normalizedEmail,
          payload.given_name || 'Google',
          payload.family_name || 'User',
          payload.sub
        ]
      );

      const [createdRows] = await pool.query(
        'SELECT * FROM profiles WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );
      user = createdRows[0];
      
      // Send registration email to admins for new Google OAuth user (async - don't block the response)
      sendUserRegistrationToAdmins(user).catch(error => {
        console.error('Failed to send admin registration email for Google OAuth:', error);
      });
    } else if (!user.google_id) {
      // Link existing profile
      await pool.query(
        'UPDATE profiles SET google_id = ? WHERE id = ?',
        [payload.sub, user.id]
      );
      user.google_id = payload.sub;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    return res.json({
      success: true,
      code: 200,
      message: "Google login successful",
      data: {
        accessToken,
        refreshToken,
        user: mapProfileToUser(user),
      }
    });
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

    const [tokenRows] = await pool.query(
      "SELECT * FROM auth_tokens WHERE user_id = ? AND token = ? LIMIT 1",
      [decoded.userId, token]
    );

    if (!tokenRows.length) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: "Invalid refresh token",
      });
    }

    const [userRows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [decoded.userId]
    );

    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
      });
    }

    const user = userRows[0];

    await pool.query("DELETE FROM auth_tokens WHERE id = ?", [tokenRows[0].id]);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

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

    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Old password is incorrect",
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      "UPDATE profiles SET password = ? WHERE id = ?",
      [hashedPassword, userId]
    );

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

    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: { email },
      });
    }

    const user = rows[0];

    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.RESET_PASSWORD_SECRET,
      { expiresIn: "1h" }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password-confirmation?token=${resetToken}`;

    const htmlContent = resetPasswordEmailTemplate({
      userName: user.first_name,
      resetLink: resetUrl,
    });

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

    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE profiles SET password = ? WHERE id = ?",
      [hashedPassword, decoded.userId]
    );

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
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (token) {
    await pool.query("DELETE FROM auth_tokens WHERE token = ?", [token]);
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

    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [decoded.userId]
    );

    if (!rows.length) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=false&reason=user_not_found`
      );
    }

    const user = rows[0];

    if (user.is_verified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?verified=true&reason=already_verified`
      );
    }

    await pool.query(
      "UPDATE profiles SET is_verified = 1 WHERE id = ?",
      [decoded.userId]
    );

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

    const [existingUser] = await pool.query(
      "SELECT * FROM profiles WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUser.length) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Email already in use",
        data: { email },
      });
    }

    if (googleId) {
      const [existingGoogleUser] = await pool.query(
        "SELECT * FROM profiles WHERE google_id = ? LIMIT 1",
        [googleId]
      );
      if (existingGoogleUser.length) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Google ID already in use",
          data: { googleId },
        });
      }
    }

    if (!isGuest && drivingLicenseNumber) {
      const [existingLicense] = await pool.query(
        "SELECT * FROM profiles WHERE driving_license_number = ? LIMIT 1",
        [drivingLicenseNumber]
      );
      if (existingLicense.length) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "Driving License already registered",
          data: { drivingLicenseNumber },
        });
      }
    }

    let hashedPassword = null;
    if (!googleId && !isGuest) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const userId = require('uuid').v4();

    await pool.query(
      `INSERT INTO profiles (
        id, email, first_name, last_name, password, google_id,
        driving_license_number, role, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        email,
        firstName,
        lastName,
        hashedPassword,
        googleId || null,
        drivingLicenseNumber || null,
        role || 'user',
        1  // Auto-verify all users
      ]
    );

    const [userRows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [userId]
    );

    const user = userRows[0];

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    // Send registration email to admins (async - don't block the response)
    sendUserRegistrationToAdmins(user).catch(error => {
      console.error('Failed to send admin registration email:', error);
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Return user data with tokens (no email verification needed)
    return res.status(201).json({
      code: 201,
      success: true,
      message: "User registered and logged in successfully.",
      data: {
        accessToken,
        refreshToken,
        user: mapProfileToUser(user),
      },
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
      const [rows] = await pool.query(
        "SELECT * FROM profiles WHERE google_id = ? LIMIT 1",
        [googleId]
      );
      user = rows[0];
    } else {
      const [rows] = await pool.query(
        "SELECT * FROM profiles WHERE email = ? LIMIT 1",
        [email]
      );
      user = rows[0];

      if (user && !(await bcrypt.compare(password, user.password))) {
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

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      code: 200,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: mapProfileToUser(user),
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
    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [req.user.userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const user = rows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Profile fetched successfully",
      data: mapProfileToUser(user),
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

    const [rows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const user = rows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Profile fetched successfully",
      data: mapProfileToUser(user),
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
    const [rows] = await pool.query("SELECT * FROM profiles");

    if (!rows.length) {
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
      data: rows.map(mapProfileToUser),
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
  return filePath.replace(/\.[^/.]+$/, "");
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
      targetUserId = req.body.userId;
    } else {
      targetUserId = requesterId;
    }

    const [existingRows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    if (!existingRows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    const existingUser = existingRows[0];

    const updates = { ...req.body };
    delete updates.email;
    delete updates.password;

    if (role !== "admin") {
      delete updates.role;
    }

    for (const key in updates) {
      if (Array.isArray(updates[key]) && updates[key].length === 1) {
        updates[key] = updates[key][0];
      }
    }

    if (req.files) {
      const firstName = existingUser.first_name || "";
      const lastName = existingUser.last_name || "";
      const last4UserId = String(targetUserId).slice(-4);
      const cleanFirst = firstName.trim().replace(/\s/g, "");
      const cleanLast = lastName.trim().replace(/\s/g, "");
      const fileName = `${cleanFirst}${cleanLast}${last4UserId}`;

      for (const field in req.files) {
        const file = req.files[field][0];
        if (file?.buffer) {
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();

          if (existingUser[snakeField]) {
            try {
              const publicId = getCloudinaryPublicId(existingUser[snakeField]);
              await cloudinary.uploader.destroy(publicId);
              console.log(`🗑️ Deleted old image: ${publicId}`);
            } catch (err) {
              console.warn("⚠️ Error deleting old image:", err.message);
            }
          }

          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "user_documents",
                public_id: `${fileName}_${snakeField}`,
                overwrite: true,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });

          updates[field] = uploadResult.secure_url;
        }
      }
    }

    const fields = [];
    const values = [];

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      alternativePhone: 'alternative_phone',
      avatarUrl: 'avatar_url',
      dateOfBirth: 'date_of_birth',
      isUaeResident: 'is_uae_resident',
      emiratesIdFront: 'emirates_id_front',
      emiratesIdBack: 'emirates_id_back',
      licenseFront: 'license_front',
      licenseBack: 'license_back',
      passportFront: 'passport_front',
      passportBack: 'passport_back',
      drivingLicenseNumber: 'driving_license_number',
      licenseOlderThan6Months: 'license_older_than_6_months',
      role: 'role',
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updates[camelKey] !== undefined) {
        fields.push(`${snakeKey} = ?`);
        values.push(updates[camelKey]);
      }
    }

    if (fields.length) {
      values.push(targetUserId);
      await pool.query(
        `UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    const [updatedRows] = await pool.query(
      "SELECT * FROM profiles WHERE id = ? LIMIT 1",
      [targetUserId]
    );

    const updatedUser = updatedRows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Profile updated successfully",
      data: mapProfileToUser(updatedUser),
    });
  } catch (error) {
    console.error("❌ Update profile error:", error.message);
    res.status(500).json({
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
    const { userId } = req.params;

    const [result] = await pool.query(
      "DELETE FROM profiles WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "User deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("❌ Delete user error:", error.message);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete user",
      data: null,
      details: error.message,
    });
  }
};

module.exports = {
  googleMobileLogin,
  refreshAccessToken,
  changePassword,
  resetPassword,
  resetPasswordConfirm,
  logout,
  verifyEmail,
  registerUser,
  login,
  getProfile,
  getProfileByUserId,
  getAllUsers,
  updateProfile,
  deleteUser,
};
