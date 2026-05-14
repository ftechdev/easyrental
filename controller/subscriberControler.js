const pool = require("../config/DB");

// Add subscriber
exports.addSubscriber = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Email is required",
    });
  }

  try {
    const id = require('uuid').v4();
    await pool.query(
      "INSERT INTO subscribers (id, email) VALUES (?, ?)",
      [id, email]
    );
    const [rows] = await pool.query(
      "SELECT * FROM subscribers WHERE id = ? LIMIT 1",
      [id]
    );
    return res.status(201).json({
      code: 201,
      success: true,
      message: "Subscriber added successfully",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: err.message,
    });
  }
};

// Get all subscribers
exports.getAllSubscribers = async (req, res) => {
  try {
    const [subs] = await pool.query("SELECT * FROM subscribers ORDER BY created_at DESC");
    return res.status(200).json({
      code: 200,
      success: true,
      message: "Subscribers fetched successfully",
      data: subs,
    });
  } catch (err) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: err.message,
    });
  }
};

// Delete subscriber by ID
exports.deleteSubscriber = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM subscribers WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Subscriber not found",
      });
    }
    return res.status(200).json({
      code: 200,
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: err.message,
    });
  }
};
