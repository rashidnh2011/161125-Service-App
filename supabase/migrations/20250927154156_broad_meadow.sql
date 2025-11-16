-- Service Reports Database Schema

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'technician', 'sales') NOT NULL DEFAULT 'technician',
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    purchased_from_us BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_serial (serial_number)
);

-- Service Reports table
CREATE TABLE service_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    technician_id INT NOT NULL,
    visit_type ENUM('inspection', 'completion') NOT NULL DEFAULT 'inspection',
    linked_report_id INT NULL,
    visit_date DATE NOT NULL,
    status ENUM('draft', 'completed', 'sent') NOT NULL DEFAULT 'draft',
    engineer_signature LONGTEXT,
    customer_signature LONGTEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_report_id) REFERENCES service_reports(id) ON DELETE SET NULL
);

-- Service Items table
CREATE TABLE service_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_report_id INT NOT NULL,
    item_id INT NOT NULL,
    complaint TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    notes TEXT,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Spares table
CREATE TABLE spares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service Spares table
CREATE TABLE service_spares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_item_id INT NOT NULL,
    spare_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (service_item_id) REFERENCES service_items(id) ON DELETE CASCADE,
    FOREIGN KEY (spare_id) REFERENCES spares(id) ON DELETE CASCADE
);

-- Email Recipients table
CREATE TABLE email_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log table
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_service_reports_technician ON service_reports(technician_id);
CREATE INDEX idx_service_reports_customer ON service_reports(customer_id);
CREATE INDEX idx_service_reports_date ON service_reports(visit_date);
CREATE INDEX idx_service_items_report ON service_items(service_report_id);
CREATE INDEX idx_service_items_item ON service_items(item_id);
CREATE INDEX idx_items_serial ON items(serial_number);
CREATE INDEX idx_items_customer ON items(customer_id);

-- Insert demo data
INSERT INTO users (username, email, password, name, role) VALUES
('admin', 'admin@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'),
('tech', 'tech@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John Technician', 'technician'),
('sales', 'sales@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sales Manager', 'sales');

INSERT INTO customers (name, contact_person, phone, email, city, state) VALUES
('ABC Industries Ltd', 'Rajesh Kumar', '+91-9876543210', 'contact@abcindustries.com', 'Mumbai', 'Maharashtra'),
('XYZ Trading Co', 'Priya Sharma', '+91-9876543211', 'priya@xyztrading.com', 'Delhi', 'Delhi'),
('Tech Solutions Pvt Ltd', 'Amit Singh', '+91-9876543212', 'amit@techsolutions.com', 'Bangalore', 'Karnataka');

INSERT INTO items (customer_id, model, serial_number, purchased_from_us, description) VALUES
(1, 'WeighMax Pro 200', 'WMP200-001', TRUE, '200kg Digital Weighing Scale'),
(1, 'CashPoint POS V2', 'CP-V2-001', TRUE, 'Point of Sale Terminal'),
(2, 'WeighMax Eco 100', 'WME100-001', FALSE, '100kg Analog Scale'),
(3, 'CashPoint Pro X1', 'CPX1-001', TRUE, 'Advanced POS System');

INSERT INTO spares (name, part_number, price, description) VALUES
('Load Cell 200kg', 'LC-200K', 2500.00, 'High precision load cell'),
('Digital Display Unit', 'DDU-001', 1200.00, 'LCD display with backlight'),
('Power Adapter 12V', 'PA-12V', 450.00, '12V 2A power adapter'),
('Keypad Assembly', 'KPA-001', 800.00, 'Membrane keypad'),
('Thermal Printer Head', 'TPH-001', 3500.00, '58mm thermal printer head');

INSERT INTO email_recipients (name, email, role) VALUES
('Sales Coordinator', 'coordinator@company.com', 'Sales Coordinator'),
('Regional Manager', 'regional@company.com', 'Regional Manager'),
('Service Head', 'servicehead@company.com', 'Service Head');