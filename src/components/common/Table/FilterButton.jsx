// src/components/common/Table/FilterButton.jsx
import React, { forwardRef } from 'react';

const FilterButton = forwardRef(({ 
  onClick, 
  isActive, 
  filterCount = 0,
  className = '',
  children 
}, ref) => {
  return (
    <button 
      ref={ref}
      className={`integrated-filter-button ${isActive ? 'active' : ''} ${filterCount > 0 ? 'has-filters' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
      
      {filterCount > 0 && (
        <span className="filter-count">{filterCount}</span>
      )}
    </button>
  );
});

FilterButton.displayName = 'FilterButton';

export default FilterButton;