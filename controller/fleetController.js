const pool = require("../config/DB");

// Local formatter function
const formatFleetInquiry = (inquiry) => ({
  id: inquiry.id || null,
  fleetType: inquiry.fleet_type || null,
  companyName: inquiry.company_name || null,
  contactPerson: inquiry.contact_person || null,
  email: inquiry.email || null,
  phone: inquiry.phone || null,
  industry: inquiry.industry || null,
  fleetSize: inquiry.fleet_size || null,
  preferredVehicles: inquiry.preferred_vehicles || null,
  additionalInfo: inquiry.additional_info || null,
  status: inquiry.status || "new",
  createdAt: inquiry.created_at || null,
  updatedAt: inquiry.updated_at || null,
});

// Create a new fleet inquiry
exports.createFleetInquiry = async (req, res) => {
  try {
    const id = require('uuid').v4();
    await pool.query(
      `INSERT INTO leasing_requests (
        id, fleet_type, company_name, contact_person, email, phone,
        industry, fleet_size, preferred_vehicles, additional_info, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.body.fleetType,
        req.body.companyName,
        req.body.contactPerson,
        req.body.email,
        req.body.phone,
        req.body.industry,
        req.body.fleetSize,
        req.body.preferredVehicles,
        req.body.additionalInfo,
        "new"
      ]
    );
    const [rows] = await pool.query(
      "SELECT * FROM leasing_requests WHERE id = ? LIMIT 1",
      [id]
    );
    res.status(201).json({
      success: true,
      code: 201,
      message: "Fleet inquiry submitted successfully",
      data: formatFleetInquiry(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error submitting fleet inquiry",
      data: { error: err.message },
    });
  }
};

// Get all fleet inquiries
exports.getFleetInquiries = async (req, res) => {
  try {
    const [inquiries] = await pool.query("SELECT * FROM leasing_requests ORDER BY created_at DESC");
    res.status(200).json({
      success: true,
      code: 200,
      message: "Fleet inquiries fetched successfully",
      data: inquiries.map(formatFleetInquiry),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error fetching fleet inquiries",
      data: { error: err.message },
    });
  }
};

// Update fleet inquiry status
exports.updateFleetInquiryStatus = async (req, res) => {
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
      "UPDATE leasing_requests SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Fleet inquiry not found",
        data: null,
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM leasing_requests WHERE id = ? LIMIT 1",
      [id]
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: "Fleet inquiry status updated successfully",
      data: formatFleetInquiry(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error updating fleet inquiry status",
      data: { error: err.message },
    });
  }
};

// Delete a fleet inquiry
exports.deleteFleetInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM leasing_requests WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Fleet inquiry not found",
        data: null,
      });
    }

    await pool.query("DELETE FROM leasing_requests WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      code: 200,
      message: "Fleet inquiry deleted successfully",
      data: formatFleetInquiry(rows[0]),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Error deleting fleet inquiry",
      data: { error: err.message },
    });
  }
};
