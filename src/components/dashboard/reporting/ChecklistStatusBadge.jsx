// src/components/dashboard/reporting/ChecklistStatusBadge.jsx
import React, { useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Edit3,
  Eye,
  Plus
} from 'lucide-react';
import PropTypes from 'prop-types';

const ChecklistStatusBadge = ({
  vessel,
  onOpenChecklist,
  className = '',
  status: overrideStatus = null
}) => {
  // Determine checklist status
  const checklistStatus = useMemo(() => {
    // Use override status if provided (for immediate updates)
    if (overrideStatus) {
      return overrideStatus;
    }

    // Check vessel's checklistStatus field
    if (vessel.checklistStatus) {
      return vessel.checklistStatus;
    }

    // Fallback to checklist_received field
    if (vessel.checklist_received !== undefined && vessel.checklist_received !== null) {
      if (typeof vessel.checklist_received === 'boolean') {
        return vessel.checklist_received ? 'complete' : 'pending';
      }
      
      if (typeof vessel.checklist_received === 'string') {
        const status = vessel.checklist_received.toLowerCase();
        if (status.includes('complete') || status.includes('submitted')) {
          return 'complete';
        } else if (status.includes('progress') || status.includes('draft')) {
          return 'in_progress';
        }
      }
    }

    // Default to pending
    return 'pending';
  }, [vessel, overrideStatus]);

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case 'complete':
        return {
          icon: <CheckCircle size={14} />,
          label: 'Complete',
          actionIcon: <Eye size={12} />,
          actionLabel: 'View',
          color: '#2ECC71',
          bgColor: 'rgba(46, 204, 113, 0.1)',
          borderColor: 'rgba(46, 204, 113, 0.3)',
          hoverBg: 'rgba(46, 204, 113, 0.2)',
          clickable: true
        };
      case 'in_progress':
        return {
          icon: <Clock size={14} />,
          label: 'In Progress',
          actionIcon: <Edit3 size={12} />,
          actionLabel: 'Continue',
          color: '#F39C12',
          bgColor: 'rgba(243, 156, 18, 0.1)',
          borderColor: 'rgba(243, 156, 18, 0.3)',
          hoverBg: 'rgba(243, 156, 18, 0.2)',
          clickable: true
        };
      case 'draft':
        return {
          icon: <FileText size={14} />,
          label: 'Draft',
          actionIcon: <Edit3 size={12} />,
          actionLabel: 'Edit',
          color: '#3498DB',
          bgColor: 'rgba(52, 152, 219, 0.1)',
          borderColor: 'rgba(52, 152, 219, 0.3)',
          hoverBg: 'rgba(52, 152, 219, 0.2)',
          clickable: true
        };
      default: // 'pending'
        return {
          icon: <AlertTriangle size={14} />,
          label: 'Pending',
          actionIcon: <Plus size={12} />,
          actionLabel: 'Start',
          color: '#E74C3C',
          bgColor: 'rgba(231, 76, 60, 0.1)',
          borderColor: 'rgba(231, 76, 60, 0.3)',
          hoverBg: 'rgba(231, 76, 60, 0.2)',
          clickable: true
        };
    }
  };

  const statusConfig = getStatusConfig(checklistStatus);

  // Handle click
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent row click if this is in a table row
    
    if (statusConfig.clickable && onOpenChecklist) {
      console.log('ChecklistStatusBadge: Opening checklist for', vessel.vessel_name, 'Status:', checklistStatus);
      onOpenChecklist(vessel);
    }
  };

  return (
    <div
      className={`checklist-status-badge ${statusConfig.clickable ? 'clickable' : ''} ${className}`}
      onClick={handleClick}
      style={{
        '--status-color': statusConfig.color,
        '--status-bg': statusConfig.bgColor,
        '--status-border': statusConfig.borderColor,
        '--status-hover-bg': statusConfig.hoverBg
      }}
      title={`5-Day Checklist: ${statusConfig.label} - Click to ${statusConfig.actionLabel.toLowerCase()}`}
    >
      <div className="badge-content">
        <div className="badge-main">
          <div className="badge-icon">
            {statusConfig.icon}
          </div>
          <span className="badge-label">{statusConfig.label}</span>
        </div>
        
        {statusConfig.clickable && (
          <div className="badge-action">
            {statusConfig.actionIcon}
          </div>
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
        .checklist-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid var(--status-border);
          background: var(--status-bg);
          color: var(--status-color);
          min-width: 90px;
          justify-content: space-between;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .checklist-status-badge.clickable {
          cursor: pointer;
          user-select: none;
        }

        .checklist-status-badge.clickable:hover {
          background: var(--status-hover-bg);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .checklist-status-badge.clickable:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .badge-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 6px;
        }

        .badge-main {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .badge-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .badge-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .badge-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
          opacity: 0.7;
          transition: all 0.2s ease;
        }

        .checklist-status-badge.clickable:hover .badge-action {
          opacity: 1;
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        /* Add subtle animation on hover */
        .checklist-status-badge.clickable::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transition: left 0.5s ease;
        }

        .checklist-status-badge.clickable:hover::before {
          left: 100%;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .checklist-status-badge {
            min-width: 70px;
            padding: 4px 8px;
            font-size: 11px;
          }

          .badge-label {
            display: none;
          }

          .badge-main {
            justify-content: center;
          }

          .badge-action {
            width: 14px;
            height: 14px;
          }
        }

        @media (max-width: 480px) {
          .checklist-status-badge {
            min-width: 60px;
            padding: 3px 6px;
          }

          .badge-action {
            width: 12px;
            height: 12px;
          }
        }

        /* Focus styles for accessibility */
        .checklist-status-badge.clickable:focus {
          outline: 2px solid var(--status-color);
          outline-offset: 2px;
        }

        /* Disabled state */
        .checklist-status-badge.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Loading state */
        .checklist-status-badge.loading {
          position: relative;
        }

        .checklist-status-badge.loading::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.1);
          border-radius: inherit;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .checklist-status-badge {
            border-width: 2px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .checklist-status-badge,
          .badge-action,
          .checklist-status-badge::before {
            transition: none;
          }

          .checklist-status-badge.clickable:hover::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

ChecklistStatusBadge.propTypes = {
  vessel: PropTypes.object.isRequired,
  onOpenChecklist: PropTypes.func,
  className: PropTypes.string,
  status: PropTypes.string
};

ChecklistStatusBadge.defaultProps = {
  onOpenChecklist: null,
  className: '',
  status: null
};

export default ChecklistStatusBadge;