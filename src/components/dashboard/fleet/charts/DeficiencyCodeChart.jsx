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

const DeficiencyCodeChart = ({ data = [] }) => {
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
      console.log('Processing deficiency code data, total records:', data.length);
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('No deficiency data available');
        setProcessedData([]);
        setLoading(false);
        return;
      }

      // Normalize data to array format
      let dataArray = Array.isArray(data) ? data : [];
      if (!Array.isArray(data) && data.results && Array.isArray(data.results)) {
        dataArray = data.results;
      }
      
      if (dataArray.length === 0) {
        setProcessedData([]);
        setLoading(false);
        return;
      }

      // Apply time filter
      const currentDate = new Date();
      let filterDate = new Date();
      
      if (timeFilter === '3m') {
        filterDate.setMonth(currentDate.getMonth() - 3);
      } else if (timeFilter === '6m') {
        filterDate.setMonth(currentDate.getMonth() - 6);
      } else {
        filterDate.setFullYear(currentDate.getFullYear() - 1);
      }
      
      filterDate.setHours(0, 0, 0, 0);

      const filteredByTime = dataArray.filter(item => {
        if (!item.inspection_from_date) return true;
        
        try {
          const inspectionDate = new Date(item.inspection_from_date);
          return !isNaN(inspectionDate.getTime()) && inspectionDate >= filterDate;
        } catch (err) {
          console.error('Error parsing date:', item.inspection_from_date, err);
          return true;
        }
      });

      // Filter for Australia/New Zealand vessels
      const filteredByCountry = filteredByTime.filter(item => {
        const country = ((item.country || '') + '').toLowerCase();
        return country.includes('australia') || country.includes('new zealand') || 
               country.includes('aus') || country.includes('nz');
      });

      if (activeView === 'port') {
        // Group by port and reference code
        const portCodeMap = new Map();
        
        filteredByCountry.forEach(item => {
          const portName = item.port_name || 'Unknown';
          const actionCode = item.actioncode || item.reference_code_1 || 'Unknown';
          const deficiencyCount = parseInt(item.deficiencycount || item.deficiency_count || item.count || 1, 10);
          
          if (!portCodeMap.has(portName)) {
            portCodeMap.set(portName, {
              portName,
              totalDeficiencies: 0,
              code30Count: 0,
              codeCounts: {},
              vesselCount: new Set()
            });
          }
          
          const portData = portCodeMap.get(portName);
          portData.totalDeficiencies += deficiencyCount;
          
          if (actionCode === 30 || actionCode === '30') {
            portData.code30Count += deficiencyCount;
          }
          
          // Track counts by code
          if (!portData.codeCounts[actionCode]) {
            portData.codeCounts[actionCode] = 0;
          }
          portData.codeCounts[actionCode] += deficiencyCount;
          
          // Track unique vessels
          if (item.vessel_name) {
            portData.vesselCount.add(item.vessel_name);
          }
        });
        
        // Convert to array format for chart
        let portArray = Array.from(portCodeMap.values()).map(port => {
          // Convert code counts to format needed for stacked bars
          const codeData = {};
          Object.entries(port.codeCounts).forEach(([code, count]) => {
            if (code !== '30' && code !== 30) { // Exclude code 30 as it's shown separately
              codeData[`code_${code}`] = count;
            }
          });
          
          return {
            name: port.portName,
            code30Count: port.code30Count,
            totalDeficiencies: port.totalDeficiencies,
            vesselCount: port.vesselCount.size,
            ...codeData
          };
        });
        
        // First prioritize ports with code 30 (detentions)
        portArray.sort((a, b) => {
          // First sort by code 30 count (descending)
          if (b.code30Count !== a.code30Count) {
            return b.code30Count - a.code30Count;
          }
          // Then by total deficiencies (descending)
          return b.totalDeficiencies - a.totalDeficiencies;
        });
        
        // Take top 10 ports
        setProcessedData(portArray.slice(0, 10));
      } else {
        // Overall view - group by code regardless of port
        const codeMap = new Map();
        
        filteredByCountry.forEach(item => {
          const actionCode = item.actioncode || item.reference_code_1 || 'Unknown';
          const deficiencyCount = parseInt(item.deficiencycount || item.deficiency_count || item.count || 1, 10);
          
          if (!codeMap.has(actionCode)) {
            codeMap.set(actionCode, {
              code: actionCode,
              count: 0
            });
          }
          
          codeMap.get(actionCode).count += deficiencyCount;
        });
        
        // Convert to array and sort by count
        let codeArray = Array.from(codeMap.values()).map(item => ({
          name: `Code ${item.code}`,
          count: item.count,
          isCode30: item.code === 30 || item.code === '30'
        }));
        
        // Sort by count (descending)
        codeArray.sort((a, b) => b.count - a.count);
        
        // Take top 10 codes
        setProcessedData(codeArray.slice(0, 10));
      }
    } catch (err) {
      console.error('Error processing deficiency code chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData([]);
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter]);

  // Get all unique code keys for stacked bars (port view)
  const codeKeys = useMemo(() => {
    if (activeView !== 'port' || !processedData.length) return [];
    
    const keys = new Set();
    processedData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key.startsWith('code_') && key !== 'code_30') {
          keys.add(key);
        }
      });
    });
    
    return Array.from(keys);
  }, [processedData, activeView]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      if (activeView === 'port') {
        // Port view tooltip
        const portData = payload[0].payload;
        
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{portData.name}</p>
            <p className="tooltip-value">Detentions (Code 30): {portData.code30Count}</p>
            <p className="tooltip-value">Total Deficiencies: {portData.totalDeficiencies}</p>
            <p className="tooltip-value">Vessel Count: {portData.vesselCount}</p>
            <div className="tooltip-divider"></div>
            <p className="tooltip-subtitle">Deficiency Codes:</p>
            {payload.map((entry, index) => {
              if (entry.dataKey.startsWith('code_')) {
                const code = entry.dataKey.replace('code_', '');
                return (
                  <p key={index} className="tooltip-value" style={{ color: entry.color }}>
                    Code {code}: {entry.value}
                  </p>
                );
              }
              return null;
            })}
          </div>
        );
      } else {
        // Overall view tooltip
        const item = payload[0].payload;
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{item.name}</p>
            <p className="tooltip-value">Count: {item.count}</p>
            {item.isCode30 && (
              <p className="tooltip-value" style={{ color: '#FF5252' }}>
                (Detention Code)
              </p>
            )}
          </div>
        );
      }
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

  // Generate colors for stacked bars
  const getBarColor = (index) => {
    const colors = [
      '#4ECDC4', '#FF6B6B', '#FFD166', '#06D6A0', '#118AB2', 
      '#073B4C', '#7B68EE', '#9370DB', '#BA55D3', '#C71585'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          {activeView === 'port' ? 'Port Deficiency Analysis' : 'Overall Deficiency Codes'}
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
            className={activeView === 'overall' ? 'active' : ''}
            onClick={() => setActiveView('overall')}
          >
            By Code
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
            <span>Loading deficiency data...</span>
          </div>
        ) : error ? (
          <div className="chart-no-data">
            <AlertTriangle size={16} color="#FF5252" style={{ marginBottom: '8px' }} />
            <p>Error loading deficiency data</p>
            <p style={{ fontSize: '10px', marginTop: '6px' }}>{error}</p>
          </div>
        ) : processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {activeView === 'port' ? (
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,244,244,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name"
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={20}
                />
                <YAxis
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                  tickLine={false}
                  label={{ 
                    value: 'Number of Deficiencies', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#f4f4f4', fontSize: 12 },
                    offset: 15,
                    dy: 50
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
                <Legend 
                  verticalAlign="top"
                  align="center"
                  height={36}
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: 0,
                    fontSize: 11,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px',
                    width: '100%',
                    position: 'absolute',
                    top: 1,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'transparent',
                    border: 'none'
                  }}
                />
                {/* Detention bar (Code 30) */}
                <Bar 
                  dataKey="code30Count" 
                  name="Detentions (Code 30)"
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
                {/* Other code bars (stacked) */}
                {codeKeys.map((key, index) => (
                  <Bar 
                    key={key}
                    dataKey={key} 
                    name={`Code ${key.replace('code_', '')}`}
                    stackId="codes"
                    fill={getBarColor(index)}
                    barSize={16}
                    radius={index === codeKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,244,244,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name"
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={20}
                />
                <YAxis
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
                  tickLine={false}
                  label={{ 
                    value: 'Number of Deficiencies', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#f4f4f4', fontSize: 12 },
                    offset: 15,
                    dy: 60
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  name="Deficiency Count"
                  barSize={20}
                  radius={[3, 3, 0, 0]}
                >
                  {processedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCode30 ? '#FF5252' : '#28E0B0'}
                      style={{
                        opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                        transition: 'opacity 0.3s'
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data">
            <p>No deficiency data available for the selected filters</p>
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

export default DeficiencyCodeChart;