import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

interface QuotationsResponse {
  success: boolean;
  data: {
    quotations: Quotation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
}

interface Opportunity {
  id: number;
  name: string;
  lead_id?: number;
}

interface Quotation {
  id: number;
  quotation_number: string;
  quotation_date: string;
  amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'invoiced';
  valid_until?: string;
  notes?: string;
  lead_id?: number;
  opportunity_id?: number;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  opportunity_name?: string;
  created_by_name?: string;
  created_at: string;
}

interface QuotationFormData {
  quotation_number: string;
  quotation_date: string;
  amount: number;
  status: Quotation['status'];
  valid_until: string;
  notes: string;
  lead_id: number;
  opportunity_id: number;
}

const QuotationManagement: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState<QuotationFormData>({
    quotation_number: '',
    quotation_date: '',
    amount: 0,
    status: 'draft',
    valid_until: '',
    notes: '',
    lead_id: 0,
    opportunity_id: 0
  });

  const [filters, setFilters] = useState<{ search: string; status: string }>({
    search: '',
    status: ''
  });

  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  }>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  
  // Invoice creation modal state
  const [showInvoiceForm, setShowInvoiceForm] = useState<boolean>(false);
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<{
    invoice_number: string;
    due_date: string;
  }>({
    invoice_number: '',
    due_date: ''
  });

  useEffect(() => {
    fetchQuotations();
    fetchLeadsAndOpportunities();
  }, [filters, pagination.page]);

  const fetchLeadsAndOpportunities = async () => {
    try {
      setLoading(true);
      // Fetch leads
      const response = await api.request<{ success: boolean; data: { leads: Lead[] } }>('/crm/leads.php?limit=1000');
      if (response && response.success && response.data && response.data.leads) {
        setLeads(response.data.leads);
      } else {
        console.error('Unexpected API response format:', response);
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoiceClick = (quotation: Quotation) => {
    setCurrentQuotation(quotation);
    // Set default due date to 30 days from now
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    setInvoiceForm({
      invoice_number: '',
      due_date: defaultDueDate.toISOString().split('T')[0]
    });
    setShowInvoiceForm(true);
  };

  const createInvoiceFromQuotation = async (quotationId: number) => {
    if (!currentQuotation) return;
    
    if (!invoiceForm.invoice_number) {
      alert('Please enter an invoice number');
      return;
    }
    
    setIsCreatingInvoice(prev => ({ ...prev, [quotationId]: true }));
    try {
      const response = await api.request<{ 
        success: boolean; 
        data: { 
          invoice_id: number; 
          invoice_number: string 
        } 
      }>('/crm/invoices.php?from_quotation=true', {
        method: 'POST',
        body: JSON.stringify({ 
          quotation_id: quotationId,
          invoice_number: invoiceForm.invoice_number,
          due_date: invoiceForm.due_date,
          notes: `Created from quotation ${currentQuotation.quotation_number}`
        })
      });
      
      if (response.success) {
        alert(`Invoice ${response.data.invoice_number} created successfully!`);
        // Refresh quotations to update the status
        fetchQuotations();
        setShowInvoiceForm(false);
        setCurrentQuotation(null);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setIsCreatingInvoice(prev => ({ ...prev, [quotationId]: false }));
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await api.request<QuotationsResponse>('/crm/quotations.php');
      if (response.success) {
        setQuotations(response.data.quotations || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch opportunities for a specific lead
  interface OpportunitiesResponse {
    success: boolean;
    data: {
      opportunities: Opportunity[];
    };
  }

  const fetchOpportunities = async (leadId: number) => {
    if (!leadId) {
      setOpportunities([]);
      return;
    }
    try {
      const response = await api.request<OpportunitiesResponse>(`/crm/opportunities.php?lead_id=${leadId}`);
      if (response.success) {
        setOpportunities(response.data.opportunities || []);
      } else {
        setOpportunities([]);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setOpportunities([]);
    }
  };

  // Fetch leads
  interface LeadsResponse {
    success: boolean;
    data: {
      leads: Lead[];
    };
  }

  const fetchLeads = async () => {
    try {
      const response = await api.request<LeadsResponse>('/crm/leads.php');
      if (response.success) {
        setLeads(response.data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuotation) {
        await api.updateQuotation(editingQuotation.id, formData);
      } else {
        await api.createQuotation(formData);
      }
      setShowForm(false);
      setEditingQuotation(null);
      resetForm();
      fetchQuotations();
    } catch (error) {
      console.error('Error saving quotation:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    }
  };

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormData({
      quotation_number: quotation.quotation_number,
      quotation_date: quotation.quotation_date,
      amount: quotation.amount,
      status: quotation.status,
      valid_until: quotation.valid_until || '',
      notes: quotation.notes || '',
      lead_id: quotation.lead_id || 0,
      opportunity_id: quotation.opportunity_id || 0
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await api.request(`/crm/quotations.php?id=${id}`, {
          method: 'DELETE'
        });
        fetchQuotations();
      } catch (error) {
        console.error('Error deleting quotation:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      quotation_number: '',
      quotation_date: '',
      amount: 0,
      status: 'draft',
      valid_until: '',
      notes: '',
      lead_id: 0,
      opportunity_id: 0
    });
  };

  const getStatusColor = (status: Quotation['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800',
      invoiced: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Render the invoice creation modal
  const renderInvoiceModal = () => {
    if (!showInvoiceForm || !currentQuotation) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Create Invoice from Quotation</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceForm.invoice_number}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., INV-001"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={invoiceForm.due_date}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceForm(false);
                  setCurrentQuotation(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => currentQuotation && createInvoiceFromQuotation(currentQuotation.id)}
                disabled={currentQuotation && isCreatingInvoice[currentQuotation.id]}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {currentQuotation && isCreatingInvoice[currentQuotation.id] ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {renderInvoiceModal()}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation Management</h1>
          <p className="text-gray-600 mt-1">Track quotations from Zoho Books</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={fetchQuotations}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Related To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{quotation.quotation_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(quotation.quotation_date).toLocaleDateString()}
                      </div>
                      {quotation.valid_until && (
                        <div className="text-xs text-gray-400">
                          Valid until: {new Date(quotation.valid_until).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{quotation.amount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                      {quotation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {quotation.lead_first_name && (
                        <div>Lead: {quotation.lead_first_name} {quotation.lead_last_name}</div>
                      )}
                      {quotation.opportunity_name && (
                        <div>Opportunity: {quotation.opportunity_name}</div>
                      )}
                      {quotation.lead_company && (
                        <div className="text-xs text-gray-400">{quotation.lead_company}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(quotation)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(quotation.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quotations.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations found</h3>
            <p className="mt-1 text-sm text-gray-500">Add quotations from Zoho Books to track them here.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Quotation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quotation Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., QUO-001"
                      value={formData.quotation_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, quotation_number: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">From Zoho Books</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quotation Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.quotation_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Quotation['status'] }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Related Lead</label>
                    <select
                      value={formData.lead_id || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        lead_id: parseInt(e.target.value) || 0,
                        // Clear opportunity when lead changes
                        opportunity_id: 0
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    >
                      <option value="0">Select Lead (Optional)</option>
                      {leads.length > 0 ? (
                        leads.map(lead => (
                          <option key={lead.id} value={lead.id}>
                            {lead.first_name} {lead.last_name} {lead.company ? `- ${lead.company}` : ''}
                          </option>
                        ))
                      ) : (
                        <option value="0" disabled>No leads available</option>
                      )}
                    </select>
                    {loading && (
                      <p className="mt-1 text-xs text-gray-500">Loading leads...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Related Opportunity</label>
                    <select
                      value={formData.opportunity_id || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        opportunity_id: parseInt(e.target.value) || 0
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={!formData.lead_id || loading}
                    >
                      <option value="0">
                        {!formData.lead_id 
                          ? 'Select a lead first' 
                          : opportunities.length === 0 
                            ? 'No opportunities found' 
                            : 'Select Opportunity (Optional)'}
                      </option>
                      {opportunities.map(opportunity => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.name}
                        </option>
                      ))}
                    </select>
                    {formData.lead_id && loading && (
                      <p className="mt-1 text-xs text-gray-500">Loading opportunities...</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Additional notes about this quotation..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingQuotation(null);
                      resetForm();
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    {editingQuotation ? 'Update' : 'Create'} Quotation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotationManagement;
