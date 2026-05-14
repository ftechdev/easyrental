const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categoryName: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    features: [{ type: String }],
    doors: { type: String },
    seats: { type: String },
    luggage: { type: String },
    engine: { type: String },
    fuelType: { type: String },
    transmission: { type: String },
    airConditioning: { type: Boolean },
    pricing: {
      daily: { type: Number },
      weekly: { type: Number },
      monthly: { type: Number },
    },
    locations: [{ type: String }],
    image: { type: String },
    gallery: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Car", carSchema);
