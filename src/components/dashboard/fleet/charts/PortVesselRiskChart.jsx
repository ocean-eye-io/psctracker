import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { FilterIcon, AlertTriangle } from 'lucide-react';

const PortRiskAnalysisChart = ({ data = [], onFilterChange, activeFilter }) => {
  const [activeView, setActiveView] = useState('port');
  const [timeFilter, setTimeFilter] = useState('1y'); // Default to 1 year
  const [processedData, setProcessedData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Process the data based on filters
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      console.log('Processing PSC data, total records:', data.length);
      
      // Check if data is available
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('No PSC data available');
        setProcessedData([]);
        setLoading(false);
        return;
      }

      // Normalize data to array format
      let dataArray = [];
      
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data.results && Array.isArray(data.results)) {
        dataArray = data.results;
      } else if (typeof data === 'object') {
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          dataArray = possibleArrays[0];
        } else {
          dataArray = [data]; // Treat as a single item
        }
      }
      
      if (dataArray.length === 0) {
        setProcessedData([]);
        setLoading(false);
        return;
      }

      // Apply time filter based on inspection_from_date (using ISO format)
      const currentDate = new Date();
      let filterDate = new Date();
      
      if (timeFilter === '3m') {
        filterDate.setMonth(currentDate.getMonth() - 3);
      } else if (timeFilter === '6m') {
        filterDate.setMonth(currentDate.getMonth() - 6);
      } else {
        filterDate.setFullYear(currentDate.getFullYear() - 1);
      }
      
      // Set filterDate to start of day for consistent comparison
      filterDate.setHours(0, 0, 0, 0);

      const filteredByTime = dataArray.filter(item => {
        if (!item.inspection_from_date) return true; // Include items without dates
        
        try {
          // Parse ISO format date
          const inspectionDate = new Date(item.inspection_from_date);
          return !isNaN(inspectionDate.getTime()) && inspectionDate >= filterDate;
        } catch (err) {
          console.error('Error parsing date:', item.inspection_from_date, err);
          return true; // Include items with dates that can't be parsed
        }
      });

      // Filter for Australia/New Zealand vessels
      const filteredByCountry = filteredByTime.filter(item => {
        const country = ((item.country || '') + '').toLowerCase();
        return country.includes('australia') || country.includes('new zealand') || 
               country.includes('aus') || country.includes('nz');
      });

      // Process based on active view
      if (activeView === 'port') {
        // Group by port_name
        const portMap = new Map();
        
        filteredByCountry.forEach(item => {
          const portName = item.port_name || 'Unknown';
          // Try to parse deficiency count from different possible fields
          const deficiencyCount = parseInt(item.deficiencycount || item.deficiency_count || item.total_deficiencies || 0, 10);
          const actionCode = item.actioncode;
          const vesselName = item.vessel_name || 'Unknown Vessel';
          
          if (!portMap.has(portName)) {
            portMap.set(portName, { 
              portName, 
              totalDeficiencies: 0, 
              detentions: 0, 
              vessels: new Set(), 
            });
          }
          
          const portData = portMap.get(portName);
          portData.totalDeficiencies += deficiencyCount;
          portData.vessels.add(vesselName);
          
          // Count detentions (action code 30)
          if (actionCode === 30 || actionCode === '30') {
            portData.detentions++;
          }
        });
        
        // Convert to array and calculate rates
        let portArray = Array.from(portMap.values()).map(port => ({
          name: port.portName,
          deficienciesPerVessel: port.vessels.size > 0 ? 
            (port.totalDeficiencies / port.vessels.size).toFixed(2) : 0,
          detentionRate: port.totalDeficiencies > 0 ? 
            ((port.detentions * 100) / port.totalDeficiencies).toFixed(2) : 0,
          vesselCount: port.vessels.size,
          totalDeficiencies: port.totalDeficiencies,
          detentions: port.detentions
        }));
        
        // First, separate ports with detentions from others
        const portsWithDetentions = portArray.filter(port => port.detentions > 0);
        const portsWithoutDetentions = portArray.filter(port => port.detentions === 0);
        
        // Sort ports with detentions by number of detentions (descending)
        portsWithDetentions.sort((a, b) => b.detentions - a.detentions);
        
        // Sort ports without detentions by deficiencies per vessel (descending)
        portsWithoutDetentions.sort((a, b) => parseFloat(b.deficienciesPerVessel) - parseFloat(a.deficienciesPerVessel));
        
        // If we have fewer than 10 ports with detentions, add ports without detentions to fill in
        let finalPortArray = [...portsWithDetentions];
        if (finalPortArray.length < 10) {
          // Add remaining ports without detentions to reach 10 total
          const remainingSlots = 10 - finalPortArray.length;
          finalPortArray = [
            ...finalPortArray,
            ...portsWithoutDetentions
              .filter(port => parseFloat(port.deficienciesPerVessel) > 0)
              .slice(0, remainingSlots)
          ];
        } else if (finalPortArray.length > 10) {
          // If we have more than 10 ports with detentions, just take the top 10
          finalPortArray = finalPortArray.slice(0, 10);
        }
        
        setProcessedData(finalPortArray);
      } else if (activeView === 'vessel') {
        // Group by vessel_type
        const vesselTypeMap = new Map();
        
        filteredByCountry.forEach(item => {
          const vesselType = item.vessel_type || 'Unknown';
          // Try to parse deficiency count from different possible fields
          const deficiencyCount = parseInt(item.deficiencycount || item.deficiency_count || item.total_deficiencies || 0, 10);
          const actionCode = item.actioncode;
          const vesselName = item.vessel_name || 'Unknown Vessel';
          
          if (!vesselTypeMap.has(vesselType)) {
            vesselTypeMap.set(vesselType, { 
              vesselType, 
              totalDeficiencies: 0, 
              detentions: 0, 
              vessels: new Set(), 
            });
          }
          
          const typeData = vesselTypeMap.get(vesselType);
          typeData.totalDeficiencies += deficiencyCount;
          typeData.vessels.add(vesselName);
          
          // Count detentions (action code 30)
          if (actionCode === 30 || actionCode === '30') {
            typeData.detentions++;
          }
        });
        
        // Convert to array and calculate rates
        let vesselTypeArray = Array.from(vesselTypeMap.values()).map(type => ({
          name: type.vesselType,
          deficienciesPerVessel: type.vessels.size > 0 ? 
            (type.totalDeficiencies / type.vessels.size).toFixed(2) : 0,
          detentionRate: type.totalDeficiencies > 0 ? 
            ((type.detentions * 100) / type.totalDeficiencies).toFixed(2) : 0,
          vesselCount: type.vessels.size,
          totalDeficiencies: type.totalDeficiencies,
          detentions: type.detentions
        }));
        
        // First, separate vessel types with detentions from others
        const typesWithDetentions = vesselTypeArray.filter(type => type.detentions > 0);
        const typesWithoutDetentions = vesselTypeArray.filter(type => type.detentions === 0);
        
        // Sort types with detentions by number of detentions (descending)
        typesWithDetentions.sort((a, b) => b.detentions - a.detentions);
        
        // Sort types without detentions by deficiencies per vessel (descending)
        typesWithoutDetentions.sort((a, b) => parseFloat(b.deficienciesPerVessel) - parseFloat(a.deficienciesPerVessel));
        
        // If we have fewer than 10 types with detentions, add types without detentions to fill in
        let finalTypeArray = [...typesWithDetentions];
        if (finalTypeArray.length < 10) {
          // Add remaining types without detentions to reach 10 total
          const remainingSlots = 10 - finalTypeArray.length;
          finalTypeArray = [
            ...finalTypeArray,
            ...typesWithoutDetentions
              .filter(type => parseFloat(type.deficienciesPerVessel) > 0)
              .slice(0, remainingSlots)
          ];
        } else if (finalTypeArray.length > 10) {
          // If we have more than 10 types with detentions, just take the top 10
          finalTypeArray = finalTypeArray.slice(0, 10);
        }
        
        setProcessedData(finalTypeArray);
      } else {
        setProcessedData([]);
      }
    } catch (err) {
      console.error('Error processing chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData([]);
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter]);

  // Function to calculate Y-axis domain for detention rate
  const getDetentionRateDomain = useMemo(() => {
    if (!processedData.length) return [0, 100];
    
    // Find max detention rate and add 20% padding
    const maxRate = Math.max(...processedData.map(item => parseFloat(item.detentionRate) || 0));
    return [0, Math.min(Math.ceil(maxRate * 1.2), 100)];
  }, [processedData]);

  // Function to calculate Y-axis domain for deficiencies per vessel
  const getDeficienciesDomain = useMemo(() => {
    if (!processedData.length) return [0, 10];
    
    // Find max deficiencies per vessel and add 20% padding
    const maxDeficiencies = Math.max(...processedData.map(item => parseFloat(item.deficienciesPerVessel) || 0));
    return [0, Math.ceil(maxDeficiencies * 1.2)];
  }, [processedData]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{item.name}</p>
          <p className="tooltip-value">Deficiencies/Vessel: {item.deficienciesPerVessel}</p>
          <p className="tooltip-value">Detention Rate: {item.detentionRate}%</p>
          <p className="tooltip-value">Vessel Count: {item.vesselCount}</p>
          <p className="tooltip-value">Total Deficiencies: {item.totalDeficiencies}</p>
          <p className="tooltip-value">Detentions: {item.detentions}</p>
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };

  const handleMouseMove = (e) => {
    if (e?.activeTooltipIndex !== undefined) {
      setHoveredBar(e.activeTooltipIndex);
    } else {
      setHoveredBar(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          {activeView === 'port' ? 'Port Risk Analysis' : 'Vessel Type Risk Analysis'}
          <span className="chart-title-highlight"></span>
        </h3>
        <div className="chart-toggle">
          <button 
            className={activeView === 'port' ? 'active' : ''}
            onClick={() => setActiveView('port')}
          >
            By Port
          </button>
          <button 
            className={activeView === 'vessel' ? 'active' : ''}
            onClick={() => setActiveView('vessel')}
          >
            By Vessel Type
          </button>
          
          {/* Time filter buttons */}
          <div className="chart-filter" style={{ marginLeft: '10px', display: 'flex', gap: '4px' }}>
            <button 
              className={`chart-action-btn ${timeFilter === '3m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('3m')}
              style={{ padding: '2px 8px' }}
            >
              3M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '6m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('6m')}
              style={{ padding: '2px 8px' }}
            >
              6M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '1y' ? 'active' : ''}`}
              onClick={() => setTimeFilter('1y')}
              style={{ padding: '2px 8px' }}
            >
              1Y
            </button>
          </div>
        </div>
      </div>
      
      <div className="chart-wrapper" style={{ position: 'relative', height: '300px' }}>
        {loading ? (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <span>Loading risk data...</span>
          </div>
        ) : error ? (
          <div className="chart-no-data">
            <AlertTriangle size={16} color="#FF5252" style={{ marginBottom: '8px' }} />
            <p>Error loading risk data</p>
            <p style={{ fontSize: '10px', marginTop: '6px' }}>{error}</p>
          </div>
        ) : processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              margin={{ top: 10, right: 0, left: 0, bottom: 40 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              barGap={8}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(244,244,244,0.05)" 
                vertical={false}
              />
              <XAxis 
                dataKey="name"
                tick={{ fill: '#f4f4f4', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#f4f4f4', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                tickLine={false}
                domain={getDeficienciesDomain}
                label={{ 
                  value: 'Deficiencies/Vessel', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#28E0B0', fontSize: 12 },
                  offset: 25,
                  dy: 50
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#f4f4f4', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                tickLine={false}
                domain={getDetentionRateDomain}
                label={{ 
                  value: 'Detention Rate (%)', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { fill: '#FF5252', fontSize: 12 },
                  offset: 15,
                  dy: 50
                }}
                unit="%"
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} 
              />
              // Modify the Legend component styling
              <Legend 
                verticalAlign="top"
                align="center"
                height={36} // Give it proper height instead of 0
                iconSize={10}
                iconType="circle"
                wrapperStyle={{
                    paddingTop: 0,
                    paddingBottom: 0, // Remove padding bottom
                    fontSize: 11,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px',
                    width: '100%',
                    position: 'absolute',
                    top: -10, // Move it slightly up
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'transparent',
                    border: 'none' // Explicitly remove border
                }}
              />
              <Bar 
                yAxisId="left"
                dataKey="deficienciesPerVessel" 
                name="Deficiencies/Vessel"
                fill="#28E0B0" 
                barSize={16}
                radius={[3, 3, 0, 0]}
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-deficiency-${index}`}
                    fill="#28E0B0"
                    style={{
                      opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                      transition: 'opacity 0.3s'
                    }}
                  />
                ))}
              </Bar>
              <Bar 
                yAxisId="right"
                dataKey="detentionRate" 
                name="Detention Rate (%)"
                fill="#FF5252" 
                barSize={16}
                radius={[3, 3, 0, 0]}
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-detention-${index}`}
                    fill="#FF5252"
                    style={{
                      opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                      transition: 'opacity 0.3s'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data">
            <p>No {activeView} risk data available for the selected filters</p>
            <p style={{ fontSize: '10px', marginTop: '6px' }}>
              <FilterIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Try adjusting your filters or check data availability
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortRiskAnalysisChart;