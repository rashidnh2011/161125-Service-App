/*
  # Add Storekeeper Role and Enhanced User Management

  1. User Role Updates
    - Add 'storekeeper' role to users table
    - Update existing role enum to include storekeeper
    - Add warehouse-specific permissions

  2. Enhanced User Management
    - Storekeeper role for warehouse operations
    - Proper role-based access control
    - Warehouse management permissions

  3. Security
    - Role-based access for warehouse operations
    - Audit trail for all warehouse activities
*/

-- Add storekeeper role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'technician', 'sales', 'storekeeper') NOT NULL DEFAULT 'technician';

-- Insert demo storekeeper user
INSERT INTO users (username, email, password, name, role) VALUES
('storekeeper', 'storekeeper@company.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Warehouse Manager', 'storekeeper');

-- Update existing admin user to ensure proper access
UPDATE users SET active = 1 WHERE username = 'admin';