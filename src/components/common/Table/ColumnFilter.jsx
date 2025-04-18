// src/components/common/Table/ColumnFilter.jsx
import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

const ColumnFilter = ({ 
  isOpen, 
  dropdownName, 
  title,
  options,
  selected,
  onChange,
  onClose,
  buttonRef, // Add reference to the button that opened this dropdown
  showSelectAll = true
}) => {
  const dropdownRef = useRef(null);
  
  // Position the dropdown after it opens
  useEffect(() => {
    if (!isOpen || !dropdownRef.current || !buttonRef?.current) return;
    
    // Get button position
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdown = dropdownRef.current;
    
    // Check if dropdown would go off screen to the right
    const windowWidth = window.innerWidth;
    let leftPosition = buttonRect.left;
    
    if (leftPosition + dropdown.offsetWidth > windowWidth - 20) {
      // If so, align to the right edge of the button
      leftPosition = buttonRect.right - dropdown.offsetWidth;
    }
    
    // Check if dropdown would go off screen to the bottom
    const windowHeight = window.innerHeight;
    const dropdownHeight = dropdown.offsetHeight;
    let topPosition = buttonRect.bottom + 8;
    
    if (topPosition + dropdownHeight > windowHeight - 20) {
      // If so, position above the button
      topPosition = buttonRect.top - dropdownHeight - 8;
    }
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${topPosition}px`;
    dropdown.style.left = `${leftPosition}px`;
    
    // Add arrow pointing to button
    const arrow = dropdown.querySelector('.dropdown-arrow');
    if (arrow) {
      // Position arrow relative to button center
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      arrow.style.left = `${Math.max(15, buttonCenter - leftPosition)}px`;
      
      // If dropdown is above the button, position arrow at bottom
      if (topPosition < buttonRect.top) {
        arrow.style.top = 'auto';
        arrow.style.bottom = '-8px';
        arrow.style.transform = 'translateX(-50%) rotate(225deg)';
      } else {
        arrow.style.top = '-8px';
        arrow.style.bottom = 'auto';
        arrow.style.transform = 'translateX(-50%) rotate(45deg)';
      }
    }
  }, [isOpen, buttonRef]);

  // Handle click outside filter dropdown
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        buttonRef?.current && 
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  // Check if all options are selected
  const allSelected = options.every(option => selected.includes(option.id));

  if (!isOpen) return null;

  return (
    <div className="column-filter-dropdown" ref={dropdownRef} data-name={dropdownName}>
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

export default ColumnFilter;