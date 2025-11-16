import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, Mail, Settings, BarChart3, Users } from 'lucide-react';
import { api } from '../../utils/api';
import { ReminderStats } from '../../types';

interface ReminderDashboardProps {
  onTabChange: (tab: string) => void;
}

const ReminderDashboard: React.FC<ReminderDashboardProps> = ({ onTabChange }) => {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getReminderStats() as any;
      if (response.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reminder statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reminder System Dashboard</h2>
            <p className="text-sm text-gray-600">Monitor and manage automated calibration reminders</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadStats}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <BarChart3 className="w-4 h-4" />
              Refresh Stats
            </button>
            <button
              onClick={() => onTabChange('reminder-settings')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Settings className="w-4 h-4" />
              Configure Reminders
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading statistics...</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Certificates"
              value={stats.total_active_certificates}
              icon={Users}
              color="border-blue-500"
              subtitle="Certificates with active reminders"
            />

            <StatCard
              title="Upcoming (7 days)"
              value={stats.upcoming_reminders_7_days}
              icon={Clock}
              color="border-orange-500"
              subtitle="Due within next week"
            />

            <StatCard
              title="Upcoming (30 days)"
              value={stats.upcoming_reminders_30_days}
              icon={AlertTriangle}
              color="border-yellow-500"
              subtitle="Due within next month"
            />

            <StatCard
              title="Sent Today"
              value={stats.reminders_sent_today}
              icon={Mail}
              color="border-green-500"
              subtitle="Reminders sent today"
            />

            <StatCard
              title="Failed Today"
              value={stats.failed_today}
              icon={AlertTriangle}
              color="border-red-500"
              subtitle="Failed to send"
            />

            <StatCard
              title="Closed This Week"
              value={stats.closed_this_week}
              icon={CheckCircle}
              color="border-purple-500"
              subtitle="Manually closed"
            />

            <StatCard
              title="Enabled Settings"
              value={`${stats?.reminder_settings?.enabled_settings || 0}/${stats?.reminder_settings?.total_settings || 0}`}
              icon={Settings}
              color="border-indigo-500"
              subtitle="Active reminder configurations"
            />

            <StatCard
              title="Success Rate"
              value={stats?.reminders_sent_today && stats.reminders_sent_today > 0
                ? `${Math.round(((stats.reminders_sent_today - (stats.failed_today || 0)) / stats.reminders_sent_today) * 100)}%`
                : '0%'
              }
              icon={CheckCircle}
              color="border-green-500"
              subtitle="Today's delivery rate"
            />
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No reminder statistics available</p>
            <p className="text-sm">Check back after configuring reminders and running the system</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onTabChange('reminder-settings')}
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Settings className="w-8 h-8 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-blue-900">Configure Reminders</div>
              <div className="text-sm text-blue-600">Set up reminder timing and recipients</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('reminder-logs')}
            className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Mail className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-green-900">View Logs</div>
              <div className="text-sm text-green-600">Check sent reminders and status</div>
            </div>
          </button>

          <button
            onClick={() => {/* Process reminders manually */}}
            className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Bell className="w-8 h-8 text-orange-600" />
            <div className="text-left">
              <div className="font-medium text-orange-900">Process Now</div>
              <div className="text-sm text-orange-600">Run reminder scan manually</div>
            </div>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Reminder Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Settings:</span>
                <span className="font-medium">{stats?.reminder_settings.enabled_settings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Settings:</span>
                <span className="font-medium">{stats?.reminder_settings.total_settings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Coverage:</span>
                <span className="font-medium">
                  {stats?.reminder_settings?.total_settings && stats.reminder_settings.total_settings > 0
                    ? Math.round(((stats?.reminder_settings?.enabled_settings || 0) / stats.reminder_settings.total_settings) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sent Today:</span>
                <span className="font-medium text-green-600">{stats?.reminders_sent_today || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed Today:</span>
                <span className="font-medium text-red-600">{stats?.failed_today || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Closed This Week:</span>
                <span className="font-medium text-purple-600">{stats?.closed_this_week || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderDashboard;
