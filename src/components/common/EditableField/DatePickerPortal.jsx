import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

// This component creates a portal for the date picker
const DatePickerPortal = ({ children }) => {
  const [portalNode, setPortalNode] = useState(null);
  
  useEffect(() => {
    // Create or get the portal container
    let node = document.getElementById('date-picker-portal-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'date-picker-portal-root';
      
      // Apply styles directly to ensure it's on top of everything
      node.style.position = 'fixed';
      node.style.zIndex = '999999';
      node.style.top = '0';
      node.style.left = '0';
      node.style.width = '100%';
      node.style.height = '100%';
      node.style.pointerEvents = 'none'; // Allow clicks to pass through the container
      
      document.body.appendChild(node);
    }
    
    setPortalNode(node);
    
    // Cleanup
    return () => {
      // Only remove if no other portals are using it
      if (node && node.parentNode && node.childNodes.length === 0) {
        node.parentNode.removeChild(node);
      }
    };
  }, []);
  
  if (!portalNode) return null;
  
  // Render children into the portal
  return ReactDOM.createPortal(children, portalNode);
};

DatePickerPortal.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DatePickerPortal;