// src/components/common/Table/TrafficLightIndicator.jsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './TrafficLightIndicator.css';

const TooltipPortal = ({ children, isVisible, triggerRect }) => {
  if (!isVisible || !triggerRect) return null;
  
  // Calculate position
  const style = {
    position: 'fixed',
    top: triggerRect.bottom + 10,
    left: triggerRect.left,
    zIndex: 99999,
    // Prevent tooltip from going off the right edge of the screen
    maxWidth: `calc(100vw - ${triggerRect.left + 20}px)`,
    width: '260px'
  };
  
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
  const indicatorRef = React.useRef(null);
  
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
      style={{ position: 'relative', display: 'inline-block', marginRight: '8px' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <div 
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: 
            normalizedStatus === 'red' ? '#FF5252' : 
            normalizedStatus === 'yellow' ? '#FFD426' : 
            normalizedStatus === 'green' ? '#2EE086' : '#A0A0A0',
          boxShadow: 
            normalizedStatus === 'red' ? '0 0 6px rgba(255, 82, 82, 0.8)' : 
            normalizedStatus === 'yellow' ? '0 0 6px rgba(255, 212, 38, 0.8)' : 
            normalizedStatus === 'green' ? '0 0 6px rgba(46, 224, 134, 0.8)' : '0 0 6px rgba(160, 160, 160, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          cursor: 'pointer'
        }}
        aria-label={`Status: ${normalizedStatus}`}
      />
      
      {hasFactors && (
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
            <div style={{
              padding: '0px 12px',
              background: 'linear-gradient(180deg, #1a3652, #0f2337)',
              borderBottom: '1px solid rgba(77, 195, 255, 0.2)'
            }}>
              {/* <h3 style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff'
              }}>Status Factors</h3> */}
            </div>
            
            <div style={{
              padding: '6px 0',
              maxHeight: '250px',
              overflowY: 'auto'
            }}>
              {tooltipData.factors.map((factor, index) => {
                const factorStatus = normalizeStatus(factor.status);
                
                return (
                  <div 
                    key={index} 
                    style={{
                      padding: '6px 12px',
                      borderBottom: index < tooltipData.factors.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      background: 
                        factorStatus === 'red' ? 'rgba(255, 82, 82, 0.08)' : 
                        factorStatus === 'yellow' ? 'rgba(255, 212, 38, 0.08)' : 
                        factorStatus === 'green' ? 'rgba(46, 224, 134, 0.08)' : 'transparent'
                    }}
                  >
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '90px 1fr',
                      gridGap: '4px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}>
                        {factor.name}
                      </div>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          marginRight: '6px',
                          background: 
                            factorStatus === 'red' ? '#FF5252' : 
                            factorStatus === 'yellow' ? '#FFD426' : 
                            factorStatus === 'green' ? '#2EE086' : '#A0A0A0',
                          boxShadow: 
                            factorStatus === 'red' ? '0 0 4px rgba(255, 82, 82, 0.6)' : 
                            factorStatus === 'yellow' ? '0 0 4px rgba(255, 212, 38, 0.6)' : 
                            factorStatus === 'green' ? '0 0 4px rgba(46, 224, 134, 0.6)' : '0 0 4px rgba(160, 160, 160, 0.6)'
                        }}></span>
                        {factor.value}
                      </div>
                    </div>
                    
                    {factor.detail && (
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontStyle: 'italic',
                        marginTop: '4px'
                      }}>
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