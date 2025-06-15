// src/components/dashboard/fleet/ActiveFiltersDisplay.jsx
import React from 'react';
import styles from './ActiveFiltersDisplay.module.css';

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
    <div className={styles.activeFiltersContainer}>
      <div className={styles.filterBadgesWrapper}>
        {portFilter && (
          <div className={`${styles.filterBadge} ${styles.filterBadgePort}`}>
            <span className={styles.filterLabel}>Port:</span>
            <span className={styles.filterValue}>{portFilter}</span>
            <button
              className={styles.clearFilterBtn}
              onClick={onClearPortFilter}
              aria-label="Clear port filter"
            >
              ×
            </button>
          </div>
        )}
        
        {timelineFilter && (
          <div className={`${styles.filterBadge} ${styles.filterBadgeTimeline}`}>
            <span className={styles.filterLabel}>Arrival:</span>
            <span className={styles.filterValue}>{timelineFilter}</span>
            <button
              className={styles.clearFilterBtn}
              onClick={onClearTimelineFilter}
              aria-label="Clear timeline filter"
            >
              ×
            </button>
          </div>
        )}
      </div>
      
      {(portFilter || timelineFilter) && (
        <button
          className={styles.clearAllFiltersBtn}
          onClick={onClearAllFilters}
        >
          <span className={styles.clearAllText}>Clear All</span>
          <span className={styles.clearAllTextFull}>Clear All Chart Filters</span>
        </button>
      )}
    </div>
  );
};

export default ActiveFiltersDisplay;