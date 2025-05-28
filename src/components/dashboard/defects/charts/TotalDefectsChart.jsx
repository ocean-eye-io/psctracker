// src/components/dashboard/defects/charts/TotalDefectsChart.jsx
import React, { useMemo } from 'react';
import { FilterIcon } from 'lucide-react'; // Import FilterIcon
import '../../../common/charts/styles/chartStyles.css'; // Import chart styles

const TotalDefectsChart = ({ data = [] }) => {
  // Process data for the status chart
  const statusData = useMemo(() => {
    const counts = {};

    data.forEach(defect => {
      const status = defect['Status (Vessel)'] || 'Unknown'; // Use the correct field name
      const normalizedStatus = status.toUpperCase(); // Normalize status here

      if (!counts[normalizedStatus]) {
        counts[normalizedStatus] = 0;
      }
      counts[normalizedStatus]++;
    });

    // Now map over the counts object
    return Object.entries(counts)
      .map(([status, value]) => { // 'status' here is the normalized status from the counts object key
        let color;
        if (status === 'OPEN') {
          color = '#E74C3C'; // Danger color
        } else if (status === 'IN PROGRESS') {
          color = '#F1C40F'; // Warning color
        } else if (status === 'CLOSED') {
          color = '#2ECC71'; // Success color
        } else {
          color = '#4DC3FF'; // Primary accent color
        }

        return { name: status, value, color }; // Use 'status' which is the normalized status
      })
      .sort((a, b) => {
        const order = { 'OPEN': 1, 'IN PROGRESS': 2, 'CLOSED': 3 };
        const orderA = order[a.name] || 4;
        const orderB = order[b.name] || 4;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      });
  }, [data]);

  // Calculate total defects
  const totalDefects = useMemo(() => data.length, [data]);

  // If no data is available
  if (!data || data.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Defect Status Overview</h3>
        </div>
        <div className="chart-no-data">
           <FilterIcon size={14} /> {/* Use FilterIcon */}
          <p>No defect data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Defect Status Overview</h3>
      </div>
      <div className="chart-wrapper total-defects-summary"> {/* Use chart-wrapper and a new class for this layout */}
        {/* Large central number for Total Defects */}
        <div className="total-defects-main-number">
          {totalDefects}
          <div className="total-defects-main-label">Total Defects</div>
        </div>

        {/* Container for status indicators */}
        <div className="status-indicators-container">
          {statusData.map(status => (
            <div key={status.name} className="status-indicator-item">
              <div className="status-indicator-value" style={{ color: status.color }}>
                {status.value}
              </div>
              <div className="status-indicator-label">{status.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TotalDefectsChart;