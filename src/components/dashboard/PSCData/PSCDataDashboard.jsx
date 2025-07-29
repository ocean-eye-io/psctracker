// src/components/dashboard/PSCData/PSCDataDashboard.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Wifi, WifiOff, Clock } from 'lucide-react';
import './PSCDataStyles.css';

const PSCDataDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Power BI embed URL - Updated with your actual URL
  const POWER_BI_URL = "https://app.powerbi.com/reportEmbed?reportId=ccd569f8-13ca-4a50-abb1-112fdcceeb18&autoAuth=true&ctid=5847cf3f-db1f-4d01-abcf-cbff4bdffc2d";
  
  // Check if Power BI URL is properly configured
  const isPowerBIConfigured = !POWER_BI_URL.includes('YOUR_') && POWER_BI_URL.includes('reportId=');
  
  // Use placeholder if not configured
  const PLACEHOLDER_URL = "about:blank";
  const embedUrl = isPowerBIConfigured ? POWER_BI_URL : PLACEHOLDER_URL;

  useEffect(() => {
    // Set initial connection status
    if (!isPowerBIConfigured) {
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setError('Power BI dashboard not configured');
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

  const refreshDashboard = () => {
    if (!isPowerBIConfigured) {
      setError('Power BI dashboard not configured. Please update the embed URL.');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    
    // Force iframe reload
    const iframe = document.getElementById('psc-powerbi-iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
    
    // Set timeout for loading
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setConnectionStatus('disconnected');
        setError('Dashboard loading timeout. Please try again.');
      }
    }, 30000); // 30 second timeout
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    if (!isFullscreen) {
      // Enter fullscreen
      const elem = document.querySelector('.psc-data-container');
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const openInNewTab = () => {
    if (isPowerBIConfigured) {
      window.open(POWER_BI_URL, '_blank', 'noopener,noreferrer');
    } else {
      alert('Power BI dashboard URL not configured');
    }
  };

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

  // Render placeholder dashboard
  const renderPlaceholder = () => (
    <div className="placeholder-dashboard">
      <div className="placeholder-content">
        <h2>🚢 PSC Analytics Dashboard</h2>
        <p>Power BI integration ready for configuration</p>
      </div>
    </div>
  );

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
    <div className={`psc-data-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <header className="psc-data-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1>PSC Analytics Dashboard</h1>
            {renderConnectionStatus()}
          </div>
          <p className="header-subtitle">
            Comprehensive Port State Control data insights and analytics
            {loadAttempts > 0 && ` (Attempt ${loadAttempts + 1})`}
          </p>
        </div>
        
        <div className="header-controls">
          <button 
            className="control-btn refresh-btn"
            onClick={refreshDashboard}
            title="Refresh Dashboard"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            Refresh
          </button>
          
          <button 
            className="control-btn fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            disabled={!isPowerBIConfigured}
          >
            <Maximize2 size={16} />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
          
          <button 
            className="control-btn external-btn"
            onClick={openInNewTab}
            title="Open in New Tab"
            disabled={!isPowerBIConfigured}
          >
            <ExternalLink size={16} />
            New Tab
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="psc-data-content">
        {/* Show configuration message if Power BI isn't configured */}
        {!isPowerBIConfigured ? (
          renderConfigMessage()
        ) : (
          <>
            {/* Loading Overlay */}
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

            {/* Error Overlay */}
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

            {/* Power BI Iframe */}
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