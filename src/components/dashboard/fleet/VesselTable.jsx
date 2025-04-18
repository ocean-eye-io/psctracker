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


const VesselTable = ({ 
  vessels, 
  onOpenRemarks, 
  fieldMappings,
  onUpdateVessel,
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
  const [filteredData, setFilteredData] = useState([]);
  const [filterActive, setFilterActive] = useState(false);
  
  // Function to handle traffic light filter changes
  const handleTrafficFilterChange = (status) => {
    setStatusFilters(prev => {
      const updated = {...prev, [status]: !prev[status]};
      
      // Check if any filters are active
      const hasActiveFilters = Object.values(updated).some(Boolean);
      setFilterActive(hasActiveFilters || Object.values(flagFilters).some(Boolean));
      
      return updated;
    });
  };
  
  // Function to handle flag filter changes
  const handleFlagFilterChange = (flag) => {
    setFlagFilters(prev => {
      const updated = {...prev, [flag]: !prev[flag]};
      
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
      if (tableRef.current) {
        // Add/remove classes based on viewport width
        const tableContainer = tableRef.current.querySelector('.data-table-container');
        if (tableContainer) {
          if (window.innerWidth < 768) {
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
    return vessels.filter(vessel => {
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
  }, [vessels]);

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
      
      if (checklistStatus === 'Submitted') {
        status = 'green';
      } else if (checklistStatus === 'Acknowledged') {
        status = vessel.days_to_go < 7 ? 'yellow' : 'green';
      } else { // 'Pending'
        status = vessel.days_to_go < 3 ? 'red' : 'yellow';
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
      setFilteredData(dateFilteredVessels);
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
    
    setFilteredData(filtered);
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
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('at sea') || statusLower.includes('transit')) {
      return '#3498DB'; // Blue for at sea
    } else if (statusLower.includes('port') || statusLower.includes('berth')) {
      return '#2ECC71'; // Green for at port
    } else if (statusLower.includes('anchor')) {
      return '#F1C40F'; // Yellow for at anchor
    } else {
      return '#f4f4f4'; // Default
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

  // Function to determine whether a column should be hidden on mobile
  const shouldHideColumnOnMobile = (fieldId) => {
    const mobileHiddenColumns = [
      'riskScore', 
      'amsa_last_inspection_date',
      'psc_last_inspection_date',
      'dwt'
    ];
    
    return mobileHiddenColumns.includes(fieldId);
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
    return Object.entries(fieldMappings.TABLE)
      .filter(([fieldId, field]) => !field.isAction && fieldId !== 'comments')
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => {
        // Create a basic column config
        const column = {
          field: field.dbField,
          label: field.label,
          width: field.width,
          minWidth: field.minWidth,
          // Add a class to hide columns on mobile
          cellClassName: shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : '',
          headerClassName: shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : '',
        };

        // Special handling for vessel_name column to add custom header
        if (fieldId === 'vessel_name') {
          column.headerRenderer = renderVesselNameHeader;
          column.sortable = false;
        }

        // Define cell renderer
        column.render = (value, rowData) => {
          // Special rendering for event_type (status)
          if (fieldId === 'event_type') {
            return (
              <StatusIndicator 
                status={value}
                color={getStatusColor(value)}
              />
            );
          }
          
          // Special rendering for vessel_name with traffic light and flag
          if (fieldId === 'vessel_name') {
            const statusInfo = getVesselStatus(rowData);
            const flagValue = getVesselFlag(rowData);
            
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
                
                {/* Vessel name with tooltip */}
                {/* Vessel name with tooltip */}
                <VesselDetailsTooltip vessel={rowData}>
                  <span className="vessel-name">{(value || '-').toUpperCase()}</span>
                </VesselDetailsTooltip>
              </div>
            );
          }
          
          if (fieldId === 'owner') {
            return (
              <TextTooltip text={value || '-'}>
                <span>{(value || '-').toUpperCase()}</span>
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
          
          // Special rendering for date fields
          if (field.type === 'date') {
            const formattedValue = formatDateTime(value, false);
            return (
              <TextTooltip text={formattedValue}>
                {formattedValue}
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

          // Special rendering for date-time fields
          if (
            fieldId === 'eta' || 
            fieldId === 'etb' || 
            fieldId === 'etd' || 
            fieldId === 'atd' ||
            fieldId === 'psc_last_inspection_date'
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
                className={shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : ''}
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

  // Create expanded content renderer
  const renderExpandedContent = (vessel) => {
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority);
      
    return (
      <div className="expanded-grid">
        {expandedColumns.map(([fieldId, field]) => {
          let value = vessel[field.dbField];
          let displayLabel = field.label;
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
            fieldId === 'atd'
          ) {
            value = formatDateTime(value, true);
          }
          
          // If value is a string and not empty, wrap it in a tooltip
          const displayValue = (value !== null && value !== undefined && value !== '-') 
            ? (
                <TextTooltip text={String(value)}>
                  {value}
                </TextTooltip>
              ) 
            : value;
          
          return (
            <ExpandedItem
              key={fieldId}
              label={field.label}
              value={displayValue || '-'}
            />
          );
        })}
      </div>
    );
  };

  // Improved comments column
  const commentsColumn = {
    label: 'Comments',
    width: '180px',
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
              
              {hasComments ? (
                <div className="comment-preview-text">
                  {vessel.comments.length > 28 
                    ? `${vessel.comments.substring(0, 28)}...` 
                    : vessel.comments}
                </div>
              ) : (
                <div className="comment-add-text">Add comment</div>
              )}
            </div>
          </CommentTooltip>
        </div>
      );
    }
  };

  return (
    <div ref={tableRef} className="responsive-table-container">
      {/* Floating filter indicator and clear button */}
      {/* {filterActive && (
        <div className="floating-filter-controls">
          <div className="active-filter-count">
            <Filter size={14} />
            <span>{totalFilterCount} active {totalFilterCount === 1 ? 'filter' : 'filters'}</span>
          </div>
          <button
            className="clear-all-filters"
            onClick={() => {
              setStatusFilters({
                green: false,
                yellow: false,
                red: false,
                grey: false
              });
              setFlagFilters({
                green: false,
                yellow: false,
                red: false,
                none: false
              });
              setFilterActive(false);
            }}
          >
            Clear All
          </button>
        </div>
      )} */}
      
      <Table
        data={filterActive ? filteredData : dateFilteredVessels}
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

export default VesselTable;