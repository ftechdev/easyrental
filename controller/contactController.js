const pool = require("../config/DB");

// Formatter
const formatContactMessage = (msg) => ({
  id: msg.id || null,
  name: msg.name || null,
  email: msg.email || null,
  phone: msg.phone || null,
  message: msg.message || null,
  status: msg.status || "new",
  createdAt: msg.created_at || null,
  updatedAt: msg.updated_at || null,
});

// Create a new contact message
exports.createContactMessage = async (req, res) => {
  try {
    const id = require('uuid').v4();
    await pool.query(
      "INSERT INTO contact_requests (id, name, email, phone, message, status) VALUES (?, ?, ?, ?, ?, ?)",
      [id, req.body.name, req.body.email, req.body.phone, req.body.message, "new"]
    );
    const [rows] = await pool.query(
      "SELECT * FROM contact_requests WHERE id = ? LIMIT 1",
      [id]
    );
    res.status(201).json({
      success: true,
      code: 201,
      message: "Message sent successfully",
      data: formatContactMessage(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error sending message",
      data: { error: err.message },
    });
  }
};

// Get all contact messages
exports.getContactMessages = async (req, res) => {
  try {
    const [messages] = await pool.query("SELECT * FROM contact_requests ORDER BY created_at DESC");
    res.status(200).json({
      success: true,
      code: 200,
      message: "Messages fetched successfully",
      data: messages.map(formatContactMessage),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error fetching messages",
      data: { error: err.message },
    });
  }
};

// Update contact message status
exports.updateContactMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["new", "viewed"].includes(status)) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "Invalid status value",
        data: null,
      });
    }

    const [result] = await pool.query(
      "UPDATE contact_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Message not found",
        data: null,
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM contact_requests WHERE id = ? LIMIT 1",
      [id]
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: "Message status updated successfully",
      data: formatContactMessage(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error updating message status",
      data: { error: err.message },
    });
  }
};

// Delete a contact message
exports.deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM contact_requests WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Message not found",
        data: null,
      });
    }

    await pool.query("DELETE FROM contact_requests WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Message deleted successfully",
      data: formatContactMessage(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error deleting message",
      data: { error: err.message },
    });
  }
};
