import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, FileText, History, LogOut, User, Wrench, Package, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { TechnicianSpareAssignment } from '../../types';

interface TechnicianDashboardProps {
  onTabChange: (tab: 'create' | 'reports' | 'history' | 'spares') => void;
  showHeader?: boolean;
}

const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({ onTabChange, showHeader = true }) => {
  const { user, logout, isLoading } = useAuth();
  const [assignments, setAssignments] = useState<TechnicianSpareAssignment[]>([]);
  const [showAssignments, setShowAssignments] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAssignments();
    }
  }, [user?.id]);

  const loadAssignments = async () => {
    try {
      const response = await api.getTechnicianAssignments(user?.id) as { success: boolean; data?: TechnicianSpareAssignment[] };
      if (response.success && response.data) {
        setAssignments(response.data);
      }
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Wrench className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-700 font-medium text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 mb-6 text-lg font-medium">Authentication required</p>
          <button
            onClick={logout}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.username || 'User';

  const dashboardCards = [
    {
      id: 'create',
      title: 'Create Service Report',
      description: 'Start a new service report for customer visit',
      icon: Plus,
      gradient: 'from-blue-500 via-blue-600 to-cyan-600',
      hoverGradient: 'hover:from-blue-600 hover:via-blue-700 hover:to-cyan-700',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      glowColor: 'shadow-blue-500/20'
    },
    {
      id: 'reports',
      title: 'Service Reports',
      description: 'View and manage your service reports',
      icon: FileText,
      gradient: 'from-emerald-500 via-green-600 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:via-green-700 hover:to-teal-700',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      glowColor: 'shadow-emerald-500/20'
    },
    {
      id: 'history',
      title: 'Service History',
      description: 'Search service history by serial number',
      icon: History,
      gradient: 'from-amber-500 via-orange-600 to-red-600',
      hoverGradient: 'hover:from-amber-600 hover:via-orange-700 hover:to-red-700',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      glowColor: 'shadow-amber-500/20'
    },
    {
      id: 'spares',
      title: 'My Spares',
      description: 'View and manage your assigned spare parts',
      icon: Package,
      gradient: 'from-rose-500 via-pink-600 to-fuchsia-600',
      hoverGradient: 'hover:from-rose-600 hover:via-pink-700 hover:to-fuchsia-700',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      glowColor: 'shadow-rose-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {showHeader && (
        <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Arab Scale Service
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block font-medium">Professional Service Management</p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 rounded-xl border border-blue-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate max-w-24 sm:max-w-none">
                      {displayName}
                    </p>
                    <p className="text-xs text-blue-600 font-semibold">Technician</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:text-white bg-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 border border-gray-200 hover:border-transparent rounded-xl transition-all duration-200 shadow-sm hover:shadow-lg font-medium"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <div className="inline-block mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-4">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent mb-3 sm:mb-4">
            Welcome back, {displayName}!
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
            Manage your service reports efficiently with our professional tools designed for technicians
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12">
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onTabChange(card.id as 'create' | 'reports' | 'history' | 'spares')}
                className={`group relative overflow-hidden bg-gradient-to-br ${card.gradient} ${card.hoverGradient} rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 transform hover:scale-[1.02] shadow-xl ${card.glowColor} hover:shadow-2xl`}
              >
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 ${card.iconBg} rounded-xl sm:rounded-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${card.iconColor}`} />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                    {card.title}
                  </h3>

                  <p className="text-white/90 text-sm sm:text-base leading-relaxed font-medium">
                    {card.description}
                  </p>

                  <div className="mt-4 flex items-center text-white/80 text-sm font-medium group-hover:text-white transition-colors">
                    <span>Get Started</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full transform translate-x-16 sm:translate-x-20 -translate-y-16 sm:-translate-y-20 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full transform -translate-x-12 sm:-translate-x-16 translate-y-12 sm:translate-y-16 group-hover:scale-150 transition-transform duration-500"></div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            );
          })}
        </div>

        {assignments.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mb-8 sm:mb-10 md:mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">My Assigned Spares</h3>
              </div>
              <button
                onClick={() => setShowAssignments(!showAssignments)}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                {showAssignments ? 'Hide Details' : 'Show Details'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-8 h-8 text-orange-600" />
                  <div className="text-3xl font-bold text-orange-600">{assignments.length}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Total Assigned</div>
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full transform translate-x-8 translate-y-8"></div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="text-3xl font-bold text-green-600">
                    {assignments.filter(a => a.status === 'active').length}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Active</div>
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-green-200/30 rounded-full transform translate-x-8 translate-y-8"></div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-red-600" />
                  <div className="text-3xl font-bold text-red-600">
                    {assignments.filter(a => a.status === 'overdue').length}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-700">Overdue</div>
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-red-200/30 rounded-full transform translate-x-8 translate-y-8"></div>
              </div>
            </div>

            {showAssignments && (
              <div className="mt-6 space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {assignment.spare_inventory?.spare?.name} - {assignment.spare_inventory?.unique_spare_id}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        assignment.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                        assignment.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {assignment.status}
                      </div>
                    </div>
                    {assignment.expected_return_date && (
                      <div className="text-sm text-gray-600 flex items-center mt-2">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        Expected Return: {new Date(assignment.expected_return_date).toLocaleDateString()}
                      </div>
                    )}
                    {assignment.purpose && (
                      <div className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded-lg">
                        Purpose: {assignment.purpose}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Performance Overview</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="text-3xl sm:text-4xl font-bold text-blue-600">-</div>
              </div>
              <div className="text-sm font-semibold text-gray-700">Reports This Month</div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-150 transition-transform duration-300"></div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="text-3xl sm:text-4xl font-bold text-green-600">-</div>
              </div>
              <div className="text-sm font-semibold text-gray-700">Completed Services</div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-green-200/30 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-150 transition-transform duration-300"></div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow group sm:col-span-3 md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <Clock className="w-8 h-8 text-amber-600" />
                <div className="text-3xl sm:text-4xl font-bold text-amber-600">-</div>
              </div>
              <div className="text-sm font-semibold text-gray-700">Pending Reports</div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full transform translate-x-8 translate-y-8 group-hover:scale-150 transition-transform duration-300"></div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 sm:mt-12 text-gray-500 px-4">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg mb-3 shadow-md shadow-blue-500/30">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            Arab Scale Service Management System v1.0
          </p>
          <p className="text-xs mt-2 leading-relaxed text-gray-500">
            Professional weighing scale and POS system service management
          </p>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
