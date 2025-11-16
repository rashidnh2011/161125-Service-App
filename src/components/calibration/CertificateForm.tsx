import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Search, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';
import { CalibrationCertificateForm, CalibrationCertificate } from '../../types';

interface CertificateFormProps {
  onSuccess?: () => void;
  editCertificate?: CalibrationCertificate;
}

const CertificateForm: React.FC<CertificateFormProps> = ({ onSuccess, editCertificate }) => {
  const [formData, setFormData] = useState<CalibrationCertificateForm>({
    request_number: '',
    certificate_number: '',
    customer_name: '',
    equipment_name: '',
    make: '',
    model_no: '',
    capacity: '',
    serial_no: '',
    asset_no: '',
    date_of_due: '',
    location: '',
    previous_request_number: ''
  });

  const [certificates, setCertificates] = useState<CalibrationCertificateForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Eligible request numbers for dropdown
  const [eligibleRequests, setEligibleRequests] = useState<{request_number: string; customer_name: string; job_type: string; request_date: string}[]>([]);
  const [selectedRequestNumber, setSelectedRequestNumber] = useState<string>('');
  const [loadingEligibleRequests, setLoadingEligibleRequests] = useState(false);

  // Loading states
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (editCertificate) {
      // Populate form for editing
      setFormData({
        request_number: editCertificate.request_number,
        certificate_number: editCertificate.certificate_number,
        customer_name: editCertificate.customer_name,
        equipment_name: editCertificate.equipment_name,
        make: editCertificate.make,
        model_no: editCertificate.model_no,
        capacity: editCertificate.capacity,
        serial_no: editCertificate.serial_no,
        asset_no: editCertificate.asset_no,
        date_of_due: editCertificate.date_of_due,
        location: editCertificate.location,
        previous_request_number: editCertificate.previous_request_number || ''
      });
      setCertificates([]); // Don't load old data when editing
    }
  }, [editCertificate]);

  const handleRequestNumberChange = async (requestNumber: string) => {
    setFormData(prev => ({ ...prev, request_number: requestNumber }));

    // Auto-load customer details and previous certificates
    if (requestNumber.trim()) {
      await loadCustomerDetails(requestNumber.trim());
    } else {
      // Clear data if request number is empty
      clearPreviousData();
    }
  };

  const loadCustomerDetails = async (requestNumber: string) => {
    try {
      setLoadingCustomer(true);
      setError(null);
      setDataLoaded(false);

      const customerResponse = await api.getCustomerByRequestNumber(requestNumber) as any;
      if (customerResponse.success && customerResponse.data) {
        setFormData(prev => ({
          ...prev,
          customer_name: customerResponse.data.customer_name,
          previous_request_number: '' // Will be set when loading old certificates
        }));

        // Load previous certificates
        await loadPreviousCertificates(requestNumber);
        setDataLoaded(true);

        // Load eligible request numbers
        const loadEligibleRequests = async () => {
          if (!formData.customer_name) return;

          try {
            setLoadingEligibleRequests(true);
            const response = await api.getEligibleRequestNumbers(formData.customer_name) as any;
            if (response.success && response.data?.eligible_requests) {
              setEligibleRequests(response.data.eligible_requests);
            }
          } catch (err: any) {
            console.error('Failed to load eligible requests:', err);
          } finally {
            setLoadingEligibleRequests(false);
          }
        };
        await loadEligibleRequests();
      } else {
        setError(customerResponse.error || 'Customer not found for this request number');
        setCertificates([]);
        setDataLoaded(false);
      }
    } catch (err: any) {
      console.error('Error loading customer details:', err);
      setError(err.message || 'Failed to load customer details');
      setCertificates([]);
      setDataLoaded(false);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const loadPreviousCertificates = async (requestNumber: string) => {
    try {
      setLoadingCertificates(true);
      const response = await api.getCertificatesByRequestNumber(requestNumber) as any;
      if (response.success && response.data?.certificates?.length > 0) {
        // Convert to form format and regenerate certificate numbers
        const oldCertificates = response.data.certificates.map((cert: CalibrationCertificate, index: number) => ({
          ...cert,
          certificate_number: `${requestNumber}-${String(index + 1).padStart(2, '0')}`,
          previous_request_number: cert.request_number
        }));

        setCertificates(oldCertificates);
        setFormData(prev => ({ ...prev, previous_request_number: requestNumber }));
      } else {
        // No previous certificates, reset
        setCertificates([]);
      }
    } catch (err: any) {
      console.error('Error loading previous certificates:', err);
      setError('Failed to load previous certificates');
    } finally {
      setLoadingCertificates(false);
    }
  };

  const loadEligibleRequests = async () => {
    if (!formData.customer_name) return;

    try {
      setLoadingEligibleRequests(true);
      const response = await api.getEligibleRequestNumbers(formData.customer_name) as any;
      if (response.success && response.data?.eligible_requests) {
        setEligibleRequests(response.data.eligible_requests);
      }
    } catch (err: any) {
      console.error('Failed to load eligible requests:', err);
    } finally {
      setLoadingEligibleRequests(false);
    }
  };

  // Load eligible requests when customer is loaded
  useEffect(() => {
    if (formData.customer_name && dataLoaded) {
      loadEligibleRequests();
    }
  }, [formData.customer_name, dataLoaded]);

  const clearPreviousData = () => {
    setCertificates([]);
    setFormData(prev => ({
      ...prev,
      customer_name: '',
      previous_request_number: ''
    }));
    setDataLoaded(false);
    setError(null);
  };

  const handleLoadPreviousData = async () => {
    if (!formData.request_number) {
      setError('Please enter a request number first');
      return;
    }

    await loadCustomerDetails(formData.request_number);
  };

  const addNewCertificate = () => {
    const nextIndex = certificates.length + 1;
    // Use selected request number if available, otherwise use the loaded one
    const requestNumber = selectedRequestNumber || formData.request_number;
    const certNumber = `${requestNumber}-${String(nextIndex).padStart(2, '0')}`;

    const newCertificate: CalibrationCertificateForm = {
      ...formData,
      request_number: requestNumber,
      certificate_number: certNumber
    };

    setCertificates(prev => [...prev, newCertificate]);
  };

  const updateCertificate = (index: number, field: keyof CalibrationCertificateForm, value: string) => {
    setCertificates(prev => prev.map((cert, i) =>
      i === index ? { ...cert, [field]: value } : cert
    ));
  };

  const removeCertificate = (index: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use selected request number if available, otherwise use the loaded one
    const targetRequestNumber = selectedRequestNumber || formData.request_number;

    if (!targetRequestNumber) {
      setError('Request number is required');
      return;
    }

    if (certificates.length === 0) {
      setError('At least one certificate is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Update all certificates to use the selected request number
      const certificatesToSave = certificates.map((cert, index) => ({
        ...cert,
        request_number: targetRequestNumber,
        certificate_number: `${targetRequestNumber}-${String(index + 1).padStart(2, '0')}`,
        customer_name: formData.customer_name
      }));

      // Save all certificates
      const savePromises = certificatesToSave.map(certificate =>
        api.createCertificate(certificate)
      );

      await Promise.all(savePromises);

      setSuccess(`Certificates saved successfully with request number: ${targetRequestNumber}!`);
      setTimeout(() => {
        setSuccess(null);
        if (onSuccess) onSuccess();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to save certificates');
      console.error('Error saving certificates:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {editCertificate ? 'Edit Certificate' : 'Create Calibration Certificates'}
          </h3>
          <p className="text-sm text-gray-600">
            Enter request number to auto-load customer details and previous certificates, or add new certificates manually.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Number Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Number *
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={formData.request_number}
                  onChange={(e) => handleRequestNumberChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter request number..."
                  required
                />
                {loadingCustomer && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* Manual Load Button and Loading Indicators */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLoadPreviousData()}
                  disabled={loadingCustomer || loadingCertificates || !formData.request_number}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingCustomer || loadingCertificates ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Load Previous Data
                    </>
                  )}
                </button>

                {dataLoaded && certificates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPreviousData}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Clear Data
                  </button>
                )}

                {dataLoaded && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Previous data loaded successfully ({certificates.filter(c => c.previous_request_number).length} certificates)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Eligible Request Numbers Dropdown */}
          {dataLoaded && eligibleRequests.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Select Target Request Number</h4>
              <div className="space-y-3">
                <p className="text-sm text-blue-800">
                  <strong>Enhanced Workflow:</strong> Load old data from previous requests → Edit/add certificates →
                  Select eligible request number from dropdown → Save certificates under selected request number
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Request Number for New Certificates *
                  </label>
                  <select
                    value={selectedRequestNumber}
                    onChange={(e) => setSelectedRequestNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a request number...</option>
                    {eligibleRequests.map((request) => (
                      <option key={request.request_number} value={request.request_number}>
                        {request.request_number} - {request.customer_name} ({request.job_type})
                      </option>
                    ))}
                  </select>
                  {loadingEligibleRequests && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading eligible request numbers...
                    </div>
                  )}
                </div>

                {selectedRequestNumber && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>
                        <strong>Selected:</strong> {selectedRequestNumber} - Certificates will be generated under this request number
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Certificates List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">
                Certificates ({certificates.length})
              </h4>
              <button
                type="button"
                onClick={addNewCertificate}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Certificate
              </button>
            </div>

            {certificates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {formData.request_number ? (
                  <div className="space-y-3">
                    <div className="text-lg">No previous certificates found</div>
                    <div className="text-sm text-gray-400 max-w-md mx-auto">
                      This request number hasn't been used for certificates before, or no certificates were found in the database.
                    </div>
                    <div className="text-sm">
                      You can:
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      • Click "Add Certificate" to create new certificates
                      • Check if the request number is correct
                      • Verify that certificates exist in the database
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-lg">Enter a request number to get started</div>
                    <div className="text-sm text-gray-400 max-w-md mx-auto">
                      Enter a request number above to auto-load customer details and any previous calibration certificates.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {certificates.map((certificate, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-medium text-gray-900">
                          Certificate {index + 1}: {certificate.certificate_number}
                        </h5>
                        {certificate.previous_request_number && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            Previous Data
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Remove Certificate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Equipment *
                        </label>
                        <input
                          type="text"
                          value={certificate.equipment_name}
                          onChange={(e) => updateCertificate(index, 'equipment_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Make *
                        </label>
                        <input
                          type="text"
                          value={certificate.make}
                          onChange={(e) => updateCertificate(index, 'make', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Model Number *
                        </label>
                        <input
                          type="text"
                          value={certificate.model_no}
                          onChange={(e) => updateCertificate(index, 'model_no', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Capacity
                        </label>
                        <input
                          type="text"
                          value={certificate.capacity}
                          onChange={(e) => updateCertificate(index, 'capacity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Serial Number *
                        </label>
                        <input
                          type="text"
                          value={certificate.serial_no}
                          onChange={(e) => updateCertificate(index, 'serial_no', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Asset Number
                        </label>
                        <input
                          type="text"
                          value={certificate.asset_no}
                          onChange={(e) => updateCertificate(index, 'asset_no', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date of Due *
                        </label>
                        <input
                          type="date"
                          value={certificate.date_of_due}
                          onChange={(e) => updateCertificate(index, 'date_of_due', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={certificate.location}
                          onChange={(e) => updateCertificate(index, 'location', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving || certificates.length === 0 || (dataLoaded && eligibleRequests.length > 0 && !selectedRequestNumber)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Certificates ({certificates.length})
                  {selectedRequestNumber && ` under ${selectedRequestNumber}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CertificateForm;
