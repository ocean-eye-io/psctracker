import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Ship,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Target,
  User,
  Info,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';
import ModernChecklistForm from './ModernChecklistForm';
import checklistService from '../../../../services/checklistService';
import { useAuth } from '../../../../context/AuthContext';
import './checklistStyles.css';
import PropTypes from 'prop-types';

const ChecklistPage = ({ vessel, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formMode, setFormMode] = useState('view');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'rows'
  const [statusFilter, setStatusFilter] = useState('all');

  const { currentUser } = useAuth();
  const selectedVessel = vessel;

  // Fetch existing checklists and auto-create if needed
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedVessel?.id) return;
    
      setLoading(true);
      setError(null);
    
      try {
        console.log('Fetching checklists for vessel:', selectedVessel.id);
        const existingChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
        console.log('Fetched checklists:', existingChecklists);
      
        setChecklists(existingChecklists);

        // Auto-create checklists if none exist
        if (existingChecklists.length === 0) {
          try {
            console.log('Auto-creating checklists for vessel:', selectedVessel.vessel_name);
            const createdChecklists = await checklistService.createChecklistsForVoyage(
              selectedVessel.id,
              {
                vessel_name: selectedVessel.vessel_name,
                user_id: currentUser?.id || 'system'
              }
            );
            console.log('Auto-created checklists:', createdChecklists);
            setChecklists(createdChecklists);
          } catch (createError) {
            console.log('Could not auto-create checklists:', createError.message);
          }
        }
      } catch (fetchError) {
        console.error('Error fetching checklist data:', fetchError);
        setError('Failed to load checklist data. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedVessel?.id, currentUser?.id]);

  const refreshChecklists = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const updatedChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
      setChecklists(updatedChecklists);
    } catch (error) {
      console.error('Error refreshing checklists:', error);
      setError('Failed to refresh checklist data. Please check your connection.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditChecklist = async (checklist) => {
    try {
      console.log('Loading checklist for editing:', checklist.checklist_id);
      const [fullChecklist, template] = await Promise.all([
        checklistService.getChecklistById(checklist.checklist_id),
        checklistService.getTemplateById(checklist.template_id)
      ]);
    
      setSelectedChecklist(fullChecklist);
      setSelectedTemplate(template);
      setFormMode('edit');
      setShowForm(true);
    } catch (error) {
      console.error('Error loading checklist for editing:', error);
      setError('Failed to load checklist for editing. Please try again.');
    }
  };

  const handleViewChecklist = async (checklist) => {
    try {
      console.log('Loading checklist for viewing:', checklist.checklist_id);
      const [fullChecklist, template] = await Promise.all([
        checklistService.getChecklistById(checklist.checklist_id),
        checklistService.getTemplateById(checklist.template_id)
      ]);
    
      setSelectedChecklist(fullChecklist);
      setSelectedTemplate(template);
      setFormMode('view');
      setShowForm(true);
    } catch (error) {
      console.error('Error loading checklist for viewing:', error);
      setError('Failed to load checklist for viewing. Please try again.');
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    if (!window.confirm('Are you sure you want to delete this checklist? This action cannot be undone.')) {
      return;
    }
    setError(null);
    try {
      await checklistService.deleteChecklist(checklistId);
      const updatedChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
      setChecklists(updatedChecklists);
    } catch (err) {
      console.error('Error deleting checklist:', err);
      setError('Failed to delete checklist. Please try again.');
    }
  };

  const handleSaveChecklist = async (responses, isAutoSave = false) => {
    try {
      if (formMode === 'edit' && selectedChecklist) {
        await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id, 
          responses, 
          currentUser.id
        );
      } else {
        throw new Error('Invalid operation: Cannot save checklist in current mode or no checklist selected.');
      }

      if (!isAutoSave) {
        const updatedChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
        setChecklists(updatedChecklists);
        setShowForm(false);
      }
    } catch (err) {
      console.error('Error saving checklist:', err);
      throw new Error('Failed to save checklist. Please try again.');
    }
  };

  const handleSubmitChecklist = async (responses) => {
    try {
      if (formMode === 'edit' && selectedChecklist) {
        await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id, 
          responses, 
          currentUser.id
        );
        await checklistService.submitChecklist(
          selectedChecklist.checklist_id, 
          currentUser.id
        );
      } else {
        throw new Error('Cannot submit checklist: Invalid mode or no checklist selected.');
      }

      const updatedChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
      setChecklists(updatedChecklists);
      setShowForm(false);
    } catch (err) {
      console.error('Error submitting checklist:', err);
      throw new Error('Failed to submit checklist. Please ensure all mandatory fields are completed.');
    }
  };

  // Helper functions
  const getChecklistStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle size={18} />;
      case 'in_progress':
        return <Clock size={18} />;
      case 'draft':
        return <FileText size={18} />;
      default:
        return <AlertTriangle size={18} />;
    }
  };

  const getChecklistStatusBadge = (status) => {
    switch (status) {
      case 'complete':
        return 'checklist-badge-success';
      case 'in_progress':
        return 'checklist-badge-warning';
      case 'draft':
        return 'checklist-badge-info';
      default:
        return 'checklist-badge-default';
    }
  };

  const getChecklistStatusText = (status) => {
    switch (status) {
      case 'complete':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  const getUrgencyLevel = (checklist, vessel) => {
    if (checklist.status === 'complete') return null;
  
    const eta = vessel.eta ? new Date(vessel.eta) : null;
    if (!eta) return null;

    const now = new Date();
    const daysToEta = Math.ceil((eta - now) / (1000 * 60 * 60 * 24));

    if (daysToEta < 0) return 'overdue';
    if (daysToEta <= 1) return 'critical';
    if (daysToEta <= 3) return 'urgent';
    if (daysToEta <= 5) return 'warning';
    return null;
  };

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case 'overdue':
      case 'critical':
        return 'checklist-badge-danger';
      case 'urgent':
        return 'checklist-badge-warning';
      case 'warning':
        return 'checklist-badge-info';
      default:
        return 'checklist-badge-default';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return 'OVERDUE';
      case 'critical':
        return 'CRITICAL';
      case 'urgent':
        return 'URGENT';
      case 'warning':
        return 'DUE SOON';
      default:
        return '';
    }
  };

  // Filter checklists based on status
  const filteredChecklists = checklists.filter(checklist => {
    if (statusFilter === 'all') return true;
    return checklist.status === statusFilter;
  });

  // Loading state
  if (loading) {
    return (
      <div className="checklist-page-container">
        <div className="checklist-loading-container">
          <div className="checklist-loading-spinner"></div>
          <div className="checklist-loading-text">Loading Maritime Checklists...</div>
        </div>
      </div>
    );
  }

  // Form view
  if (showForm && selectedTemplate) {
    return (
      <ModernChecklistForm
        vessel={vessel}
        template={selectedTemplate}
        existingChecklist={selectedChecklist}
        onSave={handleSaveChecklist}
        onSubmit={handleSubmitChecklist}
        onCancel={() => setShowForm(false)}
        loading={loading}
        currentUser={currentUser}
        mode={formMode}
      />
    );
  }

  return (
    <div className="checklist-page-container checklist-fade-in">
      {/* Enhanced Header */}
      <header className="checklist-header">
        <div className="checklist-header-title">
          <button 
            onClick={onBack}
            className="checklist-action-btn"
            aria-label="Back to vessel list"
            style={{ minWidth: 'auto', padding: '8px' }}
          >
            <ArrowLeft size={16} />
          </button>
        
          <div className="checklist-info-card-icon">
            <Ship size={20} />
          </div>
        
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Vessel Checklists</h1>
            <div className="checklist-header-info" style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '13px', color: 'var(--checklist-text-muted)' }}>
              <div className="checklist-info-item">
                <Ship size={12} />
                <span>{vessel.vessel_name}</span>
              </div>
              <div className="checklist-info-item">
                <span>IMO: {vessel.imo_no}</span>
              </div>
              <div className="checklist-info-item">
                <Calendar size={12} />
                <span>ETA: {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'TBD'}</span>
              </div>
              <div className={`checklist-badge ${vessel.event_type ? 'checklist-badge-info' : 'checklist-badge-default'}`}>
                {vessel.event_type || 'Unknown Status'}
              </div>
            </div>
          </div>
        </div>

        <div className="checklist-header-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={refreshChecklists}
            disabled={refreshing}
            className="checklist-action-btn"
            aria-label={refreshing ? 'Refreshing checklists' : 'Refresh checklists'}
          >
            <RefreshCw size={16} className={refreshing ? 'checklist-spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="checklist-content-area">
        {/* Error Message */}
        {error && (
          <div className="checklist-error-message checklist-fade-in" role="alert" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: 'var(--checklist-danger)'
          }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'var(--checklist-danger)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="checklist-info-card checklist-slide-up">
          <div className="checklist-info-card-icon">
            <Info size={20} />
          </div>
          <div className="checklist-info-card-content">
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--checklist-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
              Automatic Checklist Management
            </h3>
            <p style={{ margin: 0, color: 'var(--checklist-text-muted)', lineHeight: 1.4 }}>
              Checklists are automatically created when you visit this page based on your vessel's voyage requirements. Complete them as needed for compliance.
            </p>
          </div>
        </div>

        {/* View Controls and Filters */}
        <div className="checklist-view-controls">
          <div className="checklist-view-toggle">
            <button
              onClick={() => setViewMode('cards')}
              className={`checklist-view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            >
              <Grid3X3 size={16} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('rows')}
              className={`checklist-view-toggle-btn ${viewMode === 'rows' ? 'active' : ''}`}
            >
              <List size={16} />
              List
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter size={16} style={{ color: '#6c757d' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                color: '#495057',
                padding: '6px 12px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', color: '#6c757d', fontSize: '14px' }}>
            {filteredChecklists.length} {filteredChecklists.length === 1 ? 'checklist' : 'checklists'} 
            {statusFilter !== 'all' && ` (${statusFilter})`}
          </div>
        </div>

        {/* Checklists Section */}
        <div className="checklist-cards-container checklist-slide-up">
          {filteredChecklists.length === 0 ? (
            <div className="checklist-empty-state checklist-fade-in">
              <FileText size={48} className="checklist-empty-icon" />
              <h3 className="checklist-empty-title">
                {statusFilter === 'all' ? 'No Checklists Available' : `No ${statusFilter} checklists`}
              </h3>
              <p className="checklist-empty-description">
                {statusFilter === 'all' 
                  ? 'Checklists will be automatically created based on your vessel\'s voyage requirements and compliance needs. Please refresh if you expect to see new checklists.'
                  : `No checklists with ${statusFilter} status found. Try changing the filter or refresh the page.`
                }
              </p>
            </div>
          ) : (
            <>
              {/* Cards View */}
              {viewMode === 'cards' && (
                <div className="checklist-cards-grid">
                  {filteredChecklists.map(checklist => {
                    const urgency = getUrgencyLevel(checklist, vessel);
                    const completionPercentage = checklist.progress_percentage || 0;
                    const statusBadge = getChecklistStatusBadge(checklist.status);
                    const urgencyClass = urgency ? `checklist-${urgency}` : '';
                  
                    return (
                      <div 
                        key={checklist.checklist_id}
                        className={`checklist-card checklist-card-compact ${urgencyClass}`}
                        tabIndex="0"
                        aria-label={`Checklist: ${checklist.template_name}, Status: ${getChecklistStatusText(checklist.status)}, Progress: ${completionPercentage}%`}
                      >
                        {/* Urgency Badge */}
                        {urgency && (
                          <div className="checklist-urgency-badge">
                            <span className={`checklist-badge ${getUrgencyBadgeClass(urgency)}`}>
                              {getUrgencyText(urgency)}
                            </span>
                          </div>
                        )}

                        <div className="checklist-card-body">
                          {/* Header */}
                          <div className="checklist-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--checklist-primary), var(--checklist-secondary))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              flexShrink: 0
                            }}>
                              {getChecklistStatusIcon(checklist.status)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{
                                margin: '0 0 4px 0',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--checklist-text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {checklist.template_name || 'Unknown Template'}
                              </h3>
                              <span className={`checklist-badge ${statusBadge}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                                {getChecklistStatusText(checklist.status)}
                              </span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="checklist-progress-section">
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '6px',
                              fontSize: '12px'
                            }}>
                              <span style={{ color: 'var(--checklist-text-muted)' }}>Progress</span>
                              <span style={{ fontWeight: 600, color: 'var(--checklist-text-primary)' }}>{completionPercentage}%</span>
                            </div>
                          
                            <div className="checklist-progress-bar-container">
                              <div 
                                className={`checklist-progress-bar ${
                                  checklist.status === 'complete' ? 'checklist-complete' : 
                                  completionPercentage > 70 ? 'checklist-high' : 
                                  'checklist-normal'
                                }`}
                                style={{ width: `${completionPercentage}%` }}
                                role="progressbar"
                                aria-valuenow={completionPercentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            margin: '12px 0',
                            fontSize: '11px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Target size={12} style={{ color: 'var(--checklist-primary)', flexShrink: 0 }} />
                              <span style={{ color: 'var(--checklist-text-muted)' }}>Items:</span>
                              <span style={{ fontWeight: 500, color: 'var(--checklist-text-primary)' }}>
                                {checklist.items_completed || 0}/{checklist.total_items || 0}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} style={{ color: 'var(--checklist-primary)', flexShrink: 0 }} />
                              <span style={{ color: 'var(--checklist-text-muted)' }}>Created:</span>
                              <span style={{ fontWeight: 500, color: 'var(--checklist-text-primary)' }}>
                                {new Date(checklist.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {checklist.submitted_at && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', gridColumn: '1 / -1' }}>
                                <CheckCircle size={12} style={{ color: 'var(--checklist-success)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--checklist-text-muted)' }}>Submitted:</span>
                                <span style={{ fontWeight: 500, color: 'var(--checklist-success)' }}>
                                  {new Date(checklist.submitted_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="checklist-actions">
                            <button
                              onClick={() => handleViewChecklist(checklist)}
                              className="checklist-action-btn checklist-btn-view"
                              aria-label={`View ${checklist.template_name} checklist`}
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>

                            {checklist.status !== 'complete' && (
                              <button
                                onClick={() => handleEditChecklist(checklist)}
                                className="checklist-action-btn checklist-btn-edit"
                                aria-label={`Edit ${checklist.template_name} checklist`}
                              >
                                <Edit3 size={14} />
                                <span>Edit</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                              className="checklist-action-btn checklist-btn-delete"
                              aria-label={`Delete ${checklist.template_name} checklist`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rows View */}
              {viewMode === 'rows' && (
                <div className="checklist-rows-container" style={{ display: 'flex' }}>
                  {filteredChecklists.map(checklist => {
                    const urgency = getUrgencyLevel(checklist, vessel);
                    const completionPercentage = checklist.progress_percentage || 0;
                    const urgencyClass = urgency ? `checklist-${urgency}` : '';
                  
                    return (
                      <div 
                        key={checklist.checklist_id}
                        className={`checklist-row ${urgencyClass}`}
                        tabIndex="0"
                      >
                        <div className="checklist-row-icon">
                          {getChecklistStatusIcon(checklist.status)}
                        </div>
                        
                        <div className="checklist-row-content">
                          <div className="checklist-row-main">
                            <h4 className="checklist-row-title">
                              {checklist.template_name || 'Unknown Template'}
                            </h4>
                            <div className="checklist-row-meta">
                              <span className={`checklist-badge ${getChecklistStatusBadge(checklist.status)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {getChecklistStatusText(checklist.status)}
                              </span>
                              <span>{checklist.items_completed || 0}/{checklist.total_items || 0} items</span>
                              <span>Created: {new Date(checklist.created_at).toLocaleDateString()}</span>
                              {urgency && (
                                <span className={`checklist-badge ${getUrgencyBadgeClass(urgency)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {getUrgencyText(urgency)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="checklist-row-progress">
                            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '35px' }}>{completionPercentage}%</span>
                            <div className="checklist-row-progress-bar">
                              <div 
                                className="checklist-row-progress-fill"
                                style={{ 
                                  width: `${completionPercentage}%`,
                                  background: checklist.status === 'complete' ? 'var(--checklist-success)' : 'var(--checklist-primary)'
                                }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="checklist-row-status" style={{ minWidth: '80px' }}>
                            <span className={`checklist-badge ${getChecklistStatusBadge(checklist.status)}`} style={{ fontSize: '11px' }}>
                              {getChecklistStatusText(checklist.status)}
                            </span>
                          </div>
                          
                          <div className="checklist-row-actions">
                            <button
                              onClick={() => handleViewChecklist(checklist)}
                              className="checklist-action-btn"
                              style={{ minWidth: 'auto', padding: '6px' }}
                              aria-label="View checklist"
                            >
                              <Eye size={14} />
                            </button>
                            {checklist.status !== 'complete' && (
                              <button
                                onClick={() => handleEditChecklist(checklist)}
                                className="checklist-action-btn"
                                style={{ minWidth: 'auto', padding: '6px' }}
                                aria-label="Edit checklist"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                              className="checklist-action-btn checklist-btn-delete"
                              style={{ minWidth: 'auto', padding: '6px' }}
                              aria-label="Delete checklist"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ChecklistPage.propTypes = {
  vessel: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired
};

export default ChecklistPage;