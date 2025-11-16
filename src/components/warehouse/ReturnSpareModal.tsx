import React, { useState, useEffect } from 'react';
import { X, Package, User, AlertTriangle } from 'lucide-react';
import { api } from '../../utils/api';
import { SpareInventory } from '../../types';

interface ReturnSpareModalProps {
  spareInventoryIds?: number[];
  onClose: () => void;
  onReturn: () => void;
}

const ReturnSpareModal: React.FC<ReturnSpareModalProps> = ({
  spareInventoryIds = [],
  onClose,
  onReturn
}) => {
  const [spareInventory, setSpareInventory] = useState<SpareInventory[]>([]);
  const [selectedSpares, setSelectedSpares] = useState<number[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  useEffect(() => {
    if (spareInventoryIds.length > 0) {
      loadSpareInventory();
    }
  }, [spareInventoryIds]);

  const loadSpareInventory = async () => {
    setIsLoadingInventory(true);
    try {
      // Load all spare inventory and filter by IDs
      const response = await api.getSpareInventory() as { success: boolean; data?: SpareInventory[] };

      if (response.success && response.data) {
        const filteredInventory = response.data.filter(item =>
          spareInventoryIds.includes(item.id)
        );
        setSpareInventory(filteredInventory);
        setSelectedSpares(filteredInventory.map(item => item.id));
      }
    } catch (error) {
      console.error('Failed to load spare inventory:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleSpareToggle = (spareId: number) => {
    setSelectedSpares(prev =>
      prev.includes(spareId)
        ? prev.filter(id => id !== spareId)
        : [...prev, spareId]
    );
  };

  const handleSelectAll = () => {
    setSelectedSpares(spareInventory.map(item => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedSpares([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSpares.length === 0) {
      alert('Please select at least one spare to return');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.returnSpareToWarehouse(selectedSpares, returnReason || undefined);

      if (response.success) {
        onReturn();
        onClose();
      } else {
        alert(response.error || 'Failed to return spares');
      }
    } catch (error) {
      console.error('Failed to return spares:', error);
      alert('Failed to return spares');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingInventory) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Return Spares to Warehouse</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Spare Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Spares to Return ({selectedSpares.length} selected)
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {spareInventory.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedSpares.includes(item.id)}
                    onChange={() => handleSpareToggle(item.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {item.unique_spare_id}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'consumed' ? 'bg-gray-100 text-gray-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.spare?.name} - {item.spare?.part_number}
                    </div>
                    {item.technician && (
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <User className="w-3 h-3 mr-1" />
                        Assigned to: {item.technician.name}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      AED {item.selling_price?.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cost: AED {item.cost_price?.toFixed(2)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Return Reason (Optional)
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Enter reason for return (e.g., service completed, spare not needed, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Warning for consumed spares */}
          {selectedSpares.some(id => {
            const spare = spareInventory.find(s => s.id === id);
            return spare?.status === 'consumed';
          }) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Some selected spares are marked as consumed.
                  Returning consumed spares may require additional approval.
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedSpares.length === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Returning...' : `Return ${selectedSpares.length} Spare${selectedSpares.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnSpareModal;
