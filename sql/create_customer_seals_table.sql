-- Create customer_seals table for storing customer signature seals
CREATE TABLE IF NOT EXISTS customer_seals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    seal_image LONGBLOB NOT NULL,
    seal_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_seal (customer_id)
);

-- Create index for faster lookups
CREATE INDEX idx_customer_seals_customer_id ON customer_seals(customer_id);
CREATE INDEX idx_customer_seals_created_by ON customer_seals(created_by);
