import React, { useState, useEffect } from 'react';
import { X, Settings, AlertTriangle, Clock, CheckCircle, Search } from 'lucide-react';

const EnhancedDefectsModal = ({ 
  isOpen, 
  onClose, 
  vesselName,
  vesselId,
  onLoadDefects
}) => {
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDefects, setFilteredDefects] = useState([]);

  // Load defects when modal opens
  useEffect(() => {
    if (isOpen && vesselId && onLoadDefects) {
      setLoading(true);
      setError(null);
      
      onLoadDefects(vesselId)
        .then(data => {
          console.log('Raw defects data received:', data);
          
          // Map the fields to match our display expectations
          const mappedDefects = data.map(defect => ({
            id: defect.id,
            equipment_name: defect.Equipments || 'Unknown Equipment',
            description: defect.Description || '',
            action_planned: defect['Action Planned'] || defect.Action_Planned || '',
            criticality: defect.Criticality?.toLowerCase() || 'unknown',
            status_vessel: defect.Status || defect.Status_Vessel || 'unknown',
            vessel_id: defect.vessel_id,
            vessel_name: defect.vessel_name,
            date_reported: defect['Date Reported'] || defect.Date_Reported,
            target_date: defect.target_date,
            comments: defect.Comments || ''
          }));
          
          // Filter only open defects
          const openDefects = mappedDefects.filter(defect => 
            defect.status_vessel?.toLowerCase() === 'open'
          );
          
          console.log(`Filtered ${openDefects.length} open defects from ${mappedDefects.length} total`);
          setDefects(openDefects);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading defects:', err);
          setError('Failed to load defects');
          setLoading(false);
        });
    }
  }, [isOpen, vesselId, onLoadDefects]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...defects];
    
    if (activeFilter !== 'all') {
      filtered = defects.filter(defect => 
        defect.criticality?.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(defect => 
        defect.equipment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defect.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defect.action_planned?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      const criticalityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const aOrder = criticalityOrder[a.criticality?.toLowerCase()] || 0;
      const bOrder = criticalityOrder[b.criticality?.toLowerCase()] || 0;
      return bOrder - aOrder;
    });
    
    setFilteredDefects(filtered);
  }, [defects, activeFilter, searchQuery]);

  const getCriticalityInfo = (criticality) => {
    const level = criticality?.toLowerCase();
    switch (level) {
      case 'high':
        return {
          color: '#dc3545',
          bg: '#fff1f2',
          border: '#fecaca',
          icon: AlertTriangle,
          label: 'CRITICAL'
        };
      case 'medium':
        return {
          color: '#f59e0b',
          bg: '#fffbeb',
          border: '#fed7aa',
          icon: Clock,
          label: 'MEDIUM'
        };
      case 'low':
        return {
          color: '#059669',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          icon: CheckCircle,
          label: 'LOW'
        };
      default:
        return {
          color: '#6b7280',
          bg: '#f9fafb',
          border: '#e5e7eb',
          icon: Settings,
          label: 'UNKNOWN'
        };
    }
  };

  const counts = {
    all: defects.length,
    high: defects.filter(d => d.criticality?.toLowerCase() === 'high').length,
    medium: defects.filter(d => d.criticality?.toLowerCase() === 'medium').length,
    low: defects.filter(d => d.criticality?.toLowerCase() === 'low').length
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .compact-defects-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.12s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.99);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .compact-defects-modal {
            background: #ffffff;
            border-radius: 10px;
            width: 90%;
            max-width: 640px;
            max-height: 82vh;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.15s ease-out;
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
          }

          /* Compact Header */
          .compact-header {
            padding: 18px 20px 16px;
            border-bottom: 1px solid #f1f5f9;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }

          .compact-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }

          .compact-title-group {
            flex: 1;
          }

          .compact-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            color: #0f172a;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.2;
          }

          .compact-subtitle {
            color: #64748b;
            font-size: 13px;
            margin: 2px 0 0 0;
            font-weight: 500;
          }

          .compact-close {
            background: #f1f5f9;
            border: none;
            color: #64748b;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.12s ease;
          }

          .compact-close:hover {
            background: #e2e8f0;
            color: #475569;
            transform: scale(1.05);
          }

          /* Compact Search */
          .compact-search {
            position: relative;
            margin-bottom: 12px;
          }

          .compact-search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
          }

          .compact-search-input {
            width: 100%;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px 8px 32px;
            color: #0f172a;
            font-size: 13px;
            transition: all 0.12s ease;
          }

          .compact-search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.08);
          }

          .compact-search-input::placeholder {
            color: #94a3b8;
          }

          /* Compact Filters */
          .compact-filters {
            display: flex;
            gap: 6px;
          }

          .compact-filter-btn {
            padding: 6px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            background: #ffffff;
            color: #475569;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.12s ease;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            line-height: 1;
          }

          .compact-filter-btn:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            transform: translateY(-1px);
          }

          .compact-filter-btn.active {
            background: #3b82f6;
            border-color: #3b82f6;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }

          .compact-filter-count {
            background: rgba(255, 255, 255, 0.25);
            color: inherit;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            min-width: 16px;
            text-align: center;
            line-height: 1.2;
          }

          .compact-filter-btn:not(.active) .compact-filter-count {
            background: #f1f5f9;
            color: #64748b;
          }

          /* Compact Body */
          .compact-body {
            flex: 1;
            overflow-y: auto;
            padding: 0;
          }

          .compact-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: #64748b;
          }

          .compact-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid #f1f5f9;
            border-radius: 50%;
            border-top: 2px solid #3b82f6;
            animation: spin 0.8s linear infinite;
            margin-bottom: 10px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .compact-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
          }

          .compact-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: #64748b;
            text-align: center;
          }

          .compact-empty h3 {
            margin: 10px 0 4px 0;
            color: #334155;
            font-size: 15px;
            font-weight: 500;
          }

          .compact-empty p {
            margin: 0;
            font-size: 13px;
          }

          /* Compact Defect List */
          .compact-defect-list {
            padding: 0;
          }

          .compact-defect-item {
            padding: 14px 20px;
            border-bottom: 1px solid #f8fafc;
            transition: all 0.12s ease;
            position: relative;
          }

          .compact-defect-item:hover {
            background: #f8fafc;
            transform: translateX(2px);
          }

          .compact-defect-item:last-child {
            border-bottom: none;
          }

          .compact-defect-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
            gap: 12px;
          }

          .compact-equipment-name {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            line-height: 1.3;
          }

          .compact-priority-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--dot-color);
            flex-shrink: 0;
            margin-top: 1px;
          }

          .compact-priority-badge {
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            background: var(--badge-bg);
            color: var(--badge-color);
            border: 1px solid var(--badge-border);
            line-height: 1.2;
            flex-shrink: 0;
          }

          .compact-description {
            color: #475569;
            font-size: 12px;
            line-height: 1.4;
            margin: 0 0 8px 0;
          }

          .compact-action {
            background: var(--action-bg);
            border: 1px solid var(--action-border);
            border-radius: 4px;
            padding: 8px 10px;
          }

          .compact-action-label {
            color: #64748b;
            font-size: 9px;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-weight: 600;
            line-height: 1;
          }

          .compact-action-text {
            color: #334155;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
          }

          /* Priority indicator line */
          .compact-defect-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--priority-color);
            opacity: 0.6;
          }

          /* Mobile optimizations */
          @media (max-width: 768px) {
            .compact-defects-modal {
              width: 95%;
              max-height: 88vh;
            }

            .compact-header {
              padding: 16px 18px 14px;
            }

            .compact-title {
              font-size: 15px;
            }

            .compact-filters {
              flex-wrap: wrap;
              gap: 4px;
            }

            .compact-filter-btn {
              font-size: 11px;
              padding: 5px 10px;
            }

            .compact-defect-item {
              padding: 12px 18px;
            }

            .compact-defect-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 6px;
            }

            .compact-priority-badge {
              align-self: flex-start;
            }
          }
        `}
      </style>

      <div className="compact-defects-overlay" onClick={onClose}>
        <div className="compact-defects-modal" onClick={e => e.stopPropagation()}>
          
          {/* Compact Header */}
          <div className="compact-header">
            <div className="compact-header-top">
              <div className="compact-title-group">
                <h2 className="compact-title">
                  <Settings size={16} />
                  Equipment Defects
                </h2>
                <p className="compact-subtitle">{vesselName}</p>
              </div>
              <button className="compact-close" onClick={onClose}>
                <X size={14} />
              </button>
            </div>
            
            {/* Compact Search */}
            <div className="compact-search">
              <Search size={14} className="compact-search-icon" />
              <input
                type="text"
                className="compact-search-input"
                placeholder="Search equipment, description, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Compact Filters */}
            <div className="compact-filters">
              {[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'high', label: 'Critical', count: counts.high },
                { id: 'medium', label: 'Medium', count: counts.medium },
                { id: 'low', label: 'Low', count: counts.low }
              ].map(filter => (
                <button
                  key={filter.id}
                  className={`compact-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="compact-filter-count">{filter.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Body */}
          <div className="compact-body">
            {loading && (
              <div className="compact-loading">
                <div className="compact-spinner"></div>
                <p>Loading defects...</p>
              </div>
            )}

            {error && (
              <div className="compact-error">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {!loading && !error && filteredDefects.length === 0 && (
              <div className="compact-empty">
                <CheckCircle size={40} color="#cbd5e1" />
                <h3>No Issues Found</h3>
                <p>
                  {searchQuery.trim() 
                    ? `No defects match "${searchQuery}"`
                    : activeFilter === 'all' 
                      ? 'This vessel has no open defects.'
                      : `No ${activeFilter} priority defects found.`}
                </p>
              </div>
            )}

            {!loading && !error && filteredDefects.length > 0 && (
              <div className="compact-defect-list">
                {filteredDefects.map((defect, index) => {
                  const criticalityInfo = getCriticalityInfo(defect.criticality);
                  
                  return (
                    <div 
                      key={`${defect.id || index}`} 
                      className="compact-defect-item"
                      style={{
                        '--dot-color': criticalityInfo.color,
                        '--priority-color': criticalityInfo.color
                      }}
                    >
                      <div className="compact-defect-header">
                        <h4 className="compact-equipment-name">
                          <div className="compact-priority-dot"></div>
                          {defect.equipment_name || 'Unknown Equipment'}
                        </h4>
                        <div 
                          className="compact-priority-badge"
                          style={{
                            '--badge-bg': criticalityInfo.bg,
                            '--badge-color': criticalityInfo.color,
                            '--badge-border': criticalityInfo.border
                          }}
                        >
                          {criticalityInfo.label}
                        </div>
                      </div>
                      
                      {defect.description && (
                        <p className="compact-description">
                          {defect.description}
                        </p>
                      )}
                      
                      {defect.action_planned && (
                        <div 
                          className="compact-action"
                          style={{
                            '--action-bg': criticalityInfo.bg,
                            '--action-border': criticalityInfo.border
                          }}
                        >
                          <div className="compact-action-label">
                            Planned Action
                          </div>
                          <p className="compact-action-text">
                            {defect.action_planned}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EnhancedDefectsModal;