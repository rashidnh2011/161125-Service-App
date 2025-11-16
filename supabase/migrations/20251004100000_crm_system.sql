-- CRM Database Schema Migration
-- Created: 2025-10-04
-- Description: Adds comprehensive CRM functionality including leads, contacts, opportunities, activities, and visits

-- Leads table - for managing potential customers
CREATE TABLE leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    source ENUM('website', 'referral', 'cold_call', 'social_media', 'advertisement', 'trade_show', 'other') DEFAULT 'other',
    status ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'new',
    assigned_to INT,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    estimated_value DECIMAL(12, 2) DEFAULT 0.00,
    expected_close_date DATE,
    industry VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Contacts table - for storing detailed contact information
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    company VARCHAR(200),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    department VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    website VARCHAR(200),
    linkedin VARCHAR(200),
    twitter VARCHAR(200),
    notes TEXT,
    lead_id INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Opportunities table - for tracking sales opportunities
CREATE TABLE opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    lead_id INT,
    contact_id INT,
    assigned_to INT,
    stage ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'prospecting',
    value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    probability INT DEFAULT 10 COMMENT 'Percentage 0-100',
    expected_close_date DATE,
    actual_close_date DATE,
    source VARCHAR(100),
    description TEXT,
    next_step TEXT,
    competition TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table - for logging all customer interactions
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT,
    contact_id INT,
    opportunity_id INT,
    assigned_to INT,
    activity_type ENUM('call', 'email', 'meeting', 'note', 'task', 'demo', 'proposal', 'contract', 'other') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    outcome TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Visits table - for tracking field visits with GPS and timer
CREATE TABLE visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NULL COMMENT 'NULL for non-lead visits',
    contact_id INT NULL,
    assigned_to INT NOT NULL,
    visit_type ENUM('lead', 'non_lead') NOT NULL,
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',

    -- Location data
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    start_address TEXT,
    end_address TEXT,

    -- Timing
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INT DEFAULT 0 COMMENT 'Auto-calculated',

    -- Visit details
    purpose TEXT,
    notes TEXT,
    outcome TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,

    -- Non-lead visit specific fields
    prospect_name VARCHAR(200),
    prospect_phone VARCHAR(20),
    prospect_email VARCHAR(100),
    prospect_company VARCHAR(200),

    -- Conversion tracking
    converted_to_lead BOOLEAN DEFAULT FALSE,
    converted_lead_id INT NULL,

    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (converted_lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- Quotations table - for reference logging
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT,
    lead_id INT,
    quotation_number VARCHAR(100) NOT NULL,
    quotation_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('draft', 'sent', 'accepted', 'rejected') DEFAULT 'draft',
    valid_until DATE,
    notes TEXT,
    items JSON COMMENT 'Quotation line items',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Invoices table - for reference logging
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT,
    lead_id INT,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    items JSON COMMENT 'Invoice line items',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_by ON leads(created_by);

CREATE INDEX idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE INDEX idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_close_date ON opportunities(expected_close_date);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_opportunity_id ON activities(opportunity_id);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_due_date ON activities(due_date);

CREATE INDEX idx_visits_lead_id ON visits(lead_id);
CREATE INDEX idx_visits_assigned_to ON visits(assigned_to);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_start_time ON visits(start_time);
CREATE INDEX idx_visits_type ON visits(visit_type);

CREATE INDEX idx_quotations_opportunity_id ON quotations(opportunity_id);
CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);

CREATE INDEX idx_invoices_opportunity_id ON invoices(opportunity_id);
CREATE INDEX idx_invoices_lead_id ON invoices(lead_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Insert some sample CRM data
INSERT INTO leads (first_name, last_name, company, email, phone, source, status, estimated_value, industry, created_by) VALUES
('Rajesh', 'Kumar', 'TechCorp Solutions', 'rajesh@techcorp.com', '+91-9876543210', 'website', 'qualified', 50000.00, 'Technology', 1),
('Priya', 'Sharma', 'Global Industries', 'priya@globalind.com', '+91-9876543211', 'referral', 'proposal', 75000.00, 'Manufacturing', 1),
('Amit', 'Singh', 'Modern Retail Ltd', 'amit@modernretail.com', '+91-9876543212', 'cold_call', 'contacted', 30000.00, 'Retail', 1);

INSERT INTO contacts (first_name, last_name, title, company, email, phone, department, lead_id, created_by) VALUES
('Rajesh', 'Kumar', 'IT Manager', 'TechCorp Solutions', 'rajesh@techcorp.com', '+91-9876543210', 'Information Technology', 1, 1),
('Priya', 'Sharma', 'Procurement Head', 'Global Industries', 'priya@globalind.com', '+91-9876543211', 'Procurement', 2, 1),
('Amit', 'Singh', 'Store Manager', 'Modern Retail Ltd', 'amit@modernretail.com', '+91-9876543212', 'Operations', 3, 1);

INSERT INTO opportunities (name, lead_id, contact_id, assigned_to, stage, value, probability, expected_close_date, description, created_by) VALUES
('TechCorp Weighing Scale Implementation', 1, 1, 1, 'proposal', 50000.00, 75, '2024-11-15', 'Complete weighing scale solution for warehouse', 1),
('Global Industries POS System', 2, 2, 1, 'negotiation', 75000.00, 60, '2024-12-01', 'Modern POS system for manufacturing facility', 1),
('Modern Retail Scale Integration', 3, 3, 1, 'qualification', 30000.00, 40, '2024-11-30', 'Scale integration for retail operations', 1);
