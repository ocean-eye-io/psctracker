// src/components/dashboard/datavalidation/charts/DataCompletenessChart.jsx
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const DataCompletenessChart = ({ data, onFilterChange, activeFilter }) => {
  // Add reference line for the minimum acceptable threshold (90%)
  const minAcceptableThreshold = 90;

  // Custom tooltip to show all metrics for a category
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}%`}
            </p>
          ))}
          {payload[0].payload.count && (
            <p className="tooltip-count">{`KPIs: ${payload[0].payload.count}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data) => {
    // Toggle filter - if already active, clear it
    if (activeFilter === data.category) {
      onFilterChange(null);
    } else {
      onFilterChange(data.category);
    }
  };

  return (
    <div className="chart-container" style={{ height: '300px' }}>
      {data.length === 0 ? (
        <div className="no-data-message">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 50 }}
            barSize={30}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis 
              dataKey="category" 
              angle={-45} 
              textAnchor="end" 
              height={80}
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
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#f4f4f4' }} />
            
            {/* Add reference line for minimum acceptable threshold */}
            <ReferenceLine 
              y={minAcceptableThreshold} 
              stroke="#E74C3C" 
              strokeDasharray="3 3"
              label={{
                value: 'Min Acceptable (90%)',
                position: 'insideTopRight',
                fill: '#E74C3C',
                fontSize: 10
              }}
            />
            
            <Bar 
              dataKey="completeness" 
              name="Completeness" 
              fill="#3498DB" 
              radius={[2, 2, 0, 0]} 
              onClick={handleBarClick}
              cursor="pointer"
              opacity={activeFilter ? (data.some(d => d.category === activeFilter) ? 0.7 : 0.3) : 0.7}
            />
            <Bar 
              dataKey="correctness" 
              name="Correctness" 
              fill="#2ECC71" 
              radius={[2, 2, 0, 0]} 
              onClick={handleBarClick}
              cursor="pointer"
              opacity={activeFilter ? (data.some(d => d.category === activeFilter) ? 0.7 : 0.3) : 0.7}
            />
            <Bar 
              dataKey="freshness" 
              name="Freshness" 
              fill="#F1C40F" 
              radius={[2, 2, 0, 0]} 
              onClick={handleBarClick}
              cursor="pointer"
              opacity={activeFilter ? (data.some(d => d.category === activeFilter) ? 0.7 : 0.3) : 0.7}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DataCompletenessChart;
