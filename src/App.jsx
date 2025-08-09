// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import awsConfig from './config/aws-config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ToastProvider } from './components/common/ui/ToastContext';
import { Toaster } from 'react-hot-toast';

import FloatingChatbot from './components/FloatingChatbot';

// Components
import NavigationHeader from './components/layout/NavigationHeader';
import NoAccessPage from './components/common/NoAccessPage';
import FleetDashboard from './components/dashboard/fleet/FleetDashboard';
import DefectsDashboard from './components/dashboard/defects/DefectsDashboard';
import VesselReportingPage from './components/dashboard/reporting/VesselReportingPage';
import { fleetFieldMappings } from './components/dashboard/fleet/FleetFieldMappings';
import AdminDashboard from './components/dashboard/admin/AdminDashboard'; 
import PSCDataDashboard from './components/dashboard/PSCData/PSCDataDashboard';
import DocumentsDashboard from './components/dashboard/Portcirculars/DocumentsDashboard';

// Auth Components
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ConfirmSignUp from './components/auth/ConfirmSignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

import './App.css';

// Configure Amplify
try {
  Amplify.configure(awsConfig);
  console.log("Amplify configured successfully");
} catch (error) {
  console.error("Error configuring Amplify:", error);
}

// Module mapping for navigation - Updated with PSC DATA
const MODULE_ROUTE_MAP = {
  'PSC TRACKER': '/fleet',
  'DEFECTS REGISTER': '/defects', 
  'PSC REPORTING': '/reporting',
  'PSC DATA': '/psc-data',  // Added PSC DATA mapping
  'Files upload': '/files',
  'Upload Circulars': '/circulars',
  'ADMIN': '/admin'
};

// Landing Page Component that redirects based on user modules
const LandingPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userModules, setUserModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.userId) {
      fetchUserModules();
    }
  }, [currentUser]);

  const fetchUserModules = async () => {
    try {
      const response = await fetch(`https://bavzk3zqphycvshhqklb72l4cu0cnisv.lambda-url.ap-south-1.on.aws/user/modules?user_id=${currentUser.userId}`);
      const data = await response.json();
      
      if (response.ok && data.length > 0) {
        setUserModules(data);
        // Redirect to first module in sequence
        const firstModuleRoute = MODULE_ROUTE_MAP[data[0].module_name];
        if (firstModuleRoute) {
          navigate(firstModuleRoute, { replace: true });
        } else {
          navigate('/fleet', { replace: true }); // fallback
        }
      } else {
        setUserModules([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user modules:', error);
      setUserModules([]);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading your workspace...</div>;
  }

  // Show no access page if user has no modules
  if (userModules.length === 0) {
    return <NoAccessPage />;
  }

  return <div className="loading-spinner">Redirecting...</div>;
};

// Enhanced Protected Route component with module checking
const ProtectedRoute = ({ children, requiredModule = null }) => {
  const { currentUser, loading } = useAuth();
  const [userModules, setUserModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.userId) {
      fetchUserModules();
    }
  }, [currentUser]);

  const fetchUserModules = async () => {
    try {
      const response = await fetch(`https://bavzk3zqphycvshhqklb72l4cu0cnisv.lambda-url.ap-south-1.on.aws/user/modules?user_id=${currentUser.userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setUserModules(data);
        
        if (requiredModule) {
          // Check if user has access to this specific module
          const hasModuleAccess = data.some(module => 
            MODULE_ROUTE_MAP[module.module_name] === requiredModule
          );
          
          if (!hasModuleAccess && data.length > 0) {
            // Redirect to first available module
            const firstModuleRoute = MODULE_ROUTE_MAP[data[0].module_name] || '/fleet';
            navigate(firstModuleRoute, { replace: true });
            return;
          }
          
          setHasAccess(hasModuleAccess || data.length === 0);
        } else {
          setHasAccess(true);
        }
      } else {
        setUserModules([]);
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error fetching user modules:', error);
      setUserModules([]);
      setHasAccess(false);
    } finally {
      setModulesLoading(false);
    }
  };

  if (loading || modulesLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If user has no modules at all, show no access page
  if (userModules.length === 0) {
    return <NoAccessPage />;
  }

  // If checking specific module access and user doesn't have it, they'll be redirected above
  if (requiredModule && !hasAccess) {
    return <div className="loading-spinner">Redirecting...</div>;
  }

  return children;
};

// Helper to get activePage from URL - Updated with PSC DATA
const getActivePageFromPath = (pathname) => {
  if (pathname.startsWith('/fleet')) return 'fleet';
  if (pathname.startsWith('/defects')) return 'defects';
  if (pathname.startsWith('/reporting')) return 'reporting';
  if (pathname.startsWith('/psc-data')) return 'psc-data';  // Added PSC DATA
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/files')) return 'files';
  if (pathname.startsWith('/circulars')) return 'circulars';
  return 'fleet'; // default
};

// Enhanced Layout for protected pages with module-aware navigation
const ProtectedLayout = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const activePage = getActivePageFromPath(location.pathname);
  const [userModules, setUserModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  // Handle modules loaded callback from NavigationHeader
  const handleModulesLoaded = (modules) => {
    setUserModules(modules);
    setModulesLoading(false);
  };

  // Handle navigation between modules - Updated with PSC DATA
  const handleNavigate = (pageId) => {
    const module = userModules.find(m => {
      // Map pageId to module names
      const moduleMap = {
        'fleet': 'PSC TRACKER',
        'defects': 'DEFECTS REGISTER', 
        'reporting': 'PSC REPORTING',
        'psc-data': 'PSC DATA',  // Added PSC DATA mapping
        'files': 'Files upload',
        'circulars': 'Upload Circulars',
        'admin': 'ADMIN'
      };
      return m.module_name === moduleMap[pageId];
    });
    
    if (module) {
      const route = MODULE_ROUTE_MAP[module.module_name];
      if (route) {
        window.location.href = route;
      }
    }
  };

  return (
    <div className="app">
      <NavigationHeader
        activePage={activePage}
        userInfo={currentUser}
        onNavigate={handleNavigate}
        onModulesLoaded={handleModulesLoaded}
      />
      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

const AppContent = () => {
  const { currentUser, loading } = useAuth();

  // Show loading while auth is being determined
  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <Routes>
      {/* Auth Routes - only accessible when NOT authenticated */}
      <Route 
        path="/login" 
        element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/signup" 
        element={!currentUser ? <SignUp /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/confirm-signup" 
        element={!currentUser ? <ConfirmSignUp /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/forgot-password" 
        element={!currentUser ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/reset-password" 
        element={!currentUser ? <ResetPassword /> : <Navigate to="/dashboard" replace />} 
      />

      {/* Root path: Redirect based on auth status */}
      <Route
        path="/"
        element={
          currentUser ? (
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Dashboard route - this is where LandingPage redirects to after determining user's modules */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected App Routes with Module Access Control */}
      <Route
        path="/fleet"
        element={
          <ProtectedRoute requiredModule="/fleet">
            <ProtectedLayout>
              <FleetDashboard fieldMappings={fleetFieldMappings} />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/defects"
        element={
          <ProtectedRoute requiredModule="/defects">
            <ProtectedLayout>
              <DefectsDashboard />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reporting"
        element={
          <ProtectedRoute requiredModule="/reporting">
            <ProtectedLayout>
              <VesselReportingPage />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* NEW: PSC Data Analytics Route */}
      <Route
        path="/psc-data"
        element={
          <ProtectedRoute requiredModule="/psc-data">
            <ProtectedLayout>
              <PSCDataDashboard />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/files"
        element={
          <ProtectedRoute requiredModule="/files">
            <ProtectedLayout>
              <DocumentsDashboard 
                apiBaseUrl="https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws/"
                currentUser={{
                  name: currentUser?.name || currentUser?.username || currentUser?.email || 'User',
                  id: currentUser?.userId || currentUser?.sub
                }}
              />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Upload Circulars Route */}
      <Route
        path="/circulars"
        element={
          <ProtectedRoute requiredModule="/circulars">
            <ProtectedLayout>
              <DocumentsDashboard 
                apiBaseUrl="https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws/"
                currentUser={{
                  name: currentUser?.name || currentUser?.username || currentUser?.email || 'User',
                  id: currentUser?.userId || currentUser?.sub
                }}
              />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredModule="/admin">
            <ProtectedLayout>
              <AdminDashboard />
            </ProtectedLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect based on auth status */}
      <Route
        path="*"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <ToastProvider>
          <BrowserRouter>
            <FloatingChatbot />
            <AppContent />
            <Toaster position="top-right" />
          </BrowserRouter>
        </ToastProvider>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;