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
  
  // 🔥 SMART UPDATE: Enhanced status validation
  const isTerminalStatus = value === 'Acknowledged';
  const isChecklistField = field === 'checklist_received';
  
  // Enhanced submission constraints
  const getSubmissionConstraints = () => {
    if (isChecklistField && isTerminalStatus) {
      return {
        isTerminal: true,
        message: 'Checklist has been acknowledged and cannot be modified',
        allowedValues: ['Acknowledged'],
        restrictedValues: ['Pending', 'In Progress', 'Submitted']
      };
    }
    return null;
  };

  const constraints = getSubmissionConstraints();
  
  // Override isDisabled if status is terminal
  const effectivelyDisabled = isDisabled || (constraints && constraints.isTerminal);
  
  // Filter options based on constraints
  const getAvailableOptions = () => {
    if (constraints && constraints.isTerminal) {
      return ['Acknowledged']; // Only show acknowledged
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
    // For checklist field, if it's acknowledged, always display 'Acknowledged'
    if (isChecklistField && isTerminalStatus) {
      return 'Acknowledged';
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
    
    // 🔥 SMART UPDATE: Enhanced constraint checking
    if (constraints && constraints.isTerminal) {
      setWarning('Cannot modify acknowledged checklist status');
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
        setWarning(`Failed to update ${field}`);
        setTimeout(() => setWarning(''), 3000);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      setWarning(`Error updating ${field}: ${error.message}`);
      setTimeout(() => setWarning(''), 3000);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
      setIsCustomInput(false);
      // Clear warning if update was successful or if it was a client-side block
      if (success || (constraints && constraints.isTerminal)) {
        setWarning('');
      }
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
        setWarning(`Failed to update ${field} with custom value`);
        setTimeout(() => setWarning(''), 3000);
      }
    } catch (error) {
      console.error(`Error updating ${field} with custom value:`, error);
      setWarning(`Error updating ${field} with custom value: ${error.message}`);
      setTimeout(() => setWarning(''), 3000);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
      setIsCustomInput(false);
      if (success) {
        setWarning('');
      }
    }
  };
  
  // Enhanced styling for terminal status
  const getStyle = () => {
    if (isChecklistField) {
      if (isTerminalStatus) {
        return {
          color: '#2ECC71',
          background: 'rgba(46, 204, 113, 0.2)',
          borderColor: 'rgba(46, 204, 113, 0.4)',
          fontWeight: '600'
        };
      }
      
      switch(value) {
        case 'Submitted':
          return {
            color: '#F1C40F',
            background: 'rgba(241, 196, 15, 0.1)'
          };
        case 'In Progress':
          return {
            color: '#3498DB',
            background: 'rgba(52, 152, 219, 0.1)'
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
    if (isChecklistField) {
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
  const showStatusIndicator = isChecklistField;

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
      {/* Enhanced warning display */}
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <AlertTriangle size={14} />
          {warning}
        </div>
      )}

      <div 
        ref={triggerRef}
        className={`sleek-dropdown-trigger ${field}-dropdown ${isOpen ? 'open' : ''} ${isUpdating ? 'updating' : ''} ${className} ${effectivelyDisabled ? 'terminal-status' : ''}`}
        onClick={() => !isUpdating && !effectivelyDisabled && setIsOpen(!isOpen)}
        style={{
          background: style.background,
          borderColor: style.color,
          opacity: effectivelyDisabled ? 0.8 : 1,
          cursor: effectivelyDisabled ? 'not-allowed' : 'pointer',
          fontWeight: style.fontWeight || 'normal'
        }}
        title={constraints ? constraints.message : ''}
      >
        <div className="sleek-dropdown-label">
          {isChecklistField && (
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
          {/* Terminal status indicator */}
          {isTerminalStatus && (
            <CheckCircle size={12} style={{ color: '#2ECC71' }} />
          )}
          
          {/* Lock indicator for terminal status */}
          {effectivelyDisabled && constraints && (
            <Lock size={10} style={{ color: '#F39C12' }} />
          )}
          
          <ChevronDown 
            size={14} 
            className="sleek-dropdown-arrow"
            style={{ 
              color: style.color,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: effectivelyDisabled ? 0.5 : 1
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