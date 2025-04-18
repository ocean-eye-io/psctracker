// src/components/common/Table/TrafficLightFilter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check } from 'lucide-react';
import './TrafficLightFilter.css';

const TrafficLightFilter = ({ onFilterChange, activeFilters }) => {
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

  const handleFilterSelect = (status) => {
    const updatedFilters = { ...activeFilters };
    updatedFilters[status] = !updatedFilters[status];
    onFilterChange(updatedFilters);
  };

  // Count how many filters are active
  const activeCount = Object.values(activeFilters).filter(Boolean).length;
  
  return (
    <div className="traffic-light-filter-container" ref={filterRef}>
      <button 
        className={`filter-button ${isOpen ? 'active' : ''} ${activeCount > 0 ? 'has-filters' : ''}`}
        onClick={toggleFilter}
      >
        <Filter size={14} />
        {activeCount > 0 && (
          <span className="filter-count">{activeCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="filter-dropdown">
          <div className="filter-header">
            <h4>Filter by Status</h4>
          </div>
          <div className="filter-options">
            <button 
              className={`filter-option ${activeFilters.green ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('green')}
            >
              <div className="option-content">
                <span className="status-dot green"></span>
                <span>Green</span>
              </div>
              {activeFilters.green && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.yellow ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('yellow')}
            >
              <div className="option-content">
                <span className="status-dot yellow"></span>
                <span>Yellow</span>
              </div>
              {activeFilters.yellow && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.red ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('red')}
            >
              <div className="option-content">
                <span className="status-dot red"></span>
                <span>Red</span>
              </div>
              {activeFilters.red && <Check size={14} className="check-icon" />}
            </button>
            <button 
              className={`filter-option ${activeFilters.grey ? 'selected' : ''}`}
              onClick={() => handleFilterSelect('grey')}
            >
              <div className="option-content">
                <span className="status-dot grey"></span>
                <span>Not Set</span>
              </div>
              {activeFilters.grey && <Check size={14} className="check-icon" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficLightFilter;