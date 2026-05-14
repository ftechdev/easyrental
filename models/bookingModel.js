// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: String, ref: "User" },

    carId: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },

    // location IDs / names
    pickupLocation: { type: String },           // location id OR name (backwards compat)
    pickupLocationName: { type: String },       // resolved friendly name (optional)
    pickupSublocation: { type: String, default: null },    // sublocation id (optional)
    pickupSublocationName: { type: String },    // resolved sublocation name (optional)

    returnLocation: { type: String },
    returnLocationName: { type: String },
    returnSublocation: { type: String, default: null },
    returnSublocationName: { type: String },

    // resolved delivery fees (server authoritative)
    pickupDeliveryCost: { type: Number, default: 0 },
    returnDeliveryCost: { type: Number, default: 0 },

    deliveryAddress: Object,
    pickupDate: Date,
    returnDate: Date,
    totalPrice: Number,
    addOnCharges: Number,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    paymentGateway: String,
    paymentIntentId: String,
    paymentMethod: String,
    drivingLicenseNumber: String,
    licenseStatus: { type: String, enum: ["valid", "expired", "pending"] },
    isUaeResident: Boolean,
    isGuestBooking: Boolean,
    userName: String,
    userEmail: String,
    userMobile: String,
    carName: String,
    carCategory: String,
    carSingleImage: String,
    additionalDriver: Boolean,
    cdwSunny: Boolean,
    insurance: Boolean,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
