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
  Eye
} from 'lucide-react';
import ChecklistForm from './ChecklistForm';
import checklistService from '../../../../services/checklistService';
import { useAuth } from '../../../../context/AuthContext';
import PropTypes from 'prop-types';

const ChecklistPage = ({ vessel, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formMode, setFormMode] = useState('view'); // Only 'edit' and 'view' modes now
  
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
            // This is not a critical error, just log it
          }
        }
      } catch (fetchError) {
        console.error('Error fetching checklist data:', fetchError);
        setError('Failed to load checklist data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedVessel?.id, currentUser?.id]);

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
      setError('Failed to load checklist. Please try again.');
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
      setError('Failed to load checklist. Please try again.');
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    if (!window.confirm('Are you sure you want to delete this checklist? This action cannot be undone.')) {
      return;
    }

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
        throw new Error('Invalid operation');
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
        throw new Error('Cannot submit checklist');
      }

      const updatedChecklists = await checklistService.getChecklistsForVessel(selectedVessel.id);
      setChecklists(updatedChecklists);
      setShowForm(false);
    } catch (err) {
      console.error('Error submitting checklist:', err);
      throw new Error('Failed to submit checklist. Please try again.');
    }
  };

  const getChecklistStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle size={20} color="var(--success-color)" />;
      case 'in_progress':
        return <Clock size={20} color="var(--warning-color)" />;
      case 'draft':
        return <FileText size={20} color="var(--blue-accent)" />;
      default:
        return <AlertTriangle size={20} color="var(--text-muted)" />;
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

  if (loading) {
    return (
      <div className="checklist-page loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading checklists...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="checklist-page">
        <ChecklistForm
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
      </div>
    );
  }

  return (
    <div className="checklist-page">
      <style jsx>{`
        .checklist-page {
          background: var(--primary-dark);
          min-height: 100vh;
          color: var(--text-light);
        }

        .checklist-page.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(244, 244, 244, 0.1);
          border-radius: 50%;
          border-top: 3px solid var(--blue-accent);
          animation: spin 1s linear infinite;
        }

        .page-header {
          background: var(--secondary-dark);
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
          top: 50px;
          position: sticky;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .back-button {
          background: rgba(244, 244, 244, 0.1);
          border: none;
          color: var(--text-light);
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          background: rgba(244, 244, 244, 0.2);
          transform: translateX(-2px);
        }

        .page-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .vessel-summary {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .vessel-info {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          border-radius: 6px;
        }

        .vessel-info .label {
          color: var(--blue-accent);
          font-weight: 500;
        }

        .page-content {
          padding: 24px;
          
        }

        .error-message {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.3);
          color: var(--danger-color);
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .existing-checklists {
          background: var(--card-bg);
          border-radius: 8px;
          overflow: hidden;
        }

        .checklists-header {
          background: linear-gradient(180deg, #0a1725, #112032);
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--text-light);
        }

        .checklists-list {
          padding: 0;
        }

        .checklist-item {
          border-bottom: 1px solid var(--border-subtle);
          padding: 16px 20px;
          transition: all 0.2s ease;
          position: relative;
        }

        .checklist-item:last-child {
          border-bottom: none;
        }

        .checklist-item:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        .checklist-item.overdue {
          border-left: 3px solid var(--danger-color);
          background: rgba(231, 76, 60, 0.05);
        }

        .checklist-item.critical {
          border-left: 3px solid var(--warning-color);
          background: rgba(241, 196, 15, 0.05);
        }

        .checklist-item.urgent {
          border-left: 3px solid #FF8C00;
          background: rgba(255, 140, 0, 0.05);
        }

        .checklist-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .checklist-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .checklist-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checklist-details {
          flex: 1;
        }

        .checklist-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .checklist-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .checklist-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          background: rgba(244, 244, 244, 0.1);
          border: none;
          color: var(--text-light);
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: rgba(244, 244, 244, 0.2);
          transform: scale(1.05);
        }

        .action-btn.edit:hover {
          background: rgba(52, 152, 219, 0.2);
          color: #3498DB;
        }

        .action-btn.delete:hover {
          background: rgba(231, 76, 60, 0.2);
          color: var(--danger-color);
        }

        .action-btn.view:hover {
          background: rgba(46, 204, 113, 0.2);
          color: var(--success-color);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }

        .empty-icon {
          margin-bottom: 16px;
        }

        .urgency-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .urgency-badge.overdue {
          background: var(--danger-color);
          color: white;
        }

        .urgency-badge.critical {
          background: var(--warning-color);
          color: white;
        }

        .urgency-badge.urgent {
          background: #FF8C00;
          color: white;
        }

        .urgency-badge.warning {
          background: rgba(241, 196, 15, 0.2);
          color: var(--warning-color);
          border: 1px solid var(--warning-color);
        }

        .auto-create-notice {
          background: rgba(59, 173, 229, 0.1);
          border: 1px solid rgba(59, 173, 229, 0.3);
          color: var(--blue-accent);
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .vessel-summary {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .checklist-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .checklist-actions {
            align-self: flex-end;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div className="header-top">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="page-title">Vessel Checklists</h1>
        </div>

        <div className="vessel-summary">
          <div className="vessel-info">
            <Ship size={16} />
            <span className="label">Vessel:</span>
            <span>{vessel.vessel_name}</span>
          </div>
          <div className="vessel-info">
            <span className="label">IMO:</span>
            <span>{vessel.imo_no}</span>
          </div>
          <div className="vessel-info">
            <Calendar size={16} />
            <span className="label">ETA:</span>
            <span>{vessel.eta ? new Date(vessel.eta).toLocaleDateString() : 'TBD'}</span>
          </div>
          <div className="vessel-info">
            <span className="label">Status:</span>
            <span>{vessel.event_type || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {error && (
          <div className="error-message">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Auto-create Notice */}
        <div className="auto-create-notice">
          <FileText size={16} />
          <span>Checklists are automatically created when you visit this page. Complete them as needed for your voyage.</span>
        </div>

        {/* Existing Checklists Section */}
        <div className="existing-checklists">
          <div className="checklists-header">
            <h2 className="section-title">Vessel Checklists</h2>
          </div>

          <div className="checklists-list">
            {checklists.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileText size={48} color="var(--text-muted)" />
                </div>
                <p>No checklists available yet.</p>
                <p>Checklists will be automatically created based on your vessel's voyage requirements.</p>
              </div>
            ) : (
              checklists.map(checklist => {
                const urgency = getUrgencyLevel(checklist, vessel);
                return (
                  <div 
                    key={checklist.checklist_id} 
                    className={`checklist-item ${urgency || ''}`}
                  >
                    {urgency && (
                      <div className={`urgency-badge ${urgency}`}>
                        {urgency === 'overdue' && 'Overdue'}
                        {urgency === 'critical' && 'Critical'}
                        {urgency === 'urgent' && 'Urgent'}
                        {urgency === 'warning' && 'Due Soon'}
                      </div>
                    )}

                    <div className="checklist-content">
                      <div className="checklist-info">
                        <div className="checklist-status">
                          {getChecklistStatusIcon(checklist.status)}
                          <span>{getChecklistStatusText(checklist.status)}</span>
                        </div>

                        <div className="checklist-details">
                          <div className="checklist-name">
                            {checklist.template_name || 'Unknown Template'}
                          </div>
                          <div className="checklist-meta">
                            <span>Created: {new Date(checklist.created_at).toLocaleDateString()}</span>
                            {checklist.submitted_at && (
                              <span>Submitted: {new Date(checklist.submitted_at).toLocaleDateString()}</span>
                            )}
                            <span>Progress: {checklist.progress_percentage || 0}%</span>
                            <span>Items: {checklist.items_completed || 0}/{checklist.total_items || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="checklist-actions">
                        <button
                          className="action-btn view"
                          onClick={() => handleViewChecklist(checklist)}
                          title="View checklist"
                        >
                          <Eye size={16} />
                        </button>

                        {checklist.status !== 'complete' && (
                          <button
                            className="action-btn edit"
                            onClick={() => handleEditChecklist(checklist)}
                            title="Edit checklist"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}

                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteChecklist(checklist.checklist_id)}
                          title="Delete checklist"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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