export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'technician' | 'sales' | 'storekeeper' | 'calibration';
  name: string;
  created_at: string;
  active?: boolean;
  last_login?: string;
}

export interface Customer {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
}

export interface Item {
  id: number;
  customer_id: number;
  item_type: 'scale' | 'pos' | 'other';
  brand: string;
  model: string;
  serial_number: string;
  department?: string;
  purchase_type: 'purchased_us' | 'third_party';
  purchase_date?: string;
  description?: string;
  created_at: string;
  customer?: Customer;
}

export interface ServiceReport {
  id: number;
  report_number: string;
  customer_id: number;
  technician_id: number;
  type: 'inspection' | 'completion' | 'one_time';
  parent_report_id?: number;
  visit_date: string;
  status: 'draft' | 'inspection' | 'completed' | 'sent';
  locked: boolean;
  engineer_signature?: string;
  customer_signature?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  customer?: Customer;
  technician?: User;
  items?: ServiceItem[];
  parent_report?: ServiceReport;
  payment_info?: PaymentInfo;
  visit_type?: string; // For backward compatibility
  service_time?: ServiceTimeLog;
}

export interface ServiceTimeLog {
  id: number;
  service_report_id: number;
  technician_id: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  created_at: string;
}
export interface ServiceItem {
  id: number;
  service_report_id: number;
  item_id?: number;
  manual_item_data?: {
    item_type: string;
    brand: string;
    model: string;
    serial_number: string;
    department?: string;
    purchase_type: string;
  };
  complaint: string;
  diagnostics?: string;
  action_taken: string;
  warranty_flag: boolean;
  notes?: string;
  images?: string[];
  before_images?: string[];
  after_images?: string[];
  item?: Item;
  spares?: ServiceSpare[];
}

export interface ServiceSpare {
  id: number;
  service_item_id: number;
  spare_id: number;
  quantity: number;
  price: number;
  spare_image?: string;
  unique_spare_ids?: string[];
  status?: 'consumed' | 'returned';
  spare?: Spare;
  spare_inventory?: SpareInventory[];
}

export interface Spare {
  id: number;
  name: string;
  part_number: string;
  brand?: string;
  price: number;
  stock_qty: number;
  description?: string;
  warehouse_stock?: WarehouseStock;
}

export interface WarehouseStock {
  id: number;
  spare_id: number;
  total_quantity: number;
  available_quantity: number;
  issued_quantity: number;
  consumed_quantity: number;
  returned_quantity: number;
  minimum_stock_level: number;
}

export interface SpareInventory {
  id: number;
  spare_id: number;
  unique_spare_id: string;
  status: 'available' | 'issued' | 'consumed' | 'returned';
  technician_id?: number;
  service_report_id?: number;
  batch_number?: string;
  manufacture_date?: string;
  expiry_date?: string;
  cost_price: number;
  selling_price: number;
  location_in_warehouse?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  spare?: Spare;
  technician?: User;
}

export interface SpareTransaction {
  id: number;
  spare_inventory_id: number;
  transaction_type: 'stock_in' | 'issued' | 'consumed' | 'returned' | 'damaged' | 'lost';
  technician_id?: number;
  service_report_id?: number;
  quantity: number;
  previous_status?: string;
  new_status: string;
  transaction_date: string;
  notes?: string;
  created_by: number;
  spare_inventory?: SpareInventory;
  technician?: User;
}

export interface TechnicianSpareAssignment {
  id: number;
  technician_id: number;
  spare_inventory_id: number;
  assigned_date: string;
  expected_return_date?: string;
  purpose?: string;
  status: 'active' | 'completed' | 'overdue';
  assigned_by: number;
  spare_inventory?: SpareInventory;
  technician?: User;
}

export interface EmailRecipient {
  id: number;
  name: string;
  email: string;
  role_tag: string;
  active: boolean;
}

export interface EmailLog {
  id: number;
  report_id: number;
  sender_id: number;
  recipients: string[];
  sent_at: string;
  status: 'sent' | 'failed';
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  target_table: string;
  target_id: number;
  timestamp: string;
  details: string;
}

export interface PaymentInfo {
  id: number;
  service_report_id: number;
  invoice_number: string;
  receipt_number?: string;
  amount: number;
  payment_status: 'paid' | 'unpaid';
  unbilled: boolean;
  required_approval: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceApproval {
  id: number;
  service_report_id: number;
  approval_type: 'payment' | 'service' | 'other';
  requested_by: number;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  reason?: string;
  approved_by?: number;
  approved_at?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  service_report?: ServiceReport;
  requested_by_user?: User;
  approved_by_user?: User;
}

export interface Analytics {
  serviceVolumeOverTime: Array<{
    date: string;
    count: number;
  }>;
  paymentStatusBreakdown: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  userActivityTrends: Array<{
    user_name: string;
    report_count: number;
  }>;
  reportTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Calibration Module Types
export interface CalibrationCustomer {
  id: number;
  customer_name: string;
  address: string;
  state: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface CalibrationJob {
  id: number;
  request_number: string;
  job_type: 'ACCREDITED' | 'NON_ACCREDITED';
  request_date: string;
  customer_id: number;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  customer?: CalibrationCustomer;
}

export interface CalibrationJobWithCustomer extends CalibrationJob {
  customer: CalibrationCustomer;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_records: number;
  per_page: number;
}

export interface CalibrationCustomersResponse {
  success: boolean;
  data?: {
    customers: CalibrationCustomer[];
    pagination: PaginationInfo;
  };
  error?: string;
}

export interface CalibrationJobsResponse {
  success: boolean;
  data?: {
    jobs: CalibrationJobWithCustomer[];
    pagination: PaginationInfo;
  };
  error?: string;
}

export interface RequestNumberGenerationRequest {
  job_type: 'ACCREDITED' | 'NON_ACCREDITED';
  request_date: string;
}

export interface RequestNumberGenerationResponse {
  success: boolean;
  data?: {
    request_number: string;
    sequence: number;
    request_date: string;
    job_type: string;
  };
  error?: string;
}

export interface CalibrationCustomerForm {
  customer_name: string;
  address?: string;
  state?: string;
  email?: string;
  phone?: string;
}

export interface ServiceItemForm {
  item_id?: number;
  manual_item_data?: {
    item_type: string;
    brand: string;
    model: string;
    serial_number: string;
    department?: string;
    purchase_type: string;
  };
  complaint: string;
  diagnostics: string;
  action_taken: string;
  warranty_flag: boolean;
  notes: string;
  before_images: string[];
  after_images: string[];
  spares: Array<{
    spare_id: number;
    quantity: number;
    price: number;
    spare_image?: string;
    unique_spare_ids?: string[];
    available_unique_ids?: any[];
    status?: 'consumed' | 'returned';
  }>;
  selected_for_completion?: boolean;
}

// Certificate Management Types
export interface CalibrationCertificate {
  id: number;
  request_number: string;
  certificate_number: string;
  customer_name: string;
  equipment_name: string;
  make: string;
  model_no: string;
  capacity: string;
  serial_no: string;
  asset_no: string;
  date_of_due: string;
  location: string;
  previous_request_number?: string;
  year: string;
  created_at: string;
  updated_at?: string;
}

export interface CalibrationCertificateForm {
  request_number: string;
  certificate_number: string;
  customer_name: string;
  equipment_name: string;
  make: string;
  model_no: string;
  capacity: string;
  serial_no: string;
  asset_no: string;
  date_of_due: string;
  location: string;
  previous_request_number?: string;
}

export interface CertificateSearchFilters {
  certificate_number?: string;
  request_number?: string;
  serial_no?: string;
  customer_name?: string;
  page?: number;
  limit?: number;
}

export interface CalibrationCertificatesResponse {
  success: boolean;
  data?: {
    certificates: CalibrationCertificate[];
    pagination: PaginationInfo;
  };
  error?: string;
}

export interface CertificateNumberGenerationRequest {
  request_number: string;
  count: number;
}

// Reminder System Types
export interface CalibrationReminderSettings {
  id: number;
  customer_name: string;
  reminder_days: string;
  is_enabled: number;
  email_recipients: string[]; 
  created_at: string;
  updated_at: string;
}

export interface CalibrationReminderLog {
  id: number;
  certificate_id: number;
  certificate_number: string;
  customer_name: string;
  customer_email: string;
  reminder_type: 'email' | 'sms';
  reminder_days: number;
  due_date: string;
  sent_date: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  email_content: string;
  recipient_emails: string[];
  is_manual_close: number;
  closed_date?: string;
  closed_by?: string;
  reminder_count: number;
  created_at: string;
  equipment_name?: string;
  make?: string;
  model_no?: string;
  location?: string;
}

export interface ReminderStats {
  total_active_certificates: number;
  upcoming_reminders_7_days: number;
  upcoming_reminders_30_days: number;
  reminders_sent_today: number;
  closed_this_week: number;
  failed_today: number;
  reminder_settings: {
    enabled_settings: number;
    total_settings: number;
  };
}

export interface ReminderSettingsForm {
  customer_name: string;
  reminder_days: string;
  is_enabled: boolean;
  email_recipients: string[];
}

export interface ReminderLogsFilters {
  certificate_number?: string;
  customer_name?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}