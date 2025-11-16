import React, { useState } from 'react';
import { api } from '../../utils/api';
import { SpareInventory, User } from '../../types';
import { X, Edit3, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';

interface MobileEditAssignmentModalProps {
  item: SpareInventory;
  technicians: User[];
  onUpdate: () => void;
  onClose: () => void;
}

const MobileEditAssignmentModal: React.FC<MobileEditAssignmentModalProps> = ({
  item,
  technicians,
  onUpdate,
  onClose
}) => {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(item.technician?.id || null);
  const [newStatus, setNewStatus] = useState<'available' | 'issued' | 'consumed' | 'returned'>(item.status as 'available' | 'issued' | 'consumed' | 'returned');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    if (!selectedTechnicianId && newStatus === 'issued') {
      if (technicians.length === 0) {
        alert('No technicians available. Please contact an administrator to add technicians to the system.');
        return;
      }
      alert('Please select a technician for issued status');
      return;
    }

    setIsSaving(true);
    try {
      // For now, we'll use issueSpareToTechnician for issued status
      // and returnSpareToWarehouse for other statuses
      if (newStatus === 'issued' && selectedTechnicianId) {
        const response = await api.issueSpareToTechnician([item.id], selectedTechnicianId, notes) as { success: boolean; error?: string };
        if (response.success) {
          onUpdate();
        } else {
          alert(response.error || 'Failed to issue spare');
        }
      } else if (newStatus !== 'issued') {
        const response = await api.returnSpareToWarehouse([item.id], notes) as { success: boolean; error?: string };
        if (response.success) {
          onUpdate();
        } else {
          alert(response.error || 'Failed to return spare');
        }
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      alert('Failed to update assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTechnician = technicians.find(t => t.id === selectedTechnicianId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Edit Assignment</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Assignment Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Current Assignment</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Spare ID:</span>
                <span className="font-medium">{item.unique_spare_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Spare Name:</span>
                <span className="font-medium">{item.spare?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Status:</span>
                <span className="font-medium">{item.status}</span>
              </div>
              {item.technician && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Technician:</span>
                  <span className="font-medium">{item.technician.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as 'available' | 'issued' | 'consumed' | 'returned')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">Available</option>
              <option value="issued">Issued</option>
              <option value="consumed">Consumed</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          {/* Technician Selection (only show for issued status) */}
          {newStatus === 'issued' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Technician</label>
              {technicians.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium">No technicians available</p>
                  <p className="text-sm">Please contact an administrator to add technicians to the system.</p>
                </div>
              ) : (
                <select
                  value={selectedTechnicianId || ''}
                  onChange={(e) => setSelectedTechnicianId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose technician...</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this change..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Warning for status changes */}
          {newStatus !== item.status && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Status Change</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Changing status from {item.status} to {newStatus}. This action will be recorded in the transaction history.
              </p>
            </div>
          )}

          {/* Assignment Preview */}
          {newStatus === 'issued' && selectedTechnician && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">New Assignment</span>
              </div>
              <div className="text-sm text-blue-800">
                <p><strong>{item.unique_spare_id}</strong> will be assigned to <strong>{selectedTechnician.name}</strong></p>
              </div>
            </div>
          )}

          {newStatus !== 'issued' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Status Update</span>
              </div>
              <div className="text-sm text-purple-800">
                <p><strong>{item.unique_spare_id}</strong> status will be updated to <strong>{newStatus}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <button
            onClick={handleUpdate}
            disabled={isSaving || (newStatus === 'issued' && (!selectedTechnicianId || technicians.length === 0))}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Updating...' : 'Update Assignment'}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileEditAssignmentModal;
