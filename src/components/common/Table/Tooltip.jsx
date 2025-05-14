// Add this to your components folder, e.g., src/components/common/Tooltip.jsx
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

// Reusable TooltipPortal component
export const TooltipPortal = ({ children, isVisible, triggerRect }) => {
  if (!isVisible || !triggerRect) return null;
  
  // Calculate position
  const style = {
    position: 'fixed',
    top: triggerRect.bottom + 10,
    left: triggerRect.left,
    zIndex: 99999,
    // Prevent tooltip from going off the right edge of the screen
    maxWidth: `calc(100vw - ${triggerRect.left + 20}px)`,
    width: '220px'
  };
  
  return ReactDOM.createPortal(
    <div style={style}>
      {children}
    </div>,
    document.body
  );
};

// Reusable Tooltip component
export const Tooltip = ({ title, content, children }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const containerRef = useRef(null);
  
  // Handle show/hide tooltip
  const showTooltip = () => {
    if (containerRef.current) {
      setTriggerRect(containerRef.current.getBoundingClientRect());
      setIsTooltipVisible(true);
    }
  };
  
  const hideTooltip = () => {
    setIsTooltipVisible(false);
  };
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%'
      }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      
      <TooltipPortal isVisible={isTooltipVisible} triggerRect={triggerRect}>
        <div 
          style={{
            backgroundColor: '#162d48',
            borderRadius: '6px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(77, 195, 255, 0.3)',
            overflow: 'hidden'
          }}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          {title && (
            <div style={{
              padding: '8px 12px',
              background: 'linear-gradient(180deg, #1a3652, #0f2337)',
              borderBottom: '1px solid rgba(77, 195, 255, 0.2)'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff'
              }}>{title}</h3>
            </div>
          )}
          
          <div style={{
            padding: '8px 12px',
            maxHeight: '250px',
            overflowY: 'auto',
            fontSize: '11px',
            color: '#fff'
          }}>
            {content}
          </div>
        </div>
      </TooltipPortal>
    </div>
  );
};

// Special case for vessel details tooltip
export const VesselDetailsTooltip = ({ vessel, children }) => {
  // Check if we have tooltipDetails from the enhanced vessel object
  const hasTooltipDetails = vessel.tooltipDetails && vessel.tooltipDetails.length > 0;
  
  return (
    <Tooltip
      title={(vessel.vessel_name || 'Unknown Vessel').toUpperCase()}
      content={
        <>
          {hasTooltipDetails ? (
            // Render the enhanced tooltip details if available
            <div>
              {vessel.tooltipDetails.map((detail, index) => (
                <div key={index} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr',
                  gridGap: '4px',
                  marginBottom: index < vessel.tooltipDetails.length - 1 ? '6px' : 0,
                  borderBottom: index < vessel.tooltipDetails.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  paddingBottom: index < vessel.tooltipDetails.length - 1 ? '6px' : 0
                }}>
                  <div style={{
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {detail.label.toUpperCase()}
                  </div>
                  <div>
                    {detail.label.toLowerCase() === 'owner' 
                      ? (detail.value || 'Not available').toUpperCase() 
                      : detail.value || 'Not available'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback to the original display
            <>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gridGap: '4px',
                marginBottom: '6px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '6px'
              }}>
                <div style={{
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  IMO
                </div>
                <div>
                  {vessel.imo_no || 'Unknown'}
                </div>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gridGap: '4px'
              }}>
                <div style={{
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>
                  OWNER
                </div>
                <div>
                  {(vessel.owner || 'Not available').toUpperCase()}
                </div>
              </div>
            </>
          )}
        </>
      }
    >
      {children}
    </Tooltip>
  );
};

// Simple tooltip for text content
export const TextTooltip = ({ text, children }) => {
  return (
    <Tooltip
      content={text}
    >
      {children}
    </Tooltip>
  );
};