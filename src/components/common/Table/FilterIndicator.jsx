// src/components/common/Table/FilterIndicator.jsx
import React from 'react';
import { X, Filter } from 'lucide-react';

const FilterIndicator = ({ 
  filterCount, 
  onClearAll, 
  visible = true 
}) => {
  if (!visible || filterCount === 0) return null;
  
  return (
    <div className="filter-indicator">
      <div className="filter-indicator-content">
        <Filter size={12} />
        <span>{filterCount} {filterCount === 1 ? 'filter' : 'filters'}</span>
        <button 
          className="clear-filter-btn" 
          onClick={onClearAll}
          type="button"
          aria-label="Clear all filters"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default FilterIndicator;