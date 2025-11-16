import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { SpareInventory, User, ApiResponse } from '../../types';
import { X, ArrowRight, Package, User as UserIcon } from 'lucide-react';

interface IssueSpareModalProps {
  spareId: number;
  technicians: User[];
  onIssue: () => void;
  onClose: () => void;
}

const IssueSpareModal: React.FC<IssueSpareModalProps> = ({ spareId, technicians, onIssue, onClose }) => {
  const [availableSpares, setAvailableSpares] = useState<SpareInventory[]>([]);
  const [selectedSpareIds, setSelectedSpareIds] = useState<number[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAvailableSpares();
  }, [spareId]);

  const loadAvailableSpares = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<SpareInventory[]> = await api.getSpareInventory({ 
        status: 'available', 
        spare_id: spareId 
      });
      if (response.success) {
        setAvailableSpares(response.data || []);
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
      const response = await api.issueSpareToTechnician(selectedSpareIds, selectedTechnicianId, purpose);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Issue Spares to Technician</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Technician Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician *</label>
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
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Service call, maintenance, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Available Spares Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Spares to Issue ({availableSpares.length} available)
                </label>
                
                {availableSpares.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No available spares in warehouse</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {availableSpares.map((spare) => (
                      <label
                        key={spare.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSpareIds.includes(spare.id)}
                          onChange={() => handleSpareToggle(spare.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {spare.unique_spare_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {spare.spare?.name} - {spare.spare?.part_number}
                          </div>
                          <div className="text-xs text-gray-400">
                            Price: AED {spare.selling_price} | Location: {spare.location_in_warehouse || 'Not specified'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedSpareIds.length > 0 && selectedTechnician && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Issue Summary</h4>
                  <div className="text-sm text-blue-800">
                    <p>Issuing <strong>{selectedSpareIds.length}</strong> {spareName} unit(s)</p>
                    <p>To: <strong>{selectedTechnician.name}</strong></p>
                    {purpose && <p>Purpose: <strong>{purpose}</strong></p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleIssue}
            disabled={isSaving || selectedSpareIds.length === 0 || !selectedTechnicianId}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{isSaving ? 'Issuing...' : 'Issue Spares'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueSpareModal;