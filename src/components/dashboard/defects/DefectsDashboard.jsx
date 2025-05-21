// src/components/dashboard/defects/DefectsDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import '../DashboardStyles.css'; // Assuming this contains the shared dashboard styles
import DefectTable from './DefectTable';
import CriticalityChart from './charts/CriticalityChart';
import TotalDefectsChart from './charts/TotalDefectsChart';
import defectService from './services/defectService';

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
  const currentUser = {
    id: 123,
    name: 'John Doe',
    role: 'admin'
  };

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

  // Apply filters and search
  useEffect(() => {
    if (!defects.length) {
      setFilteredDefects([]);
      return;
    }

    let results = [...defects];

    // Apply status filters if any selected
    if (statusFilters.length > 0) {
      results = results.filter(defect =>
        !defect['Status (Vessel)'] || statusFilters.includes(defect['Status (Vessel)'])
      );
    }

    // Apply criticality filters if any selected
    if (criticalityFilters.length > 0) {
      results = results.filter(defect =>
        !defect.Criticality || criticalityFilters.includes(defect.Criticality)
      );
    }

    // Apply source filters if any selected
    if (sourceFilters.length > 0) {
      results = results.filter(defect =>
        !defect.Source || sourceFilters.includes(defect.Source)
      );
    }

    // Apply search term if not empty
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(defect =>
        Object.values(defect).some(value =>
          value && String(value).toLowerCase().includes(term)
        )
      );
    }

    setFilteredDefects(results);
  }, [defects, searchTerm, statusFilters, criticalityFilters, sourceFilters]);

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
  const toggleAllItems = (type) => {
    // Get all unique values from all defects
    const uniqueStatuses = [...new Set(defects.map(d => d['Status (Vessel)']).filter(Boolean))];
    const uniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))];
    const uniqueSources = [...new Set(defects.map(d => d.Source).filter(Boolean))];

    switch(type) {
      case 'statuses':
        setStatusFilters(statusFilters.length === uniqueStatuses.length ? [] : uniqueStatuses);
        break;
      case 'criticalities':
        setCriticalityFilters(criticalityFilters.length === uniqueCriticalities.length ? [] : uniqueCriticalities);
        break;
      case 'sources':
        setSourceFilters(sourceFilters.length === uniqueSources.length ? [] : uniqueSources);
        break;
      default:
        break;
    }
  };

  // Toggle a specific filter item
  const toggleFilterItem = (type, item) => {
    switch(type) {
      case 'statuses':
        setStatusFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      case 'criticalities':
        setCriticalityFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      case 'sources':
        setSourceFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      default:
        break;
    }
  };

  // Export data to Excel
  const handleExport = () => {
    console.log('Exporting data to Excel...');
    // Implement export logic here
  };

  // Table action handlers
  const handleView = (defect) => {
    console.log('View defect:', defect);
  };

  const handleEdit = (defect) => {
    console.log('Edit defect:', defect);
  };

  const handleDelete = async (defect) => {
    if (window.confirm(`Are you sure you want to delete this defect?`)) {
      try {
        await defectService.deleteDefect(defect.id);
        fetchDefects();
      } catch (error) {
        console.error('Error deleting defect:', error);
        alert('Failed to delete defect. Please try again.');
      }
    }
  };

  // Close all dropdowns when clicking elsewhere
  const closeAllDropdowns = () => {
    setShowStatusDropdown(false);
    setShowCriticalityDropdown(false);
    setShowSourceDropdown(false);
    setShowSearch(false);
  };

  // Get unique values for filter options
  const uniqueStatuses = useMemo(() =>
    [...new Set(defects.map(d => d['Status (Vessel)']).filter(Boolean))],
    [defects]
  );

  const uniqueCriticalities = useMemo(() =>
    [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined), // Filter out null/undefined
    [defects]
  );


  const uniqueSources = useMemo(() =>
    [...new Set(defects.map(d => d.Source).filter(Boolean))],
    [defects]
  );

  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section-left">
           <h1 className="dashboard-title">Defects</h1> {/* Added Dashboard Title */}
          <div className="search-container">
            <button
              className="search-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowCriticalityDropdown(false);
                setShowSourceDropdown(false);
              }}
            >
              All Statuses
              <span className="filter-count">{statusFilters.length}/{uniqueStatuses.length}</span>
            </button>

            {showStatusDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Status</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('statuses')}>
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
              onClick={() => {
                setShowCriticalityDropdown(!showCriticalityDropdown);
                setShowStatusDropdown(false);
                setShowSourceDropdown(false);
              }}
            >
              All Criticality
              <span className="filter-count">{criticalityFilters.length}/{uniqueCriticalities.length}</span>
            </button>

            {showCriticalityDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Criticality</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('criticalities')}>
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
              onClick={() => {
                setShowSourceDropdown(!showSourceDropdown);
                setShowStatusDropdown(false);
                setShowCriticalityDropdown(false);
              }}
            >
              All Sources
              <span className="filter-count">{sourceFilters.length}/{uniqueSources.length}</span>
            </button>

            {showSourceDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Source</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('sources')}>
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
          <button className="control-btn refresh-btn" onClick={fetchDefects} title="Refresh data">
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
          </button>

          <button className="control-btn export-btn" title="Export data" onClick={handleExport}>
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
          <div className="dashboard-card-body"> {/* Use dashboard-card-body */}
            {loading ? (
              <div className="chart-loading">
                <div className="loading-spinner"></div>
                <span>Loading chart data...</span>
              </div>
            ) : (
              <TotalDefectsChart data={filteredDefects} />
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-body"> {/* Use dashboard-card-body */}
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
      </div>

      {/* Equipment Defects Section */}
      <div className="vessel-table-wrapper"> {/* Use vessel-table-wrapper for consistent table styling */}
        {loading ? (
          <div className="loading-container"> {/* Use loading-container */}
            <div className="loading-spinner"></div>
            <p>Loading defect data...</p>
          </div>
        ) : filteredDefects.length === 0 ? (
          <div className="no-results"> {/* Use no-results */}
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
            removeFilterBar={true} // This tells DefectTable not to render its own filter bar
          />
        )}
      </div>
    </div>
  );
};

export default DefectsDashboard;