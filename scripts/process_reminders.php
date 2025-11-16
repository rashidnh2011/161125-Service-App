#!/usr/bin/env php
<?php
/**
 * Automated Calibration Reminder Processor
 *
 * This script should be run daily via cron job to process and send
 * calibration certificate reminder emails.
 *
 * Usage: php /path/to/process_reminders.php
 * Cron: 0 9 * * * php /path/to/process_reminders.php
 */

require_once __DIR__ . '/../config/database.php';

// Set error reporting for cron jobs
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/reminder_cron.log');

// Email configuration (configure these for your environment)
define('SMTP_HOST', 'your-smtp-server.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your-email@domain.com');
define('SMTP_PASSWORD', 'your-password');
define('FROM_EMAIL', 'calibration@yourcompany.com');
define('FROM_NAME', 'Calibration System');

class ReminderCronProcessor {
    private $conn;
    private $log_file;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        $this->log_file = __DIR__ . '/../logs/reminder_cron.log';
    }

    public function run() {
        $this->log("Starting automated reminder processing...");

        try {
            // Get current date
            $today = date('Y-m-d');
            $this->log("Processing reminders for date: $today");

            // Get all active reminder settings
            $settings_result = $this->conn->query("
                SELECT * FROM calibration_reminder_settings
                WHERE is_enabled = 1
            ");

            if ($settings_result->rowCount() == 0) {
                $this->log("No active reminder settings found. Exiting.");
                return;
            }

            $total_sent = 0;
            $total_failed = 0;
            $processed_certificates = [];

            while ($setting = $settings_result->fetch(PDO::FETCH_ASSOC)) {
                $this->log("Processing settings for customer: {$setting['customer_name']}");

                $customer_name = $setting['customer_name'];
                $reminder_days = explode(',', $setting['reminder_days']);
                $email_recipients = json_decode($setting['email_recipients'], true) ?? [];

                // Build customer filter
                $customer_filter = $customer_name === 'ALL' ? '' : "AND c.customer_name = '$customer_name'";

                foreach ($reminder_days as $days) {
                    $days = (int)trim($days);
                    if ($days <= 0) continue;

                    // Calculate target date (today + days)
                    $target_date = date('Y-m-d', strtotime("+$days days"));

                    $this->log("Processing reminders for $days days before due date (target: $target_date)");

                    // Find certificates due within this reminder period
                    $query = "
                        SELECT c.*, cs.customer_email
                        FROM calibration_certificates c
                        LEFT JOIN calibration_customers cs ON c.customer_name = cs.customer_name
                        WHERE c.reminder_status = 'active'
                        AND c.date_of_due = ?
                        AND c.certificate_number NOT IN (
                            SELECT certificate_number FROM calibration_reminder_logs
                            WHERE reminder_days = ? AND DATE(sent_date) = CURDATE()
                        )
                        $customer_filter
                    ";

                    $stmt = $this->conn->prepare($query);
                    $stmt->execute([$target_date, $days]);
                    $certificates_result = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    foreach ($certificates_result as $certificate) {
                        $certificate_number = $certificate['certificate_number'];

                        // Skip if already processed
                        if (in_array($certificate_number, $processed_certificates)) {
                            continue;
                        }

                        $processed_certificates[] = $certificate_number;

                        // Prepare email data
                        $email_data = [
                            'certificate_number' => $certificate['certificate_number'],
                            'customer_name' => $certificate['customer_name'],
                            'equipment_name' => $certificate['equipment_name'],
                            'make' => $certificate['make'],
                            'model_no' => $certificate['model_no'],
                            'due_date' => $certificate['date_of_due'],
                            'location' => $certificate['location'],
                            'reminder_days' => $days
                        ];

                        // Send reminder email
                        $email_sent = $this->sendReminderEmail($certificate, $email_data, $email_recipients);

                        // Log the reminder
                        $this->logReminder($certificate, $email_data, $email_sent, $email_recipients);

                        if ($email_sent) {
                            $total_sent++;
                            $this->log("✓ Sent reminder for certificate: {$certificate['certificate_number']}");
                        } else {
                            $total_failed++;
                            $this->log("✗ Failed to send reminder for certificate: {$certificate['certificate_number']}");
                        }
                    }
                }
            }

            $this->log("Reminder processing completed. Sent: $total_sent, Failed: $total_failed, Processed: " . count($processed_certificates));

        } catch (Exception $e) {
            $this->log("ERROR: Failed to process reminders: " . $e->getMessage());
            $this->log("Stack trace: " . $e->getTraceAsString());
        }
    }

    private function sendReminderEmail($certificate, $email_data, $additional_recipients) {
        try {
            // Get customer email from customer record or use default
            $customer_email = $certificate['customer_email'] ?? 'calibration@customer.com';

            // Prepare recipients
            $recipients = [$customer_email];
            if (!empty($additional_recipients)) {
                $recipients = array_merge($recipients, $additional_recipients);
            }

            // Generate email content
            $subject = "Calibration Reminder: {$certificate['certificate_number']} - Due in {$email_data['reminder_days']} days";

            $message = $this->generateEmailTemplate($email_data);

            // Use the dedicated ReminderEmailService
            require_once __DIR__ . '/../config/reminder_email.php';

            $emailService = new ReminderEmailService();

            // Validate recipients
            $validRecipients = [];
            foreach ($recipients as $email) {
                $email = trim($email);
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $validRecipients[] = $email;
                }
            }

            if (empty($validRecipients)) {
                $this->log('No valid email recipients found');
                return false;
            }

            // Send email using ReminderEmailService
            $result = $emailService->sendReminderEmail($validRecipients, $subject, $message);

            return $result['success'];

        } catch (Exception $e) {
            $this->log('Failed to send reminder email: ' . $e->getMessage());
            return false;
        }
    }

    private function generateEmailTemplate($data) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Calibration Reminder</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                <h1 style='margin: 0; font-size: 28px; font-weight: bold;'>🔧 Calibration Reminder</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Arab Scale Calibration Services</p>
            </div>
            
            <div style='background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;'>
                <h2 style='color: #2c3e50; margin-top: 0; font-size: 24px;'>Certificate Due for Calibration</h2>
                
                <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='margin: 0 0 15px 0; color: #495057; font-size: 18px;'>Certificate Details</h3>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d; width: 40%;'>Certificate:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>#{$data['certificate_number']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Customer:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>{$data['customer_name']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Equipment:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>{$data['equipment_name']}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Due Date:</td>
                            <td style='padding: 8px 0; color: #dc3545; font-weight: bold;'>" . date('M d, Y', strtotime($data['due_date'])) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Reminder:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>Due in {$data['reminder_days']} days</td>
                        </tr>
                    </table>
                </div>
                
                <div style='background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;'>
                    <h4 style='margin: 0 0 10px 0; color: #856404; font-size: 16px;'>⚠️ Action Required</h4>
                    <p style='margin: 0; color: #856404; line-height: 1.6;'>
                        Your calibration certificate is due for renewal in {$data['reminder_days']} days.
                        Please contact us to schedule your calibration service to maintain compliance and accuracy.
                    </p>
                </div>
                
                <div style='text-align: center; margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 8px;'>
                    <h4 style='margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;'>Contact Calibration Department</h4>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Phone:</strong> +971 XX XXX XXXX</p>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Email:</strong> calibration@arabscaleme.com</p>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Website:</strong> www.arabscaleme.com</p>
                </div>
                
                <p style='margin: 25px 0 0 0; font-size: 14px; color: #6c757d; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;'>
                    This is an automated reminder from Arab Scale Calibration Management System.
                </p>
            </div>
            
            <div style='text-align: center; margin-top: 20px; padding: 15px; color: #6c757d; font-size: 12px;'>
                <p style='margin: 0;'>© " . date('Y') . " Arab Scale Service. All rights reserved.</p>
            </div>
        </body>
        </html>";
    }

    private function logReminder($certificate, $email_data, $email_sent, $recipients) {
        try {
            $status = $email_sent ? 'sent' : 'failed';
            $error_message = $email_sent ? '' : 'Failed to send email';

            // Get current reminder count for this certificate
            $count_stmt = $this->conn->prepare("
                SELECT COUNT(*) as count FROM calibration_reminder_logs
                WHERE certificate_number = ?
            ");
            $count_stmt->execute([$certificate['certificate_number']]);
            $count_row = $count_stmt->fetch(PDO::FETCH_ASSOC);
            $reminder_count = $count_row['count'] + 1;

            // Insert log entry
            $stmt = $this->conn->prepare("
                INSERT INTO calibration_reminder_logs
                (certificate_id, certificate_number, customer_name, customer_email,
                 reminder_type, reminder_days, due_date, sent_date, status,
                 error_message, email_content, recipient_emails, reminder_count)
                VALUES (?, ?, ?, ?, 'email', ?, ?, NOW(), ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $certificate['id'],
                $certificate['certificate_number'],
                $certificate['customer_name'],
                $certificate['customer_email'],
                $email_data['reminder_days'],
                $certificate['date_of_due'],
                $status,
                $error_message,
                $this->generateEmailTemplate($email_data),
                json_encode($recipients),
                $reminder_count
            ]);

            // Update certificate with last reminder info
            if ($email_sent) {
                $update_stmt = $this->conn->prepare("
                    UPDATE calibration_certificates
                    SET last_reminder_sent = NOW(),
                        total_reminders_sent = total_reminders_sent + 1
                    WHERE certificate_number = ?
                ");
                $update_stmt->execute([$certificate['certificate_number']]);
            }

        } catch (Exception $e) {
            $this->log('Failed to log reminder: ' . $e->getMessage());
        }
    }

    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        $log_entry = "[$timestamp] $message" . PHP_EOL;
        file_put_contents($this->log_file, $log_entry, FILE_APPEND | LOCK_EX);
        echo $log_entry; // Also output to console for cron monitoring
    }
}

// Check if running in CLI mode
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'This script must be run from command line']);
    exit;
}

// Run the reminder processor
try {
    $processor = new ReminderCronProcessor();
    $processor->run();
    echo "Reminder processing completed successfully.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>
