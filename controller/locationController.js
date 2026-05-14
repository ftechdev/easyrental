// controller/locationController.js
const pool = require("../config/DB");
const { v4: uuidv4 } = require("uuid");

/**
 * Normalize incoming sublocation payload item
 * Ensures { _id, name, deliveryFee }
 * Returns null if invalid (e.g. missing name)
 */
function normalizeSubloc(input) {
  if (!input) return null;
  const name = (input.name || "").toString().trim();
  if (!name) return null;

  let deliveryFee = input.deliveryFee ?? input.delivery_fee ?? 0;
  deliveryFee = Number(deliveryFee);
  if (!Number.isFinite(deliveryFee)) deliveryFee = 0;

  return {
    _id: input._id || uuidv4(),
    name,
    deliveryFee,
  };
}

/**
 * Map mongoose document to API-friendly object (camelCase timestamps)
 * Ensures sublocations are normalized in the returned object.
 */
function mapLocationRow(loc, sublocationsMap) {
  const subs = sublocationsMap.get(loc.id) || [];

  return {
    _id: loc.id,
    name: loc.name,
    deliveryFee:
      typeof loc.delivery_fee === "number"
        ? loc.delivery_fee
        : Number(loc.delivery_fee ?? 0),
    selfPickup: !!loc.is_self_pickup,
    createdAt: loc.created_at ?? new Date().toISOString(),
    updatedAt: loc.updated_at ?? null,
    sublocations: subs.map((s) => ({
      _id: s.id,
      name: s.name,
      deliveryFee:
        typeof s.delivery_fee === "number"
          ? s.delivery_fee
          : Number(s.delivery_fee ?? 0),
      createdAt: s.created_at ?? null,
      updatedAt: s.updated_at ?? null,
    })),
  };
}

/* -------------------------
   Location handlers
   ------------------------- */

// Create Location
const addLocation = async (req, res) => {
  const { name, deliveryFee, selfPickup, sublocations } = req.body;

  if (!name || deliveryFee == null || selfPickup == null) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "All fields (name, deliveryFee, selfPickup) are required",
    });
  }

  try {
    const trimmedName = name.trim();

    const [existing] = await pool.query(
      "SELECT * FROM locations WHERE name = ? LIMIT 1",
      [trimmedName]
    );

    if (existing.length) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Location already exists",
      });
    }

    // Normalize sublocations if provided
    let normalizedSublocations = [];
    if (Array.isArray(sublocations) && sublocations.length > 0) {
      normalizedSublocations = sublocations
        .map(normalizeSubloc)
        .filter(Boolean);
    }

    const locationId = uuidv4();

    await pool.query(
      `INSERT INTO locations (
        id,
        name,
        delivery_fee,
        is_self_pickup
      ) VALUES (?, ?, ?, ?)` ,
      [locationId, trimmedName, Number(deliveryFee), !!selfPickup ? 1 : 0]
    );

    if (normalizedSublocations.length) {
      for (const sub of normalizedSublocations) {
        await pool.query(
          `INSERT INTO sublocations (
            id,
            location_id,
            name,
            delivery_fee
          ) VALUES (?, ?, ?, ?)` ,
          [sub._id, locationId, sub.name, sub.deliveryFee]
        );
      }
    }

    const [locRows] = await pool.query(
      "SELECT * FROM locations WHERE id = ? LIMIT 1",
      [locationId]
    );
    const location = locRows[0];

    const [subRows] = await pool.query(
      "SELECT * FROM sublocations WHERE location_id = ?",
      [locationId]
    );

    const subMap = new Map();
    subMap.set(locationId, subRows || []);

    res.status(201).json({
      code: 201,
      success: true,
      message: "Location added successfully",
      data: mapLocationRow(location, subMap),
    });
  } catch (error) {
    console.error("addLocation error:", error);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Failed to add location",
      error: error.message,
    });
  }
};

// Get All Locations
const getLocations = async (req, res) => {
  try {
    const [locations] = await pool.query("SELECT * FROM locations");
    const [sublocations] = await pool.query("SELECT * FROM sublocations");

    const subMap = new Map();
    for (const sub of sublocations) {
      if (!subMap.has(sub.location_id)) {
        subMap.set(sub.location_id, []);
      }
      subMap.get(sub.location_id).push(sub);
    }

    const mapped = locations.map((loc) => mapLocationRow(loc, subMap));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    console.error("getLocations error:", error);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Failed to fetch locations",
      error: error.message,
    });
  }
};

// Update Location
// If `sublocations` array is provided in body, it REPLACES the existing array.
const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, deliveryFee, selfPickup, sublocations } = req.body;

  try {
    const fields = [];
    const values = [];

    if (name != null) {
      fields.push("name = ?");
      values.push(name.trim());
    }
    if (deliveryFee != null) {
      fields.push("delivery_fee = ?");
      values.push(Number(deliveryFee));
    }
    if (selfPickup != null) {
      fields.push("is_self_pickup = ?");
      values.push(!!selfPickup ? 1 : 0);
    }

    if (!fields.length && !Array.isArray(sublocations)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "No valid fields to update",
      });
    }

    if (fields.length) {
      values.push(id);
      const [result] = await pool.query(
        `UPDATE locations SET ${fields.join(", ")} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          code: 404,
          success: false,
          message: "Location not found",
        });
      }
    }

    if (Array.isArray(sublocations)) {
      await pool.query("DELETE FROM sublocations WHERE location_id = ?", [id]);

      const normalized = sublocations.map(normalizeSubloc).filter(Boolean);
      for (const sub of normalized) {
        await pool.query(
          `INSERT INTO sublocations (id, location_id, name, delivery_fee)
           VALUES (?, ?, ?, ?)`,
          [sub._id, id, sub.name, sub.deliveryFee]
        );
      }
    }

    const [locRows] = await pool.query(
      "SELECT * FROM locations WHERE id = ? LIMIT 1",
      [id]
    );
    if (!locRows.length) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Location not found",
      });
    }

    const location = locRows[0];

    const [subRows] = await pool.query(
      "SELECT * FROM sublocations WHERE location_id = ?",
      [id]
    );

    const subMap = new Map();
    subMap.set(id, subRows || []);

    res.status(200).json({
      code: 200,
      success: true,
      message: "Location updated",
      data: mapLocationRow(location, subMap),
    });
  } catch (error) {
    console.error("updateLocation error:", error);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
};

// Delete Location
const deleteLocation = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM sublocations WHERE location_id = ?", [id]);

    const [result] = await pool.query(
      "DELETE FROM locations WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Location not found",
      });
    }

    res.status(200).json({
      code: 200,
      success: true,
      message: "Location deleted",
    });
  } catch (error) {
    console.error("deleteLocation error:", error);
    res.status(500).json({
      code: 500,
      success: false,
      message: "Failed to delete location",
      error: error.message,
    });
  }
};

/* -------------------------
   Sublocation handlers
   ------------------------- */

/**
 * Add a sublocation to a location
 * POST /api/locations/:id/sublocations
 * Body: { name: string, deliveryFee: number }
 */
const addSublocation = async (req, res) => {
  const { id } = req.params;
  const { name, deliveryFee } = req.body;

  if (!name || deliveryFee == null) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: "Both name and deliveryFee are required for sublocation",
    });
  }

  try {
    const [locRows] = await pool.query(
      "SELECT id FROM locations WHERE id = ? LIMIT 1",
      [id]
    );
    if (!locRows.length) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Location not found",
      });
    }

    const newSubloc = normalizeSubloc({ name, deliveryFee });

    await pool.query(
      `INSERT INTO sublocations (id, location_id, name, delivery_fee)
       VALUES (?, ?, ?, ?)`,
      [newSubloc._id, id, newSubloc.name, newSubloc.deliveryFee]
    );

    return res.status(201).json({
      code: 201,
      success: true,
      message: "Sublocation added",
      data: newSubloc,
    });
  } catch (error) {
    console.error("addSublocation error:", error);
    return res.status(500).json({ code: 500, success: false, message: "Failed to add sublocation", error: error.message });
  }
};

/**
 * Update a single sublocation
 * PUT /api/locations/:id/sublocations/:sublocId
 * Body can contain partial fields: { name?, deliveryFee? }
 */
const updateSublocation = async (req, res) => {
  const { id, sublocId } = req.params;
  const { name, deliveryFee } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM sublocations WHERE id = ? AND location_id = ? LIMIT 1",
      [sublocId, id]
    );

    if (!rows.length) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Sublocation not found",
      });
    }

    const updates = [];
    const values = [];

    if (name != null) {
      updates.push("name = ?");
      values.push(String(name).trim());
    }
    if (deliveryFee != null) {
      updates.push("delivery_fee = ?");
      values.push(Number(deliveryFee));
    }

    if (updates.length) {
      values.push(sublocId, id);
      await pool.query(
        `UPDATE sublocations SET ${updates.join(", ")} WHERE id = ? AND location_id = ?`,
        values
      );
    }

    const [updatedRows] = await pool.query(
      "SELECT * FROM sublocations WHERE id = ? AND location_id = ? LIMIT 1",
      [sublocId, id]
    );

    const sub = updatedRows[0];

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Sublocation updated",
      data: {
        _id: sub.id,
        name: sub.name,
        deliveryFee:
          typeof sub.delivery_fee === "number"
            ? sub.delivery_fee
            : Number(sub.delivery_fee ?? 0),
        createdAt: sub.created_at ?? null,
        updatedAt: sub.updated_at ?? null,
      },
    });
  } catch (error) {
    console.error("updateSublocation error:", error);
    return res.status(500).json({ code: 500, success: false, message: "Failed to update sublocation", error: error.message });
  }
};

/**
 * Delete a single sublocation
 * DELETE /api/locations/:id/sublocations/:sublocId
 */
const deleteSublocation = async (req, res) => {
  const { id, sublocId } = req.params;

  try {
    const [result] = await pool.query(
      "DELETE FROM sublocations WHERE id = ? AND location_id = ?",
      [sublocId, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "Sublocation not found",
      });
    }

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Sublocation deleted",
    });
  } catch (error) {
    console.error("deleteSublocation error:", error);
    return res.status(500).json({ code: 500, success: false, message: "Failed to delete sublocation", error: error.message });
  }
};

module.exports = {
  addLocation,
  getLocations,
  updateLocation,
  deleteLocation,
  addSublocation,
  updateSublocation,
  deleteSublocation,
};
