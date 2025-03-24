// src/components/common/Table/DropdownField.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './DropdownField.css';

const DropdownField = ({ 
  value, 
  vessel, 
  onUpdate, 
  options = ["Pending", "Acknowledged", "Submitted"]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef(null);
  
  // Default to "Pending" if no value is provided
  const currentValue = value || "Pending";
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelect = async (option) => {
    if (option === currentValue) {
      setIsOpen(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Create updated vessel with the new status
      const updatedVessel = {
        ...vessel,
        checklist_received: option
      };
      
      // Call the update function passed from parent
      const success = await onUpdate(updatedVessel);
      
      if (!success) {
        console.error('Failed to update checklist status');
      }
    } catch (error) {
      console.error('Error updating checklist status:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };
  
  // Get appropriate styling for current value
  const getStatusStyle = () => {
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
  };
  
  // Get styling for dropdown item
  const getItemStyle = (option) => {
    switch(option) {
      case 'Submitted':
        return {
          color: '#2ECC71'
        };
      case 'Acknowledged':
        return {
          color: '#F1C40F'
        };
      case 'Pending':
      default:
        return {
          color: '#E74C3C'
        };
    }
  };
  
  const statusStyle = getStatusStyle();

  return (
    <div className="sleek-dropdown-wrapper" ref={dropdownRef}>
      <div 
        className={`sleek-dropdown-trigger ${isOpen ? 'open' : ''} ${isUpdating ? 'updating' : ''}`}
        onClick={() => !isUpdating && setIsOpen(!isOpen)}
        style={{
          background: statusStyle.background,
          borderColor: statusStyle.color
        }}
      >
        <div className="sleek-dropdown-label">
          <span 
            className="sleek-status-indicator"
            style={{ background: statusStyle.color }}
          ></span>
          <span style={{ color: statusStyle.color }}>{currentValue}</span>
        </div>
        
        <ChevronDown 
          size={14} 
          className="sleek-dropdown-arrow"
          style={{ 
            color: statusStyle.color,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
        
        {isUpdating && <div className="sleek-loading-spinner"></div>}
      </div>
      
      {isOpen && (
        <div className="sleek-dropdown-menu">
          {options.map(option => {
            const itemStyle = getItemStyle(option);
            return (
              <div 
                key={option}
                className={`sleek-dropdown-item ${option === currentValue ? 'active' : ''}`}
                onClick={() => handleSelect(option)}
              >
                <span 
                  className="sleek-status-indicator"
                  style={{ background: itemStyle.color }}
                ></span>
                <span style={{ color: itemStyle.color }}>{option}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DropdownField;