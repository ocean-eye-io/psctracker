import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'; // Added useLocation, Outlet
import { Amplify } from 'aws-amplify';
import awsConfig from './config/aws-config';
import { AuthProvider, useAuth } from './context/AuthContext';
import FloatingChatbot from './components/FloatingChatbot';

// Components
import NavigationHeader from './components/layout/NavigationHeader';
import FleetDashboard from './components/dashboard/fleet/FleetDashboard';
import DefectsDashboard from './components/dashboard/defects/DefectsDashboard';
import VesselReportingPage from './components/dashboard/reporting/VesselReportingPage';
import { fleetFieldMappings } from './components/dashboard/fleet/FleetFieldMappings';

// Auth Components
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import ConfirmSignUp from './components/auth/ConfirmSignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

import './App.css';

// Configure Amplify
Amplify.configure(awsConfig);
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

// New component to wrap NavigationHeader and Outlet for nested routes
function AppLayout() {
  const { currentUser, checkAuthStatus } = useAuth();
  const location = useLocation(); // Get current location to determine active page

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Determine activePage based on current path for NavigationHeader
  const getActivePage = () => {
    if (location.pathname.startsWith('/fleet')) return 'fleet';
    if (location.pathname.startsWith('/defects')) return 'defects';
    if (location.pathname.startsWith('/reporting')) return 'reporting';
    return 'fleet'; // Default to fleet if path doesn't match
  };

  // If not authenticated, don't render the main app content (handled by ProtectedRoute)
  // This check might be redundant if ProtectedRoute is always used correctly
  if (!currentUser) {
    return null;
  }

  return (
    <div className="app">
      <NavigationHeader
        activePage={getActivePage()} // Pass active page based on URL
        userInfo={currentUser}
        // onNavigate prop is no longer needed as NavigationHeader will use react-router-dom's navigate directly
      />
      <main className="app-content">
        <Outlet /> {/* This is where nested routes (dashboards) will render */}
      </main>
    </div>
  );
}

// Main App component with routing
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

          {/* Protected Main App Routes with nested dashboards */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout /> {/* Render the layout for protected pages */}
              </ProtectedRoute>
            }
          >
            {/* Nested routes for dashboards */}
            <Route index element={<Navigate to="/fleet" replace />} /> {/* Default to /fleet when at root */}
            <Route path="fleet" element={<FleetDashboard fieldMappings={fleetFieldMappings} />} />
            <Route path="defects" element={<DefectsDashboard />} />
            <Route path="reporting" element={<VesselReportingPage />} />
          </Route>

          {/* Catch-all for unhandled routes, redirect to the main app if authenticated, otherwise to login */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;