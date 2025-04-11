import React, { useState, useEffect } from 'react';
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
import '../../../common/charts/styles/chartStyles.css';

const ArrivalsByPortChart = ({ data, onFilterChange, activeFilter }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Reset internal state when external activeFilter changes
  useEffect(() => {
    if (!activeFilter) {
      // Reset any internal state if needed
    }
  }, [activeFilter]);
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.[0]) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">{payload[0].value} vessels</p>
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };
  
  const handleMouseMove = (e) => {
    if (e?.activeTooltipIndex !== undefined) {
      setHoveredBar(e.activeTooltipIndex);
    }
  };
  
  // Handle bar click to trigger filtering
  const handleBarClick = (entry) => {
    // If already filtered by this port, clear the filter
    if (activeFilter === entry.port) {
      onFilterChange(null);
    } else {
      onFilterChange(entry.port);
    }
  };
  
  // Chart gradients definition
  const renderGradients = () => (
    <defs>
      <linearGradient id="portBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#3BADE5" stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="activePortBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#28E0B0" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#1AB394" stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );
  
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          Vessels by Port
          <span className="chart-title-highlight"></span>
        </h3>
        {activeFilter && (
          <div className="chart-filter-badge">
            Filtered by: {activeFilter}
            <button 
              className="clear-filter-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onFilterChange(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      <div className="chart-wrapper port-chart">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" aspect={null}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredBar(null)}
              className="chart-transition"
              style={{ width: '100%', height: '100%' }}
            >
              {renderGradients()}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(244, 244, 244, 0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="port"
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: 'rgba(244, 244, 244, 0.1)' }}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                content={<CustomTooltip />}
                isAnimationActive={false}
              />
              <Bar
                dataKey="vessels"
                className="chart-bar clickable-bar"
                radius={[6, 6, 0, 0]}
                barSize={20}
                isAnimationActive={false}
                onClick={handleBarClick}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.port === activeFilter ? "url(#activePortBarGradient)" : "url(#portBarGradient)"}
                    className={`${hoveredBar === index ? 'hovered' : ''} ${entry.port === activeFilter ? 'active' : ''}`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data">No port data available</div>
        )}
      </div>
    </div>
  );
};

export default ArrivalsByPortChart;