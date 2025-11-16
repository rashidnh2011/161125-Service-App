import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ServiceReport, ApiResponse } from '../../types';
import { MapPin, Clock, AlertTriangle, Check, Filter, Download } from 'lucide-react';

interface LocationData {
  id: number;
  service_report_id: number;
  technician_id: number;
  technician_name: string;
  report_number: string;
  customer_name: string;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number;
  end_longitude: number;
  start_address: string;
  end_address: string;
  distance_from_customer: number;
  location_verified: boolean;
  gps_accuracy: number;
  service_duration: number;
  visit_date: string;
  time_validated: boolean;
  admin_verified: boolean;
  manipulation_flags: any;
}

const LocationTracking: React.FC = () => {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end_date: new Date().toISOString().split('T')[0],
    technician_id: '',
    verified_only: false,
    suspicious_only: false
  });

  useEffect(() => {
    loadLocationData();
  }, [filters]);

  const loadLocationData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getLocationTracking(filters);
      if (response.success) {
        setLocationData(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load location data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLocation = async (locationId: number) => {
    try {
      const response = await api.verifyLocation(locationId);
      if (response.success) {
        loadLocationData();
      }
    } catch (error) {
      console.error('Failed to verify location:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getLocationStatus = (item: LocationData) => {
    if (item.admin_verified) {
      return { color: 'text-green-600', bg: 'bg-green-100', label: 'Admin Verified', icon: Check };
    }
    if (item.location_verified && item.time_validated) {
      return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'GPS Verified', icon: MapPin };
    }
    if (item.manipulation_flags?.suspicious_duration) {
      return { color: 'text-red-600', bg: 'bg-red-100', label: 'Suspicious Time', icon: AlertTriangle };
    }
    return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Needs Review', icon: AlertTriangle };
  };

  const getSuspiciousFlags = (flags: any) => {
    const issues = [];
    if (flags?.suspicious_duration) issues.push('Unusual Duration');
    if (!flags?.gps_enabled) issues.push('No GPS');
    if (flags?.location_accuracy > 100) issues.push('Poor GPS Accuracy');
    return issues;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Location & Time Tracking</h3>
        <button
          onClick={loadLocationData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Filters</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={filters.technician_id}
              onChange={(e) => setFilters(prev => ({ ...prev, technician_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Technicians</option>
              {/* Add technician options here */}
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.verified_only}
                onChange={(e) => setFilters(prev => ({ ...prev, verified_only: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Verified Only</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.suspicious_only}
                onChange={(e) => setFilters(prev => ({ ...prev, suspicious_only: e.target.checked }))}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Suspicious Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Location Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GPS Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locationData.map((item) => {
                const status = getLocationStatus(item);
                const StatusIcon = status.icon;
                const suspiciousFlags = getSuspiciousFlags(item.manipulation_flags);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{item.report_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.customer_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(item.visit_date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.technician_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDuration(item.service_duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{status.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.gps_accuracy ? `±${Math.round(item.gps_accuracy)}m` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {suspiciousFlags.length > 0 ? (
                        <div className="space-y-1">
                          {suspiciousFlags.map((flag, index) => (
                            <div key={index} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              {flag}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-green-600">✓ Clean</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {!item.admin_verified && (
                          <button
                            onClick={() => handleVerifyLocation(item.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Verify Location"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${item.start_latitude},${item.start_longitude}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900"
                          title="View on Map"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {locationData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No location tracking data found for the selected criteria.</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">GPS Tracked</p>
              <p className="text-2xl font-bold text-gray-900">
                {locationData.filter(item => item.location_verified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admin Verified</p>
              <p className="text-2xl font-bold text-gray-900">
                {locationData.filter(item => item.admin_verified).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Suspicious</p>
              <p className="text-2xl font-bold text-gray-900">
                {locationData.filter(item => 
                  item.manipulation_flags?.suspicious_duration || 
                  !item.location_verified
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {locationData.length > 0 
                  ? formatDuration(locationData.reduce((sum, item) => sum + item.service_duration, 0) / locationData.length)
                  : '0h 0m'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationTracking;