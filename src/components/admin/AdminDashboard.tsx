import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CreateService from '../technician/CreateService';
import ServiceReports from '../technician/ServiceReports';
import ScaleHistory from '../technician/ScaleHistory';
import AdminLayout from './AdminLayout';
import ErrorBoundary from '../common/ErrorBoundary';
import UserManagement from './UserManagement';
import ApprovalsManagement from './ApprovalsManagement';
import ServiceReportManagement from './ServiceReportManagement';
import Analytics from './Analytics';
import ReportAnalysis from './ReportAnalysis';
import LocationTracking from './LocationTracking';
import WarehouseManagement from '../warehouse/WarehouseManagement';
import SpareReports from './SpareReports';
import SalesAnalytics from '../crm/SalesAnalytics';
import CRMDashboard from '../crm/CRMDashboard';
import LeadManagement from '../crm/LeadManagement';
import ContactManagement from '../crm/ContactManagement';
import OpportunityTracking from '../crm/OpportunityTracking';
import ActivityLogging from '../crm/ActivityLogging';
import VisitTracking from '../crm/VisitTracking';

type TabType = 'dashboard' | 'create' | 'reports' | 'history' | 'users' | 'all-reports' | 'warehouse' | 'analytics' | 'report-analysis' | 'location-tracking' | 'approvals' | 'spare-reports' | 'crm-dashboard' | 'leads' | 'contacts' | 'opportunities' | 'activities' | 'visits' | 'sales-analytics';

const AdminDashboard: React.FC = () => {
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

  // Only allow admin users
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Admin access required.</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard':
          return <Analytics />;
        case 'create':
          return <CreateService />;
        case 'reports':
          return <ServiceReports />;
        case 'history':
          return <ScaleHistory />;
        case 'users':
          return <UserManagement />;
        case 'all-reports':
          return <ServiceReportManagement />;
        case 'spare-reports':
          return <SpareReports />;
        case 'approvals':
          return <ApprovalsManagement />;
        case 'warehouse':
          return <WarehouseManagement />;
        case 'analytics':
          return <Analytics />;
        case 'report-analysis':
          return <ReportAnalysis />;
        case 'location-tracking':
          return <LocationTracking />;
        case 'crm-dashboard':
          return <CRMDashboard />;
        case 'leads':
          return <LeadManagement />;
        case 'contacts':
          return <ContactManagement />;
        case 'opportunities':
          return <OpportunityTracking />;
        case 'activities':
          return <ActivityLogging />;
        case 'visits':
          return <VisitTracking />;
        case 'sales-analytics':
          return <SalesAnalytics />;
        default:
          return <Analytics />;
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
      <AdminLayout
        activeTab={activeTab}
        onTabChange={(tab: string) => setActiveTab(tab as TabType)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstallClick={handleInstallClick}
      >
        {renderTabContent()}
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminDashboard;
