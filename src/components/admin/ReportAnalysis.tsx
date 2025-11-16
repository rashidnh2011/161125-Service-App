import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ServiceReport, User, Customer, ApiResponse } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  FileText,
  Download,
  Filter,
  Clock,
  Check,
  AlertCircle,
  XCircle
} from 'lucide-react';
import Chart from './Chart';

interface ReportAnalysisData {
  totalReports: number;
  completedReports: number;
  pendingReports: number;
  totalRevenue: number;
  averageCompletionTime: number;
  technicianPerformance: Array<{
    technician_id: number;
    technician_name: string;
    total_reports: number;
    completed_reports: number;
    pending_reports: number;
    total_revenue: number;
    avg_completion_time: number;
    completion_rate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    reports: number;
    revenue: number;
    completion_rate: number;
  }>;
  reportTypeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  customerSatisfaction: Array<{
    customer_name: string;
    total_services: number;
    completion_rate: number;
    total_spent: number;
  }>;
}

const ReportAnalysis: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<ReportAnalysisData | null>(null);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    end_date: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      generateAnalysis();
    }
  }, [reports, selectedTechnician, dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportsRes, usersRes, customersRes] = await Promise.all([
        api.getAllServiceReports(),
        api.getUsers(),
        api.getCustomers()
      ]);

      if (reportsRes.success) setReports(reportsRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (customersRes.success) setCustomers(customersRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalysis = () => {
    let filteredReports = reports.filter(report => {
      const reportDate = new Date(report.visit_date);
      const startDate = new Date(dateRange.start_date);
      const endDate = new Date(dateRange.end_date);
      
      const inDateRange = reportDate >= startDate && reportDate <= endDate;
      const matchesTechnician = selectedTechnician === 'all' || report.technician_id.toString() === selectedTechnician;
      
      return inDateRange && matchesTechnician;
    });

    // Calculate technician performance
    const technicianPerformance = users
      .filter(user => user.role === 'technician')
      .map(technician => {
        const techReports = filteredReports.filter(r => r.technician_id === technician.id);
        const completedReports = techReports.filter(r => r.status === 'completed' || r.status === 'sent');
        const totalRevenue = techReports.reduce((sum, report) => {
          return sum + (report.payment_info?.amount || 0);
        }, 0);

        return {
          technician_id: technician.id,
          technician_name: technician.name,
          total_reports: techReports.length,
          completed_reports: completedReports.length,
          pending_reports: techReports.length - completedReports.length,
          total_revenue: totalRevenue,
          avg_completion_time: calculateAvgCompletionTime(techReports),
          completion_rate: techReports.length > 0 ? (completedReports.length / techReports.length) * 100 : 0
        };
      })
      .sort((a, b) => b.total_reports - a.total_reports);

    // Calculate monthly trends
    const monthlyTrends = generateMonthlyTrends(filteredReports);

    // Calculate report type breakdown
    const reportTypeBreakdown = generateReportTypeBreakdown(filteredReports);

    // Calculate customer satisfaction metrics
    const customerSatisfaction = generateCustomerSatisfaction(filteredReports);

    const analysisData: ReportAnalysisData = {
      totalReports: filteredReports.length,
      completedReports: filteredReports.filter(r => r.status === 'completed' || r.status === 'sent').length,
      pendingReports: filteredReports.filter(r => r.status === 'draft' || r.status === 'inspection').length,
      totalRevenue: filteredReports.reduce((sum, report) => sum + (report.payment_info?.amount || 0), 0),
      averageCompletionTime: calculateAvgCompletionTime(filteredReports),
      technicianPerformance,
      monthlyTrends,
      reportTypeBreakdown,
      customerSatisfaction
    };

    setAnalysisData(analysisData);
  };

  const calculateAvgCompletionTime = (reports: ServiceReport[]): number => {
    const completedReports = reports.filter(r => r.status === 'completed' || r.status === 'sent');
    if (completedReports.length === 0) return 0;

    const totalHours = completedReports.reduce((sum, report) => {
      const created = new Date(report.created_at);
      const updated = new Date(report.updated_at);
      const hours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return Math.round(totalHours / completedReports.length);
  };

  const generateMonthlyTrends = (reports: ServiceReport[]) => {
    const monthlyData: { [key: string]: { reports: number; revenue: number; completed: number } } = {};

    reports.forEach(report => {
      const month = new Date(report.visit_date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { reports: 0, revenue: 0, completed: 0 };
      }
      monthlyData[month].reports++;
      monthlyData[month].revenue += report.payment_info?.amount || 0;
      if (report.status === 'completed' || report.status === 'sent') {
        monthlyData[month].completed++;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        reports: data.reports,
        revenue: data.revenue,
        completion_rate: data.reports > 0 ? (data.completed / data.reports) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const generateReportTypeBreakdown = (reports: ServiceReport[]) => {
    const typeCount: { [key: string]: number } = {};
    reports.forEach(report => {
      const type = report.type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const total = reports.length;
    return Object.entries(typeCount).map(([type, count]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  };

  const generateCustomerSatisfaction = (reports: ServiceReport[]) => {
    const customerData: { [key: string]: { services: number; completed: number; revenue: number; name: string } } = {};

    reports.forEach(report => {
      const customerId = report.customer_id.toString();
      if (!customerData[customerId]) {
        customerData[customerId] = {
          services: 0,
          completed: 0,
          revenue: 0,
          name: report.customer?.name || 'Unknown'
        };
      }
      customerData[customerId].services++;
      customerData[customerId].revenue += report.payment_info?.amount || 0;
      if (report.status === 'completed' || report.status === 'sent') {
        customerData[customerId].completed++;
      }
    });

    return Object.entries(customerData)
      .map(([customerId, data]) => ({
        customer_name: data.name,
        total_services: data.services,
        completion_rate: data.services > 0 ? (data.completed / data.services) * 100 : 0,
        total_spent: data.revenue
      }))
      .sort((a, b) => b.total_services - a.total_services)
      .slice(0, 10); // Top 10 customers
  };

  const exportReport = () => {
    if (!analysisData) return;

    const reportData = {
      generated_at: new Date().toISOString(),
      date_range: dateRange,
      selected_technician: selectedTechnician,
      summary: {
        total_reports: analysisData.totalReports,
        completed_reports: analysisData.completedReports,
        pending_reports: analysisData.pendingReports,
        total_revenue: analysisData.totalRevenue,
        average_completion_time: analysisData.averageCompletionTime
      },
      technician_performance: analysisData.technicianPerformance,
      monthly_trends: analysisData.monthlyTrends,
      report_types: analysisData.reportTypeBreakdown,
      top_customers: analysisData.customerSatisfaction
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service_analysis_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Report Analysis</h3>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Analysis Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Technicians</option>
              {users.filter(u => u.role === 'technician').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{analysisData.totalReports}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{analysisData.completedReports}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{analysisData.pendingReports}</p>
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
              <p className="text-2xl font-bold text-gray-900">₹{analysisData.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Completion</p>
              <p className="text-2xl font-bold text-gray-900">{analysisData.averageCompletionTime}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Technician Performance</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Reports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysisData.technicianPerformance.map((tech) => (
                <tr key={tech.technician_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tech.technician_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tech.total_reports}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-green-600">{tech.completed_reports}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-orange-600">{tech.pending_reports}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{tech.completion_rate.toFixed(1)}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${tech.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{tech.total_revenue.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tech.avg_completion_time}h</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h4>
          <Chart
            type="line"
            data={analysisData.monthlyTrends}
            xKey="month"
            yKey="reports"
            color="#2563eb"
          />
        </div>

        {/* Report Type Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Report Types</h4>
          <Chart
            type="pie"
            data={analysisData.reportTypeBreakdown}
            xKey="type"
            yKey="count"
            color="#059669"
          />
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h4>
          <Chart
            type="bar"
            data={analysisData.customerSatisfaction.slice(0, 5)}
            xKey="customer_name"
            yKey="total_services"
            color="#7c3aed"
          />
        </div>

        {/* Revenue Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h4>
          <Chart
            type="bar"
            data={analysisData.monthlyTrends}
            xKey="month"
            yKey="revenue"
            color="#ea580c"
          />
        </div>
      </div>
    </div>
  );
};

export default ReportAnalysis;