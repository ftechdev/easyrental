const express = require("express");
const router = express.Router();
const checkAuthMiddle = require("../middlewares/authMiddleware");
const checkAdmin = require("../middlewares/checkAdmin");

const {
  createCategory,
  getCategories,
  deleteCategory,
  updateCategory,
} = require("../controller/categoryController");

router.post("/addcategory", checkAuthMiddle, checkAdmin, createCategory);
router.get("/allcategory", getCategories);
router.put("/update/:id", checkAuthMiddle, checkAdmin, updateCategory);
router.delete("/delete/:id", checkAuthMiddle, checkAdmin, deleteCategory);

module.exports = router;
