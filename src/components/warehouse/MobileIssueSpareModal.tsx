import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { SpareInventory, User } from '../../types';
import { X, ArrowRight, Package, User as UserIcon, CheckCircle } from 'lucide-react';

interface MobileIssueSpareModalProps {
  spareId: number;
  technicians: User[];
  onIssue: () => void;
  onClose: () => void;
}

const MobileIssueSpareModal: React.FC<MobileIssueSpareModalProps> = ({
  spareId,
  technicians,
  onIssue,
  onClose
}) => {
  const [availableSpares, setAvailableSpares] = useState<SpareInventory[]>([]);
  const [selectedSpareIds, setSelectedSpareIds] = useState<number[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'select-technician' | 'select-spares' | 'confirm'>('select-technician');

  useEffect(() => {
    loadAvailableSpares();
  }, [spareId]);

  const loadAvailableSpares = async () => {
    setIsLoading(true);
    try {
      const response = await api.getSpareInventory({ 
        status: 'available', 
        spare_id: spareId 
      }) as { success: boolean; data?: SpareInventory[]; error?: string };
      if (response.success) {
        setAvailableSpares(response.data || []);
      } else {
        console.error('Failed to load available spares:', response.error);
      }
    } catch (error) {
      console.error('Failed to load available spares:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpareToggle = (spareInventoryId: number) => {
    setSelectedSpareIds(prev =>
      prev.includes(spareInventoryId)
        ? prev.filter(id => id !== spareInventoryId)
        : [...prev, spareInventoryId]
    );
  };

  const handleIssue = async () => {
    if (selectedSpareIds.length === 0) {
      alert('Please select at least one spare to issue');
      return;
    }

    if (!selectedTechnicianId) {
      alert('Please select a technician');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.issueSpareToTechnician(selectedSpareIds, selectedTechnicianId, purpose) as { success: boolean; error?: string };
      if (response.success) {
        onIssue();
      } else {
        alert(response.error || 'Failed to issue spares');
      }
    } catch (error) {
      console.error('Failed to issue spares:', error);
      alert('Failed to issue spares');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTechnician = technicians.find(t => t.id === selectedTechnicianId);
  const spareName = availableSpares[0]?.spare?.name || 'Spare';

  const renderTechnicianSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <UserIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Technician</h3>
        <p className="text-sm text-gray-600">Choose who to assign the spare parts to</p>
      </div>

      {technicians.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-medium">No technicians available</p>
          <p className="text-sm">Please contact an administrator to add technicians to the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
          {technicians.map(tech => (
            <button
              key={tech.id}
              onClick={() => setSelectedTechnicianId(tech.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedTechnicianId === tech.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedTechnicianId === tech.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedTechnicianId === tech.id && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{tech.name}</div>
                  <div className="text-sm text-gray-600">{tech.email}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderSpareSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Package className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Spare Parts</h3>
        <p className="text-sm text-gray-600">Choose which items to assign</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Purpose (Optional)</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Service call, maintenance, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {availableSpares.map((spare) => (
          <button
            key={spare.id}
            onClick={() => handleSpareToggle(spare.id)}
            className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
              selectedSpareIds.includes(spare.id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedSpareIds.includes(spare.id)
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300'
              }`}>
                {selectedSpareIds.includes(spare.id) && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{spare.unique_spare_id}</div>
                <div className="text-sm text-gray-600">{spare.spare?.name}</div>
                <div className="text-xs text-gray-500">
                  AED {spare.selling_price} • {spare.location_in_warehouse || 'Main Storage'}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Assignment</h3>
        <p className="text-sm text-gray-600">Review the assignment details</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Assignment Summary</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>Technician:</span>
            <span className="font-medium">{selectedTechnician?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Items:</span>
            <span className="font-medium">{selectedSpareIds.length} spare(s)</span>
          </div>
          <div className="flex justify-between">
            <span>Purpose:</span>
            <span className="font-medium">{purpose || 'Not specified'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Issue {spareName}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {step === 'select-technician' && renderTechnicianSelection()}
              {step === 'select-spares' && renderSpareSelection()}
              {step === 'confirm' && renderConfirmation()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          {step === 'select-technician' && (
            <button
              onClick={() => setStep('select-spares')}
              disabled={!selectedTechnicianId || technicians.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Continue to Select Spares
            </button>
          )}

          {step === 'select-spares' && (
            <div className="space-y-2">
              <button
                onClick={() => setStep('confirm')}
                disabled={selectedSpareIds.length === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Review Assignment ({selectedSpareIds.length} selected)
              </button>
              <button
                onClick={() => setStep('select-technician')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Technician Selection
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-2">
              <button
                onClick={handleIssue}
                disabled={isSaving}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Issuing...' : 'Confirm Assignment'}
              </button>
              <button
                onClick={() => setStep('select-spares')}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Spare Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileIssueSpareModal;
