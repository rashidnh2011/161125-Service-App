import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  LogOut,
  Plus,
  FileText,
  History,
  Users,
  CheckCircle,
  Settings,
  Package,
  BarChart3,
  TrendingUp,
  MapPin,
  Target,
  Phone,
  Briefcase,
  Activity,
  Download
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstallClick?: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isInstallable = false,
  isInstalled = false,
  onInstallClick
}) => {
  const { user, logout, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Safety check for user after loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication required.</p>
          <button 
            onClick={logout} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'create', label: 'Create Service', icon: Plus },
    { id: 'reports', label: 'Service Reports', icon: FileText },
    { id: 'history', label: 'Service History', icon: History },
    { id: 'all-reports', label: 'All Reports', icon: FileText },
    { id: 'spare-reports', label: 'Spare Reports', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'report-analysis', label: 'Report Analysis', icon: TrendingUp },
    { id: 'sales-analytics', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle },
    { id: 'warehouse', label: 'Warehouse', icon: Settings },
    { id: 'location-tracking', label: 'Location Tracking', icon: MapPin },
    { id: 'crm-dashboard', label: 'CRM Dashboard', icon: BarChart3 },
    { id: 'leads', label: 'Lead Management', icon: Target },
    { id: 'contacts', label: 'Contact Management', icon: Phone },
    { id: 'opportunities', label: 'Opportunity Tracking', icon: Briefcase },
    { id: 'activities', label: 'Activity Logging', icon: Activity },
    { id: 'visits', label: 'Visit Tracking', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex justify-center">
          <div className="flex flex-col items-center">
            <img 
              src="https://arabscalecalibration.com/logo.png" 
              alt="BizOps360 Logo" 
              className="h-12 w-auto"
            />
            <h1 className="mt-2 text-lg font-bold text-gray-900">BizOps360</h1>
            <p className="text-xs text-gray-500">Complete Business Operations</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Create Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Create & Manage
            </h3>
            {menuItems.filter(item => ['create', 'sales-analytics'].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Reports Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Reports
            </h3>
            {menuItems.filter(item => ['reports', 'history', 'all-reports', 'spare-reports'].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Analytics Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Analytics
            </h3>
            {menuItems.filter(item => ['analytics', 'report-analysis'].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Administration Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Administration
            </h3>
            {menuItems.filter(item => ['users', 'approvals', 'warehouse', 'location-tracking'].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* CRM Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Customer Relationship Management
            </h3>
            {menuItems.filter(item => ['crm-dashboard', 'leads', 'contacts', 'opportunities', 'activities', 'visits'].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-100 text-green-700 border-r-2 border-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || user?.username || 'User'}
                </p>
                <p className="text-xs text-blue-600 font-medium">Administrator</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {menuItems.find(item => item.id === activeTab)?.label || 'Analytics Dashboard'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your service operations efficiently
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {isInstallable && !isInstalled && onInstallClick && (
                <button
                  onClick={onInstallClick}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title="Install PWA"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </button>
              )}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email || user?.username || ''}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;