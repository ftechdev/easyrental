const pool = require("../config/DB");

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Category name is required",
        data: null,
      });
    }

    const trimmedName = name.trim();

    // Check if category already exists
    const [existing] = await pool.query(
      "SELECT * FROM categories WHERE name = ? LIMIT 1",
      [trimmedName]
    );

    if (existing.length) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Category already exists",
        data: null,
      });
    }

    const [result] = await pool.query(
      "INSERT INTO categories (id, name) VALUES (UUID(), ?)",
      [trimmedName]
    );

    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE name = ? LIMIT 1",
      [trimmedName]
    );

    const category = rows[0] || {
      id: result.insertId || null,
      name: trimmedName,
    };

    res.status(201).json({
      success: true,
      code: 201,
      message: "Category created successfully",
      data: { category },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );

    if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "No categories found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Fetched all categories successfully",
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Category name is required",
        data: null,
      });
    }

    const trimmedName = name.trim();

    const [result] = await pool.query(
      "UPDATE categories SET name = ? WHERE id = ?",
      [trimmedName, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Category not found",
        data: [],
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    const updated = rows[0];

    res.status(200).json({
      success: true,
      code: 200,
      message: "Category updated successfully",
      data: { updatedCategory: updated },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Category not found",
        data: null,
      });
    }

    console.log("Category deleted successfully");
    res.status(200).json({
      success: true,
      code: 200,
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message,
      data: null,
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
