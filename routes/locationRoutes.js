// routes/locationRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const checkAdmin = require("../middlewares/checkAdmin");
const multer = require("multer");
const csvUpload = multer({ storage: multer.memoryStorage() });

const {
  exportLocations,
  importLocations,
  downloadTemplate,
} = require("../controller/locationsImportExport");

// Require controller and validate exports
const controller = require("../controller/locationController");
console.log("locationController exports:", Object.keys(controller || {}));

const {
  addLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  addSublocation,
  updateSublocation,
  deleteSublocation,
} = controller || {};

// Ensure required handlers exist (fail fast with clear message)
const requiredHandlers = {
  addLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  addSublocation,
  updateSublocation,
  deleteSublocation,
};

const missing = Object.entries(requiredHandlers)
  .filter(([, fn]) => typeof fn !== "function")
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(
    `locationController is missing handler(s): ${missing.join(
      ", "
    )}. Please export these functions from controller/locationController.js`
  );
}

// Location routes
router.post("/add", authMiddleware, checkAdmin, addLocation); // Create
router.get("/getlocations", getLocations); // Read All
router.put("/update/:id", authMiddleware, checkAdmin, updateLocation); // Update
router.delete("/delete/:id", authMiddleware, checkAdmin, deleteLocation); // Delete

// Sublocation routes (admin only)
router.post("/:id/sublocations", authMiddleware, checkAdmin, addSublocation); // Add a sublocation
router.put("/:id/sublocations/:sublocId", authMiddleware, checkAdmin, updateSublocation); // Update a single sublocation
router.delete("/:id/sublocations/:sublocId", authMiddleware, checkAdmin, deleteSublocation); // Delete a single sublocation

// Import/Export routes (Admin only)
router.get("/export", authMiddleware, checkAdmin, exportLocations);
router.post(
  "/import",
  authMiddleware,
  checkAdmin,
  csvUpload.single("file"),
  importLocations
);
router.get("/template", authMiddleware, checkAdmin, downloadTemplate);

module.exports = router;
