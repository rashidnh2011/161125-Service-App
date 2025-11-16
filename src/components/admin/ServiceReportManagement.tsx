import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ServiceReport, PaymentInfo, ApiResponse } from '../../types';
import { Eye, Download, Send, DollarSign, Search, Filter, Image } from 'lucide-react';
import PaymentModal from './PaymentModal';
import ReportImagesModal from './ReportImagesModal';

const ServiceReportManagement: React.FC = () => {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ServiceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState<{ show: boolean; reportId: number | null }>({
    show: false,
    reportId: null
  });
  const [showImagesModal, setShowImagesModal] = useState<{ show: boolean; reportId: number | null }>({
    show: false,
    reportId: null
  });
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, typeFilter, paymentFilter]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<ServiceReport[]> = await api.getAllServiceReports();
      if (response.success) {
        setReports(response.data || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to load service reports' });
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      setMessage({ type: 'error', text: 'Failed to load service reports' });
    } finally {
      setIsLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.technician?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.type === typeFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(report => {
        if (paymentFilter === 'paid') return report.payment_info?.payment_status === 'paid';
        if (paymentFilter === 'unpaid') return report.payment_info?.payment_status === 'unpaid';
        if (paymentFilter === 'no_payment') return !report.payment_info;
        return true;
      });
    }

    setFilteredReports(filtered);
  };

  const handleDownloadPDF = async (reportId: number, reportNumber: string) => {
    try {
      const blob = await api.generatePDF(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Service_Report_${reportNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      setMessage({ type: 'error', text: 'Failed to download PDF' });
    }
  };

  const handlePaymentInfo = (reportId: number) => {
    setShowPaymentModal({ show: true, reportId });
  };

  const handleViewImages = (reportId: number) => {
    setShowImagesModal({ show: true, reportId });
  };

  const handlePaymentSaved = () => {
    setShowPaymentModal({ show: false, reportId: null });
    loadReports();
    setMessage({ type: 'success', text: 'Payment information saved successfully' });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      inspection: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Inspection' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (paymentInfo?: PaymentInfo) => {
    if (!paymentInfo) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Payment
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        paymentInfo.payment_status === 'paid' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {paymentInfo.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
      </span>
    );
  };

  const getVisitTypeBadge = (visitType: string) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        visitType === 'inspection'
          ? 'bg-orange-100 text-orange-800' 
          : visitType === 'completion'
          ? 'bg-purple-100 text-purple-800'
          : 'bg-blue-100 text-blue-800'
      }`}>
        {visitType === 'inspection' ? 'Inspection' : visitType === 'completion' ? 'Completion' : 'One-Time'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Service Report Management</h3>
        <button
          onClick={loadReports}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="inspection">Inspection</option>
              <option value="completed">Completed</option>
              <option value="sent">Sent</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="inspection">Inspection</option>
              <option value="completion">Completion</option>
              <option value="one_time">One Time</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="no_payment">No Payment Info</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{report.report_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(report.visit_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {report.type?.replace('_', ' ').toUpperCase() || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {report.customer?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {report.customer?.city || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.technician?.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {getPaymentBadge(report.payment_info)}
                      {report.payment_info && (
                        <div className="text-xs text-gray-500">
                          ₹{report.payment_info.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewImages(report.id)}
                        className="text-purple-600 hover:text-purple-900"
                        title="View Images"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDownloadPDF(report.id, report.report_number)}
                        className="text-green-600 hover:text-green-900"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handlePaymentInfo(report.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Payment Info"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No service reports found matching your criteria.</p>
          </div>
        )}
      </div>

      {showPaymentModal.show && showPaymentModal.reportId && (
        <PaymentModal
          reportId={showPaymentModal.reportId}
          onSave={handlePaymentSaved}
          onClose={() => setShowPaymentModal({ show: false, reportId: null })}
        />
      )}

      {showImagesModal.show && showImagesModal.reportId && (
        <ReportImagesModal
          reportId={showImagesModal.reportId}
          onClose={() => setShowImagesModal({ show: false, reportId: null })}
        />
      )}
    </div>
  );
};

export default ServiceReportManagement;