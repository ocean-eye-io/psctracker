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
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = triggerRect.bottom + 8;
    let left = triggerRect.left + (triggerRect.width / 2);

    // Adjust if tooltip would go off-screen
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Horizontal boundary check
      if (left + tooltipRect.width / 2 > viewportWidth - 20) {
        left = viewportWidth - tooltipRect.width - 20;
      }
      if (left - tooltipRect.width / 2 < 20) {
        left = tooltipRect.width / 2 + 20;
      }

      // Vertical boundary check
      if (top + tooltipRect.height > viewportHeight - 20) {
        top = triggerRect.top - tooltipRect.height - 8;
      }
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="comment-tooltip-content"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 10001,
      }}
    >
      {comment || 'No comments'}
      {onEditClick && (
        <button
          onClick={onEditClick}
          style={{
            marginLeft: '8px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Edit
        </button>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>
      
      {isVisible && usePortal && ReactDOM.createPortal(
        <div className="comment-tooltip-portal">
          {tooltipContent}
        </div>,
        container || document.body
      )}
      
      {isVisible && !usePortal && tooltipContent}
    </>
  );
};

export default CommentTooltip;