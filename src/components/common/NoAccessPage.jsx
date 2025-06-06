// src/components/common/NoAccessPage.jsx
import React from 'react';
import { Lock, AlertTriangle, Mail, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import './NoAccessPage.css';

const NoAccessPage = () => {
  const { signOut, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if signout fails, redirect to login
      navigate('/login');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getUserEmail = () => {
    return currentUser?.email || 'your account';
  };

  return (
    <div className="no-access-container">
      <div className="no-access-content">
        <div className="no-access-header">
          <Logo width="120" height="120" className="no-access-logo" />
          <h1>FleetWatch</h1>
        </div>
        
        <div className="no-access-message">
          <div className="no-access-icon">
            <Lock size={48} />
          </div>
          
          <h2>Access Restricted</h2>
          <p>You currently don't have access to any modules in the FleetWatch system.</p>
          
          <div className="no-access-details">
            <div className="detail-item">
              <AlertTriangle size={20} />
              <span>No modules have been assigned to {getUserEmail()}</span>
            </div>
            <div className="detail-item">
              <Mail size={20} />
              <span>Please contact your system administrator for access</span>
            </div>
          </div>
          
          <div className="no-access-actions">
            <button 
              className="contact-admin-btn"
              onClick={() => window.location.href = 'mailto:admin@fleetwatch.com'}
            >
              <Mail size={16} />
              Contact Administrator
            </button>
            
            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              title="Refresh to check for new module assignments"
            >
              <RefreshCw size={16} />
              Refresh Access
            </button>
            
            <button 
              className="logout-btn"
              onClick={handleSignOut}
              title="Sign out to try a different account"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;