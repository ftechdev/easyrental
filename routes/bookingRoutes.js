const express = require("express");
const router = express.Router();
const checkAuthMiddle = require("../middlewares/authMiddleware");
const cheakAdmin = require("../middlewares/checkAdmin");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
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
  getUserBookingCount,
  getAllUserBookingCounts,
  importBookings,
} = require("../controller/bookingController"); // Make sure the filename is correct

// Create a booking
router.post("/create", checkAuthMiddle, createBooking);

// Get all bookings (admin)
router.get("/allbooking", checkAuthMiddle, cheakAdmin, getAllBookings);

// Get current bookings (user)
router.get("/user/current", checkAuthMiddle, getCurrentBookings);

// Get booking history (user) - for authenticated user
router.get("/user/history", checkAuthMiddle, getBookingHistory);

// Get booking history (user) - specific user ID
router.get("/user/history/:id", checkAuthMiddle, getBookingHistory);

// Get booking count for a user (admin)
router.get("/user/:userId/count", checkAuthMiddle, cheakAdmin, getUserBookingCount);

// Test endpoint without authentication for debugging
router.get("/test/user-counts", getAllUserBookingCounts);

// Get booking counts for all users (admin)
router.get("/user-counts/all", checkAuthMiddle, cheakAdmin, getAllUserBookingCounts);

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

// Import bookings (admin)
router.post("/import", checkAuthMiddle, cheakAdmin, upload.single('file'), importBookings);

module.exports = router;
