const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    houseNumber: {
      type: String,
    },
    street: {
      type: String,
    },
    landmark: {
      type: String,
    },
    locality: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    pincode: {
      type: String,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Address", addressSchema);
