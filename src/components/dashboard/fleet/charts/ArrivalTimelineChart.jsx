import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  LabelList, 
  ResponsiveContainer 
} from 'recharts';
import '../../../common/charts/styles/chartStyles.css';

const ArrivalTimelineChart = ({ data, onFilterChange, activeFilter }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  
  // Reset internal state when external activeFilter changes
  useEffect(() => {
    if (!activeFilter) {
      // Reset any internal state if needed
    }
  }, [activeFilter]);
  
  // Ensure data safety
  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0].payload.range}</p>
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
    // If already filtered by this range, clear the filter
    if (activeFilter === entry.range) {
      onFilterChange(null);
    } else {
      onFilterChange(entry.range);
    }
  };

  // Chart gradients definition
  const renderGradients = () => (
    <defs>
      <linearGradient id="defaultBarGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#4DC3FF" stopOpacity={1} />
      </linearGradient>
      <linearGradient id="activeBarGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#28E0B0" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#28E0B0" stopOpacity={1} />
      </linearGradient>
      {safeData.map((entry, index) => (
        <linearGradient
          key={`gradient-${index}`}
          id={`barGradient-${index}`}
          x1="0" y1="0" x2="1" y2="0"
        >
          <stop offset="0%" stopColor={entry.color || '#4DC3FF'} stopOpacity={0.8} />
          <stop offset="100%" stopColor={entry.color || '#4DC3FF'} stopOpacity={1} />
        </linearGradient>
      ))}
      {safeData.map((entry, index) => (
        <linearGradient
          key={`active-gradient-${index}`}
          id={`activeBarGradient-${index}`}
          x1="0" y1="0" x2="1" y2="0"
        >
          <stop offset="0%" stopColor={entry.activeColor || entry.color || '#28E0B0'} stopOpacity={0.8} />
          <stop offset="100%" stopColor={entry.activeColor || entry.color || '#28E0B0'} stopOpacity={1} />
        </linearGradient>
      ))}
    </defs>
  );

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">
          Arrival in (Days)
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

      <div className="chart-wrapper timeline-chart">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" aspect={null}>
            <BarChart 
              data={safeData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredBar(null)}
              className="chart-transition"
            >
              {renderGradients()}
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(244, 244, 244, 0.05)" 
                horizontal={false} 
              />
              <XAxis 
                type="number" 
                stroke="#f4f4f4"
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                dataKey="range" 
                type="category" 
                stroke="#f4f4f4" 
                width={80}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                cursor={false}
                content={<CustomTooltip />}
                isAnimationActive={false}
              />
              <Bar 
                dataKey="vessels" 
                barSize={32}
                className="timeline-bar clickable-bar"
                fill="url(#defaultBarGradient)"
                isAnimationActive={false}
                onClick={handleBarClick}
              >
                {safeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.range === activeFilter 
                      ? `url(#activeBarGradient-${index})` 
                      : `url(#barGradient-${index})`}
                    className={`timeline-cell ${hoveredBar === index ? 'hovered' : ''} ${entry.range === activeFilter ? 'active' : ''}`}
                  />
                ))}
                <LabelList 
                  dataKey="vessels" 
                  position="right" 
                  fill="#f4f4f4"
                  className="timeline-label"
                  formatter={(value) => `${value}`}
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-no-data">No arrival timeline data available</div>
        )}
      </div>
    </div>
  );
};

export default ArrivalTimelineChart;