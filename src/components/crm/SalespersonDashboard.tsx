import React, { useEffect, useState } from 'react';
import { isMobile } from '../../utils/device';
import SalespersonLayout from './SalespersonLayout';
import SalespersonMobileDashboard from './SalespersonMobileDashboard';
import VisitTracking from './VisitTracking';
import LeadManagement from './LeadManagement';
import ContactManagement from './ContactManagement';
import OpportunityTracking from './OpportunityTracking';
import ActivityLogging from './ActivityLogging';
import QuotationManagement from './QuotationManagement';
import InvoiceManagement from './InvoiceManagement';

type TabType = 'crm-dashboard' | 'leads' | 'contacts' | 'opportunities' | 'quotations' | 'invoices' | 'activities' | 'visits';

const SalespersonDashboard: React.FC = () => {
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect mobile device and redirect to mobile dashboard
  useEffect(() => {
    if (isMobile()) {
      console.log('Mobile device detected, redirecting to mobile dashboard');
      // The mobile dashboard will be rendered instead of the desktop version
    }
  }, []);

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

  // If mobile device, render mobile dashboard
  if (isMobile()) {
    return <SalespersonMobileDashboard />;
  }

  // Desktop/Tablet layout
  const [activeTab, setActiveTab] = React.useState<TabType>('crm-dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'crm-dashboard':
        return (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                CRM Dashboard
              </h3>
              <p className="text-gray-500">
                Welcome to your CRM system. Use the sidebar to navigate between different features.
              </p>
            </div>
          </div>
        );

      case 'visits':
        return <VisitTracking />;

      case 'leads':
        return <LeadManagement />;

      case 'contacts':
        return <ContactManagement />;

      case 'opportunities':
        return <OpportunityTracking />;

      case 'quotations':
        return <QuotationManagement />;

      case 'invoices':
        return <InvoiceManagement />;

      case 'activities':
        return <ActivityLogging />;

      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a tab from the sidebar to view content.</p>
          </div>
        );
    }
  };

  return (
    <SalespersonLayout
      activeTab={activeTab}
      onTabChange={(tab: string) => setActiveTab(tab as TabType)}
      isInstallable={isInstallable}
      isInstalled={isInstalled}
      onInstallClick={handleInstallClick}
    >
      {renderTabContent()}
    </SalespersonLayout>
  );
};

export default SalespersonDashboard;
