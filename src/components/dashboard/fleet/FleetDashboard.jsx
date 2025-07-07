import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Filter, Download,
  RefreshCw, Map, Ship, AlertTriangle
} from 'lucide-react';
import VesselTable from './VesselTable';
import ArrivalsByPortChart from './charts/ArrivalsByPortChart';
import ArrivalTimelineChart from './charts/ArrivalTimelineChart';
import PSCDeficienciesChart from './charts/PSCDeficienciesChart';
import './FleetStyles.css';
import CommentsModal from './CommentsModal';
import { v4 as uuidv4 } from 'uuid';
import MapModal from './MapModal';
import ActiveFiltersDisplay from './ActiveFiltersDisplay';
import PortVesselRiskChart from './charts/PortVesselRiskChart';
import PSCKpisChart from './charts/PSCKpisChart';
import DeficiencyCodeChart from './charts/DeficiencyCodeChart';
import PropTypes from 'prop-types';
// No longer need FontAwesome icons here as EditableField is imported from common
// and handles its own FontAwesome imports.
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faPencilAlt, faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

// 1. Import the defects service at the top of your FleetDashboard.jsx
import defectsService from '../../../services/defectsService'; 

// --- FleetDashboard Component ---
const FleetDashboard = ({ onOpenInstructions, fieldMappings }) => {
  // State variables
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state variables
  const [portFilters, setPortFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [docFilters, setDocFilters] = useState([]);
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('Current Voyages');

  // Store processed data by status for filter operations
  const [activeVessels, setActiveVessels] = useState([]);
  const [inactiveVessels, setInactiveVessels] = useState([]);
  const [allProcessedVessels, setAllProcessedVessels] = useState([]);

  // Dropdown visibility state
  const [showVoyageStatusDropdown, setShowVoyageStatusDropdown] = useState(false);
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [portVesselRiskData, setPortVesselRiskData] = useState([]);
  const [loadingPortVesselRisk, setLoadingPortVesselRisk] = useState(true);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [chartPortFilter, setChartPortFilter] = useState(null);

  const [timelineFilter, setTimelineFilter] = useState(null);
  const [pscDeficiencyData, setPscDeficiencyData] = useState([]);
  const [loadingPscData, setLoadingPscData] = useState(true);
  const [savingStates, setSavingStates] = useState({}); // To manage saving state for individual fields

  // API endpoints
  const BASE_API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
  const VESSELS_WITH_OVERRIDES_API_URL = `${BASE_API_URL}/api/vessels-with-overrides`;
  const VESSEL_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessel-override`;
  const ORIGINAL_VESSELS_API_URL = `${BASE_API_URL}/api/vessels`; // Original endpoint, if still used for other purposes
  const PSC_API_URL = `${BASE_API_URL}/api/psc-deficiencies`;

  // Add a handler function for timeline filter changes
  const handleTimelineFilterChange = (timeRange) => {
    setTimelineFilter(timeRange);

    // Apply filtering logic based on the time range
    if (!timeRange) {
      // If filter is cleared, remove all time-based filtering
      setFilteredVessels(vessels.filter(v =>
        // Re-apply only the existing filters (search term, ports, status, doc)
        (searchTerm.trim() === '' ||
          (v.vessel_name && v.vessel_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.imo_no && v.imo_no.toString().includes(searchTerm)) ||
          (v.arrival_port && v.arrival_port.toLowerCase().includes(searchTerm.toLowerCase()))
        ) &&
        (!portFilters.length || !v.arrival_port || portFilters.includes(v.arrival_port)) &&
        (!statusFilters.length || !v.event_type || statusFilters.includes(v.event_type)) &&
        (!docFilters.length || !v.office_doc || docFilters.includes(v.office_doc))
      ));
    } else {
      // Filter based on the selected time range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Apply the appropriate time-based filter
      let timeFilteredVessels = [...vessels];

      if (timeRange === 'In Port') {
        timeFilteredVessels = vessels.filter(v =>
          v.event_type && (
            v.event_type.toLowerCase().includes('port') ||
            v.event_type.toLowerCase().includes('berth')
          )
        );
      } else if (timeRange === 'Today') {
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= today && v.etaDate < tomorrow
        );
      } else if (timeRange === 'This Week') {
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= tomorrow && v.etaDate < nextWeek
        );
      } else if (timeRange === 'Later') {
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= nextWeek
        );
      }

      // Now apply the other existing filters
      setFilteredVessels(timeFilteredVessels.filter(v =>
        (searchTerm.trim() === '' ||
          (v.vessel_name && v.vessel_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.imo_no && v.imo_no.toString().includes(searchTerm)) ||
          (v.arrival_port && v.arrival_port.toLowerCase().includes(searchTerm.toLowerCase()))
        ) &&
        (!portFilters.length || !v.arrival_port || portFilters.includes(v.arrival_port)) &&
        (!statusFilters.length || !v.event_type || statusFilters.includes(v.event_type)) &&
        (!docFilters.length || !v.office_doc || docFilters.includes(v.office_doc))
      ));
    }
  };

  // Add authentication handling in your API calls
  const fetchPortVesselRiskData = useCallback(async () => {
    setLoadingPortVesselRisk(true);
    try {
      const response = await fetch(`${BASE_API_URL}/api/port-vessel-risk`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch port vessel risk data (Status: ${response.status})`);
      }

      const data = await response.json();
      console.log('Port Vessel Risk Data received:', data);
      setPortVesselRiskData(data);
    } catch (error) {
      console.error('Error fetching port vessel risk data:', error);
      setPortVesselRiskData([]); // Set empty data on error
    } finally {
      setLoadingPortVesselRisk(false);
    }
  }, [BASE_API_URL]);

  const fetchPscDeficiencyData = useCallback(async () => {
    try {
      setLoadingPscData(true);
      const response = await fetch(PSC_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch PSC data');
      }
      const data = await response.json();
      console.log('PSC Data received:', data); // Add this log
      setPscDeficiencyData(data);
    } catch (error) {
      console.error('Error fetching PSC data:', error);
    } finally {
      setLoadingPscData(false);
    }
  }, [PSC_API_URL]);


  const handleChartFilterChange = (port) => {
    setChartPortFilter(port);

    // If a port is selected, update the port filters
    if (port) {
      // Set port filters to only include the selected port
      setPortFilters([port]);
    } else {
      // If filter is cleared, reset to all ports
      const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))];
      setPortFilters(uniquePorts);
    }
  };

  const handleOpenComments = (vessel) => {
    setSelectedVessel(vessel);
    setCommentModalOpen(true);
  };

  // Function to handle comment updates
  const handleCommentUpdated = (updatedVessel) => {
    // Update the vessels array with the updated vessel
    setVessels(vessels.map(vessel =>
      vessel.uniqueKey === updatedVessel.uniqueKey ? updatedVessel : vessel
    ));

    // Also update the filtered vessels array
    setFilteredVessels(filteredVessels.map(vessel =>
      vessel.uniqueKey === updatedVessel.uniqueKey ? updatedVessel : vessel
    ));
  };


  const handleVesselUpdate = async (updatedVessel) => {
    try {
      // Get the field and value to update
      const fieldToUpdate = updatedVessel.field || 'checklist_received';
      const valueToUpdate = updatedVessel[fieldToUpdate] || updatedVessel.value;

      console.log(`Updating vessel: ${updatedVessel.imo_no} with ${fieldToUpdate} value:`, valueToUpdate);

      // Prepare the payload
      const payload = {
        id: updatedVessel.id,
        imo_no: updatedVessel.imo_no,
        field: fieldToUpdate,
        value: valueToUpdate
      };

      // Send the update to your API
      const response = await fetch(`${ORIGINAL_VESSELS_API_URL.replace(/\/$/, '')}/update-fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Field update response:', responseData);

      // Update the vessels state
      setVessels(prevVessels =>
        prevVessels.map(vessel =>
          vessel.uniqueKey === updatedVessel.uniqueKey ? {
            ...vessel,
            [fieldToUpdate]: responseData[fieldToUpdate]
          } : vessel
        )
      );

      // Also update the filtered vessels array
      setFilteredVessels(prevFiltered =>
        prevFiltered.map(vessel =>
          vessel.uniqueKey === updatedVessel.uniqueKey ? {
            ...vessel,
            [fieldToUpdate]: responseData[fieldToUpdate]
          } : vessel
        )
      );

      return true;
    } catch (error) {
      console.error(`Error updating vessel ${updatedVessel.field || 'field'}:`, error);
      return false;
    }
  };

  // Generate a unique key for each vessel
  const generateUniqueKey = (vessel) => {
    // Create a unique key by combining IMO and status (or other distinguishing fields)
    const status = vessel.status || 'unknown';
    const loadDate = vessel.rds_load_date || 'unknown';
    return `${vessel.imo_no}-${status}-${loadDate}`;
  };

  // Function to categorize and format vessel status
  const categorizeStatus = (status) => {
    if (!status) {
      return "Others";
    }

    const statusLower = status.toLowerCase();

    // At Sea category
    if (statusLower.includes("at sea") ||
      statusLower.includes("noon at sea") ||
      statusLower.includes("noon sea") ||
      statusLower === "sea" ||
      statusLower === "noon") {
      return "At Sea";
    }

    // At Port category
    if (statusLower.includes("at port") ||
      statusLower.includes("noon at port") ||
      statusLower.includes("at berth") ||
      statusLower.includes("berth") ||
      statusLower.includes("arrival") ||
      statusLower.includes("departure port") ||
      statusLower.includes("departure") ||
      statusLower.includes("port")) {
      return "At Port";
    }

    // At Anchor category
    if (statusLower.includes("at anchor") ||
      statusLower.includes("noon at anchor") ||
      statusLower.includes("anchor")) {
      return "At Anchor";
    }

    // Everything else goes to Others
    return "Others";
  };

  const processVesselsData = useCallback((data) => {
    console.log('Raw data received:', data.length, 'rows');

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

    // Debug: Find SDTR FAITH in raw data
    const sdtrFaithRaw = data.find(v => v.vessel_name === "SDTR FAITH");
    if (sdtrFaithRaw) {
      console.log('SDTR FAITH found in raw data:', {
        id: sdtrFaithRaw.id,
        vessel_name: sdtrFaithRaw.vessel_name,
        imo_no: sdtrFaithRaw.imo_no,
        status: sdtrFaithRaw.status,
        current_status: sdtrFaithRaw.current_status,
        report_date: sdtrFaithRaw.report_date,
        rds_load_date: sdtrFaithRaw.rds_load_date
      });
    } else {
      console.log('SDTR FAITH NOT FOUND in raw data');
    }

    // Master filter to remove vessels with invalid IMO numbers and empty vessel names
    const vesselsWithValidData = data.filter(vessel => {
      const imoNo = vessel.imo_no;
      const vesselName = vessel.vessel_name;

      const isValid = imoNo &&
        imoNo !== "-" &&
        Number.isInteger(Number(imoNo)) &&
        !String(imoNo).includes('.') &&
        vesselName &&
        vesselName !== "-";

      // Debug: Log if SDTR FAITH fails this filter
      if (vessel.vessel_name === "SDTR FAITH" && !isValid) {
        console.log('SDTR FAITH FAILED valid data filter:', {
          imoNo,
          vesselName,
          isValidImo: imoNo && imoNo !== "-" && Number.isInteger(Number(imoNo)) && !String(imoNo).includes('.'),
          isValidName: vesselName && vesselName !== "-"
        });
      }

      return isValid;
    });

    console.log('Vessels with valid IMO and vessel names:', vesselsWithValidData.length);

    // Debug: Check if SDTR FAITH survived the valid data filter
    const sdtrFaithValid = vesselsWithValidData.find(v => v.vessel_name === "SDTR FAITH");
    console.log('SDTR FAITH after valid data filter:', sdtrFaithValid ? 'FOUND' : 'NOT FOUND');

    // Find the latest rds_load_date
    const allLoadDates = vesselsWithValidData
      .map(v => parseDate(v.rds_load_date))
      .filter(date => date !== null);

    const latestLoadDate = allLoadDates.length ?
      new Date(Math.max(...allLoadDates.map(d => d.getTime()))) : null;

    console.log('Latest load date identified:', latestLoadDate);

    // Calculate the date 2 months ago for report_date filtering
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    console.log('Filtering out vessels with report_date older than:', twoMonthsAgo);

    // Active vessels processing
    const activeVessels = latestLoadDate ?
      vesselsWithValidData.filter(vessel => {
        // Check active status and latest load date
        const isActive = vessel.status === "Active" &&
          vessel.rds_load_date &&
          new Date(vessel.rds_load_date).getTime() === latestLoadDate.getTime();

        // Debug: Log SDTR FAITH's active status check
        if (vessel.vessel_name === "SDTR FAITH") {
          console.log('SDTR FAITH active status check:', {
            status: vessel.status,
            rds_load_date: vessel.rds_load_date,
            parsed_rds_load_date: new Date(vessel.rds_load_date),
            latest_load_date: latestLoadDate,
            rds_matches_latest: vessel.rds_load_date && new Date(vessel.rds_load_date).getTime() === latestLoadDate.getTime(),
            isActive
          });
        }

        // Check report date recency
        let hasRecentReport = false;
        if (vessel.report_date) {
          const reportDate = parseDate(vessel.report_date);
          if (reportDate) {
            hasRecentReport = reportDate >= twoMonthsAgo;

            // Debug: Log SDTR FAITH's report date check
            if (vessel.vessel_name === "SDTR FAITH") {
              console.log('SDTR FAITH report date check:', {
                report_date: vessel.report_date,
                parsed_report_date: reportDate,
                two_months_ago: twoMonthsAgo,
                hasRecentReport,
                days_diff: Math.floor((new Date() - reportDate) / (1000 * 60 * 60 * 24))
              });
            }

            if (!hasRecentReport) {
              console.debug('Vessel excluded due to old report date:', {
                vessel: vessel.vessel_name,
                reportDate: reportDate,
                twoMonthsAgo: twoMonthsAgo
              });
            }
          }
        } else {
          // Debug: Log if SDTR FAITH has no report date
          if (vessel.vessel_name === "SDTR FAITH") {
            console.log('SDTR FAITH has no report_date');
          }
        }

        const finalResult = isActive && hasRecentReport;

        // Debug: Log final result for SDTR FAITH
        if (vessel.vessel_name === "SDTR FAITH") {
          console.log('SDTR FAITH final active filter result:', {
            isActive,
            hasRecentReport,
            finalResult
          });
        }

        return finalResult;
      }) : [];

    // Inactive vessels: all with status="Inactive"
    const inactiveVessels = vesselsWithValidData.filter(vessel => {
      const isInactive = vessel.status === "Inactive";

      // Debug: Check if SDTR FAITH is considered inactive
      if (vessel.vessel_name === "SDTR FAITH") {
        console.log('SDTR FAITH inactive check:', {
          status: vessel.status,
          isInactive
        });
      }

      return isInactive;
    });

    console.log('Active vessels from latest load date (with recent reports):', activeVessels.length);
    console.log('Inactive vessels (all dates):', inactiveVessels.length);

    // Debug: Final check - is SDTR FAITH in either list?
    const sdtrFaithActive = activeVessels.find(v => v.vessel_name === "SDTR FAITH");
    const sdtrFaithInactive = inactiveVessels.find(v => v.vessel_name === "SDTR FAITH");

    console.log('SDTR FAITH in active vessels:', sdtrFaithActive ? 'YES' : 'NO');
    console.log('SDTR FAITH in inactive vessels:', sdtrFaithInactive ? 'YES' : 'NO');

    // Enhance vessel data with calculated fields
    const enhanceVessel = (vessel, isActive = true) => {
      const etaDate = parseDate(vessel.eta);

      let days_to_go = 0;
      if (etaDate) {
        const currentDate = new Date();
        const timeDiff = etaDate.getTime() - currentDate.getTime();
        days_to_go = Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24) * 10) / 10);
      } else if (vessel.DISTANCE_TO_GO) {
        days_to_go = parseFloat((vessel.DISTANCE_TO_GO / 350).toFixed(1));
      }

      // Generate a unique key using UUID
      const uniqueKey = `vessel-${uuidv4()}`;

      // Categorize and format the event_type (status)
      const formattedStatus = categorizeStatus(vessel.event_type);

      return {
        ...vessel,
        etaDate,
        days_to_go,
        riskScore: Math.floor(Math.random() * 100),
        uniqueKey,
        isActiveVessel: isActive,
        reportDate: parseDate(vessel.report_date), // Add parsed report date
        event_type: formattedStatus // Apply the formatted status
      };
    };

    // Process both active and inactive vessels
    const enhancedActiveVessels = activeVessels.map(v => enhanceVessel(v, true));
    const enhancedInactiveVessels = inactiveVessels.map(v => enhanceVessel(v, false));

    // Store processed vessels
    setActiveVessels(enhancedActiveVessels);
    setInactiveVessels(enhancedInactiveVessels);
    setAllProcessedVessels([...enhancedActiveVessels, ...enhancedInactiveVessels]);

    // Return active vessels for default view
    return enhancedActiveVessels;
  }, []);
  // Sort vessels data
  const sortVesselsData = useCallback((processedData) => {
    return [...processedData].sort((a, b) => {
      // In-port vessels should be at the top
      const aInPort = a.event_type && (a.event_type.toLowerCase().includes('port') || a.event_type.toLowerCase().includes('berth'));
      const bInPort = b.event_type && (b.event_type.toLowerCase().includes('port') || b.event_type.toLowerCase().includes('berth'));

      if (aInPort && !bInPort) return -1;
      if (!aInPort && bInPort) return 1;

      // Then sort by ETA (earliest first for vessels not in port)
      if (!aInPort && !bInPort) {
        if (!a.etaDate && !b.etaDate) return 0;
        if (!a.etaDate) return 1;
        if (!b.etaDate) return -1;
        return a.etaDate - b.etaDate;
      }

      return 0;
    });
  }, []);

  // Fetch vessel data from API (now using the new endpoint with overrides)
  const fetchVesselData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the new API endpoint for vessels with overrides
      const response = await fetch(VESSELS_WITH_OVERRIDES_API_URL);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      let data = await response.json();
      console.log('API Response data with overrides:', data.length, 'rows');

      const processedData = processVesselsData(data);
      console.log('Processed data for display:', processedData.length);

      const sortedData = sortVesselsData(processedData);
      console.log('Sorted data for display:', sortedData.length);

      setVessels(sortedData || []);
      setFilteredVessels(sortedData || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching vessel data with overrides:', err);
      setError('Failed to load vessel data. Please try again later.');
      setVessels([]);
      setFilteredVessels([]);
    } finally {
      setLoading(false);
    }
  }, [processVesselsData, sortVesselsData, VESSELS_WITH_OVERRIDES_API_URL]);

  // Load data on component mount
  useEffect(() => {
    fetchVesselData(); // Call the new fetch function
  }, [fetchVesselData]);

  useEffect(() => {
    fetchPscDeficiencyData();
  }, [fetchPscDeficiencyData]);

  useEffect(() => {
    fetchPortVesselRiskData();
  }, [fetchPortVesselRiskData]);


  // Initialize filter options from all vessels
  useEffect(() => {
    if (allProcessedVessels.length > 0) {
      // Get unique values for all filters from all vessels
      const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))];
      const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))];
      const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.office_doc).filter(Boolean))];

      setPortFilters(uniquePorts);
      setStatusFilters(uniqueStatuses);
      setDocFilters(uniqueDocs);
    }
  }, [allProcessedVessels]);

  // Apply voyage status filter when it changes
  useEffect(() => {
    let baseVessels = [];

    if (voyageStatusFilter === 'Current Voyages') {
      console.log('Showing Current Voyages (Active):', activeVessels.length);
      baseVessels = activeVessels;
    } else if (voyageStatusFilter === 'Past Voyages') {
      console.log('Showing Past Voyages (Inactive):', inactiveVessels.length);
      baseVessels = inactiveVessels;
    } else { // 'All Voyages'
      console.log('Showing All Voyages:', allProcessedVessels.length);
      baseVessels = allProcessedVessels;
    }

    const sortedData = sortVesselsData(baseVessels);
    setVessels(sortedData);
  }, [voyageStatusFilter, activeVessels, inactiveVessels, allProcessedVessels, sortVesselsData]);

  // Apply other filters when filters or data change
  useEffect(() => {
    if (!vessels.length) {
      setFilteredVessels([]);
      return;
    }

    let results = [...vessels];

    // Apply port filters if any selected
    if (portFilters.length > 0) {
      results = results.filter(vessel =>
        !vessel.arrival_port || portFilters.includes(vessel.arrival_port)
      );
    }

    // Apply status filters if any selected
    if (statusFilters.length > 0) {
      results = results.filter(vessel =>
        !vessel.event_type || statusFilters.includes(vessel.event_type)
      );
    }

    // Apply DOC filters if any selected
    if (docFilters.length > 0) {
      results = results.filter(vessel =>
        !vessel.office_doc || docFilters.includes(vessel.office_doc)
      );
    }

    // Apply search term if not empty
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(vessel =>
        (vessel.vessel_name && vessel.vessel_name.toLowerCase().includes(term)) ||
        (vessel.imo_no && vessel.imo_no.toString().includes(term)) ||
        (vessel.arrival_port && vessel.arrival_port.toLowerCase().includes(term))
      );
    }

    setFilteredVessels(results);
  }, [vessels, searchTerm, portFilters, statusFilters, docFilters]);

  // Handle update for ETA, ETB, ETD fields
  const handleUpdateOverride = async (vesselId, fieldName, newValue) => {
    const vesselToUpdate = vessels.find(v => v.id === vesselId);

    // The vesselToUpdate.id is already the correct vessel_comment_id from psc_tracker_comments
    const vesselCommentId = vesselToUpdate?.id;

    if (!vesselCommentId) {
      console.error(`Vessel Comment ID (pc.id) not found for vessel ID: ${vesselId}`);
      setError('Could not update field: Missing necessary ID.');
      return;
    }

    // Get the current user ID from your authentication context
    // Replace 'your_user_id_here' with the actual user ID from your auth context
    // Example: const currentUserId = auth.currentUser?.uid; or auth.currentUser?.email;
    const currentUserId = 'your_user_id_here'; // IMPORTANT: You need to pass a user_id

    const fieldKey = `${vesselId}-${fieldName}`;
    setSavingStates(prev => ({ ...prev, [fieldKey]: true }));

    try {
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
      // Your Lambda now returns the updated override record directly, not a { success: true } object
      // So, you can directly use 'result' to update the state.
      // The Lambda returns: override_id, vessel_comment_id, user_eta, user_etb, user_etd, created_at, updated_at
      // We need to update the specific user_eta, user_etb, or user_etd field in the local state.

      setVessels(prevVessels =>
        prevVessels.map(vessel =>
          vessel.id === vesselId
            ? {
                ...vessel,
                // Update the specific override field based on the fieldName
                // The Lambda response 'result' will contain the updated user_eta, user_etb, or user_etd
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
  };


  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setChartPortFilter(null);  // Clear port chart filter
    setTimelineFilter(null);   // Clear timeline filter

    // Set port, status, and doc filters to include all options
    const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))];
    const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))];
    const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.office_doc).filter(Boolean))];

    setPortFilters(uniquePorts);
    setStatusFilters(uniqueStatuses);
    setDocFilters(uniqueDocs);
    setVoyageStatusFilter('Current Voyages');
  }, [allProcessedVessels]);
  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    // Get all unique values from all processed vessels
    const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))];
    const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))];
    const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.office_doc).filter(Boolean))];

    switch (type) {
      case 'ports':
        setPortFilters(portFilters.length === uniquePorts.length ? [] : uniquePorts);
        break;
      case 'statuses':
        setStatusFilters(statusFilters.length === uniqueStatuses.length ? [] : uniqueStatuses);
        break;
      case 'docs':
        setDocFilters(docFilters.length === uniqueDocs.length ? [] : uniqueDocs);
        break;
      default:
        break;
    }
  };

  // Toggle a specific filter item
  const toggleFilterItem = (type, item) => {
    switch (type) {
      case 'ports':
        setPortFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      case 'statuses':
        setStatusFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      case 'docs':
        setDocFilters(prevFilters =>
          prevFilters.includes(item)
            ? prevFilters.filter(i => i !== item)
            : [...prevFilters, item]
        );
        break;
      default:
        break;
    }
  };

  // Memoized values for filter counts and dropdown options
  const uniquePorts = useMemo(() =>
    [...new Set(filteredVessels.map(v => v.arrival_port).filter(Boolean))],
    [filteredVessels]
  );

  const uniqueStatuses = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))],
    [allProcessedVessels]
  );

  const uniqueDocs = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.office_doc).filter(Boolean))],
    [allProcessedVessels]
  );



  const vesselCount = vessels.length;
  const filteredCount = filteredVessels.length;

  const vesselPscData = useMemo(() => {
    if (!vessels.length) return [];

    const deficiencyCounts = {};
    vessels.forEach(vessel => {
      // Group by PSC_CATEGORY for better categorization
      const category = vessel.PSC_CATEGORY || 'Unknown';
      if (!deficiencyCounts[category]) {
        deficiencyCounts[category] = {
          category: category,
          count: 0,
          details: []
        };
      }

      // Add to count
      deficiencyCounts[category].count += Number(vessel.DEFICIENCY_COUNT) || 0;

      // Add details if available
      if (vessel.PSC_SUB_CATEGORY) {
        deficiencyCounts[category].details.push({
          code: vessel.PSC_CODE,
          subCategory: vessel.PSC_SUB_CATEGORY
        });
      }
    });

    // Convert to array and sort by count
    return Object.values(deficiencyCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 categories
  }, [vessels]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">{payload[0].value} deficiencies</p>
          {data.details && data.details.length > 0 && (
            <div className="tooltip-details">
              {data.details.slice(0, 3).map((detail, idx) => (
                <p key={idx} className="tooltip-sub">
                  {detail.code}: {detail.subCategory}
                </p>
              ))}
              {data.details.length > 3 && (
                <p className="tooltip-more">
                  +{data.details.length - 3} more...
                </p>
              )}
            </div>
          )}
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };

  // Chart data
  const vesselsByPortData = useMemo(() => {
    if (!vessels.length) return [];

    const portCounts = {};
    vessels.forEach(vessel => {
      if (vessel.arrival_port) {
        portCounts[vessel.arrival_port] = (portCounts[vessel.arrival_port] || 0) + 1;
      }
    });

    return Object.entries(portCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([port, count]) => ({
        port,
        vessels: count
      }));
  }, [vessels]);

  const arrivalTimelineData = useMemo(() => {
    if (!vessels.length) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const arrivingToday = vessels.filter(v =>
      v.etaDate && v.etaDate >= today && v.etaDate < tomorrow
    ).length;

    const arrivingThisWeek = vessels.filter(v =>
      v.etaDate && v.etaDate >= tomorrow && v.etaDate < nextWeek
    ).length;

    const arrivingLater = vessels.filter(v =>
      v.etaDate && v.etaDate >= nextWeek
    ).length;

    const inPort = vessels.filter(v =>
      v.event_type && (
        v.event_type.toLowerCase().includes('port') ||
        v.event_type.toLowerCase().includes('berth')
      )
    ).length;

    return [
      { range: 'In Port', vessels: inPort, color: '#2EE086' },
      { range: 'Today', vessels: arrivingToday, color: '#FF5252' },
      { range: 'This Week', vessels: arrivingThisWeek, color: '#FFD426' },
      { range: 'Later', vessels: arrivingLater, color: '#4DC3FF' }
    ];
  }, [vessels]);

  // Close all dropdowns when clicking elsewhere
  const closeAllDropdowns = () => {
    setShowVoyageStatusDropdown(false);
    setShowPortDropdown(false);
    setShowStatusDropdown(false);
    setShowDocDropdown(false);
    setShowSearch(false);
  };

  // 2. Add this function inside your FleetDashboard component
  const handleLoadDefects = useCallback(async (vesselId) => {
    try {
      console.log(`Loading defects for vessel ID: ${vesselId}`);
      
      // Mock data for testing - replace with real API call later
      const mockDefects = [
        {
          id: 1,
          vessel_id: vesselId,
          equipment_name: "Main Engine",
          description: "Fuel injector malfunction causing reduced performance",
          action_planned: "Replace fuel injector unit and test system",
          criticality: "high",
          status_vessel: "open",
          created_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          vessel_id: vesselId,
          equipment_name: "Navigation System",
          description: "GPS signal intermittent during heavy weather",
          action_planned: "Calibrate GPS antenna and check connections",
          criticality: "medium",
          status_vessel: "open",
          created_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          vessel_id: vesselId,
          equipment_name: "Deck Equipment",
          description: "Minor hydraulic leak in crane system",
          action_planned: "Replace hydraulic seals and test operation",
          criticality: "low",
          status_vessel: "open",
          created_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`Returning ${mockDefects.length} defects for vessel ${vesselId}`);
      return mockDefects;
      
    } catch (error) {
      console.error('Failed to load defects:', error);
      throw error;
    }
  }, []);

  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      <div className="filter-bar">
        <div className="filter-section-left">
          <h1 className="dashboard-title">Fleet</h1>
          <div className="vessel-counter">
            <Ship size={14} />
            <span>{vesselCount}</span>

          </div>

          {/* Search control - Now in the left section */}
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
                  placeholder="Search vessels, IMO, ports..."
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
          {/* Voyage Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showVoyageStatusDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowVoyageStatusDropdown(!showVoyageStatusDropdown);
                setShowPortDropdown(false);
                setShowStatusDropdown(false);
                setShowDocDropdown(false);
              }}
            >
              {voyageStatusFilter}
              <span className="filter-count">1/3</span>
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
                      <span>All Voyages</span>
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
                      <span>Current Voyages</span>
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
                      <span>Past Voyages</span>
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

          {/* Port Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showPortDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowPortDropdown(!showPortDropdown);
                setShowVoyageStatusDropdown(false);
                setShowStatusDropdown(false);
                setShowDocDropdown(false);
              }}
            >
              Ports
              <span className="filter-count">{portFilters.length}/{uniquePorts.length}</span>
            </button>

            {showPortDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Port</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('ports')}>
                    {portFilters.length === uniquePorts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniquePorts.map(port => (
                    <div key={port} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={portFilters.includes(port)}
                          onChange={() => toggleFilterItem('ports', port)}
                        />
                        <span>{port}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowPortDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showStatusDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowVoyageStatusDropdown(false);
                setShowPortDropdown(false);
                setShowDocDropdown(false);
              }}
            >
              Status
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

          {/* DOC Filter Dropdown */}
          <div className="filter-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button
              className={`filter-dropdown-button ${showDocDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowDocDropdown(!showDocDropdown);
                setShowVoyageStatusDropdown(false);
                setShowPortDropdown(false);
                setShowStatusDropdown(false);
              }}
            >
              DOC
              <span className="filter-count">{docFilters.length}/{uniqueDocs.length}</span>
            </button>

            {showDocDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by DOC</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('docs')}>
                    {docFilters.length === uniqueDocs.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {uniqueDocs.map(doc => (
                    <div key={doc} className="filter-checkbox-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={docFilters.includes(doc)}
                          onChange={() => toggleFilterItem('docs', doc)}
                        />
                        <span>{doc}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="filter-dropdown-footer">
                  <button
                    className="apply-btn"
                    onClick={() => setShowDocDropdown(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Button */}
          <button className="reset-button" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>

        <div className="filter-section-right">
          <button className="control-btn refresh-btn" onClick={fetchVesselData} title="Refresh data">
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
          </button>

          <button className="control-btn export-btn" title="Export data">
            <Download size={14} />
          </button>
          <button
            className="map-toggle"
            onClick={() => setMapModalOpen(true)}
          >
            <Map size={14} />
            <span>Map</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-charts">
        {/* <div className="dashboard-card"> */}
        <div className="dashboard-card-body">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              {/* <span>Loading chart data...</span> */}
            </div>
          ) : (
            // <ArrivalsByPortChart
            //   data={vesselsByPortData}
            //   onFilterChange={handleChartFilterChange}
            //   activeFilter={chartPortFilter}
            // />

            <PSCDeficienciesChart
              data={pscDeficiencyData}
              onFilterChange={() => { }}
              activeFilter={null}
            />

          )}
        </div>
        {/* </div> */}

        {/* <div className="dashboard-card"> */}
        <div className="dashboard-card-body">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              {/* <span>Loading chart data...</span> */}
            </div>
          ) : (
            // <ArrivalTimelineChart
            //   data={arrivalTimelineData}
            //   onFilterChange={handleTimelineFilterChange}
            //   activeFilter={timelineFilter}
            // />

            // <PortVesselRiskChart
            //   data={portVesselRiskData}
            //   onFilterChange={(filter) => {
            //     // Handle filter changes if needed
            //     console.log('Risk chart filter changed:', filter);
            //     // You can add filter handling logic here
            //   }}
            //   activeFilter={null}
            // />
            // In your dashboard component:
            <DeficiencyCodeChart
              data={pscDeficiencyData}
              onFilterChange={() => { }}
              activeFilter={null}
            />
            // <PSCKpisChart
            //   data={pscDeficiencyData}
            //   onFilterChange={(filter) => {
            //     // Handle filter changes if needed
            //     console.log('PSC KPI chart filter changed:', filter);
            //     // You can add filter handling logic here
            //   }}
            //   activeFilter={null}
            // />

          )}
        </div>
        {/* </div> */}
      </div>

      <div className="vessel-table-wrapper">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading fleet data...</p>
          </div>
        ) : filteredCount === 0 ? (
          <div className="no-results">
            <p>No vessels match your current filters. Try adjusting your search or filters.</p>
            <button className="reset-filters" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="vessel-table-wrapper">
            <ActiveFiltersDisplay
              portFilter={chartPortFilter}
              timelineFilter={timelineFilter}
              onClearPortFilter={() => handleChartFilterChange(null)}
              onClearTimelineFilter={() => handleTimelineFilterChange(null)}
              onClearAllFilters={() => {
                handleChartFilterChange(null);
                handleTimelineFilterChange(null);
              }}
            />

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading fleet data...</p>
              </div>
            ) : filteredCount === 0 ? (
              <div className="no-results">
                <p>No vessels match your current filters. Try adjusting your search or filters.</p>
                <button className="reset-filters" onClick={resetFilters}>
                  Reset Filters
                </button>
              </div>
            ) : (
              <VesselTable
                vessels={filteredVessels}
                onOpenRemarks={handleOpenComments}
                fieldMappings={fieldMappings}
                onUpdateVessel={handleVesselUpdate} // Keep this for other updates
                onUpdateOverride={handleUpdateOverride} // New prop for ETA/ETB/ETD
                savingStates={savingStates} // Pass saving states
                onLoadDefects={handleLoadDefects} // ADD THIS LINE
              />
            )}
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <div className="data-source">
          Data sources: AIS, Noon Report, Vessel Emails
        </div>
      </div>
      <MapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        vessels={vessels} // Use all vessels, not just filtered ones
      />

      <CommentsModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        vessel={selectedVessel}
        onCommentUpdated={handleCommentUpdated}
        isLoading={loading}
      />
    </div>
  );
};

FleetDashboard.propTypes = {
  onOpenInstructions: PropTypes.func.isRequired,
  fieldMappings: PropTypes.object.isRequired,
};

export default FleetDashboard;