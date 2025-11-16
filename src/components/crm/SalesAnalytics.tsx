import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Filter
} from 'lucide-react';

interface SalesMetrics {
  total_revenue: number;
  total_leads: number;
  total_opportunities: number;
  total_conversions: number;
  avg_deal_size: number;
  conversion_rate: number;
  avg_sales_cycle: number;
  top_performing_salesperson?: {
    name: string;
    revenue: number;
    deals: number;
  };
  monthly_growth: number;
  quarterly_growth: number;
}

interface SalespersonPerformance {
  id: number;
  name: string;
  total_revenue: number;
  total_deals: number;
  conversion_rate: number;
  avg_deal_size: number;
  leads_generated: number;
  opportunities_created: number;
  activities_logged: number;
  monthly_growth: number;
  quarterly_growth: number;
  rank: number;
}

interface SalesTrend {
  period: string;
  revenue: number;
  leads: number;
  conversions: number;
  opportunities: number;
}

interface LeadSourceData {
  source: string;
  leads: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
}

interface OpportunityStageData {
  stage: string;
  count: number;
  value: number;
  avg_time_in_stage: number;
}

const SalesAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [salespeople, setSalespeople] = useState<SalespersonPerformance[]>([]);
  const [trends, setTrends] = useState<SalesTrend[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceData[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<OpportunityStageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedSalesperson, setSelectedSalesperson] = useState<number | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedSalesperson]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch main metrics
      const metricsResponse = await api.getSalesAnalytics(timeRange, selectedSalesperson || undefined) as { success: boolean; data?: SalesMetrics };

      // Fetch salesperson performance data
      const performanceResponse = await api.getSalespeopleAnalytics() as { success: boolean; data?: SalespersonPerformance[] };

      // Fetch trends data
      const trendsResponse = await api.getSalesTrends(timeRange) as { success: boolean; data?: SalesTrend[] };

      // Fetch lead source analysis
      const leadSourceResponse = await api.getLeadSourceAnalytics() as { success: boolean; data?: LeadSourceData[] };

      // Fetch opportunity stage analysis
      const stageResponse = await api.getOpportunityStageAnalytics() as { success: boolean; data?: OpportunityStageData[] };

      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data);
      }
      if (performanceResponse.success && performanceResponse.data) {
        setSalespeople(performanceResponse.data);
      }
      if (trendsResponse.success && trendsResponse.data) {
        setTrends(trendsResponse.data);
      }
      if (leadSourceResponse.success && leadSourceResponse.data) {
        setLeadSources(leadSourceResponse.data);
      }
      if (stageResponse.success && stageResponse.data) {
        setOpportunityStages(stageResponse.data);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months} months`;
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor sales performance and key metrics</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <select
            value={selectedSalesperson || ''}
            onChange={(e) => setSelectedSalesperson(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Salespeople</option>
            {salespeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(metrics.total_revenue)}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(metrics.monthly_growth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(metrics.monthly_growth)}`}>
                    {formatPercentage(Math.abs(metrics.monthly_growth))} from last month
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {metrics.total_leads.toLocaleString()}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(metrics.quarterly_growth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(metrics.quarterly_growth)}`}>
                    {formatPercentage(Math.abs(metrics.quarterly_growth))} from last quarter
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercentage(metrics.conversion_rate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {metrics.total_conversions} conversions from {metrics.total_opportunities} opportunities
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Avg Sales Cycle</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(metrics.avg_sales_cycle)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Average time to close deals
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Sales Trends</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Interactive chart will be implemented here</p>
              <p className="text-sm text-gray-400 mt-1">
                {trends.length} data points • Revenue: {formatCurrency(trends.reduce((sum, t) => sum + t.revenue, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Lead Sources Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Lead Sources</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Interactive pie chart will be implemented here</p>
              <p className="text-sm text-gray-400 mt-1">
                {leadSources.length} sources • Total leads: {leadSources.reduce((sum, s) => sum + s.leads, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Salesperson Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Salesperson Performance</h3>
            <Award className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salesperson
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Deal Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activities
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salespeople.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {person.rank <= 3 && (
                        <Award className={`w-4 h-4 mr-2 ${
                          person.rank === 1 ? 'text-yellow-500' :
                          person.rank === 2 ? 'text-gray-400' :
                          'text-amber-600'
                        }`} />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        #{person.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{person.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(person.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {person.total_deals}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(person.conversion_rate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(person.avg_deal_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {person.activities_logged}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Pipeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Opportunity Pipeline</h3>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {opportunityStages.map((stage) => (
            <div key={stage.stage} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 capitalize">
                  {stage.stage.replace('_', ' ')}
                </h4>
                <span className="text-sm text-gray-500">{stage.count}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(stage.value)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Avg: {formatDuration(stage.avg_time_in_stage)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performer Highlight */}
      {metrics?.top_performing_salesperson && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-yellow-900">Top Performer This Month</h3>
              <p className="text-yellow-700">
                {metrics.top_performing_salesperson.name} - {formatCurrency(metrics.top_performing_salesperson.revenue)} from {metrics.top_performing_salesperson.deals} deals
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesAnalytics;
