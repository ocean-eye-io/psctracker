// src/components/dashboard/defects/StatsCards.jsx
import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';

const StatsCards = ({ data = [] }) => {
  // Count by status
  const statusCounts = useMemo(() => {
    const counts = {
      'OPEN': 0,
      'IN PROGRESS': 0,
      'CLOSED': 0
    };
    
    data.forEach(defect => {
      const status = defect['Status (Vessel)'];
      if (status in counts) {
        counts[status]++;
      }
    });
    
    return counts;
  }, [data]);
  
  // Count by criticality
  const criticalityCounts = useMemo(() => {
    const counts = {
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    
    data.forEach(defect => {
      const criticality = defect.Criticality;
      if (criticality in counts) {
        counts[criticality]++;
      }
    });
    
    return counts;
  }, [data]);
  
  // Count overdue defects
  const overdueCount = useMemo(() => {
    const today = new Date();
    
    return data.filter(defect => {
      if (defect['Status (Vessel)'] === 'CLOSED') {
        return false;
      }
      
      const targetDate = defect.target_date ? new Date(defect.target_date) : null;
      if (!targetDate) return false;
      
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today;
    }).length;
  }, [data]);

  // Calculate total and percentages
  const totalDefects = data.length;
  const overduePercentage = totalDefects > 0 ? (overdueCount / totalDefects) * 100 : 0;

  // Prepare data for pie chart
  const pieChartData = [
    { name: 'High', value: criticalityCounts.High, color: '#E74C3C' },
    { name: 'Medium', value: criticalityCounts.Medium, color: '#F1C40F' },
    { name: 'Low', value: criticalityCounts.Low, color: '#3498DB' }
  ];

  const styles = {
    container: {
      width: '100%',
      display: 'flex',
      backgroundColor: '#05111E',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      color: '#f4f4f4'
    },
    leftColumn: {
      flex: '1',
      paddingLeft: '20px',
      paddingRight: '20px',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)'
    },
    rightColumn: {
      flex: '1',
      paddingLeft: '20px',
      paddingRight: '20px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'normal',
      marginBottom: '10px',
      marginTop: '20px'
    },
    sectionIcon: {
      marginRight: '10px',
      color: '#3BADE5'
    },
    bigNumber: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '20px',
      marginTop: '10px'
    },
    subTitle: {
      fontSize: '16px',
      marginBottom: '10px',
      marginTop: '20px'
    },
    statusRow: {
      marginBottom: '10px'
    },
    statusLabel: {
      fontSize: '14px',
      color: 'rgba(244, 244, 244, 0.8)'
    },
    statusValue: {
      fontSize: '20px',
      fontWeight: 'bold'
    },
    overdueRow: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '25px',
      marginBottom: '20px'
    },
    overdueLabel: {
      fontSize: '16px',
      marginRight: '10px'
    },
    overdueNumber: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#E67E22',
      marginRight: '4px'
    },
    overduePercent: {
      color: 'rgba(244, 244, 244, 0.6)',
      fontSize: '14px'
    },
    criticalityRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '10px',
      marginBottom: '20px'
    },
    criticalityItem: {
      textAlign: 'left'
    },
    criticalityLabel: {
      fontSize: '14px',
      color: 'rgba(244, 244, 244, 0.8)',
      marginBottom: '5px'
    },
    criticalityHighValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#E74C3C'
    },
    criticalityMediumValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#F1C40F'
    },
    criticalityLowValue: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#3498DB'
    },
    chartContainer: {
      height: '160px',
      marginTop: '15px',
      position: 'relative'
    },
    chartOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    },
    chartLabel: {
      position: 'absolute',
      color: 'rgba(244, 244, 244, 0.8)',
      fontSize: '12px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Left Column - Total Defects */}
      <div style={styles.leftColumn}>
        <h3 style={styles.sectionTitle}>
          <svg style={styles.sectionIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3BADE5" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
          Total Defects
        </h3>
        
        <div style={styles.bigNumber}>{totalDefects}</div>
        
        <div style={styles.subTitle}>Status Distribution</div>
        
        <div style={styles.statusRow}>
          <div style={styles.statusLabel}>Open</div>
          <div style={styles.statusValue}>{statusCounts.OPEN || 0}</div>
        </div>
        
        <div style={styles.statusRow}>
          <div style={styles.statusLabel}>In Progress</div>
          <div style={styles.statusValue}>{statusCounts['IN PROGRESS'] || 0}</div>
        </div>
        
        <div style={styles.statusRow}>
          <div style={styles.statusLabel}>Closed</div>
          <div style={styles.statusValue}>{statusCounts.CLOSED || 0}</div>
        </div>
        
        <div style={styles.overdueRow}>
          <div style={styles.overdueLabel}>Overdue</div>
          <div style={styles.overdueNumber}>{overdueCount}</div>
          <div style={styles.overduePercent}>({overduePercentage.toFixed(1)}%)</div>
        </div>
      </div>
      
      {/* Right Column - Criticality Breakdown */}
      <div style={styles.rightColumn}>
        <h3 style={styles.sectionTitle}>
          <svg style={styles.sectionIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3BADE5" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
          </svg>
          Criticality Breakdown
        </h3>
        
        <div style={styles.criticalityRow}>
          <div style={styles.criticalityItem}>
            <div style={styles.criticalityLabel}>High</div>
            <div style={styles.criticalityHighValue}>{criticalityCounts.High}</div>
          </div>
          
          <div style={styles.criticalityItem}>
            <div style={styles.criticalityLabel}>Medium</div>
            <div style={styles.criticalityMediumValue}>{criticalityCounts.Medium}</div>
          </div>
          
          <div style={styles.criticalityItem}>
            <div style={styles.criticalityLabel}>Low</div>
            <div style={styles.criticalityLowValue}>{criticalityCounts.Low}</div>
          </div>
        </div>
        
        {/* Donut Chart */}
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={0}
                dataKey="value"
                cornerRadius={0}
              >
                {pieChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="#05111E"
                    strokeWidth={0.5}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Chart Labels */}
          <div style={{
            ...styles.chartLabel,
            top: '50%',
            left: '10%',
          }}>
            High: {criticalityCounts.High}
          </div>
          
          <div style={{
            ...styles.chartLabel,
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            Medium: {criticalityCounts.Medium}
          </div>
          
          <div style={{
            ...styles.chartLabel,
            top: '50%',
            right: '10%',
          }}>
            Low: {criticalityCounts.Low}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;