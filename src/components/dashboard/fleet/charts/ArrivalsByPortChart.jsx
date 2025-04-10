import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import ResponsiveChartContainer from '../../../common/charts/ResponsiveChartContainer';
import '../../../common/charts/styles/chartStyles.css';

const ArrivalsByPortChart = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
  
  // Chart gradients definition
  const renderGradients = () => (
    <defs>
      <linearGradient id="portBarGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4DC3FF" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#3BADE5" stopOpacity={0.6} />
      </linearGradient>
    </defs>
  );
  
  return (
    <ResponsiveChartContainer
      title="Vessels by Port"
      loading={loading}
      expandable={false} // Add this prop to disable expansion
    >
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
            fill="url(#portBarGradient)"
            className="chart-bar"
            radius={[6, 6, 0, 0]}
            barSize={20}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ResponsiveChartContainer>
  );
};

export default ArrivalsByPortChart;