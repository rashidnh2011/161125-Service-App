-- Create quotations table for service reports
CREATE TABLE IF NOT EXISTS quotations (
    id INT(11) NOT NULL AUTO_INCREMENT,
    service_report_id INT(11) NOT NULL,
    quotation_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('sent', 'approved', 'rejected') NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    approved_by INT(11) NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_service_report (service_report_id),
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- Add quotation_info to service_reports table (if not exists)
ALTER TABLE service_reports
ADD COLUMN quotation_id INT(11) NULL AFTER payment_info_id,
ADD FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL;
