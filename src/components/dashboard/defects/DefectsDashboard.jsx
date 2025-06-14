// src/components/dashboard/defects/DefectsDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import '../DashboardStyles.css';
import DefectTable from './DefectTable';
import CriticalityChart from './charts/CriticalityChart';
import TotalDefectsChart from './charts/TotalDefectsChart';
import defectService from './services/defectService';
import { DEFECT_FIELDS } from './config/DefectFieldMappings'; // Added missing import

const DefectsDashboard = () => {
  // State variables
  const [defects, setDefects] = useState([]);
  const [filteredDefects, setFilteredDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state variables
  const [statusFilters, setStatusFilters] = useState([]);
  const [criticalityFilters, setCriticalityFilters] = useState([]);
  const [sourceFilters, setSourceFilters] = useState([]);

  // Dropdown visibility state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCriticalityDropdown, setShowCriticalityDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Current user mock (in a real app, this would come from auth context)
  const currentUser = useMemo(() => ({
    id: 123,
    name: 'John Doe',
    role: 'admin'
  }), []); // Memoized to prevent unnecessary re-renders

  // Fetch defects data from API
  const fetchDefects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await defectService.getAllDefects();
      console.log('Fetched defects:', data.length);

      setDefects(data);
      setFilteredDefects(data);

      // Initialize filters with all available options
      const uniqueStatuses = [...new Set(data.map(d => d['Status (Vessel)']).filter(Boolean))];
      const uniqueCriticalities = [...new Set(data.map(d => d.Criticality).filter(Boolean))];
      const uniqueSources = [...new Set(data.map(d => d.Source).filter(Boolean))];

      setStatusFilters(uniqueStatuses);
      setCriticalityFilters(uniqueCriticalities);
      setSourceFilters(uniqueSources);

    } catch (error) {
      console.error('Error fetching defects:', error);
      setError('Failed to fetch data. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  // Memoized filter functions for better performance
  const filterByStatus = useCallback((defect) => {
    return statusFilters.length === 0 || 
           !defect['Status (Vessel)'] || 
           statusFilters.includes(defect['Status (Vessel)']);
  }, [statusFilters]);

  const filterByCriticality = useCallback((defect) => {
    return criticalityFilters.length === 0 || 
           !defect.Criticality || 
           criticalityFilters.includes(defect.Criticality);
  }, [criticalityFilters]);

  const filterBySource = useCallback((defect) => {
    return sourceFilters.length === 0 || 
           !defect.Source || 
           sourceFilters.includes(defect.Source);
  }, [sourceFilters]);

  const filterBySearchTerm = useCallback((defect) => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    return Object.values(defect).some(value =>
      value && String(value).toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Apply filters and search with optimized filtering
  useEffect(() => {
    if (!defects.length) {
      setFilteredDefects([]);
      return;
    }

    const results = defects.filter(defect => 
      filterByStatus(defect) &&
      filterByCriticality(defect) &&
      filterBySource(defect) &&
      filterBySearchTerm(defect)
    );

    setFilteredDefects(results);
  }, [defects, filterByStatus, filterByCriticality, filterBySource, filterBySearchTerm]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');

    // Reset filters to include all options
    const uniqueStatuses = [...new Set(defects.map(d => d['Status (Vessel)']).filter(Boolean))];
    const uniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))];
    const uniqueSources = [...new Set(defects.map(d => d.Source).filter(Boolean))];

    setStatusFilters(uniqueStatuses);
    setCriticalityFilters(uniqueCriticalities);
    setSourceFilters(uniqueSources);
  }, [defects]);

  // Toggle all items in a filter group
  const toggleAllItems = useCallback((type) => {
    // Get all unique values from all defects
    const uniqueStatuses = [...new Set(defects.map(d => d['Status (Vessel)']).filter(Boolean))];
    const uniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))];
    const uniqueSources = [...new Set(defects.map(d => d.Source).filter(Boolean))];

    switch(type) {
      case 'statuses':
        setStatusFilters(prevFilters => 
          prevFilters.length === uniqueStatuses.length ? [] : uniqueStatuses
        );
        break;
      case 'criticalities':
        setCriticalityFilters(prevFilters =>
          prevFilters.length === uniqueCriticalities.length ? [] : uniqueCriticalities
        );
        break;
      case 'sources':
        setSourceFilters(prevFilters =>
          prevFilters.length === uniqueSources.length ? [] : uniqueSources
        );
        break;
      default:
        break;
    }
  }, [defects]);

  // Toggle a specific filter item with optimized state updates
  const toggleFilterItem = useCallback((type, item) => {
    const updateFilter = (prevFilters) => 
      prevFilters.includes(item)
        ? prevFilters.filter(i => i !== item)
        : [...prevFilters, item];

    switch(type) {
      case 'statuses':
        setStatusFilters(updateFilter);
        break;
      case 'criticalities':
        setCriticalityFilters(updateFilter);
        break;
      case 'sources':
        setSourceFilters(updateFilter);
        break;
      default:
        break;
    }
  }, []);

  // Export data to Excel
  const handleExport = useCallback(() => {
    console.log('Exporting data to Excel...');
    
    // Get visible columns from DEFECT_FIELDS if available
    const columns = DEFECT_FIELDS?.TABLE ? 
      Object.entries(DEFECT_FIELDS.TABLE)
        .filter(([_, field]) => !field.isAction)
        .sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0))
        .map(([_, field]) => ({ label: field.label, dbField: field.dbField })) :
      Object.keys(filteredDefects[0] || {}).map(key => ({ label: key, dbField: key }));

    // Create CSV header
    const header = columns.map(col => col.label).join(',');
    
    // Create CSV rows
    const rows = filteredDefects.map(defect => {
      return columns.map(col => {
        const value = defect[col.dbField];
        // Handle null values and escape commas for CSV
        return value !== null && value !== undefined 
          ? `"${String(value).replace(/"/g, '""')}"` 
          : '';
      }).join(',');
    });
    
    // Combine header and rows
    const csv = [header, ...rows].join('\n');
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `defects_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up object URL
  }, [filteredDefects]);

  // Table action handlers with useCallback for performance
  const handleView = useCallback((defect) => {
    console.log('View defect:', defect);
    // Implement view logic here
  }, []);

  const handleEdit = useCallback((defect) => {
    console.log('Edit defect:', defect);
    // Implement edit logic here
  }, []);

  const handleDelete = useCallback(async (defect) => {
    if (window.confirm(`Are you sure you want to delete this defect?`)) {
      try {
        await defectService.deleteDefect(defect.id);
        fetchDefects();
      } catch (error) {
        console.error('Error deleting defect:', error);
        alert('Failed to delete defect. Please try again.');
      }
    }
  }, [fetchDefects]);

  // Close all dropdowns when clicking elsewhere
  const closeAllDropdowns = useCallback(() => {
    setShowStatusDropdown(false);
    setShowCriticalityDropdown(false);
    setShowSourceDropdown(false);
    setShowSearch(false);
  }, []);

  // Get unique values for filter options (memoized for performance)
  const uniqueStatuses = useMemo(() =>
    [...new Set(defects.map(d => d['Status (Vessel)']).filter(Boolean))],
    [defects]
  );

  const uniqueCriticalities = useMemo(() =>
    [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c != null), // Use != null instead of !== null && !== undefined
    [defects]
  );

  const uniqueSources = useMemo(() =>
    [...new Set(defects.map(d => d.Source).filter(Boolean))],
    [defects]
  );

  // Memoized search input change handler
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Memoized dropdown toggle handlers
  const toggleStatusDropdown = useCallback(() => {
    setShowStatusDropdown(prev => !prev);
    setShowCriticalityDropdown(false);
    setShowSourceDropdown(false);
  }, []);

  const toggleCriticalityDropdown = useCallback(() => {
    setShowCriticalityDropdown(prev => !prev);
    setShowStatusDropdown(false);
    setShowSourceDropdown(false);
  }, []);

  const toggleSourceDropdown = useCallback(() => {
    setShowSourceDropdown(prev => !prev);
    setShowStatusDropdown(false);
    setShowCriticalityDropdown(false);
  }, []);

  const toggleSearch = useCallback((e) => {
    e.stopPropagation();
    setShowSearch(prev => !prev);
  }, []);

  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section-left">
          <h1 className="dashboard-title">Defects</h1>
          <div className="search-container">
            <button
              className="search-toggle"
              onClick={toggleSearch}
            >
              <Search size={14} />
            </button>

            {showSearch && (
              <div className="search-popup" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Search defects..."
                  className="search-input"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        <div className="filter-label">
          <Filter size={14} />
        </div>

        <div className="filter-chips">
          {/* Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showStatusDropdown ? 'active' : ''}`}
              onClick={toggleStatusDropdown}
            >
              All Statuses
              <span className="filter-count">{statusFilters.length}/{uniqueStatuses.length}</span>
            </button>

            {showStatusDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Status</h4>
                  <button 
                    className="select-all-btn" 
                    onClick={() => toggleAllItems('statuses')}
                  >
                    {statusFilters.length === uniqueStatuses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueStatuses.map(status => (
                    <div key={status} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={statusFilters.includes(status)}
                          onChange={() => toggleFilterItem('statuses', status)}
                        />
                        <span>{status}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowStatusDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Criticality Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showCriticalityDropdown ? 'active' : ''}`}
              onClick={toggleCriticalityDropdown}
            >
              All Criticality
              <span className="filter-count">{criticalityFilters.length}/{uniqueCriticalities.length}</span>
            </button>

            {showCriticalityDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Criticality</h4>
                  <button 
                    className="select-all-btn" 
                    onClick={() => toggleAllItems('criticalities')}
                  >
                    {criticalityFilters.length === uniqueCriticalities.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueCriticalities.map(criticality => (
                    <div key={criticality} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={criticalityFilters.includes(criticality)}
                          onChange={() => toggleFilterItem('criticalities', criticality)}
                        />
                        <span>{criticality}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowCriticalityDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Source Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showSourceDropdown ? 'active' : ''}`}
              onClick={toggleSourceDropdown}
            >
              All Sources
              <span className="filter-count">{sourceFilters.length}/{uniqueSources.length}</span>
            </button>

            {showSourceDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Source</h4>
                  <button 
                    className="select-all-btn" 
                    onClick={() => toggleAllItems('sources')}
                  >
                    {sourceFilters.length === uniqueSources.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueSources.map(source => (
                    <div key={source} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={sourceFilters.includes(source)}
                          onChange={() => toggleFilterItem('sources', source)}
                        />
                        <span>{source}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowSourceDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button className="reset-button" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="filter-section-right">
          <button 
            className="control-btn refresh-btn" 
            onClick={fetchDefects} 
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
          </button>

          <button 
            className="control-btn export-btn" 
            title="Export data" 
            onClick={handleExport}
            disabled={filteredDefects.length === 0}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Charts Dashboard */}
      <div className="dashboard-charts">
        <div className="dashboard-card">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              <span>Loading chart data...</span>
            </div>
          ) : (
            <TotalDefectsChart data={filteredDefects} />
          )}
        </div>

        <div className="dashboard-card">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              <span>Loading chart data...</span>
            </div>
          ) : (
            <CriticalityChart data={filteredDefects} />
          )}
        </div>
      </div>

      {/* Equipment Defects Section */}
      <div className="vessel-table-wrapper">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading defect data...</p>
          </div>
        ) : filteredDefects.length === 0 ? (
          <div className="no-results">
            <p>No defects match your current filters. Try adjusting your search or filters.</p>
            <button className="reset-filters" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <DefectTable
            defects={filteredDefects}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentUser={currentUser}
            loading={loading}
            removeFilterBar={true}
          />
        )}
      </div>
    </div>
  );
};

export default DefectsDashboard;