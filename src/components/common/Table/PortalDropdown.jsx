// src/components/common/Table/PortalDropdown.jsx
import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import DropdownField from './DropdownField';

// This component renders the dropdown outside the table DOM hierarchy
const PortalDropdown = ({ value, vessel, onUpdate, options }) => {
  const [portalNode, setPortalNode] = useState(null);
  const triggerRef = useRef(null);
  
  useEffect(() => {
    // Create a portal node for the dropdown
    const node = document.createElement('div');
    node.style.position = 'absolute';
    node.style.zIndex = '9999';
    document.body.appendChild(node);
    setPortalNode(node);
    
    return () => {
      document.body.removeChild(node);
    };
  }, []);
  
  useEffect(() => {
    if (portalNode && triggerRef.current) {
      // Position the portal near the trigger element
      const rect = triggerRef.current.getBoundingClientRect();
      portalNode.style.left = `${rect.left}px`;
      portalNode.style.top = `${rect.top}px`;
      portalNode.style.width = `${rect.width}px`;
    }
  });
  
  return (
    <>
      <div ref={triggerRef} style={{ visibility: 'hidden' }}>
        {/* This is just a placeholder to get positioning */}
        <DropdownField 
          value={value}
          vessel={vessel}
          onUpdate={onUpdate}
          options={options}
        />
      </div>
      
      {portalNode && 
        ReactDOM.createPortal(
          <DropdownField 
            value={value}
            vessel={vessel}
            onUpdate={onUpdate}
            options={options}
          />,
          portalNode
        )
      }
    </>
  );
};

export default PortalDropdown;