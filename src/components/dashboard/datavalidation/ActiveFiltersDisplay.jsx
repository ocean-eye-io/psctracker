// src/components/dashboard/datavalidation/ActiveFiltersDisplay.jsx
import React from 'react';
import { X } from 'lucide-react';

const ActiveFiltersDisplay = ({ 
  categoryFilter, 
  qualityThresholdFilter, 
  timeRangeFilter,
  onClearCategoryFilter, 
  onClearQualityFilter,
  onClearTimeRangeFilter,
  onClearAllFilters 
}) => {
  // Don't render if no active filters
  if (!categoryFilter && !qualityThresholdFilter && !timeRangeFilter) {
    return null;
  }
  
  // Format quality threshold for display
  const formatQualityThreshold = (threshold) => {
    switch (threshold) {
      case 'good':
        return 'Good Quality (90%+)';
      case 'warning':
        return 'Warning Quality (70-89%)';
      case 'critical':
        return 'Critical Quality (<70%)';
      default:
        return threshold;
    }
  };
  
  // Format time range for display
  const formatTimeRange = (range) => {
    switch (range) {
      case 'last_24_hours':
        return 'Last 24 Hours';
      case 'last_7_days':
        return 'Last 7 Days';
      case 'last_30_days':
        return 'Last 30 Days';
      default:
        return range;
    }
  };

  return (
    <div className="active-filters">
      <div className="active-filters-heading">
        <span>Active Filters:</span>
        <button 
          className="clear-all-btn" 
          onClick={onClearAllFilters}
          title="Clear all filters"
        >
          Clear All
        </button>
      </div>
      
      <div className="filter-tags">
        {categoryFilter && (
          <div className="filter-tag">
            <span className="filter-label">Category:</span>
            <span className="filter-value">{categoryFilter}</span>
            <button 
              className="remove-filter" 
              onClick={onClearCategoryFilter}
              title="Remove category filter"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        {qualityThresholdFilter && (
          <div className="filter-tag">
            <span className="filter-label">Quality:</span>
            <span className="filter-value">{formatQualityThreshold(qualityThresholdFilter)}</span>
            <button 
              className="remove-filter" 
              onClick={onClearQualityFilter}
              title="Remove quality filter"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        {timeRangeFilter && timeRangeFilter !== 'all' && (
          <div className="filter-tag">
            <span className="filter-label">Time Range:</span>
            <span className="filter-value">{formatTimeRange(timeRangeFilter)}</span>
            <button 
              className="remove-filter" 
              onClick={onClearTimeRangeFilter}
              title="Remove time range filter"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveFiltersDisplay;