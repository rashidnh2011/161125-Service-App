<?php
/**
 * CRM Database Migration Script
 * Creates all necessary tables for CRM functionality
 */

require_once 'config/database.php';

$database = new Database();
$conn = $database->getConnection();

try {
    // Create leads table
    $sql = "CREATE TABLE IF NOT EXISTS leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        source VARCHAR(50) DEFAULT 'other',
        status ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'new',
        assigned_to INT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        estimated_value DECIMAL(10,2) DEFAULT 0.00,
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
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create leads table
    $sql = "CREATE TABLE IF NOT EXISTS leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        source ENUM('website', 'referral', 'cold_call', 'social_media', 'advertisement', 'trade_show', 'other') DEFAULT 'other',
        status ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'new',
        assigned_to INT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        estimated_value DECIMAL(10,2) DEFAULT 0.00,
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
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);
    $sql = "CREATE TABLE IF NOT EXISTS contacts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lead_id INT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        position VARCHAR(100),
        department VARCHAR(100),
        is_primary BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create opportunities table
    $sql = "CREATE TABLE IF NOT EXISTS opportunities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lead_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        stage ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost') DEFAULT 'prospecting',
        probability DECIMAL(5,2) DEFAULT 0.00,
        estimated_value DECIMAL(10,2) DEFAULT 0.00,
        actual_value DECIMAL(10,2),
        expected_close_date DATE,
        closed_date DATE,
        salesperson_id INT,
        source VARCHAR(100),
        next_action TEXT,
        next_action_date DATE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (salesperson_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create quotations table
    $sql = "CREATE TABLE IF NOT EXISTS quotations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        opportunity_id INT,
        quotation_number VARCHAR(50) UNIQUE NOT NULL,
        issue_date DATE NOT NULL,
        valid_until DATE,
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        tax_amount DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('draft', 'sent', 'approved', 'rejected', 'expired') DEFAULT 'draft',
        notes TEXT,
        terms TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create quotation_items table
    $sql = "CREATE TABLE IF NOT EXISTS quotation_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        quotation_id INT,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    )";
    $conn->query($sql);

    // Create activities table
    $sql = "CREATE TABLE IF NOT EXISTS activities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lead_id INT,
        opportunity_id INT,
        contact_id INT,
        salesperson_id INT,
        activity_type ENUM('call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'other') NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        scheduled_date DATETIME,
        completed_date DATETIME,
        status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        location VARCHAR(255),
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (salesperson_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    // Create visits table
    $sql = "CREATE TABLE IF NOT EXISTS visits (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lead_id INT,
        contact_id INT,
        assigned_to INT,
        visit_type ENUM('lead', 'non_lead') DEFAULT 'lead',
        status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
        start_latitude DECIMAL(10,8),
        start_longitude DECIMAL(11,8),
        end_latitude DECIMAL(10,8),
        end_longitude DECIMAL(11,8),
        start_address TEXT,
        end_address TEXT,
        start_time DATETIME,
        end_time DATETIME,
        duration_minutes INT DEFAULT 0,
        purpose TEXT,
        notes TEXT,
        outcome TEXT,
        follow_up_required BOOLEAN DEFAULT FALSE,
        follow_up_date DATE,
        prospect_name VARCHAR(255),
        prospect_phone VARCHAR(20),
        prospect_email VARCHAR(255),
        prospect_company VARCHAR(255),
        converted_to_lead BOOLEAN DEFAULT FALSE,
        converted_lead_id INT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create visit_tracking table for location tracking
    $sql = "CREATE TABLE IF NOT EXISTS visit_tracking (
        id INT PRIMARY KEY AUTO_INCREMENT,
        visit_id INT,
        salesperson_id INT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        accuracy DECIMAL(8,2),
        location_address TEXT,
        check_in_time DATETIME,
        check_out_time DATETIME,
        distance_traveled DECIMAL(8,2),
        verified BOOLEAN DEFAULT FALSE,
        suspicious_activity TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
        FOREIGN KEY (salesperson_id) REFERENCES users(id)
    )";
    $conn->query($sql);

    // Create indexes for better performance
    $sql = "CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_opportunities_salesperson ON opportunities(salesperson_id)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_activities_salesperson ON activities(salesperson_id)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(scheduled_date)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_visits_salesperson ON visits(assigned_to)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(created_at)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status)";
    $conn->query($sql);

    $sql = "CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type)";
    $conn->query($sql);

    echo "CRM tables created successfully!\n";

} catch (Exception $e) {
    echo "Error creating CRM tables: " . $e->getMessage() . "\n";
}
?>
