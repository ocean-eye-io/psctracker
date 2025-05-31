// src/components/dashboard/defects/DefectsDashboard.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import styles from './defect.module.css'; // Import the CSS module
import DefectTable from './DefectTable';
import CriticalityChart from './charts/CriticalityChart';
import TotalDefectsChart from './charts/TotalDefectsChart';
import defectService from './services/defectService';
import DefectDialog from './DefectDialog';
import { useAuth } from '../../../context/AuthContext';

const DefectsDashboard = () => {
  // State variables - ALL STATE AND HOOKS MUST BE DECLARED FIRST
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vessels, setVessels] = useState([]); // State to store user's assigned vessels

  // Filter state variables
  const [statusFilters, setStatusFilters] = useState([]);
  const [criticalityFilters, setCriticalityFilters] = useState([]);
  const [sourceFilters, setSourceFilters] = useState([]);

  // Dropdown visibility state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCriticalityDropdown, setShowCriticalityDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Auth context to get current user's ID
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.userId; // Get userId from auth context

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

  console.log("DefectsDashboard rendering. isDefectDialogOpen:", isDefectDialogOpen);

  // Fetch user's assigned vessels
  const fetchUserVessels = useCallback(async () => {
    if (!userId) {
      console.log("User ID not available, skipping vessel fetch.");
      return;
    }
    try {
      const assignedVessels = await defectService.getUserAssignedVessels(userId);
      setVessels(assignedVessels);
      console.log("Fetched assigned vessels:", assignedVessels);
    } catch (err) {
      console.error("Error fetching user's assigned vessels:", err);
      setError("Failed to load assigned vessels.");
    }
  }, [userId]);

  // Fetch defects data from API
  const fetchDefects = useCallback(async () => {
    if (!userId) {
      console.log("User ID not available, skipping defect fetch.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await defectService.getAllDefects(userId);
      console.log('Fetched defects:', data.length);

      setDefects(data); // Set raw defects from API

      // Initialize filters with all available options based on the fetched data
      const uniqueStatusesFromData = [...new Set(data.map(d => d['Status']).filter(Boolean))];
      const uniqueCriticalitiesFromData = [...new Set(data.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
      const uniqueSourcesFromData = [...new Set(data.map(d => d.raised_by).filter(Boolean))];

      setStatusFilters(uniqueStatusesFromData);
      setCriticalityFilters(uniqueCriticalitiesFromData);
      setSourceFilters(uniqueSourcesFromData);

    } catch (error) {
      console.error('Error fetching defects:', error.message);
      setError(`Failed to fetch data: ${error.message}. Please check the API connection.`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial data fetch for vessels and defects
  useEffect(() => {
    if (!authLoading && userId) {
      fetchUserVessels();
      fetchDefects();
    }
  }, [authLoading, userId, fetchUserVessels, fetchDefects]);

  // Memoized filtered defects to prevent re-calculation on every render
  const filteredDefects = useMemo(() => {
    if (!defects.length) {
      return [];
    }

    let results = [...defects];

    const allUniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const allUniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const allUniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];

    // Apply status filters if any selected (i.e., not all unique statuses are selected)
    if (statusFilters.length > 0 && statusFilters.length < allUniqueStatuses.length) {
      results = results.filter(defect =>
        statusFilters.includes(defect['Status'])
      );
    }

    // Apply criticality filters if any selected
    if (criticalityFilters.length > 0 && criticalityFilters.length < allUniqueCriticalities.length) {
      results = results.filter(defect =>
        criticalityFilters.includes(defect.Criticality)
      );
    }

    // Apply source filters if any selected
    if (sourceFilters.length > 0 && sourceFilters.length < allUniqueSources.length) {
      results = results.filter(defect =>
        sourceFilters.includes(defect.raised_by)
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
    return results;
  }, [defects, searchTerm, statusFilters, criticalityFilters, sourceFilters]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');

    // Reset filters to include all options based on current defects
    const uniqueStatusesFromDefects = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const uniqueCriticalitiesFromDefects = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const uniqueSourcesFromDefects = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];

    setStatusFilters(uniqueStatusesFromDefects);
    setCriticalityFilters(uniqueCriticalitiesFromDefects);
    setSourceFilters(uniqueSourcesFromDefects);
  }, [defects]);

  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    const allUniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const allUniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const allUniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];

    switch(type) {
      case 'statuses':
        setStatusFilters(statusFilters.length === allUniqueStatuses.length ? [] : allUniqueStatuses);
        break;
      case 'criticalities':
        setCriticalityFilters(criticalityFilters.length === allUniqueCriticalities.length ? [] : allUniqueCriticalities);
        break;
      case 'sources':
        setSourceFilters(sourceFilters.length === allUniqueSources.length ? [] : allUniqueSources);
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
    handleEditDefect(defect);
  };

  // Handle Add Defect
  const handleAddDefect = useCallback(() => {
    console.log("1. handleAddDefect called!");
    setCurrentDefect({
      id: `temp-${Date.now()}`,
      vessel_id: vessels.length > 0 ? vessels[0].vessel_id : '',
      Equipments: '',
      Description: '',
      'Action Planned': '',
      Criticality: '',
      Status: 'OPEN',
      'Date Reported': new Date().toISOString().split('T')[0],
      'Date Completed': '',
      target_date: '',
      initial_files: [],
      completion_files: [],
      raised_by: currentUser?.username || '',
      closure_comments: '',
      external_visibility: true,
      Comments: ''
    });
    console.log("2. currentDefect set (inside handleAddDefect). Dialog will attempt to open.");
    setIsDefectDialogOpen(true);
    console.log("3. setIsDefectDialogOpen(true) called.");
  }, [vessels, currentUser]);

  // Handle Edit Defect
  const handleEditDefect = useCallback((defect) => {
    console.log("handleEditDefect called with defect:", defect);
    setCurrentDefect(defect);
    setIsDefectDialogOpen(true);
  }, []);

  // Handle Save Defect (Add/Edit)
  const handleSaveDefect = useCallback(async (updatedDefect) => {
    if (!userId) {
      setError("User not authenticated. Cannot save defect.");
      return;
    }
    try {
      setLoading(true);
      const isNew = updatedDefect.id?.startsWith('temp-');

      let savedDefect;
      if (isNew) {
        savedDefect = { ...updatedDefect, id: undefined };
        console.log('Attempting to create defect with payload:', savedDefect);
        await defectService.createDefect(savedDefect, userId);
      } else {
        savedDefect = { ...updatedDefect };
        console.log('Attempting to update defect with payload:', savedDefect);
        await defectService.updateDefect(savedDefect.id, savedDefect, userId);
      }

      await fetchDefects(); // Re-fetch all defects to ensure data consistency and update UI

      setIsDefectDialogOpen(false);
      setCurrentDefect(null);

      return savedDefect;
    } catch (err) {
      console.error('Error saving defect:', err);
      setError(`Failed to save defect: ${err.message}. Please try again.`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDefects, userId]);

  const handleDelete = async (defect) => {
    if (!userId) {
      setError("User not authenticated. Cannot delete defect.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete defect ID: ${defect.id}?`)) {
      try {
        setLoading(true);
        await defectService.deleteDefect(defect.id, userId);
        fetchDefects();
      } catch (error) {
        console.error('Error deleting defect:', error);
        setError(`Failed to delete defect: ${error.message}. Please try again.`);
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

  // Get unique values for filter options (these are used for the dropdown options)
  const uniqueStatuses = useMemo(() =>
    [...new Set(defects.map(d => d['Status']).filter(Boolean))],
    [defects]
  );

  const uniqueCriticalities = useMemo(() =>
    [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined),
    [defects]
  );

  const uniqueSources = useMemo(() =>
    [...new Set(defects.map(d => d.raised_by).filter(Boolean))],
    [defects]
  );

  // Show loading state for the entire dashboard if auth is still loading or initial data is loading
  if (authLoading || loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer} onClick={closeAllDropdowns}>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterSectionLeft}>
          <h1 className={styles.dashboardTitle}>Defects</h1>
          <div className={styles.searchContainer}>
            <button
              className={styles.searchToggle}
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
            >
              <Search size={14} />
            </button>

            {showSearch && (
              <div className={styles.searchPopup} onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Search defects..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterLabel}>
          <Filter size={14} />
        </div>

        <div className={styles.filterChips}>
          {/* Status Filter Dropdown */}
          <div className={styles.filterDropdownContainer} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.filterDropdownButton} ${showStatusDropdown ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusDropdown(!showStatusDropdown);
                setShowCriticalityDropdown(false);
                setShowSourceDropdown(false);
              }}
            >
              All Statuses
              <span className={styles.filterCount}>{statusFilters.length}/{uniqueStatuses.length}</span>
            </button>

            {showStatusDropdown && (
              <div className={styles.filterDropdownContent}>
                <div className={styles.filterDropdownHeader}>
                  <h4>Filter by Status</h4>
                  <button className={styles.selectAllBtn} onClick={() => toggleAllItems('statuses')}>
                    {statusFilters.length === uniqueStatuses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className={styles.filterDropdownItems}>
                  {uniqueStatuses.map(status => (
                    <div key={status} className={styles.filterCheckboxItem}>
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
                <div className={styles.filterDropdownFooter}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => setShowStatusDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Criticality Filter Dropdown */}
          <div className={styles.filterDropdownContainer} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.filterDropdownButton} ${showCriticalityDropdown ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowCriticalityDropdown(!showCriticalityDropdown);
                setShowStatusDropdown(false);
                setShowSourceDropdown(false);
              }}
            >
              All Criticality
              <span className={styles.filterCount}>{criticalityFilters.length}/{uniqueCriticalities.length}</span>
            </button>

            {showCriticalityDropdown && (
              <div className={styles.filterDropdownContent}>
                <div className={styles.filterDropdownHeader}>
                  <h4>Filter by Criticality</h4>
                  <button className={styles.selectAllBtn} onClick={() => toggleAllItems('criticalities')}>
                    {criticalityFilters.length === uniqueCriticalities.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className={styles.filterDropdownItems}>
                  {uniqueCriticalities.map(criticality => (
                    <div key={criticality} className={styles.filterCheckboxItem}>
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
                <div className={styles.filterDropdownFooter}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => setShowCriticalityDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Source Filter Dropdown */}
          <div className={styles.filterDropdownContainer} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.filterDropdownButton} ${showSourceDropdown ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowSourceDropdown(!showSourceDropdown);
                setShowStatusDropdown(false);
                setShowCriticalityDropdown(false);
              }}
            >
              All Sources
              <span className={styles.filterCount}>{sourceFilters.length}/{uniqueSources.length}</span>
            </button>

            {showSourceDropdown && (
              <div className={styles.filterDropdownContent}>
                <div className={styles.filterDropdownHeader}>
                  <h4>Filter by Source</h4>
                  <button className={styles.selectAllBtn} onClick={() => toggleAllItems('sources')}>
                    {sourceFilters.length === uniqueSources.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className={styles.filterDropdownItems}>
                  {uniqueSources.map(source => (
                    <div key={source} className={styles.filterCheckboxItem}>
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
                <div className={styles.filterDropdownFooter}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => setShowSourceDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button className={styles.resetButton} onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className={styles.filterSectionRight}>
          <button className={`${styles.controlBtn} ${styles.refreshBtn}`} onClick={fetchDefects} title="Refresh data">
            <RefreshCw size={14} className={loading ? styles.spinning : ""} />
          </button>

          <button className={`${styles.controlBtn} ${styles.exportBtn}`} title="Export data" onClick={handleExport}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Charts Dashboard */}
      <div className={styles.dashboardCharts}>
        <div className={styles.dashboardCard}>
          <div className={styles.dashboardCardBody}>
            {loading ? (
              <div className={styles.chartLoading}>
                <div className={styles.loadingSpinner}></div>
                <span>Loading chart data...</span>
              </div>
            ) : (
              <TotalDefectsChart data={filteredDefects} />
            )}
          </div>
        </div>

        <div className={styles.dashboardCard}>
          <div className={styles.dashboardCardBody}>
            {loading ? (
              <>
                <div className={styles.loadingSpinner}></div>
                <span>Loading chart data...</span>
              </>
            ) : (
              <CriticalityChart data={filteredDefects} />
            )}
          </div>
        </div>
      </div>

      {/* Equipment Defects Section */}
      <div className={styles.vesselTableWrapper}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading defect data...</p>
          </div>
        ) : filteredDefects.length === 0 ? (
          <div className={styles.noResults}>
            <p>No defects match your current filters. Try adjusting your search or filters.</p>
            <button className={styles.resetFilters} onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <DefectTable
            defects={filteredDefects}
            onView={handleView}
            onEdit={handleEditDefect}
            onDelete={handleDelete}
            currentUser={currentUser}
            loading={loading}
            removeFilterBar={true}
            onAddDefect={handleAddDefect}
            permissions={permissions}
            onExport={handleExport}
            onImport={() => console.log('Import VIR Excel (placeholder)')}
          />
        )}
      </div>

      {/* Defect Dialog */}
      <DefectDialog
        isOpen={isDefectDialogOpen}
        onClose={() => {
          console.log("DefectDialog onClose triggered.");
          setIsDefectDialogOpen(false);
          setCurrentDefect(null);
        }}
        defect={currentDefect}
        onSave={handleSaveDefect}
        vessels={vessels}
        isNew={currentDefect?.id?.startsWith('temp-')}
        permissions={permissions}
        isExternal={false}
      />
    </div>
  );
};

export default DefectsDashboard;