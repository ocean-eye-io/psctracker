// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import awsConfig from './config/aws-config';
import { AuthProvider, useAuth } from './context/AuthContext';
import FloatingChatbot from './components/FloatingChatbot';


import NavigationHeader from './components/layout/NavigationHeader';
import FleetDashboard from './components/dashboard/fleet/FleetDashboard';
import DefectsDashboard from './components/dashboard/defects/DefectsDashboard';
import VesselReportingPage from './components/dashboard/reporting/VesselReportingPage';
import AdminDashboard from './components/dashboard/admin/AdminDashboard'; // Import AdminDashboard
import { fleetFieldMappings } from './components/dashboard/fleet/FleetFieldMappings';

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

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Helper to get activePage from URL
const getActivePageFromPath = (pathname) => {
  if (pathname.startsWith('/fleet')) return 'fleet';
  if (pathname.startsWith('/defects')) return 'defects';
  if (pathname.startsWith('/reporting')) return 'reporting';
  if (pathname.startsWith('/admin')) return 'admin'; // Add admin path
  return 'fleet'; // default
};

// Layout for protected pages
const ProtectedLayout = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const activePage = getActivePageFromPath(location.pathname);

  return (
    <div className="app">
      <NavigationHeader
        activePage={activePage}
        userInfo={currentUser}
      />
      <main className="app-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <FloatingChatbot />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/confirm-signup" element={<ConfirmSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected App Routes */}
          <Route
            path="/fleet"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <FleetDashboard fieldMappings={fleetFieldMappings} />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/defects"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <DefectsDashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reporting"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <VesselReportingPage />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          {/* New Admin Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <AdminDashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          {/* Default route: redirect to /fleet */}
          <Route
            path="/"
            element={<Navigate to="/fleet" replace />}
          />

          {/* Catch-all: redirect to /fleet */}
          <Route
            path="*"
            element={<Navigate to="/fleet" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;