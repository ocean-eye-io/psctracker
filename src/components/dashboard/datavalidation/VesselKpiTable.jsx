// src/components/dashboard/datavalidation/VesselKpiTable.jsx
import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import '../DashboardStyles.css';
import '../../common/Table/tableStyles.css';

const VesselKpiTable = ({ metrics }) => {
  // Calculate vessel type statistics
  const vesselTypeStats = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    const typeMap = new Map();
    
    // Group vessels by type
    metrics.forEach(vessel => {
      const type = vessel.vessel_type || 'Unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          vessel_type: type,
          count: 0,
          avg_completeness: 0,
          avg_correctness: 0,
          avg_freshness: 0,
          avg_overall: 0,
          total_issues: 0,
          critical_count: 0,
          excellent_count: 0
        });
      }
      
      const stats = typeMap.get(type);
      stats.count++;
      stats.avg_completeness += vessel.completeness || 0;
      stats.avg_correctness += vessel.correctness || 0;
      stats.avg_freshness += vessel.freshness || 0;
      stats.avg_overall += vessel.overall_score || 0;
      stats.total_issues += vessel.issue_count || 0;
      
      if (vessel.overall_score < 70 && vessel.overall_score > 0) {
        stats.critical_count++;
      }
      
      if (vessel.overall_score >= 90) {
        stats.excellent_count++;
      }
    });
    
    // Calculate averages
    const result = Array.from(typeMap.values()).map(stats => ({
      ...stats,
      avg_completeness: Math.round(stats.avg_completeness / stats.count),
      avg_correctness: Math.round(stats.avg_correctness / stats.count),
      avg_freshness: Math.round(stats.avg_freshness / stats.count),
      avg_overall: Math.round(stats.avg_overall / stats.count),
      excellent_percentage: Math.round((stats.excellent_count / stats.count) * 100),
      critical_percentage: Math.round((stats.critical_count / stats.count) * 100)
    }));
    
    // Sort by vessel count descending
    return result.sort((a, b) => b.count - a.count);
  }, [metrics]);

  // Function to determine score color
  const getScoreColor = (score) => {
    if (score >= 90) return '#2ECC71';
    if (score >= 70) return '#3498DB';
    if (score >= 50) return '#F1C40F';
    return '#E74C3C';
  };

  // Function to get trend icon based on comparison
  const getTrendIcon = (value, threshold) => {
    if (value >= threshold) {
      return <TrendingUp size={16} color="#2ECC71" />;
    }
    return <TrendingDown size={16} color="#E74C3C" />;
  };

  return (
    <div className="vessel-kpi-container">
      <div className="kpi-header">
        <div className="kpi-title">
          <BarChart2 size={20} />
          <h3>Vessel Type KPI Summary</h3>
        </div>
        <div className="kpi-subtitle">
          Data quality metrics aggregated by vessel type
        </div>
      </div>

      {vesselTypeStats.length === 0 ? (
        <div className="no-kpi-data">
          <AlertCircle size={24} />
          <p>No vessel data available for KPI analysis</p>
        </div>
      ) : (
        <div className="kpi-table-wrapper">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>Vessel Type</th>
                <th>Count</th>
                <th>Overall Score</th>
                <th>Completeness</th>
                <th>Correctness</th>
                <th>Freshness</th>
                <th>Issues</th>
                <th>Critical %</th>
                <th>Excellent %</th>
              </tr>
            </thead>
            <tbody>
              {vesselTypeStats.map((typeStats, index) => (
                <tr key={`vessel-type-${index}`}>
                  <td className="vessel-type-cell">
                    <span className="vessel-type-name">{typeStats.vessel_type}</span>
                  </td>
                  <td className="count-cell">{typeStats.count}</td>
                  <td className="score-cell">
                    <div className="score-with-trend">
                      <span 
                        className="score-value" 
                        style={{ color: getScoreColor(typeStats.avg_overall) }}
                      >
                        {typeStats.avg_overall}%
                      </span>
                      {getTrendIcon(typeStats.avg_overall, 70)}
                    </div>
                  </td>
                  <td className="score-cell">
                    <span 
                      className="score-value" 
                      style={{ color: getScoreColor(typeStats.avg_completeness) }}
                    >
                      {typeStats.avg_completeness}%
                    </span>
                  </td>
                  <td className="score-cell">
                    <span 
                      className="score-value" 
                      style={{ color: getScoreColor(typeStats.avg_correctness) }}
                    >
                      {typeStats.avg_correctness}%
                    </span>
                  </td>
                  <td className="score-cell">
                    <span 
                      className="score-value" 
                      style={{ color: getScoreColor(typeStats.avg_freshness) }}
                    >
                      {typeStats.avg_freshness}%
                    </span>
                  </td>
                  <td className="issues-cell">
                    <span className={`issues-badge ${typeStats.total_issues > 0 ? 'has-issues' : 'no-issues'}`}>
                      {typeStats.total_issues}
                    </span>
                  </td>
                  <td className="percentage-cell">
                    <div className="percentage-bar-container">
                      <div 
                        className="percentage-bar critical-bar" 
                        style={{ width: `${typeStats.critical_percentage}%` }}
                      ></div>
                      <span className="percentage-value">{typeStats.critical_percentage}%</span>
                    </div>
                  </td>
                  <td className="percentage-cell">
                    <div className="percentage-bar-container">
                      <div 
                        className="percentage-bar excellent-bar" 
                        style={{ width: `${typeStats.excellent_percentage}%` }}
                      ></div>
                      <span className="percentage-value">{typeStats.excellent_percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .vessel-kpi-container {
          background: var(--card-bg, #112032);
          border-radius: 12px;
          border: 1px solid var(--border-color, rgba(244, 244, 244, 0.1));
          overflow: hidden;
          margin-bottom: 2rem;
        }
        
        .kpi-header {
          padding: 1.5rem;
          background: var(--header-bg, linear-gradient(180deg, #0a1725, #112032));
          border-bottom: 1px solid var(--border-color, rgba(244, 244, 244, 0.1));
        }
        
        .kpi-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--primary-color, #3BADE5);
          margin-bottom: 0.5rem;
        }
        
        .kpi-title h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }
        
        .kpi-subtitle {
          color: var(--muted-color, rgba(244, 244, 244, 0.7));
          font-size: 0.9rem;
        }
        
        .no-kpi-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--muted-color, rgba(244, 244, 244, 0.7));
          gap: 1rem;
        }
        
        .kpi-table-wrapper {
          overflow-x: auto;
          padding: 0.5rem;
        }
        
        .kpi-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.9rem;
        }
        
        .kpi-table th {
          text-align: left;
          padding: 1rem;
          background: var(--table-header-bg, rgba(10, 23, 37, 0.6));
          color: var(--text-color, #f4f4f4);
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid var(--border-color, rgba(244, 244, 244, 0.1));
        }
        
        .kpi-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color, rgba(244, 244, 244, 0.05));
          color: var(--text-color, #f4f4f4);
        }
        
        .kpi-table tr:hover td {
          background: var(--row-hover-bg, rgba(59, 173, 229, 0.05));
        }
        
        .vessel-type-cell {
          font-weight: 600;
          min-width: 150px;
        }
        
        .count-cell {
          font-weight: 600;
          text-align: center;
        }
        
        .score-cell {
          text-align: center;
        }
        
        .score-with-trend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .score-value {
          font-weight: 600;
          font-size: 1rem;
        }
        
        .issues-cell {
          text-align: center;
        }
        
        .issues-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
          min-width: 30px;
          text-align: center;
        }
        
        .issues-badge.has-issues {
          background: rgba(231, 76, 60, 0.2);
          color: #E74C3C;
        }
        
        .issues-badge.no-issues {
          background: rgba(46, 204, 113, 0.2);
          color: #2ECC71;
        }
        
        .percentage-cell {
          min-width: 120px;
        }
        
        .percentage-bar-container {
          position: relative;
          height: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .percentage-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        
        .critical-bar {
          background: linear-gradient(90deg, rgba(231, 76, 60, 0.7), rgba(231, 76, 60, 0.3));
        }
        
        .excellent-bar {
          background: linear-gradient(90deg, rgba(46, 204, 113, 0.7), rgba(46, 204, 113, 0.3));
        }
        
        .percentage-value {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-color, #f4f4f4);
          font-weight: 600;
          font-size: 0.85rem;
        }
        
        @media (max-width: 768px) {
          .kpi-table {
            font-size: 0.8rem;
          }
          
          .kpi-table th, .kpi-table td {
            padding: 0.75rem 0.5rem;
          }
          
          .score-value {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default VesselKpiTable;