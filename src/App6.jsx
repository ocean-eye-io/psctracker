// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Main App Content with navigation and protected pages
function AppContent() {
  const [activePage, setActivePage] = useState('fleet');
  const { currentUser, checkAuthStatus } = useAuth();
  
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  const handleOpenInstructions = (vessel) => {
    console.log('Opening instructions for vessel:', vessel);
    // Your implementation here
  };
  
  const handleNavigation = (page) => {
    setActivePage(page);
  };

  // If not authenticated, don't render the main app content
  if (!currentUser) {
    return null;
  }

  return (
    <div className="app">
      <NavigationHeader 
        activePage={activePage}
        onNavigate={handleNavigation}
        userInfo={currentUser}
      />
      
      <main className="app-content">
        {activePage === 'fleet' ? (
          <FleetDashboard
            onOpenInstructions={handleOpenInstructions}
            fieldMappings={fleetFieldMappings}
          />
        ) : activePage === 'defects' ? (
          <DefectsDashboard />
        ) : activePage === 'reporting' ? (
          <VesselReportingPage />
        ) : null}
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
          
          {/* Protected Main App */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect any other routes to the main app */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;