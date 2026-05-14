const express = require("express");
const router = express.Router();
const checkAuthMiddle = require("../middlewares/authMiddleware");
const cheakAdmin = require("../middlewares/checkAdmin");
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getCurrentBookings,
  changeBookingStatus,
  updatePaymentStatus,
  getBookingHistory,
} = require("../controller/bookingController"); // Make sure the filename is correct

// Create a booking
router.post("/create", checkAuthMiddle, createBooking);

// Get all bookings (admin)
router.get("/allbooking", checkAuthMiddle, cheakAdmin, getAllBookings);

// Get current bookings (user)
router.get("/user/current", checkAuthMiddle, getCurrentBookings);

// Get booking history (user)
router.get("/user/history/:id", checkAuthMiddle, getBookingHistory);

// Get single booking by ID
router.get("/:id", checkAuthMiddle, getBookingById);

// Update booking
router.put("/:id", checkAuthMiddle, cheakAdmin, updateBooking);

// Delete booking
router.delete("/:id", checkAuthMiddle, cheakAdmin, deleteBooking);

// Change booking status (admin)
router.patch(
  "/bookingstatus/:id",
  checkAuthMiddle,
  cheakAdmin,
  changeBookingStatus
);

router.patch("/paymentstatus/:id", checkAuthMiddle, updatePaymentStatus);

module.exports = router;
