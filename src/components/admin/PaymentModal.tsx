import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { PaymentInfo, ApiResponse } from '../../types';
import { X, Save, DollarSign } from 'lucide-react';

interface PaymentModalProps {
  reportId: number;
  onSave: () => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ reportId, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    invoice_number: '',
    receipt_number: '',
    amount: '',
    payment_status: 'unpaid' as 'paid' | 'unpaid'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPaymentInfo();
  }, [reportId]);

  const loadPaymentInfo = async () => {
    setLoadingData(true);
    try {
      const response: ApiResponse<PaymentInfo> = await api.getPaymentInfo(reportId);
      if (response.success && response.data) {
        setFormData({
          invoice_number: response.data.invoice_number,
          receipt_number: response.data.receipt_number || '',
          amount: response.data.amount.toString(),
          payment_status: response.data.payment_status
        });
      }
    } catch (error) {
      console.error('Failed to load payment info:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = 'Invoice number is required';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a valid positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const paymentData = {
        invoice_number: formData.invoice_number,
        receipt_number: formData.receipt_number,
        amount: parseFloat(formData.amount),
        payment_status: formData.payment_status
      };

      const response = await api.savePaymentInfo(reportId, paymentData);
      if (response.success) {
        onSave();
      } else {
        setErrors({ general: response.error || 'Failed to save payment information' });
      }
    } catch (error) {
      console.error('Failed to save payment info:', error);
      setErrors({ general: 'Failed to save payment information' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleInputChange('invoice_number', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.invoice_number ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter invoice number"
            />
            {errors.invoice_number && <p className="text-red-600 text-xs mt-1">{errors.invoice_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
            <input
              type="text"
              value={formData.receipt_number}
              onChange={(e) => handleInputChange('receipt_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter receipt number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.amount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter amount"
            />
            {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status *</label>
            <select
              value={formData.payment_status}
              onChange={(e) => handleInputChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Save Payment Info'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;