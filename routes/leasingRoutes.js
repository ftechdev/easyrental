const express = require("express");
const router = express.Router();
const {
  createFleetInquiry,
  getFleetInquiries,
  updateFleetInquiryStatus,
  deleteFleetInquiry,
} = require("../controller/fleetController");
const checkAuthMiddle = require("../middlewares/authMiddleware");
const cheakAdmin = require("../middlewares/checkAdmin");

router.post("/add", createFleetInquiry);
router.get("/get", checkAuthMiddle, cheakAdmin, getFleetInquiries);
router.put(
  "/update/:id",
  checkAuthMiddle,
  cheakAdmin,
  updateFleetInquiryStatus
);
router.delete("/delete/:id", checkAuthMiddle, cheakAdmin, deleteFleetInquiry);

module.exports = router;
