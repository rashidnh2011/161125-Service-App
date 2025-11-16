import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LogOut,
  User,
  Target,
  Phone,
  Briefcase,
  Activity,
  MapPin,
  Home,
  Download
} from 'lucide-react';

interface SalespersonLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstallClick?: () => void;
}

const SalespersonLayout: React.FC<SalespersonLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isInstallable = false,
  isInstalled = false,
  onInstallClick
}) => {
  const { user, logout } = useAuth();

  const crmMenuItems = [
    { id: 'crm-dashboard', label: 'CRM Dashboard', icon: Home },
    { id: 'leads', label: 'Lead Management', icon: Target },
    { id: 'contacts', label: 'Contact Management', icon: Phone },
    { id: 'opportunities', label: 'Opportunity Tracking', icon: Briefcase },
    { id: 'quotations', label: 'Quotations', icon: Activity },
    { id: 'invoices', label: 'Invoices', icon: Activity },
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
        <nav className="flex-1 p-4 space-y-2">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Customer Relationship Management
            </h3>
            {crmMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-yellow-100 text-yellow-700 border-r-2 border-yellow-700'
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                <User className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || user?.username || 'User'}
                </p>
                <p className="text-xs text-yellow-600 font-medium">Salesperson</p>
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
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {crmMenuItems.find(item => item.id === activeTab)?.label || 'CRM Dashboard'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Track your performance and manage your visits
              </p>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end space-x-3">
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
              <div className="flex items-center space-x-2 min-w-0 flex-1 sm:flex-none">
                <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full flex-shrink-0">
                  <User className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1 sm:flex-none sm:text-right">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-yellow-600 font-medium truncate">
                    {user?.email || user?.username || 'Salesperson'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
          <div className="max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SalespersonLayout;
