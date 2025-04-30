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

// Import chart styles if available
import '../../../common/charts/styles/chartStyles.css';

const PSCKpisChart = ({ data = [], onFilterChange, activeFilter }) => {
  const [activeView, setActiveView] = useState('port');
  const [timeFilter, setTimeFilter] = useState('1y'); // Default to 1 year
  const [processedData, setProcessedData] = useState([]);
  const [overallData, setOverallData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to get appropriate chart dimensions based on screen size
  const getChartDimensions = () => {
    // Check if window is available (for SSR compatibility)
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      
      // For smaller screens, reduce bottom margin and axis height
      if (width < 576) {
        return {
          margin: { top: 10, right: 5, left: 5, bottom: 20 },
          xAxisHeight: 30,
          yAxisWidth: 90,
          barSize: 10
        };
      } else if (width < 768) {
        return {
          margin: { top: 10, right: 10, left: 10, bottom: 30 },
          xAxisHeight: 35,
          yAxisWidth: 100,
          barSize: 12
        };
      } else {
        return {
          margin: { top: 10, right: 10, left: 10, bottom: 40 },
          xAxisHeight: 40,
          yAxisWidth: 120,
          barSize: 14
        };
      }
    }
    
    // Default dimensions
    return {
      margin: { top: 10, right: 10, left: 10, bottom: 40 },
      xAxisHeight: 40,
      yAxisWidth: 120,
      barSize: 14
    };
  };

  // Process the data based on filters - EXACTLY like PSCDeficienciesChart
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      console.log('Processing PSC KPI data, total records:', data.length);
      
      // Check if data is available
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('No PSC data available');
        setProcessedData([]);
        setOverallData([]);
        setLoading(false);
        return;
      }

      // Normalize data to array format - EXACTLY like PSCDeficienciesChart
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
        setOverallData([]);
        setLoading(false);
        return;
      }

      // Apply time filter based on inspection_from_date - EXACTLY like PSCDeficienciesChart
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

      // Filter for Australia/New Zealand vessels - EXACTLY like PSCDeficienciesChart
      const filteredByCountry = filteredByTime.filter(item => {
        const country = ((item.country || '') + '').toLowerCase();
        return country.includes('australia') || country.includes('new zealand') || 
               country.includes('aus') || country.includes('nz');
      });

      // Process port-level KPIs first, so we can use the same filtering for both views
      // Get the ports that would be shown in PSCDeficienciesChart
      const portCountMap = new Map();
      
      // Process each record - EXACTLY like PSCDeficienciesChart, including category filtering
      filteredByCountry.forEach(item => {
        const portName = item.port_name || 'Unknown';
        
        if (!portCountMap.has(portName)) {
          portCountMap.set(portName, {
            name: portName,
            totalCount: 0,
            actionCodeCount: 0,
            categories: new Map(),
            uniqueInspections: new Set(),
            inspectionsWithDeficiencies: new Set(),
            detentions: 0
          });
        }
        
        const portData = portCountMap.get(portName);
        
        // Count EVERY record - EXACTLY like PSCDeficienciesChart
        portData.totalCount += 1;
        
        const referenceNo = item.reference_no_ || '';
        if (referenceNo) {
          portData.uniqueInspections.add(referenceNo);
          
          // Count detention
          const actionCode = item.actioncode;
          if (actionCode === 30 || actionCode === '30') {
            portData.detentions += 1;
          }
        }
        
        // Count action codes - CRITICALLY IMPORTANT for matching port selection
        if (item.actioncode || item.reference_code_1) {
          portData.actionCodeCount += 1;
        }
        
        // CRITICAL: Match the category counting from PSCDeficienciesChart
        const category = (item.category || item.psc_category || 'Other').trim();
        if (category && !category.includes('#REF') && !/^[0-9.,\s]+$/.test(category)) {
          if (!portData.categories.has(category)) {
            portData.categories.set(category, 0);
          }
          portData.categories.set(category, portData.categories.get(category) + 1);
          
          // If the record has a valid category, it's a deficiency record
          if (referenceNo) {
            portData.inspectionsWithDeficiencies.add(referenceNo);
          }
        }
      });
      
      // Sort and select ports EXACTLY like PSCDeficienciesChart
      let portArray = Array.from(portCountMap.values());
      portArray.sort((a, b) => b.actionCodeCount - a.actionCodeCount);
      portArray = portArray.slice(0, 10);  // Take top 10 ports by action code count
      
      // Calculate KPIs for selected ports
      const finalPortArray = portArray.map(port => {
        // Count the TOTAL RECORDS IN CATEGORIES - this is what PSCDeficienciesChart displays!
        let categoryTotal = 0;
        port.categories.forEach((count) => {
          categoryTotal += count;
        });
        
        return {
          name: port.name,
          DPI: port.uniqueInspections.size > 0 ? (categoryTotal / port.uniqueInspections.size).toFixed(2) : 0,
          DPR: port.uniqueInspections.size > 0 ? ((port.detentions * 100) / port.uniqueInspections.size).toFixed(2) : 0,
          DIR: port.uniqueInspections.size > 0 ? ((port.inspectionsWithDeficiencies.size * 100) / port.uniqueInspections.size).toFixed(2) : 0,
          totalInspections: port.uniqueInspections.size,
          totalDeficiencies: categoryTotal,  // IMPORTANT: Use the category sum, NOT totalCount
          inspectionsWithDeficiencies: port.inspectionsWithDeficiencies.size,
          detentions: port.detentions
        };
      });
      
      // Set port data when appropriate
      if (activeView === 'port') {
        setProcessedData(finalPortArray);
      }
      
      // Calculate overall KPIs using only the records with valid categories
      // This ensures we're using exactly the same dataset as PSCDeficienciesChart
      const displayedPortNames = new Set(portArray.map(port => port.name));
      
      // Count total unique inspections and sum of categorized deficiencies
      const uniqueInspections = new Set();
      const inspectionsWithDefMap = new Map();
      let totalDetentions = 0;
      let totalCategorizedDeficiencies = 0;
      
      // Sum all the categorized deficiencies from all ports
      portArray.forEach(port => {
        port.categories.forEach((count) => {
          totalCategorizedDeficiencies += count;
        });
        
        // Add unique inspections
        port.uniqueInspections.forEach(inspectionId => {
          uniqueInspections.add(inspectionId);
        });
        
        // Add inspections with deficiencies
        port.inspectionsWithDeficiencies.forEach(inspectionId => {
          inspectionsWithDefMap.set(inspectionId, true);
        });
        
        // Add detentions
        totalDetentions += port.detentions;
      });
      
      const totalInspections = uniqueInspections.size;
      const inspectionsWithDeficiencies = inspectionsWithDefMap.size;
      
      // Calculate overall KPIs
      const overallKPIs = [
        {
          name: 'Deficiency per Inspection (DPI)',
          value: totalInspections > 0 ? (totalCategorizedDeficiencies / totalInspections).toFixed(2) : 0,
          description: 'Total deficiencies divided by total inspections',
          details: `${totalCategorizedDeficiencies} deficiencies / ${totalInspections} inspections`,
          color: '#28E0B0' // Green
        },
        {
          name: 'Detention Rate (DPR)',
          value: totalInspections > 0 ? ((totalDetentions * 100) / totalInspections).toFixed(2) : 0,
          description: 'Percentage of inspections resulting in detention',
          details: `${totalDetentions} detentions / ${totalInspections} inspections`,
          color: '#FF5252' // Red
        },
        {
          name: 'Deficiency Inspection Rate (DIR)',
          value: totalInspections > 0 ? ((inspectionsWithDeficiencies * 100) / totalInspections).toFixed(2) : 0,
          description: 'Percentage of inspections with at least one deficiency',
          details: `${inspectionsWithDeficiencies} inspections with deficiencies / ${totalInspections} inspections`,
          color: '#3BADE5' // Blue
        }
      ];
      
      setOverallData(overallKPIs);
    } catch (err) {
      console.error('Error processing chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData([]);
      setOverallData([]);
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter]);

  // Add resize handler to recalculate chart dimensions when window size changes
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render on window resize to update chart layout
      setProcessedData(prevData => [...(Array.isArray(prevData) ? prevData : [])]);
      setOverallData(prevData => [...prevData]);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Function to calculate Y-axis domain for KPIs in port view
  const getKpiDomain = useMemo(() => {
    if (!processedData.length) return [0, 10];
    
    // Find max values for all KPIs
    const maxDPI = Math.max(...processedData.map(item => parseFloat(item.DPI) || 0));
    return [0, Math.ceil(maxDPI * 1.2)];
  }, [processedData]);

  // Function to calculate Y-axis domain for percentage KPIs
  const getPercentageDomain = useMemo(() => {
    if (!processedData.length) return [0, 100];
    
    // Find max percentage values
    const maxDPR = Math.max(...processedData.map(item => parseFloat(item.DPR) || 0));
    const maxDIR = Math.max(...processedData.map(item => parseFloat(item.DIR) || 0));
    const maxPercentage = Math.max(maxDPR, maxDIR);
    
    return [0, Math.min(Math.ceil(maxPercentage * 1.2), 100)];
  }, [processedData]);

  // Custom tooltip for the port chart
  const PortTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{item.name}</p>
          <p className="tooltip-value">DPI: {item.DPI}</p>
          <p className="tooltip-value">DPR: {item.DPR}%</p>
          <p className="tooltip-value">DIR: {item.DIR}%</p>
          <p className="tooltip-value">Total Inspections: {item.totalInspections}</p>
          <p className="tooltip-value">Total Deficiencies: {item.totalDeficiencies}</p>
          <p className="tooltip-value">Inspections with Deficiencies: {item.inspectionsWithDeficiencies}</p>
          <p className="tooltip-value">Detentions: {item.detentions}</p>
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the overall chart
  const OverallTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{item.name}</p>
          <p className="tooltip-value">Value: {item.value}{item.name.includes('Rate') ? '%' : ''}</p>
          <p className="tooltip-value">{item.description}</p>
          <p className="tooltip-value">{item.details}</p>
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

  // Render the appropriate chart based on the view
  const renderChart = () => {
    if (loading) {
      return (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>Loading KPI data...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="chart-no-data">
          <AlertTriangle size={16} color="#FF5252" style={{ marginBottom: '8px' }} />
          <p>Error loading KPI data</p>
          <p style={{ fontSize: '10px', marginTop: '6px' }}>{error}</p>
        </div>
      );
    }
    
    if (activeView === 'port' && (!processedData || processedData.length === 0)) {
      return (
        <div className="chart-no-data">
          <p>No port KPI data available for the selected filters</p>
          <p style={{ fontSize: '10px', marginTop: '6px' }}>
            <FilterIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Try adjusting your filters or check data availability
          </p>
        </div>
      );
    }
    
    if (activeView === 'overall' && (!overallData || overallData.length === 0)) {
      return (
        <div className="chart-no-data">
          <p>No overall KPI data available for the selected filters</p>
          <p style={{ fontSize: '10px', marginTop: '6px' }}>
            <FilterIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Try adjusting your filters or check data availability
          </p>
        </div>
      );
    }
    
    if (activeView === 'port') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            barGap={4}
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
              height={50}
              interval={0}
              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
              tickLine={false}
              domain={getKpiDomain}
              label={{ 
                value: 'DPI', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#28E0B0', fontSize: 12 },
                offset: 10
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
              tickLine={false}
              domain={getPercentageDomain}
              unit="%"
              label={{ 
                value: 'Rate (%)', 
                angle: 90, 
                position: 'insideRight',
                style: { fill: '#f4f4f4', fontSize: 12 },
                offset: 10
              }}
            />
            <Tooltip 
              content={<PortTooltip />} 
              cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} 
            />
            <Legend 
              verticalAlign="top"
              align="center"
              height={36}
              iconSize={10}
              iconType="circle"
              wrapperStyle={{
                paddingTop: 0,
                paddingBottom: 0,
                fontSize: 11,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px',
                width: '100%',
                position: 'absolute',
                top: -10,
                left: 0,
                right: 0,
                zIndex: 10,
                background: 'transparent',
                border: 'none'
              }}
            />
            <Bar 
              yAxisId="left"
              dataKey="DPI" 
              name="Deficiency per Inspection (DPI)"
              fill="#28E0B0" 
              barSize={getChartDimensions().barSize}
              radius={[3, 3, 0, 0]}
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-dpi-${index}`}
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
              dataKey="DPR" 
              name="Detention Rate (DPR)"
              fill="#FF5252" 
              barSize={getChartDimensions().barSize}
              radius={[3, 3, 0, 0]}
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-dpr-${index}`}
                  fill="#FF5252"
                  style={{
                    opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                    transition: 'opacity 0.3s'
                  }}
                />
              ))}
            </Bar>
            <Bar 
              yAxisId="right"
              dataKey="DIR" 
              name="Deficiency Inspection Rate (DIR)"
              fill="#3BADE5" 
              barSize={getChartDimensions().barSize}
              radius={[3, 3, 0, 0]}
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-dir-${index}`}
                  fill="#3BADE5"
                  style={{
                    opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                    transition: 'opacity 0.3s'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (activeView === 'overall') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={overallData}
            layout="vertical"
            margin={{ top: 20, right: 20, left: getChartDimensions().yAxisWidth, bottom: 20 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            barGap={8}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(244,244,244,0.05)" 
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
              tickLine={false}
              domain={[0, 'dataMax']}
              tickFormatter={(value) => overallData[0]?.name.includes('DPI') ? value : `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#f4f4f4', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(244,244,244,0.1)' }}
              tickLine={false}
              width={getChartDimensions().yAxisWidth}
              tickFormatter={(value) => {
                // Acronym mapping for better space usage
                const acronyms = {
                  'Deficiency per Inspection (DPI)': 'DPI',
                  'Detention Rate (DPR)': 'DPR',
                  'Deficiency Inspection Rate (DIR)': 'DIR'
                };
                return acronyms[value] || value;
              }}
            />
            <Tooltip 
              content={<OverallTooltip />} 
              cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} 
            />
            <Bar 
              dataKey="value" 
              name="Value"
              barSize={getChartDimensions().barSize * 2}
              radius={[0, 3, 3, 0]}
            >
              {overallData.map((entry, index) => (
                <Cell
                  key={`cell-overall-${index}`}
                  fill={entry.color}
                  style={{
                    opacity: hoveredBar === null || hoveredBar === index ? 1 : 0.7,
                    transition: 'opacity 0.3s'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    
    return null;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          PSC Key Performance Indicators
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
            Overall
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
      
      <div className="chart-wrapper">
        {renderChart()}
      </div>
    </div>
  );
};

export default PSCKpisChart;