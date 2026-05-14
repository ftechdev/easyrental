const pool = require("../config/DB");

// Helper to format address
const formattedAddress = (address) => ({
  userId: address.user_id,
  addressId: address.id,
  houseNumber: address.house_number,
  street: address.street,
  landmark: address.landmark,
  locality: address.locality,
  city: address.city,
  country: address.country,
  pincode: address.pincode,
  isDefault: address.is_default === 1 || address.is_default === true,
  createdAt: address.created_at,
  updatedAt: address.updated_at,
});

// Add new address
const addAddress = async (req, res) => {
  const {
    userId,
    houseNumber,
    street,
    landmark,
    locality,
    city,
    country,
    pincode,
    isDefault,
  } = req.body;

  if (
    !userId ||
    !houseNumber ||
    !street ||
    !landmark ||
    !locality ||
    !city ||
    !country ||
    !pincode
  ) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: "All fields are required",
    });
  }

  try {
    const [existingAddresses] = await pool.query(
      "SELECT * FROM addresses WHERE user_id = ?",
      [userId]
    );

    const shouldBeDefault = isDefault || existingAddresses.length === 0;

    // If isDefault is true, reset others
    if (shouldBeDefault) {
      await pool.query(
        "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
        [userId]
      );
    }

    const addressId = require('uuid').v4();

    await pool.query(
      `INSERT INTO addresses (
        id, user_id, house_number, street, landmark, locality,
        city, country, pincode, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        addressId,
        userId,
        houseNumber,
        street,
        landmark,
        locality,
        city,
        country,
        pincode,
        shouldBeDefault ? 1 : 0,
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [addressId]
    );

    res.status(201).json({
      success: true,
      code: 201,
      message: "Address added successfully",
      data: formattedAddress(rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to add address",
      error: error.message,
    });
  }
};

// Get all addresses for user
const getUserAddresses = async (req, res) => {
  const { userId } = req.params;

  try {
    const [addresses] = await pool.query(
      "SELECT * FROM addresses WHERE user_id = ?",
      [userId]
    );

    if (!addresses.length) {
      return res.status(200).json({
        success: false,
        data: [],
        code: 200,
        message: "No addresses found for this user",
      });
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Addresses fetched successfully",
      data: addresses.map(formattedAddress),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to retrieve addresses",
      error: error.message,
    });
  }
};

// Update an address
const updateAddress = async (req, res) => {
  const { id } = req.params;
  const { isDefault, ...otherFields } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    console.log("Request Params ID:", id);
    console.log("Request Body isDefault:", isDefault);
    console.log("Request Body other fields:", otherFields);

    const [currentRows] = await connection.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [id]
    );

    if (!currentRows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Address not found",
      });
    }

    const currentAddress = currentRows[0];
    const parsedIsDefault = isDefault === true || isDefault === "true";

    if (parsedIsDefault) {
      console.log("Setting new default address. Updating others to false...");
      await connection.query(
        "UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?",
        [currentAddress.user_id, id]
      );
    }

    const fields = [];
    const values = [];

    const fieldMap = {
      houseNumber: 'house_number',
      street: 'street',
      landmark: 'landmark',
      locality: 'locality',
      city: 'city',
      country: 'country',
      pincode: 'pincode',
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (otherFields[camelKey] !== undefined) {
        fields.push(`${snakeKey} = ?`);
        values.push(otherFields[camelKey]);
      }
    }

    if (isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(parsedIsDefault ? 1 : 0);
    }

    if (fields.length) {
      values.push(id);
      await connection.query(
        `UPDATE addresses SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    const [updatedRows] = await connection.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [id]
    );

    await connection.commit();
    connection.release();

    res.status(200).json({
      success: true,
      code: 200,
      message: "Address updated successfully",
      data: formattedAddress(updatedRows[0]),
    });
  } catch (error) {
    await connection.rollback();
    connection.release();

    res.status(500).json({
      success: false,
      code: 500,
      message: "Error updating address",
      error: error.message,
    });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Address not found",
      });
    }

    const address = rows[0];

    await pool.query("DELETE FROM addresses WHERE id = ?", [id]);

    if (address.is_default) {
      const [latestRows] = await pool.query(
        "SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [address.user_id]
      );
      if (latestRows.length) {
        await pool.query(
          "UPDATE addresses SET is_default = 1 WHERE id = ?",
          [latestRows[0].id]
        );
      }
    }

    res.status(200).json({
      success: true,
      code: 200,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to delete address",
      error: error.message,
    });
  }
};

// Set address as default
const setDefaultAddress = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Address not found",
      });
    }

    const address = rows[0];

    await pool.query(
      "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
      [address.user_id]
    );

    await pool.query(
      "UPDATE addresses SET is_default = 1 WHERE id = ?",
      [id]
    );

    const [updatedRows] = await pool.query(
      "SELECT * FROM addresses WHERE id = ? LIMIT 1",
      [id]
    );

    res.status(200).json({
      success: true,
      code: 200,
      message: "Address set as default successfully",
      data: formattedAddress(updatedRows[0]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to set default address",
      error: error.message,
    });
  }
};

module.exports = {
  addAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
