/*
  # Add Location Tracking and Time Validation

  1. New Tables
    - `service_locations`
      - `id` (int, primary key)
      - `service_report_id` (int, foreign key)
      - `technician_id` (int, foreign key)
      - `start_latitude` (decimal)
      - `start_longitude` (decimal)
      - `end_latitude` (decimal)
      - `end_longitude` (decimal)
      - `start_address` (text)
      - `end_address` (text)
      - `distance_from_customer` (decimal)
      - `location_verified` (boolean)
      - `created_at` (timestamp)

  2. Enhanced Time Logs
    - Add location validation fields
    - Add manipulation detection
    - Add admin verification flags

  3. Security
    - Indexes for performance
    - Foreign key constraints
*/

-- Service Locations table for GPS tracking
CREATE TABLE IF NOT EXISTS service_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_report_id INT NOT NULL,
    technician_id INT NOT NULL,
    start_latitude DECIMAL(10, 8) NULL,
    start_longitude DECIMAL(11, 8) NULL,
    end_latitude DECIMAL(10, 8) NULL,
    end_longitude DECIMAL(11, 8) NULL,
    start_address TEXT NULL,
    end_address TEXT NULL,
    distance_from_customer DECIMAL(8, 2) NULL COMMENT 'Distance in kilometers',
    location_verified BOOLEAN DEFAULT FALSE,
    gps_accuracy DECIMAL(8, 2) NULL COMMENT 'GPS accuracy in meters',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add location and validation fields to service_time_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_time_logs' AND column_name = 'start_location_id'
  ) THEN
    ALTER TABLE service_time_logs ADD COLUMN start_location_id INT NULL;
    ALTER TABLE service_time_logs ADD COLUMN end_location_id INT NULL;
    ALTER TABLE service_time_logs ADD COLUMN time_validated BOOLEAN DEFAULT FALSE;
    ALTER TABLE service_time_logs ADD COLUMN admin_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE service_time_logs ADD COLUMN manipulation_flags JSON NULL;
    ALTER TABLE service_time_logs ADD COLUMN browser_timezone VARCHAR(50) NULL;
    ALTER TABLE service_time_logs ADD COLUMN system_time_check TIMESTAMP NULL;
  END IF;
END $$;

-- Customer locations table for distance validation
CREATE TABLE IF NOT EXISTS customer_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_locations_report ON service_locations(service_report_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_technician ON service_locations(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_verified ON service_locations(location_verified);
CREATE INDEX IF NOT EXISTS idx_customer_locations_customer ON customer_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_time_validated ON service_time_logs(time_validated);
CREATE INDEX IF NOT EXISTS idx_service_time_admin_verified ON service_time_logs(admin_verified);