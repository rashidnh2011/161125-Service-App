-- Calibration Certificates Table
-- This table stores all calibration certificate records

CREATE TABLE IF NOT EXISTS `calibration_certificates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) NOT NULL COMMENT 'The job request number (e.g., ASC25/020501)',
  `certificate_number` varchar(100) NOT NULL COMMENT 'Generated certificate number (e.g., ASC25/020501-01)',
  `customer_name` varchar(255) NOT NULL COMMENT 'Customer name from calibration_customers',
  `equipment_name` varchar(255) NOT NULL COMMENT 'Name/description of equipment',
  `make` varchar(100) NOT NULL COMMENT 'Equipment manufacturer/make',
  `model_no` varchar(100) NOT NULL COMMENT 'Equipment model number',
  `capacity` varchar(100) DEFAULT NULL COMMENT 'Equipment capacity/range',
  `serial_no` varchar(100) NOT NULL COMMENT 'Equipment serial number',
  `asset_no` varchar(100) DEFAULT NULL COMMENT 'Customer asset number',
  `date_of_due` date NOT NULL COMMENT 'Calibration due date',
  `location` varchar(255) DEFAULT NULL COMMENT 'Equipment location',
  `previous_request_number` varchar(50) DEFAULT NULL COMMENT 'Previous request number for historical tracking',
  `year` varchar(4) NOT NULL COMMENT 'Year extracted from request number',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_certificate_number` (`certificate_number`),
  KEY `idx_request_number` (`request_number`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_serial_no` (`serial_no`),
  KEY `idx_date_of_due` (`date_of_due`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Calibration certificate records';

-- Add foreign key constraint if calibration_jobs table exists
-- ALTER TABLE `calibration_certificates`
-- ADD CONSTRAINT `fk_certificates_request_number`
-- FOREIGN KEY (`request_number`) REFERENCES `calibration_jobs`(`request_number`) ON DELETE CASCADE;

-- Sample data (for testing)
INSERT INTO `calibration_certificates` (
  `request_number`, `certificate_number`, `customer_name`, `equipment_name`,
  `make`, `model_no`, `capacity`, `serial_no`, `asset_no`, `date_of_due`, `location`, `year`
) VALUES
('ASC25/020501', 'ASC25/020501-01', 'Test Customer', 'Digital Scale',
 'Mettler Toledo', 'XS6002S', '6100g x 0.01g', '123456789', 'ASSET001', '2025-12-31', 'Lab Floor 1', '2025'),
('ASC25/020501', 'ASC25/020501-02', 'Test Customer', 'Analytical Balance',
 'Sartorius', 'CPA225D', '220g x 0.1mg', '987654321', 'ASSET002', '2025-12-31', 'Lab Floor 2', '2025');
