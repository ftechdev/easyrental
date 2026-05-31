-- Seed Data for EasyRental

-- Insert Sample Cars
INSERT INTO cars (id, name, brand, model, year, category_name, daily_rate, weekly_rate, monthly_rate, main_image, seats, transmission, fuel_type, is_available, features) VALUES
('363e28a1-4841-4be2-8e02-ad901dcba19e', 'Toyota Camry', 'Toyota', '2024', 2024, 'sedan', 150.00, 825.00, 3300.00, 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "Backup Camera", "Cruise Control"]'),
('474f39b2-5952-5cf3-9f13-be012edcb20f', 'Nissan Patrol', 'Nissan', 'V8 Platinum', 2023, 'suv', 450.00, 2475.00, 9900.00, 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg', 7, 'Automatic', 'Petrol', 1, '["4WD", "Leather Seats", "Sunroof", "GPS"]'),
('585g40c3-6063-6dg4-0g24-cf123fedc31g', 'Tesla Model 3', 'Tesla', 'Long Range', 2024, 'luxury', 300.00, 1650.00, 6600.00, 'https://images.pexels.com/photos/11139552/pexels-photo-11139552.jpeg', 5, 'Automatic', 'Electric', 1, '["Autopilot", "Premium Audio", "Panoramic Roof"]');

-- Insert Admin User (Password is 'admin123')
INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin');

-- Insert Locations
INSERT INTO locations (name, delivery_charge, pickup_charge) VALUES
('Ajman Office', 0.00, 0.00),
('Dubai Airport', 75.00, 75.00),
('Sharjah Office', 50.00, 50.00),
('Abu Dhabi Delivery', 150.00, 150.00),
('Dubai Marina', 75.00, 75.00);

-- Insert Sample Bookings
INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, total_price, status) VALUES
('363e28a1-4841-4be2-8e02-ad901dcba19e', 'John Doe', 'john@example.com', '+971501234567', '2026-06-01', '2026-06-05', 600.00, 'confirmed'),
('474f39b2-5952-5cf3-9f13-be012edcb20f', 'Jane Smith', 'jane@example.com', '+971509876543', '2026-06-10', '2026-06-12', 900.00, 'pending');
