<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';
include_once '../config/jwt.php';
require_once __DIR__ . '/../vendor/autoload.php';

// --- CUSTOM PDF CLASS TO REMOVE ALL LINES AND AUTO-FOOTER ---
class CustomPDF extends TCPDF {
    // Override Header method to do nothing (guarantees no default lines)
    public function Header() {}

    // Override Footer method to only contain the thank you message
    public function Footer() {
        // Condition to check if it's the last page before drawing the custom footer.
        // This is necessary because TCPDF's AutoPageBreak feature can trigger Footer() 
        // multiple times before the last page content is actually finished.
        if (!$this->page_is_last) {
            return;
        }

        // Set Y position for the footer message
        $this->SetY(-15); 
        $this->SetFont('helvetica', 'I', 8);
        
        // Custom Footer Text (No border/line drawn)
        $this->Cell(0, 5, 'Thank you for your business. For any queries, please contact us.', 0, 1, 'C');
    }

    // New property to explicitly track if the current page is the last one
    public $page_is_last = false;
}
// -----------------------------------------------------------

// --- Initialization and Authorization ---
$database = new Database();
$db = $database->getConnection();
$jwt_handler = new JWTHandler();

$token = $jwt_handler->getTokenFromHeader();
$user_data = $jwt_handler->validateToken($token);

if (!$user_data) {
    http_response_code(401);
    echo json_encode(array("success" => false, "error" => "Unauthorized"));
    exit();
}

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(array("success" => false, "error" => "Report ID required"));
    exit();
}

$report_id = $_GET['id'];

try {
    // --- 1. Get Report Data with Service Time ---
    $query = "SELECT sr.*, c.*, u.name as technician_name, u.email as technician_email,
                      stl.start_time, stl.end_time, stl.duration_seconds,
                      sl.start_address, sl.end_address, sl.location_verified,
                      pi.invoice_number, pi.amount as payment_amount, pi.payment_status,
                      sr.signature_person_name, sr.signature_person_contact
              FROM service_reports sr
              LEFT JOIN customers c ON sr.customer_id = c.id
              LEFT JOIN users u ON sr.technician_id = u.id
              LEFT JOIN service_time_logs stl ON sr.id = stl.service_report_id
              LEFT JOIN service_locations sl ON sr.id = sl.service_report_id
              LEFT JOIN payment_info pi ON sr.id = pi.service_report_id
              WHERE sr.id = :report_id";
    
    if ($user_data['role'] !== 'admin') {
        $query .= " AND sr.technician_id = :technician_id";
    }
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":report_id", $report_id);
    if ($user_data['role'] !== 'admin') {
        $stmt->bindParam(":technician_id", $user_data['id']);
    }
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("success" => false, "error" => "Report not found"));
        exit();
    }
    
    $report = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // --- 2. Get Service Items with Spares ---
    $items_query = "SELECT si.*, i.item_type, i.brand, i.model, i.serial_number, i.department, i.purchase_type
                    FROM service_items si
                    LEFT JOIN items i ON si.item_id = i.id
                    WHERE si.service_report_id = :report_id";
    
    $items_stmt = $db->prepare($items_query);
    $items_stmt->bindParam(":report_id", $report_id);
    $items_stmt->execute();
    
    $items = array();
    $total_spares_cost = 0;
    while ($item_row = $items_stmt->fetch(PDO::FETCH_ASSOC)) {
        $spares_query = "SELECT ss.*, s.name, s.part_number
                          FROM service_spares ss
                          LEFT JOIN spares s ON ss.spare_id = s.id
                          WHERE ss.service_item_id = :service_item_id";
        
        $spares_stmt = $db->prepare($spares_query);
        $spares_stmt->bindParam(":service_item_id", $item_row['id']);
        $spares_stmt->execute();
        
        $spares = array();
        while ($spare_row = $spares_stmt->fetch(PDO::FETCH_ASSOC)) {
            $spares[] = $spare_row;
            $total_spares_cost += ($spare_row['quantity'] * $spare_row['price']);
        }
        
        $item_row['spares'] = $spares;
        $items[] = $item_row;
    }
    
    // --- 3. Create PDF using CustomPDF Class ---
    $pdf = new CustomPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    // Set document information
    $pdf->SetCreator('Service Reports System');
    $pdf->SetAuthor('ARAB SCALE TRADING L.L.C.');
    $pdf->SetTitle('Service Report #' . $report['report_number']);
    
    // Set margins and breaks 
    // Set Footer Margin (PDF_MARGIN_FOOTER is default 10) to define space for the custom footer
    $pdf->SetMargins(15, 10, 15); 
    $pdf->SetHeaderMargin(0); 
    $pdf->SetFooterMargin(10); // Keep 10mm margin for the custom footer
    $pdf->SetAutoPageBreak(TRUE, 25); // BREAK_MARGIN is set to 25mm to avoid content running into footer area
    
    // Add a page
    $pdf->AddPage();
    
    // --- LOGO AND REMOTE IMAGE HANDLING ---
    $logo_url = 'https://xn--amber-fsa.online/arabscalelogo.png';
    $seal_url = 'https://arabscalecalibration.com/seal.jpg'; 
    
    $temp_dir = sys_get_temp_dir();
    $logo_temp_file = $temp_dir . '/arabscalelogo_' . $report_id . '.png';
    $seal_temp_file = $temp_dir . '/arabscaleseal_' . $report_id . '.jpg';
    $engineer_transparent_sig_file = $temp_dir . '/engineer_transparent_sig_' . $report_id . '.png';

    $logo_path_to_use = false;
    $seal_path_to_use = false;
    $engineer_sig_path_to_use = false;

    // Get Company Logo
    $logo_content = @file_get_contents($logo_url);
    if ($logo_content !== false) {
        if (@file_put_contents($logo_temp_file, $logo_content)) {
            $logo_path_to_use = $logo_temp_file;
        }
    }
    
    // Get Company Seal
    $seal_content = @file_get_contents($seal_url);
    if ($seal_content !== false) {
        if (@file_put_contents($seal_temp_file, $seal_content)) {
            $seal_path_to_use = $seal_temp_file;
        }
    }
    
    // Get Customer Seal with Transparency Processing
    $customer_seal_temp_file = $temp_dir . '/customer_seal_' . $report_id . '.png';
    $customer_seal_path_to_use = false;
    $customer_seal_transparent_file = $temp_dir . '/customer_seal_transparent_' . $report_id . '.png';

    // Get customer seal from database
    $customer_seal_query = "SELECT seal_image FROM customer_seals WHERE customer_id = :customer_id";
    $customer_seal_stmt = $db->prepare($customer_seal_query);
    $customer_seal_stmt->bindParam(":customer_id", $report['customer_id']);
    $customer_seal_stmt->execute();

    if ($customer_seal_stmt->rowCount() > 0) {
        $customer_seal_row = $customer_seal_stmt->fetch(PDO::FETCH_ASSOC);
        if (!empty($customer_seal_row['seal_image'])) {
            $seal_data = $customer_seal_row['seal_image'];

            // Determine file extension based on magic number (first few bytes)
            $magic = substr($seal_data, 0, 4);
            $extension = 'bin';

            // Check for PNG signature first (database says it's PNG)
            $png_pos = strpos($seal_data, "\x89PNG");
            if ($png_pos !== false && $png_pos < 10) {
                $extension = 'png';
                error_log("Found PNG signature at position: " . $png_pos);
            } else {
                // Check for JPEG magic number - look for FF D8 FF pattern in first 20 bytes
                $jpeg_magic_pos = strpos($seal_data, "\xFF\xD8\xFF");
                if ($jpeg_magic_pos !== false && $jpeg_magic_pos < 20) {
                    $extension = 'jpg';
                    $customer_seal_temp_file = str_replace('.png', '.jpg', $customer_seal_temp_file);
                    error_log("Found JPEG magic at position: " . $jpeg_magic_pos . " despite PNG filename");
                }
            }

            error_log("Customer seal data length: " . strlen($seal_data) . " bytes");
            error_log("First 50 bytes (hex): " . bin2hex(substr($seal_data, 0, 50)));
            error_log("JPEG magic position: " . $jpeg_magic_pos);
            if ($jpeg_magic_pos !== false) {
                error_log("Bytes around JPEG magic (hex): " . bin2hex(substr($seal_data, $jpeg_magic_pos - 5, 20)));
            }

            // Save the file with correct extension
            if (file_put_contents($customer_seal_temp_file, $seal_data) !== false) {
                // Verify the image is valid
                $image_info = @getimagesize($customer_seal_temp_file);
                if ($image_info !== false) {
                    // Process customer seal for transparency (similar to engineer signature)
                    try {
                        // First, try to create image from the raw data to validate it
                        $img = @imagecreatefromstring($seal_data);
                        if ($img) {
                            $width = imagesx($img);
                            $height = imagesy($img);

                            // Validate image dimensions
                            if ($width > 0 && $height > 0) {
                                $transparent_img = imagecreatetruecolor($width, $height);
                                imagealphablending($transparent_img, false);
                                imagesavealpha($transparent_img, true);

                                $transparent_color = imagecolorallocatealpha($transparent_img, 255, 255, 255, 127);
                                imagefill($transparent_img, 0, 0, $transparent_color);

                                imagecopy($transparent_img, $img, 0, 0, 0, 0, $width, $height);

                                // Make white/light pixels transparent
                                for ($x = 0; $x < $width; $x++) {
                                    for ($y = 0; $y < $height; $y++) {
                                        $pixel_color = imagecolorat($img, $x, $y);
                                        $pixel_r = ($pixel_color >> 16) & 0xFF;
                                        $pixel_g = ($pixel_color >> 8) & 0xFF;
                                        $pixel_b = $pixel_color & 0xFF;

                                        if ($pixel_r >= 240 && $pixel_g >= 240 && $pixel_b >= 240) {
                                            imagesetpixel($transparent_img, $x, $y, $transparent_color);
                                        }
                                    }
                                }

                                if (imagepng($transparent_img, $customer_seal_transparent_file)) {
                                    $customer_seal_path_to_use = $customer_seal_transparent_file;
                                    error_log("Successfully created transparent customer seal for customer ID: " . $report['customer_id']);
                                }

                                imagedestroy($img);
                                imagedestroy($transparent_img);
                            } else {
                                error_log("Invalid image dimensions for customer seal: width=$width, height=$height");
                                $customer_seal_path_to_use = $customer_seal_temp_file; // Fallback to original
                            }
                        } else {
                            error_log("GD: Could not create image from customer seal data string.");
                            $customer_seal_path_to_use = $customer_seal_temp_file; // Fallback to original
                        }
                    } catch (Exception $e) {
                        error_log('Error processing customer seal for transparency: ' . $e->getMessage());
                        $customer_seal_path_to_use = $customer_seal_temp_file; // Fallback to original
                    }
                } else {
                    $error = error_get_last();
                    error_log("Invalid image data in customer seal for customer ID: " . $report['customer_id'] . ". Error: " . ($error ? $error['message'] : 'Unknown error'));

                    // Try to determine why the image is invalid
                    $img = @imagecreatefromstring($seal_data);
                    if ($img === false) {
                        error_log("Failed to create image from string. Image might be corrupted.");
                        error_log("Data appears to be corrupted JPEG data despite having magic numbers");

                        // Try to fix the data by removing any leading bytes before JPEG magic
                        $jpeg_magic_pos = strpos($seal_data, "\xFF\xD8\xFF");
                        if ($jpeg_magic_pos !== false && $jpeg_magic_pos > 0) {
                            error_log("Found JPEG magic at position $jpeg_magic_pos, trying to fix by truncating leading bytes");
                            $fixed_data = substr($seal_data, $jpeg_magic_pos);

                            // Try to create image from fixed data
                            $fixed_img = @imagecreatefromstring($fixed_data);
                            if ($fixed_img) {
                                // Save the fixed image
                                if (imagejpeg($fixed_img, $customer_seal_temp_file)) {
                                    $customer_seal_path_to_use = $customer_seal_temp_file;
                                    error_log("Successfully fixed and saved customer seal image");
                                }
                                imagedestroy($fixed_img);
                            } else {
                                error_log("Failed to create image even from fixed data");
                            }
                        }
                    } else {
                        error_log("Image created from string successfully. Trying to save again...");
                        if (imagejpeg($img, $customer_seal_temp_file)) {
                            $customer_seal_path_to_use = $customer_seal_temp_file;
                            error_log("Successfully saved image after recreating from string");
                        } else {
                            error_log("Failed to save image after recreating from string");
                        }
                        imagedestroy($img);
                    }

                    @unlink($customer_seal_temp_file); // Clean up invalid file
                }
            } else {
                $error = error_get_last();
                error_log("Failed to write customer seal to temp file for customer ID: " . $report['customer_id'] . ". Error: " . ($error ? $error['message'] : 'Unknown error'));
            }
        }
    }

    // Process Engineer Signature for Transparency
    if (!empty($report['engineer_signature'])) {
        try {
            $engineer_sig_data = str_replace('data:image/png;base64,', '', $report['engineer_signature']);
            $engineer_sig_data = str_replace(' ', '+', $engineer_sig_data);
            $engineer_sig_image_data = base64_decode($engineer_sig_data);

            if ($engineer_sig_image_data !== false) {
                $img = @imagecreatefromstring($engineer_sig_image_data);
                if ($img) {
                    $width = imagesx($img);
                    $height = imagesy($img);

                    $transparent_img = imagecreatetruecolor($width, $height);

                    imagealphablending($transparent_img, false);
                    imagesavealpha($transparent_img, true);

                    $transparent_color = imagecolorallocatealpha($transparent_img, 255, 255, 255, 127);
                    imagefill($transparent_img, 0, 0, $transparent_color);

                    imagecopy($transparent_img, $img, 0, 0, 0, 0, $width, $height);

                    for ($x = 0; $x < $width; $x++) {
                        for ($y = 0; $y < $height; $y++) {
                            $pixel_color = imagecolorat($img, $x, $y);
                            $pixel_r = ($pixel_color >> 16) & 0xFF;
                            $pixel_g = ($pixel_color >> 8) & 0xFF;
                            $pixel_b = $pixel_color & 0xFF;

                            if ($pixel_r >= 240 && $pixel_g >= 240 && $pixel_b >= 240) {
                                imagesetpixel($transparent_img, $x, $y, $transparent_color);
                            }
                        }
                    }

                    if (imagepng($transparent_img, $engineer_transparent_sig_file)) {
                        $engineer_sig_path_to_use = $engineer_transparent_sig_file;
                    }

                    imagedestroy($img);
                    imagedestroy($transparent_img);
                } else {
                    error_log("GD: Could not create image from engineer signature data string.");
                }
            } else {
                error_log("GD: Could not base64 decode engineer signature data.");
            }
        } catch (Exception $e) {
            error_log('Error processing engineer signature for transparency: ' . $e->getMessage());
        }
    }


    // --- CUSTOM HEADER: Logo and Report Details (TIGHTENED FIELDS) ---
    $pdf->SetTextColor(0, 0, 0);
    
    $logo_width = 30; 
    $logo_height = 30; 
    $logo_x = 15;
    $logo_y = 5; 

    // 1. Logo Placement
    if ($logo_path_to_use && file_exists($logo_path_to_use)) {
        $pdf->Image($logo_path_to_use, $logo_x, $logo_y, $logo_width, $logo_height, 'PNG', '', 'T', false, 300, '', false, false, 0, false, false, false);
    } else {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetXY($logo_x, $logo_y + ($logo_height / 2) - 5);
        $pdf->Cell($logo_width, 10, 'LOGO', 0, 0, 'C');
    }

    // 2. Title Block (Service Report / Company Name)
    $text_block_x = $logo_x + $logo_width + 5; 
    $text_block_y = $logo_y + 2; 
    
    $pdf->SetFont('helvetica', 'B', 24);
    $pdf->SetXY($text_block_x, $text_block_y);
    $pdf->Cell(60, 10, 'Service Report', 0, 1, 'L');

    $pdf->SetFont('helvetica', '', 10);
    $pdf->SetXY($text_block_x, $text_block_y + 10);
    $pdf->Cell(60, 5, 'ARAB SCALE TRADING L.L.C.', 0, 1, 'L');

    // 3. Report Details Block (Top Right)
    $right_block_width = 70;
    $label_width = 30; // Fixed width for labels
    $value_width = $right_block_width - $label_width; // Remaining width for values
    $report_details_start_x = $pdf->GetPageWidth() - 15 - $right_block_width;
    $report_details_y_start = $logo_y + 2;

    // Report Number (Aligned with Service Report Title)
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->SetXY($report_details_start_x, $report_details_y_start); 
    $pdf->Cell($right_block_width, 5, 'REPORT #' . $report['report_number'], 0, 1, 'R');
    
    // Details (Date, Technician, Type) - TIGHT FIELDS
    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetX($report_details_start_x);
    // Date of Visit
    $pdf->Cell($label_width, 4, 'Date of Visit:', 0, 0, 'L'); 
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($value_width, 4, date('d/m/Y', strtotime($report['visit_date'])), 0, 1, 'R');

    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetX($report_details_start_x);
    // Technician
    $pdf->Cell($label_width, 4, 'Technician:', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($value_width, 4, $report['technician_name'] ?: 'N/A', 0, 1, 'R');

    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetX($report_details_start_x);
    // Type
    $pdf->Cell($label_width, 4, 'Type:', 0, 0, 'L');
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell($value_width, 4, ucfirst($report['type']), 0, 1, 'R');

    // Service Time (NEW FIELD)
    if ($report['duration_seconds']) {
        $pdf->SetFont('helvetica', '', 9);
        $pdf->SetX($report_details_start_x);
        $pdf->Cell($label_width, 4, 'Service Time:', 0, 0, 'L');
        $pdf->SetFont('helvetica', 'B', 9);
        $hours = floor($report['duration_seconds'] / 3600);
        $minutes = floor(($report['duration_seconds'] % 3600) / 60);
        $service_time = sprintf('%dh %dm', $hours, $minutes);
        $pdf->Cell($value_width, 4, $service_time, 0, 1, 'R');
    }

    // --- Set Y position to MINIMIZE space before Customer Details ---
    $final_header_y = max($logo_y + $logo_height, $pdf->GetY());
    $pdf->SetY($final_header_y);
    $pdf->Ln(2); // Minimal space: 2mm

    // --- Customer Details Section ---
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetFillColor(200, 220, 255);
    $pdf->Cell(0, 8, 'Customer Details', 0, 1, 'L', 1);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->SetFillColor(255, 255, 255);
    $pdf->Ln(2);
    
    // Customer Field Details (Using 40mm for label for consistent alignment)
    $pdf->Cell(40, 6, 'Name:', 0, 0);
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(0, 6, $report['name'], 0, 1);
    $pdf->SetFont('helvetica', '', 10);
    
    $pdf->Cell(40, 6, 'Contact Person:', 0, 0);
    $pdf->Cell(0, 6, $report['contact_person'], 0, 1);
    
    if ($report['phone']) {
        $pdf->Cell(40, 6, 'Phone:', 0, 0);
        $pdf->Cell(0, 6, $report['phone'], 0, 1);
    }
    
    if ($report['email']) {
        $pdf->Cell(40, 6, 'Email:', 0, 0);
        $pdf->Cell(0, 6, $report['email'], 0, 1);
    }
    
    if ($report['address']) {
        $pdf->Cell(40, 6, 'Address:', 0, 0);
        $address = $report['address'] . ', ' . $report['city'] . ', ' . $report['state'];
        if ($report['pincode']) {
            $address .= ' - ' . $report['pincode'];
        }
        $pdf->MultiCell(0, 6, $address, 0, 'L');
    }
    
    // Service Location (NEW FIELD)
    if ($report['start_address']) {
        $pdf->Cell(40, 6, 'Service Location:', 0, 0);
        $pdf->MultiCell(0, 6, $report['start_address'], 0, 'L');
    }
    
    $pdf->Ln(5);
    
    // --- Service Summary Section (NEW) ---
    if ($report['start_time'] || $report['payment_amount'] || $report['invoice_number']) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(200, 220, 255);
        $pdf->Cell(0, 8, 'Service Summary', 0, 1, 'L', 1);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Ln(2);
        
        // Service Time Details
        if ($report['start_time'] && $report['end_time']) {
            $pdf->Cell(40, 6, 'Service Started:', 0, 0);
            $pdf->Cell(0, 6, date('d/m/Y H:i', strtotime($report['start_time'])), 0, 1);
            
            $pdf->Cell(40, 6, 'Service Completed:', 0, 0);
            $pdf->Cell(0, 6, date('d/m/Y H:i', strtotime($report['end_time'])), 0, 1);
            
            if ($report['duration_seconds']) {
                $pdf->Cell(40, 6, 'Total Duration:', 0, 0);
                $hours = floor($report['duration_seconds'] / 3600);
                $minutes = floor(($report['duration_seconds'] % 3600) / 60);
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->Cell(0, 6, sprintf('%d hours %d minutes', $hours, $minutes), 0, 1);
                $pdf->SetFont('helvetica', '', 10);
            }
        }
        
        // Payment Information
        if ($report['invoice_number'] || $report['payment_amount']) {
            $pdf->Ln(2);
            if ($report['invoice_number']) {
                $pdf->Cell(40, 6, 'Invoice Number:', 0, 0);
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->Cell(0, 6, $report['invoice_number'], 0, 1);
                $pdf->SetFont('helvetica', '', 10);
            }
            
            if ($report['payment_amount']) {
                $pdf->Cell(40, 6, 'Service Amount:', 0, 0);
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->Cell(50, 6, 'AED ' . number_format($report['payment_amount'], 2), 0, 0);
                
                // Payment Status
                $pdf->SetFont('helvetica', '', 9);
                $status_color = $report['payment_status'] === 'paid' ? array(0, 128, 0) : array(255, 0, 0);
                $pdf->SetTextColor($status_color[0], $status_color[1], $status_color[2]);
                $pdf->Cell(0, 6, '(' . ucfirst($report['payment_status']) . ')', 0, 1);
                $pdf->SetTextColor(0, 0, 0);
            }
        }
        
        // Location Verification Status
        if ($report['location_verified'] !== null) {
            $pdf->Cell(40, 6, 'Location Verified:', 0, 0);
            $pdf->SetFont('helvetica', 'B', 10);
            $verification_text = $report['location_verified'] ? 'Yes' : 'Pending';
            $pdf->Cell(0, 6, $verification_text, 0, 1);
            $pdf->SetFont('helvetica', '', 10);
        }
        
        $pdf->Ln(5);
    }
    
    // --- Service Items Section ---
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->SetFillColor(200, 220, 255);
    $pdf->Cell(0, 8, 'Service Items', 0, 1, 'L', 1);
    
    $item_counter = 1;
    foreach ($items as $item) {
        $pdf->Ln(3);
        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->SetFillColor(240, 240, 240);
        $pdf->Cell(0, 6, 'ITEM ' . $item_counter++ . ':', 1, 1, 'L', 1);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetFillColor(255, 255, 255);
        
        if ($item['item_id']) {
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Type:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(40, 5, ucfirst($item['item_type']), 'B', 0, 'L');
            
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Brand:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(0, 5, $item['brand'], 'B', 1, 'L');
            
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Model:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(70, 5, $item['model'], 'B', 0, 'L');
            
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Serial No:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(0, 5, $item['serial_number'], 'B', 1, 'L');
            
            if ($item['department']) {
                $pdf->SetFont('helvetica', 'B', 9);
                $pdf->Cell(30, 5, 'Department:', 'B', 0, 'L');
                $pdf->SetFont('helvetica', '', 9);
                $pdf->Cell(0, 5, $item['department'], 'B', 1, 'L');
            }
        } else {
            // Handle manual item data (items created during service)
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Type:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(40, 5, 'Manual Entry', 'B', 0, 'L');
            
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Details:', 'B', 0, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $pdf->Cell(0, 5, 'Item details not linked', 'B', 1, 'L');
        }
        
        $pdf->Ln(2);
        
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(30, 5, 'Complaint:', 0, 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->MultiCell(0, 5, $item['complaint'], 0, 'L');
        
        if ($item['diagnostics']) {
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Diagnostics:', 0, 0);
            $pdf->SetFont('helvetica', '', 9);
            $pdf->MultiCell(0, 5, $item['diagnostics'], 0, 'L');
        }
        
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(30, 5, 'Action Taken:', 0, 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->MultiCell(0, 5, $item['action_taken'], 0, 'L');
        
        if (isset($item['warranty_flag']) && $item['warranty_flag']) {
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->SetTextColor(0, 128, 0);
            $pdf->Cell(0, 5, 'STATUS: Under Warranty', 0, 1, 'R');
            $pdf->SetTextColor(0, 0, 0);
        }

        if (isset($item['installation']) && $item['installation']) {
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->SetTextColor(0, 128, 0);
            $pdf->Cell(0, 5, 'STATUS: Installation', 0, 1, 'R');
            $pdf->SetTextColor(0, 0, 0);
        }
        
        if ($item['notes']) {
            $pdf->SetFont('helvetica', 'B', 9);
            $pdf->Cell(30, 5, 'Notes:', 0, 0);
            $pdf->SetFont('helvetica', 'I', 9);
            $pdf->MultiCell(0, 5, $item['notes'], 0, 'L');
        }
        
        // Spares used Sub-Section
        if (!empty($item['spares'])) {
            $pdf->Ln(1);
            $pdf->SetFont('helvetica', 'BU', 9);
            $pdf->Cell(0, 5, 'Spares Used:', 0, 1);
            $pdf->SetFont('helvetica', 'B', 8);
            
            // Spares Header Row
            $pdf->Cell(5, 5, '#', 1, 0, 'C');
            $pdf->Cell(70, 5, 'Part Name', 1, 0, 'L');
            $pdf->Cell(35, 5, 'Part Number', 1, 0, 'L');
            $pdf->Cell(20, 5, 'Quantity', 1, 0, 'R');
            $pdf->Cell(0, 5, 'Unit Price (AED)', 1, 1, 'R');
            
            $pdf->SetFont('helvetica', '', 8);
            $spare_counter = 1;
            foreach ($item['spares'] as $spare) {
                $pdf->Cell(5, 5, $spare_counter++, 'LR', 0, 'C');
                $pdf->Cell(70, 5, $spare['name'], 'R', 0, 'L');
                $pdf->Cell(35, 5, $spare['part_number'], 'R', 0, 'L');
                $pdf->Cell(20, 5, $spare['quantity'], 'R', 0, 'R');
                $pdf->Cell(0, 5, number_format($spare['price'], 2), 'R', 1, 'R');
            }
            $pdf->Cell(0, 0, '', 'T', 1);
        }
        
        $pdf->Ln(4);
    }
    
    // --- Cost Summary Section (NEW) ---
    if ($total_spares_cost > 0 || $report['payment_amount']) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(200, 220, 255);
        $pdf->Cell(0, 8, 'Cost Summary', 0, 1, 'L', 1);
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Ln(2);
        
        if ($total_spares_cost > 0) {
            $pdf->Cell(40, 6, 'Spares Cost:', 0, 0);
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->Cell(0, 6, 'AED ' . number_format($total_spares_cost, 2), 0, 1);
            $pdf->SetFont('helvetica', '', 10);
        }
        
        if ($report['payment_amount']) {
            $pdf->Cell(40, 6, 'Total Service Cost:', 0, 0);
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->Cell(0, 6, 'AED ' . number_format($report['payment_amount'], 2), 0, 1);
            $pdf->SetFont('helvetica', '', 10);
        }
        
        $pdf->Ln(5);
    }
    
    // --- Notes Section ---
    if ($report['notes']) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(200, 220, 255);
        $pdf->Cell(0, 8, 'General Notes', 0, 1, 'L', 1);
        $pdf->SetFont('helvetica', 'I', 10);
        $pdf->MultiCell(0, 6, $report['notes'], 0, 'L');
        $pdf->Ln(5);
    }
    
    // --- Signatures Section ---
    // Check if any signature-related content is present before drawing the header
    if ($report['engineer_signature'] || $report['customer_signature'] || $seal_path_to_use || $customer_seal_path_to_use) {
        $pdf->SetFont('helvetica', 'B', 14);
        $pdf->SetFillColor(200, 220, 255);
        
        // Use WriteHTMLCell to force a page break if needed and ensure the header stays with the content
        $html = '<span style="font-weight: bold; font-size: 14pt; background-color: rgb(200, 220, 255); display: block; width: 100%; padding: 0 0 0 0;">Service Acknowledgment</span>';
        $pdf->writeHTMLCell(0, 8, '', '', $html, 0, 1, 1, true, 'L', true);
        
        $pdf->Ln(5); 
        
        $pdf->SetFont('helvetica', 'B', 10);
        
        // Define sizes and positions
        $seal_width = 40; 
        $seal_height = $seal_width;
        $customer_seal_width = 40;
        $customer_seal_height = 40;
        $engineer_sig_draw_width = 40; 
        $engineer_sig_draw_height = 20; 
        $customer_sig_draw_width = 60; 
        $customer_sig_draw_height = 20; 

        // Offsets for engineer signature over seal
        $signature_overlap_x_offset = ($seal_width - $engineer_sig_draw_width) / 2 + 3;
        $signature_overlap_y_offset = ($seal_height - $engineer_sig_draw_height) / 2 + 2;

        $margin_left = 15;
        $total_content_width = $pdf->GetPageWidth() - (2 * $margin_left); 
        
        // Calculate X positions
        $x_seal = $margin_left;
        $x_customer_seal = $margin_left + $seal_width + 10;
        $x_customer_start = $margin_left + $total_content_width - $customer_sig_draw_width;
        
        $y_start_for_images = $pdf->GetY();
        
        // Check if there is enough space to draw the entire signature block (seal height + text height ~ 40+10 = 50mm)
        $required_height = max($seal_height, $customer_seal_height) + 15; // 15mm for labels and spacing
        $remaining_space = $pdf->getPageHeight() - $y_start_for_images - $pdf->getBreakMargin();

        if ($remaining_space < $required_height) {
            $pdf->AddPage(); // Force new page if space is insufficient
            $y_start_for_images = $pdf->GetY(); // Update Y position
        }

        
        // Display Company Seal Image (Base Layer)
        if ($seal_path_to_use && file_exists($seal_temp_file)) {
            $pdf->Image($seal_temp_file, $x_seal, $y_start_for_images, $seal_width, $seal_height, 'JPG', '', 'T', false, 300, '', false, false, 0);
        }
        
        // --- 2. Display Customer Seal Image (Next to Company Seal) ---
        if ($customer_seal_path_to_use && file_exists($customer_seal_temp_file)) {
            try {
                // Print "Customer Seal:" Label above the seal
                $pdf->SetFont('helvetica', 'B', 10);
                $pdf->SetXY($x_customer_seal, $y_start_for_images - 5);
                $pdf->Cell($customer_seal_width, 5, 'Customer Seal:', 0, 0, 'L');

                // Get image info with error handling
                $image_info = @getimagesize($customer_seal_temp_file);
                
                if ($image_info === false) {
                    throw new Exception('Invalid customer seal image file');
                }
                
                list($width, $height) = $image_info;
                
                // Validate image dimensions
                if ($width <= 0 || $height <= 0) {
                    throw new Exception('Invalid customer seal image dimensions');
                }
                
                // Calculate aspect ratio
                $ratio = min($customer_seal_width / $width, $customer_seal_height / $height);
                $new_width = $width * $ratio;
                $new_height = $height * $ratio;
                
                // Center the image in the available space
                $x_offset = $x_customer_seal + ($customer_seal_width - $new_width) / 2;
                $y_offset = $y_start_for_images;

                // Add the image with transparency and error handling
                if (!@$pdf->Image($customer_seal_temp_file, $x_offset, $y_offset, $new_width, $new_height, 'PNG', '', 'T', false, 300, '', false, false, 0, 'L', false, true)) {
                    throw new Exception('Failed to add customer seal to PDF');
                }
            } catch (Exception $e) {
                // Log the error but don't fail the entire PDF generation
                error_log('Error adding customer seal to PDF: ' . $e->getMessage());
                
                // Draw a placeholder to indicate missing/invalid seal
                $pdf->SetFont('helvetica', 'I', 8);
                $pdf->SetXY($x_customer_seal, $y_start_for_images);
                $pdf->MultiCell($customer_seal_width, 10, '[Invalid or Corrupt\nCustomer Seal]', 1, 'C', false, 1, $x_customer_seal, $y_start_for_images);
            }
        }
        
        // --- 3. Display Engineer Signature Image (Overlapping Company Seal) ---
        if ($engineer_sig_path_to_use && file_exists($engineer_transparent_sig_file)) {
            try {
                $sig_x = $x_seal + $signature_overlap_x_offset;
                $sig_y = $y_start_for_images + $signature_overlap_y_offset;

                $pdf->Image($engineer_transparent_sig_file, $sig_x, $sig_y, $engineer_sig_draw_width, $engineer_sig_draw_height, 'PNG', '', 'T', false, 300, '', false, false, 0);
            } catch (Exception $e) {
                error_log('Error drawing engineer transparent signature: ' . $e->getMessage());
            }
        } elseif (!empty($report['engineer_signature'])) {
            // Fallback: Use original signature if transparency processing failed
            try {
                $engineer_sig_file = $temp_dir . '/engineer_sig_fallback_' . $report_id . '.png';
                $engineer_sig_data = str_replace('data:image/png;base64,', '', $report['engineer_signature']);
                $engineer_sig_data = str_replace(' ', '+', $engineer_sig_data);
                file_put_contents($engineer_sig_file, base64_decode($engineer_sig_data));

                if (file_exists($engineer_sig_file)) {
                    $sig_x = $x_seal + $signature_overlap_x_offset;
                    $sig_y = $y_start_for_images + $signature_overlap_y_offset;

                    $pdf->Image($engineer_sig_file, $sig_x, $sig_y, $engineer_sig_draw_width, $engineer_sig_draw_height, 'PNG', '', 'T', false, 300, '', false, false, 0);
                    @unlink($engineer_sig_file);
                }
            } catch (Exception $e) {
                error_log('Error with fallback signature processing: ' . $e->getMessage());
            }
        }
        
        // --- 4. Display Customer Signature Image (On the right side) ---
        $y_customer_sig = $y_start_for_images + max($seal_height, $customer_seal_height) - $customer_sig_draw_height - 5; 
        if (!empty($report['customer_signature'])) {
            try {
                $customer_sig_file = $temp_dir . '/customer_sig_' . $report_id . '.png';
                $customer_sig_data = str_replace('data:image/png;base64,', '', $report['customer_signature']);
                $customer_sig_data = str_replace(' ', '+', $customer_sig_data);
                file_put_contents($customer_sig_file, base64_decode($customer_sig_data));
                
                if (file_exists($customer_sig_file)) {
                    $pdf->SetXY($x_customer_start, $y_customer_sig);
                    $pdf->Image($customer_sig_file, $x_customer_start, $y_customer_sig, $customer_sig_draw_width, $customer_sig_draw_height, 'PNG', '', '', false, 300, '', false, false, 0);
                    @unlink($customer_sig_file);
                }
            } catch (Exception $e) {
                error_log('Error processing customer signature: ' . $e->getMessage());
            }
        }
        
        // --- Print labels and names below the images/seal ---
        
        // Set text pointer below the seal's full height
        $max_seal_height = max($seal_height, $customer_seal_height);
        $y_start_for_text = $y_start_for_images + $max_seal_height + 2; // 2mm buffer below seal
        $current_y = $y_start_for_text;

        // --- Customer Seal Line & Name (Below Customer Seal Area) ---
        if ($customer_seal_path_to_use) {
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_customer_seal, $current_y);
            // Draw a line
            $pdf->Cell($customer_seal_width, 0, '', 'T', 0, 'C'); 
            
            // Print Label
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_customer_seal, $current_y); 
            $pdf->Cell($customer_seal_width, 5, 'Customer Seal', 0, 0, 'C'); 
        }
        
        // --- Engineer Signature Line & Name (Below Company Seal Area) ---
        if ($report['engineer_signature'] || $seal_path_to_use) {
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_seal, $current_y + 8);
            // Draw a line
            $pdf->Cell($seal_width, 0, '', 'T', 0, 'C'); 
            
            // Print Label
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_seal, $current_y + 8); 
            $pdf->Cell($seal_width, 5, 'Engineer Signature', 0, 0, 'C'); 
            
            // Print Name
            $pdf->SetFont('helvetica', '', 8);
            $pdf->SetXY($x_seal, $current_y + 13); 
            $pdf->Cell($seal_width, 4, $report['technician_name'] ?: 'N/A', 0, 0, 'C');
        }
        
        // --- Customer Signature Line & Name (Aligned to the right) ---
        if ($report['customer_signature']) {
            // Customer Label and Line
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_customer_start, $current_y + 8);
            // Draw a line
            $pdf->Cell($customer_sig_draw_width, 0, '', 'T', 0, 'C'); 
            
            // Print Label
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->SetXY($x_customer_start, $current_y + 8);
            $pdf->Cell($customer_sig_draw_width, 5, 'Customer Signature', 0, 0, 'C');
            
            // Customer Name
            $pdf->SetFont('helvetica', '', 8);
            $pdf->SetXY($x_customer_start, $current_y + 13); 
            $signature_name = isset($report['signature_person_name']) && !empty($report['signature_person_name']) ? $report['signature_person_name'] : $report['contact_person'];
            $signature_contact = isset($report['signature_person_contact']) && !empty($report['signature_person_contact']) ? $report['signature_person_contact'] : '';
            $display_text = $signature_name;
            if ($signature_contact) {
                $display_text .= ' (' . $signature_contact . ')';
            }
            $pdf->Cell($customer_sig_draw_width, 4, $display_text, 0, 0, 'C');
        }
        
        // Move PDF pointer past this section
        $pdf->SetY($current_y + 18); 
    }
    
    // Clean up temporary files
    if ($logo_path_to_use) @unlink($logo_temp_file);
    if ($seal_path_to_use) @unlink($seal_temp_file);
    if ($customer_seal_path_to_use) @unlink($customer_seal_temp_file);
    if (isset($customer_seal_transparent_file) && file_exists($customer_seal_transparent_file)) @unlink($customer_seal_transparent_file);
    if ($engineer_sig_path_to_use) @unlink($engineer_transparent_sig_file); 
    
    // --- 4. Output PDF ---
    
    // Set the flag to indicate this is the last page before final output
    $pdf->page_is_last = true;

    // Force the document end to ensure the Footer is drawn exactly once on the last page.
    $pdf->lastPage(); 

    $filename = 'Service_Report_' . $report['report_number'] . '.pdf';
    $pdf->Output($filename, 'D');
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "error" => "Failed to generate PDF: " . $e->getMessage()));
}
?>