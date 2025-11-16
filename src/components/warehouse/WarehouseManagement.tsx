import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { WarehouseStock, SpareInventory, User, Spare } from '../../types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Check,
  User as UserIcon,
  ArrowRight,
  BarChart3,
  Eye,
  Upload,
  Smartphone,
  Monitor,
  FileText,
} from 'lucide-react';
import IssueSpareModal from './IssueSpareModal';
import AddStockModal from './AddStockModal';
import SpareTransactionsModal from './SpareTransactionsModal';
import WarehouseStockModal from './WarehouseStockModal';
import ReturnSpareModal from './ReturnSpareModal';
import CreateSpareModal from './CreateSpareModal';
import ExcelImportModal from './ExcelImportModal';
import StockExport from './StockExport';

const WarehouseManagement: React.FC = () => {
  const [warehouseStock, setWarehouseStock] = useState<Array<WarehouseStock & { spare: Spare }>>([]);
  const [spareInventory, setSpareInventory] = useState<SpareInventory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'inventory' | 'assignments'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [showIssueModal, setShowIssueModal] = useState<{ show: boolean; spareId?: number }>({ show: false });
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showWarehouseStockModal, setShowWarehouseStockModal] = useState<{ show: boolean; stockId?: number }>({ show: false });
  const [showCreateSpareModal, setShowCreateSpareModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState<{ show: boolean; spareInventoryIds?: number[] }>({ show: false });
  const [showTransactionsModal, setShowTransactionsModal] = useState<{ show: boolean; spareId?: number }>({ show: false });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadSpareInventory();
      // Load users data for technician filtering
      loadUsers();
    }
  }, [activeTab, statusFilter, technicianFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockRes] = await Promise.all([
        api.getWarehouseStock() as Promise<{ success: boolean; data?: (WarehouseStock & { spare: Spare })[] }>
      ]);

      if (stockRes?.success && stockRes.data) {
        // Ensure spare is always defined in the stock items
        const validStock = stockRes.data.filter(stock => stock.spare !== undefined);
        setWarehouseStock(validStock);
      }

      // Only load users if we're in the inventory tab or if we need them
      if (activeTab === 'inventory') {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to load warehouse data:', error);
      setMessage({ type: 'error', text: 'Failed to load warehouse data' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersRes = await api.getUsers() as { success: boolean; data?: User[] };
      if (usersRes?.success && usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // For storekeeper, we don't need users data for basic functionality
      // Just set empty array so the UI doesn't break
      setUsers([]);
    }
  };

  const loadSpareInventory = async () => {
    try {
      const filters: Record<string, string | number> = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (technicianFilter !== 'all') filters.technician_id = parseInt(technicianFilter);

      const response = await api.getSpareInventory(filters) as { success: boolean; data?: SpareInventory[] };
      if (response.success && response.data) {
        setSpareInventory(response.data);
      }
    } catch (error) {
      console.error('Failed to load spare inventory:', error);
    }
  };

  const handleIssueSpare = async (spareId: number) => {
    const stock = warehouseStock.find(s => s.spare_id === spareId);
    if (stock && stock.available_quantity > 0) {
      if (!users.length) {
        await loadUsers();
      }
      setShowIssueModal({ show: true, spareId });
    } else {
      setMessage({ type: 'error', text: 'No available stock to issue' });
    }
  };

  const handleSpareIssued = () => {
    setShowIssueModal({ show: false });
    loadData();
    loadSpareInventory();
    setMessage({ type: 'success', text: 'Spares issued successfully' });
  };

  const handleSpareCreated = () => {
    setShowCreateSpareModal(false);
    loadData();
    setMessage({ type: 'success', text: 'Spare created successfully' });
  };

  const handleSpareReturned = () => {
    setShowReturnModal({ show: false });
    loadData();
    loadSpareInventory();
    setMessage({ type: 'success', text: 'Spares returned successfully' });
  };

  const handleStockAdded = () => {
    setShowAddStockModal(false);
    loadData();
    setMessage({ type: 'success', text: 'Stock added successfully' });
  };

  const handleReturnSpares = (spareInventoryIds: number[]) => {
    setShowReturnModal({ show: true, spareInventoryIds });
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    loadData();
    setMessage({ type: 'success', text: 'Spare parts imported successfully' });
  };

  const handleViewStockDetails = (stockId: number) => {
    setShowWarehouseStockModal({ show: true, stockId });
  };

  const getStatusBadge = (status: 'available' | 'issued' | 'consumed' | 'returned' | string) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      issued: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Issued' },
      consumed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Consumed' },
      returned: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Returned' },
      default: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;
    
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

  const filteredStock = warehouseStock.filter(stock => {
    const searchLower = searchTerm.toLowerCase();
    return (
      stock.spare?.name?.toLowerCase().includes(searchLower) ||
      stock.spare?.part_number?.toLowerCase().includes(searchLower) ||
      stock.spare?.id.toString().includes(searchTerm)
    );
  });

  const filteredInventory = spareInventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.spare?.name?.toLowerCase().includes(searchLower) ||
      item.unique_spare_id.toLowerCase().includes(searchLower) ||
      item.id.toString().includes(searchTerm)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Warehouse Management</h3>
          {isMobile && <Smartphone className="w-5 h-5 text-blue-600" />}
          {!isMobile && <Monitor className="w-5 h-5 text-green-600" />}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateSpareModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              title="Create a new spare part"
            >
              <Plus className="w-4 h-4" />
              <span className={isMobile ? 'hidden' : ''}>Create Spare</span>
              <span className={isMobile ? 'sr-only' : 'hidden'}>Create Spare</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Import spare parts from Excel file"
            >
              <Upload className="w-4 h-4" />
              <span className={isMobile ? 'hidden' : ''}>Import Excel</span>
              <span className={isMobile ? 'sr-only' : 'hidden'}>Import Excel</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              title="Export available stock to PDF, Excel, or CSV"
            >
              <FileText className="w-4 h-4" />
              <span className={isMobile ? 'hidden' : ''}>Export Stock</span>
              <span className={isMobile ? 'sr-only' : 'hidden'}>Export Stock</span>
            </button>
            <button
              onClick={() => setShowAddStockModal(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                warehouseStock.length === 0
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              disabled={warehouseStock.length === 0}
              title={
                warehouseStock.length === 0
                  ? 'No spares available. Please create a spare first.'
                  : 'Add stock to existing spare parts'
              }
            >
              <Plus className="w-4 h-4" />
              <span className={isMobile ? 'hidden' : ''}>Add Stock</span>
              <span className={isMobile ? 'sr-only' : 'hidden'}>Add Stock</span>
            </button>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Refresh warehouse data"
          >
            <span className={isMobile ? 'hidden' : ''}>Refresh</span>
            <span className={isMobile ? 'sr-only' : 'hidden'}>Refresh</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Warehouse Stock
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Spare Inventory
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Technician Assignments
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search spares..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="issued">Issued</option>
                <option value="consumed">Consumed</option>
                <option value="returned">Returned</option>
              </select>

              <select
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Technicians</option>
                {users.filter(u => u.role === 'technician').map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'stock' && (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spare Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Levels
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStock.map((stock) => (
                      <tr key={stock.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{stock.spare?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{stock.spare?.part_number || 'N/A'}</div>
                            <div className="text-xs text-gray-400">AED {stock.spare?.price || '0.00'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">
                              Available: <span className="font-semibold">{stock.available_quantity}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Issued: {stock.issued_quantity} | Consumed: {stock.consumed_quantity}
                            </div>
                            <div className="text-xs text-gray-400">
                              Total: {stock.total_quantity} | Min: {stock.minimum_stock_level}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStockStatusIcon(stock)}
                            <span className={`text-sm ${
                              stock.available_quantity <= stock.minimum_stock_level
                                ? 'text-red-600 font-medium'
                                : 'text-green-600'
                            }`}>
                              {stock.available_quantity <= stock.minimum_stock_level ? 'Low Stock' : 'Normal'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewStockDetails(stock.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIssueSpare(stock.spare_id)}
                              disabled={stock.available_quantity === 0}
                              className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                              title="Issue to Technician"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowTransactionsModal({ show: true, spareId: stock.spare_id })}
                              className="text-purple-600 hover:text-purple-900"
                              title="View Transactions"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStock.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No warehouse stock found.</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <div className="grid grid-cols-1 gap-4">
              {filteredStock.map((stock) => (
                <div key={stock.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{stock.spare?.name || 'N/A'}</h3>
                      <p className="text-sm text-gray-600">{stock.spare?.part_number || 'N/A'}</p>
                      <p className="text-sm font-medium text-green-600">AED {stock.spare?.price || '0.00'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStockStatusIcon(stock)}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stock.available_quantity <= stock.minimum_stock_level
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stock.available_quantity <= stock.minimum_stock_level ? 'Low Stock' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="text-lg font-bold text-gray-900">{stock.available_quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold text-gray-900">{stock.total_quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Issued</p>
                      <p className="text-sm text-gray-600">{stock.issued_quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Consumed</p>
                      <p className="text-sm text-gray-600">{stock.consumed_quantity}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Min: {stock.minimum_stock_level}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewStockDetails(stock.id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Details</span>
                      </button>
                      <button
                        onClick={() => handleIssueSpare(stock.spare_id)}
                        disabled={stock.available_quantity === 0}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-md ${
                          stock.available_quantity === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                        title="Issue to Technician"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-xs">Issue</span>
                      </button>
                      <button
                        onClick={() => setShowTransactionsModal({ show: true, spareId: stock.spare_id })}
                        className="flex items-center space-x-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100"
                        title="View Transactions"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs">History</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredStock.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No warehouse stock found.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'inventory' && (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unique Spare ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spare Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.unique_spare_id}</div>
                          <div className="text-xs text-gray-500">
                            {item.spare?.name || 'N/A'} - {item.spare?.part_number || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.spare?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{item.spare?.part_number || 'N/A'}</div>
                          <div className="text-xs text-gray-400">AED {item.selling_price?.toFixed(2) || '0.00'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.technician ? (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-900">
                                {item.technician.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {item.location_in_warehouse || 'Main Storage'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReturnSpares([item.id])}
                              disabled={item.status !== 'issued'}
                              className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                              title="Return to Warehouse"
                            >
                              <ArrowRight className="w-4 h-4 rotate-180" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredInventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No spare inventory found.</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <div className="grid grid-cols-1 gap-4">
              {filteredInventory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.unique_spare_id}</h3>
                      <p className="text-sm text-gray-600">{item.spare?.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{item.spare?.part_number || 'N/A'}</p>
                      <p className="text-sm font-medium text-green-600">AED {item.selling_price?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="flex items-center">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{item.location_in_warehouse || 'Main Storage'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium text-gray-900">{item.status}</p>
                    </div>
                  </div>

                  {item.technician && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Assigned to:</span>
                      </div>
                      <p className="text-sm text-blue-800 mt-1">{item.technician.name}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      ID: {item.id}
                    </div>
                    <button
                      onClick={() => handleReturnSpares([item.id])}
                      disabled={item.status !== 'issued'}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md ${
                        item.status !== 'issued'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                      title="Return to Warehouse"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      <span className="text-xs">Return</span>
                    </button>
                  </div>
                </div>
              ))}

              {filteredInventory.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No spare inventory found.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'assignments' && (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Technician
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spare Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignment Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purpose
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory
                      .filter(item => item.technician)
                      .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.technician?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.technician?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.spare?.name}</div>
                          <div className="text-sm text-gray-500">{item.unique_spare_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            Service Visit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredInventory.filter(item => item.technician).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No technician assignments found.</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <div className="grid grid-cols-1 gap-4">
              {filteredInventory
                .filter(item => item.technician)
                .map((item) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <UserIcon className="w-8 h-8 text-blue-600 bg-blue-100 rounded-full p-1.5" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.technician?.name}</h3>
                        <p className="text-sm text-gray-600">{item.technician?.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Spare Part</p>
                      <p className="text-sm font-medium text-gray-900">{item.spare?.name}</p>
                      <p className="text-xs text-gray-600">{item.unique_spare_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assigned Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Purpose</p>
                      <p className="text-sm font-medium text-gray-900">Service Visit</p>
                    </div>
                  </div>
                </div>
              ))}

              {filteredInventory.filter(item => item.technician).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No technician assignments found.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* All Modals */}
      {showImportModal && (
        <ExcelImportModal
          onImportComplete={handleImportComplete}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showCreateSpareModal && (
        <CreateSpareModal
          onClose={() => setShowCreateSpareModal(false)}
          onSave={handleSpareCreated}
        />
      )}

      {showIssueModal.show && (
        <IssueSpareModal
          spareId={showIssueModal.spareId!}
          technicians={users.filter(user => user.role === 'technician')}
          onIssue={handleSpareIssued}
          onClose={() => setShowIssueModal({ show: false })}
        />
      )}

      {showAddStockModal && (
        <AddStockModal
          spares={warehouseStock.map(ws => ws.spare).filter((s): s is Spare => s !== undefined)}
          onClose={() => setShowAddStockModal(false)}
          onSave={handleStockAdded}
        />
      )}

      {showTransactionsModal.show && (
        <SpareTransactionsModal
          spareId={showTransactionsModal.spareId!}
          onClose={() => setShowTransactionsModal({ show: false })}
        />
      )}

      {showWarehouseStockModal.show && (
        <WarehouseStockModal
          stockId={showWarehouseStockModal.stockId!}
          onClose={() => setShowWarehouseStockModal({ show: false })}
        />
      )}

      {showReturnModal.show && (
        <ReturnSpareModal
          spareInventoryIds={showReturnModal.spareInventoryIds}
          onReturn={handleSpareReturned}
          onClose={() => setShowReturnModal({ show: false })}
        />
      )}

      {showExportModal && (
        <StockExport
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default WarehouseManagement;