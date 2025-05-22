// src/components/dashboard/datavalidation/charts/DataCorrectnessChart.jsx
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
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts';

const DataCorrectnessChart = ({ data, onFilterChange, activeFilter }) => {
  // Color scale for bars
  const getBarColor = (index) => {
    const colors = ['#3498DB', '#2ECC71', '#F1C40F', '#9B59B6', '#E74C3C', '#1ABC9C'];
    return colors[index % colors.length];
  };

  // Reference value for acceptable issue count per source
  const acceptableIssueThreshold = 5;

  // Custom tooltip to show detailed information
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          <p style={{ color: payload[0].color }}>{`Issues: ${data.issues}`}</p>
          <p style={{ color: payload[0].color }}>{`Issues per KPI: ${data.issuesPerKpi.toFixed(2)}`}</p>
          <p className="tooltip-count">{`Total KPIs: ${data.kpiCount}`}</p>
          <p className="tooltip-threshold">{data.issues > acceptableIssueThreshold ? 
            'Above acceptable threshold' : 
            'Within acceptable threshold'}</p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data) => {
    // Toggle filter - if already active, clear it
    if (activeFilter === data.source) {
      onFilterChange(null);
    } else {
      onFilterChange(data.source);
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
              dataKey="source" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fill: '#f4f4f4', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#f4f4f4', fontSize: 12 }} 
              label={{ 
                value: 'Issue Count', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#f4f4f4',
                fontSize: 12
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#f4f4f4' }} />
            
            {/* Add reference line for acceptable issue threshold */}
            <ReferenceLine 
              y={acceptableIssueThreshold} 
              stroke="#F1C40F" 
              strokeDasharray="3 3"
              label={{
                value: 'Acceptable Threshold',
                position: 'insideTopRight',
                fill: '#F1C40F',
                fontSize: 10
              }}
            />
            
            <Bar 
              dataKey="issues" 
              name="Issues" 
              radius={[4, 4, 0, 0]} 
              onClick={handleBarClick}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.issues > acceptableIssueThreshold ? '#E74C3C' : getBarColor(index)} 
                  opacity={activeFilter ? (entry.source === activeFilter ? 0.9 : 0.3) : 0.9}
                />
              ))}
              <LabelList 
                dataKey="issues" 
                position="top" 
                fill="#f4f4f4" 
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DataCorrectnessChart;

