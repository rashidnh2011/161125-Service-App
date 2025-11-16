import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';

interface Activity {
  id: number;
  lead_id?: number;
  contact_id?: number;
  opportunity_id?: number;
  assigned_to?: number;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo' | 'proposal' | 'contract' | 'other';
  subject: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  priority: 'low' | 'medium' | 'high';
  outcome?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  opportunity_name?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  created_at: string;
}

interface ActivityFormData {
  lead_id: number;
  contact_id: number;
  opportunity_id: number;
  assigned_to: number;
  activity_type: Activity['activity_type'];
  subject: string;
  description: string;
  due_date: string;
  completed: boolean;
  priority: Activity['priority'];
  outcome: string;
}

const ActivityLogging: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    lead_id: 0,
    contact_id: 0,
    opportunity_id: 0,
    assigned_to: 0,
    activity_type: 'note',
    subject: '',
    description: '',
    due_date: '',
    completed: false,
    priority: 'medium',
    outcome: ''
  });

  const [filters, setFilters] = useState({
    lead_id: 0,
    contact_id: 0,
    opportunity_id: 0,
    assigned_to: 0,
    activity_type: '',
    completed: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchActivities();
  }, [filters, pagination.page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (filters.lead_id) params.append('lead_id', filters.lead_id.toString());
      if (filters.contact_id) params.append('contact_id', filters.contact_id.toString());
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
      if (filters.activity_type) params.append('activity_type', filters.activity_type);
      if (filters.completed !== '') params.append('completed', filters.completed);

      const response = await api.request<{
        success: boolean;
        data: {
          activities: Activity[];
          pagination: typeof pagination;
        }
      }>(`/crm/activities.php?${params}`);
      
      if (response.success) {
        setActivities(response.data.activities || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // At least one of lead_id, contact_id, or opportunity_id should be provided
    if (!formData.lead_id && !formData.contact_id && !formData.opportunity_id) {
      alert('At least one of lead, contact, or opportunity must be selected');
      return;
    }

    try {
      if (editingActivity) {
        await api.request(`/crm/activities.php?id=${editingActivity.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await api.request('/crm/activities.php', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setShowForm(false);
      setEditingActivity(null);
      resetForm();
      fetchActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      lead_id: activity.lead_id || 0,
      contact_id: activity.contact_id || 0,
      opportunity_id: activity.opportunity_id || 0,
      assigned_to: activity.assigned_to || 0,
      activity_type: activity.activity_type,
      subject: activity.subject,
      description: activity.description || '',
      due_date: activity.due_date || '',
      completed: activity.completed,
      priority: activity.priority,
      outcome: activity.outcome || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await api.request(`/crm/activities.php?id=${id}`, {
          method: 'DELETE'
        });
        fetchActivities();
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const handleToggleComplete = async (activity: Activity) => {
    try {
      await api.request(`/crm/activities.php?id=${activity.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...activity,
          completed: !activity.completed
        })
      });
      fetchActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      lead_id: 0,
      contact_id: 0,
      opportunity_id: 0,
      assigned_to: 0,
      activity_type: 'note',
      subject: '',
      description: '',
      due_date: '',
      completed: false,
      priority: 'medium',
      outcome: ''
    });
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActivityTypeIcon = (type: Activity['activity_type']) => {
    const icons = {
      call: '📞',
      email: '✉️',
      meeting: '🤝',
      note: '📝',
      task: '✅',
      demo: '🎯',
      proposal: '📋',
      contract: '📄',
      other: '📌'
    };
    return icons[type] || '📌';
  };

  const getPriorityColor = (priority: Activity['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Logging</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Activity
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.activity_type}
            onChange={(e) => handleFilterChange('activity_type', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="task">Task</option>
            <option value="demo">Demo</option>
            <option value="proposal">Proposal</option>
            <option value="contract">Contract</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filters.completed}
            onChange={(e) => handleFilterChange('completed', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Completed</option>
            <option value="false">Pending</option>
          </select>
          <button
            onClick={fetchActivities}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Related To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{getActivityTypeIcon(activity.activity_type)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{activity.subject}</div>
                        {activity.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {activity.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {activity.lead_first_name && activity.lead_last_name
                        ? `Lead: ${activity.lead_first_name} ${activity.lead_last_name}`
                        : activity.contact_first_name && activity.contact_last_name
                        ? `Contact: ${activity.contact_first_name} ${activity.contact_last_name}`
                        : activity.opportunity_name
                        ? `Opportunity: ${activity.opportunity_name}`
                        : 'Not linked'
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      by {activity.created_by_name} • {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(activity.priority)}`}>
                      {activity.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.due_date
                      ? new Date(activity.due_date).toLocaleDateString()
                      : 'No due date'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleComplete(activity)}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {activity.completed ? 'Completed' : 'Pending'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activities.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by logging a new activity.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Activity Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h3>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Activity Type</label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, activity_type: e.target.value as Activity['activity_type'] }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                    <option value="task">Task</option>
                    <option value="demo">Demo</option>
                    <option value="proposal">Proposal</option>
                    <option value="contract">Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Activity['priority'] }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.completed.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, completed: e.target.value === 'true' }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="false">Pending</option>
                    <option value="true">Completed</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Outcome</label>
                  <textarea
                    rows={2}
                    value={formData.outcome}
                    onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Results, next steps, or notes about the activity"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingActivity(null);
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
                    {editingActivity ? 'Update' : 'Create'} Activity
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

export default ActivityLogging;
