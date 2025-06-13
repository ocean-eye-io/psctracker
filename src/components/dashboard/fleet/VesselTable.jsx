// src/components/dashboard/fleet/VesselTable.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageSquare, Filter, Flag, Check, ChevronDown, X } from 'lucide-react';
import TrafficLightIndicator from '../../common/Table/TrafficLightIndicator';
import {
  Table,
  StatusIndicator,
  TableBadge,
  ExpandedItem,
  DropdownField
} from '../../common/Table';
import { TextTooltip, VesselDetailsTooltip } from '../../common/Table/Tooltip';
import CommentTooltip from '../../common/Table/CommentTooltip';
import VesselFlagService from '../../../services/VesselFlagService';
import { useAuth } from '../../../context/AuthContext';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

// Import EditableField from common/EditableField.jsx
import EditableField from '../../common/EditableField/EditableField';

const VesselTable = ({
  vessels,
  onOpenRemarks,
  fieldMappings,
  onUpdateVessel,
  onUpdateOverride,
  savingStates,
}) => {
  const tableRef = useRef(null);
  const headerRef = useRef(null);
  const { currentUser } = useAuth();
  const userId = currentUser?.sub || currentUser?.email || currentUser?.username;

  // State for filters
  const [statusFilters, setStatusFilters] = useState({
    green: false,
    yellow: false,
    red: false,
    grey: false
  });

  const [flagFilters, setFlagFilters] = useState({
    green: false,
    yellow: false,
    red: false,
    none: false
  });

  // State for active filter dropdown (if any)
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);

  // State for vessel flags
  const [vesselFlags, setVesselFlags] = useState({});
  const [flagsLoading, setFlagsLoading] = useState(true);

  // State to track window size
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Helper function to check if a date is in the past
  const isDateInPast = useCallback((dateString) => {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;
      
      const today = new Date();
      // Reset time to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      return date < today;
    } catch (error) {
      return false;
    }
  }, []);

  // Helper function to get days overdue
  const getDaysOverdue = useCallback((dateString) => {
    if (!dateString) return 0;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      const diffTime = today - date;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      return 0;
    }
  }, []);

  // Enhanced filter to ensure only one active entry per IMO (with highest ID)
  const filteredVessels = useMemo(() => {
    // Separate active and inactive vessels
    const activeVessels = [];
    const inactiveVessels = [];

    // First separate vessels by active status
    vessels.forEach(vessel => {
      // Normalize status check to handle different case formats
      const status = vessel.status?.toLowerCase?.();
      const isActive = status === 'active';

      if (isActive) {
        activeVessels.push(vessel);
      } else {
        inactiveVessels.push(vessel);
      }
    });

    // For active vessels, keep only the entry with highest ID for each IMO
    const activeVesselsByImo = new Map();

    activeVessels.forEach(vessel => {
      // Make sure IMO numbers and IDs are properly handled
      const imo = vessel.imo_no?.toString()?.trim();

      // Skip vessels without a valid IMO
      if (!imo) return;

      // Convert ID to number, with fallback to ensure we always have a numeric value
      let id;
      try {
        id = parseInt(vessel.id, 10);
        if (isNaN(id)) id = 0;
      } catch (e) {
        id = 0;
      }

      // Check if we've already seen this IMO
      if (!activeVesselsByImo.has(imo)) {
        // First time seeing this IMO, add it directly
        activeVesselsByImo.set(imo, vessel);
      } else {
        // We've seen this IMO before, check if this vessel has a higher ID
        const existingVessel = activeVesselsByImo.get(imo);
        const existingId = parseInt(existingVessel.id, 10) || 0;

        if (id > existingId) {
          // This vessel has a higher ID, replace the existing one
          activeVesselsByImo.set(imo, vessel);
        }
      }
    });

    // Combine unique active vessels with all inactive vessels
    const result = [...activeVesselsByImo.values(), ...inactiveVessels];

    return result;
  }, [vessels]);

  const ColumnFilterDropdown = ({ isOpen, dropdownName, children }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
      <div className={`column-filter-dropdown ${dropdownName}-dropdown`}>
        {children}
      </div>,
      document.body
    );
  };

  const positionDropdown = (dropdownName) => {
    setTimeout(() => {
      const button = document.querySelector(`.integrated-filter-button.${dropdownName}-filter`);
      const dropdown = document.querySelector(`.column-filter-dropdown.${dropdownName}-dropdown`);

      if (button && dropdown) {
        const buttonRect = button.getBoundingClientRect();

        dropdown.style.position = 'fixed';
        dropdown.style.top = `${buttonRect.bottom + 5}px`;
        dropdown.style.left = `${buttonRect.left}px`;
        dropdown.style.zIndex = '9999';
      }
    }, 10);
  };

  // State for tracking filtered data
  const [filterActiveData, setFilterActiveData] = useState([]);
  const [filterActive, setFilterActive] = useState(false);

  // Function to handle traffic light filter changes
  const handleTrafficFilterChange = (status) => {
    setStatusFilters(prev => {
      const updated = { ...prev, [status]: !prev[status] };

      // Check if any filters are active
      const hasActiveFilters = Object.values(updated).some(Boolean);
      setFilterActive(hasActiveFilters || Object.values(flagFilters).some(Boolean));

      return updated;
    });
  };

  // Function to handle flag filter changes
  const handleFlagFilterChange = (flag) => {
    setFlagFilters(prev => {
      const updated = { ...prev, [flag]: !prev[flag] };

      // Check if any filters are active
      const hasActiveFilters = Object.values(updated).some(Boolean);
      setFilterActive(hasActiveFilters || Object.values(statusFilters).some(Boolean));

      return updated;
    });
  };

  // Toggle filter dropdown
  const toggleFilterDropdown = (dropdownName) => {
    setActiveFilterDropdown(activeFilterDropdown === dropdownName ? null : dropdownName);
  };

  // Handle click outside filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdowns = document.querySelectorAll('.column-filter-dropdown');
      const buttons = document.querySelectorAll('.integrated-filter-button');

      let clickedOnDropdown = false;
      let clickedOnButton = false;

      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) clickedOnDropdown = true;
      });

      buttons.forEach(button => {
        if (button.contains(event.target)) clickedOnButton = true;
      });

      if (!clickedOnDropdown && !clickedOnButton) {
        setActiveFilterDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to handle flag changes
  const handleFlagChange = async (rowId, flagValue) => {
    if (!userId) {
      console.error('No user ID available');
      return;
    }

    if (!rowId) {
      console.error('No row ID provided');
      return;
    }

    // Update local state optimistically
    setVesselFlags(prev => ({
      ...prev,
      [rowId]: flagValue === 'none' ? null : flagValue
    }));

    try {
      if (flagValue === 'none') {
        await VesselFlagService.deleteVesselFlag(rowId, userId);
      } else {
        await VesselFlagService.updateVesselFlag(rowId, userId, flagValue);
      }
    } catch (error) {
      // Revert the optimistic update on error
      setVesselFlags(prev => ({ ...prev, [rowId]: prev[rowId] }));
      console.error('Error updating flag:', error);
    }
  };

  // Function to get a vessel's flag - memoized to avoid dependency array issues
  const getVesselFlag = useCallback((vessel) => {
    return vessel?.id ? (vesselFlags[vessel.id] || 'none') : 'none';
  }, [vesselFlags]);

  // Monitor window resize to adjust table layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      if (tableRef.current) {
        // Add/remove classes based on viewport width
        const tableContainer = tableRef.current.querySelector('.data-table-container');
        if (tableContainer) {
          if (width < 768) {
            tableContainer.classList.add('mobile-view');
          } else {
            tableContainer.classList.remove('mobile-view');
          }
        }
      }
    };

    // Initial call
    handleResize();

    // Set up resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch vessel flags when the component mounts or vessels change
  useEffect(() => {
    if (userId) {
      setFlagsLoading(true);

      VesselFlagService.getUserVesselFlags(userId)
        .then(flags => {
          setVesselFlags(flags);
          setFlagsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching vessel flags:', error);
          setFlagsLoading(false);
          setVesselFlags({});
        });
    } else {
      setVesselFlags({});
      setFlagsLoading(false);
    }
  }, [vessels, userId]);

  // Basic filter for handover date
  const dateFilteredVessels = useMemo(() => {
    return filteredVessels.filter(vessel => {
      // Keep the row if hand_over_date_mod is null, undefined, empty string, or invalid
      if (!vessel.hand_over_date_mod || vessel.hand_over_date_mod === '') {
        return true;
      }

      try {
        const handoverDate = new Date(vessel.hand_over_date_mod);

        // Keep the row if the date is invalid
        if (isNaN(handoverDate.getTime())) {
          return true;
        }

        const today = new Date();

        // Reset time part for accurate date comparison
        today.setHours(0, 0, 0, 0);
        handoverDate.setHours(0, 0, 0, 0);

        // Keep vessel if handover date is greater than or equal to today
        return handoverDate >= today;
      } catch (error) {
        // Keep the row if there's any error in date processing
        console.error('Error processing hand_over_date_mod:', error);
        return true;
      }
    });
  }, [filteredVessels]);

  // Get vessel status - memoized to avoid dependency array issues
  const getVesselStatus = useCallback((vessel) => {
    // Create an array to store all factors and their statuses
    const factors = [];
    let worstStatus = 'green'; // Start with best status and downgrade as needed

    // Function to update the worst status
    const updateWorstStatus = (status) => {
      if (status === 'red' || worstStatus === 'red') {
        worstStatus = 'red';
      } else if (status === 'yellow' || worstStatus === 'yellow') {
        worstStatus = 'yellow';
      }
      // If both are green, worst status remains green
    };

    // Check vessel age
    if (vessel.BUILT_DATE) {
      try {
        const builtDate = new Date(vessel.BUILT_DATE);
        if (!isNaN(builtDate.getTime())) {
          const currentDate = new Date();
          const ageInMs = currentDate - builtDate;
          const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
          const formattedAge = ageInYears.toFixed(1);

          let ageStatus;
          if (ageInYears < 5) {
            ageStatus = 'green';
          } else if (ageInYears >= 5 && ageInYears < 10) {
            ageStatus = 'yellow';
          } else {
            ageStatus = 'red';
          }

          updateWorstStatus(ageStatus);
          factors.push({
            name: 'Vessel Age',
            value: `${formattedAge} years`,
            status: ageStatus,
            detail: ageInYears < 5 ? 'Less than 5 years old' :
              ageInYears < 10 ? 'Between 5-10 years old' :
                'More than 10 years old'
          });
        }
      } catch (error) {
        console.error('Error calculating vessel age:', error);
      }
    }

    // Check PSC inspection date
    if (vessel.psc_last_inspection_date) {
      try {
        const inspectionDate = new Date(vessel.psc_last_inspection_date);
        if (!isNaN(inspectionDate.getTime())) {
          const currentDate = new Date();
          const monthsDiff = (currentDate - inspectionDate) / (1000 * 60 * 60 * 24 * 30.4375);
          const formattedDate = formatDateTime(vessel.psc_last_inspection_date, false);

          let inspectionStatus;
          if (monthsDiff <= 3) {
            inspectionStatus = 'green';
          } else if (monthsDiff <= 6) {
            inspectionStatus = 'yellow';
          } else {
            inspectionStatus = 'red';
          }

          updateWorstStatus(inspectionStatus);
          factors.push({
            name: 'PSC Inspection',
            value: formattedDate,
            status: inspectionStatus
          });
        }
      } catch (error) {
        console.error('Error checking PSC inspection date:', error);
      }
    }

    // Check AMSA inspection date
    if (vessel.amsa_last_inspection_date) {
      try {
        const inspectionDate = new Date(vessel.amsa_last_inspection_date);
        if (!isNaN(inspectionDate.getTime())) {
          const currentDate = new Date();
          const monthsDiff = (currentDate - inspectionDate) / (1000 * 60 * 60 * 24 * 30.4375);
          const formattedDate = formatDateTime(vessel.amsa_last_inspection_date, false);

          let inspectionStatus;
          if (monthsDiff <= 3) {
            inspectionStatus = 'green';
          } else if (monthsDiff <= 6) {
            inspectionStatus = 'yellow';
          } else {
            inspectionStatus = 'red';
          }

          updateWorstStatus(inspectionStatus);
          factors.push({
            name: 'AMSA Inspection',
            value: formattedDate,
            status: inspectionStatus
          });
        }
      } catch (error) {
        console.error('Error checking AMSA inspection date:', error);
      }
    }

    // Add checklist status
    if (vessel.checklist_received !== undefined) {
      const checklistStatus = normalizeChecklistValue(vessel.checklist_received);
      let status;

      if (checklistStatus === 'Acknowledged') {
        status = 'green';
      } else if (checklistStatus === 'Submitted') {
        status = 'yellow';
      } else { // 'Pending'
        status = 'red';
      }

      updateWorstStatus(status);
      factors.push({
        name: 'Checklist',
        value: checklistStatus,
        status: status
      });
    }

    // If no factors were evaluated, use grey as default
    if (factors.length === 0) {
      return {
        status: 'grey',
        tooltip: 'Status not determined',
        factors: []
      };
    }

    return {
      status: worstStatus,
      tooltip: 'Multiple factors affect this status',
      factors: factors
    };
  }, []);

  // Apply traffic light and flag filters with proper dependencies
  useEffect(() => {
    // Check if any filters are active
    const trafficFiltersActive = Object.values(statusFilters).some(Boolean);
    const flagFiltersActive = Object.values(flagFilters).some(Boolean);

    if (!trafficFiltersActive && !flagFiltersActive) {
      // No filters active, use the date-filtered data
      setFilterActiveData(dateFilteredVessels);
      setFilterActive(false);
      return;
    }

    // Apply filters
    const filtered = dateFilteredVessels.filter(vessel => {
      // Get vessel status and flag
      const statusInfo = getVesselStatus(vessel);
      const statusValue = statusInfo.status;

      const flagValue = getVesselFlag(vessel);

      // Check if vessel passes traffic light filter (if active)
      const passesTrafficFilter = !trafficFiltersActive || statusFilters[statusValue];

      // Check if vessel passes flag filter (if active)
      const passesFlagFilter = !flagFiltersActive || flagFilters[flagValue];

      // Vessel must pass both active filters
      return passesTrafficFilter && passesFlagFilter;
    });

    setFilterActiveData(filtered);
    setFilterActive(true);
  }, [dateFilteredVessels, statusFilters, flagFilters, getVesselFlag, getVesselStatus]);

  // Enhanced format function that can handle both date and date+time
  const formatDateTime = (dateString, includeTime = false) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid

      if (includeTime) {
        // Format as "Month Day, Year, HH:MM"
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // Format as "Month Day, Year"
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return dateString; // Return original on error
    }
  };

  // Helper function to get status color based on vessel status
  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';

    // Now we can directly check the categorized status values
    if (status === "At Sea") {
      return '#3498DB'; // Blue for at sea
    } else if (status === "At Port") {
      return '#2ECC71'; // Green for at port
    } else if (status === "At Anchor") {
      return '#F1C40F'; // Yellow for at anchor
    } else {
      return '#f4f4f4'; // Default for Others
    }
  };

  // Helper function to get risk score color based on score value
  const getRiskScoreVariant = (score) => {
    if (!score && score !== 0) return 'info';
    if (score < 50) return 'success';
    if (score < 75) return 'warning';
    return 'danger';
  };

  // Function to normalize checklist value
  const normalizeChecklistValue = (value) => {
    if (value === null || value === undefined) {
      return "Pending";
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Submitted' : 'Pending';
    }

    // Handle string values
    if (typeof value === 'string') {
      const validValues = ["Pending", "Acknowledged", "Submitted"];
      if (validValues.includes(value)) {
        return value;
      }

      // Convert older boolean string values
      if (value.toLowerCase() === 'true') {
        return 'Submitted';
      }
      if (value.toLowerCase() === 'false') {
        return 'Pending';
      }
    }

    // Default fallback
    return "Pending";
  };

  // Function to determine whether a column should be hidden based on screen width
  const shouldHideColumn = (fieldId) => {
    // Define breakpoints for different screen sizes
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const isSmallDesktop = windowWidth >= 1024 && windowWidth < 1280;

    // Columns to hide on mobile
    if (isMobile) {
      return ['riskScore', 'amsa_last_inspection_date', 'psc_last_inspection_date', 'dwt', 'arrival_country'].includes(fieldId);
    }

    // Columns to hide on tablets
    if (isTablet) {
      return ['amsa_last_inspection_date', 'psc_last_inspection_date'].includes(fieldId);
    }

    // Columns to hide on small desktops
    if (isSmallDesktop) {
      return ['psc_last_inspection_date'].includes(fieldId);
    }

    // Show all columns on large desktops
    return false;
  };

  // Count active filters for badges
  const trafficFilterCount = Object.values(statusFilters).filter(Boolean).length;
  const flagFilterCount = Object.values(flagFilters).filter(Boolean).length;
  const totalFilterCount = trafficFilterCount + flagFilterCount;

  // Custom header renderer for vessel name column to include integrated filters
  const renderVesselNameHeader = () => {
    return (
      <div className="vessel-name-header" ref={headerRef}>
        <div className="integrated-filters">
          {/* Status filter button */}
          <button
            className={`integrated-filter-button status-filter ${activeFilterDropdown === 'status' ? 'active' : ''} ${trafficFilterCount > 0 ? 'has-filters' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFilterDropdown('status');
              if (activeFilterDropdown !== 'status') positionDropdown('status');
            }}
          >
            <div className={`status-indicator-mini ${trafficFilterCount > 0 ? 'filtered' : ''}`}>
              <span className="status-dot status-green"></span>
              <span className="status-dot status-yellow"></span>
              <span className="status-dot status-red"></span>
            </div>
            {trafficFilterCount > 0 && (
              <span className="filter-count">{trafficFilterCount}</span>
            )}
          </button>

          {/* Status filter dropdown */}
          <ColumnFilterDropdown
            isOpen={activeFilterDropdown === 'status'}
            dropdownName="status"
          >
            <div className="column-filter-header">
              <h4>Filter by Status</h4>
              <button
                className="column-filter-all-btn"
                onClick={() => {
                  const allStatuses = ['green', 'yellow', 'red', 'grey'];
                  const allSelected = allStatuses.every(status => statusFilters[status]);
                  setStatusFilters({
                    green: !allSelected,
                    yellow: !allSelected,
                    red: !allSelected,
                    grey: !allSelected
                  });
                }}
              >
                {Object.values(statusFilters).every(Boolean) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="column-filter-items">
              {[
                { id: 'green', label: 'Green' },
                { id: 'yellow', label: 'Yellow' },
                { id: 'red', label: 'Red' },
                { id: 'grey', label: 'Not Set' }
              ].map(status => (
                <div key={status.id} className="column-filter-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={statusFilters[status.id]}
                      onChange={() => handleTrafficFilterChange(status.id)}
                    />
                    <span className={`status-dot status-${status.id}`}></span>
                    <span>{status.label}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="column-filter-footer">
              <button
                className="column-filter-clear"
                onClick={() => {
                  setStatusFilters({
                    green: false,
                    yellow: false,
                    red: false,
                    grey: false
                  });
                }}
                disabled={!Object.values(statusFilters).some(Boolean)}
              >
                Clear
              </button>
              <button
                className="column-filter-apply"
                onClick={() => setActiveFilterDropdown(null)}
              >
                Apply
              </button>
            </div>
          </ColumnFilterDropdown>

          {/* Flag filter button */}
          <button
            className={`integrated-filter-button flag-filter ${activeFilterDropdown === 'flag' ? 'active' : ''} ${flagFilterCount > 0 ? 'has-filters' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleFilterDropdown('flag');
              if (activeFilterDropdown !== 'flag') positionDropdown('flag');
            }}
          >
            <Flag size={14} />
            {flagFilterCount > 0 && (
              <span className="filter-count">{flagFilterCount}</span>
            )}
          </button>

          {/* Flag filter dropdown */}
          <ColumnFilterDropdown
            isOpen={activeFilterDropdown === 'flag'}
            dropdownName="flag"
          >
            <div className="column-filter-header">
              <h4>Filter by Flag</h4>
              <button
                className="column-filter-all-btn"
                onClick={() => {
                  const allFlags = ['green', 'yellow', 'red', 'none'];
                  const allSelected = allFlags.every(flag => flagFilters[flag]);
                  setFlagFilters({
                    green: !allSelected,
                    yellow: !allSelected,
                    red: !allSelected,
                    none: !allSelected
                  });
                }}
              >
                {Object.values(flagFilters).every(Boolean) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="column-filter-items">
              {[
                { id: 'green', label: 'Green' },
                { id: 'yellow', label: 'Yellow' },
                { id: 'red', label: 'Red' },
                { id: 'none', label: 'Not Set' }
              ].map(flag => (
                <div key={flag.id} className="column-filter-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={flagFilters[flag.id]}
                      onChange={() => handleFlagFilterChange(flag.id)}
                    />
                    <span className={`status-dot status-${flag.id === 'none' ? 'grey' : flag.id}`}></span>
                    <span>{flag.label}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="column-filter-footer">
              <button
                className="column-filter-clear"
                onClick={() => {
                  setFlagFilters({
                    green: false,
                    yellow: false,
                    red: false,
                    none: false
                  });
                }}
                disabled={!Object.values(flagFilters).some(Boolean)}
              >
                Clear
              </button>
              <button
                className="column-filter-apply"
                onClick={() => setActiveFilterDropdown(null)}
              >
                Apply
              </button>
            </div>
          </ColumnFilterDropdown>
        </div>

        <div className="header-label">Vessel</div>
      </div>
    );
  };

  // Convert field mappings to table columns format
  const getTableColumns = () => {
    // Create a new columns array with vessel_type and doc_type instead of imo and owner
    const columnsData = Object.entries(fieldMappings.TABLE)
      .filter(([fieldId, field]) => !field.isAction && fieldId !== 'comments' && fieldId !== 'imo' && fieldId !== 'owner')
      .sort((a, b) => a[1].priority - b[1].priority);

    return columnsData.map(([fieldId, field]) => {
      // Get responsive width based on screen size
      let columnWidth = field.width;

      // Adjust column widths based on screen size
      if (windowWidth < 768) { // Mobile
        // Use percentage-based widths on mobile to ensure better scaling
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '140px';
            break;
          case 'vessel_type':
          case 'doc_type':
          case 'event_type':
            columnWidth = '80px';
            break;
          case 'arrival_port':
          case 'eta':
          case 'etb':
            columnWidth = '100px';
            break;
          case 'checklist_received':
          case 'sanz':
            columnWidth = '90px';
            break;
        }
      } else if (windowWidth >= 768 && windowWidth < 1024) { // Tablet
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '160px';
            break;
          case 'vessel_type':
            columnWidth = '120px';
            break;
          case 'doc_type':
            columnWidth = '80px';
            break;
          case 'event_type':
            columnWidth = '110px';
            break;
          case 'arrival_port':
            columnWidth = '120px';
            break;
          case 'arrival_country':
            columnWidth = '100px';
            break;
          case 'eta':
          case 'etb':
            columnWidth = '110px';
            break;
        }
      } else if (windowWidth >= 1024 && windowWidth < 1280) { // Small desktop
        // Keep most original widths but adjust a few
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '180px';
            break;
        }
      }

      // Create a basic column config
      const column = {
        field: field.dbField,
        label: field.label,
        width: columnWidth,
        minWidth: field.minWidth || (windowWidth < 768 ? '60px' : '80px'),
        // Add a class to hide columns on mobile
        cellClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
        headerClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
      };

      // Special handling for vessel_name column to add custom header
      if (fieldId === 'vessel_name') {
        column.headerRenderer = renderVesselNameHeader;
        column.sortable = false;
      }

      // Define cell renderer
      column.render = (value, rowData) => {
        // Determine the value to display: user override if present, otherwise original
        // Note: Lambda now returns user_eta, user_etb, user_etd as top-level properties
        const originalValue = rowData[field.dbField]; // This is the system's original value
        let displayValue = originalValue;
        let hasOverride = false;
        let isInvalidDate = false; // New state for date validation
        let validationMessage = ''; // New state for validation message

        // Check for user overrides for ETA, ETB, ETD
        if (fieldId === 'eta') {
          if (rowData.user_eta !== null && rowData.user_eta !== undefined) {
            displayValue = rowData.user_eta;
            hasOverride = true;
          }
        } else if (fieldId === 'etb') {
          if (rowData.user_etb !== null && rowData.user_etb !== undefined) {
            displayValue = rowData.user_etb;
            hasOverride = true;
          }
        } else if (fieldId === 'etd') {
          if (rowData.user_etd !== null && rowData.user_etd !== undefined) {
            displayValue = rowData.user_etd;
            hasOverride = true;
          }
        }


        // --- START: Editable ETA, ETB, ETD Integration ---
        if (['eta', 'etb', 'etd'].includes(fieldId)) {
          // Special check for ETB being less than ETA
          if (fieldId === 'etb') {
            const etbDate = displayValue ? new Date(displayValue) : null;
            // Get ETA from either user_eta or original eta
            const etaValueForComparison = rowData.user_eta !== null && rowData.user_eta !== undefined ? rowData.user_eta : rowData.eta;
            const etaDate = etaValueForComparison ? new Date(etaValueForComparison) : null;
            
            
            
            if (etbDate && etaDate && etbDate.getTime() < etaDate.getTime()) {
              isInvalidDate = true;
              validationMessage = `ETB cannot be before ETA. ETA is ${formatDateTime(etaValueForComparison, true)}`;
            }
          }

          // NEW: Check if ETA is in the past
          if (fieldId === 'eta') {
            const isPastEta = isDateInPast(displayValue);
            if (isPastEta && !isInvalidDate) {
              const daysOverdue = getDaysOverdue(displayValue);
              isInvalidDate = true;
              validationMessage = `ETA is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
            }
          }

          return (
            <EditableField
              value={displayValue} // The value currently displayed (user override or system)
              originalValue={originalValue} // The system's original value
              onSave={(newValue) => onUpdateOverride(rowData.id, field.dbField, newValue)}
              onResetToOriginal={() => onUpdateOverride(rowData.id, field.dbField, null)} // Pass null to clear override
              type="datetime-local"
              placeholder="N/A"
              isSaving={savingStates[`${rowData.id}-${field.dbField}`]}
              hasOverride={hasOverride}
              isInvalidDate={isInvalidDate} // Pass the new prop
              validationMessage={validationMessage} // Pass the new prop
            />
          );
        }
        // --- END: Editable ETA, ETB, ETD Integration ---


        // Special rendering for event_type (status)
        if (fieldId === 'event_type') {
          return (
            <StatusIndicator
              status={value}
              color={getStatusColor(value)}
            />
          );
        }

        // Special rendering for vessel_name with traffic light, flag, and owner/IMO tooltip
        if (fieldId === 'vessel_name') {
          const statusInfo = getVesselStatus(rowData);
          const flagValue = getVesselFlag(rowData);

          // Create enhanced vessel details for tooltip
          const vesselDetails = {
            ...rowData,
            // Add a formatted display for tooltip that includes IMO and Owner
            tooltipDetails: [
              { label: 'IMO', value: rowData.imo_no || '-' },
              { label: 'Owner', value: rowData.owner || '-' },
              { label: 'Built', value: rowData.BUILT_DATE ? formatDateTime(rowData.BUILT_DATE, false) : '-' },
              { label: 'Flag', value: rowData.flag || '-' }
            ]
          };

          return (
            <div className="vessel-name-cell">
              {/* Traffic light indicator */}
              <TrafficLightIndicator
                status={statusInfo.status}
                tooltipData={statusInfo}
              />

              {/* Vessel flag indicator */}
              <div className="vessel-flag-container">
                <button
                  className={`vessel-flag-button ${flagValue !== 'none' ? flagValue : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    // Toggle through flag states: none -> green -> yellow -> red -> none
                    const flagSequence = ['green', 'yellow', 'red', 'none'];
                    const currentIndex = flagSequence.indexOf(flagValue);
                    const nextIndex = (currentIndex + 1) % flagSequence.length;
                    const nextFlag = flagSequence[nextIndex];

                    handleFlagChange(rowData.id, nextFlag);
                  }}
                  aria-label="Set vessel flag"
                >
                  <Flag
                    size={14}
                    style={{
                      color: flagValue === 'green' ? '#2EE086' :
                        flagValue === 'yellow' ? '#FFD426' :
                          flagValue === 'red' ? '#FF5252' :
                            '#A0A0A0',
                      filter: flagValue !== 'none' ? `drop-shadow(0 0 3px ${
                        flagValue === 'green' ? 'rgba(46, 224, 134, 0.6)' :
                          flagValue === 'yellow' ? 'rgba(255, 212, 38, 0.6)' :
                            flagValue === 'red' ? 'rgba(255, 82, 82, 0.6)' :
                              'rgba(160, 160, 160, 0.3)'
                        })` : 'none'
                    }}
                  />
                </button>
              </div>

              {/* Vessel name with enhanced tooltip including IMO and Owner */}
              <VesselDetailsTooltip vessel={vesselDetails}>
                <span className="vessel-name">{(value || '-').toUpperCase()}</span>
              </VesselDetailsTooltip>
            </div>
          );
        }

        // New column: vessel_type
        if (fieldId === 'vessel_type') {
          return (
            <TextTooltip text={value || '-'}>
              <span>{(value || '-').toUpperCase()}</span>
            </TextTooltip>
          );
        }

        // New column: doc_type
        if (fieldId === 'doc_type') {
          return (
            <TextTooltip text={value || '-'}>
              <span>{(value || '-').toUpperCase()}</span>
            </TextTooltip>
          );
        }

        if (fieldId === 'arrival_port') {
          const upperCaseValue = (value || '-').toUpperCase(); // Convert to uppercase
          return (
            <TextTooltip text={upperCaseValue}>
              <span className="arrival-port">{upperCaseValue}</span>
            </TextTooltip>
          );
        }

        if (fieldId === 'arrival_country') {
          let displayValue = value;

          // Convert country codes to full names
          if (value === 'AU' || value === 'au') {
            displayValue = 'AUSTRALIA';
          } else if (value === 'NZ' || value === 'nz') {
            displayValue = 'NEW ZEALAND';
          } else if (displayValue) {
            // Make everything caps for other countries
            displayValue = displayValue.toUpperCase();
          }

          return (
            <TextTooltip text={displayValue || '-'}>
              <span>{displayValue || '-'}</span>
            </TextTooltip>
          );
        }

        // Special rendering for risk score
        if (fieldId === 'riskScore') {
          const score = value !== null && value !== undefined ? Math.round(value) : null;
          return (
            <TableBadge
              variant={getRiskScoreVariant(score)}
            >
              {score !== null ? score : '-'}
            </TableBadge>
          );
        }

        // Special rendering for date fields (non-editable ones)
        if (field.type === 'date' && !['eta', 'etb', 'etd'].includes(fieldId)) {
          const formattedValue = formatDateTime(value, false);
          return (
            <TextTooltip text={formattedValue}>
              {formattedValue}
            </TextTooltip>
          );
        }

        // Special rendering for date-time fields (non-editable ones)
        if (
          (fieldId === 'atd' || fieldId === 'psc_last_inspection_date') &&
          !['eta', 'etb', 'etd'].includes(fieldId) // Ensure ETA/ETB/ETD are not double-handled
        ) {
          const formattedValue = formatDateTime(value, true);
          return (
            <TextTooltip text={formattedValue}>
              {formattedValue}
            </TextTooltip>
          );
        }

        if (fieldId === 'checklist_received') {
          const normalizedValue = normalizeChecklistValue(value);

          return (
            <DropdownField
              value={normalizedValue}
              vessel={rowData}
              onUpdate={onUpdateVessel}
              field="checklist_received"
              options={["Pending", "Acknowledged", "Submitted"]}
              className={shouldHideColumn(fieldId) ? 'hidden-column' : ''}
            />
          );
        }

        // Special rendering for SANZ field
        if (fieldId === 'sanz') {
          return (
            <DropdownField
              value={value || ""}
              vessel={rowData}
              onUpdate={onUpdateVessel}
              field="sanz"
              options={["Select...", "Rohit Banta", "John Willis", "Prakash Rebala", "Others"]}
              className="sanz-dropdown"
              allowCustomInput={true}
            />
          );
        }

        // Special rendering for days to go
        if (fieldId === 'daysToGo' && typeof value === 'number') {
          const formattedValue = value.toFixed(1);
          return (
            <TextTooltip text={formattedValue}>
              {formattedValue}
            </TextTooltip>
          );
        }

        // Default rendering for text content
        if (value !== null && value !== undefined && value !== '-') {
          const stringValue = String(value);
          return (
            <TextTooltip text={stringValue}>
              {stringValue}
            </TextTooltip>
          );
        }

        // Fallback for null/undefined values
        return '-';
      };

      return column;
    });
  };

  // Create expanded content renderer with responsive grid
  const renderExpandedContent = (vessel) => {
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority);

    // Add IMO and Owner to expanded content if on mobile
    if (windowWidth < 768) {
      if (vessel.imo_no) {
        expandedColumns.unshift(['imo', {
          dbField: 'imo_no',
          label: 'IMO No',
          priority: -2
        }]);
      }

      if (vessel.owner) {
        expandedColumns.unshift(['owner', {
          dbField: 'owner',
          label: 'Owner',
          priority: -1
        }]);
      }
    }

    return (
      <div className={`expanded-grid ${windowWidth < 768 ? 'mobile-grid' : ''}`}>
        {expandedColumns.map(([fieldId, field]) => {
          let value = vessel[field.dbField];
          let displayLabel = field.label;

          // Check for user overrides in expanded content as well
          // Note: Lambda now returns user_eta, user_etb, user_etd as top-level properties
          if (fieldId === 'eta' && vessel.user_eta !== null && vessel.user_eta !== undefined) {
            value = vessel.user_eta;
          } else if (fieldId === 'etb' && vessel.user_etb !== null && vessel.user_etb !== undefined) {
            value = vessel.user_etb;
          } else if (fieldId === 'etd' && vessel.user_etd !== null && vessel.user_etd !== undefined) {
            value = vessel.user_etd;
          }


          if (fieldId === 'departure_port' && field.combineWithCountry) {
            const port = value || '-';
            const country = vessel.departure_country || '';

            // Combine them into a single display value
            if (country) {
              // Format country code if needed
              let formattedCountry = country;
              if (country === 'AU' || country === 'au') {
                formattedCountry = 'AUSTRALIA';
              } else if (country === 'NZ' || country === 'nz') {
                formattedCountry = 'NEW ZEALAND';
              } else if (formattedCountry) {
                formattedCountry = formattedCountry.toUpperCase();
              }

              // Combine port and country
              value = `${port}, ${formattedCountry}`;
            }
          }

          // Format date values in expanded panel
          if (field.type === 'date') {
            value = formatDateTime(value, false);
          } else if (
            fieldId === 'etd' ||
            fieldId === 'atd' ||
            fieldId === 'eta' || // Also format ETA/ETB in expanded view as datetime
            fieldId === 'etb'
          ) {
            value = formatDateTime(value, true);
          }

          // NEW: Add styling for past ETA in expanded content
          let expandedItemProps = {
            key: fieldId,
            label: field.label,
            value: value || '-',
            className: windowWidth < 768 ? 'mobile-expanded-item' : ''
          };

          // Check if this is ETA and it's in the past
          if (fieldId === 'eta') {
            const etaValue = vessel.user_eta !== null && vessel.user_eta !== undefined ? vessel.user_eta : vessel.eta;
            const isPastEta = isDateInPast(etaValue);
            
            if (isPastEta) {
              const daysOverdue = getDaysOverdue(etaValue);
              expandedItemProps.className += ' past-eta-expanded';
              
              // Wrap the value with tooltip for expanded content too
              const displayValue = (
                <TextTooltip text={`ETA is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`}>
                  <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>
                    {value || '-'}
                  </span>
                </TextTooltip>
              );
              expandedItemProps.value = displayValue;
            } else if (value !== null && value !== undefined && value !== '-') {
              // If value is a string and not empty, wrap it in a tooltip
              const displayValue = (
                <TextTooltip text={String(value)}>
                  {value}
                </TextTooltip>
              );
              expandedItemProps.value = displayValue;
            }
          } else if (value !== null && value !== undefined && value !== '-') {
            // If value is a string and not empty, wrap it in a tooltip
            const displayValue = (
              <TextTooltip text={String(value)}>
                {value}
              </TextTooltip>
            );
            expandedItemProps.value = displayValue;
          }

          return <ExpandedItem {...expandedItemProps} />;
        })}
      </div>
    );
  };

  // Improved comments column
  const commentsColumn = {
    label: 'Comments',
    width: windowWidth < 768 ? '80px' : '160px',
    className: 'comments-column',
    content: (vessel) => {
      const hasComments = vessel.comments && vessel.comments.trim().length > 0;

      return (
        <div className="comment-cell">
          <CommentTooltip
            comment={vessel.comments || ""}
            onEditClick={() => onOpenRemarks(vessel)}
          >
            <div
              className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
            >
              <div className="comment-icon">
                <MessageSquare size={16} />
              </div>

              {hasComments && windowWidth >= 768 ? (
                <div className="comment-preview-text">
                  {vessel.comments.length > 28
                    ? `${vessel.comments.substring(0, 28)}...`
                    : vessel.comments}
                </div>
              ) : windowWidth >= 768 ? (
                <div className="comment-add-text">Add comment</div>
              ) : null}
            </div>
          </CommentTooltip>
        </div>
      );
    }
  };

  return (
    <div ref={tableRef} className="responsive-table-container">
      {/* Custom CSS for responsive design */}
      <style>
        {`
          /* Responsive Table Styles */
          .responsive-table-container {
            max-width: 100%;
            overflow-x: hidden;
          }

          /* Mobile Styles */
          @media (max-width: 767px) {
            .data-table th, .data-table td {
              padding: 6px 8px;
              font-size: 13px;
            }

            .hidden-column {
              display: none !important;
            }

            .vessel-name-cell {
              max-width: 120px;
            }

            .vessel-name {
              max-width: 80px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              display: inline-block;
            }

            .comment-indicator {
              width: 24px;
              height: 24px;
              padding: 0;
              justify-content: center;
            }

            .comment-preview-text, .comment-add-text {
              display: none;
            }

            .mobile-grid {
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
            }

            .mobile-expanded-item {
              padding: 8px !important;
            }
          }

          /* Tablet Styles */
          @media (min-width: 768px) and (max-width: 1023px) {
            .data-table th, .data-table td {
              padding: 8px 12px;
              font-size: 13px;
            }

            .hidden-column {
              display: none !important;
            }

            .vessel-name {
              max-width: 120px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              display: inline-block;
            }
          }

          /* Small Desktop Styles */
          @media (min-width: 1024px) and (max-width: 1279px) {
            .data-table th, .data-table td {
              padding: 8px 14px;
            }

            .hidden-column {
              display: none !important;
            }
          }

          /* Reset default table styles for better app-wide consistency */
          .data-table-wrapper {
            max-width: 100%;
            overflow-x: auto;
          }

          /* Make sure text tooltips don't overflow */
          .text-tooltip-trigger {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* Enhance vessel name display */
          .vessel-name-cell {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
          }

          /* Improve flag button responsiveness */
          .vessel-flag-button {
            width: 20px;
            height: 20px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* NEW: Styling for past ETA in expanded content */
          .past-eta-expanded .expanded-value {
            color: #E74C3C !important;
            font-weight: bold !important;
          }
        `}
      </style>

      <Table
        data={filterActive ? filterActiveData : dateFilteredVessels}
        columns={getTableColumns()}
        expandedContent={renderExpandedContent}
        actions={commentsColumn}
        uniqueIdField="uniqueKey"
        defaultSortKey="eta"
        defaultSortDirection="desc"
        className={`vessel-data-table ${filterActive ? 'filtered-table' : ''}`}
      />
    </div>
  );
};

VesselTable.propTypes = {
  vessels: PropTypes.arrayOf(PropTypes.object).isRequired,
  onOpenRemarks: PropTypes.func.isRequired,
  fieldMappings: PropTypes.object.isRequired,
  onUpdateVessel: PropTypes.func.isRequired,
  onUpdateOverride: PropTypes.func.isRequired,
  savingStates: PropTypes.object.isRequired,
};

export default VesselTable;