<?php
require_once __DIR__ . '/../vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class EmailService {
    private $mailer;
    
    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->setupSMTP();
    }
    
    private function setupSMTP() {
        try {
            // Server settings for Gmail SMTP
            $this->mailer->isSMTP();
            $this->mailer->Host       = 'smtp.gmail.com';
            $this->mailer->SMTPAuth   = true;
            $this->mailer->Username   = 'reception@arabscaleme.com';
            $this->mailer->Password   = 'ftotcoqabmlzvoje'; // Replace with actual app password
            $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Port       = 587;
            
            // Default sender
            $this->mailer->setFrom('noreply@arabscaleme.com', 'Arab Scale Service');
            
            // Character set
            $this->mailer->CharSet = 'UTF-8';
            
        } catch (Exception $e) {
            error_log("SMTP setup failed: " . $e->getMessage());
        }
    }
    
    public function sendServiceReport($recipients, $reportNumber, $customerName, $pdfPath, $customMessage = '') {
        try {
            // Clear any previous recipients
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            
            // Add recipients
            foreach ($recipients as $email) {
                $this->mailer->addAddress($email);
            }
            
            // Always BCC to back office
            $this->mailer->addBCC('backoffice@arabscaleme.com', 'Arab Scale Back Office');
            
            // Subject
            $this->mailer->Subject = "Service Report #{$reportNumber} - {$customerName}";
            
            // Email body
            $htmlBody = $this->getServiceReportEmailTemplate($reportNumber, $customerName, $customMessage);
            $this->mailer->msgHTML($htmlBody);
            
            // Plain text alternative
            $textBody = $this->getServiceReportTextTemplate($reportNumber, $customerName, $customMessage);
            $this->mailer->AltBody = $textBody;
            
            // Attach PDF if exists
            if ($pdfPath && file_exists($pdfPath)) {
                // Verify PDF file is valid and not empty
                if (filesize($pdfPath) > 0) {
                    // Read first few bytes to verify it's a valid PDF
                    $handle = fopen($pdfPath, 'rb');
                    $header = fread($handle, 8);
                    fclose($handle);

                    // Check if it starts with PDF header
                    if (strpos($header, '%PDF-') === 0) {
                        $this->mailer->addAttachment($pdfPath, "Service_Report_{$reportNumber}.pdf");
                    } else {
                        error_log("Invalid PDF file detected: " . $pdfPath);
                        return array(
                            'success' => false,
                            'error' => 'Generated PDF file is corrupted or invalid'
                        );
                    }
                } else {
                    error_log("PDF file is empty: " . $pdfPath);
                    return array(
                        'success' => false,
                        'error' => 'Generated PDF file is empty'
                    );
                }
            } else {
                error_log("PDF attachment not found: " . $pdfPath);
            }
            
            // Send email
            $result = $this->mailer->send();
            
            return array(
                'success' => true,
                'message' => 'Email sent successfully'
            );
            
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            return array(
                'success' => false,
                'error' => 'Failed to send email: ' . $e->getMessage()
            );
        }
    }
    
    private function getServiceReportEmailTemplate($reportNumber, $customerName, $customMessage) {
        $message = $customMessage ? "<p style='margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; font-style: italic;'>{$customMessage}</p>" : '';
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Service Report #{$reportNumber}</title>
        </head>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;'>
                <h1 style='margin: 0; font-size: 28px; font-weight: bold;'>Arab Scale Service</h1>
                <p style='margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;'>Professional Weighing Scale & POS System Service</p>
            </div>
            
            <div style='background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;'>
                <h2 style='color: #2c3e50; margin-top: 0; font-size: 24px;'>Service Report Completed</h2>
                
                <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                    <h3 style='margin: 0 0 15px 0; color: #495057; font-size: 18px;'>Report Details</h3>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d; width: 40%;'>Report Number:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>#{$reportNumber}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Customer:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>{$customerName}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #6c757d;'>Date:</td>
                            <td style='padding: 8px 0; color: #2c3e50;'>" . date('F j, Y') . "</td>
                        </tr>
                    </table>
                </div>
                
                {$message}
                
                <p style='margin: 25px 0; font-size: 16px; line-height: 1.7;'>
                    We have completed the service work for your equipment. Please find the detailed service report attached to this email.
                </p>
                
                <div style='background: #e8f4fd; border: 1px solid #b8daff; padding: 20px; border-radius: 8px; margin: 25px 0;'>
                    <h4 style='margin: 0 0 10px 0; color: #0056b3; font-size: 16px;'>📎 Attachment</h4>
                    <p style='margin: 0; color: #495057;'>Service_Report_{$reportNumber}.pdf</p>
                </div>
                
                <div style='margin: 30px 0; padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;'>
                    <h4 style='margin: 0 0 10px 0; color: #856404; font-size: 16px;'>Important Notes:</h4>
                    <ul style='margin: 0; padding-left: 20px; color: #856404;'>
                        <li>Please review the service report for detailed information about the work performed</li>
                        <li>Keep this report for your warranty and maintenance records</li>
                        <li>Contact us if you have any questions about the service provided</li>
                    </ul>
                </div>
                
                <div style='text-align: center; margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 8px;'>
                    <h4 style='margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;'>Contact Information</h4>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Phone:</strong> +971 XX XXX XXXX</p>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Email:</strong> support@arabscaleme.com</p>
                    <p style='margin: 5px 0; color: #6c757d;'><strong>Website:</strong> www.arabscaleme.com</p>
                </div>
                
                <p style='margin: 25px 0 0 0; font-size: 14px; color: #6c757d; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;'>
                    Thank you for choosing Arab Scale Service for your weighing scale and POS system needs.
                </p>
            </div>
            
            <div style='text-align: center; margin-top: 20px; padding: 15px; color: #6c757d; font-size: 12px;'>
                <p style='margin: 0;'>This is an automated message from Arab Scale Service Management System</p>
                <p style='margin: 5px 0 0 0;'>© " . date('Y') . " Arab Scale Service. All rights reserved.</p>
            </div>
        </body>
        </html>";
    }
    
    private function getServiceReportTextTemplate($reportNumber, $customerName, $customMessage) {
        $message = $customMessage ? "\n\nCustom Message:\n{$customMessage}\n" : '';
        
        return "
ARAB SCALE SERVICE
Professional Weighing Scale & POS System Service

SERVICE REPORT COMPLETED

Report Details:
- Report Number: #{$reportNumber}
- Customer: {$customerName}
- Date: " . date('F j, Y') . "
{$message}

We have completed the service work for your equipment. Please find the detailed service report attached to this email.

ATTACHMENT:
Service_Report_{$reportNumber}.pdf

IMPORTANT NOTES:
- Please review the service report for detailed information about the work performed
- Keep this report for your warranty and maintenance records
- Contact us if you have any questions about the service provided

CONTACT INFORMATION:
Phone: +971 XX XXX XXXX
Email: support@arabscaleme.com
Website: www.arabscaleme.com

Thank you for choosing Arab Scale Service for your weighing scale and POS system needs.

---
This is an automated message from Arab Scale Service Management System
© " . date('Y') . " Arab Scale Service. All rights reserved.
        ";
    }
}
?>