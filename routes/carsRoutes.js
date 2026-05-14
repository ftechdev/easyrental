const express = require("express");
const router = express.Router();
const { upload, compressImage } = require("../utils/multer");

const {
  addCar,
  getCars,
  getCarById,
  getCarByName,
  updateCar,
  deleteCar,
  getAdditionalPrices,
  getCarVariants,
  addCarVariant,
  updateCarVariant,
  deleteCarVariant,
} = require("../controller/carsController");
const {
  exportCars,
  importCars,
  downloadTemplate
} = require("../controller/carsImportExport");
const checkAdmin = require("../middlewares/checkAdmin");
const checkAuthMiddle = require("../middlewares/authMiddleware");
const multer = require("multer");
const csvUpload = multer({ storage: multer.memoryStorage() });

router.post(
  "/addcars",
  checkAuthMiddle,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  compressImage,
  addCar
);

router.get("/getAdditionalPrice", getAdditionalPrices);
router.get("/getallCars", getCars);
router.get("/get/:id", getCarById);
router.get("/getbyname/:name", getCarByName);
router.put(
  "/update/:id",
  checkAuthMiddle,
  checkAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  compressImage,
  updateCar
);
router.delete("/delete/:id", checkAuthMiddle, checkAdmin, deleteCar);

// Import/Export routes (Admin only)
router.get("/export", checkAuthMiddle, checkAdmin, exportCars);
router.post("/import", checkAuthMiddle, checkAdmin, csvUpload.single("file"), importCars);
router.get("/template", downloadTemplate);

// Car Variants routes
router.get("/:id/variants", getCarVariants);
router.post("/variants", checkAuthMiddle, checkAdmin, addCarVariant);
router.put("/variants/:id", checkAuthMiddle, checkAdmin, updateCarVariant);
router.delete("/variants/:id", checkAuthMiddle, checkAdmin, deleteCarVariant);

module.exports = router;
