import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { FilterIcon, AlertTriangle } from 'lucide-react';
// Assuming you have a similar CSS file or will add relevant styles
import '../../../common/charts/styles/chartStyles.css'; // Or your specific path

// Consistent color palette
const ACTION_CODE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#2AB7CA',
  '#F0B67F', '#FE5F55', '#00A8E8', '#007EA7', '#95E06C',
  '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD',
  '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'
];
const CODE_30_COLOR = '#D32F2F'; // A distinct, alarming color
const NIL_DEFICIENCY_COLOR = '#7986CB'; // Distinct color for Nil Deficiency
const CODE_17_COLOR = '#FFC107'; // Distinct color for Code 17

const DeficiencyCodeChart = ({ data = [] }) => {
  const [activeView, setActiveView] = useState('port'); // 'port' or 'overall'
  const [timeFilter, setTimeFilter] = useState('1y');
  const [processedData, setProcessedData] = useState({ type: 'port', data: [], keys: [], colorMap: {} });
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxRowCount, setMaxRowCount] = useState(0);

  // Custom styles for the filters
  const filterStyles = {
    filterContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    viewButton: {
      backgroundColor: 'rgba(59, 173, 229, 0.15)',
      color: '#f4f4f4',
      border: '1px solid rgba(59, 173, 229, 0.2)',
      padding: '4px 10px',
      fontSize: '11px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    activeViewButton: {
      backgroundColor: 'rgba(59, 173, 229, 0.7)',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    },
    timeButton: {
      backgroundColor: 'rgba(59, 173, 229, 0.15)',
      color: '#f4f4f4',
      border: '1px solid rgba(59, 173, 229, 0.2)',
      padding: '4px 7px',
      fontSize: '11px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '26px',
      textAlign: 'center',
    },
    activeTimeButton: {
      backgroundColor: 'rgba(59, 173, 229, 0.7)',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data && data.results && Array.isArray(data.results)) {
        dataArray = data.results;
      } else if (typeof data === 'object' && data !== null) {
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          dataArray = possibleArrays.flat();
        } else {
           dataArray = [data].filter(item => typeof item === 'object' && item !== null);
        }
      }

      if (dataArray.length === 0) {
        setProcessedData({ type: activeView, data: [], keys: [], colorMap: {} });
        setMaxRowCount(0);
        setLoading(false);
        return;
      }

      const currentDate = new Date();
      let filterDate = new Date();
      if (timeFilter === '3m') filterDate.setMonth(currentDate.getMonth() - 3);
      else if (timeFilter === '6m') filterDate.setMonth(currentDate.getMonth() - 6);
      else filterDate.setFullYear(currentDate.getFullYear() - 1);
      filterDate.setHours(0, 0, 0, 0);

      const filteredByTime = dataArray.filter(item => {
        if (!item || !item.inspection_from_date) return true;
        try {
          const inspectionDate = new Date(item.inspection_from_date);
          return !isNaN(inspectionDate.getTime()) && inspectionDate >= filterDate;
        } catch (err) {
          console.warn('Error parsing date for filtering:', item.inspection_from_date, err);
          return true;
        }
      });

      // Kept country filter based on previous context. Remove if not needed.
      const filteredByCountry = filteredByTime.filter(item => {
        if(!item || typeof item.country !== 'string') return false;
        const country = item.country.toLowerCase();
        return country.includes('australia') || country.includes('new zealand') ||
               country.includes('aus') || country.includes('nz');
      });

      let newMaxCount = 0;
      const newColorMap = {};

      // Add more detailed logging to troubleshoot nil deficiency detection
      console.log('Data sample for nil deficiency checking:');
      const sampleItems = filteredByCountry.slice(0, 5);
      sampleItems.forEach((item, index) => {
        const actionCode = item.actioncode || item.reference_code_1;
        console.log(`Sample item ${index}:`, {
          actioncode: item.actioncode,
          reference_code_1: item.reference_code_1,
          actionCode: actionCode,
          typeofActionCode: typeof actionCode,
          valueCheck: {
            isNull: actionCode === null,
            isUndefined: actionCode === undefined,
            isEmpty: actionCode === "",
            isEmptyTrimmed: String(actionCode || "").trim() === "",
            isNilString: String(actionCode || "").toLowerCase().trim() === "nil",
            isNaN: isNaN(actionCode)
          }
        });
      });
      
      if (activeView === 'port') {
        const portCodeMap = new Map();
        // Process all data, treating null/empty action codes as "Nil Deficiency"
        filteredByCountry.forEach(item => {
          if (!item) return;
          const portName = item.port_name || 'Unknown Port';
          
          if (!portCodeMap.has(portName)) {
            portCodeMap.set(portName, {
              portName,
              code30: 0,
              code17: 0,
              nilDeficiency: 0,
              otherCodeRowCounts: {},
              totalDeficiencies: 0,
              vesselSet: new Set(), // For unique vessel names (all vessels)
            });
          }

          const portData = portCodeMap.get(portName);
          
          // Determine action code - check if it's null, undefined, or empty string
          const actionCode = item.actioncode || item.reference_code_1;
          
          // Always count the vessel if it exists
          if (item.vessel_name) {
            portData.vesselSet.add(item.vessel_name);
          }
          
          // Check for nil deficiency (null, undefined, or empty action code)
          if (!actionCode || actionCode.trim() === '') {
            portData.nilDeficiency += 1;
          } else {
            // Not nil deficiency, process the code
            const processedActionCode = String(actionCode).trim();
            
            if (processedActionCode === '30') {
              portData.code30 += 1;
              portData.totalDeficiencies += 1;
            } else if (processedActionCode === '17') {
              portData.code17 += 1;
              portData.totalDeficiencies += 1;
            } else {
              portData.otherCodeRowCounts[processedActionCode] = (portData.otherCodeRowCounts[processedActionCode] || 0) + 1;
              portData.totalDeficiencies += 1;
            }
          }
        });

        let portArray = Array.from(portCodeMap.values()).map(port => {
          const totalStacked = Object.values(port.otherCodeRowCounts).reduce((sum, count) => sum + count, 0) + 
                              port.code30 + port.code17 + port.nilDeficiency;
          
          newMaxCount = Math.max(newMaxCount, totalStacked);
          
          return {
            name: port.portName,
            code30: port.code30,
            code17: port.code17,
            nilDeficiency: port.nilDeficiency,
            ...port.otherCodeRowCounts,
            totalDeficiencies: port.totalDeficiencies,
                          inspectionCount: port.vesselSet.size,
            vesselCount: port.vesselSet.size,
            _stackedTotal: totalStacked // Used for sorting and Y-axis
          };
        });
        
        // Sort by code30 (detentions) first, then by total deficiencies
        portArray.sort((a, b) => (b.code30 - a.code30) || (b.totalDeficiencies - a.totalDeficiencies));
        const topPorts = portArray.slice(0, 10);

        const codeKeysForStacking = new Set();
        topPorts.forEach(port => {
          Object.keys(port).forEach(key => {
            if (!['name', 'code30', 'code17', 'nilDeficiency', 'totalDeficiencies', 'inspectionCount', 'vesselCount', '_stackedTotal'].includes(key)) {
              codeKeysForStacking.add(key);
            }
          });
        });
        
        // Special colors for key categories
        newColorMap['code30'] = CODE_30_COLOR;
        newColorMap['code17'] = CODE_17_COLOR;
        newColorMap['nilDeficiency'] = NIL_DEFICIENCY_COLOR;
        
        // Colors for other codes
        Array.from(codeKeysForStacking).forEach((key, index) => {
          newColorMap[key] = ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length];
        });

        // Order keys for stacking: code30, code17, nilDeficiency, then others
        const orderedKeys = ['code30', 'code17', 'nilDeficiency', ...Array.from(codeKeysForStacking)];

        setProcessedData({
          type: 'port',
          data: topPorts,
          keys: orderedKeys,
          colorMap: newColorMap
        });

      } else { // 'overall' view
        const codeMap = new Map();
        filteredByCountry.forEach(item => {
          if (!item) return;
          
          // Handle action code, treating null/undefined as "Nil Deficiency"
          const actionCode = item.actioncode || item.reference_code_1;
          const processedActionCode = actionCode ? String(actionCode).trim() : 'nilDeficiency';
          
          codeMap.set(processedActionCode, (codeMap.get(processedActionCode) || 0) + 1);
        });

        let codeArray = Array.from(codeMap.entries()).map(([code, rowCount]) => {
          newMaxCount = Math.max(newMaxCount, rowCount);
          return {
            name: code === 'nilDeficiency' ? 'Nil Deficiency' : `Code ${code}`,
            count: rowCount,
            code: code
          };
        });

        codeArray.sort((a, b) => b.count - a.count);
        const topCodes = codeArray.slice(0, 10);

        topCodes.forEach((item, index) => {
          if (item.code === '30') {
            newColorMap[item.name] = CODE_30_COLOR;
          } else if (item.code === '17') {
            newColorMap[item.name] = CODE_17_COLOR;
          } else if (item.code === 'nilDeficiency') {
            newColorMap[item.name] = NIL_DEFICIENCY_COLOR;
          } else {
            newColorMap[item.name] = ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length];
          }
        });
        
        setProcessedData({
          type: 'overall',
          data: topCodes,
          keys: ['count'],
          colorMap: newColorMap
        });
      }
      
      setMaxRowCount(newMaxCount);

    } catch (err) {
      console.error('Error processing deficiency code chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData({ type: activeView, data: [], keys: [], colorMap: {} });
      setMaxRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter]);

  const getYAxisDomain = useMemo(() => {
    if (maxRowCount <= 0) return [0, 5];
    return [0, Math.ceil((maxRowCount * 1.1) / 5) * 5];
  }, [maxRowCount]);

  // Sort tooltip items in specified order: Total deficiencies, No. of Inspection, detentions, code 17, Nil Deficiency, Other codes
  const sortTooltipItems = (payload) => {
    if (!payload || payload.length === 0) return [];
    
    // Create a map of tooltip items by dataKey for easy access
    const tooltipMap = {};
    payload.forEach(p => {
      tooltipMap[p.dataKey] = p;
    });
    
    // Group items
    const detentions = tooltipMap['code30'];
    const code17 = tooltipMap['code17'];
    const nilDeficiency = tooltipMap['nilDeficiency'];
    
    // Find other codes
    const otherCodes = payload.filter(p => 
      p.dataKey !== 'code30' && p.dataKey !== 'code17' && p.dataKey !== 'nilDeficiency'
    ).sort((a, b) => b.value - a.value); // Sort other codes by value
    
    // Combine in order
    const result = [];
    if (detentions) result.push(detentions);
    if (code17) result.push(code17);
    if (nilDeficiency) result.push(nilDeficiency);
    result.push(...otherCodes);
    
    return result;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const sortedPayload = sortTooltipItems(payload);

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {activeView === 'port' && (
            <>
              <p className="tooltip-value">Total Deficiencies: {dataItem.totalDeficiencies}</p>
              <p className="tooltip-value" style={{marginBottom: '5px'}}>No. of Inspection: {dataItem.inspectionCount}</p>
              <div className="tooltip-code-list">
                {sortedPayload.map(p => (
                  <div key={p.dataKey} className="tooltip-code-item">
                    <span style={{ 
                      display: 'inline-block', 
                      width: '10px', 
                      height: '10px', 
                      backgroundColor: processedData.colorMap[p.dataKey] || p.fill,
                      marginRight: '5px',
                      borderRadius: '2px'
                    }}></span>
                    {p.dataKey === 'code30' ? 'Detentions' : 
                     p.dataKey === 'code17' ? 'Code 17' :
                     p.dataKey === 'nilDeficiency' ? 'Nil Deficiency' :
                     `Code ${p.dataKey}`}: {p.value}
                  </div>
                ))}
              </div>
            </>
          )}
          {activeView === 'overall' && (
            <p className="tooltip-value">Records: {dataItem.count}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (loading) return <div className="chart-loading"><span>Loading deficiency code data...</span></div>;
    if (error) return <div className="chart-no-data"><AlertTriangle size={16} /> <p>Error: {error}</p></div>;
    if (!processedData.data || processedData.data.length === 0) {
      return <div className="chart-no-data"><FilterIcon size={14} /> <p>No data for selected filters.</p></div>;
    }

    const {type, data: chartData, keys, colorMap} = processedData;
    
    // Log nil deficiency data for debugging
    if (chartData && chartData.length > 0) {
      console.log('Chart data sample:', chartData[0]);
      console.log('Nil deficiency count in first item:', chartData[0].nilDeficiency);
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            onMouseMove={(e) => e.activeTooltipIndex !== undefined && setHoveredBar(e.activeTooltipIndex)}
            onMouseLeave={() => setHoveredBar(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(244, 244, 244, 0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#f4f4f4', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={35}
            interval="auto"
            tickFormatter={(value) => (value && value.length > 15 ? `${value.substring(0, 13)}...` : value)}
          />
          <YAxis
            tick={{ fill: '#f4f4f4', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
            tickLine={false}
            domain={getYAxisDomain}
            allowDataOverflow={false}
            label={{
              value: 'Record Count', angle: -90, position: 'insideLeft',
              style: { fill: '#4DC3FF', fontSize: 12 }, offset: 10, dy: 40
            }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />

          {type === 'port' && keys && keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={colorMap[key] || ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length]}
              name={
                key === 'code30' ? 'Detentions' : 
                key === 'code17' ? 'Code 17' :
                key === 'nilDeficiency' ? 'Nil Deficiency' :
                `Code ${key}`
              }
              barSize={16}
              radius={index === keys.length - 1 ? [6, 6, 0, 0] : [0,0,0,0]}
            >
              {chartData.map((_entry, entryIndex) => (
                 <Cell 
                    key={`cell-${key}-${entryIndex}`} 
                    className={hoveredBar === entryIndex ? 'hovered-bar' : ''} 
                 />
              ))}
            </Bar>
          ))}

          {type === 'overall' && (
            <Bar dataKey="count" barSize={16} radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorMap[entry.name] || ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length]}
                  className={hoveredBar === index ? 'hovered-bar' : ''}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          Deficiency Records {activeView === 'port' ? 'by Port' : 'Overall'}
          <span className="chart-title-highlight"></span>
        </h3>
        <div style={filterStyles.filterContainer}>
          <button 
            style={{
              ...filterStyles.viewButton,
              ...(activeView === 'port' ? filterStyles.activeViewButton : {})
            }} 
            onClick={() => setActiveView('port')}
          >
            By Port
          </button>
          <button 
            style={{
              ...filterStyles.viewButton,
              ...(activeView === 'overall' ? filterStyles.activeViewButton : {})
            }} 
            onClick={() => setActiveView('overall')}
          >
            Overall
          </button>
          
          <div style={{ marginLeft: '6px', display: 'flex', gap: '4px' }}>
            {['3m', '6m', '1y'].map(period => (
              <button
                key={period}
                style={{
                  ...filterStyles.timeButton,
                  ...(timeFilter === period ? filterStyles.activeTimeButton : {})
                }}
                onClick={() => setTimeFilter(period)}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-wrapper">
        {renderChart()}
      </div>
    </div>
  );
};

export default DeficiencyCodeChart;