// controller/bookingController.js
const pool = require("../config/DB");
const sendEmail = require("../services/Mail/nodemailer");
const { generateEmailBody } = require("../emailTemplates/bookingConfirmation");
const { sendBookingToAdmins } = require("../services/adminEmailService");
const { sendBookingNotification } = require("../services/whatsappService");
require("dotenv").config();

/* --------------------- Utilities --------------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * sendWithRetry - attempt sendFn, retry on rate-limit (429 / name rate_limit_exceeded)
 * sendFn must be an async fn that performs the send.
 * attempts: number of attempts (including the first).
 * baseDelayMs: base backoff delay in ms.
 */
const sendWithRetry = async (sendFn, attempts = 4, baseDelayMs = 500) => {
  let attempt = 0;
  while (attempt < attempts) {
    attempt++;
    try {
      const result = await sendFn();
      return { ok: true, result };
    } catch (err) {
      const statusCode = err?.statusCode || err?.response?.status || null;
      const errName = err?.name || null;
      const is429 = statusCode === 429 || errName === "rate_limit_exceeded";
      const retryAfterHeader =
        err?.response?.headers?.["retry-after"] ||
        err?.response?.headers?.["Retry-After"] ||
        null;

      if (!is429) {
        // Non-rate-limit error: return immediately (no retry)
        return { ok: false, error: err };
      }

      // Rate-limited -> compute wait time (exponential backoff)
      let waitMs = baseDelayMs * Math.pow(2, attempt - 1);

      // If the provider provided Retry-After in seconds, respect it
      if (retryAfterHeader) {
        const parsed = parseFloat(retryAfterHeader);
        if (!Number.isNaN(parsed)) {
          waitMs = Math.max(waitMs, Math.round(parsed * 1000));
        }
      }

      console.warn(
        `Email send rate-limited (attempt ${attempt}/${attempts}). waiting ${waitMs}ms. error: ${
          err?.message || JSON.stringify(err)
        }`
      );

      if (attempt < attempts) {
        await sleep(waitMs);
        continue;
      } else {
        return { ok: false, error: err };
      }
    }
  }
  return { ok: false, error: new Error("Max attempts reached") };
};

/* --------------------- Formatters --------------------- */

/** Normalize booking object for API responses and email template */
const formatBookingData = (booking) => ({
  // Booking info
  bookingId: booking.id,
  status: booking.status || "Pending",
  createdAt: booking.created_at || null,
  updatedAt: booking.updated_at || null,
  isGuestBooking: booking.is_guest_booking === 1 || booking.is_guest_booking === true,

  // User info
  userId: booking.user_id || null,
  userName: booking.user_name || "Guest",
  userEmail: booking.user_email || null,
  userMobile: booking.user_mobile || null,
  isUaeResident: booking.is_uae_resident === 1 || booking.is_uae_resident === true,
  drivingLicenseNumber: booking.driving_license_number || null,
  licenseStatus: booking.license_status || null,
  additionalDriver: booking.additional_driver === 1 || booking.additional_driver === true,

  // Car info
  carId: booking.car_id || null,
  variantId: booking.variant_id || null,
  modelYear: booking.model_year || null,
  carName: booking.car_name || "Unknown",
  carSingleImage: booking.car_single_image || null,
  cdwSunny: booking.cdw_sunny === 1 || booking.cdw_sunny === true,
  insurance: booking.insurance === 1 || booking.insurance === true,

  // Booking logistics
  pickupDate: booking.pickup_date || null,
  returnDate: booking.return_date || null,

  // Locations (ids, resolved names, sublocations, fees)
  pickupLocation: booking.pickup_location_id || null,
  pickupLocationName: booking.pickup_location_name || null,
  pickupSublocation: booking.pickup_sublocation_id || null,
  pickupSublocationName: booking.pickup_sublocation_name || null,
  pickupDeliveryCost: booking.pickup_delivery_cost ? parseFloat(booking.pickup_delivery_cost) : 0,

  returnLocation: booking.return_location_id || null,
  returnLocationName: booking.return_location_name || null,
  returnSublocation: booking.return_sublocation_id || null,
  returnSublocationName: booking.return_sublocation_name || null,
  returnDeliveryCost: booking.return_delivery_cost ? parseFloat(booking.return_delivery_cost) : 0,

  deliveryAddress: (() => {
    if (!booking.delivery_address) return null;
    if (typeof booking.delivery_address === 'object') return booking.delivery_address;
    try {
      return JSON.parse(booking.delivery_address);
    } catch (err) {
      console.warn('Failed to parse deliveryAddress:', err.message);
      return null;
    }
  })(),

  // Payment info
  totalPrice: booking.total_price ? parseFloat(booking.total_price) : 0,
  addOnCharges: booking.add_on_charges ? parseFloat(booking.add_on_charges) : 0,
  paymentStatus: booking.payment_status || "Pending",
  paymentGateway: booking.payment_gateway || null,
  paymentIntentId: booking.payment_intent_id || null,
  paymentMethod: booking.payment_method || null,
});

/* --------------------- Location helpers --------------------- */

/** Resolve a Location by id or by name */
const findLocation = async (idOrName) => {
  if (!idOrName) return null;

  // try as id first
  try {
    const [rows] = await pool.query(
      "SELECT * FROM locations WHERE id = ? LIMIT 1",
      [idOrName]
    );
    if (rows.length) return rows[0];
  } catch (err) {
    // ignore
  }

  // then by name
  try {
    const [rows] = await pool.query(
      "SELECT * FROM locations WHERE name = ? LIMIT 1",
      [idOrName]
    );
    if (rows.length) return rows[0];
  } catch (err) {
    console.warn("findLocation findOne error:", err.message);
  }

  return null;
};

/** Validate sublocation belongs to location & return {name, fee} */
const resolveSublocation = async (locDoc, sublocationId) => {
  // if no location doc provided, return default cost 0
  if (!locDoc) return { name: null, fee: 0 };

  // no sublocation chosen → use location's default fee (or 0)
  if (!sublocationId) return { name: null, fee: locDoc?.delivery_fee ?? 0 };

  const [subRows] = await pool.query(
    "SELECT * FROM sublocations WHERE id = ? AND location_id = ? LIMIT 1",
    [sublocationId, locDoc.id]
  );

  if (!subRows.length) return null; // invalid sublocation for this location

  const sub = subRows[0];
  const fee = typeof sub.delivery_fee === "number" ? sub.delivery_fee : Number(sub.delivery_fee ?? locDoc?.delivery_fee ?? 0);
  return { name: sub.name || null, fee: fee ?? (locDoc?.delivery_fee ?? 0) };
};

/* --------------------- Email sending (rate-aware) --------------------- */

/**
 * sendBookingEmails - sends client email (with retries) and admin emails sequentially
 * - uses sendWithRetry to handle 429s and backoff
 * - spacing between admin mails prevents hitting rate limits
 * - also sends WhatsApp notification
 */
const sendBookingEmails = async (bookingData) => {
  const adminEmails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const emailBody = generateEmailBody(bookingData);

  // 1) Client email (retries)
  if (bookingData.userEmail) {
    try {
      const res = await sendWithRetry(
        () => sendEmail(bookingData.userEmail, "Your Car Booking Confirmation", emailBody),
        4,
        400
      );
      if (res.ok) console.log(` Client email sent to ${bookingData.userEmail}`);
      else console.warn(` Client email failed: ${res.error?.message || res.error}`);
    } catch (err) {
      console.warn(" Client email final error:", err?.message || err);
    }
  } else {
    console.warn(" No client email defined.");
  }

  // 2) Admin emails (sequential, spaced)
  if (adminEmails.length === 0) {
    console.warn(" No admin emails configured.");
  } else {
    // safe spacing (600ms -> ~1.66 req/sec) under a 2 req/sec limit
    const pauseBetweenMs = 600;

    for (let i = 0; i < adminEmails.length; i++) {
      const admin = adminEmails[i];
      try {
        const res = await sendWithRetry(() => sendEmail(admin, "New Car Booking Received", emailBody), 5, 500);
        if (res.ok) {
          console.log(` Admin email sent to ${admin}`);
        } else {
          console.warn(` Failed to send admin email to ${admin}: ${res.error?.message || res.error}`);
        }
      } catch (err) {
        console.warn(` Admin email error for ${admin}:`, err?.message || err);
      }
      await sleep(pauseBetweenMs);
    }
  }

  // 3) Send detailed admin notification using the new admin email service
  try {
    const adminResult = await sendBookingToAdmins(bookingData);
    if (adminResult.success) {
      console.log(" Detailed admin notification sent successfully");
    } else {
      console.warn(" Failed to send detailed admin notification:", adminResult.message);
    }
  } catch (err) {
    console.warn(" Admin email service error:", err?.message || err);
  }

  // 4) Send WhatsApp notification
  try {
    const whatsappResult = await sendBookingNotification(bookingData);
    if (whatsappResult.success) {
      console.log(" WhatsApp notification sent successfully");
    } else {
      console.warn(" Failed to send WhatsApp notification:", whatsappResult.error);
    }
  } catch (err) {
    console.warn(" WhatsApp service error:", err?.message || err);
  }
};

/* --------------------- Controllers --------------------- */

exports.createBooking = async (req, res) => {
  try {
    const body = req.body;
    console.log("ð¦ Booking request body:", JSON.stringify(body, null, 2));

    // Helper to handle UTC dates properly
    const parseUTCDate = (dateStr) => {
      if (!dateStr) return null;
      // If already in ISO format, use as-is
      if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
        return new Date(dateStr);
      }
      // Otherwise, assume it's a local date that needs to be treated as UTC
      return new Date(dateStr);
    };

    // 1) Resolve pickup/return locations (accept id or name)
    const pickupLoc = await findLocation(body.pickupLocation);
    console.log("📍 Pickup location resolved:", pickupLoc ? pickupLoc.name : "NOT FOUND");
    if (!pickupLoc) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid pickup location",
        details: `Location '${body.pickupLocation}' not found`
      });
    }
    const returnLoc = await findLocation(body.returnLocation);
    console.log("📍 Return location resolved:", returnLoc ? returnLoc.name : "NOT FOUND");
    if (!returnLoc) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid return location",
        details: `Location '${body.returnLocation}' not found`
      });
    }

    // 2) Validate sublocations & compute delivery fees
    const pickupResolved = await resolveSublocation(pickupLoc, body.pickupSublocation);
    console.log("📍 Pickup sublocation resolved:", pickupResolved);
    if (!pickupResolved) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup sublocation for the selected pickup location",
        details: `Sublocation '${body.pickupSublocation}' not found for location '${pickupLoc.name}'`
      });
    }
    const returnResolved = await resolveSublocation(returnLoc, body.returnSublocation);
    console.log("📍 Return sublocation resolved:", returnResolved);
    if (!returnResolved) {
      return res.status(400).json({
        success: false,
        message: "Invalid return sublocation for the selected return location",
        details: `Sublocation '${body.returnSublocation}' not found for location '${returnLoc.name}'`
      });
    }

    // 3) Build authoritative payload (server-controlled names & fees)
    const bookingId = require('uuid').v4();

    await pool.query(
      `INSERT INTO bookings (
        id, user_id, car_id, variant_id, model_year,
        pickup_location_id, pickup_location_name, pickup_sublocation_id, pickup_sublocation_name, pickup_delivery_cost,
        return_location_id, return_location_name, return_sublocation_id, return_sublocation_name, return_delivery_cost,
        delivery_address,
        pickup_date, return_date,
        total_price, add_on_charges,
        payment_status, payment_gateway, payment_intent_id, payment_method,
        driving_license_number, license_status, is_uae_resident, is_guest_booking,
        user_name, user_email, user_mobile,
        car_name, car_category, car_single_image,
        additional_driver, cdw_sunny, insurance,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        req.user?.userId || body.userId || null,
        body.carId,
        body.selectedVariantId || null,
        body.selectedModelYear || null,
        body.pickupLocation,
        pickupLoc.name,
        body.pickupSublocation || null,
        pickupResolved.name,
        pickupResolved.fee,
        body.returnLocation,
        returnLoc.name,
        body.returnSublocation || null,
        returnResolved.name,
        returnResolved.fee,
        body.deliveryAddress ? JSON.stringify(body.deliveryAddress) : null,
        parseUTCDate(body.pickupDate),
        parseUTCDate(body.returnDate),
        body.totalPrice || 0,
        body.addOnCharges || 0,
        body.paymentStatus || "pending",
        body.paymentGateway || null,
        body.paymentIntentId || null,
        body.paymentMethod || null,
        body.drivingLicenseNumber || null,
        body.licenseStatus || "valid",
        body.isUaeResident ? 1 : 0,
        body.isGuestBooking ? 1 : 0,
        body.userName || "",
        body.userEmail || "",
        body.userMobile || "",
        body.carName || "",
        body.carCategory || "",
        body.carSingleImage || "",
        body.additionalDriver ? 1 : 0,
        body.cdwSunny ? 1 : 0,
        body.insurance ? 1 : 0,
        body.status || "pending",
      ]
    );

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [bookingId]
    );

    // 5) Email (fire-and-forget; sendBookingEmails handles retries/logging)
    const bookingData = formatBookingData(rows[0]);
    sendBookingEmails(bookingData).catch((err) => {
      console.warn("sendBookingEmails background error:", err?.message || err);
    });

    return res.status(201).json({
      success: true,
      message: "Booking created. Email sending started.",
      data: bookingData,
    });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, data: formatBookingData(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const fields = [];
    const values = [];

    const fieldMap = {
      status: 'status',
      paymentStatus: 'payment_status',
      paymentGateway: 'payment_gateway',
      paymentIntentId: 'payment_intent_id',
      paymentMethod: 'payment_method',
      totalPrice: 'total_price',
      addOnCharges: 'add_on_charges',
      pickupDate: 'pickup_date',
      returnDate: 'return_date',
      deliveryAddress: 'delivery_address',
      userName: 'user_name',
      userEmail: 'user_email',
      userMobile: 'user_mobile',
      drivingLicenseNumber: 'driving_license_number',
      licenseStatus: 'license_status',
      isUaeResident: 'is_uae_resident',
      additionalDriver: 'additional_driver',
      cdwSunny: 'cdw_sunny',
      insurance: 'insurance',
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (req.body[camelKey] !== undefined) {
        fields.push(`${snakeKey} = ?`);
        values.push(req.body[camelKey]);
      }
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    values.push(req.params.id);

    const [result] = await pool.query(
      `UPDATE bookings SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    res.json({ success: true, message: "Booking updated", data: formatBookingData(rows[0]) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM bookings WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "rejected", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await pool.query(
      "UPDATE bookings SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    res.json({ success: true, message: "Booking status updated", data: formatBookingData(rows[0]) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentGateway, paymentIntentId, paymentMethod } = req.body;

    const [result] = await pool.query(
      `UPDATE bookings SET 
        payment_status = ?, 
        payment_gateway = ?, 
        payment_intent_id = ?, 
        payment_method = ? 
      WHERE id = ?`,
      [paymentStatus, paymentGateway, paymentIntentId, paymentMethod, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? LIMIT 1",
      [req.params.id]
    );

    res.json({ success: true, message: "Payment info updated", data: formatBookingData(rows[0]) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getCurrentBookings = async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user?.userId || req.params.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const [bookings] = await pool.query(
      "SELECT * FROM bookings WHERE user_id = ? AND return_date >= ? ORDER BY created_at DESC",
      [userId, now]
    );

    res.json({ success: true, data: bookings.map(formatBookingData) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingHistory = async (req, res) => {
  try {
    // route: /user/history/:id  — accept either param id or authenticated user
    const userId = req.params.id || req.user?.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const [bookings] = await pool.query(
      "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    if (bookings.length === 0) {
      return res.status(200).json({ code: 200, success: true, message: "No booking history found", data: [] });
    }

    res.json({ code: 200, success: true, message: "Booking history retrieved successfully", data: bookings.map(formatBookingData) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { range, startDate, endDate, page = 1, limit = 10, export: exportFlag } = req.query;
    let whereClause = "";
    let params = [];
    const now = new Date();

    // Date filtering on pickupDate
    if (range === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause = "WHERE pickup_date >= ? AND pickup_date <= ?";
      params = [startOfDay, endOfDay];
    } else if (range === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      whereClause = "WHERE pickup_date >= ? AND pickup_date <= ?";
      params = [startOfWeek, endOfWeek];
    } else if (range === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      whereClause = "WHERE pickup_date >= ? AND pickup_date <= ?";
      params = [startOfMonth, endOfMonth];
    } else if (range === "custom") {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause = "WHERE pickup_date >= ? AND pickup_date <= ?";
        params = [start, end];
      }
    }

    // Handle export - return all data without pagination
    if (exportFlag === 'true') {
      const [bookings] = await pool.query(
        `SELECT * FROM bookings ${whereClause} ORDER BY created_at DESC`,
        params
      );
      
      return res.json({
        success: true,
        data: bookings.map(formatBookingData),
      });
    }

    // Pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM bookings ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [bookings] = await pool.query(
      `SELECT * FROM bookings ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), skip]
    );

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit),
      data: bookings.map(formatBookingData),
    });
  } catch (error) {
    console.error("Error in getAllBookings:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.importBookings = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const multer = require('multer');
    const csv = require('csv-parser');
    const fs = require('fs');
    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let importedCount = 0;
          
          for (const row of results) {
            try {
              // Validate required fields
              if (!row['Booking ID'] || !row['Customer Email'] || !row['Car Name'] || !row['Pickup Date'] || !row['Return Date']) {
                errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
                continue;
              }

              // Find user by email
              const [userRows] = await pool.query(
                "SELECT id FROM profiles WHERE email = ? LIMIT 1",
                [row['Customer Email']]
              );

              if (userRows.length === 0) {
                errors.push(`User not found for email: ${row['Customer Email']}`);
                continue;
              }

              // Find car by name
              const [carRows] = await pool.query(
                "SELECT id FROM cars WHERE car_name = ? LIMIT 1",
                [row['Car Name']]
              );

              if (carRows.length === 0) {
                errors.push(`Car not found: ${row['Car Name']}`);
                continue;
              }

              // Insert booking
              const bookingData = {
                bookingId: row['Booking ID'] || `BK${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                user_id: userRows[0].id,
                car_id: carRows[0].id,
                pickup_date: new Date(row['Pickup Date']),
                return_date: new Date(row['Return Date']),
                pickup_location: row['Pickup Location'] || 1,
                return_location: row['Return Location'] || 1,
                total_price: parseFloat(row['Total Price']) || 0,
                status: row['Status'] || 'pending',
                payment_status: row['Payment Status'] || 'pending',
                payment_method: row['Payment Method'] || 'cash',
                created_at: new Date(row['Created Date']) || new Date(),
                updated_at: new Date()
              };

              await pool.query('INSERT INTO bookings SET ?', bookingData);
              importedCount++;
            } catch (error) {
              errors.push(`Error importing row ${JSON.stringify(row)}: ${error.message}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            importedCount,
            totalRows: results.length,
            errors: errors.slice(0, 10), // Return first 10 errors
            message: `Successfully imported ${importedCount} out of ${results.length} bookings`
          });
        } catch (error) {
          // Clean up uploaded file on error
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          throw error;
        }
      });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserBookingCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE user_id = ?",
      [userId]
    );

    res.json({ 
      success: true, 
      data: { count: result[0].count } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get booking counts for all users (more efficient)
exports.getAllUserBookingCounts = async (req, res) => {
  try {
    console.log('Getting all user booking counts...');
    
    // First, let's see what's in the bookings table
    const [bookingsSample] = await pool.query("SELECT id, bookingId, user_id, car_name, status FROM bookings LIMIT 5");
    console.log('Sample bookings:', bookingsSample);
    
    // Check what's in the profiles table
    const [profilesSample] = await pool.query("SELECT id, first_name, last_name FROM profiles LIMIT 5");
    console.log('Sample profiles:', profilesSample);
    
    // Check total bookings and users
    const [totalBookings] = await pool.query("SELECT COUNT(*) as total FROM bookings");
    const [totalUsers] = await pool.query("SELECT COUNT(*) as total FROM profiles");
    console.log('Total bookings:', totalBookings[0]);
    console.log('Total users:', totalUsers[0]);
    
    // Check if there are any NULL user_ids in bookings
    const [nullUserIds] = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE user_id IS NULL OR user_id = ''");
    console.log('NULL user_ids count:', nullUserIds[0]);
    
    // Try a simpler query first - just count all bookings
    const [allBookings] = await pool.query("SELECT COUNT(*) as total FROM bookings");
    console.log('All bookings count:', allBookings[0]);
    
    // Try to get booking counts by user_id (might be NULL)
    const [result] = await pool.query(
      `SELECT 
        b.user_id, 
        COUNT(*) as booking_count,
        p.first_name,
        p.last_name,
        p.email
      FROM bookings b
      LEFT JOIN profiles p ON b.user_id = p.id
      GROUP BY b.user_id, p.first_name, p.last_name, p.email
      ORDER BY booking_count DESC`
    );

    console.log('Booking counts result:', result);

    // If no user_id relationships found, return empty result
    if (result.length === 0) {
      console.log('No user_id relationships found in bookings table');
      res.json({ 
        success: true, 
        data: [] 
      });
      return;
    }

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error getting all user booking counts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
