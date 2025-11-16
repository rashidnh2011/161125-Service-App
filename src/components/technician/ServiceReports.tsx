import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ServiceReport, EmailRecipient, ApiResponse } from '../../types';
import { Eye, CreditCard as Edit, Download, Send, Calendar, User, FileText, Clock, Lock, DollarSign, FileText as Quotation } from 'lucide-react';
import SendReportModal from './SendReportModal';
import EditServiceReport from './EditServiceReport';
import PaymentModal from '../admin/PaymentModal';
import QuotationModal from './QuotationModal';

const ServiceReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState<{ show: boolean; reportId: number | null }>({
    show: false,
    reportId: null
  });
  const [showEditModal, setShowEditModal] = useState<{ show: boolean; reportId: number | null }>({
    show: false,
    reportId: null
  });
  const [showPaymentModal, setShowPaymentModal] = useState<{ show: boolean; reportId: number | null }>({
    show: false,
    reportId: null
  });
  const [showQuotationModal, setShowQuotationModal] = useState<{ show: boolean; reportId: number | null; reportNumber: string }>({
    show: false,
    reportId: null,
    reportNumber: ''
  });
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportsRes, recipientsRes] = await Promise.all([
        api.getServiceReports(),
        api.getEmailRecipients()
      ]);

      if ((reportsRes as any).success) {
        setReports((reportsRes as any).data || []);
        console.log('Service reports loaded:', (reportsRes as any).data?.length || 0, 'reports');
        // Debug: Log status of first few reports
        if ((reportsRes as any).data && (reportsRes as any).data.length > 0) {
          console.log('Sample report statuses:', (reportsRes as any).data.slice(0, 3).map((r: any) => ({ id: r.id, status: r.status, report_number: r.report_number })));
        }
      }
      if (recipientsRes.success) setEmailRecipients(recipientsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load service reports' });
    } finally {
      setIsLoading(false);
    }
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

  const handleSendReport = (reportId: number) => {
    setShowSendModal({ show: true, reportId });
  };

  const handleEditReport = (reportId: number) => {
    setShowEditModal({ show: true, reportId });
  };

  const handlePaymentInfo = (reportId: number) => {
    setShowPaymentModal({ show: true, reportId });
  };

  const handleSendComplete = async (reportId: number, emails: string[], message?: string) => {
    try {
      const response = await api.sendReport(reportId, emails, message);
      if (response.success) {
        setMessage({ type: 'success', text: 'Report sent successfully!' });
        loadData(); // Reload to update status
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to send report' });
      }
    } catch (error) {
      console.error('Failed to send report:', error);
      setMessage({ type: 'error', text: 'Failed to send report' });
    } finally {
      setShowSendModal({ show: false, reportId: null });
    }
  };

  const handleEditComplete = () => {
    setShowEditModal({ show: false, reportId: null });
    loadData();
    setMessage({ type: 'success', text: 'Service report updated successfully' });
  };

  const handleQuotationInfo = (reportId: number, reportNumber: string) => {
    setShowQuotationModal({ show: true, reportId, reportNumber });
  };

  const handleQuotationSaved = (reportId: number, quotationNumber: string, amount: number) => {
    console.log('Quotation saved for report:', reportId, 'Refreshing data...');
    setShowQuotationModal({ show: false, reportId: null, reportNumber: '' });
    loadData();
    setMessage({ type: 'success', text: `Quotation ${quotationNumber} saved successfully for AED ${amount}` });
  };

  const handlePaymentSaved = () => {
    console.log('Payment info saved, refreshing data...');
    setShowPaymentModal({ show: false, reportId: null });
    loadData();
    setMessage({ type: 'success', text: 'Payment information saved successfully' });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      inspection: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Inspection' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      quotation_sent: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Quotation Sent' },
      quotation_not_required: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Quotation Not Required' },
      unbilled_service: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Unbilled Service' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getVisitTypeBadge = (type: string) => {
    const visitType = type?.toLowerCase() || 'one_time';
    const typeConfig = {
      inspection: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Inspection' },
      completion: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completion' },
      one_time: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'One-Time' }
    };
    
    const config = typeConfig[visitType as keyof typeof typeConfig] || { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800', 
      label: visitType.charAt(0).toUpperCase() + visitType.slice(1).replace('_', '-') 
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
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
        <h2 className="text-2xl font-bold text-gray-900">Service Reports</h2>
        <button
          onClick={loadData}
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

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Reports</h3>
          <p className="text-gray-600">You haven't created any service reports yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {/* Header with Report Number and Date */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      #{report.report_number}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(report.visit_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getStatusBadge(report.status || 'draft')}
                    {getVisitTypeBadge(report.type)}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-900">
                    {report.customer?.name || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {report.customer?.city || ''}
                  </div>
                </div>

                {/* Technician and Lock Status */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <User className="w-4 h-4" />
                    <span>{report.technician?.name || 'Unknown'}</span>
                  </div>
                  {report.locked && user?.role !== 'admin' && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Actions:</span>
                  <div className="flex items-center space-x-3">
                    {(report.can_edit || user?.role === 'admin') && (
                      <button
                        onClick={() => handleEditReport(report.id)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit Report"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadPDF(report.id, report.report_number || '')}
                      className="text-green-600 hover:text-green-900 p-1"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleSendReport(report.id)}
                      className="text-purple-600 hover:text-purple-900 p-1"
                      title="Send Report"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleQuotationInfo(report.id, report.report_number || '')}
                      className="text-cyan-600 hover:text-cyan-900 p-1"
                      title="Add Quotation"
                    >
                      <Quotation className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePaymentInfo(report.id)}
                      className="text-orange-600 hover:text-orange-900 p-1"
                      title="Payment Info"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      Visit Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{report.report_number}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(report.visit_date).toLocaleDateString()}</span>
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
                        <div className="space-y-1">
                          {getVisitTypeBadge(report.type)}
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <User className="w-4 h-4" />
                            <span>{report.technician?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(report.status || 'draft')}
                          {report.locked && user?.role !== 'admin' && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {(report.can_edit || user?.role === 'admin') && (
                            <button
                              onClick={() => handleEditReport(report.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Report"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDownloadPDF(report.id, report.report_number || '')}
                            className="text-green-600 hover:text-green-900"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleSendReport(report.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Send Report"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleQuotationInfo(report.id, report.report_number || '')}
                            className="text-cyan-600 hover:text-cyan-900"
                            title="Add Quotation"
                          >
                            <Quotation className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePaymentInfo(report.id)}
                            className="text-orange-600 hover:text-orange-900"
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
          </div>
        </>
      )}

      {showSendModal.show && showSendModal.reportId && (
        <SendReportModal
          reportId={showSendModal.reportId}
          emailRecipients={emailRecipients}
          onSend={handleSendComplete}
          onClose={() => setShowSendModal({ show: false, reportId: null })}
        />
      )}

      {showEditModal.show && showEditModal.reportId && (
        <EditServiceReport
          reportId={showEditModal.reportId}
          onSave={handleEditComplete}
          onClose={() => setShowEditModal({ show: false, reportId: null })}
        />
      )}

      {showQuotationModal.show && showQuotationModal.reportId && (
        <QuotationModal
          reportId={showQuotationModal.reportId}
          reportNumber={showQuotationModal.reportNumber}
          onSave={handleQuotationSaved}
          onClose={() => setShowQuotationModal({ show: false, reportId: null, reportNumber: '' })}
        />
      )}

      {showPaymentModal.show && showPaymentModal.reportId && (
        <PaymentModal
          reportId={showPaymentModal.reportId}
          onSave={handlePaymentSaved}
          onClose={() => setShowPaymentModal({ show: false, reportId: null })}
        />
      )}
    </div>
  );
};

export default ServiceReports;