// src/components/dashboard/reporting/ChecklistModal.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Ship,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Loader2,
  MapPin,
  User,
  RefreshCw,
  Save, // Added Save icon
  Send // Added Send icon
} from 'lucide-react';
import ModernChecklistForm from './checklist/ModernChecklistForm';
import checklistService from '../../../services/checklistService';
import { useAuth } from '../../../context/AuthContext';
import PropTypes from 'prop-types';

const ChecklistModal = ({
  isOpen,
  onClose,
  vessel,
  onChecklistUpdate,
  initialStatus = 'pending'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [template, setTemplate] = useState(null);
  const [mode, setMode] = useState('edit');
  const [checklistStatus, setChecklistStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for saving
  const [lastSaveTime, setLastSaveTime] = useState(null); // New state for last save time

  const { currentUser } = useAuth();

  // Enhanced user ID extraction
  const getUserId = useCallback(() => {
    if (!currentUser) {
      console.error('No currentUser available');
      return null;
    }

    const possibleIds = [
      currentUser.id,
      currentUser.user_id,
      currentUser.userId,
      currentUser.sub,
      currentUser.email,
      currentUser.username,
      currentUser.cognito_user_id
    ];

    const userId = possibleIds.find(id => id && id.toString().trim() !== '') || null;
    return userId;
  }, [currentUser]);

  // Determine mode based on checklist status
  const determineMode = useCallback((checklistData) => {
    if (!checklistData) return 'edit';
    const mode = ['complete', 'submitted'].includes(checklistData.status) ? 'view' : 'edit';
    return mode;
  }, []);

  // Get status display info
  const getStatusInfo = useCallback((status) => {
    const statusMap = {
      'complete': {
        icon: <CheckCircle size={16} />,
        label: 'Complete',
        color: '#2ECC71',
        bgColor: 'rgba(46, 204, 113, 0.1)',
        borderColor: 'rgba(46, 204, 113, 0.3)'
      },
      'submitted': {
        icon: <CheckCircle size={16} />,
        label: 'Submitted',
        color: '#2ECC71',
        bgColor: 'rgba(46, 204, 113, 0.1)',
        borderColor: 'rgba(46, 204, 113, 0.3)'
      },
      'in_progress': {
        icon: <Clock size={16} />,
        label: 'In Progress',
        color: '#F39C12',
        bgColor: 'rgba(243, 156, 18, 0.1)',
        borderColor: 'rgba(243, 156, 18, 0.3)'
      },
      'draft': {
        icon: <FileText size={16} />,
        label: 'Draft',
        color: '#3498DB',
        bgColor: 'rgba(52, 152, 219, 0.1)',
        borderColor: 'rgba(52, 152, 219, 0.3)'
      },
      'pending': {
        icon: <AlertTriangle size={16} />,
        label: 'Pending',
        color: '#E74C3C',
        bgColor: 'rgba(231, 76, 60, 0.1)',
        borderColor: 'rgba(231, 76, 60, 0.3)'
      }
    };
    return statusMap[status] || statusMap['pending'];
  }, []);

  // Load or create checklist
  const loadChecklist = useCallback(async () => {
    if (!vessel?.id) {
      setError('No vessel selected');
      setLoading(false);
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('User authentication required. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get existing checklists
      const existingChecklists = await checklistService.getChecklistsForVessel(vessel.id);

      // Find 5-day checklist
      let fiveDayChecklist = existingChecklists.find(checklist => {
        const templateName = (checklist.template_name || '').toLowerCase();
        return templateName.includes('5-day') ||
               templateName.includes('5 day') ||
               templateName.includes('pre-arrival') ||
               templateName.includes('five day');
      });

      if (fiveDayChecklist) {
        // Load existing checklist
        const [fullChecklist, templateData] = await Promise.all([
          checklistService.getChecklistById(fiveDayChecklist.checklist_id),
          checklistService.getTemplateById(fiveDayChecklist.template_id)
        ]);

        setChecklist(fullChecklist);
        setTemplate(templateData);
        setChecklistStatus(fullChecklist.status || 'draft');
        setMode(determineMode(fullChecklist));
      } else {
        // Create new checklist
        const createdChecklists = await checklistService.createChecklistsForVoyage(
          vessel.id,
          { vessel_name: vessel.vessel_name, user_id: userId }
        );

        fiveDayChecklist = createdChecklists.find(checklist => {
          const templateName = (checklist.template_name || '').toLowerCase();
          return templateName.includes('5-day') ||
                 templateName.includes('5 day') ||
                 templateName.includes('pre-arrival') ||
                 templateName.includes('five day');
        });

        if (fiveDayChecklist) {
          const [fullChecklist, templateData] = await Promise.all([
            checklistService.getChecklistById(fiveDayChecklist.checklist_id),
            checklistService.getTemplateById(fiveDayChecklist.template_id)
          ]);

          setChecklist(fullChecklist);
          setTemplate(templateData);
          setChecklistStatus('draft');
          setMode('edit');
        } else {
          throw new Error('5-day checklist template not found');
        }
      }
    } catch (err) {
      console.error('❌ ChecklistModal: Error loading checklist:', err);
      setError(`Failed to load checklist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [vessel?.id, vessel?.vessel_name, getUserId, determineMode]);

  // Handle save with proper error handling and state updates
  const handleSave = useCallback(async (responses, isAutoSave = false) => {
    if (!checklist?.checklist_id) {
      throw new Error('No checklist available for saving');
    }

    try {
      if (!isAutoSave) {
        setIsSaving(true); // Set saving state for manual saves
      }

      // Convert form responses to API format
      const apiResponses = convertFormResponsesToAPI(responses, template);

      // Save via API
      const result = await checklistService.updateChecklistResponses(
        checklist.checklist_id,
        apiResponses,
        getUserId()
      );

      if (!isAutoSave) {
        // Refresh checklist data after manual save
        const updatedChecklist = await checklistService.getChecklistById(checklist.checklist_id);

        setChecklist(updatedChecklist);
        setChecklistStatus(updatedChecklist.status || 'in_progress');
        setLastSaveTime(new Date()); // Update last save time

        // Notify parent
        if (onChecklistUpdate) {
          onChecklistUpdate(vessel.id, {
            status: updatedChecklist.status,
            progress: updatedChecklist.progress_percentage,
            items_completed: updatedChecklist.items_completed,
            total_items: updatedChecklist.total_items
          });
        }
      }

      return result;
    } catch (err) {
      console.error('❌ ChecklistModal: Save error:', err);
      throw err;
    } finally {
      if (!isAutoSave) {
        setIsSaving(false); // Reset saving state
      }
    }
  }, [checklist, template, getUserId, vessel, onChecklistUpdate]);

  // Handle submit with enhanced error handling
  const handleSubmit = useCallback(async (responses) => {
    if (!checklist?.checklist_id) {
      throw new Error('No checklist available for submission');
    }

    try {
      setIsSubmitting(true);

      // First save the current responses
      await handleSave(responses, false);

      // Then submit
      const submitResult = await checklistService.submitChecklist(
        checklist.checklist_id,
        getUserId(),
        true // force overwrite
      );

      const newStatus = submitResult.checklist?.status || 'submitted';

      // Update local state
      setChecklist(prev => ({
        ...prev,
        status: newStatus,
        submitted_at: submitResult.checklist?.submitted_at,
        submitted_by: submitResult.checklist?.submitted_by,
        progress_percentage: 100
      }));
      setChecklistStatus(newStatus);
      setMode('view');

      // Notify parent
      if (onChecklistUpdate) {
        onChecklistUpdate(vessel.id, {
          status: newStatus,
          progress: 100,
          items_completed: submitResult.checklist?.items_completed,
          total_items: submitResult.checklist?.total_items,
          submitted_at: submitResult.checklist?.submitted_at,
          submitted_by: submitResult.checklist?.submitted_by
        });
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('❌ ChecklistModal: Submit error:', err);

      // Handle already submitted error gracefully
      if (err.message.includes('already submitted')) {
        setChecklistStatus('submitted');
        setMode('view');
        setTimeout(() => onClose(), 1000);
        return;
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [checklist, checklistStatus, handleSave, getUserId, vessel, onChecklistUpdate, onClose]);

  // Convert form responses to API format
  const convertFormResponsesToAPI = useCallback((formResponses, templateData) => {
    if (!templateData?.processed_items) {
      return [];
    }

    const apiResponses = [];

    templateData.processed_items.forEach((item, index) => {
      const value = formResponses[item.item_id];

      if (value === null || value === undefined) return;

      const response = {
        item_id: item.item_id,
        sr_no: index + 1,
        section: item.section_name || 'GENERAL',
        subsection: item.sub_section_name || null,
        check_description: item.description || item.check_description || '',
        pic: item.pic || '',
        response_type: item.response_type || 'text',
        yes_no_na_value: null,
        text_value: null,
        date_value: null,
        table_data: null,
        remarks: null,
        guidance: item.guidance || '',
        is_mandatory: Boolean(item.is_mandatory),
        requires_evidence: Boolean(item.requires_evidence)
      };

      // Set appropriate value based on response type
      switch (item.response_type) {
        case 'yes_no_na':
        case 'yes_no':
          response.yes_no_na_value = value;
          break;
        case 'date':
          response.date_value = value;
          break;
        case 'table':
          response.table_data = Array.isArray(value) ? value : [];
          break;
        default:
          response.text_value = String(value);
          break;
      }

      apiResponses.push(response);
    });

    return apiResponses;
  }, []);

  // Handle mode toggle
  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'view' ? 'edit' : 'view';
    setMode(newMode);
  }, [mode]);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setLoading(true);
    setError(null);
    setChecklist(null);
    setTemplate(null);
    setMode('edit');
    setChecklistStatus('pending');
    setIsSubmitting(false);
    setIsSaving(false); // Reset saving state on close
    setLastSaveTime(null); // Reset last save time on close
    onClose();
  }, [isSubmitting, onClose]);

  // Load checklist when modal opens
  useEffect(() => {
    if (isOpen && vessel) {
      loadChecklist();
    }
  }, [isOpen, vessel, loadChecklist]);

  if (!isOpen) return null;

  const statusInfo = getStatusInfo(checklistStatus);

  // Calculate progress for header display
  const progressPercentage = checklist?.progress_percentage || 0;
  const itemsCompleted = checklist?.items_completed || 0;
  const totalItems = checklist?.total_items || 0;

  return (
    <div className="checklist-modal-overlay" onClick={!isSubmitting ? handleClose : undefined}>
      <div className="checklist-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="checklist-modal-header">
          <div className="checklist-modal-title-group">
            <div className="title-icon">
              <FileText size={20} />
            </div>
            <div className="title-content">
              <h2>5-Day Pre-Arrival Checklist</h2>
              <div className="vessel-info">
                <div className="vessel-name">
                  <Ship size={14} />
                  <span>{vessel?.vessel_name || 'Unknown Vessel'}</span>
                </div>
                <div className="vessel-imo">
                  IMO: {vessel?.imo_no || 'Unknown'}
                </div>
                {vessel?.eta && (
                  <div className="vessel-eta">
                    <Calendar size={14} />
                    <span>ETA: {new Date(vessel.eta).toLocaleDateString()}</span>
                  </div>
                )}
                {vessel?.arrival_port && (
                  <div className="vessel-port">
                    <MapPin size={14} />
                    <span>{vessel.arrival_port}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="checklist-modal-controls">
            {/* Progress Display */}
            <div className="checklist-progress-display">
              <div className="progress-circle">
                <svg viewBox="0 0 20 20">
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="#007bff"
                    strokeWidth="2"
                    strokeDasharray={`${progressPercentage * 0.503}, 50.3`}
                    strokeLinecap="round"
                    transform="rotate(-90 10 10)"
                  />
                </svg>
                <span className="progress-text">{progressPercentage}%</span>
              </div>
              <div className="progress-info">
                <span>{itemsCompleted}/{totalItems} items</span>
                {/* <small>{progress.mandatoryCompleted}/{progress.mandatory} req</small> */}
              </div>
            </div>

            {/* Status Badge */}
            {isSubmitting ? (
              <div className="status-badge submitting">
                <Loader2 size={16} className="spinning" />
                <span>Submitting...</span>
              </div>
            ) : (
              <div
                className="status-badge"
                style={{
                  color: statusInfo.color,
                  backgroundColor: statusInfo.bgColor,
                  borderColor: statusInfo.borderColor
                }}
              >
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            )}

            {/* Action Buttons (Save, Submit) */}
            {mode === 'edit' && !isSubmitting && (
              <div className="checklist-action-buttons">
                <button
                  onClick={() => handleSave({}, false)} // Pass empty responses, ModernChecklistForm will provide actual responses
                  disabled={isSaving || isSubmitting}
                  className="action-btn save-btn"
                >
                  {isSaving ? <RefreshCw size={14} className="spinning" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                
                <button
                  onClick={() => handleSubmit({})} // Pass empty responses, ModernChecklistForm will provide actual responses
                  disabled={isSubmitting || isSaving || progressPercentage < 100} // Disable if not 100% complete
                  className="action-btn submit-btn"
                >
                  {isSubmitting ? <RefreshCw size={14} className="spinning" /> : <Send size={14} />}
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            )}

            {/* Last Save Time */}
            {lastSaveTime && (
              <div className="last-save-indicator">
                <small>Saved at {lastSaveTime.toLocaleTimeString()}</small>
              </div>
            )}

            {/* Mode Toggle Button */}
            {['complete', 'submitted'].includes(checklistStatus) && !isSubmitting && (
              <button
                className="mode-toggle-btn"
                onClick={handleModeToggle}
                title={mode === 'view' ? 'Edit checklist' : 'View mode'}
              >
                {mode === 'view' ? 'Edit' : 'View'}
              </button>
            )}
          </div>

          <button
            className="checklist-modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            title={isSubmitting ? "Submitting checklist..." : "Close checklist"}
            style={{
              opacity: isSubmitting ? 0.5 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="checklist-modal-body">
          {loading ? (
            <div className="checklist-modal-loading">
              <Loader2 size={32} className="spinning" />
              <h3>Loading 5-Day Checklist...</h3>
              <p>Please wait while we prepare your checklist</p>
            </div>
          ) : error ? (
            <div className="checklist-modal-error">
              <AlertTriangle size={32} />
              <h3>Error Loading Checklist</h3>
              <p>{error}</p>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="retry-button" onClick={loadChecklist}>
                  <RefreshCw size={16} />
                  Try Again
                </button>
              </div>
            </div>
          ) : template && checklist ? (
            <ModernChecklistForm
              vessel={vessel}
              template={template}
              existingChecklist={checklist}
              onSave={handleSave}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              loading={false}
              currentUser={currentUser}
              mode={mode}
              disabled={isSubmitting || isSaving} // Disable form if saving or submitting
            />
          ) : (
            <div className="checklist-modal-error">
              <AlertTriangle size={32} />
              <h3>Checklist Not Available</h3>
              <p>Could not load the 5-day checklist template</p>
              <button className="retry-button" onClick={loadChecklist}>
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        /* Your existing styles remain the same */
        .checklist-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .checklist-modal-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          width: 100%;
          max-width: 1200px;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
        }

        .checklist-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px; /* Slightly reduced padding */
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
          gap: 16px; /* Added gap for spacing between sections */
        }

        .checklist-modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0; /* Prevent shrinking */
        }

        .title-icon {
          width: 36px; /* Slightly smaller icon */
          height: 36px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .title-content h2 {
          margin: 0 0 4px 0; /* Reduced margin */
          font-size: 17px; /* Slightly smaller font */
          font-weight: 600;
          color: #1f2937;
        }

        .vessel-info {
          display: flex;
          align-items: center;
          gap: 12px; /* Reduced gap */
          flex-wrap: wrap;
          font-size: 12px; /* Slightly smaller font */
          color: #6b7280;
        }

        .vessel-name,
        .vessel-eta,
        .vessel-port {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .vessel-imo {
          color: #9ca3af;
        }

        .checklist-modal-controls {
          display: flex;
          align-items: center;
          gap: 16px; /* Spacing between controls */
          flex-grow: 1; /* Allow controls to take available space */
          justify-content: flex-end; /* Push controls to the right */
          flex-wrap: wrap; /* Allow wrapping on smaller screens */
        }

        .checklist-progress-display {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .progress-circle {
          position: relative;
          width: 28px;
          height: 28px;
        }

        .progress-circle svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 600;
          color: #007bff;
        }

        .progress-info {
          display: flex;
          flex-direction: column;
          font-size: 11px;
          line-height: 1.2;
          color: #6c757d;
        }

        .progress-info span {
          font-weight: 500;
          color: #333;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px; /* Slightly reduced padding */
          border-radius: 6px;
          border: 1px solid;
          font-size: 12px; /* Slightly smaller font */
          font-weight: 500;
          flex-shrink: 0;
        }

        .status-badge.submitting {
          color: #f59e0b;
          background-color: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        .checklist-action-buttons {
          display: flex;
          gap: 8px; /* Spacing between action buttons */
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px; /* Consistent padding */
          border: none;
          border-radius: 6px;
          font-size: 13px; /* Consistent font size */
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn.save-btn {
          background: #e2e8f0;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .action-btn.save-btn:hover:not(:disabled) {
          background: #cbd5e1;
          transform: translateY(-1px);
        }

        .action-btn.submit-btn {
          background: #22c55e; /* Green for submit */
          color: white;
        }

        .action-btn.submit-btn:hover:not(:disabled) {
          background: #16a34a;
          transform: translateY(-1px);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .last-save-indicator {
          font-size: 10px;
          color: #6c757d;
          flex-shrink: 0;
        }

        .mode-toggle-btn {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          color: #3b82f6;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .mode-toggle-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
        }

        .checklist-modal-close {
          width: 32px; /* Slightly smaller close button */
          height: 32px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .checklist-modal-close:hover:not(:disabled) {
          background: #e2e8f0;
          border-color: #3b82f6;
          transform: scale(1.05);
        }

        .checklist-modal-close:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .checklist-modal-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 0;
          background: #ffffff;
        }

        .checklist-modal-loading,
        .checklist-modal-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
          color: #374151;
          flex-grow: 1;
        }

        .checklist-modal-loading .spinning {
          color: #3b82f6;
          margin-bottom: 20px;
        }

        .checklist-modal-error {
          color: #dc2626;
        }

        .checklist-modal-loading h3,
        .checklist-modal-error h3 {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .checklist-modal-loading p,
        .checklist-modal-error p {
          margin: 0 0 24px 0;
          color: #6b7280;
          max-width: 400px;
          line-height: 1.5;
        }

        .retry-button {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          color: #3b82f6;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .retry-button:hover {
          background: rgba(59, 130, 246, 0.2);
          transform: translateY(-2px);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .checklist-modal-header {
            flex-wrap: wrap;
            justify-content: center;
            padding: 12px 16px;
          }
          .checklist-modal-title-group {
            width: 100%;
            justify-content: center;
            margin-bottom: 8px;
          }
          .checklist-modal-controls {
            width: 100%;
            justify-content: center;
            gap: 10px;
          }
          .checklist-modal-close {
            position: absolute;
            top: 12px;
            right: 12px;
          }
          .vessel-info {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .checklist-modal-container {
            margin: 8px;
            max-width: calc(100vw - 16px);
            max-height: calc(100vh - 16px);
          }

          .checklist-modal-header {
            padding: 10px 12px;
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }

          .checklist-modal-title-group {
            width: 100%;
            justify-content: flex-start;
            margin-bottom: 0;
          }

          .vessel-info {
            gap: 8px;
            font-size: 11px;
            justify-content: flex-start;
          }

          .checklist-modal-controls {
            width: 100%;
            justify-content: flex-start;
            gap: 8px;
            flex-wrap: wrap;
          }

          .checklist-action-buttons {
            flex-grow: 1;
            justify-content: flex-start;
          }

          .action-btn {
            flex: 1;
            padding: 8px 10px;
            font-size: 12px;
          }

          .status-badge, .mode-toggle-btn {
            padding: 5px 8px;
            font-size: 11px;
          }

          .checklist-modal-close {
            top: 10px;
            right: 10px;
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
};

ChecklistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vessel: PropTypes.object,
  onChecklistUpdate: PropTypes.func,
  initialStatus: PropTypes.string
};

ChecklistModal.defaultProps = {
  vessel: null,
  onChecklistUpdate: null,
  initialStatus: 'pending'
};

export default ChecklistModal;