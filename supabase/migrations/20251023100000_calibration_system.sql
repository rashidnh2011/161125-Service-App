-- Migration: Calibration System
-- Created: 2025-10-23
-- Description: Create calibration module tables and update users table with calibration role

-- First, modify the users table to add calibration role
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'technician', 'storekeeper', 'sales', 'calibration') DEFAULT 'technician';

-- Create calibration_customers table
CREATE TABLE calibration_customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(255) NOT NULL,
    address TEXT,
    state VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_name (customer_name),
    INDEX idx_email (email),
    INDEX idx_phone (phone)
);

-- Create calibration_jobs table
CREATE TABLE calibration_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    job_type ENUM('ACCREDITED', 'NON_ACCREDITED') NOT NULL,
    request_date DATE NOT NULL,
    customer_id INT NOT NULL,
    remarks TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES calibration_customers(id) ON DELETE CASCADE,
    INDEX idx_request_number (request_number),
    INDEX idx_job_type (job_type),
    INDEX idx_request_date (request_date),
    INDEX idx_customer_id (customer_id),
    INDEX idx_created_by (created_by)
);

-- Create a sequence table to track daily sequence numbers for request number generation
CREATE TABLE calibration_job_sequences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sequence_date DATE UNIQUE NOT NULL,
    accredited_sequence INT DEFAULT 0,
    non_accredited_sequence INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sequence_date (sequence_date)
);
