import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Clock, Mail, Settings, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { CalibrationReminderSettings, ReminderSettingsForm } from '../../types';

interface ReminderSettingsProps {
  onBack?: () => void;
}

const ReminderSettingsComponent: React.FC<ReminderSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<CalibrationReminderSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for new settings
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSettings, setNewSettings] = useState<ReminderSettingsForm>({
    customer_name: '',
    reminder_days: '',
    is_enabled: true,
    email_recipients: []
  });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSettings, setEditSettings] = useState<ReminderSettingsForm>({
    customer_name: '',
    reminder_days: '',
    is_enabled: true,
    email_recipients: []
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getReminderSettings() as any;
      if (response.success && response.data?.settings) {
        setSettings(response.data.settings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSettings.customer_name.trim() || !newSettings.reminder_days.trim()) {
      setError('Customer name and reminder days are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await api.createReminderSettings({
        customer_name: newSettings.customer_name.trim(),
        reminder_days: newSettings.reminder_days.trim(),
        is_enabled: newSettings.is_enabled,
        email_recipients: newSettings.email_recipients
      }) as any;

      if (response.success) {
        setSuccess('Reminder settings created successfully');
        setNewSettings({
          customer_name: '',
          reminder_days: '',
          is_enabled: true,
          email_recipients: []
        });
        setShowNewForm(false);
        await loadSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to create settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create reminder settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (customer_name: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await api.updateReminderSettings(customer_name, {
        reminder_days: editSettings.reminder_days,
        is_enabled: editSettings.is_enabled,
        email_recipients: editSettings.email_recipients
      }) as any;

      if (response.success) {
        setSuccess('Reminder settings updated successfully');
        setEditingId(null);
        setEditSettings({
          customer_name: '',
          reminder_days: '',
          is_enabled: true,
          email_recipients: []
        });
        await loadSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update reminder settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSettings = async (customer_name: string) => {
    if (!confirm(`Are you sure you want to delete reminder settings for "${customer_name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.deleteReminderSettings(customer_name) as any;
      if (response.success) {
        setSuccess('Reminder settings deleted successfully');
        await loadSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to delete settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: CalibrationReminderSettings) => {
    setEditingId(setting.id);
    setEditSettings({
      customer_name: setting.customer_name,
      reminder_days: setting.reminder_days,
      is_enabled: setting.is_enabled === 1,
      email_recipients: Array.isArray(setting.email_recipients) ? setting.email_recipients : []
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSettings({
      customer_name: '',
      reminder_days: '',
      is_enabled: true,
      email_recipients: []
    });
  };

  const addEmailRecipient = (settings: ReminderSettingsForm, setSettings: (settings: ReminderSettingsForm) => void) => {
    const email = prompt('Enter email address:');
    if (email && email.includes('@')) {
      setSettings({
        ...settings,
        email_recipients: Array.isArray(settings.email_recipients) ? [...settings.email_recipients, email] : [email]
      });
    } else if (email) {
      alert('Please enter a valid email address');
    }
  };

  const removeEmailRecipient = (index: number, settings: ReminderSettingsForm, setSettings: (settings: ReminderSettingsForm) => void) => {
    if (Array.isArray(settings.email_recipients)) {
      setSettings({
        ...settings,
        email_recipients: settings.email_recipients.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reminder Settings</h2>
              <p className="text-sm text-gray-600">Configure automated email reminders for calibration certificates</p>
            </div>
          </div>

          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Settings
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* New Settings Form */}
        {showNewForm && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Reminder Settings</h3>
            <form onSubmit={handleCreateSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newSettings.customer_name}
                    onChange={(e) => setNewSettings({ ...newSettings, customer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name or 'ALL' for global settings"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Days *
                  </label>
                  <input
                    type="text"
                    value={newSettings.reminder_days}
                    onChange={(e) => setNewSettings({ ...newSettings, reminder_days: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 30,7,1 (days before due date)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated days (e.g., 30,7,1)</p>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSettings.is_enabled}
                    onChange={(e) => setNewSettings({ ...newSettings, is_enabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable reminders</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Recipients
                  </label>
                  <button
                    type="button"
                    onClick={() => addEmailRecipient(newSettings, setNewSettings)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Email
                  </button>
                </div>
                {Array.isArray(newSettings.email_recipients) && newSettings.email_recipients.length > 0 ? (
                  <div className="space-y-2">
                    {newSettings.email_recipients.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmailRecipient(index, newSettings, setNewSettings)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No additional recipients added</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Settings
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Settings List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Settings</h3>

          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Loading settings...</p>
            </div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No reminder settings configured</p>
              <p className="text-sm">Click "Add Settings" to create your first reminder configuration</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="border border-gray-200 rounded-lg p-4">
                  {editingId === setting.id ? (
                    // Edit Mode
                    <form onSubmit={(e) => { e.preventDefault(); handleUpdateSettings(setting.customer_name); }} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={editSettings.customer_name}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reminder Days
                          </label>
                          <input
                            type="text"
                            value={editSettings.reminder_days}
                            onChange={(e) => setEditSettings({ ...editSettings, reminder_days: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 30,7,1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editSettings.is_enabled}
                            onChange={(e) => setEditSettings({ ...editSettings, is_enabled: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Enable reminders</span>
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Email Recipients
                          </label>
                          <button
                            type="button"
                            onClick={() => addEmailRecipient(editSettings, setEditSettings)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Email
                          </button>
                        </div>
                        {Array.isArray(editSettings.email_recipients) && editSettings.email_recipients.length > 0 ? (
                          <div className="space-y-2">
                            {editSettings.email_recipients.map((email, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                                <span className="text-sm">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => removeEmailRecipient(index, editSettings, setEditSettings)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No additional recipients</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Update Settings
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {setting.customer_name === 'ALL' ? 'Global Settings' : setting.customer_name}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            setting.is_enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {setting.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(setting)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSettings(setting.customer_name)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title="Delete Settings"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">Reminder Days:</span>
                          <span>{setting.reminder_days} days before due date</span>
                        </div>

                        {Array.isArray(setting.email_recipients) && setting.email_recipients.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Recipients:</span>
                            <span>{setting.email_recipients.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        Created: {new Date(setting.created_at).toLocaleDateString()} |
                        Updated: {new Date(setting.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderSettingsComponent;
