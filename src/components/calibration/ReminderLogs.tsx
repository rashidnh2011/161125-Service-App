import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Eye, XCircle, RotateCcw, Calendar, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { CalibrationReminderLog, ReminderLogsFilters } from '../../types';

interface ReminderLogsProps {
  onBack?: () => void;
}

const ReminderLogsComponent: React.FC<ReminderLogsProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<CalibrationReminderLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<ReminderLogsFilters>({
    page: 1,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_records: 0,
    total_pages: 0
  });

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { ...filters };
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const response = await api.getReminderLogs(params) as any;
      if (response.success && response.data?.logs) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reminder logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof ReminderLogsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20
    });
  };

  const handleCloseReminder = async (certificate_number: string) => {
    if (!confirm(`Close all reminders for certificate ${certificate_number}?`)) {
      return;
    }

    try {
      setActionLoading(certificate_number);
      setError(null);

      const response = await api.closeReminder(certificate_number, 'manual') as any;
      if (response.success) {
        setSuccess('Reminder closed successfully');
        await loadLogs();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to close reminder');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to close reminder');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenReminder = async (certificate_number: string) => {
    if (!confirm(`Reopen reminders for certificate ${certificate_number}?`)) {
      return;
    }

    try {
      setActionLoading(certificate_number);
      setError(null);

      const response = await api.reopenReminder(certificate_number, 'manual') as any;
      if (response.success) {
        setSuccess('Reminder reopened successfully');
        await loadLogs();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to reopen reminder');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reopen reminder');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reminder Logs</h2>
              <p className="text-sm text-gray-600">View and manage automated reminder notifications</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={loadLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={filters.certificate_number || ''}
                  onChange={(e) => handleFilterChange('certificate_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search certificate number..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={filters.customer_name || ''}
                  onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search customer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="From date"
                  />
                  <input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="To date"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading reminder logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No reminder logs found</p>
              <p className="text-sm">Try adjusting your filters or check back after reminders have been sent</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reminder</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.certificate_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {new Date(log.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{log.customer_name}</div>
                        {log.customer_email && (
                          <div className="text-sm text-gray-500">{log.customer_email}</div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {log.equipment_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.make && log.model_no ? `${log.make} - ${log.model_no}` : ''}
                        </div>
                        {log.location && (
                          <div className="text-sm text-gray-500">{log.location}</div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {log.reminder_days} days before due
                        </div>
                        <div className="text-sm text-gray-500">
                          Count: {log.reminder_count}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                        {log.is_manual_close && (
                          <div className="text-xs text-gray-500 mt-1">Manually closed</div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(log.sent_date)}
                        </div>
                        {log.error_message && (
                          <div className="text-xs text-red-600 mt-1">
                            Error: {log.error_message}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {/* View details */}}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!log.is_manual_close ? (
                            <button
                              onClick={() => handleCloseReminder(log.certificate_number)}
                              disabled={actionLoading === log.certificate_number}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Close Reminders"
                            >
                              {actionLoading === log.certificate_number ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReopenReminder(log.certificate_number)}
                              disabled={actionLoading === log.certificate_number}
                              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Reopen Reminders"
                            >
                              {actionLoading === log.certificate_number ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                    {Math.min(pagination.current_page * pagination.per_page, pagination.total_records)} of{' '}
                    {pagination.total_records} results
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFilterChange('page', (pagination.current_page - 1).toString())}
                      disabled={pagination.current_page <= 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      {pagination.current_page} of {pagination.total_pages}
                    </span>

                    <button
                      onClick={() => handleFilterChange('page', (pagination.current_page + 1).toString())}
                      disabled={pagination.current_page >= pagination.total_pages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderLogsComponent;
