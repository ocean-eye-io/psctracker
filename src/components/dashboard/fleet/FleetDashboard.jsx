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
import defectsService from '../../../services/defectsService';
import { useAuth } from '../../../context/AuthContext';
import ChecklistModal from '../reporting/ChecklistModal';
import portMappingService from '../../../services/PortMappingService';

const FleetDashboard = ({ onOpenInstructions, fieldMappings }) => {
  // Get auth context
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id;

  // Core state management
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter state
  const [portFilters, setPortFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [docFilters, setDocFilters] = useState([]);
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('Current Voyages');

  // Processed data by status
  const [activeVessels, setActiveVessels] = useState([]);
  const [inactiveVessels, setInactiveVessels] = useState([]);
  const [allProcessedVessels, setAllProcessedVessels] = useState([]);

  // UI state
  const [showVoyageStatusDropdown, setShowVoyageStatusDropdown] = useState(false);
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Chart and modal state
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

  // Defect stats
  const [defectStats, setDefectStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    overdue: 0
  });

  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [selectedVesselForChecklist, setSelectedVesselForChecklist] = useState(null);

  // ADDED: Port enrichment loading and progress state variables
  const [portEnrichmentLoading, setPortEnrichmentLoading] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });

  // OPTIMIZED: Defects cache using object instead of Map
  const [defectsCache, setDefectsCache] = useState({});

  // API endpoints
  const BASE_API_URL = 'https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws';
  const VESSELS_WITH_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessels-with-overrides`;
  const VESSEL_OVERRIDE_API_URL = `${BASE_API_URL}/api/vessel-override`;
  const ORIGINAL_VESSELS_API_URL = `${BASE_API_URL}/api/vessels`;
  const PSC_API_URL = `${BASE_API_URL}/api/psc-deficiencies`;

  // OPTIMIZED: Initialize defects service with better error handling
  useEffect(() => {
    const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
    if (currentUserId) {
      try {
        defectsService.setUserId(currentUserId);
        // Test the service silently
        defectsService.getDefectStats().catch(() => {
          // Silent error handling
        });
      } catch (error) {
        // Silent error handling
      }
    }
  }, [currentUser]);

  // OPTIMIZED: Defect stats loading with better error handling
  const loadDefectStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const stats = await defectsService.getDefectStats();
      setDefectStats(stats);
    } catch (error) {
      setDefectStats({
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
        overdue: 0
      });
    }
  }, [currentUser]);

  // Load defect stats on mount
  useEffect(() => {
    if (currentUser) {
      loadDefectStats();
    }
  }, [currentUser, loadDefectStats]);

  // OPTIMIZED: Defects loading handler
  const handleLoadDefects = useCallback(async (vesselName) => {
    try {
      if (!currentUser) {
        return [];
      }

      const currentUserId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
      if (!currentUserId) {
        return [];
      }

      // Check cache first
      const cacheKey = `${vesselName}-${currentUserId}`;
      if (defectsCache[cacheKey]) {
        return defectsCache[cacheKey];
      }

      defectsService.setUserId(currentUserId);
      const normalizedVesselName = vesselName.trim();
      const defects = await defectsService.getVesselDefectsByName(normalizedVesselName);

      // Cache the results
      setDefectsCache(prev => ({
        ...prev,
        [cacheKey]: defects
      }));

      return defects;
    } catch (error) {
      return [];
    }
  }, [currentUser, defectsCache]);

  // OPTIMIZED: Defects cache refresh
  const refreshDefectsCache = useCallback(() => {
    setDefectsCache({});
    defectsService.clearCache();
    loadDefectStats();
  }, [loadDefectStats]);

  // OPTIMIZED: Defect action handlers with better error handling
  const handleCreateDefect = useCallback(async (defectData) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const newDefect = await defectsService.createDefect(defectData);

      // Clear cache for the affected vessel
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

      loadDefectStats();
      return newDefect;
    } catch (error) {
      setError(`Failed to create defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, loadDefectStats]);

  const handleUpdateDefect = useCallback(async (defectId, defectData) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const updatedDefect = await defectsService.updateDefect(defectId, defectData);

      // Clear cache for the affected vessel
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

      loadDefectStats();
      return updatedDefect;
    } catch (error) {
      setError(`Failed to update defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, loadDefectStats]);

  const handleDeleteDefect = useCallback(async (defectId) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const result = await defectsService.deleteDefect(defectId);
      refreshDefectsCache();
      return result;
    } catch (error) {
      setError(`Failed to delete defect: ${error.message}`);
      throw error;
    }
  }, [currentUser, refreshDefectsCache]);

  // Checklist handlers
  const handleOpenChecklist = useCallback((vessel) => {
    setSelectedVesselForChecklist(vessel);
    setChecklistModalOpen(true);
  }, []);

  const handleCloseChecklist = useCallback(() => {
    setChecklistModalOpen(false);
    setSelectedVesselForChecklist(null);
  }, []);

  // OPTIMIZED: Vessel processing with better performance
  

  // OPTIMIZED: Status categorization
  const categorizeStatus = useCallback((status) => {
    if (!status) return "Others";

    const statusLower = status.toLowerCase();

    if (statusLower.includes("at sea") ||
        statusLower.includes("noon at sea") ||
        statusLower.includes("noon sea") ||
        statusLower === "sea" ||
        statusLower === "noon") {
      return "At Sea";
    }

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

    if (statusLower.includes("at anchor") ||
        statusLower.includes("noon at anchor") ||
        statusLower.includes("anchor")) {
      return "At Anchor";
    }

    return "Others";
  }, []);

  const processVesselsData = useCallback((data) => {
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
  
    // Master filter - improved performance
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
  
    console.log(`🔍 [processVesselsData] Processing ${vesselsWithValidData.length} vessels with valid data`);
  
    // 🔧 FIXED: Better voyage classification logic
    // Don't rely solely on rds_load_date for classification
    // Use multiple criteria to determine if a voyage is active/current
  
    const currentDate = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
    // Process vessels and classify them
    const processedVessels = vesselsWithValidData.map(vessel => {
      const etaDate = parseDate(vessel.eta);
      const reportDate = parseDate(vessel.report_date);
      const rdsLoadDate = parseDate(vessel.rds_load_date);
  
      let days_to_go = 0;
      if (etaDate) {
        const timeDiff = etaDate.getTime() - currentDate.getTime();
        days_to_go = Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24) * 10) / 10);
      } else if (vessel.DISTANCE_TO_GO) {
        days_to_go = parseFloat((vessel.DISTANCE_TO_GO / 350).toFixed(1));
      }
  
      // Generate unique key
      const uniqueKey = `vessel-${uuidv4()}`;
  
      // Categorize status
      const formattedStatus = categorizeStatus(vessel.event_type);
  
      // 🔧 IMPROVED: Better logic to determine if voyage is active/current
      let isActiveVessel = false;
  
      // Criteria for active voyage:
      // 1. Vessel status is "Active" AND
      // 2. Has recent report date (within 2 months) OR recent ETA (future or recent past)
      if (vessel.status === "Active") {
        // Check report date recency
        const hasRecentReport = reportDate && reportDate >= twoMonthsAgo;
        
        // Check if ETA is in reasonable range (not too far in the past)
        const hasReasonableETA = etaDate && etaDate >= twoMonthsAgo;
        
        // Check if it's currently at sea or has recent position updates
        const hasRecentActivity = vessel.lat && vessel.lon && reportDate && reportDate >= twoMonthsAgo;
  
        if (hasRecentReport || hasReasonableETA || hasRecentActivity) {
          isActiveVessel = true;
        }
      }
  
      console.log(`🚢 [processVesselsData] ${vessel.vessel_name}: status=${vessel.status}, isActive=${isActiveVessel}, reportDate=${reportDate?.toISOString()}, eta=${etaDate?.toISOString()}`);
  
      return {
        ...vessel,
        etaDate,
        days_to_go,
        riskScore: Math.floor(Math.random() * 100),
        uniqueKey,
        isActiveVessel, // This determines the classification
        reportDate,
        rdsLoadDate,
        event_type: formattedStatus,
        computed_checklist_status: vessel.computed_checklist_status
      };
    });
  
    // Separate vessels based on the improved classification
    const activeVessels = processedVessels.filter(v => v.isActiveVessel);
    const inactiveVessels = processedVessels.filter(v => !v.isActiveVessel);
  
    console.log(`📊 [processVesselsData] Results: ${activeVessels.length} active, ${inactiveVessels.length} inactive`);
  
    // Store processed vessels in state
    setActiveVessels(activeVessels);
    setInactiveVessels(inactiveVessels);
    setAllProcessedVessels(processedVessels); // Store all vessels for filtering
  
    return processedVessels; // Return all vessels initially
  }, [categorizeStatus]);

  // OPTIMIZED: Sort vessels data
  const sortVesselsData = useCallback((processedData) => {
    return [...processedData].sort((a, b) => {
      const aInPort = a.event_type && (a.event_type.toLowerCase().includes('port') || a.event_type.toLowerCase().includes('berth'));
      const bInPort = b.event_type && (b.event_type.toLowerCase().includes('port') || b.event_type.toLowerCase().includes('berth'));

      if (aInPort && !bInPort) return -1;
      if (!aInPort && bInPort) return 1;

      if (!aInPort && !bInPort) {
        if (!a.etaDate && !b.etaDate) return 0;
        if (!a.etaDate) return 1;
        if (!b.etaDate) return -1;
        return a.etaDate - b.etaDate;
      }

      return 0;
    });
  }, []);

  

  const fetchVesselData = useCallback(async () => {
    setLoading(true);
    setError(null);
  
    try {
      console.log('🚀 [FleetDashboard] Starting optimized vessel data fetch...');
      const startTime = Date.now();
  
      // Step 1: Fetch vessels first (fast)
      const response = await fetch(VESSELS_WITH_OVERRIDE_API_URL);
  
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
  
      const data = await response.json();
      
      // 🔧 FIXED: Handle both old and new response structures
      let vesselArray = [];
      let metaData = null;
      
      if (data.vessels && Array.isArray(data.vessels)) {
        // NEW STRUCTURE: { vessels: [...], meta: {...} }
        vesselArray = data.vessels;
        metaData = data.meta;
        console.log('✅ [FleetDashboard] Using NEW response structure');
      } else if (Array.isArray(data)) {
        // OLD STRUCTURE: [vessel1, vessel2, ...]
        vesselArray = data;
        console.log('✅ [FleetDashboard] Using OLD response structure');
      } else {
        console.error('❌ [FleetDashboard] Unknown response structure:', Object.keys(data));
        throw new Error('Invalid response structure from API');
      }
  
      console.log(`✅ [FleetDashboard] Fetched ${vesselArray.length} vessels in ${Date.now() - startTime}ms`);
  
      // Step 2: Process vessel data immediately (no port enrichment yet)
      const processedData = processVesselsData(vesselArray);
      const sortedData = sortVesselsData(processedData);
  
      // Step 3: Update UI immediately with basic vessel data
      setVessels(sortedData);
      setFilteredVessels(sortedData);
      setLoading(false); // UI is now interactive!
      setLastUpdated(new Date());
  
      console.log(`🎯 [FleetDashboard] UI updated with ${sortedData.length} vessels, now enriching with port data...`);
  
      // Only proceed with port enrichment if we have vessels
      if (sortedData.length === 0) {
        console.warn('⚠️ [FleetDashboard] No vessels to enrich, skipping port enrichment');
        setPortEnrichmentLoading(false);
        return;
      }
  
      // Step 4: Enhanced port enrichment based on optimization availability
      if (metaData?.port_optimization_available && metaData?.unique_ports) {
        console.log(`📊 [FleetDashboard] Using OPTIMIZED port loading for ${metaData.unique_port_count} ports`);
        setPortEnrichmentLoading(true);
  
        try {
          // 🚀 OPTIMIZED PATH: Use batch loading
          const uniquePorts = metaData.unique_ports;
          
          // Import the service if not already imported
          const { default: portMappingService } = await import('../../../services/PortMappingService');
          
          // Get port documents in batches with caching
          const portDocuments = await portMappingService.getPortDocumentsBatch(uniquePorts);
          
          console.log(`✅ [FleetDashboard] Loaded documents for ${portDocuments.port_summaries.length} ports`);
          console.log(`📊 Cache hit ratio: ${portDocuments.meta?.cache_hit_ratio || 0}%`);
          
          // Apply port data to vessels
          const enrichedVessels = portMappingService.applyPortDataToVessels(sortedData, portDocuments.lookup);
          
          const finalProcessed = processVesselsData(enrichedVessels);
          const finalSorted = sortVesselsData(finalProcessed);
          
          setVessels(finalSorted);
          setFilteredVessels(finalSorted);
          
          console.log('✅ [FleetDashboard] Port enrichment completed with OPTIMIZED batch loading');
          
        } catch (enrichError) {
          console.warn('⚠️ [FleetDashboard] Optimized port enrichment failed, trying fallback:', enrichError);
          
          // Fallback to progressive enrichment
          try {
            const { default: portMappingService } = await import('../../../services/PortMappingService');
            
            await portMappingService.enrichVesselDataProgressive(
              sortedData,
              (progressiveData, isComplete, current, total) => {
                console.log(`🔄 [FleetDashboard] Fallback enrichment: ${current}/${total}`);
                setEnrichmentProgress({ current, total });
  
                const processedProgressive = processVesselsData(progressiveData);
                const sortedProgressive = sortVesselsData(processedProgressive);
  
                setVessels(sortedProgressive);
                setFilteredVessels(sortedProgressive);
  
                if (isComplete) {
                  console.log('✅ [FleetDashboard] Fallback enrichment completed');
                }
              }
            );
          } catch (fallbackError) {
            console.warn('⚠️ [FleetDashboard] Fallback enrichment also failed:', fallbackError);
          }
        }
        
        setPortEnrichmentLoading(false);
  
      } else {
        // Fallback to old enrichment method
        console.log('⚠️ [FleetDashboard] Port optimization not available, using fallback method');
        setPortEnrichmentLoading(true);
  
        try {
          // Dynamic import to handle missing service
          const { default: portMappingService } = await import('../../../services/PortMappingService');
          
          const enrichedVessels = await portMappingService.enrichVesselData(sortedData);
          const finalProcessed = processVesselsData(enrichedVessels);
          const finalSorted = sortVesselsData(finalProcessed);
          setVessels(finalSorted);
          setFilteredVessels(finalSorted);
          
          console.log('✅ [FleetDashboard] Fallback enrichment completed');
          
        } catch (enrichError) {
          console.warn('⚠️ [FleetDashboard] Port enrichment failed, continuing with basic data:', enrichError);
        }
  
        setPortEnrichmentLoading(false);
      }
  
    } catch (err) {
      console.error('❌ [FleetDashboard] Error loading vessel data:', err);
      setError('Failed to load vessel data. Please try again later.');
      setVessels([]);
      setFilteredVessels([]);
      setLoading(false);
      setPortEnrichmentLoading(false);
    }
  }, [processVesselsData, sortVesselsData, VESSELS_WITH_OVERRIDE_API_URL]);

  const handleChecklistUpdate = useCallback((voyageId, checklistData) => {
    setVessels(prevVessels =>
      prevVessels.map(vessel => {
        if (vessel.id === voyageId) {
          const currentChecklistReceived = vessel.checklist_received;
          const isCurrentlyAcknowledged = currentChecklistReceived === 'Acknowledged';

          let newChecklistReceived;
          if (isCurrentlyAcknowledged) {
            newChecklistReceived = 'Acknowledged';
          } else {
            newChecklistReceived = checklistData.status === 'submitted' ? 'Submitted' :
                                  checklistData.status === 'complete' ? 'Submitted' :
                                  vessel.checklist_received;
          }

          return {
            ...vessel,
            computed_checklist_status: checklistData.status || 'submitted',
            checklist_status: checklistData.status || 'submitted',
            checklist_progress: checklistData.progress || 100,
            checklist_items_completed: checklistData.items_completed,
            checklist_total_items: checklistData.total_items,
            checklist_submitted_at: checklistData.submitted_at,
            checklist_submitted_by: checklistData.submitted_by,
            checklist_received: newChecklistReceived
          };
        }
        return vessel;
      })
    );

    setFilteredVessels(prevFiltered =>
      prevFiltered.map(vessel => {
        if (vessel.id === voyageId) {
          const currentChecklistReceived = vessel.checklist_received;
          const isCurrentlyAcknowledged = currentChecklistReceived === 'Acknowledged';

          let newChecklistReceived;
          if (isCurrentlyAcknowledged) {
            newChecklistReceived = 'Acknowledged';
          } else {
            newChecklistReceived = checklistData.status === 'submitted' ? 'Submitted' :
                                  checklistData.status === 'complete' ? 'Submitted' :
                                  vessel.checklist_received;
          }

          return {
            ...vessel,
            computed_checklist_status: checklistData.status || 'submitted',
            checklist_status: checklistData.status || 'submitted',
            checklist_progress: checklistData.progress || 100,
            checklist_items_completed: checklistData.items_completed,
            checklist_total_items: checklistData.total_items,
            checklist_submitted_at: checklistData.submitted_at,
            checklist_submitted_by: checklistData.submitted_by,
            checklist_received: newChecklistReceived
          };
        }
        return vessel;
      })
    );

    // Refresh vessel data after update
    setTimeout(() => {
      fetchVesselData();
    }, 1000);
  }, [fetchVesselData]);

  // OPTIMIZED: Timeline filter handler
  const handleTimelineFilterChange = useCallback((timeRange) => {
    setTimelineFilter(timeRange);

    if (!timeRange) {
      setFilteredVessels(vessels.filter(v =>
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

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
  }, [vessels, searchTerm, portFilters, statusFilters, docFilters]);

  // OPTIMIZED: Port vessel risk data fetching
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
      setPortVesselRiskData(data);
    } catch (error) {
      setPortVesselRiskData([]);
    } finally {
      setLoadingPortVesselRisk(false);
    }
  }, [BASE_API_URL]);

  // OPTIMIZED: PSC deficiency data fetching
  const fetchPscDeficiencyData = useCallback(async () => {
    try {
      setLoadingPscData(true);
      const response = await fetch(PSC_API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch PSC data');
      }
      const data = await response.json();
      setPscDeficiencyData(data);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoadingPscData(false);
    }
  }, [PSC_API_URL]);

  // Chart filter handlers
  const handleChartFilterChange = useCallback((port) => {
    setChartPortFilter(port);

    if (port) {
      setPortFilters([port]);
    } else {
      const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))];
      setPortFilters(uniquePorts);
    }
  }, [allProcessedVessels]);

  // Comment handlers
  const handleOpenComments = useCallback((vessel) => {
    setSelectedVessel(vessel);
    setCommentModalOpen(true);
  }, []);

  const handleCommentUpdated = useCallback((updatedVessel) => {
    setVessels(vessels.map(vessel =>
      vessel.uniqueKey === updatedVessel.uniqueKey ? updatedVessel : vessel
    ));

    setFilteredVessels(filteredVessels.map(vessel =>
      vessel.uniqueKey === updatedVessel.uniqueKey ? updatedVessel : vessel
    ));
  }, [vessels, filteredVessels]);

  // OPTIMIZED: Vessel update handler
  const handleUpdateVessel = useCallback(async (updatedVessel) => {
    try {
      const fieldToUpdate = updatedVessel.field || 'checklist_received';
      const valueToUpdate = updatedVessel[fieldToUpdate] || updatedVessel.value;

      if (fieldToUpdate === 'checklist_received') {
        const currentVessel = vessels.find(v => v.uniqueKey === updatedVessel.uniqueKey);
        const currentStatus = currentVessel?.checklist_received;

        if (currentStatus === 'Acknowledged') {
          alert('Cannot modify acknowledged checklist status. Pre-arrival checklist has been acknowledged and cannot be changed.');
          return false;
        }
      }

      const payload = {
        id: updatedVessel.id,
        imo_no: updatedVessel.imo_no,
        field: fieldToUpdate,
        value: valueToUpdate
      };

      const response = await fetch(`${ORIGINAL_VESSELS_API_URL.replace(/\/$/, '')}/update-fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409) {
          alert(errorData.message || 'Cannot modify acknowledged checklist status');
          return false;
        }

        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const responseData = await response.json();

      setVessels(prevVessels =>
        prevVessels.map(vessel =>
          vessel.id === updatedVessel.id
            ? {
                ...vessel,
                [fieldToUpdate]: responseData[fieldToUpdate]
              }
            : vessel
        )
      );

      setFilteredVessels(prevFiltered =>
        prevFiltered.map(vessel =>
          vessel.id === updatedVessel.id
            ? {
                ...vessel,
                [fieldToUpdate]: responseData[fieldToUpdate]
              }
            : vessel
        )
      );

      return true;
    } catch (error) {
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

  // OPTIMIZED: Filter options initialization
  useEffect(() => {
    if (allProcessedVessels.length > 0) { // <--- CHANGED
      const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))]; // <--- CHANGED
      const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))]; // <--- CHANGED
      const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.fleet_type).filter(Boolean))]; // <--- CHANGED

      setPortFilters(uniquePorts);
      setStatusFilters(uniqueStatuses);
      setDocFilters(uniqueDocs);
    }
  }, [allProcessedVessels]);

  // OPTIMIZED: Voyage status filter application
  useEffect(() => {
    let baseVessels = [];

    if (voyageStatusFilter === 'Current Voyages') {
      baseVessels = activeVessels;
    } else if (voyageStatusFilter === 'Past Voyages') {
      baseVessels = inactiveVessels;
    } else {
      baseVessels = allProcessedVessels;
    }

    const sortedData = sortVesselsData(baseVessels);
    setVessels(sortedData);
  }, [voyageStatusFilter, activeVessels, inactiveVessels, allProcessedVessels, sortVesselsData]);

  // OPTIMIZED: Apply other filters
  useEffect(() => {
    if (!vessels.length) {
      setFilteredVessels([]);
      return;
    }

    let results = [...vessels]; // Start with vessels filtered by voyageStatusFilter

    // Apply port filters only if portFilters is not empty
    if (portFilters.length > 0) {
      results = results.filter(vessel =>
        vessel.arrival_port && portFilters.includes(vessel.arrival_port)
      );
    }

    // Apply status filters only if statusFilters is not empty
    if (statusFilters.length > 0) {
      results = results.filter(vessel =>
        vessel.event_type && statusFilters.includes(vessel.event_type)
      );
    }

    // Apply DOC filters only if docFilters is not empty
    if (docFilters.length > 0) {
      results = results.filter(vessel =>
        vessel.fleet_type && docFilters.includes(vessel.fleet_type)
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

  // OPTIMIZED: Override update handler
  const handleUpdateOverride = useCallback(async (vesselId, fieldName, newValue) => {
    const vesselToUpdate = vessels.find(v => v.id === vesselId);
    const vesselCommentId = vesselToUpdate?.id;

    if (!vesselCommentId) {
      setError('Could not update field: Missing necessary ID.');
      return;
    }

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

    } catch (err) {
      setError(`Failed to update ${fieldName}: ${err.message || 'Network error'}`);
    } finally {
      setSavingStates(prev => ({ ...prev, [fieldKey]: false }));
    }
  }, [vessels, VESSEL_OVERRIDE_API_URL, currentUser]);

  // OPTIMIZED: Filter reset handler
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setChartPortFilter(null);
    setTimelineFilter(null);

    const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))]; // <--- CHANGED
    const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))]; // <--- CHANGED
    const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.fleet_type).filter(Boolean))]; // <--- CHANGED

    setPortFilters(uniquePorts);
    setStatusFilters(uniqueStatuses);
    setDocFilters(uniqueDocs);
    setVoyageStatusFilter('Current Voyages');
  }, [allProcessedVessels]);

  // OPTIMIZED: Toggle filter items
  const toggleAllItems = useCallback((type) => {
    const uniquePorts = [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))]; // <--- CHANGED
    const uniqueStatuses = [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))]; // <--- CHANGED
    const uniqueDocs = [...new Set(allProcessedVessels.map(v => v.fleet_type).filter(Boolean))]; // <--- CHANGED

    switch (type) {
      case 'ports':
        setPortFilters(portFilters.length === uniquePorts.length ? [] : uniquePorts);
        break;
      case 'statuses':
        setStatusFilters(statusFilters.length === uniqueStatuses.length ? [] : uniqueStatuses);
        break;
      case 'docs':
        setDocFilters(docFilters.length === uniqueStatuses.length ? [] : uniqueDocs); // Fix: Should be uniqueDocs here
        break;
      default:
        break;
    }
  }, [allProcessedVessels, portFilters, statusFilters, docFilters]);

  const toggleFilterItem = useCallback((type, item) => {
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
  }, []);

  // OPTIMIZED: Memoized values for performance
  const uniquePorts = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))], 
    [allProcessedVessels] 
  );

  const uniqueStatuses = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))], 
    [allProcessedVessels] 
  );

  const uniqueDocs = useMemo(() =>
    [...new Set(allProcessedVessels.map(v => v.fleet_type).filter(Boolean))], 
    [allProcessedVessels] 
  );

  const vesselCount = vessels.length;
  const filteredCount = filteredVessels.length;

  // OPTIMIZED: Memoized chart data
  const vesselPscData = useMemo(() => {
    if (!vessels.length) return [];

    const deficiencyCounts = {};
    vessels.forEach(vessel => {
      const category = vessel.PSC_CATEGORY || 'Unknown';
      if (!deficiencyCounts[category]) {
        deficiencyCounts[category] = {
          category: category,
          count: 0,
          details: []
        };
      }

      deficiencyCounts[category].count += Number(vessel.DEFICIENCY_COUNT) || 0;

      if (vessel.PSC_SUB_CATEGORY) {
        deficiencyCounts[category].details.push({
          code: vessel.PSC_CODE,
          subCategory: vessel.PSC_SUB_CATEGORY
        });
      }
    });

    return Object.values(deficiencyCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [vessels]);

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
  const closeAllDropdowns = useCallback(() => {
    setShowVoyageStatusDropdown(false);
    setShowPortDropdown(false);
    setShowStatusDropdown(false);
    setShowDocDropdown(false);
    setShowSearch(false);
  }, []);

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

          {/* {defectStats.total > 0 && (
            <div className="defect-counter">
              <AlertTriangle size={14} />
              <span>{defectStats.open} open defects</span>
            </div>
          )} */}

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
            refreshDefectsCache();
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

      {/* ADDED: Port enrichment loading indicator */}
      {portEnrichmentLoading && (
        <div className="port-enrichment-loading">
          <div className="loading-indicator">
            <RefreshCw size={14} className="spinning" />
            <span>Loading port documents... ({enrichmentProgress.current}/{enrichmentProgress.total})</span>
          </div>
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

            {/* OPTIMIZED: VesselTable with proper defects integration */}
            <VesselTable
              vessels={filteredVessels}
              onOpenRemarks={handleOpenComments}
              fieldMappings={fieldMappings}
              onUpdateVessel={handleUpdateVessel}
              onUpdateOverride={handleUpdateOverride}
              onLoadDefects={handleLoadDefects}
              onCreateDefect={handleCreateDefect}
              onUpdateDefect={handleUpdateDefect}
              onDeleteDefect={handleDeleteDefect}
              onOpenChecklist={handleOpenChecklist}
              defectStats={defectStats}
              currentUser={currentUser}
              savingStates={savingStates}
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

      {/* OPTIMIZED: ChecklistModal with proper integration */}
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