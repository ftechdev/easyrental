const express = require("express");
const checkAuthMiddle = require("../middlewares/authMiddleware");
const {
  addAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
} = require("../controller/addressController");

const router = express.Router();

router.post("/add", checkAuthMiddle, addAddress);

router.get("/get/:userId", checkAuthMiddle, getUserAddresses);

router.put("/update/:id", checkAuthMiddle, updateAddress);

router.delete("/delete/:id", checkAuthMiddle, deleteAddress);

module.exports = router;
