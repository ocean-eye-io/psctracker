// src/components/dashboard/reporting/VesselReportingPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Ship, 
  Filter
} from 'lucide-react';
import VesselReportingTable from './VesselReportingTable';
import { reportingFieldMappings } from './ReportingFieldMappings';
import '../DashboardStyles.css';

const VesselReportingPage = () => {
  // State variables
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state variables
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('All Voyages');
  const [showVoyageStatusDropdown, setShowVoyageStatusDropdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // User context - Replace with actual user authentication
  // For now, let's show all vessels for testing, but in production this should come from auth context
  const currentUser = {
    id: 'user123', // This should come from your auth context
    vesselAssignments: [], // Empty array means show all vessels for now
    role: 'vessel_user',
    showAllVessels: true // Temporary flag for testing
  };

  // Store processed data by status for filter operations
  const [activeVessels, setActiveVessels] = useState([]);
  const [inactiveVessels, setInactiveVessels] = useState([]);
  const [allProcessedVessels, setAllProcessedVessels] = useState([]);

  // API endpoint
  const BASE_API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
  const VESSELS_WITH_OVERRIDES_API_URL = `${BASE_API_URL}/api/vessels-with-overrides`;

  // Function to determine checklist status
  const getChecklistStatus = (vessel) => {
    if (vessel.checklist_received) {
      const checklistValue = normalizeChecklistValue(vessel.checklist_received);
      if (checklistValue === 'Submitted') return 'completed';
      if (checklistValue === 'Acknowledged') return 'in_progress';
      return 'pending';
    }
    return 'not_started';
  };

  // Function to normalize checklist value
  const normalizeChecklistValue = (value) => {
    if (value === null || value === undefined) return "Pending";
    if (typeof value === 'boolean') return value ? 'Submitted' : 'Pending';
    if (typeof value === 'string') {
      const validValues = ["Pending", "Acknowledged", "Submitted"];
      if (validValues.includes(value)) return value;
      if (value.toLowerCase() === 'true') return 'Submitted';
      if (value.toLowerCase() === 'false') return 'Pending';
    }
    return "Pending";
  };

  // Filter vessels based on user assignments
  const filterVesselsByUser = (vessels) => {
    // For testing purposes, if showAllVessels is true or vesselAssignments is empty, show all vessels
    if (currentUser.showAllVessels || currentUser.vesselAssignments.length === 0) {
      console.log('Showing all vessels for user (testing mode)');
      return vessels;
    }
    
    // In production, filter by assigned vessels
    return vessels.filter(vessel => {
      // Check if the vessel is assigned to the current user
      const isAssigned = currentUser.vesselAssignments.includes(vessel.imo_no.toString());
      if (isAssigned) {
        console.log(`Vessel ${vessel.vessel_name} (${vessel.imo_no}) is assigned to user`);
      }
      return isAssigned;
    });
  };

  // Process vessels data (focusing on user's assigned vessels)
  const processVesselsData = useCallback((data) => {
    console.log('Raw data received for reporting:', data.length, 'rows');

    // Helper function for date parsing
    const parseDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) ? date : null;
      } catch (e) {
        return null;
      }
    };

    // Filter vessels with valid data
    const vesselsWithValidData = data.filter(vessel => {
      const imoNo = vessel.imo_no;
      const vesselName = vessel.vessel_name;

      return imoNo &&
        imoNo !== "-" &&
        Number.isInteger(Number(imoNo)) &&
        !String(imoNo).includes('.') &&
        vesselName &&
        vesselName !== "-";
    });

    console.log('Vessels with valid data for reporting:', vesselsWithValidData.length);

    // Filter by user assignments
    const userVessels = filterVesselsByUser(vesselsWithValidData);
    console.log('User assigned vessels:', userVessels.length);
    
    // Debug: Show some sample IMO numbers from the data
    if (userVessels.length === 0 && !currentUser.showAllVessels) {
      console.log('No vessels assigned. Sample IMO numbers from data:', 
        vesselsWithValidData.slice(0, 5).map(v => ({ vessel: v.vessel_name, imo: v.imo_no }))
      );
      console.log('User assignments:', currentUser.vesselAssignments);
    }

    // Find the latest rds_load_date
    const allLoadDates = userVessels
      .map(v => parseDate(v.rds_load_date))
      .filter(date => date !== null);

    const latestLoadDate = allLoadDates.length ?
      new Date(Math.max(...allLoadDates.map(d => d.getTime()))) : null;

    // Calculate the date 2 months ago for report_date filtering
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Active vessels processing
    const activeVessels = latestLoadDate ?
      userVessels.filter(vessel => {
        const isActive = vessel.status === "Active" &&
          vessel.rds_load_date &&
          new Date(vessel.rds_load_date).getTime() === latestLoadDate.getTime();

        let hasRecentReport = false;
        if (vessel.report_date) {
          const reportDate = parseDate(vessel.report_date);
          if (reportDate) {
            hasRecentReport = reportDate >= twoMonthsAgo;
          }
        }

        return isActive && hasRecentReport;
      }) : [];

    // Inactive vessels: all with status="Inactive"
    const inactiveVessels = userVessels.filter(vessel => vessel.status === "Inactive");

    console.log('Active user vessels:', activeVessels.length);
    console.log('Inactive user vessels:', inactiveVessels.length);

    // Enhance vessel data with calculated fields
    const enhanceVessel = (vessel, isActive = true) => {
      const etaDate = parseDate(vessel.eta);

      let days_to_go = 0;
      if (etaDate) {
        const currentDate = new Date();
        const timeDiff = etaDate.getTime() - currentDate.getTime();
        days_to_go = Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24) * 10) / 10);
      }

      const checklistStatus = getChecklistStatus(vessel);
      
      return {
        ...vessel,
        etaDate,
        days_to_go,
        uniqueKey: `vessel-${vessel.imo_no}-${vessel.id}`,
        checklistStatus,
        isReportingReady: checklistStatus !== 'not_started',
        isActiveVessel: isActive
      };
    };

    // Process both active and inactive vessels
    const enhancedActiveVessels = activeVessels.map(v => enhanceVessel(v, true));
    const enhancedInactiveVessels = inactiveVessels.map(v => enhanceVessel(v, false));

    // Return the processed data without setting state here
    return {
      activeVessels: enhancedActiveVessels,
      inactiveVessels: enhancedInactiveVessels,
      allVessels: [...enhancedActiveVessels, ...enhancedInactiveVessels]
    };
  }, []);

  // Fetch vessel data
  const fetchVesselData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(VESSELS_WITH_OVERRIDES_API_URL);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data for reporting:', data.length, 'rows');

      const processedData = processVesselsData(data);
      console.log('Processed data for reporting:', processedData.allVessels.length);

      // Set all the state at once to avoid multiple re-renders
      setActiveVessels(processedData.activeVessels);
      setInactiveVessels(processedData.inactiveVessels);
      setAllProcessedVessels(processedData.allVessels);
      setVessels(processedData.allVessels);
      setFilteredVessels(processedData.allVessels);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching vessel data for reporting:', err);
      setError('Failed to load vessel data. Please try again later.');
      setVessels([]);
      setFilteredVessels([]);
      setActiveVessels([]);
      setInactiveVessels([]);
      setAllProcessedVessels([]);
    } finally {
      setLoading(false);
    }
  }, [processVesselsData, VESSELS_WITH_OVERRIDES_API_URL]);

  // Load data on component mount
  useEffect(() => {
    fetchVesselData();
  }, [fetchVesselData]);

  // Apply voyage status filter when it changes
  useEffect(() => {
    if (allProcessedVessels.length === 0) return;

    let baseVessels = [];

    if (voyageStatusFilter === 'Current Voyages') {
      baseVessels = activeVessels;
    } else if (voyageStatusFilter === 'Past Voyages') {
      baseVessels = inactiveVessels;
    } else { // 'All Voyages'
      baseVessels = allProcessedVessels;
    }

    setFilteredVessels(baseVessels);
  }, [voyageStatusFilter, activeVessels, inactiveVessels, allProcessedVessels]);

  // Close dropdown when clicking elsewhere
  const closeAllDropdowns = () => {
    setShowVoyageStatusDropdown(false);
  };

  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      {/* Simplified Filter Bar */}
      <div className="filter-bar">
        <div className="filter-section-left">
          <h1 className="dashboard-title">Vessel Reporting</h1>
          <div className="vessel-counter">
            <Ship size={14} />
            <span>
              {currentUser.showAllVessels 
                ? `${vessels.length} vessel${vessels.length !== 1 ? 's' : ''} (all)` 
                : `${vessels.length} assigned vessel${vessels.length !== 1 ? 's' : ''}`
              }
            </span>
          </div>
        </div>

        <div className="filter-label">
          <Filter size={14} />
        </div>

        <div className="filter-chips">
          {/* Voyage Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showVoyageStatusDropdown ? 'active' : ''}`}
              onClick={() => setShowVoyageStatusDropdown(!showVoyageStatusDropdown)}
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
        </div>

        <div className="filter-section-right">
          <button 
            className="control-btn refresh-btn" 
            onClick={fetchVesselData} 
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {/* Main Content - Table */}
      <div className="reporting-table-section" style={{ 
        height: 'calc(100vh - 160px)', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your vessel data...</p>
          </div>
        ) : filteredVessels.length === 0 ? (
          <div className="no-results">
            <p>
              {vessels.length === 0 
                ? "No vessels are currently assigned to you." 
                : "No vessels match the selected voyage status."
              }
            </p>
            {vessels.length > 0 && voyageStatusFilter !== 'All Voyages' && (
              <button 
                className="reset-filters" 
                onClick={() => setVoyageStatusFilter('All Voyages')}
              >
                Show All Voyages
              </button>
            )}
          </div>
        ) : (
          <div className="table-container" style={{ 
            flex: 1,
            overflow: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(59, 173, 229, 0.5) rgba(11, 22, 35, 0.3)',
            background: 'var(--table-row-bg, #0e1e2f)'
          }}>
            <style jsx>{`
              .table-container::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              
              .table-container::-webkit-scrollbar-track {
                background: rgba(11, 22, 35, 0.3);
                border-radius: 4px;
              }
              
              .table-container::-webkit-scrollbar-thumb {
                background: rgba(59, 173, 229, 0.5);
                border-radius: 4px;
                border: 1px solid rgba(11, 22, 35, 0.5);
              }
              
              .table-container::-webkit-scrollbar-thumb:hover {
                background: rgba(59, 173, 229, 0.7);
              }
              
              .table-container::-webkit-scrollbar-corner {
                background: rgba(11, 22, 35, 0.3);
              }
              
              /* Horizontal scrollbar specific styling */
              .table-container::-webkit-scrollbar:horizontal {
                height: 8px;
              }
              
              .table-container::-webkit-scrollbar-track:horizontal {
                background: rgba(11, 22, 35, 0.3);
                border-radius: 4px;
              }
              
              .table-container::-webkit-scrollbar-thumb:horizontal {
                background: rgba(59, 173, 229, 0.5);
                border-radius: 4px;
                border: 1px solid rgba(11, 22, 35, 0.5);
              }
              
              .table-container::-webkit-scrollbar-thumb:horizontal:hover {
                background: rgba(59, 173, 229, 0.7);
              }
            `}</style>
            <VesselReportingTable
              vessels={filteredVessels}
              fieldMappings={reportingFieldMappings}
              loading={loading}
              currentUser={currentUser}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="reporting-footer" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--table-header-bg, linear-gradient(180deg, #0a1725, #112032))',
        borderTop: '1px solid rgba(244, 244, 244, 0.05)',
        padding: '8px 16px',
        zIndex: 5
      }}>
        <div className="footer-info">
          <span>Last updated: {lastUpdated.toLocaleString()}</span>
          <span>•</span>
          <span>Showing {filteredVessels.length} of {vessels.length} vessels</span>
        </div>
      </div>
    </div>
  );
};

export default VesselReportingPage;