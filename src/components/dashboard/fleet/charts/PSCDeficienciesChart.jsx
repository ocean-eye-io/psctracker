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
              allCategories: {}, // Keep track of all categories for this port
              vesselSet: new Set() // Track unique vessels
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
          
          // Track unique vessels
          if (item.vessel_name) {
            portData.vesselSet.add(item.vessel_name);
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
                allCategories: port.allCategories, // Store all categories for complete tooltips
                vesselCount: port.vesselSet.size // Add the vessel count
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
          categories: topCategories,
          colorMap: newColorMap
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

  // Get Y-axis domain calculation for tighter fit
  const getYAxisDomain = useMemo(() => {
    if (maxDeficiencyCount <= 0) return [0, 5];
    return [0, Math.ceil((maxDeficiencyCount * 1.1) / 5) * 5];
  }, [maxDeficiencyCount]);

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;

      if (activeView === 'category') {
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{label}</p>
            <p className="tooltip-value">{dataItem.count} deficiencies</p>
            {dataItem.subCategories && dataItem.subCategories.length > 0 && (
              <div className="tooltip-subcategories">
                <p className="tooltip-subtitle">Sub-categories:</p>
                <div className="tooltip-code-list">
                  {dataItem.subCategories.slice(0, 10).map((sub, idx) => (
                    <div key={idx} className="tooltip-code-item">
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        backgroundColor: colorMap[dataItem.name] || '#4DC3FF',
                        marginRight: '5px',
                        borderRadius: '50%'
                      }}></span>
                      {sub}
                    </div>
                  ))}
                  {dataItem.subCategories.length > 10 && (
                    <div className="tooltip-code-item">+{dataItem.subCategories.length - 10} more...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      } else if (activeView === 'port') {
        // Get all categories for this port
        const allCategories = dataItem.allCategories || {};
        
        // Create a sorted array of all categories for this port
        const sortedCategories = Object.entries(allCategories)
          .sort((a, b) => b[1] - a[1])  // Sort by count descending
          .filter(([_, count]) => count > 0);  // Filter out zero counts
        
        return (
          <div className="custom-tooltip">
            <p className="tooltip-label">{label}</p>
            <p className="tooltip-value">Total Records: {dataItem.totalCount}</p>
            <p className="tooltip-value" style={{marginBottom: '5px'}}>Vessels: {dataItem.vesselCount}</p>
            <div className="tooltip-code-list">
              {sortedCategories.map(([category, count], index) => {
                const color = processedData.colorMap?.[category] || categoryColors[index % categoryColors.length];
                return (
                  <div key={index} className="tooltip-code-item">
                    <span style={{ 
                      display: 'inline-block', 
                      width: '10px', 
                      height: '10px', 
                      backgroundColor: color,
                      marginRight: '5px',
                      borderRadius: '2px'
                    }}></span>
                    {category}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const renderChart = () => {
    if (loading) {
      return <div className="chart-loading"><span>Loading deficiency data...</span></div>;
    }
    
    if (error) {
      return <div className="chart-no-data"><AlertTriangle size={16} /> <p>Error: {error}</p></div>;
    }
    
    if (!processedData || !processedData.data || processedData.data.length === 0) {
      return <div className="chart-no-data"><FilterIcon size={14} /> <p>No data for selected filters.</p></div>;
    }
    
    if (processedData.type === 'category') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData.data}
            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            onMouseMove={(e) => e.activeTooltipIndex !== undefined && setHoveredBar(e.activeTooltipIndex)}
            onMouseLeave={() => setHoveredBar(null)}
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
              height={55}
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
                value: 'Deficiency Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#4DC3FF', fontSize: 12 },
                offset: 10,
                dy: 40
              }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              barSize={16}
            >
              {processedData.data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorMap[entry.name] || categoryColors[index % categoryColors.length]}
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
            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            onMouseMove={(e) => e.activeTooltipIndex !== undefined && setHoveredBar(e.activeTooltipIndex)}
            onMouseLeave={() => setHoveredBar(null)}
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
              height={55}
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
                value: 'Deficiency Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#4DC3FF', fontSize: 12 },
                offset: 10,
                dy: 40
              }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(244, 244, 244, 0.05)' }} />
            {processedData.categories && processedData.categories.map((category, index) => {
              return (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={processedData.colorMap[category] || categoryColors[index % categoryColors.length]}
                  barSize={16}
                  radius={index === processedData.categories.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                >
                  {processedData.data.map((_entry, entryIndex) => (
                    <Cell
                      key={`cell-${category}-${entryIndex}`}
                      className={hoveredBar === entryIndex ? 'hovered-bar' : ''}
                    />
                  ))}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

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

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          PSC Deficiencies {activeView === 'category' ? 'by Category' : 'by Port'}
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
              ...(activeView === 'category' ? filterStyles.activeViewButton : {})
            }} 
            onClick={() => setActiveView('category')}
          >
            By Category
          </button>
          
          <div style={{ marginLeft: '8px', display: 'flex', gap: '6px' }}>
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

export default PSCDeficienciesChart;