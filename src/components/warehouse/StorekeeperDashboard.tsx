import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isMobile } from '../../utils/device';
import StorekeeperLayout from './StorekeeperLayout';
import StorekeeperMobileDashboard from './StorekeeperMobileDashboard';
import ErrorBoundary from '../common/ErrorBoundary';
import WarehouseManagement from './WarehouseManagement';
import Analytics from '../admin/Analytics';
import SpareReports from '../admin/SpareReports';

type TabType = 'dashboard' | 'warehouse' | 'analytics' | 'spare-reports'| 'warehouse-management';

const StorekeeperDashboard: React.FC = () => {
  const { user, isLoading, error } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWA Installation Effect
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Safety check for user after loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication required. Please login.</p>
        </div>
      </div>
    );
  }

  // Validate user data completeness
  if (!user.role || !user.id || !user.username) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Incomplete user data. Please contact administrator.</p>
        </div>
      </div>
    );
  }

  // Validate storekeeper role access
  if (user.role !== 'storekeeper') {
    console.log('StorekeeperDashboard: User role is', user.role, 'but expected storekeeper');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Storekeeper access required. Current role: {user.role}</p>
          <p className="text-sm text-gray-600 mb-4">Expected: storekeeper</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If mobile device, render mobile dashboard
  if (isMobile()) {
    return <StorekeeperMobileDashboard />;
  }

  // Desktop/Tablet layout
  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <WarehouseManagement />;
        case 'warehouse':
          return <WarehouseManagement />;
        case 'analytics':
          return <Analytics />;
        case 'spare-reports':
          return <SpareReports />;
        default:
          return <WarehouseManagement />;
      }
    } catch (error) {
      console.error('Error rendering tab content:', error);
      return (
        <div className="p-6 text-center">
          <p className="text-red-600">Error loading content. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <StorekeeperLayout
        activeTab={activeTab}
        onTabChange={(tab: string) => setActiveTab(tab as TabType)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstallClick={handleInstallClick}
      >
        {renderTabContent()}
      </StorekeeperLayout>
    </ErrorBoundary>
  );
};

export default StorekeeperDashboard;
