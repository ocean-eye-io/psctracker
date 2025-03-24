// src/components/common/Table/TrafficLightIndicator.jsx
import React, { useState, useRef } from 'react';
import './TrafficLightIndicator.css';

const TrafficLightIndicator = ({ status, tooltipData }) => {
  // Use refs to handle hover state better
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Normalize status to one of our supported values
  const normalizeStatus = (rawStatus) => {
    if (!rawStatus) return 'grey';
    
    const statusLower = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
    
    if (statusLower === 'red' || statusLower === 'high') return 'red';
    if (statusLower === 'yellow' || statusLower === 'medium') return 'yellow';
    if (statusLower === 'green' || statusLower === 'low') return 'green';
    
    return 'grey';
  };
  
  const normalizedStatus = normalizeStatus(status);
  
  // Only render tooltip if we have factors to display
  const hasFactors = tooltipData && 
                    tooltipData.factors && 
                    tooltipData.factors.length > 0;
  
  return (
    <div className="traffic-light-container" ref={containerRef}>
      <div 
        className={`traffic-light-indicator traffic-light-${normalizedStatus}`}
        aria-label={`Status: ${normalizedStatus}`}
      />
      
      {hasFactors && (
        <div className="traffic-light-tooltip" ref={tooltipRef}>
          <div className="tooltip-header">
            <h3>Vessel Status Factors</h3>
          </div>
          <div className="tooltip-body">
            {tooltipData.factors.map((factor, index) => (
              <div key={index} className={`factor-row factor-${normalizeStatus(factor.status)}`}>
                <div className="factor-name">{factor.name}</div>
                <div className="factor-value">
                  <span className={`status-dot status-${normalizeStatus(factor.status)}`}></span>
                  {factor.value}
                </div>
                <div className="factor-detail">{factor.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficLightIndicator;