// src/components/dashboard/defects/DefectsDashboard.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Download, RefreshCw, AlertTriangle, Shield, Eye, Upload, Plus } from 'lucide-react';
import styles from './defect.module.css';
import DefectTable from './DefectTable';
import CriticalityChart from './charts/CriticalityChart';
import TotalDefectsChart from './charts/TotalDefectsChart';
import defectService from './services/defectService';
import DefectDialog from './DefectDialog';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';

const DefectsDashboard = () => {
  // Core state variables
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vessels, setVessels] = useState([]);

  // Filter state variables
  const [statusFilters, setStatusFilters] = useState([]);
  const [criticalityFilters, setCriticalityFilters] = useState([]);
  const [sourceFilters, setSourceFilters] = useState([]);
  const [vesselFilters, setVesselFilters] = useState([]); // Add this line

  // Dropdown visibility state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCriticalityDropdown, setShowCriticalityDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showVesselDropdown, setShowVesselDropdown] = useState(false); // Add this line
  const [showSearch, setShowSearch] = useState(false);

  // Auth and Permission contexts
  const { currentUser, loading: authLoading } = useAuth();
  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    canImport,
    canGenerateReport,
    isReadOnly,
    hasWriteAccess,
    getPermissionStatus,
    roleName,
    refreshPermissions
  } = usePermissions();

  // Dialog state
  const [isDefectDialogOpen, setIsDefectDialogOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState(null);

  // User ID from auth context
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id;

  console.log("DefectsDashboard: Rendering with permissions:", {
    permissions,
    permissionStatus: getPermissionStatus(),
    canCreate: canCreate(),
    canUpdate: canUpdate(),
    canDelete: canDelete(),
    roleName
  });

  // Fetch user's assigned vessels
  const fetchUserVessels = useCallback(async () => {
    if (!userId) {
      console.log("DefectsDashboard: No user ID available, skipping vessel fetch");
      return;
    }

    try {
      console.log("DefectsDashboard: Fetching user vessels for user:", userId);
      const assignedVessels = await defectService.getUserAssignedVessels(userId);
      setVessels(assignedVessels);
      console.log("DefectsDashboard: Successfully fetched assigned vessels:", assignedVessels);
    } catch (err) {
      console.error("DefectsDashboard: Error fetching user's assigned vessels:", err);
      setError("Failed to load assigned vessels.");
    }
  }, [userId]);

  // Fetch defects data from API
  const fetchDefects = useCallback(async () => {
    if (!userId) {
      console.log("DefectsDashboard: No user ID available, skipping defects fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("DefectsDashboard: Fetching defects for user:", userId);
      const data = await defectService.getAllDefects(userId);
      console.log('DefectsDashboard: Successfully fetched defects. Count:', data.length);

      setDefects(data);

      // Initialize filters with all available options based on fetched data
      const uniqueStatusesFromData = [...new Set(data.map(d => d['Status']).filter(Boolean))];
      const uniqueCriticalitiesFromData = [...new Set(data.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
      const uniqueSourcesFromData = [...new Set(data.map(d => d.raised_by).filter(Boolean))];
      const uniqueVesselsFromData = [...new Set(data.map(d => d.vessel_name).filter(Boolean))]; // Add this line

      setStatusFilters(uniqueStatusesFromData);
      setCriticalityFilters(uniqueCriticalitiesFromData);
      setSourceFilters(uniqueSourcesFromData);
      setVesselFilters(uniqueVesselsFromData); // Add this line

      console.log('DefectsDashboard: Filters initialized with unique values from data');

    } catch (error) {
      console.error('DefectsDashboard: Error fetching defects:', error.message);
      setError(`Failed to fetch defects: ${error.message}. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial data fetch - wait for auth and permissions to load
  useEffect(() => {
    const shouldFetchData = !authLoading && !permissionsLoading && userId && canRead();
    
    if (shouldFetchData) {
      console.log("DefectsDashboard: Initial data fetch triggered");
      fetchUserVessels();
      fetchDefects();
    } else {
      console.log("DefectsDashboard: Waiting for auth/permissions or insufficient read access", {
        authLoading,
        permissionsLoading,
        userId: !!userId,
        canRead: canRead()
      });
    }
  }, [authLoading, permissionsLoading, userId, canRead, fetchUserVessels, fetchDefects]);

  // Memoized filtered defects
  const filteredDefects = useMemo(() => {
    if (!defects.length) {
      return [];
    }

    let results = [...defects];

    const allUniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const allUniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const allUniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];
    const allUniqueVessels = [...new Set(defects.map(d => d.vessel_name).filter(Boolean))]; // Add this line

    // Apply vessel filters (Add this section)
    if (vesselFilters.length > 0 && vesselFilters.length < allUniqueVessels.length) {
      results = results.filter(defect => vesselFilters.includes(defect.vessel_name));
    }

    // Apply status filters
    if (statusFilters.length > 0 && statusFilters.length < allUniqueStatuses.length) {
      results = results.filter(defect => statusFilters.includes(defect['Status']));
    }

    // Apply criticality filters
    if (criticalityFilters.length > 0 && criticalityFilters.length < allUniqueCriticalities.length) {
      results = results.filter(defect => criticalityFilters.includes(defect.Criticality));
    }

    // Apply source filters
    if (sourceFilters.length > 0 && sourceFilters.length < allUniqueSources.length) {
      results = results.filter(defect => sourceFilters.includes(defect.raised_by));
    }

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(defect =>
        Object.values(defect).some(value =>
          value && String(value).toLowerCase().includes(term)
        )
      );
    }

    console.log("DefectsDashboard: Filtered defects count:", results.length);
    return results;
  }, [defects, searchTerm, statusFilters, criticalityFilters, sourceFilters, vesselFilters]); // Add vesselFilters to dependencies

  // Reset all filters
  const resetFilters = useCallback(() => {
    console.log("DefectsDashboard: Resetting all filters");
    setSearchTerm('');

    const uniqueStatusesFromDefects = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const uniqueCriticalitiesFromDefects = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const uniqueSourcesFromDefects = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];
    const uniqueVesselsFromDefects = [...new Set(defects.map(d => d.vessel_name).filter(Boolean))]; // Add this line

    setStatusFilters(uniqueStatusesFromDefects);
    setCriticalityFilters(uniqueCriticalitiesFromDefects);
    setSourceFilters(uniqueSourcesFromDefects);
    setVesselFilters(uniqueVesselsFromDefects); // Add this line
  }, [defects]);

  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    const allUniqueStatuses = [...new Set(defects.map(d => d['Status']).filter(Boolean))];
    const allUniqueCriticalities = [...new Set(defects.map(d => d.Criticality).filter(Boolean))].filter(c => c !== null && c !== undefined);
    const allUniqueSources = [...new Set(defects.map(d => d.raised_by).filter(Boolean))];
    const allUniqueVessels = [...new Set(defects.map(d => d.vessel_name).filter(Boolean))]; // Add this line

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
      case 'vessels': // Add this case
        setVesselFilters(vesselFilters.length === allUniqueVessels.length ? [] : allUniqueVessels);
        break;
      default:
        break;
    }
  };

  // Toggle individual filter items
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
      case 'vessels': // Add this case
        setVesselFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      default:
        break;
    }
  };

  // Export handler with permission check
  const handleExport = useCallback(() => {
    if (!canExport()) {
      console.warn('DefectsDashboard: Export not allowed for current user');
      setError('You do not have permission to export data.');
      return;
    }

    console.log('DefectsDashboard: Exporting data...');
    
    try {
      // Get visible columns for export
      const visibleColumns = Object.entries(DEFECT_FIELDS?.TABLE || {})
        .filter(([_, field]) => !field.isAction)
        .sort((a, b) => a[1].priority - b[1].priority);
      
      // Create CSV header
      const header = visibleColumns.map(([_, field]) => field.label).join(',');
      
      // Create CSV rows
      const rows = filteredDefects.map(defect => {
        return visibleColumns.map(([_, field]) => {
          const value = defect[field.dbField];
          return value !== null && value !== undefined 
            ? `"${String(value).replace(/"/g, '""')}"` 
            : '';
        }).join(',');
      });
      
      // Combine header and rows
      const csv = [header, ...rows].join('\n');
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `defects_export_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('DefectsDashboard: Export completed successfully');
    } catch (exportError) {
      console.error('DefectsDashboard: Export failed:', exportError);
      setError('Failed to export data. Please try again.');
    }
  }, [canExport, filteredDefects]);

  // Import handler with permission check
  const handleImport = useCallback(() => {
    if (!canImport()) {
      console.warn('DefectsDashboard: Import not allowed for current user');
      setError('You do not have permission to import data.');
      return;
    }

    console.log('DefectsDashboard: Import VIR Excel (placeholder)');
    // TODO: Implement import functionality
  }, [canImport]);

  // Add defect handler with permission check
  const handleAddDefect = useCallback(() => {
    if (!canCreate()) {
      console.warn('DefectsDashboard: Create permission not granted for current user');
      setError('You do not have permission to add new defects.');
      return;
    }

    console.log("DefectsDashboard: Adding new defect");
    setCurrentDefect({
      id: `temp-${Date.now()}`,
      vessel_id: vessels.length > 0 ? vessels[0].vessel_id : '',
      vessel_name: vessels.length > 0 ? vessels[0].vessel_name : '',
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
      raised_by: currentUser?.username || currentUser?.cognito_username || '',
      closure_comments: '',
      external_visibility: true,
      Comments: ''
    });
    setIsDefectDialogOpen(true);
  }, [vessels, currentUser, canCreate]);

  // Edit defect handler
  const handleEditDefect = useCallback((defect) => {
    console.log("DefectsDashboard: Editing defect:", defect.id);
    console.log("DefectsDashboard: User permissions - canUpdate:", canUpdate(), "isReadOnly:", isReadOnly());
    setCurrentDefect(defect);
    setIsDefectDialogOpen(true);
  }, [canUpdate, isReadOnly]);

  // View defect handler (same as edit but for clarity)
  const handleViewDefect = useCallback((defect) => {
    console.log("DefectsDashboard: Viewing defect:", defect.id);
    handleEditDefect(defect);
  }, [handleEditDefect]);

  // Save defect handler with permission validation
  const handleSaveDefect = useCallback(async (updatedDefect) => {
    if (!userId) {
      const errorMsg = "User not authenticated. Cannot save defect.";
      console.error("DefectsDashboard:", errorMsg);
      setError(errorMsg);
      return;
    }

    const isNew = updatedDefect.id?.startsWith('temp-') || !updatedDefect.id;
    
    // Permission validation
    if (isNew && !canCreate()) {
      const errorMsg = "You don't have permission to create defects.";
      console.error("DefectsDashboard:", errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!isNew && !canUpdate()) {
      const errorMsg = "You don't have permission to update defects.";
      console.error("DefectsDashboard:", errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let savedDefect;
      
      if (isNew) {
        // Create new defect
        const newDefectData = { ...updatedDefect };
        if (newDefectData.id && newDefectData.id.startsWith('temp-')) {
          delete newDefectData.id;
        }
        
        console.log('DefectsDashboard: Creating new defect');
        savedDefect = await defectService.createDefect(newDefectData, userId);
        console.log('DefectsDashboard: Defect created successfully:', savedDefect?.id);
      } else {
        // Update existing defect
        console.log('DefectsDashboard: Updating existing defect:', updatedDefect.id);
        savedDefect = await defectService.updateDefect(updatedDefect.id, updatedDefect, userId);
        console.log('DefectsDashboard: Defect updated successfully');
      }

      // Refresh defects data
      await fetchDefects();
      
      // Close dialog
      setIsDefectDialogOpen(false);
      setCurrentDefect(null);
      
      console.log('DefectsDashboard: Save operation completed successfully');
      return savedDefect;

    } catch (err) {
      console.error('DefectsDashboard: Error saving defect:', err);
      setError(`Failed to save defect: ${err.message}. Please try again.`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDefects, userId, canCreate, canUpdate]);

  // Delete defect handler with permission check
  const handleDeleteDefect = useCallback(async (defect) => {
    if (!canDelete()) {
      const errorMsg = "You don't have permission to delete defects.";
      console.error("DefectsDashboard:", errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!userId) {
      const errorMsg = "User not authenticated. Cannot delete defect.";
      console.error("DefectsDashboard:", errorMsg);
      setError(errorMsg);
      return;
    }
    
    const confirmMessage = `Are you sure you want to delete defect ID: ${defect.id}?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('DefectsDashboard: Deleting defect:', defect.id);
      await defectService.deleteDefect(defect.id, userId);
      
      // Refresh defects data
      await fetchDefects();
      
      console.log('DefectsDashboard: Defect deleted successfully');
    } catch (error) {
      console.error('DefectsDashboard: Error deleting defect:', error);
      setError(`Failed to delete defect: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [canDelete, userId, fetchDefects]);

  // Close all dropdowns when clicking elsewhere
  const closeAllDropdowns = useCallback(() => {
    setShowStatusDropdown(false);
    setShowCriticalityDropdown(false);
    setShowSourceDropdown(false);
    setShowVesselDropdown(false); // Add this line
    setShowSearch(false);
  }, []);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh data handler
  const handleRefreshData = useCallback(async () => {
    console.log('DefectsDashboard: Manual data refresh requested');
    setError(null);
    
    try {
      await Promise.all([
        fetchDefects(),
        fetchUserVessels(),
        refreshPermissions()
      ]);
      console.log('DefectsDashboard: Manual refresh completed');
    } catch (error) {
      console.error('DefectsDashboard: Error during manual refresh:', error);
      setError('Failed to refresh data. Please try again.');
    }
  }, [fetchDefects, fetchUserVessels, refreshPermissions]);

  // Get unique values for filter dropdowns
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

  const uniqueVessels = useMemo(() =>
    [...new Set(defects.map(d => d.vessel_name).filter(Boolean))],
    [defects]
  );

  // Loading state for entire dashboard
  if (authLoading || permissionsLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading dashboard...</p>
          {authLoading && <small>Authenticating user...</small>}
          {permissionsLoading && <small>Loading permissions...</small>}
        </div>
      </div>
    );
  }

  // Permission error state
  if (permissionsError) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorContainer}>
          <AlertTriangle size={24} />
          <h2>Permission Error</h2>
          <p>{permissionsError}</p>
          <p>You may have limited access to defects functionality.</p>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No read access state
  if (!canRead()) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorContainer}>
          <Shield size={24} />
          <h2>Access Denied</h2>
          <p>You don't have permission to view defects.</p>
          <p>Please contact your administrator for access.</p>
          {roleName && <p>Current role: <strong>{roleName}</strong></p>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer} onClick={closeAllDropdowns}>
      {/* Permission Status Banner */}
      {/* {isReadOnly() && (
        <div className={styles.permissionBanner}>
          <Eye size={16} />
          <span>Read-Only Mode - You can view but not modify defects</span>
          {roleName && <span className={styles.roleBadge}>{roleName}</span>}
        </div>
      )} */}

      {/* Main Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterSectionLeft}>
          <h1 className={styles.dashboardTitle}>
            Defects
            {/* {roleName && (
              <span className={styles.roleIndicator}>
                <Shield size={14} />
                {roleName}
              </span>
            )} */}
          </h1>
          
          {/* Search Container */}
          <div className={styles.searchContainer}>
            <button
              className={styles.searchToggle}
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
              title="Search defects"
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

        {/* Filter Label */}
        <div className={styles.filterLabel}>
          <Filter size={14} />
        </div>

        {/* Filter Chips */}
        <div className={styles.filterChips}>
          {/* Vessel Filter Dropdown - Add this FIRST in the filterChips section */}
          <div className={styles.filterDropdownContainer} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.filterDropdownButton} ${showVesselDropdown ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowVesselDropdown(!showVesselDropdown);
                setShowStatusDropdown(false);
                setShowCriticalityDropdown(false);
                setShowSourceDropdown(false);
              }}
            >
              All Vessels
              <span className={styles.filterCount}>{vesselFilters.length}/{uniqueVessels.length}</span>
            </button>

            {showVesselDropdown && (
              <div className={styles.filterDropdownContent}>
                <div className={styles.filterDropdownHeader}>
                  <h4>Filter by Vessel</h4>
                  <button className={styles.selectAllBtn} onClick={() => toggleAllItems('vessels')}>
                    {vesselFilters.length === uniqueVessels.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className={styles.filterDropdownItems}>
                  {uniqueVessels.map(vessel => (
                    <div key={vessel} className={styles.filterCheckboxItem}>
                      <label>
                        <input
                          type="checkbox"
                          checked={vesselFilters.includes(vessel)}
                          onChange={() => toggleFilterItem('vessels', vessel)}
                        />
                        <span>{vessel}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className={styles.filterDropdownFooter}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => setShowVesselDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className={styles.filterDropdownContainer} onClick={(e) => e.stopPropagation()}>
            <button
              className={`${styles.filterDropdownButton} ${showStatusDropdown ? styles.active : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusDropdown(!showStatusDropdown);
                setShowCriticalityDropdown(false);
                setShowSourceDropdown(false);
                setShowVesselDropdown(false);
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
                setShowVesselDropdown(false);
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
                setShowVesselDropdown(false);
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

          {/* Reset Filters Button */}
          {(searchTerm || 
            statusFilters.length < uniqueStatuses.length || 
            criticalityFilters.length < uniqueCriticalities.length || 
            sourceFilters.length < uniqueSources.length ||
            vesselFilters.length < uniqueVessels.length) && ( // Add this line
            <button 
              className={styles.resetButton} 
              onClick={resetFilters}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right Section Controls */}
        <div className={styles.filterSectionRight}>
          {/* Refresh Button */}
          <button 
            className={`${styles.controlBtn} ${styles.refreshBtn}`} 
            onClick={handleRefreshData} 
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? styles.spinning : ""} />
          </button>

          {/* Export Button */}
          <button 
            className={`${styles.controlBtn} ${styles.exportBtn} ${!canExport() ? styles.disabled : ''}`} 
            title={canExport() ? "Export data to CSV" : "Export not permitted"}
            onClick={handleExport}
            disabled={!canExport() || loading}
            data-tooltip={!canExport() ? "Insufficient permissions to export" : undefined}
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button 
            onClick={clearError}
            className={styles.errorCloseButton}
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Dashboard Charts */}
      <div className={styles.dashboardCharts}>
        <div className={styles.dashboardCard}>
          <div className={styles.dashboardCardBody}>
            {loading ? (
              <div className={styles.chartLoading}>
                <div className={styles.loadingSpinner}></div>
                {/* <span>Loading chart data...</span> */}
              </div>
            ) : (
              <TotalDefectsChart data={filteredDefects} />
            )}
          </div>
        </div>

        <div className={styles.dashboardCard}>
          <div className={styles.dashboardCardBody}>
            {loading ? (
              <div className={styles.chartLoading}>
                <div className={styles.loadingSpinner}></div>
                {/* <span>Loading chart data...</span> */}
              </div>
            ) : (
              <CriticalityChart data={filteredDefects} />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Defects Table */}
      <div className={styles.vesselTableWrapper}>
        {loading && defects.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading defect data...</p>
          </div>
        ) : filteredDefects.length === 0 && defects.length > 0 ? (
          <div className={styles.noResults}>
            <p>No defects match your current filters.</p>
            <p>Try adjusting your search criteria or filters.</p>
            <button 
              className={styles.resetFilters} 
              onClick={resetFilters}
            >
              Reset All Filters
            </button>
          </div>
        ) : defects.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No defects found.</p>
            {canCreate() ? (
              <>
                <p>Get started by adding your first defect.</p>
                <button 
                  className={styles.addFirstDefectBtn}
                  onClick={handleAddDefect}
                >
                  <Plus size={16} />
                  Add First Defect
                </button>
              </>
            ) : (
              <p>Contact your administrator if you believe this is incorrect.</p>
            )}
          </div>
        ) : (
          <DefectTable
            defects={filteredDefects}
            onView={handleViewDefect}
            onEdit={handleEditDefect}
            onDelete={handleDeleteDefect}
            currentUser={currentUser}
            loading={loading}
            removeFilterBar={true}
            onAddDefect={handleAddDefect}
            permissions={permissions}
            onExport={handleExport}
            onImport={handleImport}
            emptyMessage={
              searchTerm || 
              statusFilters.length < uniqueStatuses.length || 
              criticalityFilters.length < uniqueCriticalities.length || 
              sourceFilters.length < uniqueSources.length ||
              vesselFilters.length < uniqueVessels.length // Add this line
                ? "No defects match your search criteria"
                : "No defects found"
            }
          />
        )}
      </div>

      {/* Defect Dialog */}
      <DefectDialog
        isOpen={isDefectDialogOpen}
        onClose={() => {
          console.log("DefectsDashboard: Closing defect dialog");
          setIsDefectDialogOpen(false);
          setCurrentDefect(null);
        }}
        defect={currentDefect}
        onSave={handleSaveDefect}
        vessels={vessels}
        isNew={currentDefect?.id?.startsWith('temp-')}
        permissions={permissions}
        isExternal={false}
        currentUser={currentUser}
        isReadOnly={isReadOnly()}
        canCreate={canCreate()}
        canUpdate={canUpdate()}
      />

      {/* Permission Status Debug Info (Remove in production) */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugInfo}>
          <details>
            <summary>Debug: Permission Info</summary>
            <pre>
              {JSON.stringify({
                permissionStatus: getPermissionStatus(),
                permissions: {
                  canCreate: canCreate(),
                  canRead: canRead(),
                  canUpdate: canUpdate(),
                  canDelete: canDelete(),
                  canExport: canExport(),
                  canImport: canImport(),
                  canGenerateReport: canGenerateReport()
                },
                roleName,
                isReadOnly: isReadOnly(),
                hasWriteAccess: hasWriteAccess(),
                userId,
                defectsCount: defects.length,
                filteredDefectsCount: filteredDefects.length
              }, null, 2)}
            </pre>
          </details>
        </div>
      )} */}
    </div>
  );
};

export default DefectsDashboard;