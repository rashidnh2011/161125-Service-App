import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../../utils/api';
import { Spare } from '../../types';
import { X, Plus, Search, ChevronDown } from 'lucide-react';

interface AddStockModalProps {
  spares: Spare[];
  onSave: () => void;
  onClose: () => void;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ spares, onSave, onClose }) => {
  const [selectedSpareId, setSelectedSpareId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter spares based on dropdown search term
  const filteredSpares = useMemo(() => {
    if (!dropdownSearchTerm.trim()) return spares;

    const term = dropdownSearchTerm.toLowerCase();
    return spares.filter(spare =>
      spare.name.toLowerCase().includes(term) ||
      spare.part_number.toLowerCase().includes(term) ||
      (spare.brand && spare.brand.toLowerCase().includes(term)) ||
      spare.id.toString().includes(term)
    );
  }, [spares, dropdownSearchTerm]);

  const selectedSpare = selectedSpareId ? spares.find(s => s.id === selectedSpareId) : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSpareSelect = (spare: Spare) => {
    setSelectedSpareId(spare.id);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleClearSelection = () => {
    setSelectedSpareId(null);
    setDropdownSearchTerm('');
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setDropdownSearchTerm('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSpareId || quantity <= 0) {
      alert('Please select a spare and enter valid quantity');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.addWarehouseStock(selectedSpareId, quantity, batchNumber) as { success: boolean; error?: string };
      if (response.success) {
        onSave();
      } else {
        alert(response.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Failed to add stock:', error);
      alert('Failed to add stock');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Add Warehouse Stock</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Spare *</label>

            {/* Custom Searchable Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={handleDropdownToggle}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center justify-between ${
                  !selectedSpareId ? 'border-gray-300' : 'border-blue-500 bg-blue-50'
                }`}
              >
                <span className={selectedSpareId ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedSpare
                    ? `${selectedSpare.name} - ${selectedSpare.part_number} ${selectedSpare.brand ? `(Brand: ${selectedSpare.brand})` : ''}`
                    : 'Choose spare...'}
                </span>
                <div className="flex items-center space-x-2">
                  {selectedSpareId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSelection();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Search input inside dropdown */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search spares..."
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Dropdown options */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredSpares.length > 0 ? (
                      filteredSpares.map(spare => (
                        <button
                          key={spare.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpareSelect(spare);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{spare.name}</div>
                          <div className="text-xs text-gray-500">
                            {spare.part_number} {spare.brand && `• Brand: ${spare.brand}`} • ID: {spare.id}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {dropdownSearchTerm ? `No spares found matching "${dropdownSearchTerm}"` : 'No spares available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Optional batch number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {selectedSpare && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2">Stock Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Spare:</strong> {selectedSpare.name}</p>
                <p><strong>Part Number:</strong> {selectedSpare.part_number}</p>
                <p><strong>Price:</strong> AED {selectedSpare.price}</p>
                <p><strong>Will Generate:</strong> {quantity} unique spare ID(s)</p>
              </div>
            </div>
          )}

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
              disabled={isLoading || !selectedSpareId || quantity <= 0 || filteredSpares.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Adding...' : 'Add Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;