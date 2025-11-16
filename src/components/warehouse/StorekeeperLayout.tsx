import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LogOut,
  User,
  BarChart3,
  Package,
  Download
} from 'lucide-react';

interface StorekeeperLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isInstallable?: boolean;
  isInstalled?: boolean;
  onInstallClick?: () => void;
}

const StorekeeperLayout: React.FC<StorekeeperLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isInstallable = false,
  isInstalled = false,
  onInstallClick
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  const storekeeperMenuItems = [
    { id: 'warehouse', label: 'Warehouse', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'spare-reports', label: 'Spare Reports', icon: Package },
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
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Main Menu
            </h3>
            {menuItems.map((item) => {
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

          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Warehouse Operations
            </h3>
            {storekeeperMenuItems.map((item) => {
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || user?.username || 'User'}
                </p>
                <p className="text-xs text-green-600 font-medium">Warehouse Manager</p>
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
                {menuItems.find(item => item.id === activeTab)?.label ||
                 storekeeperMenuItems.find(item => item.id === activeTab)?.label ||
                 'Warehouse Dashboard'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage warehouse operations and inventory efficiently
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
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full flex-shrink-0">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1 sm:flex-none sm:text-right">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-green-600 font-medium truncate">
                    {user?.email || user?.username || 'Warehouse Manager'}
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

export default StorekeeperLayout;
