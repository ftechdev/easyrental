const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: uuidv4,
      unique: true,
    },

    firstName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 30,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
      maxlength: 30,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
    password: {
      type: String,
      required: function () {
        return this.role !== "guest" && !this.googleId;
      },
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "guest"],
      default: "user",
    },
    phone: {
      type: String,
      match: /^\+?[0-9]{7,15}$/,
    },
    alternativePhone: {
      type: String,
      match: /^\+?[0-9]{7,15}$/,
    },
    addressId: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: "https://avatar.iran.liara.run/public/35",
    },
    dateOfBirth: {
      type: Date,
    },
    isUaeResident: {
      type: Boolean,
    },
    emiratesIdFront: {
      type: String,
    },
    emiratesIdBack: {
      type: String,
    },
    licenseFront: {
      type: String,
    },
    licenseBack: {
      type: String,
    },
    passportFront: {
      type: String,
    },
    passportBack: {
      type: String,
    },
    licenseOlderThan6Months: {
      type: Boolean,
    },
    drivingLicenseNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

module.exports = mongoose.model("User", UserSchema);
