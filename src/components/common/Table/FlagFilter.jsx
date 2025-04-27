// src/components/common/Table/FlagFilter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Filter, Flag, Check } from 'lucide-react';
import './FlagFilter.css';

const FlagFilter = ({ onFilterChange, activeFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(null);
  
  const toggleFilter = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilterSelect = (flag) => {
    const updatedFilters = { ...activeFilters };
    updatedFilters[flag] = !updatedFilters[flag];
    onFilterChange(updatedFilters);
  };

  // Count how many filters are active
  const activeCount = Object.values(activeFilters).filter(Boolean).length;
  
  return (
    <div className="flag-filter-container" ref={filterRef}>
      <button 
        className={`filter-button ${isOpen ? 'active' : ''} ${activeCount > 0 ? 'has-filters' : ''}`}
        onClick={toggleFilter}
      >
        <Flag size={14} />
        {activeCount > 0 && (
          <span className="filter-count">{activeCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="filter-dropdown">
          <div className="filter-header">
            <h4>Filter by Flag</h4>
          </div>
          <div className="filter-options">
            <button 
              className={`filter-option ${activeFilters.green ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('green')}
            >
              <div className="option-content">
                <Flag size={14} className="flag-icon green" />
                <span>Green</span>
              </div>
              {activeFilters.green && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.yellow ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('yellow')}
            >
              <div className="option-content">
                <Flag size={14} className="flag-icon yellow" />
                <span>Yellow</span>
              </div>
              {activeFilters.yellow && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.red ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('red')}
            >
              <div className="option-content">
                <Flag size={14} className="flag-icon red" />
                <span>Red</span>
              </div>
              {activeFilters.red && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.none ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('none')}
            >
              <div className="option-content">
                <Flag size={14} className="flag-icon none" />
                <span>Not Flagged</span>
              </div>
              {activeFilters.none && <Check size={14} className="check-icon" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlagFilter;