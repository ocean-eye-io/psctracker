import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import DropdownField from '../../common/Table/DropdownField';
import styles from './defect.module.css';

const statusOptions = ['OPEN', 'IN PROGRESS', 'CLOSED'];
const criticalityOptions = ['High', 'Medium', 'Low'];

const FilterBox = ({ field, value, options, label, onUpdate, showCount = true }) => {
  // Calculate the display text - just show the label, count goes in superscript badge
  const getDisplayText = () => {
    return label;
  };

  return (
    <div className={styles.filterDropdownContainer}>
      <DropdownField
        className={styles.filterDropdownButton}
        vessel={{ id: 'filter', [field]: value }}
        value={getDisplayText()}
        options={[label, ...options]}
        field={field}
        onUpdate={u => {
          const v = u[field];
          onUpdate(v === label ? [] : v || []);
          return true;
        }}
      />
      {/* Filter count badge as superscript */}
      {showCount && value.length > 0 && (
        <span className={styles.filterCount}>
          {value.length}
        </span>
      )}
    </div>
  );
};

const DefectFilterBar = ({
  onSearch,
  onFilterStatus,
  onFilterCriticality,
  onFilterSource,
  onFilterVessel, // New vessel filter handler
  statusFilter = [],
  criticalityFilter = [],
  sourceFilter = [],
  vesselFilter = [], // New vessel filter state
  sourceOptions = [],
  vesselOptions = [], // New vessel options from assigned vessels
  onExport,
  onImport,
  onAddDefect,
  onReset
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showSearchPopup, setShowSearchPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  // Format vessel options for display (vessel_name)
  const formattedVesselOptions = vesselOptions.map(vessel => vessel.vessel_name || vessel.name);

  return (
    <div className={styles.filterBar}>
      {/* Title - Match Fleet Dashboard */}
      <span className={styles.dashboardTitle}>
        Defects
      </span>

      {/* Search Toggle - Match Fleet Dashboard */}
      <div className={styles.searchContainer}>
        <button 
          className={styles.searchToggle}
          onClick={() => setShowSearchPopup(!showSearchPopup)}
        >
          <Search size={14} />
        </button>
        {showSearchPopup && (
          <div className={styles.searchPopup}>
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Search defects..."
              className={styles.searchInput}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Filters - Match Fleet Dashboard with superscript counts */}
      
      {/* Vessel Filter - New addition */}
      {vesselOptions.length > 0 && (
        <FilterBox
          field="vessel"
          value={vesselFilter}
          options={formattedVesselOptions}
          label="All Vessels"
          onUpdate={onFilterVessel}
        />
      )}

      <FilterBox
        field="status"
        value={statusFilter}
        options={statusOptions}
        label="All Statuses"
        onUpdate={onFilterStatus}
      />
      
      <FilterBox
        field="criticality"
        value={criticalityFilter}
        options={criticalityOptions}
        label="All Criticality"
        onUpdate={onFilterCriticality}
      />
      
      {sourceOptions.length > 0 && (
        <FilterBox
          field="source"
          value={sourceFilter}
          options={sourceOptions}
          label="All Sources"
          onUpdate={onFilterSource}
        />
      )}

      {/* Reset Button - Match Fleet "Clear Filters" */}
      {(statusFilter.length > 0 || 
        criticalityFilter.length > 0 || 
        sourceFilter.length > 0 || 
        vesselFilter.length > 0) && (
        <button 
          onClick={onReset}
          className={styles.resetButton}
        >
          Reset
        </button>
      )}

      {/* Right side actions - Match Fleet Dashboard */}
      <div className={styles.filterSectionRight}>
        <button
          onClick={onExport}
          className={styles.actionButton}
          title="Export Excel"
        >
          <Download size={14} />
        </button>
        <button
          onClick={onImport}
          className={styles.actionButton}
          title="Import VIR Excel"
        >
          <Upload size={14} />
        </button>
        <button
          onClick={onAddDefect}
          className={styles.defectActionBtn}
        >
          <Plus size={14} />
          Add Defect
        </button>
      </div>
    </div>
  );
};

export default DefectFilterBar;