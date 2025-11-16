/*
  # Add Service Time Tracking

  1. New Tables
    - `service_time_logs`
      - `id` (int, primary key)
      - `service_report_id` (int, foreign key)
      - `technician_id` (int, foreign key)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `duration_seconds` (int)
      - `created_at` (timestamp)

  2. Indexes
    - Index on service_report_id for fast lookups
    - Index on technician_id for performance reports
    - Index on start_time for time-based queries
*/

-- Service Time Logs table
CREATE TABLE IF NOT EXISTS service_time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_report_id INT NOT NULL,
    technician_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_seconds INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_report_id) REFERENCES service_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_service_time_logs_report ON service_time_logs(service_report_id);
CREATE INDEX idx_service_time_logs_technician ON service_time_logs(technician_id);
CREATE INDEX idx_service_time_logs_start_time ON service_time_logs(start_time);
CREATE INDEX idx_service_time_logs_duration ON service_time_logs(duration_seconds);