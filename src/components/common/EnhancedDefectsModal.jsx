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
          const openDefects = data.filter(defect => 
            defect.status_vessel?.toLowerCase() === 'open'
          );
          setDefects(openDefects);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load defects');
          setLoading(false);
        });
    }
  }, [isOpen, vesselId, onLoadDefects]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...defects];
    
    // Apply criticality filter
    if (activeFilter !== 'all') {
      filtered = defects.filter(defect => 
        defect.criticality?.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(defect => 
        defect.equipment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defect.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defect.action_planned?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by criticality (high -> medium -> low)
    filtered.sort((a, b) => {
      const criticalityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const aOrder = criticalityOrder[a.criticality?.toLowerCase()] || 0;
      const bOrder = criticalityOrder[b.criticality?.toLowerCase()] || 0;
      return bOrder - aOrder;
    });
    
    setFilteredDefects(filtered);
  }, [defects, activeFilter, searchQuery]);

  // Get criticality info for styling
  const getCriticalityInfo = (criticality) => {
    const level = criticality?.toLowerCase();
    switch (level) {
      case 'high':
        return {
          color: '#dc3545',
          bg: '#fff5f5',
          border: '#fed7d7',
          icon: AlertTriangle,
          label: 'CRITICAL'
        };
      case 'medium':
        return {
          color: '#f59e0b',
          bg: '#fffbeb',
          border: '#fde68a',
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

  // Filter counts
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
          .modern-defects-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.15s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .modern-defects-modal {
            background: #ffffff;
            border-radius: 12px;
            width: 90%;
            max-width: 700px;
            max-height: 85vh;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            animation: slideUp 0.2s ease-out;
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
          }

          /* Header */
          .modern-header {
            padding: 24px;
            border-bottom: 1px solid #f3f4f6;
            background: #fafafa;
          }

          .modern-header-top {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            margin-bottom: 20px;
          }

          .modern-title-group {
            flex: 1;
          }

          .modern-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 4px 0;
            color: #111827;
            font-size: 18px;
            font-weight: 600;
          }

          .modern-subtitle {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
          }

          .modern-close {
            background: #f3f4f6;
            border: none;
            color: #6b7280;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          }

          .modern-close:hover {
            background: #e5e7eb;
            color: #374151;
          }

          /* Search */
          .modern-search {
            position: relative;
            margin-bottom: 16px;
          }

          .modern-search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
          }

          .modern-search-input {
            width: 100%;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px 12px 10px 40px;
            color: #111827;
            font-size: 14px;
            transition: all 0.15s ease;
          }

          .modern-search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .modern-search-input::placeholder {
            color: #9ca3af;
          }

          /* Filters */
          .modern-filters {
            display: flex;
            gap: 8px;
          }

          .modern-filter-btn {
            padding: 8px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #ffffff;
            color: #374151;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }

          .modern-filter-btn:hover {
            background: #f9fafb;
            border-color: #d1d5db;
          }

          .modern-filter-btn.active {
            background: #3b82f6;
            border-color: #3b82f6;
            color: #ffffff;
          }

          .modern-filter-count {
            background: rgba(255, 255, 255, 0.2);
            color: inherit;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            min-width: 18px;
            text-align: center;
          }

          .modern-filter-btn:not(.active) .modern-filter-count {
            background: #f3f4f6;
            color: #6b7280;
          }

          /* Body */
          .modern-body {
            flex: 1;
            overflow-y: auto;
            padding: 0;
          }

          .modern-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 24px;
            color: #6b7280;
          }

          .modern-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f4f6;
            border-radius: 50%;
            border-top: 2px solid #3b82f6;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .modern-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
          }

          .modern-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 24px;
            color: #6b7280;
            text-align: center;
          }

          .modern-empty h3 {
            margin: 12px 0 4px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 500;
          }

          .modern-empty p {
            margin: 0;
            font-size: 14px;
          }

          /* Defect List */
          .modern-defect-list {
            padding: 0;
          }

          .modern-defect-item {
            padding: 20px 24px;
            border-bottom: 1px solid #f3f4f6;
            transition: background-color 0.15s ease;
          }

          .modern-defect-item:hover {
            background: #f9fafb;
          }

          .modern-defect-item:last-child {
            border-bottom: none;
          }

          .modern-defect-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }

          .modern-equipment-name {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .modern-priority-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--dot-color);
            flex-shrink: 0;
          }

          .modern-priority-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: var(--badge-bg);
            color: var(--badge-color);
            border: 1px solid var(--badge-border);
          }

          .modern-description {
            color: #4b5563;
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 12px 0;
          }

          .modern-action {
            background: var(--action-bg);
            border: 1px solid var(--action-border);
            border-radius: 6px;
            padding: 12px;
          }

          .modern-action-label {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
          }

          .modern-action-text {
            color: #374151;
            font-size: 14px;
            line-height: 1.4;
            margin: 0;
          }

          /* Mobile */
          @media (max-width: 768px) {
            .modern-defects-modal {
              width: 95%;
              max-height: 90vh;
            }

            .modern-header {
              padding: 20px;
            }

            .modern-title {
              font-size: 16px;
            }

            .modern-filters {
              flex-wrap: wrap;
            }

            .modern-defect-item {
              padding: 16px 20px;
            }
          }
        `}
      </style>

      <div className="modern-defects-overlay" onClick={onClose}>
        <div className="modern-defects-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="modern-header">
            <div className="modern-header-top">
              <div className="modern-title-group">
                <h2 className="modern-title">
                  <Settings size={18} />
                  Equipment Defects
                </h2>
                <p className="modern-subtitle">{vesselName}</p>
              </div>
              <button className="modern-close" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
            
            {/* Search */}
            <div className="modern-search">
              <Search size={16} className="modern-search-icon" />
              <input
                type="text"
                className="modern-search-input"
                placeholder="Search equipment, description, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="modern-filters">
              {[
                { id: 'all', label: 'All', count: counts.all },
                { id: 'high', label: 'Critical', count: counts.high },
                { id: 'medium', label: 'Medium', count: counts.medium },
                { id: 'low', label: 'Low', count: counts.low }
              ].map(filter => (
                <button
                  key={filter.id}
                  className={`modern-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="modern-filter-count">{filter.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="modern-body">
            {loading && (
              <div className="modern-loading">
                <div className="modern-spinner"></div>
                <p>Loading defects...</p>
              </div>
            )}

            {error && (
              <div className="modern-error">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {!loading && !error && filteredDefects.length === 0 && (
              <div className="modern-empty">
                <CheckCircle size={48} color="#d1d5db" />
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
              <div className="modern-defect-list">
                {filteredDefects.map((defect, index) => {
                  const criticalityInfo = getCriticalityInfo(defect.criticality);
                  
                  return (
                    <div key={`${defect.id || index}`} className="modern-defect-item">
                      <div className="modern-defect-header">
                        <h4 
                          className="modern-equipment-name"
                          style={{
                            '--dot-color': criticalityInfo.color
                          }}
                        >
                          <div className="modern-priority-dot"></div>
                          {defect.equipment_name || 'Unknown Equipment'}
                        </h4>
                        <div 
                          className="modern-priority-badge"
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
                        <p className="modern-description">
                          {defect.description}
                        </p>
                      )}
                      
                      {defect.action_planned && (
                        <div 
                          className="modern-action"
                          style={{
                            '--action-bg': criticalityInfo.bg,
                            '--action-border': criticalityInfo.border
                          }}
                        >
                          <div className="modern-action-label">
                            Planned Action
                          </div>
                          <p className="modern-action-text">
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