import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Eye, Calendar } from 'lucide-react';
import { api } from '../../utils/api';
import { CalibrationJobWithCustomer, CalibrationJobsResponse } from '../../types';

interface JobRequestsListProps {
  showRecentOnly?: boolean;
}

const JobRequestsList: React.FC<JobRequestsListProps> = ({ showRecentOnly = false }) => {
  const [jobs, setJobs] = useState<CalibrationJobWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [selectedJob, setSelectedJob] = useState<CalibrationJobWithCustomer | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    remarks: ''
  });

  const fetchJobs = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        page,
        limit: showRecentOnly ? 5 : 10
      };

      if (search) filters.search = search;
      if (jobTypeFilter) filters.job_type = jobTypeFilter;

      const response = await api.getCalibrationJobs(filters) as CalibrationJobsResponse;

      if (response.success && response.data) {
        setJobs(response.data.jobs);
        setTotalPages(response.data.pagination.total_pages);
        setCurrentPage(response.data.pagination.current_page);
      } else {
        setError(response.error || 'Failed to fetch job requests');
      }
    } catch (err) {
      setError('Failed to fetch job requests');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showRecentOnly) {
      fetchJobs(1, searchTerm);
    } else {
      fetchJobs(currentPage, searchTerm);
    }
  }, [currentPage, showRecentOnly]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (showRecentOnly) {
        fetchJobs(1, searchTerm);
      } else {
        setCurrentPage(1);
        fetchJobs(1, searchTerm);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, jobTypeFilter]);

  const handleDelete = async (job: CalibrationJobWithCustomer) => {
    if (!window.confirm(`Are you sure you want to delete job request "${job.request_number}"?`)) {
      return;
    }

    try {
      const response = await api.deleteCalibrationJob(job.id) as any;
      if (response.success) {
        if (showRecentOnly) {
          fetchJobs(1, searchTerm);
        } else {
          fetchJobs(currentPage, searchTerm);
        }
      } else {
        setError(response.error || 'Failed to delete job request');
      }
    } catch (err) {
      setError('Failed to delete job request');
      console.error('Error deleting job:', err);
    }
  };

  const handleViewDetails = (job: CalibrationJobWithCustomer) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const handleEdit = (job: CalibrationJobWithCustomer) => {
    setSelectedJob(job);
    setEditForm({
      remarks: job.remarks || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedJob) return;

    try {
      const response = await api.updateCalibrationJob(selectedJob.id, {
        remarks: editForm.remarks
      }) as any;

      if (response.success) {
        setShowEditModal(false);
        if (showRecentOnly) {
          fetchJobs(1, searchTerm);
        } else {
          fetchJobs(currentPage, searchTerm);
        }
      } else {
        setError(response.error || 'Failed to update job request');
      }
    } catch (err) {
      setError('Failed to update job request');
      console.error('Error updating job:', err);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedJob(null);
  };

  const formatJobType = (type: string) => {
    return type === 'ACCREDITED' ? 'Accredited' : 'Non-Accredited';
  };

  const getJobTypeColor = (type: string) => {
    return type === 'ACCREDITED'
      ? 'bg-green-100 text-green-800'
      : 'bg-orange-100 text-orange-800';
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading job requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {showRecentOnly ? 'Recent Job Requests' : 'Calibration Job Requests'}
          </h3>
          <p className="text-sm text-gray-600">
            {showRecentOnly
              ? 'Latest calibration job requests'
              : 'View and manage all calibration job requests'
            }
          </p>
        </div>

        {!showRecentOnly && (
          <div className="flex gap-2">
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="ACCREDITED">Accredited</option>
              <option value="NON_ACCREDITED">Non-Accredited</option>
            </select>
          </div>
        )}
      </div>

      {/* Search */}
      {!showRecentOnly && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by request number, customer name, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No job requests found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || jobTypeFilter
              ? 'No job requests match your filters.'
              : showRecentOnly
                ? 'No recent job requests available.'
                : 'Get started by creating your first job request.'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    {!showRecentOnly && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {job.request_number}
                        </div>
                        {job.remarks && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {job.remarks}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {job.customer?.customer_name}
                        </div>
                        {job.customer?.email && (
                          <div className="text-sm text-gray-500">
                            {job.customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getJobTypeColor(job.job_type)}`}>
                            {formatJobType(job.job_type)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(job.request_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs">
                          by {job.created_by}
                        </div>
                      </td>
                      {!showRecentOnly && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(job)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(job)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(job)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!showRecentOnly && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Job Request Details</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedJob.request_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Type</label>
                  <p className="mt-1 text-sm text-gray-900">{formatJobType(selectedJob.job_type)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedJob.request_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedJob.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.customer?.customer_name}</p>
                {selectedJob.customer?.email && (
                  <p className="mt-1 text-sm text-gray-500">{selectedJob.customer.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.remarks || 'No remarks'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{selectedJob.created_by}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Job Request</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Request Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedJob.request_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Type</label>
                  <p className="mt-1 text-sm text-gray-900">{formatJobType(selectedJob.job_type)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter remarks..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRequestsList;
