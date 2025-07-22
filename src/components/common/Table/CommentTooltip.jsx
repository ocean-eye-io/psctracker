import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const CommentTooltip = ({
  children,
  comment,
  onEditClick,
  usePortal = true,
  placement = 'auto',
  container,
  boundary = 'viewport',
  preventOverflow = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState('bottom');
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimated tooltip dimensions (will be refined after render)
    const tooltipWidth = 320;
    const tooltipHeight = 80;
    
    let top = triggerRect.bottom + 12;
    let left = triggerRect.left + (triggerRect.width / 2);
    let arrow = 'top'; // Arrow points up (tooltip below trigger)

    // Check if tooltip fits below trigger
    if (top + tooltipHeight > viewportHeight - 20) {
      // Place above trigger
      top = triggerRect.top - tooltipHeight - 12;
      arrow = 'bottom'; // Arrow points down (tooltip above trigger)
    }

    // Center horizontally but keep within viewport
    left = Math.max(20, Math.min(left - tooltipWidth / 2, viewportWidth - tooltipWidth - 20));

    // If tooltip is very close to trigger horizontally, adjust arrow position
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const tooltipLeft = left;
    const tooltipRight = left + tooltipWidth;
    
    let arrowLeft = '50%';
    if (triggerCenter < tooltipLeft + 30) {
      arrowLeft = '20px';
    } else if (triggerCenter > tooltipRight - 30) {
      arrowLeft = 'calc(100% - 20px)';
    }

    setPosition({ top, left, arrowLeft });
    setArrowPosition(arrow);
  };

  const showTooltip = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const hideTooltip = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsVisible(false);
    if (onEditClick) {
      onEditClick();
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure DOM is updated
      setTimeout(calculatePosition, 10);
      
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="comment-tooltip-modern"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 10001,
        minWidth: '200px',
        maxWidth: '320px',
        
        // Modern glassmorphism design
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        
        // Subtle border and shadow
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        
        // Multi-layered shadow for depth
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.12),
          0 2px 16px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.6)
        `,
        
        // Typography and spacing
        padding: '16px 20px',
        fontSize: '14px',
        lineHeight: '1.5',
        
        // Animation
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? '0' : '8px'}) scale(${isVisible ? '1' : '0.95'})`,
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        
        // Prevent text selection issues
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Content container */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Comment text */}
        <div style={{
          flex: 1,
          color: '#1a202c', // Very dark text for maximum contrast
          fontSize: '14px',
          lineHeight: '1.6',
          fontWeight: '400',
          wordBreak: 'break-word',
          textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)', // White text shadow for extra contrast
        }}>
          {comment && comment.trim() ? (
            <span>{comment}</span>
          ) : (
            <span style={{ 
              color: '#718096', 
              fontStyle: 'italic',
              textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
            }}>
              Click to add a comment
            </span>
          )}
        </div>

        {/* Edit button */}
        {onEditClick && (
          <button
            onClick={handleEditClick}
            style={{
              // Button styling
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              
              // Modern button effects
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              
              // Flex properties
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              
              // Text styling
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px) scale(1.05)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'translateY(0) scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.target.style.transform = 'translateY(-1px) scale(1.05)';
            }}
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Arrow */}
      <div
        style={{
          position: 'absolute',
          left: position.arrowLeft || '50%',
          transform: 'translateX(-50%)',
          
          ...(arrowPosition === 'top' ? {
            top: '-6px',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '6px solid rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1))'
          } : {
            bottom: '-6px',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '6px solid rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }),
          
          width: '0',
          height: '0',
          zIndex: 0
        }}
      />

      {/* Subtle glow effect */}
      <div style={{
        position: 'absolute',
        top: '-2px',
        left: '-2px',
        right: '-2px',
        bottom: '-2px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: '18px',
        zIndex: -1,
        opacity: 0.6
      }} />
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={handleEditClick}
        style={{ 
          cursor: 'pointer',
          transition: 'transform 0.1s ease'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {children}
      </div>
      
      {isVisible && usePortal && ReactDOM.createPortal(
        <div 
          className="comment-tooltip-portal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 10000
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            {tooltipContent}
          </div>
        </div>,
        container || document.body
      )}
      
      {isVisible && !usePortal && (
        <div style={{ pointerEvents: 'auto' }}>
          {tooltipContent}
        </div>
      )}
    </>
  );
};

export default CommentTooltip;