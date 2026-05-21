require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

// Only start local FTP server if host is localhost/127.0.0.1
if (process.env.FTP_HOST === '127.0.0.1' || process.env.FTP_HOST === 'localhost') {
  require('./ftp');
}

const app = express();
app.use(cors());
app.use(express.json());

// Multer for temporary storage
const upload = multer({ dest: 'uploads/' });

// FTP Upload Helper
async function uploadToFtp(localPath, remoteName) {
  const client = new ftp.Client();
  try {
    await client.access({
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
    });
    await client.uploadFrom(localPath, remoteName);
  } finally {
    client.close();
  }
}

// Serve uploaded files statically for easy access in frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image Upload API
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const remoteName = `${Date.now()}-${req.file.originalname}`;
  try {
    // Upload to our local FTP server (which saves to 'uploads' folder)
    await uploadToFtp(req.file.path, remoteName);
    
    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    // Return the URL to access the file
    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/${remoteName}`;
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.send('EasyRental API is running...');
});

// Cars API
app.get('/api/cars', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cars ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cars', async (req, res) => {
  const { name, brand, model, year, category, price_per_day, image_url, seats, transmission, fuel_type, features } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO cars (name, brand, model, year, category, price_per_day, image_url, seats, transmission, fuel_type, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, brand, model, year, category, price_per_day, image_url, seats, transmission, fuel_type, JSON.stringify(features)]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings API
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name as car_name 
      FROM bookings b 
      JOIN cars c ON b.car_id = c.id 
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, pickup_location, dropoff_location, total_price, delivery_charge, pickup_charge } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, pickup_location, dropoff_location, total_price, delivery_charge, pickup_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, pickup_location, dropoff_location, total_price, delivery_charge, pickup_charge]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contacts API
app.post('/api/contacts', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('Database connection successful');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}).on('error', (err) => {
  console.error('Server failed to start:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
