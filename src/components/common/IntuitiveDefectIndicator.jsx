import React from 'react';
import { Wrench, AlertTriangle, Clock, CheckCircle, Shield, ShieldAlert } from 'lucide-react';

const IntuitiveDefectIndicator = ({ 
  defectCount = 0, 
  highCount = 0, 
  mediumCount = 0, 
  lowCount = 0,
  onClick,
  className = '',
  variant = 'wrench' // 'wrench', 'shield', 'triangle', 'pulse', 'status'
}) => {
  // Don't render if no defects
  if (defectCount === 0) return null;

  // Determine priority level and colors (light theme colors)
  const getPriorityInfo = () => {
    if (highCount > 0) {
      return {
        level: 'high',
        color: '#dc3545',
        bgColor: 'rgba(220, 53, 69, 0.1)',
        borderColor: 'rgba(220, 53, 69, 0.2)',
        glowColor: 'rgba(220, 53, 69, 0.3)',
        shouldPulse: true
      };
    } else if (mediumCount > 0) {
      return {
        level: 'medium', 
        color: '#ffc107',
        bgColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: 'rgba(255, 193, 7, 0.2)',
        glowColor: 'rgba(255, 193, 7, 0.3)',
        shouldPulse: false
      };
    } else {
      return {
        level: 'low',
        color: '#28a745',
        bgColor: 'rgba(40, 167, 69, 0.1)',
        borderColor: 'rgba(40, 167, 69, 0.2)',
        glowColor: 'rgba(40, 167, 69, 0.3)',
        shouldPulse: false
      };
    }
  };

  const priorityInfo = getPriorityInfo();

  // Create tooltip text
  const getTooltipText = () => {
    const parts = [];
    if (highCount > 0) parts.push(`${highCount} critical`);
    if (mediumCount > 0) parts.push(`${mediumCount} medium`);
    if (lowCount > 0) parts.push(`${lowCount} low`);
    
    return `${defectCount} equipment issue${defectCount === 1 ? '' : 's'} (${parts.join(', ')})`;
  };

  // WRENCH VARIANT (Most intuitive for equipment issues)
  if (variant === 'wrench') {
    return (
      <>
        <style>
          {`
            .light-defect-wrench-indicator {
              position: relative;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-left: 6px;
              flex-shrink: 0;
              z-index: 1;
            }

            .light-defect-wrench-indicator:hover {
              transform: scale(1.2);
              z-index: 1000; /* Ensure hover state appears above other elements */
            }

            .light-defect-wrench-indicator.pulsing {
              animation: lightWrenchPulse 2s infinite;
            }

            @keyframes lightWrenchPulse {
              0%, 100% { 
                transform: scale(1);
                filter: drop-shadow(0 0 0 var(--glow-color));
              }
              50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 6px var(--glow-color));
              }
            }

            .light-defect-wrench-tooltip {
              position: fixed; /* Changed from absolute to fixed for better z-index control */
              background: rgba(0, 0, 0, 0.9);
              color: #ffffff;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              white-space: nowrap;
              opacity: 0;
              visibility: hidden;
              transition: all 0.2s ease;
              z-index: 10001; /* Very high z-index */
              pointer-events: none;
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              transform: translateX(-50%);
            }

            .light-defect-wrench-tooltip::after {
              content: '';
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: 5px solid transparent;
              border-top-color: rgba(0, 0, 0, 0.9);
            }

            .light-defect-wrench-indicator:hover .light-defect-wrench-tooltip {
              opacity: 1;
              visibility: visible;
            }

            .light-defect-count-badge {
              position: absolute;
              top: -8px;
              right: -8px;
              background: var(--priority-color);
              color: white;
              font-size: 9px;
              font-weight: 600;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid #ffffff; /* White border for light theme */
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
          `}
        </style>
        
        <div
          className={`light-defect-wrench-indicator ${priorityInfo.shouldPulse ? 'pulsing' : ''} ${className}`}
          onClick={onClick}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.light-defect-wrench-tooltip');
            if (tooltip) {
              const rect = e.currentTarget.getBoundingClientRect();
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 10}px`;
            }
          }}
          style={{
            '--priority-color': priorityInfo.color,
            '--glow-color': priorityInfo.glowColor
          }}
        >
          <Wrench 
            size={14} 
            color={priorityInfo.color}
            style={{
              filter: `drop-shadow(0 0 3px ${priorityInfo.glowColor})`
            }}
          />
          
          {defectCount > 0 && (
            <div 
              className="light-defect-count-badge"
              style={{ '--priority-color': priorityInfo.color }}
            >
              {defectCount > 9 ? '9+' : defectCount}
            </div>
          )}
          
          <div className="light-defect-wrench-tooltip">
            {getTooltipText()}
          </div>
        </div>
      </>
    );
  }

  // SHIELD VARIANT
  if (variant === 'shield') {
    return (
      <>
        <style>
          {`
            .light-defect-shield-indicator {
              position: relative;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-left: 6px;
              flex-shrink: 0;
              z-index: 1;
            }

            .light-defect-shield-indicator:hover {
              transform: scale(1.2);
              z-index: 1000;
            }

            .light-defect-shield-indicator.pulsing {
              animation: lightShieldPulse 2s infinite;
            }

            @keyframes lightShieldPulse {
              0%, 100% { 
                transform: scale(1);
              }
              50% { 
                transform: scale(1.1);
                filter: drop-shadow(0 0 8px var(--glow-color));
              }
            }

            .light-defect-shield-tooltip {
              position: fixed;
              background: rgba(0, 0, 0, 0.9);
              color: #ffffff;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              white-space: nowrap;
              opacity: 0;
              visibility: hidden;
              transition: all 0.2s ease;
              z-index: 10001;
              pointer-events: none;
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              transform: translateX(-50%);
            }

            .light-defect-shield-tooltip::after {
              content: '';
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: 5px solid transparent;
              border-top-color: rgba(0, 0, 0, 0.9);
            }

            .light-defect-shield-indicator:hover .light-defect-shield-tooltip {
              opacity: 1;
              visibility: visible;
            }
          `}
        </style>
        
        <div
          className={`light-defect-shield-indicator ${priorityInfo.shouldPulse ? 'pulsing' : ''} ${className}`}
          onClick={onClick}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.light-defect-shield-tooltip');
            if (tooltip) {
              const rect = e.currentTarget.getBoundingClientRect();
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 10}px`;
            }
          }}
          style={{
            '--glow-color': priorityInfo.glowColor
          }}
        >
          <ShieldAlert 
            size={16} 
            color={priorityInfo.color}
            style={{
              filter: `drop-shadow(0 0 3px ${priorityInfo.glowColor})`
            }}
          />
          
          <div className="light-defect-shield-tooltip">
            {getTooltipText()}
          </div>
        </div>
      </>
    );
  }

  // STATUS VARIANT (Traffic light style)
  if (variant === 'status') {
    return (
      <>
        <style>
          {`
            .light-defect-status-indicator {
              position: relative;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
              cursor: pointer;
              margin-left: 6px;
              flex-shrink: 0;
              border-radius: 3px;
              background: var(--bg-color);
              border: 1px solid var(--border-color);
              transition: all 0.3s ease;
              z-index: 1;
            }

            .light-defect-status-indicator:hover {
              transform: scale(1.1);
              box-shadow: 0 0 8px var(--glow-color);
              z-index: 1000;
            }

            .light-defect-status-indicator.pulsing {
              animation: lightStatusPulse 2s infinite;
            }

            @keyframes lightStatusPulse {
              0%, 100% { 
                box-shadow: 0 0 0 0 var(--glow-color);
              }
              50% { 
                box-shadow: 0 0 0 3px var(--glow-color);
              }
            }

            .light-defect-status-count {
              font-size: 9px;
              font-weight: 600;
              color: var(--priority-color);
            }

            .light-defect-status-tooltip {
              position: fixed;
              background: rgba(0, 0, 0, 0.9);
              color: #ffffff;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              white-space: nowrap;
              opacity: 0;
              visibility: hidden;
              transition: all 0.2s ease;
              z-index: 10001;
              pointer-events: none;
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              transform: translateX(-50%);
            }

            .light-defect-status-tooltip::after {
              content: '';
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: 5px solid transparent;
              border-top-color: rgba(0, 0, 0, 0.9);
            }

            .light-defect-status-indicator:hover .light-defect-status-tooltip {
              opacity: 1;
              visibility: visible;
            }
          `}
        </style>
        
        <div
          className={`light-defect-status-indicator ${priorityInfo.shouldPulse ? 'pulsing' : ''} ${className}`}
          onClick={onClick}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.light-defect-status-tooltip');
            if (tooltip) {
              const rect = e.currentTarget.getBoundingClientRect();
              tooltip.style.left = `${rect.left + rect.width / 2}px`;
              tooltip.style.top = `${rect.top - 10}px`;
            }
          }}
          style={{
            '--priority-color': priorityInfo.color,
            '--bg-color': priorityInfo.bgColor,
            '--border-color': priorityInfo.borderColor,
            '--glow-color': priorityInfo.glowColor
          }}
        >
          <span className="light-defect-status-count">
            {defectCount > 9 ? '9+' : defectCount}
          </span>
          
          <div className="light-defect-status-tooltip">
            {getTooltipText()}
          </div>
        </div>
      </>
    );
  }

  // Default fallback - return null
  return null;
};

export default IntuitiveDefectIndicator;