import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/common/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TechnicianLayout from './components/technician/TechnicianLayout';
import StorekeeperDashboard from './components/warehouse/StorekeeperDashboard';
import SalespersonDashboard from './components/crm/SalespersonDashboard';
import CalibrationLayout from './components/calibration/CalibrationLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import PWAInstallPrompt from './components/common/PWAInstallPrompt';
import { logDeviceInfo } from './utils/device';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, error, user } = useAuth();
  
  // Log device information on mount
  useEffect(() => {
    logDeviceInfo();
    
    // Log viewport dimensions on resize
    const handleResize = () => {
      console.log('Viewport size changed:', {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Loading Application</h1>
          <p className="text-gray-600">Please wait while we prepare your dashboard...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>If this takes too long, please check your internet connection</p>
            <p>and try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle authentication states
  if (error && !isAuthenticated) {
    console.error('Authentication error:', error);
    return <Login />;
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Route to appropriate dashboard based on user role
  console.log('Routing user with role:', user.role, 'to dashboard');
  
  try {
    switch (user.role) {
      case 'admin':
        console.log('Rendering AdminDashboard');
        return <AdminDashboard />;
      case 'technician':
        console.log('Rendering TechnicianLayout');
        return <TechnicianLayout />;
      case 'storekeeper':
        console.log('Rendering StorekeeperDashboard');
        return <StorekeeperDashboard />;
      case 'sales':
        console.log('Rendering SalespersonDashboard');
        return <SalespersonDashboard />;
      case 'calibration':
        console.log('Rendering CalibrationLayout');
        return <CalibrationLayout />;
      default:
        console.warn('Unknown role detected, redirecting to login');
        return <Login />;
    }
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're having trouble loading your dashboard. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <PWAInstallPrompt />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;