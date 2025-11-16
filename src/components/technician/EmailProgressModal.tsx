import React from 'react';
import { CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';

interface EmailProgressModalProps {
  isOpen: boolean;
  status: 'sending' | 'success' | 'error';
  progress?: number;
  message?: string;
  error?: string;
  onClose: () => void;
}

const EmailProgressModal: React.FC<EmailProgressModalProps> = ({
  isOpen,
  status,
  progress = 0,
  message,
  error,
  onClose
}) => {
  if (!isOpen) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Loader className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'sending':
        return 'Sending Email...';
      case 'success':
        return 'Email Sent Successfully!';
      case 'error':
        return 'Email Send Failed';
      default:
        return 'Email Status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg max-w-md w-full mx-4 p-6 ${getStatusColor()}`}>
        <div className="text-center">
          {/* Status Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-4">
            {getStatusIcon()}
          </div>

          {/* Status Title */}
          <h3 className={`text-lg font-semibold mb-2 ${
            status === 'sending' ? 'text-blue-900' :
            status === 'success' ? 'text-green-900' :
            status === 'error' ? 'text-red-900' : 'text-gray-900'
          }`}>
            {getStatusTitle()}
          </h3>

          {/* Progress Bar for Sending Status */}
          {status === 'sending' && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700">{progress}% complete</p>
            </div>
          )}

          {/* Status Message */}
          {message && (
            <p className={`text-sm mb-4 ${
              status === 'sending' ? 'text-blue-700' :
              status === 'success' ? 'text-green-700' :
              status === 'error' ? 'text-red-700' : 'text-gray-700'
            }`}>
              {message}
            </p>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            {status === 'sending' ? (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  status === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {status === 'success' ? 'OK' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailProgressModal;
