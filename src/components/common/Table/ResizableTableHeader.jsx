// src/components/common/Table/ResizableTableHeader.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

const ResizableTableHeader = ({
  column,
  index,
  onColumnResize,
  children,
  style = {},
  className = '',
  ...otherProps
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const headerRef = useRef(null);
  const resizeHandleRef = useRef(null);

  // Get current width from style or column config
  const getCurrentWidth = useCallback(() => {
    if (style.width) {
      return parseInt(style.width, 10);
    }
    if (column.width) {
      return parseInt(column.width, 10);
    }
    return 120; // Default width
  }, [style.width, column.width]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = getCurrentWidth();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(currentWidth);
    
    // Add body class to prevent text selection during resize
    document.body.classList.add('col-resizing');
    document.body.style.cursor = 'col-resize';
  }, [getCurrentWidth]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(
      parseInt(column.minWidth || '60px', 10), // Minimum width
      Math.min(
        startWidth + deltaX,
        400 // Maximum width
      )
    );
    
    // Apply width immediately for visual feedback
    if (headerRef.current) {
      headerRef.current.style.width = `${newWidth}px`;
    }
    
    // Optional: Call onColumnResize during drag for real-time updates
    // Commented out to avoid performance issues with large tables
    // onColumnResize(column.field, `${newWidth}px`);
  }, [isResizing, startX, startWidth, column.field, column.minWidth, onColumnResize]);

  // Handle mouse up to finish resize
  const handleMouseUp = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(
      parseInt(column.minWidth || '60px', 10),
      Math.min(
        startWidth + deltaX,
        400
      )
    );
    
    setIsResizing(false);
    
    // Remove body classes
    document.body.classList.remove('col-resizing');
    document.body.style.cursor = '';
    
    // Call resize callback with final width
    onColumnResize(column.field, `${newWidth}px`);
  }, [isResizing, startX, startWidth, column.field, column.minWidth, onColumnResize]);

  // Set up global mouse events during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Prevent resize on last column if table has fixed width
  const showResizeHandle = index !== undefined; // Show on all columns for now

  return (
    <th
      ref={headerRef}
      className={`resizable-header ${className} ${isResizing ? 'resizing' : ''}`}
      style={{
        ...style,
        position: 'relative',
        userSelect: isResizing ? 'none' : 'auto'
      }}
      {...otherProps}
    >
      {/* Header content */}
      <div className="header-content">
        {children}
      </div>
      
      {/* Resize handle */}
      {showResizeHandle && (
        <div
          ref={resizeHandleRef}
          className={`resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            backgroundColor: isResizing ? 'rgba(59, 173, 229, 0.3)' : 'transparent',
            borderRight: isResizing ? '2px solid #3BADE5' : '1px solid transparent',
            zIndex: 10,
            transition: isResizing ? 'none' : 'all 0.2s ease'
          }}
        >
          {/* Visual indicator */}
          <div
            className="resize-indicator"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '16px',
              backgroundColor: isResizing ? '#3BADE5' : 'rgba(244, 244, 244, 0.3)',
              borderRadius: '1px',
              transition: isResizing ? 'none' : 'all 0.2s ease'
            }}
          />
        </div>
      )}
      
      {/* Hover zone for better UX */}
      {showResizeHandle && (
        <div
          className="resize-hover-zone"
          style={{
            position: 'absolute',
            top: 0,
            right: '-4px',
            width: '12px',
            height: '100%',
            cursor: 'col-resize',
            zIndex: 9
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
  );
};

ResizableTableHeader.propTypes = {
  column: PropTypes.shape({
    field: PropTypes.string.isRequired,
    width: PropTypes.string,
    minWidth: PropTypes.string
  }).isRequired,
  index: PropTypes.number,
  onColumnResize: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  style: PropTypes.object,
  className: PropTypes.string
};

export default ResizableTableHeader;