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
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
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
    const imageUrl = `${process.env.FTP_BASE_URL}${remoteName}`;
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
    const [rows] = await pool.query(`
      SELECT 
        id, name, brand, model, year, 
        category_name as category, 
        daily_rate as price_per_day,
        weekly_rate as price_per_week,
        monthly_rate as price_per_month,
        main_image as image_url, 
        seats, transmission, fuel_type, 
        is_available as available, 
        features, created_at 
      FROM cars 
      ORDER BY created_at DESC
    `);
    // Ensure boolean availability
    const cars = rows.map(car => ({
      ...car,
      available: car.available === 1 || car.available === true
    }));
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cars', async (req, res) => {
  const {
    name, brand, model, year, category, price_per_day, price_per_week, price_per_month,
    image_url, seats, transmission, fuel_type, features
  } = req.body;
  const id = require('crypto').randomUUID();
  const weeklyRate = price_per_week ?? (price_per_day ? Math.round(price_per_day * 5.5 * 100) / 100 : null);
  const monthlyRate = price_per_month ?? (price_per_day ? Math.round(price_per_day * 22 * 100) / 100 : null);
  try {
    await pool.query(
      `INSERT INTO cars (
        id, name, brand, model, year, category_name, daily_rate, weekly_rate, monthly_rate,
        main_image, seats, transmission, fuel_type, features, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, brand, model, year, category, price_per_day, weeklyRate, monthlyRate,
        image_url, seats, transmission, fuel_type, JSON.stringify(features), 1
      ]
    );
    res.status(201).json({
      id, ...req.body,
      price_per_week: weeklyRate,
      price_per_month: monthlyRate,
      available: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/cars/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  
  // Map frontend field names to database column names
  if (updates.category) { updates.category_name = updates.category; delete updates.category; }
  if (updates.price_per_day !== undefined) { updates.daily_rate = updates.price_per_day; delete updates.price_per_day; }
  if (updates.price_per_week !== undefined) { updates.weekly_rate = updates.price_per_week; delete updates.price_per_week; }
  if (updates.price_per_month !== undefined) { updates.monthly_rate = updates.price_per_month; delete updates.price_per_month; }
  if (updates.image_url) { updates.main_image = updates.image_url; delete updates.image_url; }
  if (updates.available !== undefined) { updates.is_available = updates.available ? 1 : 0; delete updates.available; }

  // Remove id and created_at from updates to avoid SQL errors
  delete updates.id;
  delete updates.created_at;
  delete updates.car_name; // From joins

  const fields = Object.keys(updates);
  const values = Object.values(updates);
  
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  // Handle features JSON stringification
  if (updates.features !== undefined) {
    const featuresIndex = fields.indexOf('features');
    values[featuresIndex] = Array.isArray(updates.features) ? JSON.stringify(updates.features) : updates.features;
  }

  const query = `UPDATE cars SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
  try {
    const [result] = await pool.query(query, [...values, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json({ message: 'Car updated successfully' });
  } catch (err) {
    console.error('Update car error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cars/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cars WHERE id = ?', [id]);
    res.json({ message: 'Car deleted successfully' });
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
      LEFT JOIN cars c ON b.car_id = c.id 
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Booking updated successfully' });
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

// Locations API
app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', async (req, res) => {
  const { name, delivery_charge, pickup_charge } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO locations (name, delivery_charge, pickup_charge) VALUES (?, ?, ?)',
      [name, delivery_charge, pickup_charge]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, delivery_charge, pickup_charge } = req.body;
  try {
    await pool.query(
      'UPDATE locations SET name = ?, delivery_charge = ?, pickup_charge = ? WHERE id = ?',
      [name, delivery_charge, pickup_charge, id]
    );
    res.json({ message: 'Location updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM locations WHERE id = ?', [id]);
    res.json({ message: 'Location deleted successfully' });
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
