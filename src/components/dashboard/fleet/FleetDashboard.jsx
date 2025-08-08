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
  // Get auth context - stabilize with useMemo
  const { currentUser, loading: authLoading } = useAuth();
  const stableCurrentUser = useMemo(() => currentUser, [currentUser?.userId || currentUser?.user_id || currentUser?.id]);
  const userId = stableCurrentUser?.userId || stableCurrentUser?.user_id || stableCurrentUser?.id;

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

  // Performance: Separate background loading states
  const [activeVesselsLoaded, setActiveVesselsLoaded] = useState(false);
  const [backgroundDataLoading, setBackgroundDataLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState({ step: '', progress: 0 });

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

  // Performance: Lazy loading states for defects and checklists
  const [defectStats, setDefectStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    overdue: 0
  });
  const [vesselDefectCounts, setVesselDefectCounts] = useState({});
  const [vesselChecklistStats, setVesselChecklistStats] = useState({});
  const [vesselPortDocCounts, setVesselPortDocCounts] = useState({});

  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [selectedVesselForChecklist, setSelectedVesselForChecklist] = useState(null);

  // Performance: Prevent auto-refresh on checklist save
  const [preventAutoRefresh, setPreventAutoRefresh] = useState(false);
  const autoRefreshTimeoutRef = useRef(null);

  // Performance: Refs for caching and control
  const defectsCacheRef = useRef({});
  const checklistCacheRef = useRef({});
  const portDocsCacheRef = useRef({});
  const backgroundQueueRef = useRef([]);
  const isBackgroundProcessingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const fetchDebounceRef = useRef(null);

  // Stable API endpoints
  const apiEndpoints = useMemo(() => ({
    BASE_API_URL: 'https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws',
    get VESSELS_WITH_OVERRIDE_API_URL() { return `${this.BASE_API_URL}/api/vessels-with-overrides`; },
    get VESSEL_OVERRIDE_API_URL() { return `${this.BASE_API_URL}/api/vessel-override`; },
    get ORIGINAL_VESSELS_API_URL() { return `${this.BASE_API_URL}/api/vessels`; },
    get PSC_API_URL() { return `${this.BASE_API_URL}/api/psc-deficiencies`; }
  }), []);

  // Performance: Stabilize defects service
  const stableDefectsService = useMemo(() => {
    if (userId) {
      try {
        defectsService.setUserId(userId);
        return defectsService;
      } catch (error) {
        console.warn('Defects service initialization failed:', error);
        return null;
      }
    }
    return null;
  }, [userId]);

  // Performance: Background defect stats loading with debouncing
  const loadDefectStats = useCallback(async () => {
    if (!stableDefectsService) return;

    try {
      const stats = await stableDefectsService.getDefectStats();
      setDefectStats(stats);
    } catch (error) {
      console.warn('Failed to load defect stats:', error);
      setDefectStats({
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
        overdue: 0
      });
    }
  }, [stableDefectsService]);

  // Performance: Initialize defects service once
  useEffect(() => {
    if (stableDefectsService) {
      // Debounce defect stats loading
      const timeoutId = setTimeout(() => {
        loadDefectStats();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [stableDefectsService, loadDefectStats]);

  // Performance: Lazy defect count loading per vessel with caching
  const getVesselDefectCount = useCallback(async (vesselName) => {
    if (!stableDefectsService || !vesselName) return { total: 0, high: 0, medium: 0, low: 0 };

    // Check cache first
    if (vesselDefectCounts[vesselName]) {
      return vesselDefectCounts[vesselName];
    }

    try {
      const defects = await stableDefectsService.getVesselDefectsByName(vesselName.trim());
      const openDefects = defects.filter(d => d.Status?.toLowerCase() === 'open');

      const counts = {
        total: openDefects.length,
        high: openDefects.filter(d => d.Criticality?.toLowerCase() === 'high').length,
        medium: openDefects.filter(d => d.Criticality?.toLowerCase() === 'medium').length,
        low: openDefects.filter(d => d.Criticality?.toLowerCase() === 'low').length,
      };

      // Cache the result
      setVesselDefectCounts(prev => ({
        ...prev,
        [vesselName]: counts
      }));

      return counts;
    } catch (error) {
      console.warn(`Failed to load defect count for ${vesselName}:`, error);
      return { total: 0, high: 0, medium: 0, low: 0 };
    }
  }, [stableDefectsService, vesselDefectCounts]);

  // Performance: Lazy defects loading handler
  const handleLoadDefects = useCallback(async (vesselName) => {
    try {
      if (!stableDefectsService || !vesselName) return [];

      // Check full cache first
      const cacheKey = `${vesselName}-${userId}`;
      if (defectsCacheRef.current[cacheKey]) {
        return defectsCacheRef.current[cacheKey];
      }

      const normalizedVesselName = vesselName.trim();
      const defects = await stableDefectsService.getVesselDefectsByName(normalizedVesselName);

      // Cache the results
      defectsCacheRef.current[cacheKey] = defects;

      return defects;
    } catch (error) {
      console.warn(`Failed to load defects for ${vesselName}:`, error);
      return [];
    }
  }, [stableDefectsService, userId]);

  // Performance: Lazy checklist stats loading
  const getVesselChecklistStats = useCallback(async (vesselId) => {
    if (!vesselId) return { status: 'pending', progress: 0 };

    // Check cache first
    if (vesselChecklistStats[vesselId]) {
      return vesselChecklistStats[vesselId];
    }

    try {
      const vessel = vessels.find(v => v.id === vesselId);
      const stats = {
        status: vessel?.computed_checklist_status || 'pending',
        progress: vessel?.checklist_progress || 0
      };

      // Cache the result
      setVesselChecklistStats(prev => ({
        ...prev,
        [vesselId]: stats
      }));

      return stats;
    } catch (error) {
      console.warn(`Failed to load checklist stats for ${vesselId}:`, error);
      return { status: 'pending', progress: 0 };
    }
  }, [vessels, vesselChecklistStats]);

  // Performance: Fixed port document count loading with proper error handling
  const getPortDocumentCount = useCallback(async (portName) => {
    if (!portName) return 0;

    // Check cache first
    if (vesselPortDocCounts[portName]) {
      return vesselPortDocCounts[portName];
    }

    try {
      // Check if the method exists before calling
      if (portMappingService && typeof portMappingService.getPortDocumentCount === 'function') {
        const portData = await portMappingService.getPortDocumentCount(portName);
        const count = portData?.document_count || 0;

        // Cache the result
        setVesselPortDocCounts(prev => ({
          ...prev,
          [portName]: count
        }));

        return count;
      } else {
        console.warn('portMappingService.getPortDocumentCount is not available');
        return 0;
      }
    } catch (error) {
      console.warn(`Failed to load port document count for ${portName}:`, error);
      return 0;
    }
  }, [vesselPortDocCounts]);

  // Performance: Background queue processor with better error handling
  const processBackgroundQueue = useCallback(async () => {
    if (isBackgroundProcessingRef.current || backgroundQueueRef.current.length === 0) {
      return;
    }

    isBackgroundProcessingRef.current = true;
    setBackgroundDataLoading(true);

    try {
      const totalTasks = backgroundQueueRef.current.length;
      let completedTasks = 0;

      while (backgroundQueueRef.current.length > 0) {
        const task = backgroundQueueRef.current.shift();
        const { type, data, callback } = task;

        completedTasks++;
        setBackgroundProgress({
          step: `Loading ${type}...`,
          progress: Math.round((completedTasks / totalTasks) * 100)
        });

        try {
          let result;
          switch (type) {
            case 'defectCount':
              result = await getVesselDefectCount(data.vesselName);
              break;
            case 'checklistStats':
              result = await getVesselChecklistStats(data.vesselId);
              break;
            case 'portDocCount':
              result = await getPortDocumentCount(data.portName);
              break;
            default:
              break;
          }

          if (callback) {
            callback(result);
          }
        } catch (error) {
          console.warn(`Background task failed for ${type}:`, error);
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      isBackgroundProcessingRef.current = false;
      setBackgroundDataLoading(false);
      setTimeout(() => {
        setBackgroundProgress({ step: '', progress: 0 });
      }, 1000);
    }
  }, [getVesselDefectCount, getVesselChecklistStats, getPortDocumentCount]);

  // Performance: Add task to background queue with deduplication
  const addToBackgroundQueue = useCallback((type, data, callback) => {
    // Avoid duplicate tasks
    const taskExists = backgroundQueueRef.current.some(task => 
      task.type === type && 
      JSON.stringify(task.data) === JSON.stringify(data)
    );

    if (!taskExists) {
      backgroundQueueRef.current.push({ type, data, callback });
    }

    // Process queue with debouncing
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }

    fetchDebounceRef.current = setTimeout(() => {
      processBackgroundQueue();
    }, 200);
  }, [processBackgroundQueue]);

  // Performance: Optimized status categorization (stable)
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

  // Performance: Optimized vessel processing with memoization (stable)
  const processVesselsData = useCallback((data) => {
    const parseDate = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) ? date : null;
      } catch (e) {
        return null;
      }
    };

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

    const currentDate = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

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

      const uniqueKey = `vessel-${vessel.id || uuidv4()}`;
      const formattedStatus = categorizeStatus(vessel.event_type);

      let isActiveVessel = false;

      if (vessel.status === "Active") {
        const hasRecentReport = reportDate && reportDate >= twoMonthsAgo;
        const hasReasonableETA = etaDate && etaDate >= twoMonthsAgo;
        const hasRecentActivity = vessel.lat && vessel.lon && reportDate && reportDate >= twoMonthsAgo;

        if (hasRecentReport || hasReasonableETA || hasRecentActivity) {
          isActiveVessel = true;
        }
      }

      return {
        ...vessel,
        etaDate,
        days_to_go,
        riskScore: Math.floor(Math.random() * 100),
        uniqueKey,
        isActiveVessel,
        reportDate,
        rdsLoadDate,
        event_type: formattedStatus,
        computed_checklist_status: vessel.computed_checklist_status
      };
    });

    const activeVessels = processedVessels.filter(v => v.isActiveVessel);
    const inactiveVessels = processedVessels.filter(v => !v.isActiveVessel);

    console.log(`📊 [processVesselsData] Results: ${activeVessels.length} active, ${inactiveVessels.length} inactive`);

    setActiveVessels(activeVessels);
    setInactiveVessels(inactiveVessels);
    setAllProcessedVessels(processedVessels);

    return processedVessels;
  }, [categorizeStatus]);

  // Performance: Optimized sorting with memoization (stable)
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

  // Performance: Debounced vessel data fetching with duplicate prevention
  const fetchVesselData = useCallback(async () => {
    if (preventAutoRefresh) {
      console.log('🚫 Auto-refresh prevented during checklist operation');
      return;
    }

    // Prevent duplicate calls within 1 second
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      console.log('🚫 Fetch prevented - too soon after last fetch');
      return;
    }
    lastFetchTimeRef.current = now;

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 [FleetDashboard] Starting optimized vessel data fetch...');
      const startTime = Date.now();

      const response = await fetch(apiEndpoints.VESSELS_WITH_OVERRIDE_API_URL);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Handle both old and new response structures
      let vesselArray = [];
      let metaData = null;

      if (data.vessels && Array.isArray(data.vessels)) {
        vesselArray = data.vessels;
        metaData = data.meta;
        console.log('✅ [FleetDashboard] Using NEW response structure');
      } else if (Array.isArray(data)) {
        vesselArray = data;
        console.log('✅ [FleetDashboard] Using OLD response structure');
      } else {
        console.error('❌ [FleetDashboard] Unknown response structure:', Object.keys(data));
        throw new Error('Invalid response structure from API');
      }

      console.log(`✅ [FleetDashboard] Fetched ${vesselArray.length} vessels in ${Date.now() - startTime}ms`);

      // Process and show active vessels immediately
      const allProcessedData = processVesselsData(vesselArray);
      const activeVesselsOnly = allProcessedData.filter(v => v.isActiveVessel);
      const sortedActiveVessels = sortVesselsData(activeVesselsOnly);

      // Update UI immediately with active vessels only
      setVessels(sortedActiveVessels);
      setFilteredVessels(sortedActiveVessels);
      setActiveVesselsLoaded(true);
      setLoading(false);
      setLastUpdated(new Date());

      console.log(`🎯 [FleetDashboard] UI updated with ${sortedActiveVessels.length} active vessels`);

      // Background processing for inactive vessels and enrichment
      setTimeout(async () => {
        try {
          setBackgroundDataLoading(true);
          setBackgroundProgress({ step: 'Loading inactive voyages...', progress: 10 });

          const allSortedVessels = sortVesselsData(allProcessedData);

          // Only update if user is still on relevant filter
          if (voyageStatusFilter === 'All Voyages') {
            setVessels(allSortedVessels);
            setFilteredVessels(allSortedVessels);
          }

          setBackgroundProgress({ step: 'Loading port documents...', progress: 50 });

          // Enhanced port enrichment with better error handling
          if (metaData?.port_optimization_available && metaData?.unique_ports) {
            console.log(`📊 [FleetDashboard] Using OPTIMIZED port loading for ${metaData.unique_port_count} ports`);

            try {
              const uniquePorts = metaData.unique_ports;
              
              // Check if batch loading is available
              if (portMappingService && typeof portMappingService.getPortDocumentsBatch === 'function') {
                const portDocuments = await portMappingService.getPortDocumentsBatch(uniquePorts);
                console.log(`✅ [FleetDashboard] Loaded documents for ${portDocuments.port_summaries.length} ports`);

                const enrichedVessels = portMappingService.applyPortDataToVessels(allSortedVessels, portDocuments.lookup);
                const finalProcessed = processVesselsData(enrichedVessels);
                const finalSorted = sortVesselsData(finalProcessed);

                // Update vessels with port data if still on relevant filter
                if (voyageStatusFilter === 'All Voyages' || voyageStatusFilter === 'Current Voyages') {
                  const relevantVessels = voyageStatusFilter === 'Current Voyages'
                    ? finalSorted.filter(v => v.isActiveVessel)
                    : finalSorted;

                  setVessels(relevantVessels);
                  setFilteredVessels(relevantVessels);
                }

                console.log('✅ [FleetDashboard] Port enrichment completed with OPTIMIZED batch loading');
              } else {
                console.warn('⚠️ [FleetDashboard] Batch port loading not available');
              }
            } catch (enrichError) {
              console.warn('⚠️ [FleetDashboard] Port enrichment failed:', enrichError);
            }
          }

          setBackgroundProgress({ step: 'Loading auxiliary data...', progress: 80 });

          // Queue background loading of additional data
          allSortedVessels.forEach(vessel => {
            if (vessel.vessel_name) {
              addToBackgroundQueue('defectCount', { vesselName: vessel.vessel_name });
            }
            if (vessel.id) {
              addToBackgroundQueue('checklistStats', { vesselId: vessel.id });
            }
            if (vessel.arrival_port) {
              addToBackgroundQueue('portDocCount', { portName: vessel.arrival_port });
            }
          });

          setBackgroundProgress({ step: 'Completed', progress: 100 });

        } catch (backgroundError) {
          console.warn('⚠️ [FleetDashboard] Background loading failed:', backgroundError);
        } finally {
          setBackgroundDataLoading(false);
          setTimeout(() => {
            setBackgroundProgress({ step: '', progress: 0 });
          }, 1000);
        }
      }, 100);

    } catch (err) {
      console.error('❌ [FleetDashboard] Error loading vessel data:', err);
      setError('Failed to load vessel data. Please try again later.');
      setVessels([]);
      setFilteredVessels([]);
      setLoading(false);
    }
  }, [
    preventAutoRefresh, 
    apiEndpoints.VESSELS_WITH_OVERRIDE_API_URL, 
    processVesselsData, 
    sortVesselsData, 
    voyageStatusFilter, 
    addToBackgroundQueue
  ]);

  // Performance: Optimized checklist update handler
  const handleChecklistUpdate = useCallback((voyageId, checklistData) => {
    setPreventAutoRefresh(true);

    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
    }

    const updateVesselState = (prevVessels) =>
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
      });

    setVessels(updateVesselState);
    setFilteredVessels(updateVesselState);

    // Update checklist cache
    setVesselChecklistStats(prev => ({
      ...prev,
      [voyageId]: {
        status: checklistData.status || 'submitted',
        progress: checklistData.progress || 100
      }
    }));

    // Re-enable auto-refresh after delay
    autoRefreshTimeoutRef.current = setTimeout(() => {
      setPreventAutoRefresh(false);
      console.log('🔄 Auto-refresh re-enabled after checklist update');
    }, 5000);

  }, []);

  // Load data on component mount (stable dependencies)
  useEffect(() => {
    fetchVesselData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Performance: Stable PSC and port risk data fetching
  const fetchChartData = useCallback(async () => {
    // PSC data
    try {
      setLoadingPscData(true);
      const response = await fetch(apiEndpoints.PSC_API_URL);
      if (response.ok) {
        const data = await response.json();
        setPscDeficiencyData(data);
      }
    } catch (error) {
      console.warn('Failed to load PSC data:', error);
      setPscDeficiencyData([]);
    } finally {
      setLoadingPscData(false);
    }

    // Port vessel risk data
    try {
      setLoadingPortVesselRisk(true);
      const response = await fetch(`${apiEndpoints.BASE_API_URL}/api/port-vessel-risk`);
      if (response.ok) {
        const data = await response.json();
        setPortVesselRiskData(data);
      }
    } catch (error) {
      console.warn('Failed to load port vessel risk data:', error);
      setPortVesselRiskData([]);
    } finally {
      setLoadingPortVesselRisk(false);
    }
  }, [apiEndpoints.PSC_API_URL, apiEndpoints.BASE_API_URL]);

  // Load chart data in background with delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchChartData();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [fetchChartData]);

  // Performance: Stable filter options with memoization
  const filterOptions = useMemo(() => {
    if (allProcessedVessels.length === 0) {
      return {
        uniquePorts: [],
        uniqueStatuses: [],
        uniqueDocs: []
      };
    }

    return {
      uniquePorts: [...new Set(allProcessedVessels.map(v => v.arrival_port).filter(Boolean))],
      uniqueStatuses: [...new Set(allProcessedVessels.map(v => v.event_type).filter(Boolean))],
      uniqueDocs: [...new Set(allProcessedVessels.map(v => v.fleet_type).filter(Boolean))]
    };
  }, [allProcessedVessels]);

  // Performance: Initialize filter options once when data is ready
  useEffect(() => {
    if (filterOptions.uniquePorts.length > 0 && portFilters.length === 0) {
      setPortFilters(filterOptions.uniquePorts);
    }
    if (filterOptions.uniqueStatuses.length > 0 && statusFilters.length === 0) {
      setStatusFilters(filterOptions.uniqueStatuses);
    }
    if (filterOptions.uniqueDocs.length > 0 && docFilters.length === 0) {
      setDocFilters(filterOptions.uniqueDocs);
    }
  }, [filterOptions.uniquePorts, filterOptions.uniqueStatuses, filterOptions.uniqueDocs, portFilters.length, statusFilters.length, docFilters.length]);

  // Performance: Optimized voyage status filter application (stable dependencies)
  useEffect(() => {
    let baseVessels = [];

    switch (voyageStatusFilter) {
      case 'Current Voyages':
        baseVessels = activeVessels;
        break;
      case 'Past Voyages':
        baseVessels = inactiveVessels;
        break;
      default:
        baseVessels = allProcessedVessels;
        break;
    }

    const sortedData = sortVesselsData(baseVessels);
    setVessels(sortedData);
  }, [voyageStatusFilter, activeVessels, inactiveVessels, allProcessedVessels, sortVesselsData]);

  // Performance: Debounced filter application
  useEffect(() => {
    if (!vessels.length) {
      setFilteredVessels([]);
      return;
    }

    const applyFilters = () => {
      let results = [...vessels];

      // Apply port filters
      if (portFilters.length > 0 && portFilters.length < filterOptions.uniquePorts.length) {
        results = results.filter(vessel =>
          vessel.arrival_port && portFilters.includes(vessel.arrival_port)
        );
      }

      // Apply status filters
      if (statusFilters.length > 0 && statusFilters.length < filterOptions.uniqueStatuses.length) {
        results = results.filter(vessel =>
          vessel.event_type && statusFilters.includes(vessel.event_type)
        );
      }

      // Apply DOC filters
      if (docFilters.length > 0 && docFilters.length < filterOptions.uniqueDocs.length) {
        results = results.filter(vessel =>
          vessel.fleet_type && docFilters.includes(vessel.fleet_type)
        );
      }

      // Apply search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        results = results.filter(vessel =>
          (vessel.vessel_name && vessel.vessel_name.toLowerCase().includes(term)) ||
          (vessel.imo_no && vessel.imo_no.toString().includes(term)) ||
          (vessel.arrival_port && vessel.arrival_port.toLowerCase().includes(term))
        );
      }

      setFilteredVessels(results);
    };

    const timeoutId = setTimeout(applyFilters, 150);
    return () => clearTimeout(timeoutId);
  }, [vessels, searchTerm, portFilters, statusFilters, docFilters, filterOptions]);

  // Performance: Optimized defect action handlers with cache invalidation
  const handleCreateDefect = useCallback(async (defectData) => {
    try {
      if (!stableDefectsService) {
        throw new Error('User not authenticated');
      }

      const newDefect = await stableDefectsService.createDefect(defectData);

      // Clear cache for the affected vessel
      const vesselName = defectData.vessel_name;
      if (vesselName) {
        const cacheKey = `${vesselName}-${userId}`;
        delete defectsCacheRef.current[cacheKey];

        setVesselDefectCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[vesselName];
          return newCounts;
        });
      }

      loadDefectStats();
      return newDefect;
    } catch (error) {
      setError(`Failed to create defect: ${error.message}`);
      throw error;
    }
  }, [stableDefectsService, userId, loadDefectStats]);

  const handleUpdateDefect = useCallback(async (defectId, defectData) => {
    try {
      if (!stableDefectsService) {
        throw new Error('User not authenticated');
      }

      const updatedDefect = await stableDefectsService.updateDefect(defectId, defectData);

      // Clear cache for the affected vessel
      const vesselName = defectData.vessel_name || updatedDefect.vessel_name;
      if (vesselName) {
        const cacheKey = `${vesselName}-${userId}`;
        delete defectsCacheRef.current[cacheKey];

        setVesselDefectCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[vesselName];
          return newCounts;
        });
      }

      loadDefectStats();
      return updatedDefect;
    } catch (error) {
      setError(`Failed to update defect: ${error.message}`);
      throw error;
    }
  }, [stableDefectsService, userId, loadDefectStats]);

  const handleDeleteDefect = useCallback(async (defectId) => {
    try {
      if (!stableDefectsService) {
        throw new Error('User not authenticated');
      }

      const result = await stableDefectsService.deleteDefect(defectId);

      // Clear all defect caches
      defectsCacheRef.current = {};
      setVesselDefectCounts({});
      loadDefectStats();

      return result;
    } catch (error) {
      setError(`Failed to delete defect: ${error.message}`);
      throw error;
    }
  }, [stableDefectsService, loadDefectStats]);

  // Performance: Optimized modal handlers
  const handleOpenChecklist = useCallback((vessel) => {
    setSelectedVesselForChecklist(vessel);
    setChecklistModalOpen(true);
  }, []);

  const handleCloseChecklist = useCallback(() => {
    setChecklistModalOpen(false);
    setSelectedVesselForChecklist(null);
  }, []);

  const handleOpenComments = useCallback((vessel) => {
    setSelectedVessel(vessel);
    setCommentModalOpen(true);
  }, []);

  const handleCommentUpdated = useCallback((updatedVessel) => {
    const updateVessels = (prev) =>
      prev.map(vessel =>
        vessel.uniqueKey === updatedVessel.uniqueKey ? updatedVessel : vessel
      );

    setVessels(updateVessels);
    setFilteredVessels(updateVessels);
  }, []);

  // Performance: Optimized timeline filter handler (stable)
  const handleTimelineFilterChange = useCallback((timeRange) => {
    setTimelineFilter(timeRange);

    if (!timeRange) {
      // Reset timeline filter - let normal filtering take over
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let timeFilteredVessels = [...vessels];

    switch (timeRange) {
      case 'In Port':
        timeFilteredVessels = vessels.filter(v =>
          v.event_type && (
            v.event_type.toLowerCase().includes('port') ||
            v.event_type.toLowerCase().includes('berth')
          )
        );
        break;
      case 'Today':
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= today && v.etaDate < tomorrow
        );
        break;
      case 'This Week':
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= tomorrow && v.etaDate < nextWeek
        );
        break;
      case 'Later':
        timeFilteredVessels = vessels.filter(v =>
          v.etaDate && v.etaDate >= nextWeek
        );
        break;
      default:
        break;
    }

    setFilteredVessels(timeFilteredVessels);
  }, [vessels]);

  // Chart filter handlers (stable)
  const handleChartFilterChange = useCallback((port) => {
    setChartPortFilter(port);
    if (port) {
      setPortFilters([port]);
    } else {
      setPortFilters(filterOptions.uniquePorts);
    }
  }, [filterOptions.uniquePorts]);

  // Performance: Optimized vessel update handler (stable)
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

      const response = await fetch(`${apiEndpoints.ORIGINAL_VESSELS_API_URL.replace(/\/$/, '')}/update-fields`, {
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

      const updateVesselInState = (prevVessels) =>
        prevVessels.map(vessel =>
          vessel.id === updatedVessel.id
            ? {
              ...vessel,
              [fieldToUpdate]: responseData[fieldToUpdate]
            }
            : vessel
        );

      setVessels(updateVesselInState);
      setFilteredVessels(updateVesselInState);

      return true;
    } catch (error) {
      console.warn('Failed to update vessel:', error);
      return false;
    }
  }, [vessels, apiEndpoints.ORIGINAL_VESSELS_API_URL]);

  // Performance: Optimized override update handler (stable)
  const handleUpdateOverride = useCallback(async (vesselId, fieldName, newValue) => {
    const vesselToUpdate = vessels.find(v => v.id === vesselId);
    const vesselCommentId = vesselToUpdate?.id;

    if (!vesselCommentId) {
      setError('Could not update field: Missing necessary ID.');
      return;
    }

    if (!userId) {
      setError('User not authenticated. Please log in to update fields.');
      return;
    }

    const fieldKey = `${vesselId}-${fieldName}`;
    setSavingStates(prev => ({ ...prev, [fieldKey]: true }));

    try {
      const response = await fetch(apiEndpoints.VESSEL_OVERRIDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vessel_comment_id: vesselCommentId,
          field_name: fieldName,
          override_value: newValue,
          user_id: userId,
          original_value: vesselToUpdate[fieldName]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const updateVesselOverrides = (prevVessels) =>
        prevVessels.map(vessel =>
          vessel.id === vesselId
            ? {
              ...vessel,
              user_eta: result.user_eta,
              user_etb: result.user_etb,
              user_etd: result.user_etd,
            }
            : vessel
        );

      setVessels(updateVesselOverrides);
      setFilteredVessels(updateVesselOverrides);

    } catch (err) {
      setError(`Failed to update ${fieldName}: ${err.message || 'Network error'}`);
    } finally {
      setSavingStates(prev => ({ ...prev, [fieldKey]: false }));
    }
  }, [vessels, apiEndpoints.VESSEL_OVERRIDE_API_URL, userId]);

  // Performance: Optimized filter reset handler (stable)
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setChartPortFilter(null);
    setTimelineFilter(null);
    setPortFilters(filterOptions.uniquePorts);
    setStatusFilters(filterOptions.uniqueStatuses);
    setDocFilters(filterOptions.uniqueDocs);
    setVoyageStatusFilter('Current Voyages');
  }, [filterOptions.uniquePorts, filterOptions.uniqueStatuses, filterOptions.uniqueDocs]);

  // Performance: Optimized toggle filter items (stable)
  const toggleAllItems = useCallback((type) => {
    switch (type) {
      case 'ports':
        setPortFilters(portFilters.length === filterOptions.uniquePorts.length ? [] : filterOptions.uniquePorts);
        break;
      case 'statuses':
        setStatusFilters(statusFilters.length === filterOptions.uniqueStatuses.length ? [] : filterOptions.uniqueStatuses);
        break;
      case 'docs':
        setDocFilters(docFilters.length === filterOptions.uniqueDocs.length ? [] : filterOptions.uniqueDocs);
        break;
      default:
        break;
    }
  }, [filterOptions, portFilters.length, statusFilters.length, docFilters.length]);

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

  // Performance: Memoized computed values
  const vesselCount = vessels.length;
  const filteredCount = filteredVessels.length;

  // Performance: Memoized chart data (stable)
  const chartData = useMemo(() => {
    if (!vessels.length) return {
      vesselPscData: [],
      vesselsByPortData: [],
      arrivalTimelineData: []
    };

    // PSC data
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

    const vesselPscData = Object.values(deficiencyCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Port data
    const portCounts = {};
    vessels.forEach(vessel => {
      if (vessel.arrival_port) {
        portCounts[vessel.arrival_port] = (portCounts[vessel.arrival_port] || 0) + 1;
      }
    });

    const vesselsByPortData = Object.entries(portCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([port, count]) => ({
        port,
        vessels: count
      }));

    // Timeline data
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

    const arrivalTimelineData = [
      { range: 'In Port', vessels: inPort, color: '#2EE086' },
      { range: 'Today', vessels: arrivingToday, color: '#FF5252' },
      { range: 'This Week', vessels: arrivingThisWeek, color: '#FFD426' },
      { range: 'Later', vessels: arrivingLater, color: '#4DC3FF' }
    ];

    return {
      vesselPscData,
      vesselsByPortData,
      arrivalTimelineData
    };
  }, [vessels]);

  // Close all dropdowns when clicking elsewhere (stable)
  const closeAllDropdowns = useCallback(() => {
    setShowVoyageStatusDropdown(false);
    setShowPortDropdown(false);
    setShowStatusDropdown(false);
    setShowDocDropdown(false);
    setShowSearch(false);
  }, []);

  // Performance: Cleanup refs on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
      }
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      defectsCacheRef.current = {};
      checklistCacheRef.current = {};
      portDocsCacheRef.current = {};
    };
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

          {/* Performance: Show loading indicator for background processes */}
          {backgroundDataLoading && (
            <div className="background-loading-indicator">
              <RefreshCw size={12} className="spinning" />
              <span className="loading-text">{backgroundProgress.step}</span>
              {backgroundProgress.progress > 0 && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${backgroundProgress.progress}%` }}
                  />
                </div>
              )}
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
              <span className="filter-count">{portFilters.length}/{filterOptions.uniquePorts.length}</span>
            </button>

            {showPortDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Port</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('ports')}>
                    {portFilters.length === filterOptions.uniquePorts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {filterOptions.uniquePorts.map(port => (
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
              <span className="filter-count">{statusFilters.length}/{filterOptions.uniqueStatuses.length}</span>
            </button>

            {showStatusDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by Status</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('statuses')}>
                    {statusFilters.length === filterOptions.uniqueStatuses.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {filterOptions.uniqueStatuses.map(status => (
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
              <span className="filter-count">{docFilters.length}/{filterOptions.uniqueDocs.length}</span>
            </button>

            {showDocDropdown && (
              <div className="filter-dropdown-content">
                <div className="filter-dropdown-header">
                  <h4>Filter by DOC</h4>
                  <button className="select-all-btn" onClick={() => toggleAllItems('docs')}>
                    {docFilters.length === filterOptions.uniqueDocs.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-dropdown-items">
                  {filterOptions.uniqueDocs.map(doc => (
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
          <button
            className="control-btn refresh-btn"
            onClick={() => {
              // Reset auto-refresh prevention
              setPreventAutoRefresh(false);
              if (autoRefreshTimeoutRef.current) {
                clearTimeout(autoRefreshTimeoutRef.current);
              }

              // Clear all caches
              defectsCacheRef.current = {};
              checklistCacheRef.current = {};
              portDocsCacheRef.current = {};
              setVesselDefectCounts({});
              setVesselChecklistStats({});
              setVesselPortDocCounts({});

              // Refresh data
              fetchVesselData();
              loadDefectStats();
            }}
            title="Refresh data"
          >
            <RefreshCw size={14} className={loading || backgroundDataLoading ? "spinning" : ""} />
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

      {/* Performance: Status indicators */}
      {/* <div className="status-indicators">
        {loading && (
          <div className="status-indicator loading">
            <RefreshCw size={12} className="spinning" />
            <span>Loading active voyages...</span>
          </div>
        )}

        {activeVesselsLoaded && !loading && (
          <div className="status-indicator success">
            <CheckCircle size={12} />
            <span>Active voyages loaded ({activeVessels.length})</span>
          </div>
        )}

        {backgroundDataLoading && (
          <div className="status-indicator background">
            <RefreshCw size={12} className="spinning" />
            <span>{backgroundProgress.step} ({backgroundProgress.progress}%)</span>
          </div>
        )}
      </div> */}

      {/* Charts section */}
      <div className="dashboard-charts">
        <div className="dashboard-card-body">
          {loadingPscData ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              <span>Loading PSC data...</span>
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
          {loadingPscData ? (
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              <span>Loading deficiency codes...</span>
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

            {/* Performance: Enhanced VesselTable with lazy loading */}
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
              currentUser={stableCurrentUser}
              savingStates={savingStates}
              // Performance: Pass lazy loading functions
              getVesselDefectCount={getVesselDefectCount}
              getVesselChecklistStats={getVesselChecklistStats}
              getPortDocumentCount={getPortDocumentCount}
              vesselDefectCounts={vesselDefectCounts}
              vesselChecklistStats={vesselChecklistStats}
              vesselPortDocCounts={vesselPortDocCounts}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="data-source">
          Data sources: AIS, Noon Report, Vessel Emails, Equipment Defects
        </div>
        <div className="performance-info">
          {activeVesselsLoaded && (
            <span>✅ Active vessels: {activeVessels.length}</span>
          )}
          {allProcessedVessels.length > activeVessels.length && (
            <span>📊 Total vessels: {allProcessedVessels.length}</span>
          )}
          {backgroundDataLoading && (
            <span>🔄 Loading background data...</span>
          )}
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

      {/* Performance: Enhanced ChecklistModal with auto-refresh prevention */}
      <ChecklistModal
        isOpen={checklistModalOpen}
        onClose={handleCloseChecklist}
        vessel={selectedVesselForChecklist}
        onChecklistUpdate={handleChecklistUpdate}
        initialStatus={selectedVesselForChecklist?.computed_checklist_status || 'pending'}
        preventAutoRefresh={preventAutoRefresh}
      />

      {/* Performance: Add custom styles for performance indicators */}
      <style jsx>{`
        .status-indicators {
          display: flex;
          gap: 12px;
          padding: 8px 24px;
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .status-indicator.loading {
          background: rgba(59, 173, 229, 0.1);
          color: #3BADE5;
        }

        .status-indicator.success {
          background: rgba(46, 204, 113, 0.1);
          color: #2ECC71;
        }

        .status-indicator.background {
          background: rgba(241, 196, 15, 0.1);
          color: #F1C40F;
        }

        .background-loading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          background: rgba(59, 173, 229, 0.1);
          border-radius: 4px;
          font-size: 11px;
          color: #3BADE5;
        }

        .loading-text {
          font-weight: 500;
        }

        .progress-bar {
          width: 60px;
          height: 3px;
          background: rgba(59, 173, 229, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3BADE5;
          transition: width 0.3s ease;
        }

        .performance-info {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .performance-info span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chart-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 260px;
          gap: 12px;
          color: var(--text-muted);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-subtle);
          border-top: 2px solid var(--primary-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        /* Responsive adjustments for performance indicators */
        @media (max-width: 768px) {
          .status-indicators {
            padding: 6px 16px;
            flex-wrap: wrap;
          }

          .status-indicator {
            font-size: 11px;
            padding: 3px 6px;
          }

          .background-loading-indicator {
            font-size: 10px;
            padding: 3px 6px;
          }

          .progress-bar {
            width: 40px;
            height: 2px;
          }

          .performance-info {
            flex-direction: column;
            gap: 4px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

// PropTypes and default props
FleetDashboard.propTypes = {
  onOpenInstructions: PropTypes.func,
  fieldMappings: PropTypes.object.isRequired,
};

FleetDashboard.defaultProps = {
  onOpenInstructions: () => { },
};

export default FleetDashboard;