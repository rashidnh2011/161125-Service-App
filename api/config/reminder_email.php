<?php
require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class ReminderEmailService {
    private $mailer;

    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->setupReminderSMTP();
    }

    private function setupReminderSMTP() {
        try {
            // Server settings for Gmail SMTP (same as service reports)
            $this->mailer->isSMTP();
            $this->mailer->Host       = 'smtp.gmail.com';
            $this->mailer->SMTPAuth   = true;
            $this->mailer->Username   = 'reception@arabscaleme.com';
            $this->mailer->Password   = 'ftotcoqabmlzvoje'; // Replace with actual app password
            $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Port       = 587;

            // Default sender for reminders
            $this->mailer->setFrom('calibration@arabscaleme.com', 'Arab Scale Calibration');

            // Character set
            $this->mailer->CharSet = 'UTF-8';

        } catch (Exception $e) {
            error_log("Reminder SMTP setup failed: " . $e->getMessage());
        }
    }

    public function sendReminderEmail($recipients, $subject, $message, $certificateData = null) {
        try {
            // Clear any previous recipients
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();

            // Add recipients
            foreach ($recipients as $email) {
                $this->mailer->addAddress($email);
            }

            // BCC to calibration department
            $this->mailer->addBCC('calibration@arabscaleme.com', 'Calibration Department');

            // BCC to back office
            $this->mailer->addBCC('backoffice@arabscaleme.com', 'Arab Scale Back Office');

            // Subject
            $this->mailer->Subject = $subject;

            // Email body
            $this->mailer->msgHTML($message);

            // Plain text alternative
            $this->mailer->AltBody = strip_tags($message);

            // Add certificate attachment if available and requested
            if ($certificateData && isset($certificateData['include_certificate']) && $certificateData['include_certificate']) {
                // You can add logic here to attach the calibration certificate PDF
                // $this->mailer->addAttachment($certificatePath, "Certificate_{$certificateData['certificate_number']}.pdf");
            }

            // Send email
            $result = $this->mailer->send();

            return array(
                'success' => true,
                'message' => 'Reminder email sent successfully',
                'recipients_count' => count($recipients)
            );

        } catch (Exception $e) {
            error_log("Reminder email sending failed: " . $e->getMessage());
            return array(
                'success' => false,
                'error' => 'Failed to send reminder email: ' . $e->getMessage()
            );
        }
    }

    public function sendBulkReminders($reminderData) {
        $results = [];
        $totalSent = 0;
        $totalFailed = 0;

        foreach ($reminderData as $data) {
            $result = $this->sendReminderEmail(
                $data['recipients'],
                $data['subject'],
                $data['message'],
                $data['certificate_data'] ?? null
            );

            $results[] = $result;

            if ($result['success']) {
                $totalSent++;
            } else {
                $totalFailed++;
            }
        }

        return array(
            'success' => $totalFailed === 0,
            'total_sent' => $totalSent,
            'total_failed' => $totalFailed,
            'results' => $results
        );
    }

    private function getReminderEmailTemplate($data) {
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
}
?>
