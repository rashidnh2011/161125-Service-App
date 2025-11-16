@@ .. @@
 -- Email Logs table
 CREATE TABLE email_logs (
     id INT AUTO_INCREMENT PRIMARY KEY,
     report_id INT NOT NULL,
     sender_id INT NOT NULL,
     recipients JSON NOT NULL,
     sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     status ENUM('sent', 'failed') DEFAULT 'sent',
     FOREIGN KEY (report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
     FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
 );
 
+-- Payment Info table
+CREATE TABLE payment_info (
+    id INT AUTO_INCREMENT PRIMARY KEY,
+    service_report_id INT NOT NULL,
+    invoice_number VARCHAR(100) NOT NULL,
+    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
+    payment_status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
+    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
+    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
+    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
+    UNIQUE KEY unique_service_report (service_report_id)
+);
+
 -- Audit Log table
 CREATE TABLE audit_logs (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     action VARCHAR(50) NOT NULL,
     target_table VARCHAR(50) NOT NULL,
     target_id INT NOT NULL,
     details JSON,
     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 );
 
 -- Indexes for performance
 CREATE INDEX idx_service_reports_technician ON service_reports(technician_id);
 CREATE INDEX idx_service_reports_customer ON service_reports(customer_id);
 CREATE INDEX idx_service_reports_date ON service_reports(visit_date);
 CREATE INDEX idx_service_reports_type ON service_reports(type);
 CREATE INDEX idx_service_items_report ON service_items(service_report_id);
 CREATE INDEX idx_service_items_item ON service_items(item_id);
 CREATE INDEX idx_items_serial ON items(serial_number);
 CREATE INDEX idx_items_customer ON items(customer_id);
 CREATE INDEX idx_items_purchase_type ON items(purchase_type);
 CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id);
 CREATE INDEX idx_email_logs_report ON email_logs(report_id);
+CREATE INDEX idx_payment_info_report ON payment_info(service_report_id);
+CREATE INDEX idx_payment_info_status ON payment_info(payment_status);