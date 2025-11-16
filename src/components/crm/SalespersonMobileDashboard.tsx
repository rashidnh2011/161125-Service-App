import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isMobile } from '../../utils/device';
import {
  LogOut,
  User,
  Target,
  Phone,
  Briefcase,
  Activity,
  MapPin,
  Smartphone,
  ArrowLeft,
  Home,
  FileText,
  DollarSign,
  Download
} from 'lucide-react';
import VisitTracking from './VisitTracking';
import LeadManagement from './LeadManagement';

type MobileViewType = 'dashboard' | 'visits' | 'leads';

const SalespersonMobileDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<MobileViewType>('dashboard');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const menuItems = [
    { id: 'dashboard' as MobileViewType, label: 'Dashboard', icon: Home },
    { id: 'visits' as MobileViewType, label: 'Visit Tracking', icon: MapPin },
    { id: 'leads' as MobileViewType, label: 'Lead Management', icon: Target },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-4 space-y-4">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Welcome back, {user?.name || user?.username || 'Salesperson'}
                  </h2>
                  <p className="text-blue-100">Mobile Dashboard</p>
                </div>
              </div>
              <p className="text-blue-100 text-sm">
                Access your CRM tools on the go with our mobile-optimized interface.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentView('visits')}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 block">Visit Tracking</span>
                <span className="text-xs text-gray-500">Track customer visits</span>
              </button>

              <button
                onClick={() => setCurrentView('leads')}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 block">Lead Management</span>
                <span className="text-xs text-gray-500">Manage leads</span>
              </button>
            </div>

            {/* PWA Install Section */}
            {isInstallable && !isInstalled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900">Install App</h3>
                    <p className="text-xs text-blue-700">
                      Install BizOps360 on your device for quick access
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Install App
                </button>
              </div>
            )}

            {/* Device Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Smartphone className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Mobile Mode</span>
              </div>
              <p className="text-xs text-yellow-700">
                You're using the mobile-optimized interface for better performance on smaller screens.
              </p>
            </div>
          </div>
        );

      case 'visits':
        return <VisitTracking />;

      case 'leads':
        return <LeadManagement />;

      default:
        return <div>Content not available</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {currentView !== 'dashboard' && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex items-center space-x-2">
              <img
                src="https://arabscalecalibration.com/logo.png"
                alt="BizOps360 Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-gray-900">BizOps360</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isInstallable && !isInstalled && currentView === 'dashboard' && (
              <button
                onClick={handleInstallClick}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Install PWA"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.name || user?.username || 'Salesperson'}
            </span>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Mobile Optimized */}
      <nav className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="grid grid-cols-3 gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add bottom padding for mobile navigation */}
      <div className="h-20" />
    </div>
  );
};

export default SalespersonMobileDashboard;
