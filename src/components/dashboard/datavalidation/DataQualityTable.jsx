// src/components/dashboard/datavalidation/DataQualityTable.jsx
import React from 'react';
import Table from '../../common/Table/Table';
import { ExternalLink, AlertTriangle, Check, Clock, Database, Ship } from 'lucide-react';

const DataQualityTable = ({ metrics, fieldMappings }) => {
  // Function to determine badge class based on score
  const getScoreBadgeClass = (score) => {
    if (score >= 90) return 'badge-success';
    if (score >= 70) return 'badge-warning';
    return 'badge-danger';
  };

  // Function to determine status indicator color
  const getStatusColor = (score) => {
    if (score >= 90) return '#2ECC71'; // Green for good
    if (score >= 70) return '#F1C40F'; // Yellow for warning
    return '#E74C3C'; // Red for critical
  };

  // Convert field mappings to table columns format
  const getColumns = () => {
    return Object.entries(fieldMappings.TABLE)
      .filter(([_, field]) => !field.isAction)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => ({
        field: field.dbField,
        label: field.label,
        // Use 'width' if defined, otherwise fallback to 'minWidth' for responsiveness
        width: field.width || field.minWidth, 
        minWidth: field.minWidth, // Keep minWidth for responsiveness
        sortable: true,
        render: (value, rowData) => {
          // Vessel Name column with status indicator
          if (fieldId === 'vessel_name') {
            return (
              <div className="status-indicator">
                <span 
                  className="status-dot"
                  style={{ background: getStatusColor(rowData.overall_score) }}
                ></span>
                {value || '-'}
              </div>
            );
          }
          
          // IMO Number column
          if (fieldId === 'vessel_imo') {
            return value || '-';
          }
          
          // Vessel Type column
          if (fieldId === 'vessel_type') {
            return (
              <div className="vessel-type">
                {/* <Ship size={14} className="mr-1" /> */}
                <span>{value || 'Unknown'}</span>
              </div>
            );
          }
          
          // Quality score columns (completeness, correctness, freshness, overall)
          if (['completeness', 'correctness', 'freshness', 'overall_score'].includes(fieldId)) {
            const score = value !== null && value !== undefined ? Math.round(value) : null;
            
            // If this is a placeholder with no data, show "N/A" instead of 0%
            if (score === 0 && rowData.issue_type && 
                (rowData.issue_type === 'No Data' || 
                 rowData.issue_type === 'API Error' || 
                 rowData.issue_type === 'Processing Error')) {
              return <span className="no-data">N/A</span>;
            }
            
            return (
              <span className={`badge ${getScoreBadgeClass(score)}`}>
                {score !== null ? `${score}%` : '-'}
              </span>
            );
          }
          
          // Last updated date column
          if (fieldId === 'last_updated') {
            if (!value || value === 'N/A') return '-';
            
            try {
              const date = new Date(value);
              const now = new Date();
              const daysDiff = Math.round((now - date) / (1000 * 60 * 60 * 24));
              
              return (
                <div className="date-display">
                  <span>{date.toLocaleString()}</span>
                  {daysDiff <= 1 ? (
                    <span className="month-badge">Today</span>
                  ) : (
                    <span className="month-badge" style={{ 
                      background: daysDiff <= 2 ? '#4DC3FF' : '#E74C3C' 
                    }}>
                      {daysDiff} days ago
                    </span>
                  )}
                </div>
              );
            } catch (e) {
              return value;
            }
          }
          
          // Issue count column with badge for non-zero counts
          if (fieldId === 'issue_count') {
            if (!value || value === 0) return (
              <span className="no-issues">
                <Check size={16} color="#2ECC71" />
              </span>
            );
            
            return (
              <span className="badge badge-danger">
                {value}
              </span>
            );
          }
          
          // Default rendering
          if (value === null || value === undefined) return '-';
          return value.toString();
        }
      }));
  };

  // Create expanded content renderer
  const renderExpandedContent = (metric) => {
    // Filter out the gridTemplateColumns property from the iteration
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .filter(([key]) => key !== 'gridTemplateColumns') 
      .sort((a, b) => a[1].priority - b[1].priority);
    
    // For vessels with no data, show a special empty state
    if (metric.issue_type && 
        (metric.issue_type === 'No Data' || 
         metric.issue_type === 'API Error' || 
         metric.issue_type === 'Processing Error')) {
      return (
        <div className="expanded-empty-state">
          <div className="empty-state-icon">
            <AlertTriangle size={40} color="#E74C3C" />
          </div>
          <div className="empty-state-content">
            <h3 className="empty-state-title">{metric.issue_type}</h3>
            <p className="empty-state-message">{metric.issue_description}</p>
            <p className="empty-state-tip">
              This vessel has no data available for the selected time period. 
              Try refreshing the data or check the vessel's reporting status.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      // Apply gridTemplateColumns from fieldMappings.EXPANDED
      <div className="expanded-grid" style={{ gridTemplateColumns: fieldMappings.EXPANDED.gridTemplateColumns }}>
        {expandedColumns.map(([fieldId, field]) => {
          let displayValue = metric[field.dbField] || '-';
          
          // Format date fields
          if (fieldId === 'last_validated' && metric[field.dbField]) {
            try {
              const date = new Date(metric[field.dbField]);
              displayValue = date.toLocaleString();
            } catch (e) {
              // Keep original value if date parsing fails
            }
          }
          
          // For issue type, add warning icon for items with issues
          if (fieldId === 'issue_type' && metric.issue_count > 0) {
            return (
              <div 
                key={fieldId} 
                className="expanded-item" 
                style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
              >
                <p className="expanded-label">{field.label}</p>
                <p className="expanded-value issue-value">
                  <AlertTriangle size={16} color="#E74C3C" className="mr-2" />
                  {displayValue}
                </p>
              </div>
            );
          }
          
          // For missing fields, highlight in red if there are any
          if (fieldId === 'missing_fields_info' && displayValue !== 'None') {
            return (
              <div 
                key={fieldId} 
                className="expanded-item" 
                style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
              >
                <p className="expanded-label">{field.label}</p>
                <p className="expanded-value" style={{ color: '#E74C3C' }}>
                  {displayValue}
                </p>
              </div>
            );
          }
          
          // For incorrect fields, highlight in yellow if there are any
          if (fieldId === 'incorrect_fields_info' && displayValue !== 'None') {
            return (
              <div 
                key={fieldId} 
                className="expanded-item" 
                style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
              >
                <p className="expanded-label">{field.label}</p>
                <p className="expanded-value" style={{ color: '#F1C40F' }}>
                  {displayValue}
                </p>
              </div>
            );
          }
          
          // For days since update, add visual indicator
          if (fieldId === 'days_since_update') {
            let color = '#2ECC71'; // Green for fresh data
            
            if (displayValue !== 'N/A') {
              const days = parseInt(displayValue);
              if (days > 1) color = '#E74C3C'; // Red for stale data
              else if (days === 1) color = '#F1C40F'; // Yellow for 1 day old
            }
            
            return (
              <div 
                key={fieldId} 
                className="expanded-item" 
                style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
              >
                <p className="expanded-label">{field.label}</p>
                <p className="expanded-value" style={{ color }}>
                  <Clock size={16} className="mr-2" />
                  {displayValue === 'N/A' ? displayValue : `${displayValue} day(s)`}
                </p>
              </div>
            );
          }
          
          // For issue description, include more details
          if (fieldId === 'issue_description' && metric.issue_count > 0) {
            return (
              <div 
                key={fieldId} 
                className="expanded-item" 
                style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
              >
                <p className="expanded-label">{field.label}</p>
                <p className="expanded-value issue-value">
                  {displayValue}
                </p>
              </div>
            );
          }
          
          return (
            <div 
              key={fieldId} 
              className="expanded-item" 
              style={{ gridColumn: `span ${field.gridColumnSpan || 1}` }} // Apply gridColumnSpan
            >
              <p className="expanded-label">{field.label}</p>
              <p className="expanded-value">
                {displayValue}
              </p>
            </div>
          );
        })}
        
        <style jsx>{`
          .expanded-grid {
            display: grid;
            gap: 1rem; /* Spacing between items */
            padding: 1rem;
            background-color: var(--color-surface-light);
            border-top: 1px solid var(--color-border);
          }

          .expanded-item {
            display: flex;
            flex-direction: column;
            padding: 0.5rem;
            border-radius: 4px;
            background-color: var(--color-surface);
            border: 1px solid var(--color-border);
          }

          .expanded-label {
            font-size: 0.75rem;
            color: var(--color-text-secondary);
            margin-bottom: 0.25rem;
            font-weight: 500;
          }

          .expanded-value {
            font-size: 0.875rem;
            color: var(--color-text);
            display: flex;
            align-items: center;
          }

          .issue-value {
            color: #E74C3C; /* Red for issues */
          }
          
          .expanded-empty-state {
            display: flex;
            padding: 2rem;
            align-items: center;
            background-color: rgba(231, 76, 60, 0.05);
            border-radius: 8px;
            margin: 1rem;
          }
          
          .empty-state-icon {
            margin-right: 1.5rem;
          }
          
          .empty-state-content {
            flex: 1;
          }
          
          .empty-state-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #E74C3C;
            margin-bottom: 0.5rem;
          }
          
          .empty-state-message {
            color: var(--table-text-color);
            margin-bottom: 0.5rem;
          }
          
          .empty-state-tip {
            color: var(--table-muted-text-color);
            font-style: italic;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  };

  // Create actions content
  const actions = {
    label: 'Actions',
    minWidth: '120px', 
    width: '10%', // Added width for the actions column
    content: (metric) => {
      // If this is a vessel with no data, don't show the details button
      if (metric.issue_type && 
          (metric.issue_type === 'No Data' || 
           metric.issue_type === 'API Error' || 
           metric.issue_type === 'Processing Error')) {
        return (
          <button
            className="action-button disabled"
            aria-label="No details available"
            disabled
          >
            <ExternalLink size={16} />
            <span>N/A</span>
          </button>
        );
      }
      
      return (
        <button
          className="action-button"
          onClick={() => console.log('View details for', metric.vessel_name)}
          aria-label="View details"
        >
          <ExternalLink size={16} />
          <span>Details</span>
        </button>
      );
    }
  };

  return (
    <Table
      data={metrics}
      columns={getColumns()}
      expandedContent={renderExpandedContent}
      actions={actions}
      uniqueIdField="id"
      defaultSortKey="overall_score"
      defaultSortDirection="desc"
      className="data-quality-table-container"
    />
  );
};

export default DataQualityTable;