// src/components/dashboard/datavalidation/charts/DataFreshnessChart.jsx
import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';

const DataFreshnessChart = ({ data, onFilterChange, activeFilter }) => {
  const [metricVisibility, setMetricVisibility] = useState({
    completeness: true,
    correctness: true,
    freshness: true
  });

  // Add reference line for the minimum acceptable threshold (90%)
  const minAcceptableThreshold = 90;
  const criticalThreshold = 70;

  // Handle legend click to toggle visibility
  const handleLegendClick = (metric) => {
    setMetricVisibility({
      ...metricVisibility,
      [metric]: !metricVisibility[metric]
    });
  };

  // Custom tooltip to show all metrics for a date
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Filter for only visible metrics
      const visiblePayload = payload.filter(entry => 
        metricVisibility[entry.dataKey]
      );

      if (visiblePayload.length === 0) return null;

      // Calculate average score of visible metrics
      const avgScore = Math.round(
        visiblePayload.reduce((sum, entry) => sum + entry.value, 0) / visiblePayload.length
      );

      // Determine quality status
      let qualityStatus = "Good";
      let statusColor = "#2ECC71";
      
      if (avgScore < criticalThreshold) {
        qualityStatus = "Critical";
        statusColor = "#E74C3C";
      } else if (avgScore < minAcceptableThreshold) {
        qualityStatus = "Warning";
        statusColor = "#F1C40F";
      }

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Date: ${label}`}</p>
          <p className="tooltip-status" style={{ color: statusColor }}>
            Status: {qualityStatus}
          </p>
          {visiblePayload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}%`}
            </p>
          ))}
          <p className="tooltip-average">
            Average: {avgScore}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend that supports toggling
  const CustomizedLegend = (props) => {
    const { payload } = props;
    
    return (
      <div className="custom-legend">
        {payload.map((entry, index) => (
          <div 
            key={`legend-${index}`} 
            className={`legend-item ${metricVisibility[entry.dataKey] ? 'active' : 'inactive'}`}
            onClick={() => handleLegendClick(entry.dataKey)}
          >
            <span 
              className="legend-icon" 
              style={{ backgroundColor: entry.color }}
            ></span>
            <span className="legend-text">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chart-container" style={{ height: '300px' }}>
      {data.length === 0 ? (
        <div className="no-data-message">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#f4f4f4', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: '#f4f4f4', fontSize: 12 }} 
              tickCount={6}
              label={{ 
                value: 'Quality Score (%)', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#f4f4f4',
                fontSize: 12
              }}
            />
            
            {/* Reference area for critical zone */}
            <ReferenceArea 
              y1={0} 
              y2={criticalThreshold} 
              fill="#E74C3C" 
              fillOpacity={0.1} 
            />
            
            {/* Reference area for warning zone */}
            <ReferenceArea 
              y1={criticalThreshold} 
              y2={minAcceptableThreshold} 
              fill="#F1C40F" 
              fillOpacity={0.1} 
            />
            
            {/* Reference area for good zone */}
            <ReferenceArea 
              y1={minAcceptableThreshold} 
              y2={100} 
              fill="#2ECC71" 
              fillOpacity={0.1}
            />
            
            {/* Reference line for minimum acceptable threshold */}
            <ReferenceLine 
              y={minAcceptableThreshold} 
              stroke="#F1C40F" 
              strokeWidth={2}
              strokeDasharray="5 5"
            >
              <Label 
                value="Min Acceptable (90%)" 
                position="insideBottomRight" 
                fill="#F1C40F"
                fontSize={10}
              />
            </ReferenceLine>
            
            {/* Reference line for critical threshold */}
            <ReferenceLine 
              y={criticalThreshold} 
              stroke="#E74C3C" 
              strokeWidth={2}
              strokeDasharray="5 5"
            >
              <Label 
                value="Critical (70%)" 
                position="insideTopRight" 
                fill="#E74C3C"
                fontSize={10}
              />
            </ReferenceLine>
            
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomizedLegend />} />
            
            <Line 
              type="monotone" 
              dataKey="completeness" 
              name="Completeness" 
              stroke="#3498DB" 
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 4 }}
              hide={!metricVisibility.completeness}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            <Line 
              type="monotone" 
              dataKey="correctness" 
              name="Correctness" 
              stroke="#2ECC71" 
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 4 }}
              hide={!metricVisibility.correctness}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            <Line 
              type="monotone" 
              dataKey="freshness" 
              name="Freshness" 
              stroke="#F1C40F" 
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 4 }}
              hide={!metricVisibility.freshness}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      <style jsx>{`
        .chart-container {
          position: relative;
        }
        
        .custom-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 8px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        
        .legend-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .legend-item.inactive {
          opacity: 0.5;
        }
        
        .legend-icon {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }
        
        .legend-text {
          font-size: 12px;
          color: #f4f4f4;
        }
        
        .custom-tooltip {
          background-color: rgba(0, 0, 0, 0.8);
          border: 1px solid #222;
          border-radius: 4px;
          padding: 10px 14px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        .tooltip-label {
          font-weight: 600;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 4px;
        }
        
        .tooltip-status {
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .tooltip-average {
          margin-top: 6px;
          font-weight: 600;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 4px;
        }
        
        .no-data-message {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          color: #999;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default DataFreshnessChart;