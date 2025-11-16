-- Calibration Reminder System Tables
-- These tables handle automated email reminders for certificate due dates

-- Reminder Settings Table
CREATE TABLE IF NOT EXISTS `calibration_reminder_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL COMMENT 'Customer name (can be specific customer or "ALL")',
  `reminder_days` varchar(100) NOT NULL COMMENT 'Comma-separated days before due date (e.g., "30,7,1")',
  `is_enabled` tinyint(1) DEFAULT 1 COMMENT 'Whether reminders are enabled for this customer',
  `email_recipients` text COMMENT 'Additional email recipients (JSON array)',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reminder settings per customer';

-- Reminder Logs Table
CREATE TABLE IF NOT EXISTS `calibration_reminder_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `certificate_id` int(11) NOT NULL COMMENT 'Reference to calibration_certificates.id',
  `certificate_number` varchar(100) NOT NULL COMMENT 'Certificate number for quick reference',
  `customer_name` varchar(255) NOT NULL COMMENT 'Customer name',
  `customer_email` varchar(255) COMMENT 'Customer email address',
  `reminder_type` enum('email','sms') DEFAULT 'email' COMMENT 'Type of reminder sent',
  `reminder_days` int(11) NOT NULL COMMENT 'How many days before due date this reminder was sent',
  `due_date` date NOT NULL COMMENT 'Original certificate due date',
  `sent_date` timestamp NOT NULL COMMENT 'When the reminder was sent',
  `status` enum('sent','failed','pending') DEFAULT 'pending' COMMENT 'Delivery status',
  `error_message` text COMMENT 'Error details if sending failed',
  `email_content` text COMMENT 'The email content that was sent',
  `recipient_emails` text COMMENT 'JSON array of actual recipients',
  `is_manual_close` tinyint(1) DEFAULT 0 COMMENT 'Whether manually closed by user',
  `closed_date` timestamp NULL DEFAULT NULL COMMENT 'When reminder was manually closed',
  `closed_by` varchar(100) COMMENT 'User who closed the reminder',
  `reminder_count` int(11) DEFAULT 1 COMMENT 'Count of reminders sent for this certificate',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_certificate_id` (`certificate_id`),
  KEY `idx_certificate_number` (`certificate_number`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_sent_date` (`sent_date`),
  KEY `idx_status` (`status`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_is_manual_close` (`is_manual_close`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Logs of all reminders sent';

-- Add reminder status columns to calibration_certificates table
ALTER TABLE `calibration_certificates`
ADD COLUMN IF NOT EXISTS `reminder_status` enum('active','closed','disabled') DEFAULT 'active' COMMENT 'Reminder status for this certificate',
ADD COLUMN IF NOT EXISTS `reminder_closed_date` timestamp NULL DEFAULT NULL COMMENT 'When reminders were closed',
ADD COLUMN IF NOT EXISTS `reminder_closed_by` varchar(100) COMMENT 'User who closed reminders',
ADD COLUMN IF NOT EXISTS `last_reminder_sent` timestamp NULL DEFAULT NULL COMMENT 'When last reminder was sent',
ADD COLUMN IF NOT EXISTS `total_reminders_sent` int(11) DEFAULT 0 COMMENT 'Total reminders sent for this certificate';

-- Add indexes for performance
ALTER TABLE `calibration_certificates`
ADD KEY IF NOT EXISTS `idx_reminder_status` (`reminder_status`),
ADD KEY IF NOT EXISTS `idx_date_of_due_reminder` (`date_of_due`),
ADD KEY IF NOT EXISTS `idx_last_reminder_sent` (`last_reminder_sent`);

-- Default reminder settings (global settings for all customers)
INSERT INTO `calibration_reminder_settings` (`customer_name`, `reminder_days`, `is_enabled`, `email_recipients`) VALUES
('ALL', '30,7,1', 1, '["admin@yourcompany.com"]');

-- Sample reminder logs (for testing)
INSERT INTO `calibration_reminder_logs` (
  `certificate_id`, `certificate_number`, `customer_name`, `customer_email`,
  `reminder_days`, `due_date`, `sent_date`, `status`, `reminder_count`
) VALUES
(1, 'ASC25/020501-01', 'Test Customer', 'customer@example.com', 30, '2025-12-31', NOW() - INTERVAL 30 DAY, 'sent', 1),
(1, 'ASC25/020501-01', 'Test Customer', 'customer@example.com', 7, '2025-12-31', NOW() - INTERVAL 7 DAY, 'sent', 2);
