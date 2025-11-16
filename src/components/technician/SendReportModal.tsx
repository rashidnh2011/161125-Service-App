import React, { useState } from 'react';
import { EmailRecipient } from '../../types';
import { X, Send, Plus, Minus } from 'lucide-react';
import EmailProgressModal from './EmailProgressModal';

interface SendReportModalProps {
  reportId: number;
  emailRecipients: EmailRecipient[];
  onSend: (reportId: number, emails: string[], message?: string) => void;
  onClose: () => void;
  customerEmail?: string;
  customerName?: string;
}

const SendReportModal: React.FC<SendReportModalProps> = ({
  reportId,
  emailRecipients,
  onSend,
  onClose,
  customerEmail,
  customerName
}) => {
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'sending' | 'success' | 'error'>('sending');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [customEmails, setCustomEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [includeCustomerEmail, setIncludeCustomerEmail] = useState<boolean>(!!customerEmail);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecipients(emailRecipients.map(r => r.id));
    } else {
      setSelectedRecipients([]);
    }
  };
  const handleRecipientToggle = (recipientId: number) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId)
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
    
    // Update select all state
    const newSelected = selectedRecipients.includes(recipientId)
      ? selectedRecipients.filter(id => id !== recipientId)
      : [...selectedRecipients, recipientId];
    setSelectAll(newSelected.length === emailRecipients.length);
  };

  const handleCustomEmailChange = (index: number, email: string) => {
    const updated = [...customEmails];
    updated[index] = email;
    setCustomEmails(updated);
  };

  const addCustomEmailField = () => {
    setCustomEmails([...customEmails, '']);
  };

  const removeCustomEmailField = (index: number) => {
    if (customEmails.length > 1) {
      setCustomEmails(customEmails.filter((_, i) => i !== index));
    }
  };

  const handleSend = async () => {
    const recipientEmails = emailRecipients
      .filter(r => selectedRecipients.includes(r.id))
      .map(r => r.email);

    const validCustomEmails = customEmails.filter(email => email.trim() !== '');

    const allEmails: string[] = [...recipientEmails, ...validCustomEmails];
    if (includeCustomerEmail && customerEmail && customerEmail.trim() !== '') {
      allEmails.push(customerEmail.trim());
    }

    // Deduplicate emails (case-insensitive)
    const uniqueEmails = Array.from(new Map(allEmails.map(e => [e.trim().toLowerCase(), e.trim()])).values());

    if (uniqueEmails.length === 0) {
      alert('Please select at least one recipient or enter a custom email address.');
      return;
    }

    // Show progress modal
    setShowProgressModal(true);
    setEmailStatus('sending');
    setProgress(0);
    setStatusMessage('Preparing to send email...');
    setErrorMessage('');

    try {
      // Simulate progress updates for better UX
      const progressSteps = [
        { progress: 10, message: 'Preparing email content...' },
        { progress: 30, message: 'Generating PDF attachment...' },
        { progress: 50, message: 'Connecting to email server...' },
        { progress: 70, message: 'Sending email...' },
        { progress: 90, message: 'Finalizing...' }
      ];

      for (const step of progressSteps) {
        setProgress(step.progress);
        setStatusMessage(step.message);
        await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay between steps
      }

      // Call the actual send function
      await onSend(reportId, uniqueEmails, message || undefined);

      // Success
      setProgress(100);
      setEmailStatus('success');
      setStatusMessage('Email sent successfully!');

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowProgressModal(false);
        onClose();
      }, 2000);

    } catch (error) {
      setEmailStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send email');
      setStatusMessage('Email send failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Send Service Report</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Customer Email (if available) */}
          {customerEmail && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Email</h4>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={includeCustomerEmail}
                  onChange={(e) => setIncludeCustomerEmail(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{customerName || 'Customer'}</span>
                  <span className="text-sm text-gray-500 ml-2">({customerEmail})</span>
                </div>
              </label>
            </div>
          )}

          {/* Pre-saved Recipients */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Pre-saved Recipients</h4>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-blue-600">Select All</span>
              </label>
            </div>
            <div className="space-y-2">
              {emailRecipients.map((recipient) => (
                <label key={recipient.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(recipient.id)}
                    onChange={() => handleRecipientToggle(recipient.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{recipient.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({recipient.email})</span>
                    <span className="text-xs text-gray-400 ml-2">- {recipient.role_tag}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Email Addresses */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Custom Email Addresses</h4>
              <button
                onClick={addCustomEmailField}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-4 h-4" />
                <span>Add Email</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {customEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleCustomEmailChange(index, e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {customEmails.length > 1 && (
                    <button
                      onClick={() => removeCustomEmailField(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
              Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a personal message to accompany the service report..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSend}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send Report</span>
          </button>
        </div>
      </div>

      {/* Progress Modal */}
      <EmailProgressModal
        isOpen={showProgressModal}
        status={emailStatus}
        progress={progress}
        message={statusMessage}
        error={errorMessage}
        onClose={() => {
          setShowProgressModal(false);
          if (emailStatus === 'success') {
            onClose();
          }
        }}
      />
    </div>
  );
};

export default SendReportModal;