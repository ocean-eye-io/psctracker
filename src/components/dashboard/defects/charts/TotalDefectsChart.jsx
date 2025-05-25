import React, { useMemo } from 'react';

const TotalDefectsChart = ({ data = [] }) => {
  // Process data for the status chart
  const statusData = useMemo(() => {
    const counts = {};
    let overdueCount = 0; // Separate counter for overdue defects

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    data.forEach(defect => {
      const status = defect.Status || 'Unknown';
      const normalizedStatus = status.toUpperCase();

      // Increment count for the original status
      if (!counts[normalizedStatus]) {
        counts[normalizedStatus] = 0;
      }
      counts[normalizedStatus]++;

      // Check for overdue condition independently
      if (defect.target_date && normalizedStatus !== 'CLOSED') {
        const targetDate = new Date(defect.target_date);
        targetDate.setHours(0, 0, 0, 0); // Normalize target date

        if (targetDate < today) {
          overdueCount++; // Increment overdue count
        }
      }
    });

    // Add OVERDUE to the counts object as a separate entry
    if (overdueCount > 0) {
      counts['OVERDUE'] = overdueCount;
    }

    return Object.entries(counts)
      .map(([status, value]) => {
        let color;
        // Using CSS variables for consistency
        if (status === 'OVERDUE') {
          color = 'var(--negative-color)'; // Danger color for overdue
        } else if (status === 'OPEN') {
          color = 'var(--negative-color)'; // Red for Open
        } else if (status === 'IN PROGRESS') {
          color = 'var(--warning-color)'; // Yellow for In Progress
        } else if (status === 'CLOSED') {
          color = 'var(--positive-color)'; // Green for Closed
        } else {
          color = 'var(--accent-tertiary)'; // Default blue for Unknown
        }

        return { name: status, value, color };
      })
      .sort((a, b) => {
        // Define a specific order for known statuses as per screenshot
        const order = { 'OVERDUE': 1, 'OPEN': 2, 'IN PROGRESS': 3, 'CLOSED': 4 };
        const orderA = order[a.name] || 99; // Assign a high number for unknown statuses
        const orderB = order[b.name] || 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name); // Alphabetical for same order or unknown
      });
  }, [data]);

  // Calculate total defects
  const totalDefects = useMemo(() => data.length, [data]);

  // Calculate percentage for each status
  const getPercentage = (count) => {
    return totalDefects > 0 ? ((count / totalDefects) * 100).toFixed(1) : 0;
  };

  return (
    <div className="chart-card">
      {/* Chart Header */}
      <div className="chart-header">
        <h3 className="chart-title">
          TOTAL DEFECTS
          <span className="chart-title-highlight"></span>
        </h3>
      </div>

      {/* Chart Wrapper */}
      <div className="chart-wrapper">
        {/* Total Defect count at the top, using total-defects-header */}
        <div className="total-defects-header">
          <h4 className="total-defects-title">TOTAL DEFECTS</h4>
          <span className="total-defects-value">{totalDefects}</span>
        </div>

        {/* Status rows - adapted to fit compact design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {statusData.map(statusItem => (
            <div key={statusItem.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: '500',
                }}>
                  {statusItem.name}
                </div>
                <div style={{
                  color: statusItem.color,
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'baseline'
                }}>
                  {statusItem.value}{' '}
                  <span style={{ fontSize: '10px', color: 'rgba(244, 244, 244, 0.6)', marginLeft: '4px' }}>
                    ({getPercentage(statusItem.value)}%)
                  </span>
                </div>
              </div>
              <div className="horizontal-bar-container">
                <div
                  className="horizontal-bar"
                  style={{
                    width: `${Math.min(100, getPercentage(statusItem.value))}%`,
                    backgroundColor: statusItem.color,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TotalDefectsChart;