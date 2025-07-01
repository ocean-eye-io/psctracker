// src/components/dashboard/reporting/checklist/ChecklistPage.jsx
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
  Info
} from 'lucide-react';
import ModernChecklistForm from './ModernChecklistForm';
import checklistService from '../../../../services/checklistService';
import { useAuth } from '../../../../context/AuthContext';
import '../../DashboardStyles.css'; // Assuming this provides base dashboard styles
import './checklistStyles.css'; // Your new checklist-specific styles
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
            // Do not set global error for auto-create failure, as it's a background process
            // and we still want to show the empty state.
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
    setError(null); // Clear previous errors on refresh
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
      
      console.log('Full checklist:', fullChecklist);
      console.log('Template:', template);
      
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
      
      console.log('Full checklist:', fullChecklist);
      console.log('Template:', template);
      
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
    setError(null); // Clear previous errors before new action
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
      // Re-throw to allow ModernChecklistForm to handle its own error state
      throw new Error('Failed to save checklist. Please try again.');
    }
  };

  const handleSubmitChecklist = async (responses) => {
    try {
      if (formMode === 'edit' && selectedChecklist) {
        // First update responses
        await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id, 
          responses, 
          currentUser.id
        );
        
        // Then submit
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
      // Re-throw to allow ModernChecklistForm to handle its own error state
      throw new Error('Failed to submit checklist. Please ensure all mandatory fields are completed.');
    }
  };

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

  if (loading) {
    return (
      <div className="dashboard-container checklist-page-container">
        <div className="checklist-loading-container">
          <div className="checklist-loading-spinner"></div>
          <div className="checklist-loading-text">Loading Maritime Checklists...</div>
        </div>
      </div>
    );
  }

  if (showForm && selectedTemplate) {
    return (
      <ModernChecklistForm
        vessel={vessel}
        template={selectedTemplate}
        existingChecklist={selectedChecklist}
        onSave={handleSaveChecklist}
        onSubmit={handleSubmitChecklist}
        onCancel={() => setShowForm(false)}
        loading={loading} // Pass loading state to form if needed
        currentUser={currentUser}
        mode={formMode}
      />
    );
  }

  return (
    <div className="dashboard-container checklist-page-container checklist-fade-in">
      {/* Dashboard Header */}
      <header className="dashboard-header checklist-header">
        <div className="dashboard-title checklist-header-title">
          <button 
            onClick={onBack}
            className="control-btn checklist-back-btn" // Added checklist-back-btn for specific styling
            aria-label="Back to vessel list"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="stat-card-icon checklist-header-icon">
            <Ship size={20} />
          </div>
          
          <div>
            <h1>Vessel Checklists</h1>
            <div className="fleet-stats checklist-header-info">
              <div className="fleet-count checklist-info-item">
                <Ship size={14} />
                <span>{vessel.vessel_name}</span>
              </div>
              <div className="fleet-count checklist-info-item">
                <span>IMO: {vessel.imo_no}</span>
              </div>
              <div className="fleet-count checklist-info-item">
                <Calendar size={14} />
                <span>ETA: {vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'TBD'}</span>
              </div>
              <div className={`badge ${vessel.event_type ? 'badge-info' : 'badge-default'}`}>
                {vessel.event_type || 'Unknown Status'}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-controls checklist-header-controls">
          <button
            onClick={refreshChecklists}
            disabled={refreshing}
            className="control-btn export-btn checklist-action-btn" // Added checklist-action-btn
            aria-label={refreshing ? 'Refreshing checklists' : 'Refresh checklists'}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="content-area checklist-content-area">
        {/* Error Message */}
        {error && (
          <div className="error-message checklist-error-message checklist-fade-in" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="checklist-error-close"
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="checklist-info-card checklist-slide-up">
          <div className="stat-card-icon checklist-info-card-icon">
            <Info size={20} /> {/* Changed icon to Info for general info */}
          </div>
          <div className="checklist-info-card-content">
            <h3>Automatic Checklist Management</h3>
            <p>
              Checklists are automatically created when you visit this page based on your vessel's voyage requirements. Complete them as needed for compliance.
            </p>
          </div>
        </div>

        {/* Checklists Section */}
        <div className="dashboard-card checklist-cards-container checklist-slide-up">
          <div className="dashboard-card-body">
            <div className="checklist-cards-header">
              <h2>Available Checklists</h2>
              <div className="checklist-cards-count">
                {checklists.length} {checklists.length === 1 ? 'checklist' : 'checklists'} available
              </div>
            </div>

            {checklists.length === 0 ? (
              <div className="checklist-empty-state checklist-fade-in">
                <FileText size={48} className="checklist-empty-icon" />
                <h3 className="checklist-empty-title">No Checklists Available</h3>
                <p className="checklist-empty-description">
                  Checklists will be automatically created based on your vessel's voyage requirements and compliance needs. Please refresh if you expect to see new checklists.
                </p>
              </div>
            ) : (
              <div className="checklist-cards-grid">
                {checklists.map(checklist => {
                  const urgency = getUrgencyLevel(checklist, vessel);
                  const completionPercentage = checklist.progress_percentage || 0;
                  const statusBadge = getChecklistStatusBadge(checklist.status);
                  const urgencyClass = urgency ? `checklist-${urgency}` : '';
                  
                  return (
                    <div 
                      key={checklist.checklist_id}
                      className={`dashboard-card checklist-card ${urgencyClass}`}
                      tabIndex="0" // Make card focusable for accessibility
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

                      <div className="dashboard-card-body checklist-card-body">
                        {/* Header */}
                        <div className="checklist-card-header">
                          <div className="stat-card-icon checklist-card-header-icon">
                            {getChecklistStatusIcon(checklist.status)}
                          </div>
                          <div className="checklist-card-header-content">
                            <h3 className="checklist-card-title">
                              {checklist.template_name || 'Unknown Template'}
                            </h3>
                            <span className={`checklist-badge ${statusBadge} checklist-card-status`}>
                              {getChecklistStatusText(checklist.status)}
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="checklist-progress-section">
                          <div className="checklist-progress-header">
                            <span className="checklist-progress-label">Progress</span>
                            <span className="checklist-progress-value">{completionPercentage}%</span>
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
                        <div className="checklist-metadata">
                          <div className="checklist-metadata-item">
                            <Target size={14} className="checklist-metadata-icon" />
                            <span className="checklist-metadata-label">Items:</span>
                            <span className="checklist-metadata-value">
                              {checklist.items_completed || 0}/{checklist.total_items || 0}
                            </span>
                          </div>
                          <div className="checklist-metadata-item">
                            <Calendar size={14} className="checklist-metadata-icon" />
                            <span className="checklist-metadata-label">Created:</span>
                            <span className="checklist-metadata-value">
                              {new Date(checklist.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {checklist.submitted_at && (
                            <div className="checklist-metadata-item checklist-metadata-submitted">
                              <CheckCircle size={14} className="checklist-metadata-icon" />
                              <span className="checklist-metadata-label">Submitted:</span>
                              <span className="checklist-metadata-value">
                                {new Date(checklist.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {checklist.last_updated_by && (
                            <div className="checklist-metadata-item">
                              <User size={14} className="checklist-metadata-icon" />
                              <span className="checklist-metadata-label">Last Updated By:</span>
                              <span className="checklist-metadata-value">
                                {checklist.last_updated_by}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="checklist-actions">
                          <button
                            onClick={() => handleViewChecklist(checklist)}
                            className="checklist-action-btn checklist-btn-view control-btn"
                            aria-label={`View ${checklist.template_name} checklist`}
                          >
                            <Eye size={16} />
                            <span>View</span>
                          </button>

                          {checklist.status !== 'complete' && (
                            <button
                              onClick={() => handleEditChecklist(checklist)}
                              className="checklist-action-btn checklist-btn-edit control-btn export-btn"
                              aria-label={`Edit ${checklist.template_name} checklist`}
                            >
                              <Edit3 size={16} />
                              <span>Edit</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                            className="checklist-action-btn checklist-btn-delete"
                            aria-label={`Delete ${checklist.template_name} checklist`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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