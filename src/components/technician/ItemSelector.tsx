import React, { useState, useEffect } from 'react';
import { Item, ApiResponse } from '../../types';
import { api } from '../../utils/api';
import { X, Search, Plus, Link, Package, Tag, Calendar } from 'lucide-react';

interface ItemSelectorProps {
  customerId: number;
  onSelect: (item: Item | null, manualData?: any) => void;
  onClose: () => void;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  customerId,
  onSelect,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'global' | 'manual'>('customer');
  const [customerItems, setCustomerItems] = useState<Item[]>([]);
  const [globalItems, setGlobalItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualItemData, setManualItemData] = useState({
    item_type: 'scale',
    brand: '',
    model: '',
    serial_number: '',
    department: '',
    purchase_type: 'purchased_us'
  });

  useEffect(() => {
    loadCustomerItems();
  }, [customerId]);

  useEffect(() => {
    if (activeTab === 'global' && searchTerm) {
      searchGlobalItems();
    }
  }, [searchTerm, activeTab]);

  const loadCustomerItems = async () => {
    try {
      const response: ApiResponse<Item[]> = await api.getItems(customerId);
      if (response.success) {
        setCustomerItems(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load customer items:', error);
    }
  };

  const searchGlobalItems = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const response: ApiResponse<Item[]> = await api.searchItems(searchTerm);
      if (response.success) {
        // Filter out items that already belong to this customer
        const unassignedItems = (response.data || []).filter(item => 
          !item.customer_id || item.customer_id !== customerId
        );
        setGlobalItems(unassignedItems);
      }
    } catch (error) {
      console.error('Failed to search global items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignItem = async (item: Item) => {
    try {
      const response = await api.assignItemToCustomer(item.id, customerId);
      if (response.success) {
        onSelect({ ...item, customer_id: customerId });
      }
    } catch (error) {
      console.error('Failed to assign item:', error);
    }
  };

  const handleManualItemSubmit = () => {
    if (!manualItemData.brand || !manualItemData.model || !manualItemData.serial_number) {
      alert('Please fill in all required fields');
      return;
    }
    onSelect(null, manualItemData);
  };

  const filteredCustomerItems = customerItems.filter(item =>
    item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Item</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('customer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customer Items ({customerItems.length})
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'global'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search All Items
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Add New Item
            </button>
          </nav>
        </div>

        <div className="p-6">
          {(activeTab === 'customer' || activeTab === 'global') && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={activeTab === 'customer' ? "Search customer items..." : "Search all items by model, serial number, or brand..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'customer' && (
              <div>
                {filteredCustomerItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No items found for this customer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCustomerItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-gray-900">{item.brand} {item.model}</div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.purchase_type === 'purchased_us' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {item.purchase_type === 'purchased_us' ? 'Our Product' : 'Third Party'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4" />
                            <span>S/N: {item.serial_number}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4" />
                            <span>{item.item_type}</span>
                            {item.department && <span>• {item.department}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'global' && (
              <div>
                {!searchTerm ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Enter a search term to find items across all customers.</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : globalItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No unassigned items found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {globalItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-gray-900">{item.brand} {item.model}</div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.purchase_type === 'purchased_us' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {item.purchase_type === 'purchased_us' ? 'Our Product' : 'Third Party'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-2">
                            <Tag className="w-4 h-4" />
                            <span>S/N: {item.serial_number}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4" />
                            <span>{item.item_type}</span>
                            {item.department && <span>• {item.department}</span>}
                          </div>
                          {item.customer && (
                            <div className="text-orange-600">
                              Currently assigned to: {item.customer.name}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssignItem(item)}
                          className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          <Link className="w-4 h-4" />
                          <span>Assign to Customer</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="max-w-2xl mx-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Type *</label>
                      <select
                        value={manualItemData.item_type}
                        onChange={(e) => setManualItemData({...manualItemData, item_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="scale">Weighing Scale</option>
                        <option value="pos">POS System</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Type *</label>
                      <select
                        value={manualItemData.purchase_type}
                        onChange={(e) => setManualItemData({...manualItemData, purchase_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="purchased_us">Purchased from Us</option>
                        <option value="third_party">Third-Party Product</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                      <input
                        type="text"
                        value={manualItemData.brand}
                        onChange={(e) => setManualItemData({...manualItemData, brand: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter brand name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                      <input
                        type="text"
                        value={manualItemData.model}
                        onChange={(e) => setManualItemData({...manualItemData, model: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter model name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number *</label>
                      <input
                        type="text"
                        value={manualItemData.serial_number}
                        onChange={(e) => setManualItemData({...manualItemData, serial_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter serial number"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={manualItemData.department}
                        onChange={(e) => setManualItemData({...manualItemData, department: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter department (optional)"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleManualItemSubmit}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemSelector;