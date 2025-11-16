import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { isMobile } from '../../utils/device';

interface Visit {
  id: number;
  lead_id?: number;
  contact_id?: number;
  assigned_to: number;
  visit_type: 'lead' | 'non_lead';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  start_latitude?: number | string;
  start_longitude?: number | string;
  end_latitude?: number | string;
  end_longitude?: number | string;
  start_address?: string;
  end_address?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  current_duration_minutes?: number;
  purpose?: string;
  notes?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  prospect_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  prospect_company?: string;
  converted_to_lead?: boolean;
  converted_lead_id?: number;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at: string;
}

interface CurrentVisit {
  current_visit: Visit | null;
  in_progress: boolean;
}

interface VisitFormData {
  visit_type: 'lead' | 'non_lead';
  lead_id?: number;
  contact_id?: number;
  purpose: string;
  notes: string;
  prospect_name?: string;
  prospect_phone?: string;
  prospect_email?: string;
  prospect_company?: string;
}

const VisitTracking: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [currentVisit, setCurrentVisit] = useState<CurrentVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingVisit, setConvertingVisit] = useState<Visit | null>(null);

  const [formData, setFormData] = useState<VisitFormData>({
    visit_type: 'lead',
    purpose: '',
    notes: ''
  });

  const [convertFormData, setConvertFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    email: '',
    phone: '',
    mobile: '',
    notes: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchVisits();
    checkCurrentVisit();

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationError('');
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setLocationError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, [pagination.page]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await api.request(`/crm/visits.php?${params}`) as { visits: Visit[], pagination: typeof pagination };
      setVisits(response.visits || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentVisit = async () => {
    try {
      const response = await api.request('/crm/visit_tracking.php?action=current_visit') as CurrentVisit;
      setCurrentVisit(response);
    } catch (error) {
      console.error('Error checking current visit:', error);
    }
  };

  const handleStartVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userLocation) {
      alert('Location access is required to start a visit.');
      return;
    }

    try {
      const visitData = {
        ...formData,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: `Lat: ${userLocation.latitude}, Lng: ${userLocation.longitude}`
      };

      await api.request('/crm/visit_tracking.php?action=start_visit', {
        method: 'POST',
        body: JSON.stringify(visitData)
      });
      setShowForm(false);
      resetForm();
      checkCurrentVisit();
      fetchVisits();
    } catch (error: any) {
      console.error('Error starting visit:', error);
      alert(error.response?.data?.error || 'Failed to start visit');
    }
  };

  const handleEndVisit = async () => {
    if (!currentVisit?.current_visit) return;

    try {
      const endData = {
        notes: formData.notes,
        end_latitude: userLocation?.latitude,
        end_longitude: userLocation?.longitude,
        end_address: userLocation ? `Lat: ${userLocation.latitude}, Lng: ${userLocation.longitude}` : ''
      };

      await api.request('/crm/visit_tracking.php?action=end_visit', {
        method: 'POST',
        body: JSON.stringify(endData)
      });
      setCurrentVisit({ current_visit: null, in_progress: false });
      setShowForm(false);
      resetForm();
      fetchVisits();
    } catch (error: any) {
      console.error('Error ending visit:', error);
      alert(error.response?.data?.error || 'Failed to end visit');
    }
  };

  const handleConvertToLead = (visit: Visit) => {
    setConvertingVisit(visit);
    setConvertFormData({
      first_name: visit.prospect_name?.split(' ')[0] || '',
      last_name: visit.prospect_name?.split(' ').slice(1).join(' ') || '',
      company: visit.prospect_company || '',
      email: visit.prospect_email || '',
      phone: visit.prospect_phone || '',
      mobile: visit.prospect_phone || '',
      notes: `Converted from visit on ${new Date(visit.created_at).toLocaleDateString()}`
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingVisit) return;

    try {
      await api.request('/crm/visit_tracking.php?action=convert_non_lead', {
        method: 'POST',
        body: JSON.stringify({
          visit_id: convertingVisit.id,
          ...convertFormData
        })
      });

      setShowConvertModal(false);
      setConvertingVisit(null);
      resetConvertForm();
      fetchVisits();
    } catch (error: any) {
      console.error('Error converting visit:', error);
      alert(error.response?.data?.error || 'Failed to convert visit to lead');
    }
  };

  const resetForm = () => {
    setFormData({
      visit_type: 'lead',
      purpose: '',
      notes: ''
    });
  };

  const resetConvertForm = () => {
    setConvertFormData({
      first_name: '',
      last_name: '',
      company: '',
      email: '',
      phone: '',
      mobile: '',
      notes: ''
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: Visit['status']) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getVisitTypeColor = (visitType: Visit['visit_type']) => {
    const colors = {
      lead: 'bg-green-100 text-green-800',
      non_lead: 'bg-yellow-100 text-yellow-800'
    };
    return colors[visitType] || 'bg-gray-100 text-gray-800';
  };

  // Desktop version
  if (!isMobile()) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Visit Tracking</h1>
          <div className="flex space-x-3">
            {currentVisit?.in_progress && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center">
                <div className="animate-pulse w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Visit in Progress - {formatDuration(currentVisit.current_visit?.current_duration_minutes)}
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
              disabled={currentVisit?.in_progress}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {currentVisit?.in_progress ? 'Visit in Progress' : 'Start Visit'}
            </button>
          </div>
        </div>

        {/* Current Visit Card */}
        {currentVisit?.in_progress && currentVisit.current_visit && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Current Visit in Progress
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Started at {new Date(currentVisit.current_visit?.start_time || '').toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  Duration: {formatDuration(currentVisit.current_visit?.current_duration_minutes)}
                </p>
                {currentVisit.current_visit?.purpose && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Purpose:</strong> {currentVisit.current_visit.purpose}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setFormData({
                      visit_type: currentVisit.current_visit?.visit_type || 'lead',
                      purpose: currentVisit.current_visit?.purpose || '',
                      notes: currentVisit.current_visit?.notes || ''
                    });
                    setShowForm(true);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm"
                >
                  Update Notes
                </button>
                <button
                  onClick={handleEndVisit}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  End Visit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Status */}
        {locationError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {locationError}
          </div>
        )}

        {/* Visits Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {visit.visit_type === 'lead'
                            ? `${visit.lead_first_name} ${visit.lead_last_name}`
                            : visit.prospect_name || 'Unknown'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(visit.created_at).toLocaleDateString()}
                        </div>
                        {visit.purpose && (
                          <div className="text-sm text-gray-500">{visit.purpose}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVisitTypeColor(visit.visit_type)}`}>
                        {visit.visit_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(visit.duration_minutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {visit.start_latitude && visit.start_longitude ? (
                        <div>
                          <div>Lat: {Number(visit.start_latitude).toFixed(4)}</div>
                          <div>Lng: {Number(visit.start_longitude).toFixed(4)}</div>
                        </div>
                      ) : (
                        'No location data'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {visit.visit_type === 'non_lead' && !visit.converted_to_lead && (
                        <button
                          onClick={() => handleConvertToLead(visit)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Convert to Lead
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingVisit(visit);
                          setShowForm(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visits.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No visits found</h3>
              <p className="mt-1 text-sm text-gray-500">Start tracking your visits to see them here.</p>
            </div>
          )}
        </div>

        {/* Start Visit Modal */}
        {showForm && !currentVisit?.in_progress && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingVisit ? 'Visit Details' : 'Start New Visit'}
                </h3>

                <form onSubmit={handleStartVisit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Visit Type</label>
                    <select
                      value={formData.visit_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value as 'lead' | 'non_lead' }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="lead">Lead Visit</option>
                      <option value="non_lead">Non-Lead Visit</option>
                    </select>
                  </div>

                  {formData.visit_type === 'non_lead' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Prospect Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.prospect_name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, prospect_name: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={formData.prospect_phone || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, prospect_phone: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={formData.prospect_email || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, prospect_email: e.target.value }))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company</label>
                        <input
                          type="text"
                          value={formData.prospect_company || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, prospect_company: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of visit purpose"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Notes</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any initial notes about the visit"
                    />
                  </div>

                  {userLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Current Location:</strong><br />
                        Latitude: {userLocation.latitude.toFixed(6)}<br />
                        Longitude: {userLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingVisit(null);
                        resetForm();
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      Start Visit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Convert to Lead Modal */}
        {showConvertModal && convertingVisit && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Convert Visit to Lead
                </h3>

                <form onSubmit={handleConvertSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                      type="text"
                      required
                      value={convertFormData.first_name}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={convertFormData.last_name}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <input
                      type="text"
                      value={convertFormData.company}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={convertFormData.email}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={convertFormData.phone}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                      type="tel"
                      value={convertFormData.mobile}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      rows={3}
                      value={convertFormData.notes}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConvertModal(false);
                        setConvertingVisit(null);
                        resetConvertForm();
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    >
                      Convert to Lead
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile version
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visit Tracking</h1>
            <p className="text-sm text-gray-600">Track your customer visits</p>
          </div>
          <div className="flex items-center space-x-3">
            {currentVisit?.in_progress && (
              <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs flex items-center">
                <div className="animate-pulse w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></div>
                {formatDuration(currentVisit.current_visit?.current_duration_minutes)}
              </div>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              disabled={currentVisit?.in_progress}
            >
              {currentVisit?.in_progress ? 'In Progress' : 'Start Visit'}
            </button>
          </div>
        </div>
      </header>

      {/* Current Visit Card - Mobile */}
      {currentVisit?.in_progress && currentVisit.current_visit && (
        <div className="bg-white rounded-lg shadow-sm p-4 m-4 border-l-4 border-green-500">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Visit in Progress</h3>
              <p className="text-sm text-gray-600">
                {formatDuration(currentVisit.current_visit?.current_duration_minutes)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setFormData({
                    visit_type: currentVisit.current_visit?.visit_type || 'lead',
                    purpose: currentVisit.current_visit?.purpose || '',
                    notes: currentVisit.current_visit?.notes || ''
                  });
                  setShowForm(true);
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
              >
                Update
              </button>
              <button
                onClick={handleEndVisit}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                End
              </button>
            </div>
          </div>
          {currentVisit.current_visit?.purpose && (
            <p className="text-sm text-gray-700">
              <strong>Purpose:</strong> {currentVisit.current_visit.purpose}
            </p>
          )}
        </div>
      )}

      {/* Location Status - Mobile */}
      {locationError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 rounded">
          {locationError}
        </div>
      )}

      {/* Visits List - Mobile Cards */}
      <div className="p-4 space-y-3">
        {visits.map((visit) => (
          <div key={visit.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getVisitTypeColor(visit.visit_type)}`}>
                    {visit.visit_type.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                    {visit.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">
                  {visit.visit_type === 'lead'
                    ? `${visit.lead_first_name} ${visit.lead_last_name}`
                    : visit.prospect_name || 'Unknown'
                  }
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(visit.created_at).toLocaleDateString()}
                </p>
                {visit.purpose && (
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Purpose:</strong> {visit.purpose}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Duration: {formatDuration(visit.duration_minutes)}
              </div>
              <div className="flex space-x-2">
                {visit.visit_type === 'non_lead' && !visit.converted_to_lead && (
                  <button
                    onClick={() => handleConvertToLead(visit)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Convert
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingVisit(visit);
                    setShowForm(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}

        {visits.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No visits found</h3>
            <p className="mt-1 text-sm text-gray-500">Start tracking your visits to see them here.</p>
          </div>
        )}
      </div>

      {/* Mobile Modals - Bottom Sheet Style */}
      {showForm && !currentVisit?.in_progress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowForm(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingVisit ? 'Visit Details' : 'Start New Visit'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingVisit(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleStartVisit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
                  <select
                    value={formData.visit_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value as 'lead' | 'non_lead' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="lead">Lead Visit</option>
                    <option value="non_lead">Non-Lead Visit</option>
                  </select>
                </div>

                {formData.visit_type === 'non_lead' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prospect Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.prospect_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, prospect_name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.prospect_phone || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, prospect_phone: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.prospect_email || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, prospect_email: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.prospect_company || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, prospect_company: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of visit purpose"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any initial notes about the visit"
                  />
                </div>

                {userLocation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Current Location:</strong><br />
                      Lat: {userLocation.latitude.toFixed(6)}<br />
                      Lng: {userLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingVisit(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
                  >
                    Start Visit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Convert Modal */}
      {showConvertModal && convertingVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowConvertModal(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Convert to Lead</h3>
                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    setConvertingVisit(null);
                    resetConvertForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={convertFormData.first_name}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={convertFormData.last_name}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={convertFormData.company}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={convertFormData.email}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={convertFormData.phone}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={convertFormData.mobile}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={convertFormData.notes}
                    onChange={(e) => setConvertFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false);
                      setConvertingVisit(null);
                      resetConvertForm();
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
                  >
                    Convert
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitTracking;
