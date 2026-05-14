// controller/bookingController.js
const Booking = require("../models/bookingModel");
const { Location } = require("../models/locationModel");
const sendEmail = require("../services/Mail/nodemailer");
const { generateEmailBody } = require("../emailTemplates/bookingConfirmation");
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
  bookingId: booking._id,
  status: booking.status || "Pending",
  createdAt: booking.createdAt || null,
  updatedAt: booking.updatedAt || null,
  isGuestBooking: booking.isGuestBooking ?? false,

  // User info
  userId: booking.userId?._id || booking.userId || null,
  userName: booking.userName || booking.userId?.name || "Guest",
  userEmail: booking.userId?.email || booking.userEmail || null,
  userMobile: booking.userMobile || null,
  isUaeResident: booking.isUaeResident ?? null,
  drivingLicenseNumber: booking.drivingLicenseNumber || null,
  licenseStatus: booking.licenseStatus || null,
  additionalDriver: booking.additionalDriver ?? null,

  // Car info
  carId: booking.carId?._id || booking.carId || null,
  carName: booking.carName || booking.carId?.name || "Unknown",
  carSingleImage: booking.carSingleImage || booking.carId?.carSingleImage || null,
  cdwSunny: booking.cdwSunny ?? null,
  insurance: booking.insurance ?? null,

  // Booking logistics
  pickupDate: booking.pickupDate || null,
  returnDate: booking.returnDate || null,

  // Locations (ids, resolved names, sublocations, fees)
  pickupLocation: booking.pickupLocation || null,
  pickupLocationName: booking.pickupLocationName || null,
  pickupSublocation: booking.pickupSublocation || null,
  pickupSublocationName: booking.pickupSublocationName || null,
  pickupDeliveryCost: booking.pickupDeliveryCost ?? 0,

  returnLocation: booking.returnLocation || null,
  returnLocationName: booking.returnLocationName || null,
  returnSublocation: booking.returnSublocation || null,
  returnSublocationName: booking.returnSublocationName || null,
  returnDeliveryCost: booking.returnDeliveryCost ?? 0,

  deliveryAddress: booking.deliveryAddress || null,

  // Payment info
  totalPrice: booking.totalPrice || null,
  addOnCharges: booking.addOnCharges || null,
  paymentStatus: booking.paymentStatus || "Pending",
  paymentGateway: booking.paymentGateway || null,
  paymentIntentId: booking.paymentIntentId || null,
  paymentMethod: booking.paymentMethod || null,
});

/* --------------------- Location helpers --------------------- */

/** Resolve a Location by id or by name */
const findLocation = async (idOrName) => {
  if (!idOrName) return null;

  // try as id/_id first (Location._id is a string in your model)
  try {
    const byId = await Location.findById(idOrName).lean();
    if (byId) return byId;
  } catch (err) {
    // ignore - maybe not a valid id or findById threw
  }

  // then by name
  try {
    const byName = await Location.findOne({ name: idOrName }).lean();
    if (byName) return byName;
  } catch (err) {
    console.warn("findLocation findOne error:", err.message);
  }

  return null;
};

/** Validate sublocation belongs to location & return {name, fee} */
const resolveSublocation = (locDoc, sublocationId) => {
  // if no location doc provided, return default cost 0
  if (!locDoc) return { name: null, fee: 0 };

  // no sublocation chosen → use location’s default fee (or 0)
  if (!sublocationId) return { name: null, fee: locDoc?.deliveryFee ?? 0 };

  const sub = (locDoc?.sublocations || []).find((s) => String(s._id) === String(sublocationId));
  if (!sub) return null; // invalid sublocation for this location

  const fee = typeof sub.deliveryFee === "number" ? sub.deliveryFee : Number(sub.deliveryFee ?? locDoc?.deliveryFee ?? 0);
  return { name: sub.name || null, fee: fee ?? (locDoc?.deliveryFee ?? 0) };
};

/* --------------------- Email sending (rate-aware) --------------------- */

/**
 * sendBookingEmails - sends client email (with retries) and admin emails sequentially
 * - uses sendWithRetry to handle 429s and backoff
 * - spacing between admin mails prevents hitting rate limits
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
      if (res.ok) console.log(`📧 Client email sent to ${bookingData.userEmail}`);
      else console.warn(`❌ Client email failed: ${res.error?.message || res.error}`);
    } catch (err) {
      console.warn("❌ Client email final error:", err?.message || err);
    }
  } else {
    console.warn("⚠️ No client email defined.");
  }

  // 2) Admin emails (sequential, spaced)
  if (adminEmails.length === 0) {
    console.warn("⚠️ No admin emails configured.");
    return;
  }

  // safe spacing (600ms -> ~1.66 req/sec) under a 2 req/sec limit
  const pauseBetweenMs = 600;

  for (let i = 0; i < adminEmails.length; i++) {
    const admin = adminEmails[i];
    try {
      const res = await sendWithRetry(() => sendEmail(admin, "New Car Booking Received", emailBody), 5, 500);
      if (res.ok) {
        console.log(`📧 Admin email sent to ${admin}`);
      } else {
        console.warn(`⚠️ Failed to send admin email to ${admin}: ${res.error?.message || res.error}`);
      }
    } catch (err) {
      console.warn(`⚠️ Admin email error for ${admin}:`, err?.message || err);
    }

    if (i < adminEmails.length - 1) {
      await sleep(pauseBetweenMs);
    }
  }
};

/* --------------------- Controllers --------------------- */

exports.createBooking = async (req, res) => {
  try {
    const body = req.body;

    // 1) Resolve pickup/return locations (accept id or name)
    const pickupLoc = await findLocation(body.pickupLocation);
    if (!pickupLoc) {
      return res.status(400).json({ success: false, message: "Invalid pickup location" });
    }
    const returnLoc = await findLocation(body.returnLocation);
    if (!returnLoc) {
      return res.status(400).json({ success: false, message: "Invalid return location" });
    }

    // 2) Validate sublocations & compute delivery fees
    const pickupResolved = resolveSublocation(pickupLoc, body.pickupSublocation);
    if (!pickupResolved) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup sublocation for the selected pickup location",
      });
    }
    const returnResolved = resolveSublocation(returnLoc, body.returnSublocation);
    if (!returnResolved) {
      return res.status(400).json({
        success: false,
        message: "Invalid return sublocation for the selected return location",
      });
    }

    // 3) Build authoritative payload (server-controlled names & fees)
    const payload = {
      // who
      userId: req.user?.userId || body.userId || null,

      // what
      carId: body.carId,

      // where
      pickupLocation: body.pickupLocation, // as sent (id or name)
      pickupLocationName: pickupLoc.name, // resolved
      pickupSublocation: body.pickupSublocation || null,
      pickupSublocationName: pickupResolved.name,
      pickupDeliveryCost: pickupResolved.fee,

      returnLocation: body.returnLocation, // as sent (id or name)
      returnLocationName: returnLoc.name, // resolved
      returnSublocation: body.returnSublocation || null,
      returnSublocationName: returnResolved.name,
      returnDeliveryCost: returnResolved.fee,

      // address
      deliveryAddress: body.deliveryAddress || null,

      // when
      pickupDate: body.pickupDate ? new Date(body.pickupDate) : null,
      returnDate: body.returnDate ? new Date(body.returnDate) : null,

      // money
      totalPrice: body.totalPrice || 0,
      addOnCharges: body.addOnCharges || 0,

      // payment
      paymentStatus: body.paymentStatus || "pending",
      paymentGateway: body.paymentGateway || null,
      paymentIntentId: body.paymentIntentId || null,
      paymentMethod: body.paymentMethod || null,

      // user meta
      drivingLicenseNumber: body.drivingLicenseNumber || null,
      licenseStatus: body.licenseStatus || "valid",
      isUaeResident: !!body.isUaeResident,
      isGuestBooking: !!body.isGuestBooking,
      userName: body.userName || "",
      userEmail: body.userEmail || "",
      userMobile: body.userMobile || "",

      // car meta
      carName: body.carName || "",
      carCategory: body.carCategory || "",
      carSingleImage: body.carSingleImage || "",

      // add-ons
      additionalDriver: !!body.additionalDriver,
      cdwSunny: !!body.cdwSunny,
      insurance: !!body.insurance,

      // status
      status: body.status || "pending",
    };

    // 4) Create booking
    const booking = await Booking.create(payload);

    // 5) Email (fire-and-forget; sendBookingEmails handles retries/logging)
    const bookingData = formatBookingData(booking);
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
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, data: formatBookingData(booking) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking updated", data: formatBookingData(booking) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const result = await Booking.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "rejected", "completed"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking status updated", data: formatBookingData(booking) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentGateway, paymentIntentId, paymentMethod } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, paymentGateway, paymentIntentId, paymentMethod },
      { new: true }
    );

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Payment info updated", data: formatBookingData(booking) });
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

    const bookings = await Booking.find({
      userId,
      returnDate: { $gte: now },
    })
      .populate("carId", "name carSingleImage")
      .populate("userId", "name");

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

    const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

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
    const { range, startDate, endDate, page = 1, limit = 10 } = req.query;
    let filter = {};
    const now = new Date();

    // Date filtering on pickupDate
    if (range === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      filter.pickupDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (range === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      filter.pickupDate = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (range === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filter.pickupDate = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (range === "custom") {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.pickupDate = { $gte: start, $lte: end };
      }
    }

    // Pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

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
