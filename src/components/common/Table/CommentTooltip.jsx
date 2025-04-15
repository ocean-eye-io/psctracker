// src/components/dashboard/fleet/CommentTooltip.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const CommentTooltip = ({ children, comment, onEditClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false); // Add this state
  const [position, setPosition] = useState({ top: 0, left: 0, right: 'auto', placement: 'right' });
  
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Function to show tooltip
  const showTooltip = () => {
    if (!comment || !comment.trim()) return;
    
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      
      // Determine if tooltip should appear on left or right
      const rightSpace = windowWidth - rect.right;
      const placement = rightSpace < 230 ? 'left' : 'right';
      
      setPosition({
        top: rect.top + window.scrollY,
        left: placement === 'right' ? rect.right + 8 : 'auto',
        right: placement === 'left' ? (windowWidth - rect.left + 8) : 'auto',
        placement
      });
      
      setIsVisible(true);
    }
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    setIsVisible(false);
  };
  
  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isVisible && 
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        triggerRef.current && 
        !triggerRef.current.contains(event.target)
      ) {
        hideTooltip();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);
  
  // Handle ESC key to close tooltip
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isVisible) {
        hideTooltip();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isVisible]);
  
  // Check if there's an actual comment
  const hasComment = comment && comment.trim().length > 0;
  
  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={() => {
          if (hasComment) {
            showTooltip();
          }
        }}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!isTooltipHovered) {
              hideTooltip();
            }
          }, 200);
        }}
        className="tooltip-trigger"
      >
        {children}
      </div>
      
      {isVisible && hasComment && ReactDOM.createPortal(
        <div 
          ref={tooltipRef}
          className={`comment-tooltip-portal tooltip-${position.placement}`}
          style={{
            position: 'absolute',
            top: `${position.top}px`,
            left: position.left,
            right: position.right,
            zIndex: 10000
          }}
          onMouseEnter={() => setIsTooltipHovered(true)} // Update this
          onMouseLeave={() => {
            setIsTooltipHovered(false); // Update this
            setTimeout(() => hideTooltip(), 100);
          }}
        >
          <div className="comment-tooltip-content">
            <div className="tooltip-header">
              <span>Comment</span>
              <button 
                className="tooltip-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick();
                  hideTooltip();
                }}
              >
                Edit
              </button>
            </div>
            <div className="tooltip-body">
              {comment}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CommentTooltip;