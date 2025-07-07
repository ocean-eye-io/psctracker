// src/components/dashboard/reporting/VesselReportingPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Ship,
  Filter,
  Search,
  Calendar,
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Shield,
  Clock
} from 'lucide-react';
import VesselReportingTable from './VesselReportingTable';
import ChecklistPage from './checklist/ChecklistPage';
import { reportingFieldMappings } from './ReportingFieldMappings';
import vesselReportingService from '../../../services/vesselReportingService';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionContext';
import '../DashboardStyles.css';

const VesselReportingPage = () => {
  // State variables
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state variables - DEFAULT TO CURRENT VOYAGES
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('Current Voyages');
  const [vesselNameFilters, setVesselNameFilters] = useState([]);
  const [checklistStatusFilters, setChecklistStatusFilters] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Dropdown visibility state
  const [showVoyageStatusDropdown, setShowVoyageStatusDropdown] = useState(false);
  const [showVesselNameDropdown, setShowVesselNameDropdown] = useState(false);
  const [showChecklistStatusDropdown, setShowChecklistStatusDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Checklist integration state
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [showChecklistPage, setShowChecklistPage] = useState(false);

  // Saving states for editable fields
  const [savingStates, setSavingStates] = useState({});

  // Auth and Permission contexts
  const { currentUser, loading: authLoading } = useAuth();
  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
    canRead,
    canExport,
    isReadOnly,
    getPermissionStatus,
    roleName,
    refreshPermissions
  } = usePermissions();

  // Store processed data by status for filter operations
  const [activeVessels, setActiveVessels] = useState([]);
  const [inactiveVessels, setInactiveVessels] = useState([]);
  const [allProcessedVessels, setAllProcessedVessels] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);

  // API endpoints - SAME AS FLEETDASHBOARD
  const BASE_API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
  const VESSEL_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessel-override`;

  // User ID from auth context
  const userId = currentUser?.sub || currentUser?.email || currentUser?.username || currentUser?.userId || currentUser?.user_id || currentUser?.id;

  console.log("VesselReportingPage: Rendering with permissions:", {
    permissions,
    permissionStatus: getPermissionStatus(),
    canRead: canRead(),
    canExport: canExport(),
    roleName,
    userId
  });

  // Checklist handlers
  const handleOpenChecklist = useCallback((vessel) => {
    console.log('Opening checklist for vessel:', vessel);
    
    const vesselForChecklist = {
      ...vessel,
      id: vessel.id,
      voyage_id: vessel.id,
      vessel_name: vessel.vessel_name,
      imo_no: vessel.imo_no,
      eta: vessel.user_eta || vessel.eta,
      etb: vessel.user_etb || vessel.etb,
      etd: vessel.user_etd || vessel.etd,
      departure_port: vessel.departure_port,
      arrival_port: vessel.arrival_port,
      event_type: vessel.event_type
    };
    
    setSelectedVessel(vesselForChecklist);
    setShowChecklistPage(true);
  }, []);

  const handleCloseChecklist = useCallback(() => {
    setShowChecklistPage(false);
    setSelectedVessel(null);
    fetchVesselData();
  }, []);

  const handleOpenRemarks = useCallback((vessel) => {
    console.log('Opening remarks for vessel:', vessel);
    // The CommentTooltip component handles the editing inline, same as VesselTable
  }, []);

  // Handle vessel updates (for dropdown fields like checklist_received, sanz)
  const handleUpdateVessel = useCallback(async (vesselId, field, value) => {
    if (!vesselId || !field) {
      console.error('Invalid vessel ID or field for update');
      return;
    }

    try {
      console.log(`Updating vessel ${vesselId} field ${field} to:`, value);
      
      await vesselReportingService.updateVessel(vesselId, { [field]: value });
      
      // Update local state
      setVessels(prevVessels => 
        prevVessels.map(vessel => 
          vessel.id === vesselId 
            ? { ...vessel, [field]: value }
            : vessel
        )
      );

      console.log(`Successfully updated vessel ${vesselId} field ${field}`);
    } catch (error) {
      console.error(`Error updating vessel ${vesselId} field ${field}:`, error);
      setError(`Failed to update ${field}. Please try again.`);
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  // Handle override updates (for ETA, ETB, ETD editable fields)
  // COPIED EXACTLY FROM FLEETDASHBOARD
  const handleUpdateOverride = useCallback(async (vesselId, fieldName, newValue) => {
    const vesselToUpdate = vessels.find(v => v.id === vesselId);

    // The vesselToUpdate.id is already the correct vessel_comment_id from psc_tracker_comments
    const vesselCommentId = vesselToUpdate?.id;

    if (!vesselCommentId) {
      console.error(`Vessel Comment ID (pc.id) not found for vessel ID: ${vesselId}`);
      setError('Could not update field: Missing necessary ID.');
      return;
    }

    // Use the real user ID from auth context
    const currentUserId = userId;

    if (!currentUserId) {
      console.error('No user ID available for override update');
      setError('Authentication required. Please log in again.');
      return;
    }

    const fieldKey = `${vesselId}-${fieldName}`;
    setSavingStates(prev => ({ ...prev, [fieldKey]: true }));

    try {
      console.log(`Updating override for vessel ${vesselId} field ${fieldName} to:`, newValue);

      const response = await fetch(VESSEL_OVERRIDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vessel_comment_id: vesselCommentId, // Corrected: Use vesselToUpdate.id
          field_name: fieldName,
          override_value: newValue, // Corrected: Use override_value as per Lambda
          user_id: currentUserId, // IMPORTANT: Pass the actual user ID
          original_value: vesselToUpdate[fieldName] // Pass the original value for logging
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update the vessels state with the result
      setVessels(prevVessels =>
        prevVessels.map(vessel =>
          vessel.id === vesselId
            ? {
                ...vessel,
                // Update the specific override field based on the fieldName
                user_eta: result.user_eta,
                user_etb: result.user_etb,
                user_etd: result.user_etd,
              }
            : vessel
        )
      );
      
      // Also update filteredVessels
      setFilteredVessels(prevFiltered =>
        prevFiltered.map(vessel =>
          vessel.id === vesselId
            ? {
                ...vessel,
                user_eta: result.user_eta,
                user_etb: result.user_etb,
                user_etd: result.user_etd,
              }
            : vessel
        )
      );
      
      console.log(`Successfully updated ${fieldName} for vessel ${vesselId}`);

    } catch (err) {
      setError(`Failed to update ${fieldName}: ${err.message || 'Network error'}`);
      console.error(`Error updating ${fieldName} for vessel ${vesselId}:`, err);
    } finally {
      setSavingStates(prev => ({ ...prev, [fieldKey]: false }));
    }
  }, [vessels, userId, VESSEL_OVERRIDE_API_URL]);

  // Fetch vessel data using the service
  const fetchVesselData = useCallback(async () => {
    if (!userId) {
      console.log("VesselReportingPage: No user ID available, skipping vessel fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('VesselReportingPage: Fetching vessels for user:', userId);
      const data = await vesselReportingService.getVesselsForUser(userId);

      console.log('VesselReportingPage: Successfully fetched vessel data:', {
        total: data.allVessels.length,
        active: data.activeVessels.length,
        inactive: data.inactiveVessels.length,
        assignments: data.userAssignments.length
      });

      // Set all the state at once to avoid multiple re-renders
      setActiveVessels(data.activeVessels);
      setInactiveVessels(data.inactiveVessels);
      setAllProcessedVessels(data.allVessels);
      setVessels(data.allVessels);
      setFilteredVessels(data.allVessels);
      setUserAssignments(data.userAssignments);

      // Initialize filters with all available options
      const uniqueVesselNames = [...new Set(data.allVessels.map(v => v.vessel_name).filter(Boolean))];
      const uniqueChecklistStatuses = [...new Set(data.allVessels.map(v => v.checklistStatus).filter(Boolean))];

      setVesselNameFilters(uniqueVesselNames);
      setChecklistStatusFilters(uniqueChecklistStatuses);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('VesselReportingPage: Error fetching vessel data:', err);
      setError(`Failed to load vessel data: ${err.message}. Please try again later.`);
      setVessels([]);
      setFilteredVessels([]);
      setActiveVessels([]);
      setInactiveVessels([]);
      setAllProcessedVessels([]);
      setUserAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial data fetch - wait for auth and permissions to load
  useEffect(() => {
    const shouldFetchData = !authLoading && !permissionsLoading && userId && canRead();

    if (shouldFetchData) {
      console.log("VesselReportingPage: Initial data fetch triggered");
      fetchVesselData();
    } else {
      console.log("VesselReportingPage: Waiting for auth/permissions or insufficient read access", {
        authLoading,
        permissionsLoading,
        userId: !!userId,
        canRead: canRead()
      });
      setLoading(false);
    }
  }, [authLoading, permissionsLoading, userId, canRead, fetchVesselData]);

  // Get unique values for filters
  const uniqueVesselNames = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.vessel_name).filter(Boolean))],
    [allProcessedVessels]
  );

  const uniqueChecklistStatuses = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.checklistStatus).filter(Boolean))],
    [allProcessedVessels]
  );

  // Filtered vessels based on all criteria
  const filteredData = useMemo(() => {
    if (allProcessedVessels.length === 0) return [];

    let baseVessels = [];

    // Apply voyage status filter
    if (voyageStatusFilter === 'Current Voyages') {
      baseVessels = activeVessels;
    } else if (voyageStatusFilter === 'Past Voyages') {
      baseVessels = inactiveVessels;
    } else {
      baseVessels = allProcessedVessels;
    }

    let results = [...baseVessels];

    // Apply vessel name filters
    if (vesselNameFilters.length > 0 && vesselNameFilters.length < uniqueVesselNames.length) {
      results = results.filter(vessel => vesselNameFilters.includes(vessel.vessel_name));
    }

    // Apply checklist status filters
    if (checklistStatusFilters.length > 0 && checklistStatusFilters.length < uniqueChecklistStatuses.length) {
      results = results.filter(vessel => checklistStatusFilters.includes(vessel.checklistStatus));
    }

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(vessel =>
        Object.values(vessel).some(value =>
          value && String(value).toLowerCase().includes(term)
        )
      );
    }

    return results;
  }, [
    allProcessedVessels,
    activeVessels,
    inactiveVessels,
    voyageStatusFilter,
    vesselNameFilters,
    checklistStatusFilters,
    searchTerm,
    uniqueVesselNames,
    uniqueChecklistStatuses
  ]);

  // Update filtered vessels when filters change
  useEffect(() => {
    setFilteredVessels(filteredData);
  }, [filteredData]);

  // Toggle filter items
  const toggleFilterItem = (type, item) => {
    switch (type) {
      case 'vesselNames':
        setVesselNameFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      case 'checklistStatuses':
        setChecklistStatusFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      default:
        break;
    }
  };

  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    switch (type) {
      case 'vesselNames':
        setVesselNameFilters(vesselNameFilters.length === uniqueVesselNames.length ? [] : uniqueVesselNames);
        break;
      case 'checklistStatuses':
        setChecklistStatusFilters(checklistStatusFilters.length === uniqueChecklistStatuses.length ? [] : uniqueChecklistStatuses);
        break;
      default:
        break;
    }
  };

  // Reset all filters
  const resetFilters = useCallback(() => {
    console.log('Resetting all filters');
    setSearchTerm('');
    setVoyageStatusFilter('All Voyages');
    setVesselNameFilters(uniqueVesselNames);
    setChecklistStatusFilters(uniqueChecklistStatuses);
  }, [uniqueVesselNames, uniqueChecklistStatuses]);

  // Export filtered data with permission check
  const handleExport = useCallback(() => {
    if (!canExport()) {
      console.warn('VesselReportingPage: Export not allowed for current user');
      setError('You do not have permission to export data.');
      return;
    }

    try {
      console.log('VesselReportingPage: Exporting filtered vessel data');
      vesselReportingService.exportToCsv(filteredVessels, reportingFieldMappings);
    } catch (exportError) {
      console.error('VesselReportingPage: Export failed:', exportError);
      setError('Failed to export data. Please try again.');
    }
  }, [canExport, filteredVessels]);

  // Refresh data handler
  const handleRefreshData = useCallback(async () => {
    console.log('VesselReportingPage: Manual data refresh requested');
    setError(null);

    try {
      await Promise.all([
        fetchVesselData(),
        refreshPermissions()
      ]);
      console.log('VesselReportingPage: Manual refresh completed');
    } catch (error) {
      console.error('VesselReportingPage: Error during manual refresh:', error);
      setError('Failed to refresh data. Please try again.');
    }
  }, [fetchVesselData, refreshPermissions]);

  // Close all dropdowns when clicking elsewhere
  const closeAllDropdowns = useCallback(() => {
    setShowVoyageStatusDropdown(false);
    setShowVesselNameDropdown(false);
    setShowChecklistStatusDropdown(false);
    setShowSearch(false);
  }, []);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Stats calculations using the service
  const stats = useMemo(() => {
    return vesselReportingService.getReportingStats(vessels);
  }, [vessels]);

  // Handle remarks save - same as VesselTable approach
  const handleSaveRemarks = useCallback(async (vesselId, remarks) => {
    try {
      console.log(`Saving remarks for vessel ${vesselId}:`, remarks);
      
      await vesselReportingService.updateVessel(vesselId, { comments: remarks });
      
      // Update local state
      setVessels(prevVessels => 
        prevVessels.map(vessel => 
          vessel.id === vesselId 
            ? { ...vessel, comments: remarks }
            : vessel
        )
      );

      console.log(`Successfully saved remarks for vessel ${vesselId}`);
      
      return true; // Success
    } catch (error) {
      console.error(`Error saving remarks for vessel ${vesselId}:`, error);
      throw error; // Let the component handle the error display
    }
  }, []);

  // Check for checklist page display
  if (showChecklistPage && selectedVessel) {
    return (
      <ChecklistPage
        vessel={selectedVessel}
        onBack={handleCloseChecklist}
      />
    );
  }

  // Loading state for entire dashboard
  if (authLoading || permissionsLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
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
      <div className="dashboard-container">
        <div className="error-container">
          <AlertTriangle size={24} />
          <h2>Permission Error</h2>
          <p>{permissionsError}</p>
          <p>You may have limited access to vessel reporting functionality.</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
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
      <div className="dashboard-container">
        <div className="error-container">
          <Shield size={24} />
          <h2>Access Denied</h2>
          <p>You don't have permission to view vessel reporting data.</p>
          <p>Please contact your administrator for access.</p>
          {roleName && <p>Current role: <strong>{roleName}</strong></p>}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>Vessel Reporting Dashboard</h1>
          <div className="fleet-stats">
            <div className="fleet-count">
              <Ship size={16} />
              <span>{stats.total} Total Vessels</span>
              {userAssignments.length > 0 && (
                <small>({userAssignments.length} assigned)</small>
              )}
            </div>
            <div className="fleet-count">
              <Calendar size={16} />
              <span>{stats.active} Active Voyages</span>
            </div>
            {stats.overdue > 0 && (
              <div className="alert-count warning">
                <AlertTriangle size={16} />
                <span>{stats.overdue} Overdue</span>
              </div>
            )}
            {stats.urgentVessels > 0 && (
              <div className="alert-count warning">
                <Clock size={16} />
                <span>{stats.urgentVessels} Urgent</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-controls">
          {/* Search Container */}
          <div className="search-container">
            <button
              className="search-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setShowSearch(!showSearch);
              }}
              title="Search vessels"
            >
              <Search size={16} />
            </button>

            {showSearch && (
              <div className="search-popup" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Search vessels..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="control-buttons">
            <button
              className={`control-btn export-btn ${!canExport() ? 'disabled' : ''}`}
              onClick={handleExport}
              disabled={!canExport() || filteredVessels.length === 0 || loading}
              title={canExport() ? "Export filtered data" : "Export not permitted"}
            >
              <Download size={16} />
              Export
            </button>

            <button
              className="control-btn refresh-btn"
              onClick={handleRefreshData}
              title="Refresh data"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spinning" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Enhanced Filter Bar */}
      <div className="filter-bar">
        <div className="filter-label">
          <Filter size={14} />
        </div>

        <div className="filter-chips">
          {/* Voyage Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showVoyageStatusDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowVoyageStatusDropdown(!showVoyageStatusDropdown);
                setShowVesselNameDropdown(false);
                setShowChecklistStatusDropdown(false);
              }}
            >
              {voyageStatusFilter}
              <span className="filter-count">
                {voyageStatusFilter === 'All Voyages' && `${allProcessedVessels.length}`}
                {voyageStatusFilter === 'Current Voyages' && `${activeVessels.length}`}
                {voyageStatusFilter === 'Past Voyages' && `${inactiveVessels.length}`}
              </span>
            </button>

            {showVoyageStatusDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Voyage Status</h4>
                </div>
                <div className="filter-dropdown-items">
                  <div className="filter-checkbox-item">
                    <label>
                      <input
                        type="radio"
                        checked={voyageStatusFilter === 'All Voyages'}
                        onChange={() => setVoyageStatusFilter('All Voyages')}
                        name="voyageStatus"
                      />
                      <span>All Voyages ({allProcessedVessels.length})</span>
                    </label>
                  </div>
                  <div className="filter-checkbox-item">
                    <label>
                      <input
                        type="radio"
                        checked={voyageStatusFilter === 'Current Voyages'}
                        onChange={() => setVoyageStatusFilter('Current Voyages')}
                        name="voyageStatus"
                      />
                      <span>Current Voyages ({activeVessels.length})</span>
                    </label>
                  </div>
                  <div className="filter-checkbox-item">
                    <label>
                      <input
                        type="radio"
                        checked={voyageStatusFilter === 'Past Voyages'}
                        onChange={() => setVoyageStatusFilter('Past Voyages')}
                        name="voyageStatus"
                      />
                      <span>Past Voyages ({inactiveVessels.length})</span>
                    </label>
                  </div>
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowVoyageStatusDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vessel Name Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showVesselNameDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowVesselNameDropdown(!showVesselNameDropdown);
                setShowVoyageStatusDropdown(false);
                setShowChecklistStatusDropdown(false);
              }}
            >
              Vessel Names
              <span className="filter-count">{vesselNameFilters.length}/{uniqueVesselNames.length}</span>
            </button>

            {showVesselNameDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Vessel Name</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('vesselNames')}>
                    {vesselNameFilters.length === uniqueVesselNames.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueVesselNames.map(vesselName => (
                    <div key={vesselName} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={vesselNameFilters.includes(vesselName)}
                          onChange={() => toggleFilterItem('vesselNames', vesselName)}
                        />
                        <span>{vesselName}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowVesselNameDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Checklist Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showChecklistStatusDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowChecklistStatusDropdown(!showChecklistStatusDropdown);
                setShowVoyageStatusDropdown(false);
                setShowVesselNameDropdown(false);
              }}
            >
              Checklist Status
              <span className="filter-count">{checklistStatusFilters.length}/{uniqueChecklistStatuses.length}</span>
            </button>

            {showChecklistStatusDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Checklist Status</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('checklistStatuses')}>
                    {checklistStatusFilters.length === uniqueChecklistStatuses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueChecklistStatuses.map(status => (
                    <div key={status} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={checklistStatusFilters.includes(status)}
                          onChange={() => toggleFilterItem('checklistStatuses', status)}
                        />
                        <span className="checklist-status-label">
                          {status === 'completed' && '✓ Completed'}
                          {status === 'in_progress' && '⏳ In Progress'}
                          {status === 'pending' && '⚠️ Pending'}
                          {status === 'not_started' && '❌ Not Started'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowChecklistStatusDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          {(searchTerm ||
            voyageStatusFilter !== 'All Voyages' ||
            vesselNameFilters.length < uniqueVesselNames.length ||
            checklistStatusFilters.length < uniqueChecklistStatuses.length) && (
              <button
                className="reset-button"
                onClick={resetFilters}
                title="Reset all filters"
              >
                Reset
              </button>
            )}
        </div>

        <div className="date-filter">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button
            onClick={clearError}
            className="error-close-button"
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content - Table */}
      <div className="vessel-table-wrapper">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your vessel data...</p>
          </div>
        ) : filteredVessels.length === 0 ? (
          <div className="no-results">
            <Eye size={24} />
            <p>
              {vessels.length === 0
                ? "No vessels are currently assigned to you."
                : "No vessels match the selected filters."
              }
            </p>
            {userAssignments.length === 0 && vessels.length === 0 && (
              <small>Contact your administrator to assign vessels to your account.</small>
            )}
            {vessels.length > 0 && (searchTerm || voyageStatusFilter !== 'All Voyages' ||
              vesselNameFilters.length < uniqueVesselNames.length ||
              checklistStatusFilters.length < uniqueChecklistStatuses.length) && (
                <button
                  className="reset-filters"
                  onClick={resetFilters}
                >
                  Reset All Filters
                </button>
              )}
          </div>
        ) : (
          <VesselReportingTable
            vessels={filteredVessels}
            fieldMappings={reportingFieldMappings}
            loading={loading}
            currentUser={currentUser}
            onOpenChecklist={handleOpenChecklist}
            onUpdateVessel={handleUpdateVessel}
            onUpdateOverride={handleUpdateOverride}
            onOpenRemarks={handleOpenRemarks}
            savingStates={savingStates}
          />
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-info">
          <span>Showing {filteredVessels.length} of {vessels.length} vessels</span>
          {userAssignments.length > 0 && (
            <>
              <span>•</span>
              <span>{userAssignments.length} vessels assigned to you</span>
            </>
          )}
          <span>•</span>
          <span>Last refreshed: {lastUpdated.toLocaleString()}</span>
        </div>
        <div className="watermark">
          Vessel Reporting Dashboard v2.0 - Enhanced
        </div>
      </div>
    </div>
  );
};

export default VesselReportingPage;