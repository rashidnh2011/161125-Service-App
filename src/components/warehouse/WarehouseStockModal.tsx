import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { WarehouseStock, SpareInventory, SpareTransaction, Spare } from '../../types';
import { X, Package, BarChart3, TrendingUp, AlertTriangle, Check } from 'lucide-react';

interface WarehouseStockModalProps {
  stockId: number;
  onClose: () => void;
}

const WarehouseStockModal: React.FC<WarehouseStockModalProps> = ({ stockId, onClose }) => {
  const [stock, setStock] = useState<WarehouseStock & { spare: Spare } | null>(null);
  const [inventory, setInventory] = useState<SpareInventory[]>([]);
  const [transactions, setTransactions] = useState<SpareTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'transactions'>('overview');

  useEffect(() => {
    loadStockDetails();
  }, [stockId]);

  const loadStockDetails = async () => {
    setIsLoading(true);
    try {
      const [stockRes, inventoryRes, transactionsRes] = await Promise.all([
        api.request(`/warehouse/stock.php?id=${stockId}`) as Promise<{ success: boolean; data?: WarehouseStock & { spare: Spare } }>,
        api.getSpareInventory({ spare_id: stockId }) as Promise<{ success: boolean; data?: SpareInventory[] }>,
        api.getSpareTransactions({ spare_id: stockId }) as Promise<{ success: boolean; data?: SpareTransaction[] }>
      ]);

      if (stockRes.success && stockRes.data) {
        setStock(stockRes.data);
      }

      if (inventoryRes.success && inventoryRes.data) {
        setInventory(inventoryRes.data);
      }

      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data);
      }
    } catch (error) {
      console.error('Failed to load stock details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      issued: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Issued' },
      consumed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Consumed' },
      returned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Returned' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getStockStatusIcon = (stock: WarehouseStock) => {
    if (stock.available_quantity <= stock.minimum_stock_level) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    return <Check className="w-5 h-5 text-green-500" />;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading stock details...</p>
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stock Not Found</h3>
            <p className="text-gray-600 mb-4">The requested warehouse stock could not be found.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{stock.spare.name}</h3>
              <p className="text-sm text-gray-500">Part Number: {stock.spare.part_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory ({inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Transactions ({transactions.length})
            </button>
          </nav>
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stock Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Quantity</p>
                      <p className="text-2xl font-bold text-blue-900">{stock.total_quantity}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Available</p>
                      <p className="text-2xl font-bold text-green-900">{stock.available_quantity}</p>
                    </div>
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Issued</p>
                      <p className="text-2xl font-bold text-yellow-900">{stock.issued_quantity}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Consumed</p>
                      <p className="text-2xl font-bold text-purple-900">{stock.consumed_quantity}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Stock Status</h4>
                <div className="flex items-center space-x-4">
                  {getStockStatusIcon(stock)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {stock.available_quantity <= stock.minimum_stock_level ? 'Low Stock Alert' : 'Normal Stock Level'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Minimum Stock Level: {stock.minimum_stock_level} |
                      Current Available: {stock.available_quantity}
                    </p>
                  </div>
                </div>
              </div>

              {/* Spare Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Spare Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{stock.spare.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Part Number</p>
                    <p className="text-sm text-gray-900">{stock.spare.part_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Price</p>
                    <p className="text-sm text-gray-900">AED {stock.spare.price}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-sm text-gray-900">{stock.spare.description || 'No description available'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Individual Spare Inventory</h4>
                <div className="text-sm text-gray-500">{inventory.length} items</div>
              </div>

              {inventory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No inventory items found for this spare.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventory.map((item) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.unique_spare_id}</p>
                              <p className="text-xs text-gray-500">
                                Created: {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {getStatusBadge(item.status)}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Cost Price:</span>
                              <span className="ml-2 font-medium">AED {item.cost_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Selling Price:</span>
                              <span className="ml-2 font-medium">AED {item.selling_price}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2">{item.location_in_warehouse || 'Not specified'}</span>
                            </div>
                            {item.batch_number && (
                              <div>
                                <span className="text-gray-500">Batch:</span>
                                <span className="ml-2">{item.batch_number}</span>
                              </div>
                            )}
                          </div>
                          {item.technician && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">Assigned to:</span>
                              <span className="ml-2 font-medium">{item.technician.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Transaction History</h4>
                <div className="text-sm text-gray-500">{transactions.length} transactions</div>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No transactions found for this spare.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.transaction_date).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                transaction.transaction_type === 'stock_in' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.transaction_type === 'stock_in' ? '+' : '-'}{transaction.quantity}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transaction.previous_status} → {transaction.new_status}
                              </p>
                            </div>
                          </div>
                          {transaction.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {transaction.notes}
                            </div>
                          )}
                          {transaction.technician && (
                            <div className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">By:</span> {transaction.technician.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseStockModal;
