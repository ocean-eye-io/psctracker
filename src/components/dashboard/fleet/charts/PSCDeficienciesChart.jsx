import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { FilterIcon, AlertTriangle } from 'lucide-react';

// Import chart styles
import '../../../common/charts/styles/chartStyles.css';

const PSCDeficienciesChart = ({ data = [], onFilterChange, activeFilter }) => {
  const [activeView, setActiveView] = useState('port'); // 'category' or 'port'
  const [timeFilter, setTimeFilter] = useState('1y'); // Default to 1 year
  const [processedData, setProcessedData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [colorMap, setColorMap] = useState({});
  const [maxDeficiencyCount, setMaxDeficiencyCount] = useState(0); // Track max count for Y-axis

  // Color palette for categories
  const categoryColors = [
    '#4DC3FF', '#28E0B0', '#FF5252', '#F1C40F', '#9B59B6', 
    '#3498DB', '#2ECC71', '#E67E22', '#1ABC9C', '#E74C3C',
    '#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD',
    '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF'
  ];

  // Process the data based on filters
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      // Check if data is available
      if (!data || (Array.isArray(data) && data.length === 0)) {
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

      // Apply time filter based on inspection_from_date
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
      if (activeView === 'category') {
        // Group by psc_category
        const categoryMap = new Map();
        
        filteredByCountry.forEach(item => {
          // Skip if category is null, empty, numeric only, or #REF
          const category = item.category || item.psc_category;
          
          if (!category || 
              /^[0-9.,\s]+$/.test(category) || // Numbers and dots/commas only
              category.includes('#REF')) {
            return;
          }
          
          const normalizedCategory = category.trim();
          
          if (!categoryMap.has(normalizedCategory)) {
            categoryMap.set(normalizedCategory, {
              name: normalizedCategory,
              category: normalizedCategory,
              count: 0,
              subCategories: new Set()
            });
          }
          
          const categoryData = categoryMap.get(normalizedCategory);
          categoryData.count += 1;
          
          // Track sub-categories
          const subCategory = item.sub_category || item.psc_sub_category;
          if (subCategory && !subCategory.includes('#REF')) {
            categoryData.subCategories.add(subCategory.trim());
          }
        });
        
        // Convert to array and sort by count (descending)
        let categoryArray = Array.from(categoryMap.values()).map(cat => ({
          ...cat,
          subCategories: Array.from(cat.subCategories)
        }));
        
        // Sort by count and take top 10
        categoryArray.sort((a, b) => b.count - a.count);
        categoryArray = categoryArray.slice(0, 10);
        
        // Create color mapping for categories
        const newColorMap = {};
        categoryArray.forEach((cat, index) => {
          newColorMap[cat.name] = categoryColors[index % categoryColors.length];
        });
        setColorMap(newColorMap);
        
        // Find maximum count for Y-axis scaling
        const maxCount = categoryArray.length > 0 
          ? Math.max(...categoryArray.map(c => c.count))
          : 0;
        setMaxDeficiencyCount(maxCount);
        
        setProcessedData({ 
          type: 'category',
          data: categoryArray 
        });
      } else if (activeView === 'port') {
        // First identify top 10 ports by count of reference_code_1 (actioncode)
        const portCountMap = new Map();
        
        filteredByCountry.forEach(item => {
          const portName = item.port_name || 'Unknown';
          
          if (!portCountMap.has(portName)) {
            portCountMap.set(portName, {
              name: portName,
              totalCount: 0,
              actionCodeCount: 0,
              categories: new Map(),
              rawRecords: 0, // Add a counter for total records
              allCategories: {} // Keep track of all categories for this port
            });
          }
          
          const portData = portCountMap.get(portName);
          portData.rawRecords += 1; // Count every record for this port, regardless of category
          
          // Count action codes
          if (item.actioncode || item.reference_code_1) {
            portData.actionCodeCount += 1;
          }
          
          // Group by category for stacked bars
          const category = (item.category || item.psc_category || 'Other').trim();
          if (category && !category.includes('#REF') && !/^[0-9.,\s]+$/.test(category)) {
            if (!portData.categories.has(category)) {
              portData.categories.set(category, 0);
            }
            portData.categories.set(category, portData.categories.get(category) + 1);
            
            // Also store in the allCategories object for complete tooltips
            portData.allCategories[category] = (portData.allCategories[category] || 0) + 1;
            
            portData.totalCount += 1; // Only increment totalCount for valid categorized deficiencies
          }
        });
        
        // Convert to array and sort by action code count
        let portArray = Array.from(portCountMap.values());
        portArray.sort((a, b) => b.actionCodeCount - a.actionCodeCount);
        
        // Take top 10 ports
        portArray = portArray.slice(0, 10);
        
        // Identify all unique categories across these top 10 ports
        const allCategories = new Set();
        portArray.forEach(port => {
          port.categories.forEach((count, category) => {
            allCategories.add(category);
          });
        });
        
        // Limit to top 12 categories for visualization (increased from 6)
        const categoryCountMap = new Map();
        portArray.forEach(port => {
          port.categories.forEach((count, category) => {
            if (!categoryCountMap.has(category)) {
              categoryCountMap.set(category, 0);
            }
            categoryCountMap.set(category, categoryCountMap.get(category) + count);
          });
        });
        
        const topCategories = Array.from(categoryCountMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12) // Increased from 6 to 12 to show more categories
          .map(([category]) => category);
        
        // Format data for stacked bar chart
        const stackedData = portArray.map(port => {
            // Calculate the sum of all categorized deficiencies
            let totalCategorizedDeficiencies = 0;
            port.categories.forEach((count) => {
                totalCategorizedDeficiencies += count;
            });
            
            const formattedPort = {
                name: port.name,
                totalCount: totalCategorizedDeficiencies, // This should match the sum of all categories
                rawRecords: port.rawRecords, // Keep track of the total record count for reference
                allCategories: port.allCategories // Store all categories for complete tooltips
            };
            
            // Add each category as a property with explicit number conversion
            topCategories.forEach(category => {
                formattedPort[category] = Number(port.categories.get(category) || 0);
            });
            
            return formattedPort;
        });
        
        // Create color mapping for categories
        const newColorMap = {};
        topCategories.forEach((category, index) => {
          newColorMap[category] = categoryColors[index % categoryColors.length];
        });
        setColorMap(newColorMap);
        
        // Find maximum total count for Y-axis scaling
        const maxCount = stackedData.length > 0 
          ? Math.max(...stackedData.map(port => port.totalCount))
          : 0;
        setMaxDeficiencyCount(maxCount);
        
        // Store top categories in processedData for legend/rendering
        setProcessedData({
          type: 'port',
          data: stackedData,
          categories: topCategories
        });
      }
    } catch (err) {
      console.error('Error processing chart data:', err);
      setError(`Failed to process chart data: ${err.message}`);
      setProcessedData({ type: activeView, data: [] });
    } finally {
      setLoading(false);
    }
  }, [data, activeView, timeFilter]);

  // Custom tooltip for category view
  const CategoryTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{item.name}</p>
          <p className="tooltip-value">{item.count} deficiencies</p>
          {item.subCategories && item.subCategories.length > 0 && (
            <div className="tooltip-subcategories">
              <p className="tooltip-subtitle">Sub-categories:</p>
              <ul className="tooltip-list">
                {item.subCategories.slice(0, 5).map((sub, idx) => (
                  <li key={idx}>{sub}</li>
                ))}
                {item.subCategories.length > 5 && (
                  <li>+{item.subCategories.length - 5} more...</li>
                )}
              </ul>
            </div>
          )}
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };

  // Improved tooltip for port view - shows ALL categories
  // Replace your existing PortTooltip component with this improved version

  const PortTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Get the pre-calculated totalCount and all categories
      const item = payload[0].payload;
      const total = item.totalCount;
      const allCategories = item.allCategories || {};
      
      // Create a sorted array of all categories for this port
      const sortedCategories = Object.entries(allCategories)
        .sort((a, b) => b[1] - a[1])  // Sort by count descending
        .filter(([_, count]) => count > 0);  // Filter out zero counts
      
      return (
        <div
          className="custom-tooltip"
          style={{
            minWidth: 240,
            maxWidth: 350,
            maxHeight: 400, // Maximum height for the tooltip
            overflowY: 'auto', // Enable vertical scrolling
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            position: 'fixed', // Use fixed positioning to prevent cutoff
            zIndex: 9999, // Ensure tooltip appears on top
            backgroundColor: 'rgba(11, 22, 35, 0.95)', // Semi-transparent dark background
            color: '#f4f4f4',
            border: '1px solid rgba(59, 173, 229, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.4)',
          }}
        >
          <p className="tooltip-label" style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            margin: '0 0 8px 0',
            color: '#4DC3FF'
          }}>
            {label}
          </p>
          <p className="tooltip-value" style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            margin: '0 0 12px 0' 
          }}>
            {total} total deficiencies
          </p>
          <div 
            className="tooltip-categories"
            style={{
              maxHeight: 240,
              overflowY: 'auto',  // Enable scrolling for this section
              padding: '0 4px',
              marginRight: '-4px', // Compensate for scrollbar width
            }}
          >
            {sortedCategories.map(([category, count], index) => {
              // Get color from the color map or use a default
              const color = colorMap[category] || categoryColors[index % categoryColors.length];
              
              return (
                <div 
                  key={index} 
                  className="tooltip-category-item"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '6px',
                    fontSize: '12px',
                    lineHeight: 1.4
                  }}
                >
                  <span
                    className="tooltip-color-dot"
                    style={{ 
                      backgroundColor: color,
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginRight: '6px',
                      marginTop: '4px',
                      flexShrink: 0
                    }}
                  ></span>
                  <span 
                    className="tooltip-category-name"
                    style={{
                      flex: 1,
                      paddingRight: '6px'
                    }}
                  >
                    {category}: 
                  </span>
                  <span 
                    className="tooltip-category-value"
                    style={{
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

// Also, update the CSS for tooltips (you can add this to your CSS file):
/*

*/
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

  // Improved Y-axis domain calculation for tighter fit
  // Replace the getYAxisDomain function with this ultra-simple solution:

  const getYAxisDomain = useMemo(() => {
    // If no data or max count is 0, use a small default range
    if (maxDeficiencyCount <= 0) return [0, 5];
    
    // Simply use max value + small constant (2)
    return [0, maxDeficiencyCount + 2];
  }, [maxDeficiencyCount]);

// Use this function to set a fixed number of ticks based on max value
const getYAxisTicks = useMemo(() => {
  if (maxDeficiencyCount <= 0) return [0, 1, 2, 3, 4, 5];
  
  // Create an array from 0 to max+2 with reasonable step size
  const max = maxDeficiencyCount + 2;
  const step = max <= 10 ? 5 : 
               max <= 20 ? 5 : 
               max <= 50 ? 10 : 
               Math.ceil(max / 5); // Aim for 5-6 ticks
               
  const ticks = [];
  for (let i = 0; i <= max; i += step) {
    ticks.push(i);
  }
  
  // Always include 0 and max
  if (!ticks.includes(0)) ticks.unshift(0);
  if (!ticks.includes(max)) ticks.push(max);
  
  return ticks;
}, [maxDeficiencyCount]);

// Then in your YAxis component:
<YAxis
  tick={{ fill: '#f4f4f4', fontSize: 11 }}
  axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
  tickLine={false}
  domain={getYAxisDomain}
  allowDataOverflow={true} // This prevents auto-adjustment
  label={{ 
    value: 'Deficiency Count', 
    angle: -90, 
    position: 'insideLeft',
    style: { fill: '#4DC3FF', fontSize: 12 },
    offset: 25,
    dy: 50
  }}
/>

  const renderChart = () => {
    if (loading) {
      return (
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <span>Loading deficiency data...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="chart-no-data">
          <AlertTriangle size={16} color="#FF5252" style={{ marginBottom: '8px' }} />
          <p>Error loading deficiency data</p>
          <p style={{ fontSize: '10px', marginTop: '6px' }}>{error}</p>
        </div>
      );
    }
    
    if (!processedData || !processedData.data || processedData.data.length === 0) {
      return (
        <div className="chart-no-data">
          <p>No deficiency data available for the selected time period</p>
          <p style={{ fontSize: '10px', marginTop: '6px' }}>
            <FilterIcon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Try adjusting your time filter
          </p>
        </div>
      );
    }
    
    if (processedData.type === 'category') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData.data}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="pscBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3BADE5" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(244, 244, 244, 0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={35}
              interval={0}
              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
            <YAxis
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
              tickLine={false}
              domain={getYAxisDomain} // Use the improved calculation
              label={{ 
                value: 'Deficiency Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#4DC3FF', fontSize: 12 },
                offset: 25,
                dy: 50
              }}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              className="chart-bar"
              barSize={16}
            >
              {processedData.data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorMap[entry.name] || '#4DC3FF'}
                  className={hoveredBar === index ? 'hovered-bar' : ''}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (processedData.type === 'port') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData.data}
            margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(244, 244, 244, 0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={35}
              interval={0}
              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
            <YAxis
              tick={{ fill: '#f4f4f4', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
              tickLine={false}
              domain={getYAxisDomain} // Use the improved calculation
              label={{ 
                value: 'Deficiency Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#4DC3FF', fontSize: 12 },
                offset: 25,
                dy: 50
              }}
            />
            <Tooltip content={<PortTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
            {/* <Legend 
              layout="horizontal"
              verticalAlign="top"
              align="center"
              wrapperStyle={{
                paddingBottom: 10,
                fontSize: 10
              }}
              iconType="circle"
              iconSize={8}
            /> */}
            {processedData.categories && processedData.categories.map((category, index) => {
              return (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={colorMap[category] || '#FFFFFF'}
                  name={category.length > 18 ? `${category.substring(0, 18)}...` : category}
                  barSize={16}
                  radius={index === processedData.categories.length - 1 ? [6, 6, 0, 0] : 0}
                />
              );
            })}
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
          PSC Deficiencies {activeView === 'category' ? 'by Category' : 'by Port'}
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
                className={activeView === 'category' ? 'active' : ''}
                onClick={() => setActiveView('category')}
            >
                By Category
            </button>
          
          {/* Time filter buttons */}
          <div className="chart-filter" style={{ marginLeft: '10px', display: 'flex', gap: '4px' }}>
            <button 
              className={`chart-action-btn ${timeFilter === '3m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('3m')}
            >
              3M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '6m' ? 'active' : ''}`}
              onClick={() => setTimeFilter('6m')}
            >
              6M
            </button>
            <button 
              className={`chart-action-btn ${timeFilter === '1y' ? 'active' : ''}`}
              onClick={() => setTimeFilter('1y')}
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

export default PSCDeficienciesChart;