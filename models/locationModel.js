// models/locationModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

// ===== Sublocation Schema =====
const sublocationSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    // DO NOT set _id: false — we want an _id for each sublocation
  }
);

// ===== Location Schema =====
const locationSchema = new Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
    },
    selfPickup: {
      type: Boolean,
      required: true,
      default: false,
    },
    sublocations: {
      type: [sublocationSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    // Keep document _id (we define it explicitly above)
  }
);

// ===== CarLocation Schema (unchanged) =====
const carLocationSchema = new Schema(
  {
    car_id: {
      type: String,
      required: true,
    },
    location_id: {
      type: String,
      ref: "Location",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

// ===== Export Models =====
const Location = mongoose.model("Location", locationSchema);
const CarLocation = mongoose.model("CarLocation", carLocationSchema);

module.exports = {
  Location,
  CarLocation,
};
