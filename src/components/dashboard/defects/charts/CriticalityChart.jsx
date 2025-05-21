// src/components/dashboard/defects/charts/CriticalityChart.jsx
import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
// Import chart styles - ensure this path is correct
import '../../../common/charts/styles/chartStyles.css';

const CriticalityChart = ({ data = [] }) => {
  const criticalityData = useMemo(() => {
    const counts = { 'High': 0, 'Medium': 0, 'Low': 0 };
    data.forEach(defect => {
      const criticality = defect.Criticality;
      if (criticality in counts) {
        counts[criticality]++;
      }
    });
    return [
      { name: 'High', value: counts['High'], color: 'var(--negative-color)' },
      { name: 'Medium', value: counts['Medium'], color: 'var(--warning-color)' },
      { name: 'Low', value: counts['Low'], color: 'var(--info-color)' }
    ];
  }, [data]);

  const totalCriticality = useMemo(() => {
    return criticalityData.reduce((sum, item) => sum + item.value, 0);
  }, [criticalityData]);

  const criticalityByStatus = useMemo(() => {
    const result = {
      High: { open: 0, inProgress: 0, closed: 0 },
      // Medium and Low can be added if needed for other features
    };
    data.forEach(defect => {
      const criticality = defect.Criticality || 'Unknown';
      const status = (defect.Status || 'Unknown').toUpperCase();
      if (criticality === 'High') {
        if (status === 'OPEN') {
          result.High.open++;
        } else if (status === 'IN PROGRESS') {
          result.High.inProgress++;
        } else if (status === 'CLOSED') {
          result.High.closed++;
        }
      }
    });
    return result;
  }, [data]);

  const renderMainProgressBar = () => {
    if (totalCriticality === 0) return null;

    return (
      <div className="image-target-progress-bar">
        {criticalityData.map(item => {
          const percent = totalCriticality > 0 ? (item.value / totalCriticality) * 100 : 0;
          if (percent === 0) return null;
          return (
            <div
              key={item.name}
              style={{ width: `${percent}%`, backgroundColor: item.color }}
              title={`${item.name}: ${item.value} (${percent.toFixed(1)}%)`}
            ></div>
          );
        })}
      </div>
    );
  };

  const renderHighCriticalityStatusSection = () => {
    const highCritData = criticalityData.find(c => c.name === 'High');
    const totalHighCriticality = highCritData ? highCritData.value : 0;

    const statusItems = [
      { name: 'Open', value: criticalityByStatus.High.open, color: 'var(--negative-color)' },
      { name: 'In Progress', value: criticalityByStatus.High.inProgress, color: 'var(--warning-color)' },
      { name: 'Closed', value: criticalityByStatus.High.closed, color: 'var(--positive-color)' }
    ];

    return (
      <>
        <div className="image-target-subheader">
          <AlertTriangle size={16} className="image-target-subheader-icon" />
          <span>High Criticality Status</span>
        </div>
        <div className="image-target-high-crit-summary">
          {statusItems.map(item => (
            <div key={item.name} className="image-target-high-crit-item">
              <div className="image-target-status-dot" style={{ backgroundColor: item.color }}></div>
              <span>{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
        {totalHighCriticality > 0 && (
          <div className="image-target-progress-bar">
            {statusItems.map(item => {
              const percent = totalHighCriticality > 0 ? (item.value / totalHighCriticality) * 100 : 0;
              if (percent === 0) return null;
              return (
                <div
                  key={item.name}
                  style={{ width: `${percent}%`, backgroundColor: item.color }}
                  title={`${item.name}: ${item.value} (${percent.toFixed(1)}%)`}
                ></div>
              );
            })}
          </div>
        )}
        {totalHighCriticality === 0 && (
             <div className="image-target-no-high-crit-message">
                No high criticality defects to display status for.
             </div>
        )}
      </>
    );
  };

  if (!data) { // Simpler check if data is not yet available (parent handles loading)
    return (
      <div className="image-target-criticality-layout image-target-no-data-container">
        <AlertTriangle size={24} />
        <p>Loading data...</p>
      </div>
    );
  }

  if (data.length === 0 && totalCriticality === 0) {
    return (
      <div className="image-target-criticality-layout image-target-no-data-container">
        <AlertTriangle size={24} />
        <p>No defect data available to display criticality.</p>
      </div>
    );
  }

  return (
    <div className="image-target-criticality-layout">
      <h3 className="image-target-title">Criticality Breakdown</h3>

      <div className="image-target-values">
        {criticalityData.map(item => (
          <div key={item.name} className="image-target-value-item">
            <div className="image-target-value-number" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="image-target-value-label">
              {item.name}
            </div>
          </div>
        ))}
      </div>

      {renderMainProgressBar()}
      {renderHighCriticalityStatusSection()}
    </div>
  );
};

export default CriticalityChart;