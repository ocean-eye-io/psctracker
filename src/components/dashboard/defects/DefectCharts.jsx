import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import '../../common/charts/styles/chartStyles.css';

const DefectCharts = ({ data = [] }) => {
  // Process data for charts
  const chartData = useMemo(() => {
    // Skip processing if no data
    if (!data || data.length === 0) {
      return {
        statusData: [],
        criticalityData: [],
        equipmentData: []
      };
    }

    // Status distribution
    const statusCounts = {
      'OPEN': 0,
      'IN PROGRESS': 0,
      'CLOSED': 0
    };
    
    // Criticality distribution
    const criticalityCounts = {
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    // Equipment distribution
    const equipmentCounts = {};
    
    // Process each defect
    data.forEach(defect => {
      // Count by status
      if (defect.status in statusCounts) {
        statusCounts[defect.status]++;
      }
      
      // Count by criticality
      if (defect.criticality in criticalityCounts) {
        criticalityCounts[defect.criticality]++;
      }
      
      // Count by equipment
      if (defect.equipment) {
        if (!equipmentCounts[defect.equipment]) {
          equipmentCounts[defect.equipment] = 1;
        } else {
          equipmentCounts[defect.equipment]++;
        }
      }
    });
    
    // Convert to arrays for charts
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    const criticalityData = Object.entries(criticalityCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    const equipmentData = Object.entries(equipmentCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 equipment types
    
    return {
      statusData,
      criticalityData,
      equipmentData
    };
  }, [data]);
  
  // Custom colors
  const COLORS = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12'];
  const CRITICALITY_COLORS = {
    'High': '#E74C3C',
    'Medium': '#F1C40F',
    'Low': '#3498DB'
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="tooltip-value" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
          <div className="tooltip-arrow"></div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="chart-row">
      {/* Status Distribution Chart */}
      <div className="chart-column">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              Status Distribution
              <span className="chart-title-highlight"></span>
            </h3>
            <div className="chart-actions">
              <button className="chart-action-btn">
                <PieChartIcon size={14} />
                <span>Pie</span>
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartData.statusData.length === 0 ? (
              <div className="chart-no-data">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    className="chart-pie"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.statusData.map((entry, index) => {
                      let color;
                      if (entry.name === 'OPEN') color = '#E74C3C';
                      else if (entry.name === 'IN PROGRESS') color = '#F1C40F';
                      else if (entry.name === 'CLOSED') color = '#2ECC71';
                      else color = COLORS[index % COLORS.length];
                      
                      return <Cell key={`cell-${index}`} fill={color} className="chart-transition" />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      
      {/* Criticality Distribution Chart */}
      <div className="chart-column">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              Criticality Distribution
              <span className="chart-title-highlight"></span>
            </h3>
            <div className="chart-actions">
              <button className="chart-action-btn">
                <BarChart2 size={14} />
                <span>Bar</span>
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartData.criticalityData.length === 0 ? (
              <div className="chart-no-data">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.criticalityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Count" 
                    className="chart-bar"
                  >
                    {chartData.criticalityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CRITICALITY_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      
      {/* Equipment Distribution Chart */}
      <div className="chart-column">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">
              Top Equipment Types
              <span className="chart-title-highlight"></span>
            </h3>
            <div className="chart-actions">
              <button className="chart-action-btn">
                <BarChart2 size={14} />
                <span>Bar</span>
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartData.equipmentData.length === 0 ? (
              <div className="chart-no-data">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.equipmentData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    name="Count" 
                    fill="#3BADE5" 
                    className="chart-bar"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefectCharts;