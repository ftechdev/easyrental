-- Final Database Schema for EasyRental

-- Cars Table (Updated based on user's actual database structure)
CREATE TABLE IF NOT EXISTS cars (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NULL,
  category_name VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT(11) NOT NULL,
  color VARCHAR(50) NULL,
  license_plate VARCHAR(50) NULL,
  chassis_number VARCHAR(100) NULL,
  mileage INT(11) DEFAULT 0,
  fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid') DEFAULT 'Petrol',
  transmission ENUM('Manual', 'Automatic') DEFAULT 'Automatic',
  seats INT(11) DEFAULT 5,
  doors INT(11) DEFAULT 4,
  luggage_capacity INT(11) DEFAULT 0,
  luggage INT(11) DEFAULT 2,
  engine_capacity VARCHAR(50) NULL,
  daily_rate DECIMAL(10, 2) NOT NULL,
  weekly_rate DECIMAL(10, 2) NULL,
  monthly_rate DECIMAL(10, 2) NULL,
  day_price DECIMAL(10, 2) DEFAULT 0.00,
  week_price DECIMAL(10, 2) DEFAULT 0.00,
  month_price DECIMAL(10, 2) DEFAULT 0.00,
  security_deposit DECIMAL(10, 2) DEFAULT 0.00,
  is_available TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  has_ac TINYINT(1) DEFAULT 1,
  has_air_bags TINYINT(1) DEFAULT 0,
  has_audio_input TINYINT(1) DEFAULT 0,
  has_car_kit TINYINT(1) DEFAULT 0,
  has_gps TINYINT(1) DEFAULT 0,
  has_music TINYINT(1) DEFAULT 0,
  has_seat_belts TINYINT(1) DEFAULT 1,
  description TEXT NULL,
  main_image TEXT NULL,
  single_image TEXT NULL,
  ftp_single_image TEXT NULL,
  images LONGTEXT NULL, -- JSON array
  gallery_images LONGTEXT NULL, -- JSON array
  features LONGTEXT NULL, -- JSON array
  specifications LONGTEXT NULL, -- JSON array
  insurance_details LONGTEXT NULL, -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  delivery_charge DECIMAL(10, 2) DEFAULT 0.00,
  pickup_charge DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  car_id CHAR(36) NOT NULL,
  customer_name VARCHAR(255) NULL,
  customer_email VARCHAR(255) NULL,
  customer_phone VARCHAR(50) NOT NULL,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  pickup_location VARCHAR(255) DEFAULT 'Ajman Office',
  dropoff_location VARCHAR(255) DEFAULT 'Ajman Office',
  total_price DECIMAL(10, 2) NOT NULL,
  delivery_charge DECIMAL(10, 2) DEFAULT 0.00,
  pickup_charge DECIMAL(10, 2) DEFAULT 0.00,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  passport_front TEXT NULL,
  passport_back TEXT NULL,
  driving_licence TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  subject VARCHAR(255) NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
