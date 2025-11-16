const API_BASE_URL = '/api';

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Only clear token and reload for critical authentication failures
          // Don't clear token for non-critical API calls that might fail
          const isCriticalEndpoint = endpoint.includes('/auth/') ||
                                   endpoint.includes('/me.php');

          if (isCriticalEndpoint) {
            localStorage.removeItem('auth_token');
            window.location.reload();
          }
          throw new Error('Unauthorized');
        }

        // Get response text to see what we're actually getting
        const responseText = await response.text();
        console.error(`API Error ${response.status} for ${endpoint}:`, responseText);

        throw new Error(`HTTP error! status: ${response.status}. Response: ${responseText.substring(0, 200)}...`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // If it's not JSON, log what we got
        const responseText = await response.text();
        console.error(`Non-JSON response for ${endpoint}:`, responseText);
        throw new Error(`Expected JSON but got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('API request failed:', error);

      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection');
      }

      throw error;
    }
  }

  // Authentication
  async login(credentials: { username: string; password: string }) {
    return this.request('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me.php');
  }

  // Customers
  async getCustomers() {
    return this.request('/customers/list.php');
  }

  async createCustomer(customer: any) {
    return this.request('/customers/create.php', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  }

  // Customer Seal Management
  async getCustomerSeal(customerId: number) {
    return this.request(`/seals/get.php?customer_id=${customerId}`);
  }

  async saveCustomerSeal(customerId: number, sealImage: string) {
    return this.request('/seals/save.php', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, seal_image: sealImage })
    });
  }

  // Items
  async getItems(customerId?: number, globalSearch?: boolean) {
    const params = new URLSearchParams();
    if (customerId) params.append('customer_id', customerId.toString());
    if (globalSearch) params.append('global_search', '1');

    return this.request(`/items/list.php?${params.toString()}`);
  }

  async searchItems(query: string) {
    return this.request(`/items/search.php?q=${encodeURIComponent(query)}`);
  }

  async assignItemToCustomer(itemId: number, customerId: number) {
    return this.request('/items/assign.php', {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId, customer_id: customerId })
    });
  }

  async createItem(item: any) {
    return this.request('/items/create.php', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  // Service Reports
  async getServiceReports() {
    return this.request('/reports/list.php');
  }

  // Get all service reports (admin only)
  async getAllServiceReports() {
    return this.request('/reports/list.php');
  }

  async getServiceReport(id: number) {
    return this.request(`/reports/get.php?id=${id}`);
  }

  async createServiceReport(report: any) {
    return this.request('/reports/create.php', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  }

  async updateServiceReport(id: number, report: any) {
    return this.request('/reports/update.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...report })
    });
  }

  // Get Inspection Report
  async getInspectionReport(reportNumber: string) {
    return this.request(`/reports/get-inspection.php?report_number=${encodeURIComponent(reportNumber)}`);
  }

  // User Management
  async getUsers() {
    return this.request('/admin/users/list.php');
  }

  async createUser(user: any) {
    return this.request('/admin/users/create.php', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  async updateUser(id: number, user: any) {
    return this.request('/admin/users/update.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...user })
    });
  }

  async deleteUser(id: number) {
    return this.request('/admin/users/delete.php', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
  }

  async toggleUserStatus(id: number) {
    return this.request('/admin/users/toggle-status.php', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  // Payment Management
  async savePaymentInfo(reportId: number, paymentData: any) {
    return this.request('/reports/payment.php', {
      method: 'POST',
      body: JSON.stringify({ report_id: reportId, ...paymentData })
    });
  }

  async getPaymentInfo(reportId: number) {
    return this.request(`/reports/payment.php?report_id=${reportId}`);
  }

  // Quotation Management (using payment_info table)
  async addQuotation(reportId: number, quotationData: { quotation_number: string; amount: number; notes?: string }) {
    return this.request('/reports/payment.php', {
      method: 'POST',
      body: JSON.stringify({
        report_id: reportId,
        is_quotation: 1,
        invoice_number: quotationData.quotation_number,
        amount: quotationData.amount,
        quotation_notes: quotationData.notes || '',
        quotation_status: 'sent'
      })
    });
  }

  async getQuotation(serviceReportId: number) {
    return this.request(`/reports/payment.php?report_id=${serviceReportId}`);
  }

  async updateQuotationStatus(recordId: number, status: 'sent' | 'approved' | 'rejected') {
    // For updating quotation status, we need to get the current record first
    const currentData = await this.request<{ success: boolean; data: any }>(`/reports/payment.php?report_id=${recordId}`);
    if (!currentData.success || !currentData.data) {
      throw new Error('Quotation not found');
    }

    return this.request('/reports/payment.php', {
      method: 'POST',
      body: JSON.stringify({
        report_id: recordId,
        is_quotation: 1,
        invoice_number: currentData.data.invoice_number,
        amount: currentData.data.amount,
        quotation_status: status,
        quotation_notes: currentData.data.quotation_notes || ''
      })
    });
  }

  // Analytics
  async getServiceApprovals(status?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    return this.request(`/admin/approvals.php?${params.toString()}`);
  }

  async approveService(approvalId: number, notes?: string) {
    return this.request('/admin/approve-service.php', {
      method: 'POST',
      body: JSON.stringify({ approval_id: approvalId, notes })
    });
  }

  async rejectService(approvalId: number, notes?: string) {
    return this.request('/admin/reject-service.php', {
      method: 'POST',
      body: JSON.stringify({ approval_id: approvalId, notes })
    });
  }

  // CRM Analytics
  async getSalesAnalytics(period: string = 'month', userId?: number) {
    const params = new URLSearchParams();
    params.append('period', period);
    if (userId) params.append('user_id', userId.toString());

    return this.request(`/admin/analytics/sales?${params.toString()}`);
  }

  async getSalespeopleAnalytics() {
    return this.request('/admin/analytics/salespeople');
  }

  async getSalesTrends(period: string = 'month') {
    return this.request(`/admin/analytics/trends?period=${period}`);
  }

  async getLeadSourceAnalytics() {
    return this.request('/admin/analytics/lead-sources');
  }

  async getOpportunityStageAnalytics() {
    return this.request('/admin/analytics/opportunity-stages');
  }

  // Scale History
  async getScaleHistory(serialNumber?: string) {
    const params = new URLSearchParams();
    if (serialNumber) params.append('serial_number', serialNumber);
    
    return this.request(`/reports/history.php?${params.toString()}`);
  }

  // Email Recipients
  async getEmailRecipients() {
    return this.request('/email/recipients.php');
  }

  // Send Report
  async sendReport(reportId: number, emails: string[], message?: string) {
    return this.request('/reports/send.php', {
      method: 'POST',
      body: JSON.stringify({ report_id: reportId, emails, message })
    });
  }

  // Generate PDF
  async generatePDF(reportId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/reports/pdf.php?id=${reportId}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }
    
    return response.blob();
  }

  // Upload Image
  async uploadImage(file: File): Promise<{ success: boolean; filename?: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload/image.php`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    return response.json();
  }

  // Spares
  async getAvailableSparesByType(spareTypeId: number) {
    return this.request(`/calibration/spares/available-by-type.php?spare_type_id=${spareTypeId}`);
  }

  async getSpares() {
    return this.request('/spares/list.php');
  }

  async createSpare(spare: { name: string; part_number: string; price: number; description?: string; minimum_stock_level?: number }) {
    return this.request('/spares/create.php', {
      method: 'POST',
      body: JSON.stringify(spare)
    });
  }

  // Warehouse Management
  async getWarehouseStock() {
    return this.request('/warehouse/stock.php');
  }

  async getSpareInventory(filters?: { status?: string; technician_id?: number; spare_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.technician_id) params.append('technician_id', filters.technician_id.toString());
    if (filters?.spare_id) params.append('spare_id', filters.spare_id.toString());
    
    return this.request(`/warehouse/inventory.php?${params.toString()}`);
  }

  async issueSpareToTechnician(spareInventoryIds: number[], technicianId: number, purpose?: string) {
    return this.request('/warehouse/issue-spare.php', {
      method: 'POST',
      body: JSON.stringify({ spare_inventory_ids: spareInventoryIds, technician_id: technicianId, purpose })
    });
  }

  async returnSpareToWarehouse(spareInventoryIds: number[], notes?: string) {
    return this.request('/warehouse/return-spare.php', {
      method: 'POST',
      body: JSON.stringify({ spare_inventory_ids: spareInventoryIds, notes })
    });
  }

  async getSpareTransactions(filters?: { spare_id?: number; technician_id?: number; transaction_type?: string }) {
    const params = new URLSearchParams();
    if (filters?.spare_id) params.append('spare_id', filters.spare_id.toString());
    if (filters?.technician_id) params.append('technician_id', filters.technician_id.toString());
    if (filters?.transaction_type) params.append('transaction_type', filters.transaction_type);
    
    return this.request(`/warehouse/transactions.php?${params.toString()}`);
  }

  async getTechnicianAssignments(technicianId?: number) {
    const query = technicianId ? `?technician_id=${technicianId}` : '';
    return this.request(`/warehouse/assignments.php${query}`);
  }

  async addWarehouseStock(spareId: number, quantity: number, batchNumber?: string) {
    return this.request('/warehouse/add-stock.php', {
      method: 'POST',
      body: JSON.stringify({ spare_id: spareId, quantity, batch_number: batchNumber })
    });
  }

  async getSpareReports(reportType: string = 'summary') {
    return this.request(`/reports/spare-reports.php?type=${reportType}`);
  }

  // Audit Logs
  async getAuditLogs(targetTable?: string, targetId?: number) {
    const params = new URLSearchParams();
    if (targetTable) params.append('target_table', targetTable);
    if (targetId) params.append('target_id', targetId.toString());
    
    return this.request(`/audit/logs.php?${params.toString()}`);
  }

  // Reports
  async getReports(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/list.php?${query}`);
  }

  // Get inspection reports by customer ID with type 'inspection' and any status
  async getInspectionReports(customerId: number) {
    return this.request(`/reports/list.php?customer_id=${customerId}&type=inspection`);
  }

  // CRM Leads Management
  async getLeads(filters?: { page?: number; limit?: number; search?: string; status?: string; source?: string; assigned_to?: number }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());

    return this.request(`/crm/leads.php?${params.toString()}`);
  }

  async createLead(lead: any) {
    return this.request('/crm/leads.php', {
      body: JSON.stringify(lead)
    });
  }

  async updateLead(id: number, lead: any) {
    return this.request(`/crm/leads.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(lead)
    });
  }

  // CRM Quotations Management
  async getQuotations(filters?: { page?: number; limit?: number; lead_id?: number; opportunity_id?: number; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.lead_id) params.append('lead_id', filters.lead_id.toString());
    if (filters?.opportunity_id) params.append('opportunity_id', filters.opportunity_id.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await this.request<{ success: boolean; data: { quotations: any[]; pagination: any } }>(`/crm/quotations.php?${params.toString()}`);
    return {
      quotations: response.data?.quotations || [],
      pagination: response.data?.pagination || {}
    };
  }

  async createQuotation(quotation: any) {
    return this.request<{ success: boolean; data: { quotation_id: number } }>(`/crm/quotations.php`, {
      method: 'POST',
      body: JSON.stringify(quotation)
    });
  }

  async updateQuotation(id: number, quotation: any) {
    return this.request<{ success: boolean; data: any }>(`/crm/quotations.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...quotation })
    });
  }

  async deleteQuotation(id: number) {
    return this.request<{ success: boolean; data: any }>(`/crm/quotations.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // CRM Invoices Management
  async getInvoices(filters?: { page?: number; limit?: number; lead_id?: number; opportunity_id?: number; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.lead_id) params.append('lead_id', filters.lead_id.toString());
    if (filters?.opportunity_id) params.append('opportunity_id', filters.opportunity_id.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await this.request<{ success: boolean; data: { invoices: any[]; pagination: any } }>(`/crm/invoices.php?${params.toString()}`);
    return {
      invoices: response.data.invoices || [],
      pagination: response.data.pagination || {}
    };
  }

  async createInvoice(invoice: any) {
    return this.request<{ success: boolean; data: { invoice_id: number } }>('/crm/invoices.php', {
      method: 'POST',
      body: JSON.stringify(invoice)
    });
  }

  async updateInvoice(id: number, invoice: any) {
    return this.request<{ success: boolean; data: any }>(`/crm/invoices.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice)
    });
  }

  async deleteInvoice(id: number) {
    return this.request<{ success: boolean; data: any }>(`/crm/invoices.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // CRM Activities Management
  async getActivities(filters?: { page?: number; limit?: number; lead_id?: number; contact_id?: number; opportunity_id?: number; assigned_to?: number; activity_type?: string; completed?: string }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.lead_id) params.append('lead_id', filters.lead_id.toString());
    if (filters?.contact_id) params.append('contact_id', filters.contact_id.toString());
    if (filters?.opportunity_id) params.append('opportunity_id', filters.opportunity_id.toString());
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.activity_type) params.append('activity_type', filters.activity_type);
    if (filters?.completed) params.append('completed', filters.completed);

    const response = await this.request<{ success: boolean; data: { activities: any[]; pagination: any } }>(`/crm/activities.php?${params.toString()}`);
    return {
      activities: response.data.activities || [],
      pagination: response.data.pagination || {}
    };
  }

  async createActivity(activity: any) {
    return this.request<{ success: boolean; data: { activity_id: number } }>('/crm/activities.php', {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  }

  async updateActivity(id: number, activity: any) {
    return this.request<{ success: boolean; data: any }>(`/crm/activities.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(activity)
    });
  }

  async deleteActivity(id: number) {
    return this.request<{ success: boolean; data: any }>(`/crm/activities.php?id=${id}`, {
      method: 'DELETE'
    });
  }
  async getContacts(filters?: { page?: number; limit?: number; search?: string; company?: string; lead_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.company) params.append('company', filters.company);
    if (filters?.lead_id) params.append('lead_id', filters.lead_id.toString());

    const response = await this.request<{ success: boolean; data: { contacts: any[]; pagination: any } }>(`/crm/contacts.php?${params.toString()}`);
    return {
      contacts: response.data.contacts || [],
      pagination: response.data.pagination || {}
    };
  }

  async createContact(contact: any) {
    return this.request<{ message: string; contact_id: number }>('/crm/contacts.php', {
      method: 'POST',
      body: JSON.stringify(contact)
    });
  }

  async updateContact(id: number, contact: any) {
    return this.request<{ message: string }>(`/crm/contacts.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(contact)
    });
  }

  async deleteContact(id: number) {
    return this.request<{ message: string }>(`/crm/contacts.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // CRM Opportunities Management
  async getOpportunities(filters?: { page?: number; limit?: number; search?: string; stage?: string; assigned_to?: number; lead_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.lead_id) params.append('lead_id', filters.lead_id.toString());

    const response = await this.request<{ success: boolean; data: { opportunities: any[]; pagination: any } }>(`/crm/opportunities.php?${params.toString()}`);
    return {
      opportunities: response.data.opportunities || [],
      pagination: response.data.pagination || {}
    };
  }

  async createOpportunity(opportunity: any) {
    return this.request<{ message: string; opportunity_id: number }>('/crm/opportunities.php', {
      method: 'POST',
      body: JSON.stringify(opportunity)
    });
  }

  async updateOpportunity(id: number, opportunity: any) {
    return this.request<{ message: string }>(`/crm/opportunities.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(opportunity)
    });
  }

  async deleteOpportunity(id: number) {
    return this.request<{ message: string }>(`/crm/opportunities.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Debug API connection
  async testConnection() {
    try {
      const response = await fetch(`${API_BASE_URL}/crm/contacts.php`, {
        headers: this.getAuthHeaders()
      });
      console.log('API Connection Test:', {
        url: `${API_BASE_URL}/crm/contacts.php`,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        responseText: await response.text()
      });
    } catch (error) {
      console.error('API Connection Test Failed:', error);
    }
  }

  // Calibration Module APIs

  // Calibration Customers
  async getCalibrationCustomers(filters?: { search?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calibration/customers/list.php?${params.toString()}`);
  }

  async createCalibrationCustomer(customer: { customer_name: string; address?: string; state?: string; email?: string; phone?: string }) {
    return this.request('/calibration/customers/create.php', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  }

  async updateCalibrationCustomer(id: number, customer: { customer_name?: string; address?: string; state?: string; email?: string; phone?: string }) {
    return this.request('/calibration/customers/update.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...customer })
    });
  }

  async deleteCalibrationCustomer(id: number) {
    return this.request(`/calibration/customers/delete.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Calibration Jobs
  async getCalibrationJobs(filters?: {
    search?: string;
    job_type?: string;
    customer_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.job_type) params.append('job_type', filters.job_type);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calibration/jobs/list.php?${params.toString()}`);
  }

  async createCalibrationJob(job: {
    request_number: string;
    job_type: 'ACCREDITED' | 'NON_ACCREDITED';
    request_date: string;
    customer_id: number;
    remarks?: string;
  }) {
    return this.request('/calibration/jobs/create.php', {
      method: 'POST',
      body: JSON.stringify(job)
    });
  }

  async updateCalibrationJob(id: number, job: {
    request_number?: string;
    job_type?: 'ACCREDITED' | 'NON_ACCREDITED';
    request_date?: string;
    customer_id?: number;
    remarks?: string;
  }) {
    return this.request('/calibration/jobs/update.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...job })
    });
  }

  async deleteCalibrationJob(id: number) {
    return this.request(`/calibration/jobs/delete.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Request Number Generation
  async generateRequestNumber(data: { job_type: 'ACCREDITED' | 'NON_ACCREDITED'; request_date: string }) {
    return this.request('/calibration/generate-request-number.php', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Certificate Management
  async getCertificates(filters?: {
    certificate_number?: string;
    request_number?: string;
    serial_no?: string;
    customer_name?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.certificate_number) params.append('certificate_number', filters.certificate_number);
    if (filters?.request_number) params.append('request_number', filters.request_number);
    if (filters?.serial_no) params.append('serial_no', filters.serial_no);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calibration/certificates/list.php?${params.toString()}`);
  }

  async createCertificate(certificate: {
    request_number: string;
    certificate_number?: string;
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
  }) {
    return this.request('/calibration/certificates/create.php', {
      method: 'POST',
      body: JSON.stringify(certificate)
    });
  }

  async updateCertificate(id: number, certificate: {
    equipment_name?: string;
    make?: string;
    model_no?: string;
    capacity?: string;
    serial_no?: string;
    asset_no?: string;
    date_of_due?: string;
    location?: string;
    customer_name?: string;
  }) {
    return this.request('/calibration/certificates/update.php', {
      method: 'PUT',
      body: JSON.stringify({ id, ...certificate })
    });
  }

  async getCertificatesByRequestNumber(requestNumber: string) {
    return this.request(`/calibration/certificates/by-request.php?request_number=${encodeURIComponent(requestNumber)}`);
  }

  async getCustomerByRequestNumber(requestNumber: string) {
    return this.request(`/calibration/certificates/customer-by-request.php?request_number=${encodeURIComponent(requestNumber)}`);
  }

  // Reminder System
  async getReminderSettings(customer?: string) {
    const params = new URLSearchParams();
    if (customer) params.append('customer', customer);
    return this.request(`/calibration/reminders/settings.php?${params.toString()}`);
  }

  async createReminderSettings(settings: {
    customer_name: string;
    reminder_days: string;
    is_enabled: boolean;
    email_recipients: string[];
  }) {
    return this.request('/calibration/reminders/settings.php', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async updateReminderSettings(customer_name: string, settings: {
    reminder_days?: string;
    is_enabled?: boolean;
    email_recipients?: string[];
  }) {
    return this.request('/calibration/reminders/settings.php', {
      method: 'PUT',
      body: JSON.stringify({ customer_name, ...settings })
    });
  }

  async deleteReminderSettings(customer: string) {
    return this.request(`/calibration/reminders/settings.php?customer=${encodeURIComponent(customer)}`, {
      method: 'DELETE'
    });
  }

  async getReminderLogs(filters?: {
    certificate_number?: string;
    customer_name?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.certificate_number) params.append('certificate_number', filters.certificate_number);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calibration/reminders/logs.php?${params.toString()}`);
  }

  async closeReminder(certificate_number: string, closed_by?: string) {
    return this.request('/calibration/reminders/logs.php', {
      method: 'POST',
      body: JSON.stringify({ certificate_number, closed_by })
    });
  }

  async reopenReminder(certificate_number: string, reopened_by?: string) {
    return this.request('/calibration/reminders/logs.php', {
      method: 'PUT',
      body: JSON.stringify({ certificate_number, reopened_by })
    });
  }

  async processReminders() {
    return this.request('/calibration/reminders/process.php', {
      method: 'POST'
    });
  }

  async getEligibleRequestNumbers(customerName?: string) {
    const params = new URLSearchParams();
    if (customerName) params.append('customer_name', customerName);
    return this.request(`/calibration/certificates/eligible-requests.php?${params.toString()}`);
  }

  async getJobRequests(filters?: {
    customer_name?: string;
    job_type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);
    if (filters?.job_type) params.append('job_type', filters.job_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.request(`/calibration/jobs/list.php?${params.toString()}`);
  }

  async getReminderStats() {
    return this.request('/calibration/reminders/process.php');
  }
}

export const api = new ApiClient();