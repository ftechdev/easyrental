-- Replace fleet with 20 sample cars (integer auto-increment IDs)
DELETE FROM cars;
ALTER TABLE cars AUTO_INCREMENT = 1;

INSERT INTO cars (name, brand, model, year, category_name, daily_rate, weekly_rate, monthly_rate, main_image, seats, transmission, fuel_type, is_available, features) VALUES
-- Economy
('Kia Picanto', 'Kia', 'LX', 2024, 'economy', 89.00, 489.50, 1958.00, 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg', 4, 'Automatic', 'Petrol', 1, '["Bluetooth", "USB Port", "Air Conditioning"]'),
('Hyundai Accent', 'Hyundai', 'GL', 2023, 'economy', 99.00, 544.50, 2178.00, 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "Backup Camera", "Cruise Control"]'),
('Nissan Sunny', 'Nissan', 'SV', 2024, 'economy', 95.00, 522.50, 2090.00, 'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "Keyless Entry", "Air Conditioning"]'),
('Mitsubishi Attrage', 'Mitsubishi', 'GLX', 2023, 'economy', 85.00, 467.50, 1870.00, 'https://images.pexels.com/photos/919073/pexels-photo-919073.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "USB Port", "Fuel Efficient"]'),
-- Sedan
('Toyota Camry', 'Toyota', 'SE', 2024, 'sedan', 150.00, 825.00, 3300.00, 'https://images.pexels.com/photos/3729464/pexels-photo-3729464.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "Backup Camera", "Cruise Control"]'),
('Honda Accord', 'Honda', 'EX', 2024, 'sedan', 165.00, 907.50, 3630.00, 'https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg', 5, 'Automatic', 'Petrol', 1, '["Sunroof", "Leather Seats", "Apple CarPlay"]'),
('Nissan Altima', 'Nissan', 'SV', 2023, 'sedan', 140.00, 770.00, 3080.00, 'https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bluetooth", "Lane Assist", "Backup Camera"]'),
('Mazda 6', 'Mazda', 'Touring', 2024, 'sedan', 155.00, 852.50, 3410.00, 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg', 5, 'Automatic', 'Petrol', 1, '["Bose Audio", "Heads-Up Display", "Adaptive Cruise"]'),
-- SUV
('Nissan Patrol', 'Nissan', 'V8 Platinum', 2023, 'suv', 450.00, 2475.00, 9900.00, 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg', 7, 'Automatic', 'Petrol', 1, '["4WD", "Leather Seats", "Sunroof", "GPS"]'),
('Toyota Fortuner', 'Toyota', 'Legender', 2024, 'suv', 380.00, 2090.00, 8360.00, 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg', 7, 'Automatic', 'Diesel', 1, '["4WD", "7 Seats", "Roof Rails", "GPS"]'),
('Mitsubishi Pajero', 'Mitsubishi', 'GLS', 2023, 'suv', 350.00, 1925.00, 7700.00, 'https://images.pexels.com/photos/2449456/pexels-photo-2449456.jpeg', 7, 'Automatic', 'Diesel', 1, '["4WD", "Leather Seats", "Hill Descent Control"]'),
('Ford Explorer', 'Ford', 'XLT', 2024, 'suv', 400.00, 2200.00, 8800.00, 'https://images.pexels.com/photos/35975/pexels-photo.jpg', 7, 'Automatic', 'Petrol', 1, '["4WD", "Third Row", "SYNC 3", "Backup Camera"]'),
-- Luxury
('Tesla Model 3', 'Tesla', 'Long Range', 2024, 'luxury', 300.00, 1650.00, 6600.00, 'https://images.pexels.com/photos/11139552/pexels-photo-11139552.jpeg', 5, 'Automatic', 'Electric', 1, '["Autopilot", "Premium Audio", "Panoramic Roof"]'),
('BMW 5 Series', 'BMW', '530i', 2024, 'luxury', 550.00, 3025.00, 12100.00, 'https://images.pexels.com/photos/892522/pexels-photo-892522.jpeg', 5, 'Automatic', 'Petrol', 1, '["Leather Interior", "Harman Kardon", "Parking Assist"]'),
('Mercedes E-Class', 'Mercedes-Benz', 'E200', 2024, 'luxury', 600.00, 3300.00, 13200.00, 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg', 5, 'Automatic', 'Petrol', 1, '["MBUX", "Ambient Lighting", "Burmester Audio"]'),
('Audi A6', 'Audi', '45 TFSI', 2023, 'luxury', 520.00, 2860.00, 11440.00, 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg', 5, 'Automatic', 'Petrol', 1, '["Virtual Cockpit", "Quattro AWD", "Matrix LED"]'),
-- Van
('Toyota Hiace', 'Toyota', 'GL', 2023, 'van', 280.00, 1540.00, 6160.00, 'https://images.pexels.com/photos/3802509/pexels-photo-3802509.jpeg', 12, 'Automatic', 'Diesel', 1, '["12 Seats", "Air Conditioning", "Sliding Doors"]'),
('Nissan Urvan', 'Nissan', '15-Seater', 2023, 'van', 260.00, 1430.00, 5720.00, 'https://images.pexels.com/photos/3802507/pexels-photo-3802507.jpeg', 15, 'Manual', 'Diesel', 1, '["15 Seats", "Luggage Space", "Air Conditioning"]'),
('Mercedes Vito', 'Mercedes-Benz', 'Tourer', 2024, 'van', 350.00, 1925.00, 7700.00, 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg', 8, 'Automatic', 'Diesel', 1, '["8 Seats", "Leather Seats", "Panoramic Roof"]'),
('Kia Carnival', 'Kia', 'LX', 2024, 'van', 320.00, 1760.00, 7040.00, 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg', 8, 'Automatic', 'Petrol', 1, '["8 Seats", "Power Sliding Doors", "Rear Entertainment"]');
