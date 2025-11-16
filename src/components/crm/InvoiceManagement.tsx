import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

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

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  paid_date?: string;
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

interface InvoiceFormData {
  invoice_number: string;
  invoice_date: string;
  amount: number;
  status: Invoice['status'];
  due_date: string;
  paid_date: string;
  notes: string;
  lead_id?: number;
  opportunity_id: number;
}

interface LeadOrOpportunity {
  id: number;
  name: string;
  company?: string;
  lead_name?: string;
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingLeadOrOpportunity, setIsLoadingLeadOrOpportunity] = useState(false);
  const [leadOrOpportunity, setLeadOrOpportunity] = useState<LeadOrOpportunity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: '',
    invoice_date: '',
    amount: 0,
    status: 'draft',
    due_date: '',
    paid_date: '',
    notes: '',
    lead_id: 0,
    opportunity_id: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchLeadsAndOpportunities();
    
    // Check for lead_id or opportunity_id in URL params
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get('lead_id');
    const opportunityId = params.get('opportunity_id');
    
    if (leadId) {
      handleCreateFromLead(parseInt(leadId));
    } else if (opportunityId) {
      handleCreateFromOpportunity(parseInt(opportunityId));
    }
  }, [filters, pagination.page]);
  
  interface LeadOpportunityResponse {
    success: boolean;
    data: {
      id: number;
      name: string;
      company?: string;
      lead_name?: string;
      lead_id?: number;
    };
  }

  const handleCreateFromLead = async (leadId: number) => {
    try {
      setIsLoadingLeadOrOpportunity(true);
      const response = await api.request<LeadOpportunityResponse>(
        `/crm/invoices.php?get_lead_or_opportunity=true&type=lead&id=${leadId}`
      );
      
      if (response?.data) {
        setLeadOrOpportunity({
          id: response.data.id,
          name: response.data.name,
          company: response.data.company
        });
        
        // Initialize form with lead data
        setFormData(prev => ({
          ...prev,
          lead_id: response.data.id,
          invoice_number: `INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft'
        }));
        
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setIsLoadingLeadOrOpportunity(false);
    }
  };
  
  const handleCreateFromOpportunity = async (opportunityId: number) => {
    try {
      setIsLoadingLeadOrOpportunity(true);
      const response = await api.request<LeadOpportunityResponse>(
        `/crm/invoices.php?get_lead_or_opportunity=true&type=opportunity&id=${opportunityId}`
      );
      
      if (response?.data) {
        setLeadOrOpportunity({
          id: response.data.id,
          name: response.data.name,
          lead_name: response.data.lead_name,
          company: response.data.company
        });
        
        // Initialize form with opportunity data
        setFormData(prev => ({
          ...prev,
          opportunity_id: response.data.id,
          lead_id: response.data.lead_id || undefined,
          invoice_number: `INV-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          amount: 0,
          paid_date: '',
          notes: ''
        }));
        
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching opportunity details:', error);
    } finally {
      setIsLoadingLeadOrOpportunity(false);
    }
  };
  
  const handleCreateForLead = (lead: Lead) => {
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('lead_id', lead.id.toString());
    window.history.pushState({}, '', url.toString());
    
    handleCreateFromLead(lead.id);
  };
  
  const handleCreateForOpportunity = (opportunity: Opportunity) => {
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('opportunity_id', opportunity.id.toString());
    window.history.pushState({}, '', url.toString());
    
    handleCreateFromOpportunity(opportunity.id);
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.getInvoices({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status || undefined
      });
      setInvoices(response.invoices || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadsAndOpportunities = async () => {
    try {
      // Fetch leads only for now (opportunities API not implemented yet)
      const leadsResponse = await api.getLeads({ limit: 100 }) as { leads: Lead[] };
      setLeads(leadsResponse.leads || []);

      // TODO: Add opportunities fetching when API is available
      setOpportunities([]);
    } catch (error) {
      console.error('Error fetching leads/opportunities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, formData);
      } else {
        // Ensure required fields are present
        if (!formData.invoice_number) {
          alert('Invoice number is required');
          return;
        }
        
        // Create a clean invoice object with only the necessary fields
        const invoiceData = {
          ...formData,
          // Ensure we don't send empty strings for optional fields
          paid_date: formData.paid_date || null,
          notes: formData.notes || null,
          // Ensure lead_id and opportunity_id are numbers or null
          lead_id: formData.lead_id || null,
          opportunity_id: formData.opportunity_id || null
        };
        
        await api.createInvoice(invoiceData);
      }
      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
      }
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      amount: invoice.amount,
      status: invoice.status,
      due_date: invoice.due_date || '',
      paid_date: invoice.paid_date || '',
      notes: invoice.notes || '',
      lead_id: invoice.lead_id || 0,
      opportunity_id: invoice.opportunity_id || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await api.deleteInvoice(id);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          localStorage.removeItem('auth_token');
          window.location.reload();
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      invoice_date: '',
      amount: 0,
      status: 'draft',
      due_date: '',
      paid_date: '',
      notes: '',
      lead_id: 0,
      opportunity_id: 0
    });
  };

  const getStatusColor = (status: Invoice['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600 mt-1">Track invoices from Zoho Books</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Invoice
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
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={fetchInvoices}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
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
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        Issued: {new Date(invoice.invoice_date).toLocaleDateString()}
                      </div>
                      {invoice.paid_date && (
                        <div className="text-xs text-green-600">
                          Paid: {new Date(invoice.paid_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{invoice.amount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {invoice.lead_first_name && (
                        <div>Lead: {invoice.lead_first_name} {invoice.lead_last_name}</div>
                      )}
                      {invoice.opportunity_name && (
                        <div>Opportunity: {invoice.opportunity_name}</div>
                      )}
                      {invoice.lead_company && (
                        <div className="text-xs text-gray-400">{invoice.lead_company}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(invoice)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
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

        {invoices.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">Add invoices from Zoho Books to track them here.</p>
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

      {/* Invoice Form Modal */}
{showForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      {/* Modal header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        </h2>
        <button
          onClick={() => {
            setShowForm(false);
            setEditingInvoice(null);
            setLeadOrOpportunity(null);
            resetForm();
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Number *</label>
            <input
              type="text"
              required
              placeholder="e.g., INV-001"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">From Zoho Books</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Date *</label>
            <input
              type="date"
              required
              value={formData.invoice_date}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Invoice['status'] }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paid Date</label>
            <input
              type="date"
              value={formData.paid_date}
              onChange={(e) => setFormData(prev => ({ ...prev, paid_date: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            placeholder="Additional notes about this invoice..."
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
              setEditingInvoice(null);
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
            {editingInvoice ? 'Update' : 'Create'} Invoice
          </button>
        </div>
      </form>
        </div>
      </div>
    )}
  </div>
  );
};

export default InvoiceManagement;
