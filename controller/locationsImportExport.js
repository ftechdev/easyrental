const pool = require("../config/DB");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");
const { v4: uuidv4 } = require("uuid");

const normalizeYesNo = (value) => {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "yes" || v === "true" || v === "1";
};

/**
 * Export all locations (+ sublocations) to CSV
 * GET /api/locations/export
 */
exports.exportLocations = async (_req, res) => {
  try {
    const [locations] = await pool.query(
      `SELECT * FROM locations ORDER BY created_at DESC`
    );
    const [sublocations] = await pool.query(
      `SELECT * FROM sublocations ORDER BY created_at DESC`
    );

    const subMap = new Map();
    for (const sub of sublocations) {
      if (!subMap.has(sub.location_id)) subMap.set(sub.location_id, []);
      subMap.get(sub.location_id).push(sub);
    }

    const csvData = locations.map((loc) => {
      const subs = subMap.get(loc.id) || [];
      const formattedSubs = subs
        .map((s) => {
          const name = (s.name || "").toString().trim();
          const fee = Number(s.delivery_fee ?? 0);
          return `${name}:${Number.isFinite(fee) ? fee : 0}`;
        })
        .filter(Boolean)
        .join(";");

      return {
        id: loc.id,
        name: loc.name,
        delivery_fee: Number(loc.delivery_fee ?? 0),
        is_self_pickup: loc.is_self_pickup ? "Yes" : "No",
        sublocations: formattedSubs,
        created_at: loc.created_at,
        updated_at: loc.updated_at,
      };
    });

    const csv = stringify(csvData, {
      header: true,
      columns: [
        "id",
        "name",
        "delivery_fee",
        "is_self_pickup",
        "sublocations",
        "created_at",
        "updated_at",
      ],
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=locations-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export locations error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to export locations",
      error: error.message,
    });
  }
};

/**
 * Import locations (+ sublocations) from CSV
 * POST /api/locations/import
 * Body: FormData with 'file' field containing CSV
 */
exports.importLocations = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty or invalid",
      });
    }

    let imported = 0;
    let updated = 0;
    const errors = [];

    for (const record of records) {
      try {
        const name = (record.name || "").toString().trim();
        if (!name) {
          errors.push(`Row skipped: Missing name`);
          continue;
        }

        const deliveryFee = Number(record.delivery_fee ?? record.deliveryFee ?? 0);
        const selfPickup = normalizeYesNo(record.is_self_pickup ?? record.selfPickup);

        // Parse sublocations from "Name:Fee;Name:Fee" format
        const rawSublocs = (record.sublocations || "").toString().trim();
        const parsedSublocations = rawSublocs
          ? rawSublocs
              .split(";")
              .map((p) => p.trim())
              .filter(Boolean)
              .map((pair) => {
                const [subNameRaw, feeRaw] = pair.split(":");
                const subName = (subNameRaw || "").trim();
                if (!subName) return null;
                const fee = Number(feeRaw ?? 0);
                return {
                  id: uuidv4(),
                  name: subName,
                  delivery_fee: Number.isFinite(fee) ? fee : 0,
                };
              })
              .filter(Boolean)
          : [];

        // Find by id (if provided) OR by name
        const [existing] = await pool.query(
          "SELECT id FROM locations WHERE id = ? OR name = ? LIMIT 1",
          [record.id || null, name]
        );

        let locationId;
        if (existing.length > 0) {
          locationId = existing[0].id;

          await pool.query(
            `UPDATE locations SET
              name = ?,
              delivery_fee = ?,
              is_self_pickup = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [name, Number.isFinite(deliveryFee) ? deliveryFee : 0, selfPickup ? 1 : 0, locationId]
          );

          // Replace sublocations if provided
          if (Array.isArray(parsedSublocations)) {
            await pool.query("DELETE FROM sublocations WHERE location_id = ?", [locationId]);

            for (const sub of parsedSublocations) {
              await pool.query(
                `INSERT INTO sublocations (id, location_id, name, delivery_fee)
                 VALUES (?, ?, ?, ?)`,
                [sub.id, locationId, sub.name, sub.delivery_fee]
              );
            }
          }

          updated++;
        } else {
          locationId = uuidv4();

          await pool.query(
            `INSERT INTO locations (id, name, delivery_fee, is_self_pickup)
             VALUES (?, ?, ?, ?)`,
            [
              locationId,
              name,
              Number.isFinite(deliveryFee) ? deliveryFee : 0,
              selfPickup ? 1 : 0,
            ]
          );

          for (const sub of parsedSublocations) {
            await pool.query(
              `INSERT INTO sublocations (id, location_id, name, delivery_fee)
               VALUES (?, ?, ?, ?)`,
              [sub.id, locationId, sub.name, sub.delivery_fee]
            );
          }

          imported++;
        }
      } catch (rowError) {
        console.error("Row import error:", rowError.message);
        errors.push(`Row import error: ${rowError.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${imported} new, ${updated} updated`,
      details: {
        imported,
        updated,
        total: records.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("❌ Import locations error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to import locations",
      error: error.message,
    });
  }
};

/**
 * Download locations CSV template
 * GET /api/locations/template
 */
exports.downloadTemplate = async (_req, res) => {
  try {
    const template = [
      {
        id: "",
        name: "Dubai",
        delivery_fee: "0",
        is_self_pickup: "Yes",
        sublocations: "Deira:25;Marina:50",
        created_at: "",
        updated_at: "",
      },
    ];

    const csv = stringify(template, {
      header: true,
      columns: [
        "id",
        "name",
        "delivery_fee",
        "is_self_pickup",
        "sublocations",
        "created_at",
        "updated_at",
      ],
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=locations-import-template.csv"
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Locations template download error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
};
