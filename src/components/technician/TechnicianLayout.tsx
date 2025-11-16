import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, FileText, History, Package, Download } from 'lucide-react';
import CreateService from './CreateService';
import TechnicianDashboard from './TechnicianDashboard';
import ServiceReports from './ServiceReports';
import ScaleHistory from './ScaleHistory';
import MySpares from './MySpares';

interface TechnicianLayoutProps {
  children?: React.ReactNode; // Make children optional since we're handling content internally
  showHeader?: boolean;
  displayName?: string;
  onLogout?: () => void;
}

// Tab components (you can move these to separate files later)
const DashboardTab = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const dashboardCards = [
    {
      id: 'create',
      title: 'Create Service Report',
      description: 'Start a new service report for customer visit',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'reports',
      title: 'Service Reports',
      description: 'View and manage your service reports',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'history',
      title: 'Service History',
      description: 'Search service history by serial number',
      icon: History,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'spares',
      title: 'My Spares',
      description: 'View and manage your assigned spare parts',
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div>
      <div className="text-center mb-8 sm:mb-10 md:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          Welcome back!
        </h2>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
          Manage your service reports efficiently with our professional tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onTabChange(card.id)}
              className={`group relative overflow-hidden bg-gradient-to-r ${card.color} ${card.hoverColor} rounded-xl p-6 text-left transition-all duration-300 transform hover:scale-105`}
            >
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-12 h-12 ${card.iconBg} rounded-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-blue-100 text-sm">{card.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CreateReportTab = ({ onBack }: { onBack: () => void }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center mb-6">
      <button
        onClick={onBack}
        className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold text-gray-900">Create Service Report</h2>
    </div>
    <CreateService />
  </div>
);

const ServiceReportsTab = ({ onBack }: { onBack: () => void }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center mb-6">
      <button
        onClick={onBack}
        className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold text-gray-900">Service Reports</h2>
    </div>
    <ServiceReports />
  </div>
);

const ServiceHistoryTab = ({ onBack }: { onBack: () => void }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center mb-6">
      <button
        onClick={onBack}
        className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold text-gray-900">Service History</h2>
    </div>
    <ScaleHistory />
  </div>
);

const MySparesTab = ({ onBack }: { onBack: () => void }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center mb-6">
      <button
        onClick={onBack}
        className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold text-gray-900">My Spare Parts</h2>
    </div>
    <MySpares />
  </div>
);

const TechnicianLayout: React.FC<TechnicianLayoutProps> = ({
  children,
  showHeader = true,
  displayName = 'User',
  onLogout
}) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Restore tab state from localStorage on initial load
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('technicianActiveTab');
      return savedTab || 'dashboard';
    }
    return 'dashboard';
  });
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Default to desktop size for SSR
  });

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    // Set initial width after mount to ensure window is available
    setWindowWidth(window.innerWidth);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save tab state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('technicianActiveTab', activeTab);
    }
  }, [activeTab]);

  // Listen for navigation events from child components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleNavigateToCreateTab = () => {
      setActiveTab('create');
    };

    const handleNavigateToDashboard = () => {
      setActiveTab('dashboard');
    };

    const handleNavigateToTab = (event: any) => {
      const tab = event.detail?.tab;
      if (tab && ['dashboard', 'create', 'reports', 'history', 'spares'].includes(tab)) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('navigateToCreateTab', handleNavigateToCreateTab);
    window.addEventListener('navigateToDashboard', handleNavigateToDashboard);
    window.addEventListener('navigateToTab', handleNavigateToTab);

    return () => {
      window.removeEventListener('navigateToCreateTab', handleNavigateToCreateTab);
      window.removeEventListener('navigateToDashboard', handleNavigateToDashboard);
      window.removeEventListener('navigateToTab', handleNavigateToTab);
    };
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreateReportTab onBack={() => setActiveTab('dashboard')} />;
      case 'reports':
        return <ServiceReportsTab onBack={() => setActiveTab('dashboard')} />;
      case 'history':
        return <ServiceHistoryTab onBack={() => setActiveTab('dashboard')} />;
      case 'spares':
        return <MySparesTab onBack={() => setActiveTab('dashboard')} />;
      case 'dashboard':
      default:
        return (
          <TechnicianDashboard
            onTabChange={(tab: 'create' | 'reports' | 'history' | 'spares') => setActiveTab(tab)}
            showHeader={false}
          />
        );
    }
  };

  // Hide header for specific tabs on mobile/tablet (640px and below)
  // Only hide header for mobile screens and only for specific tabs
  const shouldHideHeader = showHeader && windowWidth <= 640 && (activeTab === 'create' || activeTab === 'reports' || activeTab === 'spares');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header - conditionally rendered */}
      {showHeader && !shouldHideHeader && (
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title Section - Left Side */}
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://arabscalecalibration.com/logo.png"
                    alt="BizOps360 Logo"
                    className="h-8 w-auto"
                  />
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-bold text-gray-900">BizOps360</h1>
                    <p className="text-xs text-gray-500">Complete Business Operations</p>
                  </div>
                </div>
              </div>

              {/* User Info and Logout Section - Right Side */}
              <div className="flex items-center space-x-4">
                {isInstallable && !isInstalled && (
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    title="Install PWA"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </button>
                )}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {user?.name || user?.username || displayName}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">Technician</p>
                  </div>
                  
                  {/* Mobile User Info */}
                  <div className="sm:hidden flex items-center space-x-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {user?.name || user?.username || displayName}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">Technician</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="sr-only">Logout</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile App Name (shown only on mobile) */}
            <div className="sm:hidden pb-2">
              <h1 className="text-lg font-bold text-gray-900">BizOps360</h1>
              <p className="text-xs text-gray-500">Complete Business Operations</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 max-w-7xl mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8 min-h-0">
        <div className="h-full">
          {children || renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default TechnicianLayout;