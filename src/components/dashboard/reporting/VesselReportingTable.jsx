// src/components/dashboard/reporting/VesselReportingTable.jsx
import React, { useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  Ship, // Added Ship icon for vessel name
  MapPin // Added MapPin for port
} from 'lucide-react';
import {
  Table,
  StatusIndicator,
  TableBadge,
  ExpandedItem
} from '../../common/Table';
import PropTypes from 'prop-types';

const VesselReportingTable = ({ vessels, fieldMappings, loading }) => {
  // Helper function to format dates
  const formatDateTime = (dateString, includeTime = false) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      if (includeTime) {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to get checklist status display
  const getChecklistStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle size={16} />,
          label: 'Completed',
          variant: 'success',
          color: '#2ECC71'
        };
      case 'in_progress':
        return {
          icon: <Clock size={16} />,
          label: 'In Progress',
          variant: 'warning',
          color: '#F39C12'
        };
      case 'pending':
        return {
          icon: <AlertTriangle size={16} />,
          label: 'Pending',
          variant: 'warning',
          color: '#F1C40F'
        };
      case 'not_started':
        return {
          icon: <XCircle size={16} />,
          label: 'Not Started',
          variant: 'danger',
          color: '#E74C3C'
        };
      default:
        return {
          icon: <XCircle size={16} />,
          label: 'Unknown',
          variant: 'info',
          color: '#95A5A6'
        };
    }
  };

  // Get status color for vessel status
  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';

    if (status === "At Sea") {
      return '#3498DB';
    } else if (status === "At Port") {
      return '#2ECC71';
    } else if (status === "At Anchor") {
      return '#F1C40F';
    } else {
      return '#f4f4f4';
    }
  };

  // Convert field mappings to table columns
  const getTableColumns = () => {
    return Object.entries(fieldMappings.TABLE)
      .filter(([_, field]) => !field.isAction)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => ({
        field: field.dbField,
        label: field.label,
        width: field.width,
        minWidth: field.minWidth,
        sortable: true,
        render: (value, rowData) => {
          // Vessel name column
          if (fieldId === 'vessel_name') {
            return (
              <div className="vessel-name-cell">
                <div className="vessel-info">
                  <Ship size={16} className="vessel-icon" />
                  <div className="vessel-details">
                    <span className="vessel-name" title={`IMO: ${rowData.imo_no || 'N/A'}`}>
                      {(value || '-').toUpperCase()}
                    </span>
                    {rowData.imo_no && <span className="vessel-imo">IMO: {rowData.imo_no}</span>}
                  </div>
                </div>
              </div>
            );
          }

          // Status column
          if (fieldId === 'event_type') {
            return (
              <div className="status-cell">
                <StatusIndicator
                  status={value}
                  color={getStatusColor(value)}
                />
                <span className="status-icon">{value || '-'}</span>
              </div>
            );
          }

          // Checklist status column
          if (fieldId === 'checklistStatus') {
            const statusDisplay = getChecklistStatusDisplay(value);
            return (
              <div className="checklist-status-cell">
                <TableBadge variant={statusDisplay.variant} className="enhanced-status-badge">
                  {statusDisplay.icon}
                  <span>{statusDisplay.label}</span>
                </TableBadge>
              </div>
            );
          }

          // ETA column with special formatting
          if (fieldId === 'eta') {
            const etaValue = rowData.user_eta || value;
            const formattedValue = formatDateTime(etaValue, true);

            // Check if ETA is in the past
            const isOverdue = etaValue && new Date(etaValue) < new Date();
            const isUrgent = rowData.daysToGo && rowData.daysToGo <= 5 && !isOverdue;

            return (
              <div className={`eta-cell ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}`}>
                <div className="eta-content">
                  <Calendar size={16} className="eta-icon" />
                  <div className="eta-details">
                    <span
                      className={isOverdue ? 'overdue-text' : ''}
                      title={formattedValue}
                    >
                      {formattedValue}
                    </span>
                    {isOverdue && (
                      <span className="eta-warning">
                        <AlertTriangle size={12} /> Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // ETB column
          if (fieldId === 'etb') {
            const etbValue = rowData.user_etb || value;
            const formattedValue = formatDateTime(etbValue, true);
            return (
              <div className="etb-cell">
                <Calendar size={16} className="etb-icon" />
                <span title={formattedValue}>
                  {formattedValue}
                </span>
              </div>
            );
          }

          // Arrival port column
          if (fieldId === 'arrival_port') {
            const upperCaseValue = (value || '-').toUpperCase();
            return (
              <div className="port-cell">
                <MapPin size={16} className="port-icon" />
                <span className="port-name" title={upperCaseValue}>
                  {upperCaseValue}
                </span>
              </div>
            );
          }

          // Days to go column
          if (fieldId === 'daysToGo' && typeof value === 'number') {
            const formattedValue = value.toFixed(1);
            const isUrgent = value <= 5 && value > 0;
            const isCritical = value <= 0; // Already overdue or arrived

            return (
              <div className={`days-to-go ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`}>
                <div className="days-content">
                  <Clock size={16} className="days-icon" />
                  <div className="days-details">
                    <span className="days-value" title={`${formattedValue} days remaining`}>
                      {formattedValue}
                    </span>
                    <span className="days-label">days to go</span>
                  </div>
                  {isCritical && (
                    <div className="urgency-indicator critical">
                      <AlertTriangle size={10} />
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Default date formatting
          if (field.type === 'date') {
            const formattedValue = formatDateTime(value, false);
            return (
              <span className="date-cell" title={formattedValue}>
                {formattedValue}
              </span>
            );
          }

          // Default text rendering
          if (value !== null && value !== undefined && value !== '-') {
            const stringValue = String(value);
            return (
              <span className="text-cell" title={stringValue}>
                {stringValue}
              </span>
            );
          }

          return <span className="empty-cell">-</span>;
        }
      }));
  };

  // Create expanded content renderer
  const renderExpandedContent = (vessel) => {
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority);

    return (
      <div className="expanded-grid reporting-expanded">
        {expandedColumns.map(([fieldId, field]) => {
          let value = vessel[field.dbField];

          // Check for user overrides
          if (fieldId === 'eta' && vessel.user_eta) {
            value = vessel.user_eta;
          } else if (fieldId === 'etb' && vessel.user_etb) {
            value = vessel.user_etb;
          } else if (fieldId === 'etd' && vessel.user_etd) {
            value = vessel.user_etd;
          }

          // Format dates
          if (field.type === 'date' || ['eta', 'etb', 'etd'].includes(fieldId)) {
            value = formatDateTime(value, true);
          }

          // Special handling for checklist status
          if (fieldId === 'checklistStatus') {
            const statusDisplay = getChecklistStatusDisplay(value);
            return (
              <ExpandedItem
                key={fieldId}
                label={field.label}
                value={
                  <div className="expanded-checklist-status">
                    {statusDisplay.icon}
                    <span style={{ color: statusDisplay.color }}>
                      {statusDisplay.label}
                    </span>
                  </div>
                }
              />
            );
          }

          // Special handling for vessel status
          if (fieldId === 'event_type') {
            return (
              <ExpandedItem
                key={fieldId}
                label={field.label}
                value={
                  <div className="expanded-vessel-status">
                    <StatusIndicator status={value} color={getStatusColor(value)} />
                    <span className="expanded-status-indicator">{value || '-'}</span>
                  </div>
                }
              />
            );
          }

          return (
            <ExpandedItem
              key={fieldId}
              label={field.label}
              value={value || '-'}
            />
          );
        })}
      </div>
    );
  };

  // Actions column for reporting-specific actions
  const actions = {
    label: 'Actions',
    width: '120px',
    content: (vessel) => (
      <div className="reporting-actions">
        <button
          className="action-button reporting-action primary"
          onClick={() => {
            console.log('View checklist for vessel:', vessel);
            // TODO: Implement checklist view/edit functionality
          }}
          aria-label="View vessel checklist"
        >
          <FileText size={16} />
          <span>Checklist</span>
        </button>
      </div>
    )
  };

  // Sort vessels by priority (overdue ETAs first, then by ETA)
  const sortedVessels = useMemo(() => {
    return [...vessels].sort((a, b) => {
      const aEta = a.user_eta || a.eta;
      const bEta = b.user_eta || b.eta;

      if (!aEta && !bEta) return 0;
      if (!aEta) return 1;
      if (!bEta) return -1;

      const aDate = new Date(aEta);
      const bDate = new Date(bEta);
      const now = new Date();

      // Check if dates are overdue
      const aOverdue = aDate < now;
      const bOverdue = bDate < now;

      // Overdue vessels first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Within same overdue status, sort by date
      return aDate - bDate;
    });
  }, [vessels]);

  return (
    <div className="vessel-reporting-table">
      <style jsx>{`
        /* Compact and responsive table styles */
        .vessel-reporting-table {
          width: 100%;
          overflow: hidden;
        }

        .vessel-name-cell {
          padding: 4px 0;
        }

        .vessel-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vessel-icon {
          color: var(--blue-accent, #3BADE5);
          flex-shrink: 0;
        }

        .vessel-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .vessel-name {
          font-weight: 600;
          color: var(--text-light, #f4f4f4);
        }

        .vessel-imo {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
          font-size: 11px;
        }

        .status-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-icon {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
        }

        .checklist-status-cell {
          padding: 2px 0;
        }

        .enhanced-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .enhanced-status-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .eta-cell, .etb-cell {
          padding: 4px 0;
        }

        .eta-cell.overdue {
          background-color: rgba(231, 76, 60, 0.1);
          border-radius: 4px;
          padding: 6px 8px;
        }

        .eta-cell.urgent {
          background-color: rgba(241, 196, 15, 0.1);
          border-radius: 4px;
          padding: 6px 8px;
        }

        .eta-content, .etb-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eta-icon, .etb-icon {
          color: var(--blue-accent, #3BADE5);
          flex-shrink: 0;
        }

        .eta-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .eta-warning {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--warning-color, #F1C40F);
        }

        .port-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .port-icon {
          color: var(--success-color, #2ECC71);
          flex-shrink: 0;
        }

        .port-name {
          font-weight: 500;
        }

        .days-to-go {
          padding: 4px 0;
        }

        .days-to-go.urgent {
          background-color: rgba(241, 196, 15, 0.1);
          border-radius: 4px;
          padding: 6px 8px;
        }

        .days-to-go.critical {
          background-color: rgba(231, 76, 60, 0.1);
          border-radius: 4px;
          padding: 6px 8px;
        }

        .days-content {
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }

        .days-icon {
          color: var(--blue-accent, #3BADE5);
          flex-shrink: 0;
        }

        .days-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .days-value {
          font-weight: 600;
          font-size: 14px;
        }

        .days-label {
          font-size: 10px;
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
        }

        .urgency-indicator {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: var(--danger-color, #E74C3C);
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }

        .urgency-indicator.critical {
          color: white;
        }

        .date-cell, .text-cell {
          color: var(--text-light, #f4f4f4);
        }

        .empty-cell {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
          font-style: italic;
        }

        .reporting-actions {
          display: flex;
          gap: 6px;
        }

        .reporting-action {
          min-width: 90px;
          justify-content: center;
        }

        .reporting-action.primary {
          background: rgba(59, 173, 229, 0.15);
          border-color: rgba(59, 173, 229, 0.3);
          color: var(--blue-accent, #3BADE5);
        }

        .reporting-action.primary:hover {
          background: rgba(59, 173, 229, 0.25);
          transform: translateY(-1px);
        }

        .expanded-checklist-status,
        .expanded-vessel-status {
          display: flex;
          align-items: center;
        }

        .expanded-status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .vessel-details {
            gap: 1px;
          }

          .vessel-imo {
            font-size: 10px;
          }

          .enhanced-status-badge {
            padding: 3px 6px;
            font-size: 11px;
          }

          .days-content {
            gap: 4px;
          }

          .reporting-action {
            min-width: 80px;
            font-size: 11px;
          }
        }
      `}</style>

      <Table
        data={sortedVessels}
        columns={getTableColumns()}
        expandedContent={renderExpandedContent}
        actions={actions}
        uniqueIdField="uniqueKey"
        defaultSortKey="eta"
        defaultSortDirection="asc"
        className="reporting-vessel-table enhanced"
      />
    </div>
  );
};

VesselReportingTable.propTypes = {
  vessels: PropTypes.arrayOf(PropTypes.object).isRequired,
  fieldMappings: PropTypes.object.isRequired,
  loading: PropTypes.bool
};

VesselReportingTable.defaultProps = {
  loading: false
};

export default VesselReportingTable;