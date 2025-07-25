// Enhanced DropdownField Component with Submission Constraints
// src/components/common/Table/DropdownField.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import './DropdownField.css';

const DropdownField = ({ 
  value, 
  vessel, 
  onUpdate, 
  options = ["Pending", "Acknowledged", "Submitted"],
  field = "checklist_received", // New parameter to specify which field to update
  className = "",
  allowCustomInput = false, // New prop to enable custom input for "Others" option
  isDisabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [warning, setWarning] = useState('');
  const triggerRef = useRef(null);
  const customInputRef = useRef(null);
  
  // Check if vessel has submitted checklist
  const isChecklistSubmitted = vessel?.computed_checklist_status === 'submitted' || 
                              vessel?.computed_checklist_status === 'complete' ||
                              vessel?.checklist_status === 'submitted' ||
                              vessel?.checklist_status === 'complete';
  
  // Get submission constraints for checklist field
  const getSubmissionConstraints = () => {
    if (field === 'checklist_received' && isChecklistSubmitted) {
      return {
        allowedValues: ['Submitted', 'Acknowledged'],
        restrictedValues: ['Pending'],
        message: 'Checklist has been submitted - only Acknowledged is allowed'
      };
    }
    return null;
  };

  const constraints = getSubmissionConstraints();
  
  // Filter options based on submission status
  const getAvailableOptions = () => {
    if (constraints) {
      return options.filter(option => 
        constraints.allowedValues.includes(option)
      );
    }
    return options;
  };

  const availableOptions = getAvailableOptions();
  
  // Default value handling based on field type
  const getDefaultValue = () => {
    if (field === "checklist_received") return "Pending";
    return ""; // Default for other fields like SANZ
  };
  
  // Check if current value is a custom value (not in options and not empty)
  const isCustomValue = allowCustomInput && 
                        value && 
                        !options.includes(value) && 
                        value !== "Others";
  
  // Get display value - show 'Submitted' if checklist is submitted but dropdown shows something else
  const getDisplayValue = () => {
    if (field === 'checklist_received' && isChecklistSubmitted) {
      // If the current dropdown value is 'Pending' but checklist is submitted, show 'Submitted'
      if (value === 'Pending' || !value) {
        return 'Submitted';
      }
    }
    
    // Handle custom values
    if (isCustomValue) {
      return value;
    }
    
    return value || (field === "sanz" ? "Select..." : getDefaultValue());
  };
  
  // Initialize custom value if needed
  useEffect(() => {
    if (isCustomValue) {
      setCustomValue(value);
      setIsCustomInput(true);
    }
  }, [value, isCustomValue]);
  
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
  
  // Focus custom input when it appears
  useEffect(() => {
    if (isCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomInput]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (isOpen && 
          triggerRef.current && 
          !triggerRef.current.contains(event.target) &&
          event.target.closest('.sleek-dropdown-menu') === null &&
          event.target.closest('.custom-input-container') === null) {
        setIsOpen(false);
        
        // If custom input is active and has value, submit it
        if (isCustomInput && customValue.trim()) {
          handleCustomInputSubmit();
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isCustomInput, customValue]);
  
  const handleSelect = async (option) => {
    if (option === getDisplayValue() && option !== "Others") {
      setIsOpen(false);
      return;
    }
    
    // Check constraints before proceeding
    if (constraints && constraints.restrictedValues.includes(option)) {
      setWarning(`Cannot change to "${option}" - ${constraints.message}`);
      setTimeout(() => setWarning(''), 3000);
      setIsOpen(false);
      return;
    }
    
    // Handle "Others" option
    if (allowCustomInput && option === "Others") {
      setIsCustomInput(true);
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
      setIsCustomInput(false);
      setWarning('');
    }
  };
  
  const handleCustomInputChange = (e) => {
    setCustomValue(e.target.value);
  };
  
  const handleCustomInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCustomInputSubmit();
    } else if (e.key === 'Escape') {
      setIsCustomInput(false);
      setIsOpen(false);
    }
  };
  
  const handleCustomInputSubmit = async () => {
    if (!customValue.trim()) {
      setIsCustomInput(false);
      setIsOpen(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Create updated vessel with the custom value
      const updatedVessel = {
        ...vessel,
        [field]: customValue.trim(),
        field: field,
        value: customValue.trim()
      };
      
      // Call the update function passed from parent
      const success = await onUpdate(updatedVessel);
      
      if (!success) {
        console.error(`Failed to update ${field} with custom value`);
      }
    } catch (error) {
      console.error(`Error updating ${field} with custom value:`, error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
      setIsCustomInput(false);
    }
  };
  
  // Get styling based on field type and current value
  const getStyle = () => {
    // For checklist field
    if (field === "checklist_received") {
      // Enhanced styling for submitted checklists
      if (isChecklistSubmitted) {
        return {
          color: '#2ECC71',
          background: 'rgba(46, 204, 113, 0.15)',
          borderColor: 'rgba(46, 204, 113, 0.3)'
        };
      }
      
      // Regular styling based on current value
      switch(getDisplayValue()) {
        case 'Submitted':
          return {
            color: '#F1C40F',
            background: 'rgba(46, 204, 113, 0.1)'
          };
        case 'Acknowledged':
          return {
            color: '#2ECC71',
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
          return { color: '#F1C40F' };
        case 'Acknowledged':
          return { color: '#2ECC71' };
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

  // Get display value
  const displayValue = getDisplayValue();

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
        {availableOptions.map(option => {
          const itemStyle = getItemStyle(option);
          return (
            <div 
              key={option}
              className={`sleek-dropdown-item ${option === displayValue ? 'active' : ''}`}
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
        
        {/* Custom input option */}
        {allowCustomInput && !isCustomInput && (
          <div
            className="sleek-dropdown-item custom-option"
            onClick={() => setIsCustomInput(true)}
            style={{
              color: '#3498DB',
              fontStyle: 'italic'
            }}
          >
            + Custom value...
          </div>
        )}
        
        {/* Custom input field */}
        {isCustomInput && (
          <div className="custom-input-container">
            <input
              ref={customInputRef}
              type="text"
              className="custom-input"
              value={customValue}
              onChange={handleCustomInputChange}
              onKeyDown={handleCustomInputKeyDown}
              placeholder="Enter name..."
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="custom-input-submit"
              onClick={handleCustomInputSubmit}
            >
              Save
            </button>
          </div>
        )}
        
        {/* Constraint message */}
        {constraints && (
          <div className="constraint-message">
            <Lock size={10} style={{ marginRight: '4px' }} />
            {constraints.message}
          </div>
        )}
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
      {/* Warning message */}
      {warning && (
        <div className="dropdown-warning-toast" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(231, 76, 60, 0.9)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'fadeInOut 3s ease-in-out'
        }}>
          <AlertTriangle size={14} />
          {warning}
        </div>
      )}

      <div 
        ref={triggerRef}
        className={`sleek-dropdown-trigger ${field}-dropdown ${isOpen ? 'open' : ''} ${isUpdating ? 'updating' : ''} ${className}`}
        onClick={() => !isUpdating && !isDisabled && setIsOpen(!isOpen)}
        style={{
          background: style.background,
          borderColor: style.color,
          opacity: isDisabled ? 0.6 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer'
        }}
        title={constraints ? constraints.message : ''}
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
            {displayValue}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Submission indicator */}
          {isChecklistSubmitted && field === 'checklist_received' && (
            <CheckCircle size={12} style={{ color: '#2ECC71' }} />
          )}
          
          {/* Restriction indicator */}
          {constraints && (
            <Lock size={10} style={{ color: '#F39C12' }} />
          )}
          
          <ChevronDown 
            size={14} 
            className="sleek-dropdown-arrow"
            style={{ 
              color: style.color,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </div>
        
        {isUpdating && <div className="sleek-loading-spinner"></div>}
      </div>
      
      {renderMenu()}
      
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(20px); }
          10% { opacity: 1; transform: translateX(0); }
          90% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(20px); }
        }
        
        .constraint-message {
          padding: 6px 8px;
          fontSize: 11px;
          color: #F39C12;
          background: rgba(243, 156, 18, 0.1);
          borderTop: 1px solid rgba(243, 156, 18, 0.2);
          textAlign: center;
          fontStyle: italic;
          display: flex;
          alignItems: center;
          justifyContent: center;
        }
      `}</style>
    </>
  );
};

export default DropdownField;