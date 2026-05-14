const mongoose = require("mongoose");

const fleetInquirySchema = new mongoose.Schema(
  {
    fleetType: {
      type: String,
      enum: ["personal", "corporate"],
      required: true,
    },
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    industry: String,
    fleetSize: String,
    preferredVehicles: String,
    additionalInfo: String,
    status: {
      type: String,
      enum: ["new", "viewed"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FleetInquiry", fleetInquirySchema);
