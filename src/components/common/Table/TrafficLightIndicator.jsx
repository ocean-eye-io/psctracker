// src/components/common/Table/TrafficLightIndicator.jsx
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import './TrafficLightIndicator.css'; // Keep this for general classes, but inline styles will override specific properties

const TooltipPortal = ({ children, isVisible, triggerRect }) => {
  if (!isVisible || !triggerRect) return null;

  // Calculate position for the tooltip
  const style = {
    position: 'absolute', // Keep absolute positioning
    top: triggerRect.bottom + window.scrollY + 10, // Position below the trigger, account for scroll
    left: triggerRect.left + window.scrollX, // Position at the left of the trigger, account for scroll
    zIndex: 99999,
    // Prevent tooltip from going off the right edge of the screen
    maxWidth: `calc(100vw - ${triggerRect.left + 20}px)`,
    width: '260px', // Fixed width as per your CSS
    // Initial state for transition (hidden)
    opacity: 0,
    visibility: 'hidden',
    transform: 'translateY(10px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0.2s',
    pointerEvents: 'none',
  };

  // Adjust left if it goes off the right side of the screen
  // Assuming tooltip width is 260px
  if (triggerRect.left + 260 > window.innerWidth) {
    style.left = window.innerWidth - 260 - 10; // 10px padding from right edge
  }

  // Apply the "show" styles if visible
  if (isVisible) {
    style.opacity = 1;
    style.visibility = 'visible';
    style.transform = 'translateY(0)';
    style.transition = 'opacity 0.2s ease, transform 0.2s ease, visibility 0s linear 0s';
    style.pointerEvents = 'auto';
  }

  return ReactDOM.createPortal(
    <div style={style}>
      {children}
    </div>,
    document.body
  );
};

const TrafficLightIndicator = ({ status, tooltipData }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const indicatorRef = useRef(null);

  // Handle show/hide tooltip
  const showTooltip = () => {
    if (indicatorRef.current) {
      setTriggerRect(indicatorRef.current.getBoundingClientRect());
      setIsTooltipVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsTooltipVisible(false);
  };

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
    <div
      ref={indicatorRef}
      // Keep the container class for general layout, but the dot's style is inline
      className="traffic-light-container"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div
        // Inline styles for the traffic light dot, matching your CSS colors
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor:
            normalizedStatus === 'red' ? '#dc3545' : // Standard red
            normalizedStatus === 'yellow' ? '#ffc107' : // Standard yellow
            normalizedStatus === 'green' ? '#28a745' : // Standard green
            '#6c757d', // Standard muted grey
          boxShadow:
            normalizedStatus === 'red' ? '0 0 6px rgba(220, 53, 69, 0.5)' : // Lighter shadow
            normalizedStatus === 'yellow' ? '0 0 6px rgba(255, 193, 7, 0.5)' : // Lighter shadow
            normalizedStatus === 'green' ? '0 0 6px rgba(40, 167, 69, 0.5)' : // Lighter shadow
            '0 0 6px rgba(108, 117, 125, 0.5)', // Lighter shadow
          border: '1px solid rgba(0, 0, 0, 0.2)', // Lighter border
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Keep transition
        }}
        aria-label={`Status: ${normalizedStatus}`}
      />

      {hasFactors && (
        <TooltipPortal isVisible={isTooltipVisible} triggerRect={triggerRect}>
          <div
            // Inline styles for the main tooltip container, matching your CSS light theme
            style={{
              background: '#ffffff', // White background
              borderRadius: '6px',
              padding: '0',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)', // Lighter shadow
              border: '1px solid rgba(0, 123, 255, 0.2)', // Light blue border
              overflow: 'hidden',
              fontFamily: 'Nunito, sans-serif',
              width: '260px', // Ensure width is applied here too
            }}
            onMouseEnter={showTooltip} // Keep tooltip visible if mouse enters it
            onMouseLeave={hideTooltip} // Hide if mouse leaves tooltip
          >
            <div
              // Inline styles for the tooltip header
              style={{
                padding: '8px 12px',
                background: 'linear-gradient(180deg, #e0e8f0, #f7fafd)', // Light header gradient
                borderBottom: '1px solid rgba(0, 123, 255, 0.15)', // Light blue border
              }}
            >
              <h3
                // Inline styles for the tooltip title
                style={{
                  margin: '0',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#333333', // Dark text
                  fontFamily: 'Nunito, sans-serif',
                }}
              >Status Factors</h3>
            </div>

            <div
              // Inline styles for the tooltip body
              style={{
                padding: '6px 0',
                maxHeight: '250px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 123, 255, 0.3) rgba(240, 240, 240, 0.5)', // Light scrollbar colors
                color: '#333333', // Dark text
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              {tooltipData.factors.map((factor, index) => {
                const factorStatus = normalizeStatus(factor.status);

                return (
                  <div
                    key={index}
                    // Inline styles for factor row
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr',
                      gridTemplateRows: 'auto auto',
                      padding: '6px 12px',
                      borderBottom: index < tooltipData.factors.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none', // Lighter border
                      transition: 'background-color 0.2s ease',
                      color: '#333333', // Dark text
                      fontFamily: 'Nunito, sans-serif',
                      background: // Background based on factor status
                        factorStatus === 'red' ? 'rgba(220, 53, 69, 0.08)' : // Light red background
                        factorStatus === 'yellow' ? 'rgba(255, 193, 7, 0.08)' : // Light yellow background
                        factorStatus === 'green' ? 'rgba(40, 167, 69, 0.08)' : 'transparent', // Light green background
                    }}
                  >
                    <div
                      // Inline styles for factor name
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'rgba(51, 51, 51, 0.9)', // Darker text for light theme
                      }}
                    >
                      {factor.name}
                    </div>

                    <div
                      // Inline styles for factor value
                      style={{
                        fontSize: '11px',
                        color: '#333333', // Darker text for light theme
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        // Inline styles for status dot in factor row
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          marginRight: '6px',
                          display: 'inline-block',
                          background: // Background based on factor status
                            factorStatus === 'red' ? '#dc3545' : // Standard red
                            factorStatus === 'yellow' ? '#ffc107' : // Standard yellow
                            factorStatus === 'green' ? '#28a745' : '#6c757d', // Standard muted grey
                          boxShadow: // Lighter shadow
                            factorStatus === 'red' ? '0 0 4px rgba(220, 53, 69, 0.6)' :
                            factorStatus === 'yellow' ? '0 0 4px rgba(255, 193, 7, 0.6)' :
                            factorStatus === 'green' ? '0 0 4px rgba(40, 167, 69, 0.6)' : '0 0 4px rgba(108, 117, 125, 0.6)',
                        }}
                      ></span>
                      {factor.value}
                    </div>

                    {factor.detail && (
                      <div
                        // Inline styles for factor detail
                        style={{
                          gridColumn: '1 / -1', // Span across both columns
                          fontSize: '11px',
                          color: 'rgba(51, 51, 51, 0.6)', // Darker text for light theme
                          fontStyle: 'italic',
                          marginTop: '2px',
                        }}
                      >
                        {factor.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipPortal>
      )}
    </div>
  );
};

export default TrafficLightIndicator;