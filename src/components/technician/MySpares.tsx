import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { TechnicianSpareAssignment } from '../../types';
import {
  Package,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';

interface MySparesFilters {
  status?: 'active' | 'completed' | 'overdue' | 'all';
  invoiced?: boolean;
  search?: string;
}

const MySpares: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TechnicianSpareAssignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<TechnicianSpareAssignment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<MySparesFilters>({
    status: 'all',
    invoiced: false,
    search: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [assignments, filters]);

  const loadAssignments = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await api.getTechnicianAssignments(user.id) as { success: boolean; data?: TechnicianSpareAssignment[] };
      if (response.success && response.data) {
        const technicianAssignments = response.data.filter(assignment => assignment.technician_id === user.id);
        setAssignments(technicianAssignments);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assignments];

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === filters.status);
    }

    // Filter by invoiced status (check if spares were used in invoiced service reports)
    if (filters.invoiced) {
      filtered = filtered.filter(assignment => {
        // This would need to be enhanced with actual invoiced status from backend
        // For now, we'll consider spares used in completed service reports as potentially invoiced
        return assignment.status === 'completed';
      });
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.spare_inventory?.spare?.name?.toLowerCase().includes(searchLower) ||
        assignment.spare_inventory?.unique_spare_id?.toLowerCase().includes(searchLower) ||
        assignment.purpose?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAssignments(filtered);
  };

  const handleFilterChange = (key: keyof MySparesFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      invoiced: false,
      search: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'Active' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Completed' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle, label: 'Overdue' },
      default: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Package, label: 'Unknown' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (expectedReturnDate?: string): boolean => {
    if (!expectedReturnDate) return false;
    return new Date(expectedReturnDate) < new Date();
  };

  const getDaysUntilDue = (expectedReturnDate?: string): number | null => {
    if (!expectedReturnDate) return null;
    const today = new Date();
    const dueDate = new Date(expectedReturnDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Assigned Spares</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={loadAssignments}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <Filter className="w-4 h-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoiced</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.invoiced || false}
                  onChange={(e) => handleFilterChange('invoiced', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show only invoiced spares</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search spares..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredAssignments.length} of {assignments.length} assignments
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Assigned</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{assignments.length}</p>
            </div>
            <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Active</p>
              <p className="text-xl md:text-2xl font-bold text-blue-900">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Completed</p>
              <p className="text-xl md:text-2xl font-bold text-green-900">
                {assignments.filter(a => a.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-xl md:text-2xl font-bold text-red-900">
                {assignments.filter(a => a.status === 'overdue').length}
              </p>
            </div>
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Assignments Display - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {assignments.length === 0 ? 'No spare parts assigned to you yet.' : 'No assignments match the current filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spare Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected Return
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssignments.map((assignment) => {
                    const daysUntilDue = getDaysUntilDue(assignment.expected_return_date);
                    const overdue = isOverdue(assignment.expected_return_date);

                    return (
                      <tr key={assignment.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.spare_inventory?.spare?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {assignment.spare_inventory?.unique_spare_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(assignment.status)}
                          {overdue && (
                            <div className="text-xs text-red-600 mt-1">
                              {Math.abs(daysUntilDue || 0)} days overdue
                            </div>
                          )}
                          {!overdue && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0 && (
                            <div className="text-xs text-orange-600 mt-1">
                              Due in {daysUntilDue} days
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(assignment.assigned_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.expected_return_date ? formatDate(assignment.expected_return_date) : 'No return date'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={assignment.purpose}>
                            {assignment.purpose || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {assignment.status === 'active' && (
                            <button className="text-blue-600 hover:text-blue-900">
                              Mark Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredAssignments.map((assignment) => {
                const daysUntilDue = getDaysUntilDue(assignment.expected_return_date);
                const overdue = isOverdue(assignment.expected_return_date);

                return (
                  <div key={assignment.id} className={`bg-white border rounded-lg p-4 shadow-sm ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    {/* Header with Spare Details and Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <Package className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {assignment.spare_inventory?.spare?.name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            ID: {assignment.spare_inventory?.unique_spare_id}
                          </p>
                        </div>
                      </div>
                      <div className="ml-3">
                        {getStatusBadge(assignment.status)}
                      </div>
                    </div>

                    {/* Status Alerts */}
                    <div className="mb-3">
                      {overdue && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-2">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {Math.abs(daysUntilDue || 0)} days overdue
                        </div>
                      )}
                      {!overdue && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue > 0 && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mb-2">
                          <Clock className="w-3 h-3 mr-1" />
                          Due in {daysUntilDue} days
                        </div>
                      )}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Assigned:</span>
                        <div className="font-medium text-gray-900">
                          {formatDate(assignment.assigned_date)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Expected Return:</span>
                        <div className="font-medium text-gray-900">
                          {assignment.expected_return_date ? formatDate(assignment.expected_return_date) : 'No return date'}
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="mb-3">
                      <span className="text-gray-500 text-sm">Purpose:</span>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {assignment.purpose || 'N/A'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-200">
                      {assignment.status === 'active' && (
                        <button className="w-full text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MySpares;
