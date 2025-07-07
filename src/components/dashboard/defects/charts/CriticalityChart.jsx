// src/components/dashboard/defects/charts/CriticalityChart.jsx - Light Theme Version
import React, { useMemo } from 'react';
import { AlertTriangle, Clock, Shield, Target } from 'lucide-react';

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
      { name: 'High', value: counts['High'], color: '#dc3545', icon: AlertTriangle },
      { name: 'Medium', value: counts['Medium'], color: '#ffc107', icon: Clock },
      { name: 'Low', value: counts['Low'], color: '#007bff', icon: Shield }
    ];
  }, [data]);

  const totalCriticality = useMemo(() => {
    return criticalityData.reduce((sum, item) => sum + item.value, 0);
  }, [criticalityData]);

  const highPriorityCount = criticalityData[0]?.value || 0;
  const criticalRatio = useMemo(() => {
    return totalCriticality > 0 ? (highPriorityCount / totalCriticality * 100) : 0;
  }, [highPriorityCount, totalCriticality]);

  const urgentDefects = useMemo(() => {
    return data.filter(defect => 
      defect.Criticality === 'High' && 
      (defect.Status || defect['Status (Vessel)'] || '').toUpperCase() === 'OPEN'
    ).length;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.noDataContainer}>
          <Target size={24} color="#6c757d" />
          <p style={styles.noDataText}>No priority data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with key metrics */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <Target size={16} color="#007bff" />
          <h3 style={styles.title}>Criticality Breakdown</h3>
        </div>
        <div style={styles.keyMetrics}>
          <div style={styles.keyMetric}>
            <span style={{...styles.keyValue, color: '#dc3545'}}>{urgentDefects}</span>
            <span style={styles.keyLabel}>Urgent</span>
          </div>
          <div style={styles.keyMetric}>
            <span style={{...styles.keyValue, color: '#ffc107'}}>{criticalRatio.toFixed(1)}%</span>
            <span style={styles.keyLabel}>Critical</span>
          </div>
        </div>
      </div>

      {/* Compact Priority Grid */}
      <div style={styles.priorityGrid}>
        {criticalityData.map((item) => {
          const percentage = totalCriticality > 0 ? (item.value / totalCriticality * 100) : 0;
          const IconComponent = item.icon;
          
          return (
            <div key={item.name} style={styles.priorityCard}>
              <div style={styles.priorityTop}>
                <div style={{...styles.priorityIcon, backgroundColor: `${item.color}15`}}>
                  <IconComponent size={14} color={item.color} />
                </div>
                <span style={styles.priorityPercent}>{percentage.toFixed(0)}%</span>
              </div>
              <div style={{...styles.priorityValue, color: item.color}}>{item.value}</div>
              <div style={styles.priorityLabel}>{item.name}</div>
              
              {/* Mini progress indicator */}
              <div style={styles.miniBar}>
                <div 
                  style={{
                    ...styles.miniBarFill,
                    width: `${Math.max(percentage, 3)}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Distribution Horizontal Bar */}
      <div style={styles.distributionSection}>
        <div style={styles.progressBarSection}>
          <div style={styles.progressLabel}>Priority Trend</div>
          <div style={styles.horizontalProgressBar}>
            {criticalityData.map(item => {
              const percent = totalCriticality > 0 ? (item.value / totalCriticality) * 100 : 0;
              if (percent === 0) return null;
              return (
                <div
                  key={item.name}
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    transition: 'all 0.4s ease'
                  }}
                  title={`${item.name}: ${item.value} (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          
          {/* Legend below the bar */}
          <div style={styles.progressLegend}>
            {criticalityData.map(item => {
              const percentage = totalCriticality > 0 ? (item.value / totalCriticality * 100) : 0;
              if (percentage < 1) return null;
              return (
                <div key={item.name} style={styles.legendItem}>
                  <div style={{...styles.legendDot, backgroundColor: item.color}} />
                  <span style={styles.legendText}>
                    {item.name}: {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Light background
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.08)', // Light border
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '280px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' // Light shadow
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '4px'
  },
  
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  title: {
    color: '#333333', // Dark text on light background
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    background: 'linear-gradient(135deg, #333333, #555555)', // Dark gradient for text
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  
  keyMetrics: {
    display: 'flex',
    gap: '12px'
  },
  
  keyMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  
  keyValue: {
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: 1
  },
  
  keyLabel: {
    fontSize: '9px',
    color: 'rgba(51, 51, 51, 0.6)', // Muted dark text
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  priorityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '6px',
    marginBottom: '8px'
  },
  
  priorityCard: {
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)', // Very subtle light background
    borderRadius: '6px',
    border: '1px solid rgba(0, 0, 0, 0.05)', // Light border
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minHeight: '70px',
    transition: 'all 0.2s ease'
  },
  
  priorityTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  priorityIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  priorityPercent: {
    fontSize: '9px',
    color: 'rgba(51, 51, 51, 0.6)', // Muted dark text
    fontWeight: '500'
  },
  
  priorityValue: {
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: 1
  },
  
  priorityLabel: {
    fontSize: '9px',
    color: 'rgba(51, 51, 51, 0.8)', // Dark text
    fontWeight: '500'
  },
  
  miniBar: {
    width: '100%',
    height: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Light progress background
    borderRadius: '1px',
    overflow: 'hidden',
    marginTop: 'auto'
  },
  
  miniBarFill: {
    height: '100%',
    borderRadius: '1px',
    transition: 'width 0.6s ease'
  },
  
  distributionSection: {
    marginTop: 'auto'
  },
  
  progressBarSection: {
    width: '100%'
  },
  
  progressLabel: {
    fontSize: '10px',
    color: 'rgba(51, 51, 51, 0.6)', // Muted dark text
    fontWeight: '500',
    marginBottom: '6px'
  },
  
  horizontalProgressBar: {
    display: 'flex',
    height: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.08)', // Light progress background
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' // Light inner shadow
  },
  
  progressLegend: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  legendDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },
  
  legendText: {
    fontSize: '9px',
    color: 'rgba(51, 51, 51, 0.8)', // Dark text
    fontWeight: '500'
  },
  
  noDataContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '8px'
  },
  
  noDataText: {
    color: 'rgba(51, 51, 51, 0.6)', // Muted dark text
    fontSize: '12px',
    margin: 0
  }
};

export default CriticalityChart;