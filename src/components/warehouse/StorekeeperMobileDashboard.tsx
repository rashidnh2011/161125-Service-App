import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { WarehouseStock, SpareInventory, User, Spare } from '../../types';
import MobileIssueSpareModal from './MobileIssueSpareModal';
import MobileEditAssignmentModal from './MobileEditAssignmentModal';
import AddStockModal from './AddStockModal';
import {
  LogOut,
  User as UserIcon,
  Package,
  ArrowRight,
  AlertTriangle,
  Check,
  Plus,
  Search,
  Eye,
  BarChart3,
  Smartphone,
  ArrowLeft,
  Home,
  Download,
  Edit3,
  RefreshCw,
  UserCheck,
  Wrench,
  Settings,
  Activity,
  TrendingUp
} from 'lucide-react';

type MobileViewType = 'dashboard' | 'inventory' | 'assignments' | 'issue-spare';

interface SpareAssignmentCardProps {
  stock: WarehouseStock & { spare: Spare };
  onIssue: (spareId: number) => void;
  onViewDetails: (stockId: number) => void;
  onViewHistory: (spareId: number) => void;
}

const SpareAssignmentCard: React.FC<SpareAssignmentCardProps> = ({
  stock,
  onIssue,
  onViewDetails,
  onViewHistory
}) => {
  const getStockStatusIcon = () => {
    if (stock.available_quantity <= stock.minimum_stock_level) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    return <Check className="w-5 h-5 text-green-500" />;
  };

  const getStockStatus = () => {
    if (stock.available_quantity <= stock.minimum_stock_level) {
      return { text: 'Low Stock', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    }
    return { text: 'Normal', bgColor: 'bg-green-100', textColor: 'text-green-800' };
  };

  const status = getStockStatus();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{stock.spare?.name || 'N/A'}</h3>
          <p className="text-sm text-gray-600">{stock.spare?.part_number || 'N/A'}</p>
          <p className="text-sm font-medium text-green-600">AED {stock.spare?.price || '0.00'}</p>
        </div>
        <div className="flex items-center space-x-2">
          {getStockStatusIcon()}
          <span className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
            {status.text}
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
            onClick={() => onViewDetails(stock.id)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">Details</span>
          </button>
          <button
            onClick={() => onIssue(stock.spare_id)}
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
            onClick={() => onViewHistory(stock.spare_id)}
            className="flex items-center space-x-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100"
            title="View Transactions"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">History</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface InventoryCardProps {
  item: SpareInventory;
  onReturn: (spareInventoryIds: number[]) => void;
  onEdit?: (item: SpareInventory) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ item, onReturn, onEdit }) => {
  const getStatusBadge = (status: string) => {
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="flex items-center space-x-1 px-3 py-1 bg-yellow-50 text-yellow-600 rounded-md hover:bg-yellow-100"
              title="Edit Assignment"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-xs">Edit</span>
            </button>
          )}
          <button
            onClick={() => onReturn([item.id])}
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
    </div>
  );
};

const StorekeeperMobileDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<MobileViewType>('dashboard');
  const [warehouseStock, setWarehouseStock] = useState<Array<WarehouseStock & { spare: Spare }>>([]);
  const [spareInventory, setSpareInventory] = useState<SpareInventory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIssueModal, setShowIssueModal] = useState<{ show: boolean; spareId?: number }>({ show: false });
  const [showEditModal, setShowEditModal] = useState<{ show: boolean; item?: SpareInventory }>({ show: false });
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWA Installation Effect
  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  useEffect(() => {
    // Add a small delay to prevent rapid API calls during initialization
    const initTimer = setTimeout(() => {
      loadData();
      loadUsers();
      loadSpares();
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockRes] = await Promise.all([
        api.getWarehouseStock() as Promise<{ success: boolean; data?: (WarehouseStock & { spare: Spare })[] }>
      ]);

      if (stockRes?.success && stockRes.data) {
        const validStock = stockRes.data.filter(stock => stock.spare !== undefined);
        setWarehouseStock(validStock);
      }
    } catch (error) {
      console.error('Failed to load warehouse data:', error);
      // Don't show error to user, just log it
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.warn('Authentication issue detected - user may need to re-login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const usersRes = await api.getUsers() as { success: boolean; data?: User[] };
      if (usersRes?.success && usersRes.data) {
        setUsers(usersRes.data);
      } else {
        console.warn('Failed to load users from API, using fallback');
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // For storekeepers, we only need technicians for spare assignments
      // If the users list fails, we'll handle it gracefully in the UI
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadSpareInventory = async () => {
    try {
      const response = await api.getSpareInventory({}) as { success: boolean; data?: SpareInventory[] };
      if (response.success && response.data) {
        setSpareInventory(response.data);
      }
    } catch (error) {
      console.error('Failed to load spare inventory:', error);
      // Don't log out user for non-critical API failures
      // Just set empty inventory array and continue
      setSpareInventory([]);
    }
  };

  const loadSpares = async () => {
    try {
      const response = await api.getSpares() as { success: boolean; data?: Spare[] };
      if (response.success && response.data) {
        setSpares(response.data);
      } else {
        console.warn('Failed to load spares from API, using fallback');
        setSpares([]);
      }
    } catch (error) {
      console.error('Failed to load spares:', error);
      setSpares([]);
    }
  };

  const handleIssueSpare = (spareId: number) => {
    setShowIssueModal({ show: true, spareId });
  };

  const handleViewStockDetails = (stockId: number) => {
    // Implement view stock details functionality
    console.log('View stock details for:', stockId);
  };

  const handleViewHistory = (spareId: number) => {
    // Implement view history functionality
    console.log('View history for spare:', spareId);
  };

  const handleReturnSpares = (spareInventoryIds: number[]) => {
    // Implement return functionality
    console.log('Return spares:', spareInventoryIds);
  };

  const handleEditAssignment = (item: SpareInventory) => {
    setShowEditModal({ show: true, item });
  };

  const handleSpareIssued = () => {
    setShowIssueModal({ show: false });
    loadData();
    loadSpareInventory();
  };

  const handleAssignmentUpdated = () => {
    setShowEditModal({ show: false });
    loadData();
    loadSpareInventory();
    loadSpares();
  };

  const handleStockAdded = () => {
    setShowAddStockModal(false);
    loadData();
    loadSpares();
  };

  const technicians = users.filter(user => user.role === 'technician');

  const filteredStock = warehouseStock.filter(stock => {
    const searchLower = searchTerm.toLowerCase();
    return (
      stock.spare?.name?.toLowerCase().includes(searchLower) ||
      stock.spare?.part_number?.toLowerCase().includes(searchLower) ||
      stock.spare?.id.toString().includes(searchTerm)
    );
  });

  const menuItems = [
    { id: 'dashboard' as MobileViewType, label: 'Dashboard', icon: Home },
    { id: 'inventory' as MobileViewType, label: 'Inventory', icon: Package },
    { id: 'assignments' as MobileViewType, label: 'Assignments', icon: UserCheck },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-4 space-y-4">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Welcome back, {user?.name || user?.username || 'Storekeeper'}
                  </h2>
                  <p className="text-blue-100">Mobile Dashboard</p>
                </div>
              </div>
              <p className="text-blue-100 text-sm">
                Manage warehouse inventory and technician assignments on the go.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrentView('inventory')}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 block">Inventory</span>
                <span className="text-xs text-gray-500">View stock levels</span>
              </button>

              <button
                onClick={() => setCurrentView('assignments')}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <UserCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900 block">Assignments</span>
                <span className="text-xs text-gray-500">Manage assignments</span>
              </button>
            </div>

            {/* Add Stock Action */}
            <button
              onClick={() => setShowAddStockModal(true)}
              className="w-full bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Add Stock</span>
            </button>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{warehouseStock.length}</div>
                  <div className="text-sm text-gray-600">Total Spares</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {warehouseStock.filter(s => s.available_quantity > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {warehouseStock.filter(s => s.available_quantity <= s.minimum_stock_level).length}
                  </div>
                  <div className="text-sm text-gray-600">Low Stock</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {spareInventory.filter(s => s.status === 'issued').length}
                  </div>
                  <div className="text-sm text-gray-600">Issued</div>
                </div>
              </div>
            </div>

            {/* PWA Install Section */}
            {isInstallable && !isInstalled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900">Install App</h3>
                    <p className="text-xs text-blue-700">
                      Install BizOps360 on your device for quick access
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Install App
                </button>
              </div>
            )}

            {/* Device Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Smartphone className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Mobile Mode</span>
              </div>
              <p className="text-xs text-yellow-700">
                You're using the mobile-optimized interface for better performance on smaller screens.
              </p>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="p-4">
            {/* Search */}
            <div className="mb-4">
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

            {/* Stock Cards */}
            <div className="space-y-4">
              {filteredStock.map((stock) => (
                <SpareAssignmentCard
                  key={stock.id}
                  stock={stock}
                  onIssue={handleIssueSpare}
                  onViewDetails={handleViewStockDetails}
                  onViewHistory={handleViewHistory}
                />
              ))}

              {filteredStock.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No warehouse stock found.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'assignments':
        return (
          <div className="p-4">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Assignment Cards */}
            <div className="space-y-4">
              {spareInventory
                .filter(item => item.technician)
                .map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onReturn={handleReturnSpares}
                    onEdit={handleEditAssignment}
                  />
                ))}

              {spareInventory.filter(item => item.technician).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No technician assignments found.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'issue-spare':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Spare Parts</h3>
            {/* Issue spare interface would go here */}
            <div className="text-center py-8 text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Issue spare interface coming soon...</p>
            </div>
          </div>
        );

      default:
        return <div>Content not available</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {currentView !== 'dashboard' && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex items-center space-x-2">
              <img
                src="https://arabscalecalibration.com/logo.png"
                alt="BizOps360 Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-gray-900">BizOps360</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isInstallable && !isInstalled && currentView === 'dashboard' && (
              <button
                onClick={handleInstallClick}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Install PWA"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.name || user?.username || 'Storekeeper'}
            </span>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Mobile Optimized */}
      <nav className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="grid grid-cols-3 gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add bottom padding for mobile navigation */}
      <div className="h-20" />

      {/* Modals */}
      {showIssueModal.show && (
        <MobileIssueSpareModal
          spareId={showIssueModal.spareId!}
          technicians={technicians}
          onIssue={handleSpareIssued}
          onClose={() => setShowIssueModal({ show: false })}
        />
      )}

      {showEditModal.show && showEditModal.item && (
        <MobileEditAssignmentModal
          item={showEditModal.item}
          technicians={technicians}
          onUpdate={handleAssignmentUpdated}
          onClose={() => setShowEditModal({ show: false })}
        />
      )}

      {showAddStockModal && (
        <AddStockModal
          spares={spares}
          onSave={handleStockAdded}
          onClose={() => setShowAddStockModal(false)}
        />
      )}
    </div>
  );
};

export default StorekeeperMobileDashboard;
