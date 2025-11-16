import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Plus, Users, FileText, List, Search, Shield, Settings } from 'lucide-react';

// Import calibration components
import CreateJobRequest from './CreateJobRequest';
import JobRequestsList from './JobRequestsList';
import CustomerManagement from './CustomerManagement';
import CertificateForm from './CertificateForm';
import CertificateList from './CertificateList';
import ReminderSettings from './ReminderSettings';
import ReminderLogs from './ReminderLogs';
import ReminderDashboard from './ReminderDashboard';

interface CalibrationLayoutProps {
  children?: React.ReactNode;
  showHeader?: boolean;
  displayName?: string;
  onLogout?: () => void;
}

// Dashboard Tab Component
const DashboardTab = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const dashboardCards = [
    {
      id: 'create',
      title: 'Create Job Request',
      description: 'Create new calibration job requests with auto-generated numbers',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'certificates',
      title: 'Certificate Management',
      description: 'Create and manage calibration certificates',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      id: 'search-certificates',
      title: 'Search Certificates',
      description: 'Search and edit existing calibration certificates',
      icon: Search,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'jobs',
      title: 'Job Requests',
      description: 'View and manage calibration job requests',
      icon: List,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'hover:from-orange-600 hover:to-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'customers',
      title: 'Customer Management',
      description: 'Manage calibration customers and their information',
      icon: Users,
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    {
      id: 'reminder-dashboard',
      title: 'Reminder System',
      description: 'Monitor and manage automated calibration reminders',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'reminder-settings',
      title: 'Reminder Settings',
      description: 'Configure reminder timing and recipients',
      icon: Settings,
      color: 'from-indigo-500 to-indigo-600',
      hoverColor: 'hover:from-indigo-600 hover:to-indigo-700',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    {
      id: 'reports',
      title: 'Recent Jobs',
      description: 'View recently created calibration jobs',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:from-red-600 hover:to-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    }
  ];

  return (
    <div>
      <div className="text-center mb-8 sm:mb-10 md:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          Calibration Management System
        </h2>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
          Complete calibration workflow management including job requests, certificates, and customer management.
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

// Individual Tab Components
const CreateJobTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Create Job Request</h2>
    </div>
    <CreateJobRequest />
  </div>
);

const JobRequestsTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Job Requests</h2>
    </div>
    <JobRequestsList />
  </div>
);

const CustomerManagementTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
    </div>
    <CustomerManagement />
  </div>
);

const RecentJobsTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Recent Jobs</h2>
    </div>
    <JobRequestsList showRecentOnly={true} />
  </div>
);

const CertificatesTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Certificate Management</h2>
    </div>
    <CertificateForm />
  </div>
);

const SearchCertificatesTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Search Certificates</h2>
    </div>
    <CertificateList />
  </div>
);

const ReminderDashboardTab = ({ onBack, onTabChange }: { onBack: () => void; onTabChange: (tab: string) => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Reminder System</h2>
    </div>
    <ReminderDashboard onTabChange={onTabChange} />
  </div>
);

const ReminderSettingsTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Reminder Settings</h2>
    </div>
    <ReminderSettings onBack={() => setActiveTab('dashboard')} />
  </div>
);

const ReminderLogsTab = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-2xl font-bold text-gray-900">Reminder Logs</h2>
    </div>
    <ReminderLogs onBack={() => setActiveTab('dashboard')} />
  </div>
);

const CalibrationLayout: React.FC<CalibrationLayoutProps> = ({
  children,
  showHeader = true,
  displayName = 'User',
  onLogout
}) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
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
        return <CreateJobTab onBack={() => setActiveTab('dashboard')} />;
      case 'certificates':
        return <CertificatesTab onBack={() => setActiveTab('dashboard')} />;
      case 'reminder-dashboard':
        return <ReminderDashboardTab onBack={() => setActiveTab('dashboard')} onTabChange={(tab: string) => setActiveTab(tab)} />;
      case 'reminder-settings':
        return <ReminderSettingsTab onBack={() => setActiveTab('dashboard')} />;
      case 'reminder-logs':
        return <ReminderLogsTab onBack={() => setActiveTab('dashboard')} />;
      case 'jobs':
        return <JobRequestsTab onBack={() => setActiveTab('dashboard')} />;
      case 'customers':
        return <CustomerManagementTab onBack={() => setActiveTab('dashboard')} />;
      case 'reports':
        return <RecentJobsTab onBack={() => setActiveTab('dashboard')} />;
      case 'dashboard':
      default:
        return <DashboardTab onTabChange={(tab: string) => setActiveTab(tab)} />;
    }
  };

  // Hide header for specific tabs on mobile/tablet (640px and below)
  const shouldHideHeader = showHeader && windowWidth <= 640 && (activeTab === 'create' || activeTab === 'jobs' || activeTab === 'customers');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      {showHeader && !shouldHideHeader && (
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title Section */}
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://arabscalecalibration.com/logo.png"
                    alt="BizOps360 Logo"
                    className="h-8 w-auto"
                  />
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-bold text-gray-900">Calibration System</h1>
                    <p className="text-xs text-gray-500">Complete Management Solution</p>
                  </div>
                </div>
              </div>

              {/* User Info and Logout Section */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {user?.name || user?.username || displayName}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">Calibration</p>
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
                      <p className="text-xs text-blue-600 font-medium">Calibration</p>
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

            {/* Mobile App Name */}
            <div className="sm:hidden pb-2">
              <h1 className="text-lg font-bold text-gray-900">Calibration System</h1>
              <p className="text-xs text-gray-500">Complete Management Solution</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6 lg:px-8 min-h-0">
        <div className="h-full">
          {children || renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default CalibrationLayout;
