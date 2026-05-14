// scripts/clearBooking.js
// Safe script to inspect / delete all Booking documents.
// Usage:
//   node scripts/clearBooking.js --dry    => show count, do NOT delete (default)
//   node scripts/clearBooking.js --force  => actually delete all bookings

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const projectRoot = path.join(__dirname, "..");

// prefer .env.production if present, otherwise .env
const envPath = fs.existsSync(path.join(projectRoot, ".env.production"))
  ? path.join(projectRoot, ".env.production")
  : path.join(projectRoot, ".env");

require("dotenv").config({ path: envPath });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry") || !args.includes("--force");
const FORCE = args.includes("--force");

const log = (...t) => console.log("[clearBooking]", ...t);

async function connectDb() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL;
  if (!uri) throw new Error(`MONGO_URI not found in ${envPath}`);
  log("Connecting to MongoDB...");
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  log("Connected.");
}

function loadBookingModel() {
  // Your model filename:
  const modelPath = path.join(__dirname, "../models/bookingModel");
  try {
    const Booking = require(modelPath);
    if (!Booking) throw new Error("Require returned falsy");
    // if module exports an object with named export
    if (typeof Booking === "object" && Booking.Booking) return Booking.Booking;
    return Booking;
  } catch (err) {
    throw new Error(`Unable to load Booking model at ${modelPath}: ${err.message}`);
  }
}

(async () => {
  try {
    log("Using env file:", envPath);
    await connectDb();

    const Booking = loadBookingModel();

    if (typeof Booking.countDocuments !== "function") {
      throw new Error("Loaded Booking module does not look like a Mongoose model (missing countDocuments).");
    }

    const count = await Booking.countDocuments({});
    log(`Found ${count} booking(s).`);

    if (count === 0) {
      log("Nothing to delete. Exiting.");
      process.exit(0);
    }

    if (DRY_RUN) {
      log("Dry run: no deletion performed.");
      log("To delete all bookings run: node scripts/clearBooking.js --force");
      process.exit(0);
    }

    if (!FORCE) {
      log("Safety: refusing to delete without --force.");
      process.exit(1);
    }

    log("Deleting all bookings...");
    const result = await Booking.deleteMany({});
    log("Delete result:", result);
    log(`Deleted ${result.deletedCount ?? "unknown"} booking(s).`);
    process.exit(0);
  } catch (err) {
    console.error("[clearBooking] Error:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
