import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { SpareTransaction, ApiResponse } from '../../types';
import { X, BarChart3, Calendar, User, ArrowRight, ArrowLeft, Package } from 'lucide-react';

interface SpareTransactionsModalProps {
  spareId: number;
  onClose: () => void;
}

const SpareTransactionsModal: React.FC<SpareTransactionsModalProps> = ({ spareId, onClose }) => {
  const [transactions, setTransactions] = useState<SpareTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [spareId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<SpareTransaction[]> = await api.getSpareTransactions({ spare_id: spareId });
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stock_in': return <Package className="w-4 h-4 text-green-600" />;
      case 'issued': return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'consumed': return <Package className="w-4 h-4 text-gray-600" />;
      case 'returned': return <ArrowLeft className="w-4 h-4 text-purple-600" />;
      default: return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const config = {
      stock_in: { bg: 'bg-green-100', text: 'text-green-800', label: 'Stock In' },
      issued: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Issued' },
      consumed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Consumed' },
      returned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Returned' },
      damaged: { bg: 'bg-red-100', text: 'text-red-800', label: 'Damaged' },
      lost: { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost' }
    };

    const typeConfig = config[type as keyof typeof config] || config.stock_in;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
        {typeConfig.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Spare Transaction History</h3>
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
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No transactions found for this spare</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unique Spare ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Technician
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {new Date(transaction.transaction_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(transaction.transaction_date).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.spare_inventory?.unique_spare_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          {getTransactionBadge(transaction.transaction_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.technician ? (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{transaction.technician.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.previous_status && (
                            <span className="capitalize">{transaction.previous_status}</span>
                          )}
                          {transaction.previous_status && ' → '}
                          <span className="capitalize font-medium">{transaction.new_status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {transaction.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpareTransactionsModal;