// src/components/common/NoAccessPage.jsx
import React from 'react';
import { Lock, AlertTriangle, Mail } from 'lucide-react';
import Logo from '../Logo';
import './NoAccessPage.css';

const NoAccessPage = () => {
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
              <span>No modules have been assigned to your account</span>
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
              Contact Administrator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;