import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ServiceApproval, ApiResponse } from '../../types';
import { Check, XCircle, Clock, AlertTriangle, User } from 'lucide-react';

const ApprovalsManagement: React.FC = () => {
  const [approvals, setApprovals] = useState<ServiceApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    loadApprovals();
  }, [statusFilter]);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const response = await api.getServiceApprovals(statusFilter === 'all' ? undefined : statusFilter) as ApiResponse<ServiceApproval[]>;
      if (response.success) {
        setApprovals(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load approvals:', error);
      setMessage({ type: 'error', text: 'Failed to load approvals' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (approvalId: number) => {
    const notes = prompt('Enter approval notes (optional):');
    
    try {
      const response = await api.approveService(approvalId, notes || undefined) as ApiResponse<any>;
      if (response.success) {
        setMessage({ type: 'success', text: 'Service approved successfully' });
        loadApprovals();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to approve service' });
      }
    } catch (error) {
      console.error('Failed to approve service:', error);
      setMessage({ type: 'error', text: 'Failed to approve service' });
    }
  };

  const handleReject = async (approvalId: number) => {
    const notes = prompt('Enter rejection reason:');
    if (!notes) return;
    
    try {
      const response = await api.rejectService(approvalId, notes) as ApiResponse<any>;
      if (response.success) {
        setMessage({ type: 'success', text: 'Service rejected successfully' });
        loadApprovals();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to reject service' });
      }
    } catch (error) {
      console.error('Failed to reject service:', error);
      setMessage({ type: 'error', text: 'Failed to reject service' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: Check, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = config.icon;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <StatusIcon className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { bg: 'bg-gray-100', text: 'text-gray-800' },
      medium: { bg: 'bg-blue-100', text: 'text-blue-800' },
      high: { bg: 'bg-red-100', text: 'text-red-800' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {priority.toUpperCase()}
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
        <h3 className="text-lg font-semibold text-gray-900">Service Approvals</h3>
        <button
          onClick={loadApprovals}
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending Approvals</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Approvals</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {approvals.length} approval{approvals.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {approvals.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Approvals Found</h4>
            <p className="text-gray-600">
              {statusFilter === 'pending' 
                ? 'No pending approvals at this time.' 
                : `No ${statusFilter} approvals found.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{approval.service_report?.report_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {approval.service_report?.visit_date && 
                            new Date(approval.service_report.visit_date).toLocaleDateString()
                          }
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {(approval.service_report as any)?.type?.replace('_', ' ') || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(approval.service_report as any)?.customer_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(approval as any).payment_info ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            AED {(approval as any).payment_info.amount?.toLocaleString() || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(approval as any).payment_info.invoice_number || 'N/A'}
                          </div>
                          <div className={`text-xs ${
                            (approval as any).payment_info.payment_status === 'paid' 
                              ? 'text-green-600' 
                              : 'text-orange-600'
                          }`}>
                            {(approval as any).payment_info.payment_status?.toUpperCase() || 'N/A'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No payment info</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getStatusBadge(approval.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {approval.requested_by_user?.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(approval.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {approval.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      
                      {approval.status !== 'pending' && (
                        <div className="text-xs text-gray-500">
                          {approval.approved_at && 
                            `${approval.status} on ${new Date(approval.approved_at).toLocaleDateString()}`
                          }
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsManagement;