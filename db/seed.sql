INSERT INTO cars (name, brand, model, year, category, price_per_day, image_url, seats, transmission, fuel_type, features) VALUES
('Toyota Camry', 'Toyota', '2024', 2024, 'sedan', 150.00, 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg', 5, 'Automatic', 'Petrol', '["Bluetooth", "Backup Camera", "Cruise Control"]'),
('Nissan Patrol', 'Nissan', 'V8 Platinum', 2023, 'suv', 450.00, 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg', 7, 'Automatic', 'Petrol', '["4WD", "Leather Seats", "Sunroof", "GPS"]'),
('Tesla Model 3', 'Tesla', 'Long Range', 2024, 'luxury', 300.00, 'https://images.pexels.com/photos/11139552/pexels-photo-11139552.jpeg', 5, 'Automatic', 'Electric', '["Autopilot", "Premium Audio", "Panoramic Roof"]');

INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin');

INSERT INTO bookings (car_id, customer_name, customer_email, customer_phone, pickup_date, return_date, total_price, status) VALUES
(1, 'John Doe', 'john@example.com', '+971501234567', '2026-06-01', '2026-06-05', 600.00, 'confirmed'),
(2, 'Jane Smith', 'jane@example.com', '+971509876543', '2026-06-10', '2026-06-12', 900.00, 'pending');
