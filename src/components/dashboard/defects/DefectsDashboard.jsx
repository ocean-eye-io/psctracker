import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import '../DashboardStyles.css'; // Assuming this contains the shared dashboard styles
import DefectTable from './DefectTable';
import CriticalityChart from './charts/CriticalityChart';
import TotalDefectsChart from './charts/TotalDefectsChart';
import defectService from './services/defectService';
import DefectDialog from './DefectDialog'; // <-- NEW: Import DefectDialog

const DefectsDashboard = () => {
  // State variables - ALL STATE AND HOOKS MUST BE DECLARED FIRST
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

  // Permissions mock (for now, assume full permissions)
  const permissions = useMemo(() => ({
    actionPermissions: {
      create: true,
      update: true,
      delete: true,
      export: true,
      import: true,
      generateReport: true
    },
    fieldPermissions: {
      // You can define field-level permissions here if needed
      // e.g., target_date: { visible: true, editable: true }
    }
  }), []);

  // Defect Dialog State
  const [isDefectDialogOpen, setIsDefectDialogOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState(null);

  // Mock vessel data (replace with actual fetch from your RDS if needed)
  const vesselNames = useMemo(() => ({
    'vessel1_id': 'MV Alpha',
    'vessel2_id': 'MV Beta',
    'vessel3_id': 'MV Gamma',
  }), []);

  // Now you can safely use isDefectDialogOpen after it's declared
  console.log("DefectsDashboard rendering. isDefectDialogOpen:", isDefectDialogOpen);


  // Fetch defects data from API
  const fetchDefects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await defectService.getAllDefects();
      console.log('Fetched defects:', data.length);

      // Add dummy vessel_id and vessel_name if not present in fetched data
      const defectsWithVesselInfo = data.map(d => ({
        ...d,
        vessel_id: d.vessel_id || 'vessel1_id', // Assign a default dummy vessel_id
        vessel_name: d.vessel_name || vesselNames[d.vessel_id] || 'MV Alpha' // Assign dummy vessel name
      }));

      setDefects(defectsWithVesselInfo);
      setFilteredDefects(defectsWithVesselInfo);

      // Initialize filters with all available options
      const uniqueStatuses = [...new Set(defectsWithVesselInfo.map(d => d['Status']).filter(Boolean))]; // Use 'Status' as per DIALOG config
      const uniqueCriticalities = [...new Set(defectsWithVesselInfo.map(d => d.Criticality).filter(Boolean))];
      const uniqueSources = [...new Set(defectsWithVesselInfo.map(d => d.raised_by).filter(Boolean))]; // Use 'raised_by'

      setStatusFilters(uniqueStatuses);
      setCriticalityFilters(uniqueCriticalities);
      setSourceFilters(uniqueSources);

    } catch (error) {
      console.error('Error fetching defects:', error);
      setError('Failed to fetch data. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  }, [vesselNames]); // Added vesselNames to dependencies

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
        !defect['Status'] || statusFilters.includes(defect['Status']) // Use 'Status'
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
        !defect.raised_by || sourceFilters.includes(defect.raised_by) // Use 'raised_by'
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
    const uniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))]; // Use 'Status'
    const uniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))];
    const uniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))]; // Use 'raised_by'

    setStatusFilters(uniqueStatuses);
    setCriticalityFilters(uniqueCriticalities);
    setSourceFilters(uniqueSources);
  }, [defects]);

  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    // Get all unique values from all defects
    const uniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))]; // Use 'Status'
    const uniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))];
    const uniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))]; // Use 'raised_by'

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
    // When viewing, we treat it as an edit operation to open the dialog
    handleEditDefect(defect);
  };

  // NEW: Handle Add Defect
  const handleAddDefect = useCallback(() => {
    console.log("1. handleAddDefect called!"); // <-- Added console.log
    // Initialize a new defect object with default values
    setCurrentDefect({
      id: `temp-${Date.now()}`, // Temporary ID for new defects
      vessel_id: Object.keys(vesselNames)[0] || '', // Default to first vessel or empty
      Equipments: '',
      Description: '',
      'Action Planned': '',
      Criticality: '',
      Status: 'OPEN', // Use 'Status' as per DIALOG config
      'Date Reported': new Date().toISOString().split('T')[0],
      'Date Completed': '',
      target_date: '',
      initial_files: [],
      completion_files: [],
      raised_by: '',
      closure_comments: '',
      external_visibility: true, // Default to visible
      Comments: ''
    });
    // Note: currentDefect here might be stale due to closure, but the setter works
    console.log("2. currentDefect set (inside handleAddDefect). Dialog will attempt to open."); // <-- Added console.log
    setIsDefectDialogOpen(true);
    console.log("3. setIsDefectDialogOpen(true) called."); // <-- Added console.log
  }, [vesselNames]);

  // NEW: Handle Edit Defect
  const handleEditDefect = useCallback((defect) => {
    console.log("handleEditDefect called with defect:", defect);
    console.log("Defect vessel_id (from dashboard):", defect.vessel_id); // <-- Check this
    console.log("Defect vessel_name (from dashboard):", defect.vessel_name); // <-- Check this
    setCurrentDefect(defect);
    setIsDefectDialogOpen(true);
  }, []);

  // NEW: Handle Save Defect (Add/Edit)
  const handleSaveDefect = useCallback(async (updatedDefect) => {
    try {
      setLoading(true);
      const isNew = updatedDefect.id?.startsWith('temp-');

      let savedDefect;
      if (isNew) {
        // Simulate API call for adding
        const newId = `defect-${Date.now()}`;
        savedDefect = { ...updatedDefect, id: newId, created_at: new Date().toISOString() };
        console.log('Simulating add defect:', savedDefect);
        await defectService.addDefect(savedDefect); // Placeholder API call
      } else {
        // Simulate API call for updating
        savedDefect = { ...updatedDefect, updated_at: new Date().toISOString() };
        console.log('Simulating update defect:', savedDefect);
        console.log('Attempting to update defect with payload:', savedDefect); // <-- Added for debugging 500 error
        await defectService.updateDefect(savedDefect.id, savedDefect); // Placeholder API call
      }

      // Re-fetch all defects to ensure data consistency and update UI
      await fetchDefects();

      // Close dialog and reset current defect
      setIsDefectDialogOpen(false);
      setCurrentDefect(null);

      return savedDefect; // Return the saved defect for PDF generation in dialog
    } catch (err) {
      console.error('Error saving defect:', err);
      setError('Failed to save defect. Please try again.');
      throw err; // Re-throw to be caught by DefectDialog
    } finally {
      setLoading(false);
    }
  }, [fetchDefects]);


  const handleDelete = async (defect) => {
    if (window.confirm(`Are you sure you want to delete defect ID: ${defect.id}?`)) {
      try {
        setLoading(true);
        await defectService.deleteDefect(defect.id); // Placeholder API call
        fetchDefects();
      } catch (error) {
        console.error('Error deleting defect:', error);
        alert('Failed to delete defect. Please try again.');
      } finally {
        setLoading(false);
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
    [...new Set(defects.map(d => d['Status']).filter(Boolean))], // Use 'Status'
    [defects]
  );

  const uniqueCriticalities = useMemo(() =>
    [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined), // Filter out null/undefined
    [defects]
  );


  const uniqueSources = useMemo(() =>
    [...new Set(defects.map(d => d.raised_by).filter(Boolean))], // Use 'raised_by'
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
            onEdit={handleEditDefect} // Pass the new edit handler
            onDelete={handleDelete}
            currentUser={currentUser}
            loading={loading}
            removeFilterBar={true}
            onAddDefect={handleAddDefect} // Pass the new add handler
            permissions={permissions} // Pass permissions
            onExport={handleExport} // Pass export handler
            onImport={() => console.log('Import VIR Excel (placeholder)')} // Placeholder for import
          />
        )}
      </div>

      {/* NEW: Defect Dialog */}
      <DefectDialog
        isOpen={isDefectDialogOpen}
        onClose={() => {
          console.log("DefectDialog onClose triggered."); // <-- Added console.log
          setIsDefectDialogOpen(false);
          setCurrentDefect(null);
        }}
        defect={currentDefect}
        // The onChange prop is no longer needed as DefectDialog manages its own state
        // onChange={(field, value) => setCurrentDefect(prev => ({ ...prev, [field]: value }))}
        onSave={handleSaveDefect}
        vessels={vesselNames} // Pass your vessel names map
        isNew={currentDefect?.id?.startsWith('temp-')}
        permissions={permissions}
        isExternal={false} // Adjust based on your user role logic
      />
    </div>
  );
};

export default DefectsDashboard;