// src/components/dashboard/PSCData/PSCDataDashboard.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'; // Removed ExternalLink, Maximize2
import './PSCDataStyles.css';

const PSCDataDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  // const [isFullscreen, setIsFullscreen] = useState(false); // Removed
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Power BI embed URL - Updated with your actual URL and chromeless parameter
  const POWER_BI_URL = "https://app.powerbi.com/view?r=eyJrIjoiYjZmYzBlZDgtNjkwYS00ZmIxLTljNWQtYTUzMTFiYzg2MzdhIiwidCI6IjU4NDdjZjNmLWRiMWYtNGQwMS1hYmNmLWNiZmY0YmRmZmMyZCIsImMiOjEwfQ%3D%3D";
  
  // Check if Power BI URL is properly configured
  const isPowerBIConfigured = !POWER_BI_URL.includes('YOUR_') && POWER_BI_URL.includes('r=');
  
  // Use placeholder if not configured
  const PLACEHOLDER_URL = "about:blank";
  const embedUrl = isPowerBIConfigured ? POWER_BI_URL : PLACEHOLDER_URL;

  useEffect(() => {
    if (!isPowerBIConfigured) {
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setError('Power BI dashboard not configured');
    } else {
      setIsLoading(true);
      setConnectionStatus('connecting');
      setError(null);
    }
  }, [isPowerBIConfigured]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setConnectionStatus('connected');
    setError(null);
    console.log('Power BI dashboard loaded successfully');
  };

  const handleIframeError = (event) => {
    console.error('Power BI iframe load error:', event);
    setIsLoading(false);
    setConnectionStatus('disconnected');
    setError('Failed to load PSC Analytics dashboard. Please check your connection and permissions.');
    setLoadAttempts(prev => prev + 1);
  };

  // If you still want a refresh mechanism, keep this, otherwise remove
  const refreshDashboard = () => {
    if (!isPowerBIConfigured) {
      setError('Power BI dashboard not configured. Please update the embed URL.');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setLoadAttempts(prev => prev + 1);
    
    const iframe = document.getElementById('psc-powerbi-iframe');
    if (iframe) {
      iframe.src = embedUrl;
    }
    
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setConnectionStatus('disconnected');
        setError('Dashboard loading timeout. Please try again.');
      }
    }, 30000);
  };

  // Removed toggleFullscreen and openInNewTab functions

  // Render connection status indicator
  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { icon: Wifi, text: 'Connected', className: 'connected' },
      disconnected: { icon: WifiOff, text: 'Disconnected', className: 'disconnected' },
      connecting: { icon: Clock, text: 'Connecting', className: 'connecting' }
    };

    const config = statusConfig[connectionStatus];
    const IconComponent = config.icon;

    return (
      <div className={`connection-status ${config.className}`}>
        <IconComponent size={12} />
        <span>{config.text}</span>
      </div>
    );
  };

  // Render configuration message
  const renderConfigMessage = () => (
    <div className="config-message">
      <h3>Power BI Dashboard Configuration Required</h3>
      <p>Please configure your Power BI embed URL to display the analytics dashboard.</p>
      <ul>
        <li>Update the POWER_BI_URL in PSCDataDashboard.jsx</li>
        <li>Ensure proper authentication tokens and permissions</li>
        <li>Verify report ID and tenant ID are correct</li>
        <li>Check that the report is published and accessible</li>
      </ul>
      <button className="retry-btn" onClick={() => window.location.reload()}>
        <RefreshCw size={16} />
        Reload Page
      </button>
    </div>
  );

  return (
    <div className="psc-data-container"> {/* Removed fullscreen class logic */}
      {/* Header */}
      <header className="psc-data-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1>PSC Analytics Dashboard</h1>
            {renderConnectionStatus()}
          </div>
          <p className="header-subtitle">
            Comprehensive Port State Control data insights and analytics
            {loadAttempts > 0 && ` (Attempt ${loadAttempts})`}
          </p>
        </div>
        
        {/* Removed header-controls div entirely */}
      </header>

      {/* Dashboard Content */}
      <div className="psc-data-content">
        {!isPowerBIConfigured ? (
          renderConfigMessage()
        ) : (
          <>
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner">
                  <RefreshCw size={32} className="spinning" />
                  {/* <p>Loading PSC Analytics Dashboard...</p> */}
                  <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                    {/* This may take a few moments */}
                  </p>
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className="error-overlay">
                <div className="error-content">
                  <h3>Dashboard Unavailable</h3>
                  <p>{error}</p>
                  {loadAttempts > 2 ? (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '14px' }}>
                        Multiple connection attempts failed. This could be due to:
                      </p>
                      <ul style={{ textAlign: 'left', fontSize: '13px' }}>
                        <li>Network connectivity issues</li>
                        <li>Power BI service unavailability</li>
                        <li>Authentication or permission problems</li>
                        <li>Incorrect report configuration</li>
                      </ul>
                    </div>
                  ) : null}
                  <button className="retry-btn" onClick={refreshDashboard}>
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                </div>
              </div>
            )}

            <iframe
              id="psc-powerbi-iframe"
              src={embedUrl}
              title="PSC Analytics Dashboard"
              className="powerbi-iframe"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              frameBorder="0"
              allowFullScreen
              style={{ 
                display: (isLoading || error) ? 'none' : 'block'
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PSCDataDashboard;