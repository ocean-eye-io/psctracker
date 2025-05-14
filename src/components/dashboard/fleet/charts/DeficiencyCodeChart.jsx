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

const DeficiencyCodeChart = ({ data = [] }) => {
  const [activeView, setActiveView] = useState('port'); // 'port' or 'overall'
  const [timeFilter, setTimeFilter] = useState('1y');
  const [processedData, setProcessedData] = useState({ type: 'port', data: [], keys: [], colorMap: {} });
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxRowCount, setMaxRowCount] = useState(0); // Changed from maxDeficiencyCount

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

      let newMaxCount = 0; // This will now be max row count
      const newColorMap = {};

      if (activeView === 'port') {
        const portCodeMap = new Map();
        filteredByCountry.forEach(item => {
          if (!item) return;
          const portName = item.port_name || 'Unknown Port';
          const actionCode = String(item.actioncode || item.reference_code_1 || 'N/A').trim();

          if (actionCode === 'N/A') return; // Skip items with no identifiable action code

          if (!portCodeMap.has(portName)) {
            portCodeMap.set(portName, {
              portName,
              code30RowCount: 0,
              otherCodeRowCounts: {},
              vesselSet: new Set() // For unique vessel names
            });
          }

          const portData = portCodeMap.get(portName);

          if (actionCode === '30') {
            portData.code30RowCount += 1; // Increment row count
          } else {
            portData.otherCodeRowCounts[actionCode] = (portData.otherCodeRowCounts[actionCode] || 0) + 1; // Increment row count
          }

          if (item.vessel_name) { // Track unique vessels if name is present
            portData.vesselSet.add(item.vessel_name);
          }
        });

        let portArray = Array.from(portCodeMap.values()).map(port => {
          const totalRecordsInPortForStack = Object.values(port.otherCodeRowCounts).reduce((sum, count) => sum + count, 0) + port.code30RowCount;
          newMaxCount = Math.max(newMaxCount, totalRecordsInPortForStack);
          return {
            name: port.portName,
            code30: port.code30RowCount, // Row count for Code 30
            ...port.otherCodeRowCounts, // Spread other action code row counts
            totalRecordsInPort: totalRecordsInPortForStack, // Total records for this port in the bar
            vesselCount: port.vesselSet.size,
            _stackedTotal: totalRecordsInPortForStack // Used for sorting and Y-axis
          };
        });
        
        portArray.sort((a, b) => (b.code30 - a.code30) || (b._stackedTotal - a._stackedTotal));
        const topPorts = portArray.slice(0, 10);

        const codeKeysForStacking = new Set();
        topPorts.forEach(port => {
          Object.keys(port).forEach(key => {
            if (!['name', 'code30', 'totalRecordsInPort', 'vesselCount', '_stackedTotal'].includes(key)) {
              codeKeysForStacking.add(key);
            }
          });
        });
        
        newColorMap['code30'] = CODE_30_COLOR;
        Array.from(codeKeysForStacking).forEach((key, index) => {
          newColorMap[key] = ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length];
        });

        setProcessedData({
          type: 'port',
          data: topPorts,
          keys: ['code30', ...Array.from(codeKeysForStacking)],
          colorMap: newColorMap
        });

      } else { // 'overall' view
        const codeMap = new Map();
        filteredByCountry.forEach(item => { // Or use filteredByTime if country filter is removed
          if (!item) return;
          const actionCode = String(item.actioncode || item.reference_code_1 || 'N/A').trim();
          
          if (actionCode === 'N/A') return; // Skip items with no identifiable action code

          codeMap.set(actionCode, (codeMap.get(actionCode) || 0) + 1); // Increment row count
        });

        let codeArray = Array.from(codeMap.entries()).map(([code, rowCount]) => {
          newMaxCount = Math.max(newMaxCount, rowCount);
          return {
            name: `Code ${code}`,
            count: rowCount, // This is a row count
            code: code
          };
        });

        codeArray.sort((a, b) => b.count - a.count);
        const topCodes = codeArray.slice(0, 10);

        topCodes.forEach((item, index) => {
            newColorMap[item.name] = item.code === '30' ? CODE_30_COLOR : ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length];
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {activeView === 'port' && (
            <>
              {/* totalRecordsInPort now represents the sum of row counts for the displayed codes */}
              <p className="tooltip-value">Total Records: {dataItem.totalRecordsInPort}</p>
              <p className="tooltip-value" style={{marginBottom: '5px'}}>Vessels: {dataItem.vesselCount}</p>
              {payload.map(p => (
                 <div key={p.dataKey} style={{ color: processedData.colorMap[p.dataKey] || p.fill }}>
                   {p.dataKey === 'code30' ? 'Code 30 (Detention)' : `Code ${p.dataKey}`}: {p.value} {/* p.value is a row count */}
                 </div>
              ))}
            </>
          )}
          {activeView === 'overall' && (
            <p className="tooltip-value">Records: {dataItem.count}</p> // dataItem.count is a row count
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
            height={70}
            interval="auto"
            tickFormatter={(value) => (value && value.length > 15 ? `${value.substring(0, 13)}...` : value)}
          />
          <YAxis
            tick={{ fill: '#f4f4f4', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
            tickLine={false}
            domain={getYAxisDomain} // Uses maxRowCount now
            allowDataOverflow={false}
            label={{
              // Y-axis label "Record Count" or "Deficiency Record Count" might be more precise
              value: 'Record Count', angle: -90, position: 'insideLeft',
              style: { fill: '#4DC3FF', fontSize: 12 }, offset: 10, dy: 40
            }}
            allowDecimals={false} // Counts should be whole numbers
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
          
          {/* {type === 'port' && keys && (
            <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '10px' }}
                formatter={(value) => {
                    const name = value === 'code30' ? 'Code 30 (Detention)' : `Code ${value}`;
                    return <span style={{ color: '#f4f4f4' }}>{name}</span>;
                }}
            />
          )} */}

          {type === 'port' && keys && keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={colorMap[key] || ACTION_CODE_COLORS[index % ACTION_CODE_COLORS.length]}
              name={key === 'code30' ? 'Code 30 (Detention)' : `Code ${key}`}
              barSize={16}
              radius={index === keys.length - 1 ? [6, 6, 0, 0] : [0,0,0,0]}
            >
              {chartData.map((_entry, entryIndex) => ( // _entry not directly used for cell fill here
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
        <div className="chart-toggle">
          <button className={activeView === 'port' ? 'active' : ''} onClick={() => setActiveView('port')}>By Port</button>
          <button className={activeView === 'overall' ? 'active' : ''} onClick={() => setActiveView('overall')}>Overall</button>
          <div className="chart-filter" style={{ marginLeft: '10px', display: 'flex', gap: '4px' }}>
            {['3m', '6m', '1y'].map(period => (
              <button
                key={period}
                className={`chart-action-btn ${timeFilter === period ? 'active' : ''}`}
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