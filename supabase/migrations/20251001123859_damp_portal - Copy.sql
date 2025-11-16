/*
  # Warehouse & Spare Part Management System

  1. New Tables
    - `spare_inventory` - Individual spare units with unique IDs
    - `spare_transactions` - All spare movements (issued, consumed, returned)
    - `technician_spare_assignments` - Spares assigned to technicians
    - `warehouse_stock` - Main warehouse stock levels

  2. Enhanced Tables
    - Update existing spares table for warehouse management
    - Add tracking fields for complete audit trail

  3. Indexes
    - Performance indexes for all tracking operations
    - Unique constraints for spare IDs

  4. Security
    - Foreign key constraints
    - Audit trail for all operations
*/

-- Warehouse Stock table (main inventory)
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spare_id INT NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    issued_quantity INT NOT NULL DEFAULT 0,
    consumed_quantity INT NOT NULL DEFAULT 0,
    returned_quantity INT NOT NULL DEFAULT 0,
    minimum_stock_level INT DEFAULT 10,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spare_id) REFERENCES spares(id) ON DELETE CASCADE,
    UNIQUE KEY unique_spare_stock (spare_id)
);

-- Individual Spare Inventory (unique IDs for each unit)
CREATE TABLE IF NOT EXISTS spare_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spare_id INT NOT NULL,
    unique_spare_id VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('available', 'issued', 'consumed', 'returned') DEFAULT 'available',
    technician_id INT NULL,
    service_report_id INT NULL,
    batch_number VARCHAR(50) NULL,
    manufacture_date DATE NULL,
    expiry_date DATE NULL,
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    selling_price DECIMAL(10, 2) DEFAULT 0.00,
    location_in_warehouse VARCHAR(100) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (spare_id) REFERENCES spares(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE SET NULL
);

-- Spare Transactions (complete audit trail)
CREATE TABLE IF NOT EXISTS spare_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spare_inventory_id INT NOT NULL,
    transaction_type ENUM('stock_in', 'issued', 'consumed', 'returned', 'damaged', 'lost') NOT NULL,
    technician_id INT NULL,
    service_report_id INT NULL,
    quantity INT DEFAULT 1,
    previous_status ENUM('available', 'issued', 'consumed', 'returned') NULL,
    new_status ENUM('available', 'issued', 'consumed', 'returned') NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spare_inventory_id) REFERENCES spare_inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Technician Spare Assignments (current assignments)
CREATE TABLE IF NOT EXISTS technician_spare_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    spare_inventory_id INT NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATE NULL,
    purpose TEXT NULL,
    status ENUM('active', 'completed', 'overdue') DEFAULT 'active',
    assigned_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (spare_inventory_id) REFERENCES spare_inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (technician_id, spare_inventory_id)
);

-- Update existing service_spares table to link with invoice numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_spares' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE service_spares ADD COLUMN invoice_number VARCHAR(100) NULL;
    ALTER TABLE service_spares ADD COLUMN invoice_date TIMESTAMP NULL;
    ALTER TABLE service_spares ADD COLUMN customer_id INT NULL;
    ALTER TABLE service_spares ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spare_inventory_spare_id ON spare_inventory(spare_id);
CREATE INDEX IF NOT EXISTS idx_spare_inventory_status ON spare_inventory(status);
CREATE INDEX IF NOT EXISTS idx_spare_inventory_technician ON spare_inventory(technician_id);
CREATE INDEX IF NOT EXISTS idx_spare_inventory_unique_id ON spare_inventory(unique_spare_id);
CREATE INDEX IF NOT EXISTS idx_spare_transactions_inventory ON spare_transactions(spare_inventory_id);
CREATE INDEX IF NOT EXISTS idx_spare_transactions_type ON spare_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_spare_transactions_technician ON spare_transactions(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_assignments_tech ON technician_spare_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_assignments_status ON technician_spare_assignments(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_spare ON warehouse_stock(spare_id);

-- Insert sample warehouse stock data
INSERT IGNORE INTO warehouse_stock (spare_id, total_quantity, available_quantity) 
SELECT id, stock_qty, stock_qty FROM spares WHERE stock_qty > 0;

-- Generate sample spare inventory with unique IDs
INSERT IGNORE INTO spare_inventory (spare_id, unique_spare_id, status, cost_price, selling_price)
SELECT 
    s.id,
    CONCAT(
        UPPER(LEFT(s.name, 2)), 
        '-', 
        YEAR(CURDATE()), 
        '-', 
        LPAD((@row_number := @row_number + 1), 4, '0')
    ) as unique_spare_id,
    'available',
    s.price * 0.7,
    s.price
FROM spares s
CROSS JOIN (SELECT @row_number := 0) r
WHERE s.stock_qty > 0
ORDER BY s.id;