// models/ContactMessage.js
const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    message: String,
    status: {
      type: String,
      enum: ["new", "viewed"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
