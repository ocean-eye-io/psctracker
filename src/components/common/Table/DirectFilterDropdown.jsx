// src/components/common/Table/DirectFilterDropdown.jsx
import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import ReactDOM from 'react-dom';

// This component renders a dropdown directly in its parent context
// rather than using fixed positioning
const DirectFilterDropdown = ({ 
  isOpen, 
  dropdownName, 
  title,
  options,
  selected,
  onChange,
  onClose,
  showSelectAll = true
}) => {
  const dropdownRef = useRef(null);

  // Check if all options are selected
  const allSelected = options.every(option => selected.includes(option.id));
  
  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if clicked on the related button (has the same data-filter attribute)
        const filterButtons = document.querySelectorAll(`.${dropdownName}-filter`);
        let clickedOnButton = false;
        
        filterButtons.forEach(button => {
          if (button.contains(event.target)) {
            clickedOnButton = true;
          }
        });
        
        if (!clickedOnButton) {
          onClose();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, dropdownName]);

  if (!isOpen) return null;

  return (
    <div className={`column-filter-dropdown ${dropdownName}-dropdown`} ref={dropdownRef}>
      <div className="dropdown-arrow"></div>
      
      <div className="filter-dropdown-header">
        <h4>{title}</h4>
        
        {showSelectAll && (
          <button 
            className="select-all-btn"
            onClick={() => {
              // Toggle select all or none
              const newSelected = allSelected ? [] : options.map(opt => opt.id);
              onChange(newSelected);
            }}
            type="button"
          >
            {allSelected ? 'Clear All' : 'Select All'}
          </button>
        )}
        
        <button className="close-dropdown-btn" onClick={onClose} type="button">
          <X size={14} />
        </button>
      </div>
      
      <div className="filter-dropdown-items">
        {options.map(option => (
          <div key={option.id} className="filter-checkbox-item">
            <label>
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => {
                  // Toggle the option
                  const newSelected = selected.includes(option.id)
                    ? selected.filter(id => id !== option.id)
                    : [...selected, option.id];
                  onChange(newSelected);
                }}
              />
              
              {option.color && (
                <span 
                  className={`status-dot ${option.className || ''}`}
                  style={option.color ? { background: option.color } : {}}
                ></span>
              )}
              
              <span>{option.label}</span>
              
              {selected.includes(option.id) && (
                <Check size={14} className="check-icon" />
              )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

// To ensure the dropdown appears in the correct DOM position,
// we render it directly via a portal
const FilterDropdownWrapper = (props) => {
  return ReactDOM.createPortal(
    <DirectFilterDropdown {...props} />,
    document.getElementById('dropdown-container') || document.body
  );
};

export default FilterDropdownWrapper;