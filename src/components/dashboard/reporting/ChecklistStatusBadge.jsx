import React, { useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Ship
} from 'lucide-react';

const ChecklistStatusBadge = ({ 
  vessel, 
  onOpenChecklist, 
  className = '' 
}) => {
  // Calculate urgency and status based on vessel data
  const badgeInfo = useMemo(() => {
    // Determine urgency based on ETA
    let urgency = null;
    let statusText = 'Start Checklist';
    let actionText = 'Start';
    let badgeVariant = 'pending';

    if (vessel.eta) {
      const eta = new Date(vessel.eta);
      const now = new Date();
      const daysToEta = Math.ceil((eta - now) / (1000 * 60 * 60 * 24));
      
      if (daysToEta < 0) {
        urgency = 'overdue';
        statusText = 'Overdue';
        actionText = 'Urgent';
        badgeVariant = 'overdue';
      } else if (daysToEta <= 1) {
        urgency = 'critical';
        statusText = 'Critical';
        actionText = 'Critical';
        badgeVariant = 'critical';
      } else if (daysToEta <= 3) {
        urgency = 'urgent';
        statusText = 'Due Soon';
        actionText = 'Urgent';
        badgeVariant = 'urgent';
      } else if (daysToEta <= 5) {
        urgency = 'warning';
        statusText = 'Due in 5 Days';
        actionText = 'Start';
        badgeVariant = 'warning';
      }
    }

    // Check if there's any existing checklist status from the vessel data
    if (vessel.checklistStatus) {
      switch (vessel.checklistStatus) {
        case 'completed':
        case 'complete':
          statusText = 'Completed';
          actionText = 'View';
          badgeVariant = 'complete';
          break;
        case 'in_progress':
          statusText = 'In Progress';
          actionText = 'Continue';
          badgeVariant = 'in-progress';
          break;
        case 'submitted':
          statusText = 'Submitted';
          actionText = 'View';
          badgeVariant = 'complete';
          break;
        default:
          // Keep the urgency-based status
          break;
      }
    }

    return {
      urgency,
      statusText,
      actionText,
      badgeVariant
    };
  }, [vessel.eta, vessel.checklistStatus]);

  // Get badge styling based on status and urgency
  const getBadgeClass = () => {
    const baseClass = 'checklist-status-badge';
    
    switch (badgeInfo.badgeVariant) {
      case 'complete': return `${baseClass} complete`;
      case 'in-progress': return `${baseClass} in-progress`;
      case 'overdue': return `${baseClass} overdue`;
      case 'critical': return `${baseClass} critical`;
      case 'urgent': return `${baseClass} urgent`;
      case 'warning': return `${baseClass} warning`;
      default: return `${baseClass} pending`;
    }
  };

  // Get icon based on status
  const getStatusIcon = () => {
    switch (badgeInfo.badgeVariant) {
      case 'complete': return <CheckCircle size={16} />;
      case 'in-progress': return <Clock size={16} />;
      case 'overdue':
      case 'critical': return <AlertTriangle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  // Handle click
  const handleClick = () => {
    if (onOpenChecklist) {
      onOpenChecklist(vessel);
    }
  };

  return (
    <div className={`checklist-badge-container ${className}`}>
      <style jsx>{`
        .checklist-badge-container {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        .checklist-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 500;
          min-width: 100px;
          justify-content: center;
          position: relative;
          overflow: hidden;
          width: 100%;
        }

        .checklist-status-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        /* Status variants */
        .checklist-status-badge.complete {
          background: rgba(46, 204, 113, 0.15);
          border-color: rgba(46, 204, 113, 0.3);
          color: #2ECC71;
        }

        .checklist-status-badge.in-progress {
          background: rgba(241, 196, 15, 0.15);
          border-color: rgba(241, 196, 15, 0.3);
          color: #F1C40F;
        }

        .checklist-status-badge.pending {
          background: rgba(59, 173, 229, 0.15);
          border-color: rgba(59, 173, 229, 0.3);
          color: #3BADE5;
        }

        .checklist-status-badge.warning {
          background: rgba(230, 126, 34, 0.15);
          border-color: rgba(230, 126, 34, 0.3);
          color: #E67E22;
        }

        /* Urgency variants */
        .checklist-status-badge.overdue,
        .checklist-status-badge.critical {
          background: rgba(231, 76, 60, 0.15);
          border-color: rgba(231, 76, 60, 0.4);
          color: #E74C3C;
          animation: pulse-urgent 2s infinite;
        }

        .checklist-status-badge.urgent {
          background: rgba(230, 126, 34, 0.15);
          border-color: rgba(230, 126, 34, 0.4);
          color: #E67E22;
          animation: pulse-warning 2s infinite;
        }

        @keyframes pulse-urgent {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.1);
          }
        }

        @keyframes pulse-warning {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(230, 126, 34, 0.1);
          }
        }

        .badge-content {
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          z-index: 1;
        }

        .badge-text {
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .checklist-status-badge {
            min-width: 80px;
            padding: 6px 8px;
            font-size: 11px;
            gap: 4px;
          }

          .badge-text {
            display: none;
          }
        }

        @media (min-width: 769px) and (max-width: 1023px) {
          .checklist-status-badge {
            min-width: 90px;
            padding: 7px 10px;
            font-size: 11px;
          }
        }
      `}</style>

      <div
        className={getBadgeClass()}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${badgeInfo.statusText} - Click to open checklists for ${vessel.vessel_name}`}
        title={`${badgeInfo.statusText} - Click to open checklists for ${vessel.vessel_name}`}
      >
        <div className="badge-content">
          {getStatusIcon()}
          <span className="badge-text">{badgeInfo.actionText}</span>
        </div>
      </div>
    </div>
  );
};

export default ChecklistStatusBadge;