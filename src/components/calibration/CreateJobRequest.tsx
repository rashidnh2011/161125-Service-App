import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Save } from 'lucide-react';
import { api } from '../../utils/api';
import { CalibrationCustomer, RequestNumberGenerationResponse } from '../../types';

interface JobRequestFormData {
  job_type: 'ACCREDITED' | 'NON_ACCREDITED';
  request_date: string;
  customer_id: number;
  remarks: string;
  request_number: string;
}

const CreateJobRequest: React.FC = () => {
  const [customers, setCustomers] = useState<CalibrationCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobRequestFormData>({
    job_type: 'ACCREDITED',
    request_date: new Date().toISOString().split('T')[0],
    customer_id: 0,
    remarks: '',
    request_number: ''
  });

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.getCalibrationCustomers({ limit: 100 }) as any;
      if (response.success && response.data) {
        setCustomers(response.data.customers);
      } else {
        setError('Failed to load customers');
      }
    } catch (err) {
      setError('Failed to load customers');
      console.error('Error loading customers:', err);
    }
  };

  const generateRequestNumber = async () => {
    if (!formData.request_date) {
      setError('Please select a request date first');
      return;
    }

    try {
      setGeneratingNumber(true);
      setError(null);

      const response = await api.generateRequestNumber({
        job_type: formData.job_type,
        request_date: formData.request_date
      }) as RequestNumberGenerationResponse;

      if (response.success && response.data) {
        setFormData(prev => ({
          ...prev,
          request_number: response.data?.request_number || ''
        }));
        setSuccess(`Request number generated: ${response.data?.request_number || ''}`);
      } else {
        setError(response.error || 'Failed to generate request number');
      }
    } catch (err) {
      setError('Failed to generate request number');
      console.error('Error generating request number:', err);
    } finally {
      setGeneratingNumber(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.request_number) {
      setError('Please generate a request number first');
      return;
    }

    if (!formData.customer_id) {
      setError('Please select a customer');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.createCalibrationJob({
        request_number: formData.request_number,
        job_type: formData.job_type,
        request_date: formData.request_date,
        customer_id: formData.customer_id,
        remarks: formData.remarks
      }) as any;

      if (response.success) {
        setSuccess('Job request created successfully!');
        // Reset form after successful creation
        setTimeout(() => {
          setFormData({
            job_type: 'ACCREDITED',
            request_date: new Date().toISOString().split('T')[0],
            customer_id: 0,
            remarks: '',
            request_number: ''
          });
          setSuccess(null);
        }, 2000);
      } else {
        setError(response.error || 'Failed to create job request');
      }
    } catch (err) {
      setError('Failed to create job request');
      console.error('Error creating job request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof JobRequestFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear request number when date or job type changes
    if (field === 'request_date' || field === 'job_type') {
      setFormData(prev => ({
        ...prev,
        request_number: ''
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Calibration Job Request</h3>
          <p className="text-sm text-gray-600">
            Fill in the details below to create a new calibration job request. The request number will be auto-generated based on your selection.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                formData.job_type === 'ACCREDITED'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="job_type"
                  value="ACCREDITED"
                  checked={formData.job_type === 'ACCREDITED'}
                  onChange={(e) => handleInputChange('job_type', e.target.value as 'ACCREDITED')}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    formData.job_type === 'ACCREDITED'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.job_type === 'ACCREDITED' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Accredited</div>
                    <div className="text-sm text-gray-500">Format: ASC25/020501</div>
                  </div>
                </div>
              </label>

              <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                formData.job_type === 'NON_ACCREDITED'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="job_type"
                  value="NON_ACCREDITED"
                  checked={formData.job_type === 'NON_ACCREDITED'}
                  onChange={(e) => handleInputChange('job_type', e.target.value as 'NON_ACCREDITED')}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    formData.job_type === 'NON_ACCREDITED'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {formData.job_type === 'NON_ACCREDITED' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Non-Accredited</div>
                    <div className="text-sm text-gray-500">Format: ASC25/A020501</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Request Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.request_date}
                onChange={(e) => handleInputChange('request_date', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              The sequence number will be based on this date
            </p>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleInputChange('customer_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </option>
              ))}
            </select>
          </div>

          {/* Request Number Generation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Number *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.request_number}
                onChange={(e) => handleInputChange('request_number', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Click generate to create request number"
                required
                readOnly
              />
              <button
                type="button"
                onClick={generateRequestNumber}
                disabled={generatingNumber}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingNumber ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Generate'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated based on job type and date
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or remarks"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !formData.request_number}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Job Request
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Request Number Format</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Accredited:</strong> ASC25/020501 (ASC + Year + MMDD + Sequence)</p>
            <p><strong>Non-Accredited:</strong> ASC25/A020501 (ASC + Year + /A + MMDD + Sequence)</p>
            <p><strong>Sequence:</strong> Starts from 01 each day and increments automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateJobRequest;
