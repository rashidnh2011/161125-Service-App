-- Add quotation fields to payment_info table
ALTER TABLE payment_info
ADD COLUMN is_quotation TINYINT(1) DEFAULT 0,
ADD COLUMN quotation_status ENUM('sent', 'approved', 'rejected') DEFAULT NULL,
ADD COLUMN quotation_notes TEXT,
ADD COLUMN quotation_sent_at TIMESTAMP NULL,
ADD COLUMN quotation_approved_at TIMESTAMP NULL,
ADD COLUMN quotation_approved_by INT(11) NULL,
ADD INDEX idx_is_quotation (is_quotation),
ADD INDEX idx_quotation_status (quotation_status),
ADD FOREIGN KEY (quotation_approved_by) REFERENCES users(id) ON DELETE SET NULL;
