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
  const [uniqueColorMapping, setUniqueColorMapping] = useState({});

  // Maritime theme color palette matching the FleetWatch application (from screenshot)
  const colorPalette = useMemo(() => ({
    // Fixed colors for known codes based on your UI
    '30': '#FF5252',  // Detentions (Code 30) - Red
    '10': '#F39C12',  // Orange
    '16': '#E74C3C',  // Darker Red
    '17': '#9B59B6',  // Purple
    '18': '#CB7960',  // Brown-ish
    '99': '#D45FCA',  // Pink
    '17/10': '#28E0B0', // Teal
    '15': '#2ECC71',  // Green
    'Unknown': '#9370DB', // Medium Purple
    '16/10': '#A9A9A9', // Gray
    // Additional colors for other codes
    'other': [
      '#4DC3FF', '#3498DB', '#1F77B4', '#17BECF', 
      '#2CA02C', '#82E0AA', '#F1C40F', '#F5B041',
      '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', 
      '#AED6F1', '#A569BD', '#A3E4D7', '#F8C471'
    ]
  }), []);

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

      // Track all unique action codes across all ports
      const allActionCodes = new Set();
      
      if (activeView === 'port') {
        // Group by port and reference code
        const portCodeMap = new Map();
        
        filteredByCountry.forEach(item => {
          const portName = item.port_name || 'Unknown';
          const actionCode = item.actioncode || item.reference_code_1 || 'Unknown';
          const deficiencyCount = parseInt(item.deficiencycount || item.deficiency_count || item.count || 1, 10);
          
          // Track all action codes
          allActionCodes.add(actionCode.toString());
          
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
          
          // Track all action codes
          allActionCodes.add(actionCode.toString());
          
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
          code: item.code.toString(),
          count: item.count,
          isCode30: item.code === 30 || item.code === '30'
        }));
        
        // Sort by count (descending)
        codeArray.sort((a, b) => b.count - a.count);
        
        // Take top 10 codes
        setProcessedData(codeArray.slice(0, 10));
      }
      
      // Create a color mapping for all action codes
      // First assign fixed colors from our palette
      const newColorMapping = {};
      let otherColorIndex = 0;
      
      allActionCodes.forEach(code => {
        if (colorPalette[code]) {
          // Use pre-defined color if available
          newColorMapping[code] = colorPalette[code];
        } else {
          // Otherwise use a color from the 'other' array
          newColorMapping[code] = colorPalette.other[otherColorIndex % colorPalette.other.length];
          otherColorIndex++;
        }
      });
      
      setUniqueColorMapping(newColorMapping);
      
    } catch (err) {
      console.error('Error processing deficiency code chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData([]);
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter, colorPalette]);

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
    
    // Sort keys to ensure consistent order
    return Array.from(keys).sort((a, b) => {
      const aCode = a.replace('code_', '');
      const bCode = b.replace('code_', '');
      
      // Try to sort numerically if possible
      const aNum = parseInt(aCode, 10);
      const bNum = parseInt(bCode, 10);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      
      // Fall back to string comparison
      return aCode.localeCompare(bCode);
    });
  }, [processedData, activeView]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      if (activeView === 'port') {
        // Port view tooltip
        const portData = payload[0].payload;
        
        return (
          <div className="custom-tooltip" style={{ 
            background: '#0e1e2f', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '4px',
            padding: '8px 12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            fontSize: '12px',
            color: '#c0c0c0'
          }}>
            <p className="tooltip-label" style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#fff' }}>{portData.name}</p>
            <p className="tooltip-value" style={{ margin: '3px 0', color: '#FF5252' }}>Detentions (Code 30): {portData.code30Count}</p>
            <p className="tooltip-value" style={{ margin: '3px 0' }}>Total Deficiencies: {portData.totalDeficiencies}</p>
            <p className="tooltip-value" style={{ margin: '3px 0' }}>Vessel Count: {portData.vesselCount}</p>
            <div className="tooltip-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }}></div>
            <p className="tooltip-subtitle" style={{ margin: '5px 0', fontWeight: 'bold' }}>Deficiency Codes:</p>
            {payload.map((entry, index) => {
              if (entry.dataKey.startsWith('code_')) {
                const code = entry.dataKey.replace('code_', '');
                return (
                  <p key={index} className="tooltip-value" style={{ margin: '3px 0', color: entry.color }}>
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
          <div className="custom-tooltip" style={{ 
            background: '#0e1e2f', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '4px',
            padding: '8px 12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            fontSize: '12px',
            color: '#c0c0c0'
          }}>
            <p className="tooltip-label" style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#fff' }}>{item.name}</p>
            <p className="tooltip-value" style={{ margin: '3px 0' }}>Count: {item.count}</p>
            {item.isCode30 && (
              <p className="tooltip-value" style={{ margin: '3px 0', color: '#FF5252' }}>
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

  // Get color for a given code
  const getCodeColor = (codeKey) => {
    const codeNumber = codeKey.replace('code_', '');
    
    // Look up in our unique color mapping
    return uniqueColorMapping[codeNumber] || '#CCCCCC'; // Fallback to gray if not found
  };

  return (
    <div className="chart-card" style={{ background: '#0a1725', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
      <div className="chart-header" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="chart-title" style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
          {activeView === 'port' ? 'Port Deficiency Analysis' : 'Overall Deficiency Codes'}
          <span className="chart-title-highlight" style={{ background: '#4DC3FF', width: '25px', height: '2px', display: 'block', marginTop: '4px' }}></span>
        </h3>
        <div className="chart-toggle" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className={activeView === 'port' ? 'active' : ''}
            onClick={() => setActiveView('port')}
            style={{ 
              background: activeView === 'port' ? '#1F618D' : 'transparent', 
              border: '1px solid #3498DB',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            By Port
          </button>
          <button 
            className={activeView === 'overall' ? 'active' : ''}
            onClick={() => setActiveView('overall')}
            style={{ 
              background: activeView === 'overall' ? '#1F618D' : 'transparent', 
              border: '1px solid #3498DB',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              marginLeft: '8px',
              cursor: 'pointer'
            }}
          >
            By Code
          </button>
          
          {/* Time filter buttons */}
          <div className="chart-filter" style={{ marginLeft: '10px', display: 'flex', gap: '4px' }}>
            <button 
              className={`chart-action-btn ${timeFilter === '3m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('3m')}
              style={{ 
                padding: '2px 8px', 
                background: timeFilter === '3m' ? '#1F618D' : 'transparent', 
                border: '1px solid #3498DB',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              3M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '6m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('6m')}
              style={{ 
                padding: '2px 8px', 
                background: timeFilter === '6m' ? '#1F618D' : 'transparent', 
                border: '1px solid #3498DB',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              6M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '1y' ? 'active' : ''}`}
              onClick={() => setTimeFilter('1y')}
              style={{ 
                padding: '2px 8px', 
                background: timeFilter === '1y' ? '#1F618D' : 'transparent', 
                border: '1px solid #3498DB',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              1Y
            </button>
          </div>
        </div>
      </div>
      
      <div className="chart-wrapper" style={{ position: 'relative', height: '300px', background: '#0a1725', borderRadius: '8px', padding: '10px' }}>
        {loading ? (
          <div className="chart-loading" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            height: '100%',
            color: '#c0c0c0'
          }}>
            <div className="loading-spinner" style={{
              width: '28px',
              height: '28px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#4DC3FF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '10px'
            }}></div>
            <span>Loading deficiency data...</span>
          </div>
        ) : error ? (
          <div className="chart-no-data" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            height: '100%',
            color: '#a0a0a0',
            background: '#0a1725',
            borderRadius: '6px'
          }}>
            <AlertTriangle size={16} color="#FF5252" style={{ marginBottom: '8px' }} />
            <p style={{ margin: '6px 0', fontSize: '14px', color: '#c0c0c0' }}>Error loading deficiency data</p>
            <p style={{ fontSize: '10px', marginTop: '6px', color: '#a0a0a0' }}>{error}</p>
          </div>
        ) : processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {activeView === 'port' ? (
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name"
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={45}
                  interval={0}
                  tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                />
                <YAxis
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  label={{ 
                    value: 'Number of Deficiencies', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#4DC3FF', fontSize: 12 },
                    offset: 15,
                    dy: 50
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend 
                  verticalAlign="top"
                  align="center"
                  height={36}
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: 0,
                    fontSize: 10,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    position: 'absolute',
                    top: -2,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'transparent',
                    border: 'none',
                    color: '#c0c0c0',
                    flexWrap: 'wrap',
                    lineHeight: '14px'
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
                {codeKeys.map((key) => {
                  // Get color from our mapping
                  const barColor = getCodeColor(key);
                  
                  return (
                    <Bar 
                      key={key}
                      dataKey={key} 
                      name={`Code ${key.replace('code_', '')}`}
                      stackId="codes"
                      fill={barColor}
                      barSize={16}
                      radius={[0, 0, 0, 0]}
                    >
                      {/* Apply hover effect to each cell */}
                      {processedData.map((entry, index) => (
                        <Cell
                          key={`cell-${key}-${index}`}
                          fill={barColor}
                          style={{
                            opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                            transition: 'opacity 0.3s'
                          }}
                        />
                      ))}
                    </Bar>
                  );
                })}
              </BarChart>
            ) : (
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name"
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={45}
                  interval={0}
                  tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                />
                <YAxis
                  tick={{ fill: '#f4f4f4', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                  label={{ 
                    value: 'Number of Deficiencies', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#4DC3FF', fontSize: 12 },
                    offset: 15,
                    dy: 60
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar 
                  dataKey="count" 
                  name="Deficiency Count"
                  barSize={20}
                  radius={[3, 3, 0, 0]}
                >
                  {processedData.map((entry, index) => {
                    const barColor = entry.isCode30 
                      ? '#FF5252' 
                      : uniqueColorMapping[entry.code] || '#CCCCCC';
                      
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={barColor}
                        style={{
                          opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                          transition: 'opacity 0.3s'
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            height: '100%',
            color: '#a0a0a0',
            background: '#0a1725',
            borderRadius: '6px'
          }}>
            <p style={{ margin: '10px 0', fontSize: '14px', color: '#c0c0c0' }}>No deficiency data available for the selected filters</p>
            <p style={{ fontSize: '10px', marginTop: '6px', color: '#a0a0a0' }}>
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