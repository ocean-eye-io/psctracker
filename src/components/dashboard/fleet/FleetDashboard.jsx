import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Filter, Download,
  RefreshCw, Map, Ship, AlertTriangle,
  ClipboardCheck, FileCheck, CheckSquare2, ListChecks, Wrench, AlertCircle, CheckCircle, ChevronDown
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

// Import the updated defects service and auth context
import defectsService from '../../../services/defectsService';
import { useAuth } from '../../../context/AuthContext';

// Add this import at the top with your existing imports
import ChecklistModal from '../reporting/ChecklistModal';

const FleetDashboard = ({ onOpenInstructions, fieldMappings }) => {
  // Get auth context
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id;

  // State variables (keep all your existing state variables)
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state variables (keep all existing filter states)
  const [portFilters, setPortFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [docFilters, setDocFilters] = useState([]);
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('Current Voyages');

  // Store processed data by status for filter operations (keep existing)
  const [activeVessels, setActiveVessels] = useState([]);
  const [inactiveVessels, setInactiveVessels] = useState([]);
  const [allProcessedVessels, setAllProcessedVessels] = useState([]);

  // Dropdown visibility state (keep existing)
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
  const [savingStates, setSavingStates] = useState({});

  // Add defect stats state
  const [defectStats, setDefectStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    overdue: 0
  });

  // Add these new state variables after your existing state declarations
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [selectedVesselForChecklist, setSelectedVesselForChecklist] = useState(null);

  // FIXED: Add defects cache to prevent unnecessary API calls (using object instead of Map)
  const [defectsCache, setDefectsCache] = useState({});

  // API endpoints (keep your existing endpoints)
  const BASE_API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
  const VESSELS_WITH_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessels-with-overrides`;
  const VESSEL_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessel-override`;
  const ORIGINAL_VESSELS_API_URL = `${BASE_API_URL}/api/vessels`;
  const PSC_API_URL = `${BASE_API_URL}/api/psc-deficiencies`;

  // FIXED: Initialize defects service with user ID when auth changes - improved error handling
  useEffect(() => {
    const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
    if (currentUserId) {
      console.log('FleetDashboard: Setting defects service userId:', currentUserId);
      try {
        defectsService.setUserId(currentUserId);
        // Test the service is working
        defectsService.getDefectStats().then(stats => {
          console.log('Defects service initialized successfully:', stats);
        }).catch(err => {
          console.warn('Defects service test failed:', err);
        });
      } catch (error) {
        console.error('Failed to initialize defects service:', error);
      }
    } else {
      console.log('FleetDashboard: No user ID available for defects service');
    }
  }, [currentUser]);

  // FIXED: Enhanced defect stats loading with better error handling
  const loadDefectStats = useCallback(async () => {
    if (!currentUser) {
      console.log('No authenticated user, skipping defect stats load');
      return;
    }

    try {
      console.log('Loading defect stats...');
      const stats = await defectsService.getDefectStats();
      console.log('Loaded defect stats:', stats);
      setDefectStats(stats);
    } catch (error) {
      console.error('Error loading defect stats:', error);
      // Set default stats on error instead of leaving them empty
      setDefectStats({
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
        overdue: 0
      });
    }
  }, [currentUser]);

  // Load defect stats on component mount and when user changes
  useEffect(() => {
    if (currentUser) {
      loadDefectStats();
    }
  }, [currentUser, loadDefectStats]);

  // FIXED: Completely rewritten handleLoadDefects to match your old working version
  const handleLoadDefects = useCallback(async (vesselName) => {
    try {
      console.log(`🚢 Loading defects for vessel: ${vesselName}`);
      
      if (!currentUser) {
        console.warn('❌ No authenticated user, cannot load defects');
        return [];
      }
      
      // Get user ID with multiple fallbacks
      const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
      if (!currentUserId) {
        console.warn('❌ No user ID found in currentUser object:', currentUser);
        return [];
      }

      // Check cache first (using object instead of Map)
      const cacheKey = `${vesselName}-${currentUserId}`;
      if (defectsCache[cacheKey]) {
        console.log('📋 Using cached defects for vessel:', vesselName);
        return defectsCache[cacheKey];
      }
      
      console.log('🔍 FleetDashboard: Using userId for defects:', currentUserId);
      
      // Ensure defects service has the right user ID
      defectsService.setUserId(currentUserId);
      
      // Use vessel name for lookup - normalize the vessel name
      const normalizedVesselName = vesselName.trim();
      console.log('🔍 Fetching defects for normalized vessel name:', normalizedVesselName);
      
      const defects = await defectsService.getVesselDefectsByName(normalizedVesselName);
      
      // Cache the results (using object instead of Map)
      setDefectsCache(prev => ({
        ...prev,
        [cacheKey]: defects
      }));
      
      console.log(`✅ Loaded ${defects.length} defects for vessel ${vesselName}`);
      
      // Log first few defects for debugging
      if (defects.length > 0) {
        console.log('Sample defects:', defects.slice(0, 2).map(d => ({
          id: d.id,
          title: d.title,
          status: d.status,
          criticality: d.criticality,
          vessel_name: d.vessel_name
        })));
      }
      
      return defects;
      
    } catch (error) {
      console.error('❌ Failed to load defects for vessel:', vesselName, error);
      // Return empty array on error instead of throwing
      return [];
    }
  }, [currentUser, defectsCache]);

  // FIXED: Function to refresh defects cache when needed
  const refreshDefectsCache = useCallback(() => {
    console.log('🔄 Clearing defects cache');
    setDefectsCache({});
    defectsService.clearCache();
    loadDefectStats(); // Reload stats after clearing cache
  }, [loadDefectStats]);

  // FIXED: Enhanced defect action handlers with better error handling
  const handleCreateDefect = useCallback(async (defectData) => {
    try {
      console.log('🆕 Creating new defect:', defectData);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const newDefect = await defectsService.createDefect(defectData);
      console.log('✅ Created defect:', newDefect);

      // Clear cache for the affected vessel (using object instead of Map)
      const vesselName = defectData.vessel_name;
      if (vesselName) {
        const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
        const cacheKey = `${vesselName}-${currentUserId}`;
        setDefectsCache(prev => {
          const newCache = { ...prev };
          delete newCache[cacheKey];
          return newCache;
        });
      }

      // Refresh stats after creating
      loadDefectStats();

      return newDefect;
    } catch (error) {
      console.error('❌ Error creating defect:', error);
      setError(`Failed to create defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, loadDefectStats]);

  const handleUpdateDefect = useCallback(async (defectId, defectData) => {
    try {
      console.log('📝 Updating defect:', defectId, defectData);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const updatedDefect = await defectsService.updateDefect(defectId, defectData);
      console.log('✅ Updated defect:', updatedDefect);

      // Clear cache for the affected vessel (using object instead of Map)
      const vesselName = defectData.vessel_name || updatedDefect.vessel_name;
      if (vesselName) {
        const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
        const cacheKey = `${vesselName}-${currentUserId}`;
        setDefectsCache(prev => {
          const newCache = { ...prev };
          delete newCache[cacheKey];
          return newCache;
        });
      }

      // Refresh stats after updating
      loadDefectStats();

      return updatedDefect;
    } catch (error) {
      console.error('❌ Error updating defect:', error);
      setError(`Failed to update defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, loadDefectStats]);

  const handleDeleteDefect = useCallback(async (defectId) => {
    try {
      console.log('🗑️ Deleting defect:', defectId);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const result = await defectsService.deleteDefect(defectId);
      console.log('✅ Deleted defect result:', result);

      // Clear entire cache since we don't know which vessel the defect belonged to
      refreshDefectsCache();

      return result;
    } catch (error) {
      console.error('❌ Error deleting defect:', error);
      setError(`Failed to delete defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, refreshDefectsCache]);

  // NEW: Handle checklist icon click from VesselTable
  const handleOpenChecklist = useCallback((vessel) => {
    console.log('FleetDashboard: Opening checklist for vessel:', vessel.vessel_name);
    setSelectedVesselForChecklist(vessel);
    setChecklistModalOpen(true);
  }, []);

  // NEW: Handle checklist modal close
  const handleCloseChecklist = useCallback(() => {
    console.log('FleetDashboard: Closing checklist modal');
    setChecklistModalOpen(false);
    setSelectedVesselForChecklist(null);
  }, []);

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

      return isValid;
    });

    console.log('Vessels with valid IMO and vessel names:', vesselsWithValidData.length);

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

        // Check report date recency
        let hasRecentReport = false;
        if (vessel.report_date) {
          const reportDate = parseDate(vessel.report_date);
          if (reportDate) {
            hasRecentReport = reportDate >= twoMonthsAgo;

            if (!hasRecentReport) {
              console.debug('Vessel excluded due to old report date:', {
                vessel: vessel.vessel_name,
                reportDate: reportDate,
                twoMonthsAgo: twoMonthsAgo
              });
            }
          }
        }

        return isActive && hasRecentReport;
      }) : [];

    // Inactive vessels: all with status="Inactive"
    const inactiveVessels = vesselsWithValidData.filter(vessel => {
      return vessel.status === "Inactive";
    });

    console.log('Active vessels from latest load date (with recent reports):', activeVessels.length);
    console.log('Inactive vessels (all dates):', inactiveVessels.length);

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
        event_type: formattedStatus, // Apply the formatted status
        computed_checklist_status: vessel.computed_checklist_status // Include the new field
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
      const response = await fetch(VESSELS_WITH_OVERRIDE_API_URL);

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
  }, [processVesselsData, sortVesselsData, VESSELS_WITH_OVERRIDE_API_URL]);

  // Handle checklist updates (when checklist is submitted/updated)
  const handleChecklistUpdate = useCallback((voyageId, checklistData) => {
    console.log('FleetDashboard: Checklist updated for voyage:', voyageId, checklistData);
    
    // Update the vessels data to reflect the new checklist status
    setVessels(prevVessels => 
      prevVessels.map(vessel => {
        if (vessel.id === voyageId) {
          return {
            ...vessel,
            computed_checklist_status: checklistData.status || 'submitted',
            checklist_status: checklistData.status || 'submitted',
            checklist_progress: checklistData.progress || 100,
            checklist_items_completed: checklistData.items_completed,
            checklist_total_items: checklistData.total_items,
            checklist_submitted_at: checklistData.submitted_at,
            checklist_submitted_by: checklistData.submitted_by,
            // Update the display field that the dropdown uses
            checklist_received: checklistData.status === 'submitted' ? 'Submitted' : 
                                checklistData.status === 'complete' ? 'Submitted' :
                                vessel.checklist_received // Keep existing dropdown value for non-submitted
          };
        }
        return vessel;
      })
    );

    // Also update filtered vessels
    setFilteredVessels(prevFiltered => 
      prevFiltered.map(vessel => {
        if (vessel.id === voyageId) {
          return {
            ...vessel,
            computed_checklist_status: checklistData.status || 'submitted',
            checklist_status: checklistData.status || 'submitted',
            checklist_progress: checklistData.progress || 100,
            checklist_items_completed: checklistData.items_completed,
            checklist_total_items: checklistData.total_items,
            checklist_submitted_at: checklistData.submitted_at,
            checklist_submitted_by: checklistData.submitted_by,
            checklist_received: checklistData.status === 'submitted' ? 'Submitted' : 
                                checklistData.status === 'complete' ? 'Submitted' :
                                vessel.checklist_received
          };
        }
        return vessel;
      })
    );

    // Refresh the main vessel data to ensure consistency
    setTimeout(() => {
      console.log('FleetDashboard: Refreshing vessel data after checklist update');
      fetchVesselData();
    }, 1000);
  }, [fetchVesselData]);

  // Keep all your existing functions exactly as they are
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
        (!docFilters.length || !v.fleet_type || docFilters.includes(v.fleet_type))
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
        (!docFilters.length || !v.fleet_type || docFilters.includes(v.fleet_type))
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
      console.log('PSC Data received:', data);
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

  // Enhanced handleUpdateVessel to respect submission constraints
  const handleUpdateVessel = useCallback(async (updatedVessel) => {
    try {
      // Get the field and value to update
      const fieldToUpdate = updatedVessel.field || 'checklist_received';
      const valueToUpdate = updatedVessel[fieldToUpdate] || updatedVessel.value;

      console.log(`Updating vessel: ${updatedVessel.imo_no} with ${fieldToUpdate} value:`, valueToUpdate);

      // Check submission constraints for checklist_received field
      if (fieldToUpdate === 'checklist_received') {
        const currentVessel = vessels.find(v => v.uniqueKey === updatedVessel.uniqueKey);
        const isSubmitted = currentVessel?.computed_checklist_status === 'submitted' || 
                           currentVessel?.computed_checklist_status === 'complete';
        
        // If checklist is submitted, only allow changing to 'Acknowledged'
        if (isSubmitted && valueToUpdate === 'Pending') {
          console.warn('Cannot change submitted checklist back to Pending');
          alert('Cannot change a submitted checklist back to Pending. Only Acknowledged is allowed.');
          return false;
        }
      }

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
  }, [vessels, ORIGINAL_VESSELS_API_URL]);

  // Load data on component mount
  useEffect(() => {
    fetchVesselData();
  }, [fetchVesselData]);

  useEffect(() => {
    fetchPscDeficiencyData();
  }, [fetchPscDeficiencyData]);

  useEffect(() => {
    fetchPortVesselRiskData();
  }, [fetchPortVesselRiskData]);

  // Initialize filter options from all vessels
  useEffect(() => {
    if (vessels.length > 0) {
      const uniquePorts = [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
      const uniqueStatuses = [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
      const uniqueDocs = [...new Set(vessels.map(v => v.fleet_type).filter(Boolean))];
  
      setPortFilters(uniquePorts);
      setStatusFilters(uniqueStatuses);
      setDocFilters(uniqueDocs);
    }
  }, [vessels]);

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
    if (portFilters.length === 0) {
      results = []; // Empty table when no ports selected
    } else {
      results = results.filter(vessel =>
        vessel.arrival_port && portFilters.includes(vessel.arrival_port)
      );
    }
    
    // Apply status filters only if we still have results - if empty array, show nothing
    if (results.length > 0) {
      if (statusFilters.length === 0) {
        results = []; // Empty table when no statuses selected
      } else {
        results = results.filter(vessel =>
          vessel.event_type && statusFilters.includes(vessel.event_type)
        );
      }
    }
    
    // Apply DOC filters only if we still have results - if empty array, show nothing
    if (results.length > 0) {
      if (docFilters.length === 0) {
        results = []; // Empty table when no DOCs selected
      } else {
        results = results.filter(vessel =>
          vessel.fleet_type && docFilters.includes(vessel.fleet_type)
        );
      }
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
    const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;

    if (!currentUserId) {
      setError('User not authenticated. Please log in to update fields.');
      return;
    }

    const fieldKey = `${vesselId}-${fieldName}`;
    setSavingStates(prev => ({ ...prev, [fieldKey]: true }));

    try {
      const response = await fetch(VESSEL_OVERRIDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vessel_comment_id: vesselCommentId,
          field_name: fieldName,
          override_value: newValue,
          user_id: currentUserId,
          original_value: vesselToUpdate[fieldName]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      setVessels(prevVessels =>
        prevVessels.map(vessel =>
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
    setChartPortFilter(null);
    setTimelineFilter(null);
  
    // Set port, status, and doc filters to include all options
    const uniquePorts = [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
    const uniqueStatuses = [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
    const uniqueDocs = [...new Set(vessels.map(v => v.fleet_type).filter(Boolean))];
  
    setPortFilters(uniquePorts);
    setStatusFilters(uniqueStatuses);
    setDocFilters(uniqueDocs);
    setVoyageStatusFilter('Current Voyages');
  }, [vessels]); 
  
  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    // Get all unique values from current vessels                       
    const uniquePorts = [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
    const uniqueStatuses = [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
    const uniqueDocs = [...new Set(vessels.map(v => v.fleet_type).filter(Boolean))];
  
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
    [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))],
    [vessels]
  );

  const uniqueStatuses = useMemo(() =>
    [...new Set(vessels.map(v => v.event_type).filter(Boolean))],
    [vessels]
  );

  const uniqueDocs = useMemo(() =>
    [...new Set(vessels.map(v => v.fleet_type).filter(Boolean))],
    [vessels]
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

  // Debug logging for checklist status
  console.log('FleetDashboard: Current vessels with checklist status:', 
    filteredVessels.slice(0, 3).map(v => ({
      name: v.vessel_name,
      computed_status: v.computed_checklist_status,
      checklist_received: v.checklist_received,
      progress: v.checklist_progress
    }))
  );

  // FIXED: Return statement with proper VesselTable props
  return (
    <div className="dashboard-container" onClick={closeAllDropdowns}>
      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-section-left">
          <h1 className="dashboard-title">Fleet</h1>
          <div className="vessel-counter">
            <Ship size={14} />
            <span>{vesselCount}</span>
          </div>

          {/* Add defect stats display if needed */}
          {defectStats.total > 0 && (
            <div className="defect-counter">
              <AlertTriangle size={14} />
              <span>{defectStats.open} open defects</span>
            </div>
          )}

          {/* Search container */}
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

        {/* Filter controls */}
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
          <button className="control-btn refresh-btn" onClick={() => {
            fetchVesselData();
            refreshDefectsCache(); // Also refresh defects when refreshing
          }} title="Refresh data">
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
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

      {/* Charts section */}
      <div className="dashboard-charts">
        <div className="dashboard-card-body">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <PSCDeficienciesChart
              data={pscDeficiencyData}
              onFilterChange={() => { }}
              activeFilter={null}
            />
          )}
        </div>

        <div className="dashboard-card-body">
          {loading ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <DeficiencyCodeChart
              data={pscDeficiencyData}
              onFilterChange={() => { }}
              activeFilter={null}
            />
          )}
        </div>
      </div>

      {/* Vessel table wrapper */}
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

            {/* FIXED: VesselTable with proper defects integration */}
            <VesselTable
              vessels={filteredVessels}
              onOpenRemarks={handleOpenComments}
              fieldMappings={fieldMappings}
              onUpdateVessel={handleUpdateVessel}
              onUpdateOverride={handleUpdateOverride}
              onLoadDefects={handleLoadDefects} // FIXED: Now properly integrated
              onCreateDefect={handleCreateDefect} // FIXED: Added defect action handlers
              onUpdateDefect={handleUpdateDefect}
              onDeleteDefect={handleDeleteDefect}
              onOpenChecklist={handleOpenChecklist}
              defectStats={defectStats} // Pass defect stats for color coding
              currentUser={currentUser} // Pass current user for defects context
              savingStates={savingStates} // Pass saving states
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="data-source">
          Data sources: AIS, Noon Report, Vessel Emails, Equipment Defects
        </div>
      </div>

      {/* Modals */}
      <MapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        vessels={vessels}
      />

      <CommentsModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        vessel={selectedVessel}
        onCommentUpdated={handleCommentUpdated}
        isLoading={loading}
      />

      {/* FIXED: ChecklistModal with proper integration */}
      <ChecklistModal
        isOpen={checklistModalOpen}
        onClose={handleCloseChecklist}
        vessel={selectedVesselForChecklist}
        onChecklistUpdate={handleChecklistUpdate}
        initialStatus={selectedVesselForChecklist?.computed_checklist_status || 'pending'}
      />
    </div>
  );
};

// PropTypes and default props
FleetDashboard.propTypes = {
  onOpenInstructions: PropTypes.func,
  fieldMappings: PropTypes.object.isRequired,
};

FleetDashboard.defaultProps = {
  onOpenInstructions: () => {},
};

export default FleetDashboard;