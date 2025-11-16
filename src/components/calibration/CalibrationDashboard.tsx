import React, { useState } from 'react';
import { Plus, Search, Users, FileText, Calendar, Settings } from 'lucide-react';
import JobRequestsList from './JobRequestsList';
import CertificateForm from './CertificateForm';
import CertificateList from './CertificateList';

type TabType = 'jobs' | 'certificates' | 'search';

const CalibrationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');

  const tabs = [
    {
      id: 'jobs' as TabType,
      label: 'Job Requests',
      icon: Calendar,
      description: 'Create and manage calibration job requests'
    },
    {
      id: 'certificates' as TabType,
      label: 'Certificates',
      icon: FileText,
      description: 'Create and manage calibration certificates'
    },
    {
      id: 'search' as TabType,
      label: 'Search Certificates',
      icon: Search,
      description: 'Search and edit existing certificates'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Calibration Management</h2>
          <p className="text-gray-600">
            Manage calibration job requests, create certificates, and track calibration activities
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'jobs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Job Requests</h3>
                  <p className="text-sm text-gray-600">Create and manage calibration job requests</p>
                </div>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Job Request
                </button>
              </div>
              <JobRequestsList />
            </div>
          )}

          {activeTab === 'certificates' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Certificate Management</h3>
                  <p className="text-sm text-gray-600">Create new certificates or manage existing ones</p>
                </div>
                <button
                  onClick={() => setActiveTab('search')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Search className="w-4 h-4" />
                  Search Certificates
                </button>
              </div>
              <CertificateForm />
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Certificate Search</h3>
                  <p className="text-sm text-gray-600">Search and edit existing calibration certificates</p>
                </div>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Certificate
                </button>
              </div>
              <CertificateList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalibrationDashboard;
