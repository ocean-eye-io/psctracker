// src/components/common/Table/DropdownField.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './DropdownField.css';

const DropdownField = ({ 
  value, 
  vessel, 
  onUpdate, 
  options = ["Pending", "Acknowledged", "Submitted"],
  field = "checklist_received", // New parameter to specify which field to update
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  
  // Default value handling based on field type
  const getDefaultValue = () => {
    if (field === "checklist_received") return "Pending";
    return ""; // Default for other fields like SANZ
  };
  
  // Use the provided value or default based on field type
  const currentValue = value || getDefaultValue();
  
  // Update position when dropdown opens or window resizes
  useEffect(() => {
    function updatePosition() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }
    
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && 
          triggerRef.current && 
          !triggerRef.current.contains(event.target) &&
          event.target.closest('.sleek-dropdown-menu') === null) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const handleSelect = async (option) => {
    if (option === currentValue) {
      setIsOpen(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Create updated vessel with the new value for the specified field
      const updatedVessel = {
        ...vessel,
        [field]: option,
        field: field,    // Add field name for the API
        value: option    // Add value for the API
      };
      
      // Call the update function passed from parent
      const success = await onUpdate(updatedVessel);
      
      if (!success) {
        console.error(`Failed to update ${field}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };
  
  // Get styling based on field type and current value
  const getStyle = () => {
    // For checklist field
    if (field === "checklist_received") {
      switch(currentValue) {
        case 'Submitted':
          return {
            color: '#2ECC71',
            background: 'rgba(46, 204, 113, 0.1)'
          };
        case 'Acknowledged':
          return {
            color: '#F1C40F',
            background: 'rgba(241, 196, 15, 0.1)'
          };
        case 'Pending':
        default:
          return {
            color: '#E74C3C',
            background: 'rgba(231, 76, 60, 0.1)'
          };
      }
    }
    
    // For SANZ field (or other fields)
    return {
      color: '#3BADE5',
      background: 'rgba(59, 173, 229, 0.1)'
    };
  };
  
  // Get styling for dropdown items based on field type
  const getItemStyle = (option) => {
    // For checklist field
    if (field === "checklist_received") {
      switch(option) {
        case 'Submitted':
          return { color: '#2ECC71' };
        case 'Acknowledged':
          return { color: '#F1C40F' };
        case 'Pending':
        default:
          return { color: '#E74C3C' };
      }
    }
    
    // For SANZ field (or other fields)
    return { color: '#3BADE5' };
  };
  
  const style = getStyle();
  
  // Check if we should show status indicator
  const showStatusIndicator = field === "checklist_received";

  // Render the menu in a portal
  const renderMenu = () => {
    if (!isOpen) return null;
    
    const menu = (
      <div 
        className={`sleek-dropdown-menu ${field}-dropdown-menu`}
        style={{
          position: 'absolute',
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          width: `${menuPosition.width}px`,
          zIndex: 10000 // Extremely high z-index
        }}
      >
        {options.map(option => {
          const itemStyle = getItemStyle(option);
          return (
            <div 
              key={option}
              className={`sleek-dropdown-item ${option === currentValue ? 'active' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {/* Only show status indicator for checklist field */}
              {showStatusIndicator && (
                <span 
                  className="sleek-status-indicator"
                  style={{ background: itemStyle.color }}
                ></span>
              )}
              <span style={{ color: itemStyle.color }}>{option}</span>
            </div>
          );
        })}
      </div>
    );
    
    // Create portal to render menu at document body level
    return ReactDOM.createPortal(
      menu,
      document.body
    );
  };

  return (
    <>
      <div 
        ref={triggerRef}
        className={`sleek-dropdown-trigger ${field}-dropdown ${isOpen ? 'open' : ''} ${isUpdating ? 'updating' : ''} ${className}`}
        onClick={() => !isUpdating && setIsOpen(!isOpen)}
        style={{
          background: style.background,
          borderColor: style.color
        }}
      >
        <div className="sleek-dropdown-label">
          {/* Only show status indicator for checklist field */}
          {showStatusIndicator && (
            <span 
              className="sleek-status-indicator"
              style={{ background: style.color }}
            ></span>
          )}
          <span style={{ color: style.color }}>
            {currentValue || (field === "sanz" ? "Select..." : getDefaultValue())}
          </span>
        </div>
        
        <ChevronDown 
          size={14} 
          className="sleek-dropdown-arrow"
          style={{ 
            color: style.color,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
        
        {isUpdating && <div className="sleek-loading-spinner"></div>}
      </div>
      
      {renderMenu()}
    </>
  );
};

export default DropdownField;