// src/components/dashboard/fleet/ActiveFiltersDisplay.jsx
import React from 'react';

const ActiveFiltersDisplay = ({ 
  portFilter, 
  timelineFilter, 
  onClearPortFilter, 
  onClearTimelineFilter,
  onClearAllFilters 
}) => {
  // Don't render if no filters are active
  if (!portFilter && !timelineFilter) {
    return null;
  }
  
  return (
    <div className="active-filters-container">
      {portFilter && (
        <div className="filter-badge filter-badge-port">
          <span>Port: {portFilter}</span>
          <button 
            className="clear-filter-btn"
            onClick={onClearPortFilter}
          >
            ✕
          </button>
        </div>
      )}
      
      {timelineFilter && (
        <div className="filter-badge filter-badge-timeline">
          <span>Arrival: {timelineFilter}</span>
          <button 
            className="clear-filter-btn"
            onClick={onClearTimelineFilter}
          >
            ✕
          </button>
        </div>
      )}
      
      {(portFilter || timelineFilter) && (
        <button 
          className="clear-all-filters-btn"
          onClick={onClearAllFilters}
        >
          Clear All Chart Filters
        </button>
      )}
    </div>
  );
};

export default ActiveFiltersDisplay;