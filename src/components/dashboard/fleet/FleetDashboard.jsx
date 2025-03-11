// src/components/dashboard/fleet/FleetDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Calendar, Filter, Download, 
  RefreshCw, Map, Ship, AlertTriangle,
  Check, X
} from 'lucide-react';
import VesselTable from './VesselTable';
import ArrivalsByPortChart from './charts/ArrivalsByPortChart';
import ArrivalTimelineChart from './charts/ArrivalTimelineChart';
import './FleetStyles.css';
import CommentsModal from './CommentsModal';

const FleetDashboard = ({ onOpenInstructions, fieldMappings }) => {
  // State variables
  const [vessels, setVessels] = useState([]);
  const [filteredVessels, setFilteredVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New multi-select state variables
  const [portFilters, setPortFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [docFilters, setDocFilters] = useState([]);
  const [voyageStatusFilter, setVoyageStatusFilter] = useState('Current Voyages');
  
  // Manage dropdown visibility
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  // Add this with your other state variables
  const [showVoyageStatusDropdown, setShowVoyageStatusDropdown] = useState(false);
  const handleOpenComments = (vessel) => {
    setSelectedVessel(vessel);
    setCommentModalOpen(true);
  };

  // Function to handle comment updates
  const handleCommentUpdated = (updatedVessel) => {
    // Update the vessels array with the updated vessel
    setVessels(vessels.map(vessel => 
      vessel.imo_no === updatedVessel.imo_no ? updatedVessel : vessel
    ));
    
    // Also update the filtered vessels array
    setFilteredVessels(filteredVessels.map(vessel => 
      vessel.imo_no === updatedVessel.imo_no ? updatedVessel : vessel
    ));
  };

  // API endpoint
  const API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws/api/vessels';

  // Process and filter vessels data - memoized to improve performance
  const processVesselsData = useCallback((data) => {
    // Get the latest record for each IMO number based on dwh_load_date
    const latestVesselData = {};
    
    data.forEach(vessel => {
      const imoNo = vessel.imo_no;
      const loadDate = vessel.dwh_load_date ? new Date(vessel.dwh_load_date) : null;
      
      // Skip records with missing IMO or load date
      if (!imoNo || !loadDate) return;
      
      // If we haven't seen this IMO yet, or this record is newer
      if (!latestVesselData[imoNo] || 
          loadDate > new Date(latestVesselData[imoNo].dwh_load_date)) {
          latestVesselData[imoNo] = vessel;
      }
    });
    
    // Convert back to array
    const uniqueVessels = Object.values(latestVesselData);
    console.log('Filtered to latest records by IMO:', uniqueVessels.length);
    
    // Filter vessels to only include those in port or arriving today or in the future
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to beginning of today
    
    // Process and filter data
    return uniqueVessels
      .map(vessel => {
        // Parse eta as Date object if it's a string
        let etaDate = null;
        if (vessel.eta) {
          try {
            etaDate = new Date(vessel.eta);
          } catch (e) {
            console.warn('Invalid eta date format:', vessel.eta);
          }
        }
        
        // Calculate days to go based on current date and ETA
        let days_to_go = 0;
        if (etaDate) {
          const timeDiff = etaDate.getTime() - currentDate.getTime();
          days_to_go = Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24) * 10) / 10);
        } else if (vessel.DISTANCE_TO_GO) {
          // Fallback: calculate from distance if ETA isn't available
          days_to_go = parseFloat((vessel.DISTANCE_TO_GO / 350).toFixed(1));
        }
        
        return {
          ...vessel,
          etaDate,
          days_to_go,
          riskScore: Math.floor(Math.random() * 100)
        };
      })
      .filter(vessel => {
        // Keep if vessel is in port (event_type contains "port" or "Port")
        const isInPort = vessel.event_type && 
                        (vessel.event_type.toLowerCase().includes('port') || 
                        vessel.event_type.toLowerCase().includes('berth'));
        
        // Keep if vessel has a future arrival date (today or later)
        const hasFutureArrival = vessel.etaDate && vessel.etaDate >= currentDate;
        
        // Return true if either condition is met
        return isInPort || hasFutureArrival;
      });
  }, []);

  // Sort vessels data - memoized to improve performance
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

  // Fetch vessel data from API
  const fetchVessels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      let data = await response.json();
      console.log('Raw vessel data loaded:', data.length);
      
      // Process the data
      const processedData = processVesselsData(data);
      console.log('Filtered to in-port or future vessels:', processedData.length);
      
      // Sort the data
      const sortedData = sortVesselsData(processedData);
      
      // Initialize with filtered and sorted data
      setVessels(sortedData || []);
      setFilteredVessels(sortedData || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching vessel data:', err);
      setError('Failed to load vessel data. Please try again later.');
      // Set empty arrays on error to avoid undefined errors
      setVessels([]);
      setFilteredVessels([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL, processVesselsData, sortVesselsData]);

  // Load data on component mount
  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  // Initialize filter options after data is loaded
  useEffect(() => {
    if (vessels.length > 0) {
      // Initialize port filters
      const uniquePorts = [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
      setPortFilters(uniquePorts);
      
      // Initialize status filters
      const uniqueStatuses = [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
      setStatusFilters(uniqueStatuses);
      
      // Initialize DOC filters
      const uniqueDocs = [...new Set(vessels.map(v => v.office_doc).filter(Boolean))];
      setDocFilters(uniqueDocs);
    }
  }, [vessels]);

  // Apply filters when data or filter values change
  useEffect(() => {
    if (!vessels.length) {
      setFilteredVessels([]);
      return;
    }
    
    let results = [...vessels];
    
    // Apply voyage status filter
    if (voyageStatusFilter === 'Current Voyages') {
      results = results.filter(vessel => 
        vessel.status === 'Active' || vessel.status === undefined || vessel.status === null
      );
    } else if (voyageStatusFilter === 'Past Voyages') {
      results = results.filter(vessel => 
        vessel.status === 'Inactive'
      );
    }
    
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
    
    console.log('Filtered vessels:', results.length);
    setFilteredVessels(results);
  }, [vessels, searchTerm, portFilters, statusFilters, docFilters, voyageStatusFilter]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setPortFilters([...new Set(vessels.map(v => v.arrival_port).filter(Boolean))]);
    setStatusFilters([...new Set(vessels.map(v => v.event_type).filter(Boolean))]);
    setDocFilters([...new Set(vessels.map(v => v.office_doc).filter(Boolean))]);
    setVoyageStatusFilter('Current Voyages');
  }, [vessels]);

  // Toggle all items in a filter group
  const toggleAllItems = (type) => {
    switch(type) {
      case 'ports':
        const allPorts = [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
        setPortFilters(portFilters.length === allPorts.length ? [] : allPorts);
        break;
      case 'statuses':
        const allStatuses = [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
        setStatusFilters(statusFilters.length === allStatuses.length ? [] : allStatuses);
        break;
      case 'docs':
        const allDocs = [...new Set(vessels.map(v => v.office_doc).filter(Boolean))];
        setDocFilters(docFilters.length === allDocs.length ? [] : allDocs);
        break;
      default:
        break;
    }
  };

  // Toggle a specific filter item
  const toggleFilterItem = (type, item) => {
    switch(type) {
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

  // Get unique arrival ports for filter dropdown - memoized to improve performance
  const uniquePorts = useMemo(() => {
    if (!vessels.length) return [];
    
    return [...new Set(vessels.map(v => v.arrival_port).filter(Boolean))];
  }, [vessels]);

  // Get unique event types for filter dropdown - memoized to improve performance
  const uniqueStatuses = useMemo(() => {
    if (!vessels.length) return [];
    
    return [...new Set(vessels.map(v => v.event_type).filter(Boolean))];
  }, [vessels]);
  
  // Get unique DOC offices for filter dropdown - memoized to improve performance
  const uniqueDocs = useMemo(() => {
    if (!vessels.length) return [];
    
    return [...new Set(vessels.map(v => v.office_doc).filter(Boolean))];
  }, [vessels]);
    
  // Count high risk vessels - memoized to improve performance
  const highRiskCount = useMemo(() => 
    vessels.filter(v => v.riskScore > 70).length, 
    [vessels]
  );

  // Process data for Vessels by Port chart - memoized to improve performance
  const vesselsByPortData = useMemo(() => {
    if (!vessels.length) return [];
    
    const portCounts = {};
    vessels.forEach(vessel => {
      if (vessel.arrival_port) {
        portCounts[vessel.arrival_port] = (portCounts[vessel.arrival_port] || 0) + 1;
      }
    });
    
    // Convert to format expected by your ArrivalsByPortChart component
    return Object.entries(portCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([port, count]) => ({
        port,
        vessels: count
      }));
  }, [vessels]);

  // Process data for Arrival Timeline chart - memoized to improve performance
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
      { range: 'In Port', vessels: inPort, color: '#2ECC71' },
      { range: 'Today', vessels: arrivingToday, color: '#E74C3C' },
      { range: 'This Week', vessels: arrivingThisWeek, color: '#F1C40F' },
      { range: 'Later', vessels: arrivingLater, color: '#3BADE5' }
    ];
  }, [vessels]);

  // Get vessel count safely
  const vesselCount = vessels.length;
  const filteredCount = filteredVessels.length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Fleet Overview</h1>
          <div className="fleet-stats">
            <div className="fleet-count">
              <Ship size={16} />
              <span>{vesselCount} Vessels</span>
            </div>
            <div className="alert-count warning">
              <AlertTriangle size={16} />
              <span>{highRiskCount} High Risk</span>
            </div>
          </div>
        </div>
        
        <div className="dashboard-controls">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search vessels, IMO, ports..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="control-buttons">
            <button className="control-btn refresh-btn" onClick={fetchVessels} title="Refresh data">
              <RefreshCw size={16} className={loading ? "spinning" : ""} />
            </button>
            <button className="control-btn export-btn" title="Export data">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
      
           

      <div className="filter-bar">
        <div className="filter-label">
          <Filter size={16} />
        </div>
        
        <div className="filter-chips">
          {/* Voyage Status Filter Dropdown */}
          <div className="filter-dropdown-container">
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
          <div className="filter-dropdown-container">
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
          <div className="filter-dropdown-container">
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
          <div className="filter-dropdown-container">
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
            Reset
          </button>
        </div>
        
        <button className="map-toggle">
          <Map size={16} />
          <span>Map</span>
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="dashboard-charts">
        <div className="dashboard-card">
          <div className="dashboard-card-body">
            {loading ? (
              <div className="chart-loading">
                <div className="loading-spinner"></div>
                <span>Loading chart data...</span>
              </div>
            ) : (
              <ArrivalsByPortChart data={vesselsByPortData} />
            )}
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="dashboard-card-body">
            {loading ? (
              <div className="chart-loading">
                <div className="loading-spinner"></div>
                <span>Loading chart data...</span>
              </div>
            ) : (
              <ArrivalTimelineChart data={arrivalTimelineData} />
            )}
          </div>
        </div>
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
          <VesselTable 
            vessels={filteredVessels}
            onOpenRemarks={handleOpenComments}
            fieldMappings={fieldMappings}
          />
        )}
      </div>
      
      <div className="dashboard-footer">
        <div className="data-source">
          Data sources: AIS, Port Authorities, Weather API
        </div>
      </div>
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

export default FleetDashboard;