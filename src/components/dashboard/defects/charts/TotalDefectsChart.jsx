// src/components/dashboard/defects/charts/TotalDefectsChart.jsx - Compact Redesign
import React, { useMemo } from 'react';
import { TrendingUp, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const TotalDefectsChart = ({ data = [] }) => {
  const statusData = useMemo(() => {
    const counts = { 'OPEN': 0, 'IN PROGRESS': 0, 'CLOSED': 0 };
    
    data.forEach(defect => {
      const status = (defect['Status (Vessel)'] || defect.Status || 'Unknown').toUpperCase();
      if (status in counts) {
        counts[status]++;
      }
    });

    return [
      { 
        name: 'OPEN', 
        value: counts['OPEN'], 
        color: '#E74C3C', 
        bgColor: 'rgba(231, 76, 60, 0.1)',
        icon: AlertCircle,
        label: 'Open'
      },
      { 
        name: 'IN PROGRESS', 
        value: counts['IN PROGRESS'], 
        color: '#F1C40F', 
        bgColor: 'rgba(241, 196, 15, 0.1)',
        icon: Clock,
        label: 'In Progress'
      },
      { 
        name: 'CLOSED', 
        value: counts['CLOSED'], 
        color: '#2ECC71', 
        bgColor: 'rgba(46, 204, 113, 0.1)',
        icon: CheckCircle,
        label: 'Closed'
      }
    ];
  }, [data]);

  const totalDefects = useMemo(() => data.length, [data]);
  const activeDefects = useMemo(() => {
    return statusData[0].value + statusData[1].value; // Open + In Progress
  }, [statusData]);
  
  const completionRate = useMemo(() => {
    return totalDefects > 0 ? (statusData[2].value / totalDefects * 100) : 0;
  }, [statusData, totalDefects]);

  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.noDataContainer}>
          <Activity size={24} color="#6c757d" />
          <p style={styles.noDataText}>No defect data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with main metrics */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <Activity size={16} color="#3BADE5" />
          <h3 style={styles.title}>Total Defects</h3>
        </div>
        <div style={styles.mainMetric}>
          <span style={styles.totalNumber}>{totalDefects}</span>
          <div style={styles.subMetrics}>
            <div style={styles.subMetric}>
              <span style={{...styles.subValue, color: '#E74C3C'}}>{activeDefects}</span>
              <span style={styles.subLabel}>Active</span>
            </div>
            <div style={styles.subMetric}>
              <span style={{...styles.subValue, color: '#2ECC71'}}>{completionRate.toFixed(1)}%</span>
              <span style={styles.subLabel}>Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Status Cards */}
      <div style={styles.statusRow}>
        {statusData.map((status) => {
          const percentage = totalDefects > 0 ? (status.value / totalDefects * 100) : 0;
          const IconComponent = status.icon;
          
          return (
            <div key={status.name} style={{...styles.statusCard, backgroundColor: status.bgColor}}>
              <div style={styles.statusHeader}>
                <IconComponent size={14} color={status.color} />
                <span style={styles.statusPercentage}>{percentage.toFixed(1)}%</span>
              </div>
              <div style={{...styles.statusValue, color: status.color}}>{status.value}</div>
              <div style={styles.statusLabel}>{status.label}</div>
            </div>
          );
        })}
      </div>

      {/* Progress visualization */}
      <div style={styles.progressSection}>
        <div style={styles.progressBar}>
          {statusData.map(status => {
            const percent = totalDefects > 0 ? (status.value / totalDefects) * 100 : 0;
            if (percent === 0) return null;
            return (
              <div
                key={status.name}
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  backgroundColor: status.color,
                  transition: 'all 0.4s ease'
                }}
                title={`${status.label}: ${status.value} (${percent.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div style={styles.progressLabels}>
          <span style={styles.progressLabelLeft}>Status Distribution</span>
          <span style={styles.progressLabelRight}>
            {activeDefects > 0 && (
              <>
                <TrendingUp size={10} color="#E74C3C" />
                {activeDefects} pending
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: 'rgba(14, 30, 47, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(244, 244, 244, 0.05)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '280px',
    overflow: 'hidden'
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
    color: '#f4f4f4',
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    background: 'linear-gradient(135deg, #3BADE5, #2A95C5)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  
  mainMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  totalNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#3BADE5',
    lineHeight: 1
  },
  
  subMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  
  subMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  subValue: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: 1
  },
  
  subLabel: {
    fontSize: '9px',
    color: 'rgba(244, 244, 244, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  statusRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    flex: 1
  },
  
  statusCard: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'all 0.3s ease',
    cursor: 'default',
    minHeight: '80px'
  },
  
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  statusPercentage: {
    fontSize: '10px',
    color: 'rgba(244, 244, 244, 0.6)',
    fontWeight: '500'
  },
  
  statusValue: {
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: 1,
    marginTop: '2px'
  },
  
  statusLabel: {
    fontSize: '10px',
    color: 'rgba(244, 244, 244, 0.8)',
    fontWeight: '500',
    marginTop: 'auto'
  },
  
  progressSection: {
    marginTop: 'auto'
  },
  
  progressBar: {
    display: 'flex',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px'
  },
  
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  progressLabelLeft: {
    fontSize: '10px',
    color: 'rgba(244, 244, 244, 0.6)',
    fontWeight: '500'
  },
  
  progressLabelRight: {
    fontSize: '9px',
    color: 'rgba(244, 244, 244, 0.6)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
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
    color: 'rgba(244, 244, 244, 0.6)',
    fontSize: '12px',
    margin: 0
  }
};

export default TotalDefectsChart;