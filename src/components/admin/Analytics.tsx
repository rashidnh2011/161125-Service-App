import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Analytics as AnalyticsData, User, ApiResponse } from '../../types';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Filter } from 'lucide-react';
import Chart from './Chart';

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0], // today
    user_id: '',
    report_type: ''
  });

  useEffect(() => {
    loadUsers();
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadUsers = async () => {
    try {
      const response: ApiResponse<User[]> = await api.getUsers();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const filterParams = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        ...(filters.user_id && { user_id: parseInt(filters.user_id) }),
        ...(filters.report_type && { report_type: filters.report_type })
      };

      const response: ApiResponse<AnalyticsData> = await api.getAnalytics(filterParams);
      if (response.success) {
        setAnalyticsData(response.data || null);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getTotalRevenue = () => {
    if (!analyticsData?.paymentStatusBreakdown) return 0;
    return analyticsData.paymentStatusBreakdown.reduce((total, item) => total + item.amount, 0);
  };

  const getTotalReports = () => {
    if (!analyticsData?.serviceVolumeOverTime) return 0;
    return analyticsData.serviceVolumeOverTime.reduce((total, item) => total + item.count, 0);
  };

  const getPaidPercentage = () => {
    if (!analyticsData?.paymentStatusBreakdown) return 0;
    const total = analyticsData.paymentStatusBreakdown.reduce((sum, item) => sum + item.count, 0);
    const paid = analyticsData.paymentStatusBreakdown.find(item => item.status === 'paid')?.count || 0;
    return total > 0 ? Math.round((paid / total) * 100) : 0;
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
        <h3 className="text-lg font-semibold text-gray-900">Analytics & Reporting</h3>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Users</option>
              {users.filter(u => u.role === 'technician').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={filters.report_type}
              onChange={(e) => handleFilterChange('report_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="inspection">Inspection</option>
              <option value="completion">Completion</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalReports()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{getTotalRevenue().toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Payment Rate</p>
              <p className="text-2xl font-bold text-gray-900">{getPaidPercentage()}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Technicians</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'technician' && u.active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Volume Over Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Service Volume Over Time</h4>
          {analyticsData?.serviceVolumeOverTime && (
            <Chart
              type="line"
              data={analyticsData.serviceVolumeOverTime}
              xKey="date"
              yKey="count"
              color="#2563eb"
            />
          )}
        </div>

        {/* Payment Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h4>
          {analyticsData?.paymentStatusBreakdown && (
            <Chart
              type="pie"
              data={analyticsData.paymentStatusBreakdown}
              xKey="status"
              yKey="count"
              color="#059669"
            />
          )}
        </div>

        {/* User Activity Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h4>
          {analyticsData?.userActivityTrends && (
            <Chart
              type="bar"
              data={analyticsData.userActivityTrends}
              xKey="user_name"
              yKey="report_count"
              color="#7c3aed"
            />
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h4>
          {analyticsData?.monthlyRevenue && (
            <Chart
              type="bar"
              data={analyticsData.monthlyRevenue}
              xKey="month"
              yKey="revenue"
              color="#ea580c"
            />
          )}
        </div>
      </div>

      {/* Report Type Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Report Type Distribution</h4>
        {analyticsData?.reportTypeDistribution && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.reportTypeDistribution.map((item, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-600 capitalize">{item.type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;