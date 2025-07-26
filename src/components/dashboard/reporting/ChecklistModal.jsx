// src/components/dashboard/reporting/ChecklistModal.jsx
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
  RefreshCw
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
  const [mode, setMode] = useState('edit'); // 'edit' or 'view'
  const [checklistStatus, setChecklistStatus] = useState(initialStatus);
  const [debugInfo, setDebugInfo] = useState({}); // CORRECTED THIS LINE
  // NEW: Track if we're in the middle of a submit operation
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser } = useAuth();

  // Determine the appropriate mode based on checklist status
  const determineMode = useCallback((checklistData) => {
    if (!checklistData) return 'edit';

    switch (checklistData.status) {
      case 'complete':
      case 'submitted': // UPDATED: Handle submitted status
        return 'view'; // Can switch to edit if needed
      case 'in_progress':
      case 'draft':
        return 'edit';
      default:
        return 'edit';
    }
  }, []);

  // UPDATED: Get status info for display with submitted status
  const getStatusInfo = useCallback((status) => {
    switch (status) {
      case 'complete':
      case 'submitted': // UPDATED: Handle submitted status same as complete
        return {
          icon: <CheckCircle size={16} />,
          label: 'Submitted',
          color: '#2ECC71',
          bgColor: 'rgba(46, 204, 113, 0.1)',
          borderColor: 'rgba(46, 204, 113, 0.3)'
        };
      case 'in_progress':
        return {
          icon: <Clock size={16} />,
          label: 'In Progress',
          color: '#F39C12',
          bgColor: 'rgba(243, 156, 18, 0.1)',
          borderColor: 'rgba(243, 156, 18, 0.3)'
        };
      case 'draft':
        return {
          icon: <FileText size={16} />,
          label: 'Draft',
          color: '#3498DB',
          bgColor: 'rgba(52, 152, 219, 0.1)',
          borderColor: 'rgba(52, 152, 219, 0.3)'
        };
      default:
        return {
          icon: <AlertTriangle size={16} />,
          label: 'Pending',
          color: '#E74C3C',
          bgColor: 'rgba(231, 76, 60, 0.1)',
          borderColor: 'rgba(231, 76, 60, 0.3)'
        };
    }
  }, []);

  // Enhanced debug logging
  const logDebug = useCallback((step, data) => {
    console.log(`ChecklistModal Debug [${step}]:`, data);
    setDebugInfo(prev => ({ ...prev, [step]: data }));
  }, []);

  // Extract user ID from various possible formats
  const getUserId = useCallback(() => {
    if (!currentUser) return null;

    // Try different possible user ID fields
    const possibleIds = [
      currentUser.id,
      currentUser.user_id,
      currentUser.userId,
      currentUser.sub,
      currentUser.email,
      currentUser.username,
      currentUser.cognito_user_id
    ];

    return possibleIds.find(id => id && id.toString().trim() !== '') || null;
  }, [currentUser]);

  // Load or create 5-day checklist
  const loadChecklist = useCallback(async () => {
    if (!vessel?.id) {
      logDebug('validation', 'No vessel ID provided');
      setError('No vessel selected');
      setLoading(false);
      return;
    }

    const userId = getUserId();
    if (!userId) {
      logDebug('validation', {
        message: 'No user ID available',
        currentUser: currentUser,
        availableFields: currentUser ? Object.keys(currentUser) : []
      });
      setError('User authentication required. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logDebug('start', {
        vesselId: vessel.id,
        vesselName: vessel.vessel_name,
        userId: userId,
        userObject: currentUser
      });

      // Step 1: Try to get existing checklists
      logDebug('step1', 'Fetching existing checklists...');
      const existingChecklists = await checklistService.getChecklistsForVessel(vessel.id);
      logDebug('step1_result', {
        count: existingChecklists.length,
        checklists: existingChecklists.map(c => ({
          id: c.checklist_id,
          template_name: c.template_name,
          status: c.status
        }))
      });

      // Step 2: Look for 5-day checklist
      let fiveDayChecklist = existingChecklists.find(checklist => {
        const templateName = (checklist.template_name || '').toLowerCase();
        return templateName.includes('5-day') ||
               templateName.includes('5 day') ||
               templateName.includes('pre-arrival') ||
               templateName.includes('five day');
      });

      logDebug('step2', {
        found: !!fiveDayChecklist,
        checklist: fiveDayChecklist ? {
          id: fiveDayChecklist.checklist_id,
          name: fiveDayChecklist.template_name,
          status: fiveDayChecklist.status
        } : null
      });

      if (fiveDayChecklist) {
        // Step 3a: Load existing checklist
        logDebug('step3a', 'Loading existing 5-day checklist...');

        const [fullChecklist, templateData] = await Promise.all([
          checklistService.getChecklistById(fiveDayChecklist.checklist_id),
          checklistService.getTemplateById(fiveDayChecklist.template_id)
        ]);

        logDebug('step3a_result', {
          checklist: {
            id: fullChecklist.checklist_id,
            status: fullChecklist.status,
            progress: fullChecklist.progress_percentage,
            responses: fullChecklist.responses?.length || 0
          },
          template: {
            id: templateData.template_id || templateData.id,
            name: templateData.name,
            items: templateData.processed_items?.length || 0
          }
        });

        setChecklist(fullChecklist);
        setTemplate(templateData);
        setChecklistStatus(fullChecklist.status || 'draft');
        setMode(determineMode(fullChecklist));

      } else {
        // Step 3b: Create new checklist
        logDebug('step3b', 'Creating new 5-day checklist...');

        try {
          const createdChecklists = await checklistService.createChecklistsForVoyage(
            vessel.id,
            {
              vessel_name: vessel.vessel_name,
              user_id: userId
            }
          );

          logDebug('step3b_created', {
            count: createdChecklists.length,
            checklists: createdChecklists.map(c => ({
              id: c.checklist_id,
              name: c.template_name,
              status: c.status
            }))
          });

          // Find the 5-day checklist from created ones
          fiveDayChecklist = createdChecklists.find(checklist => {
            const templateName = (checklist.template_name || '').toLowerCase();
            return templateName.includes('5-day') ||
                   templateName.includes('5 day') ||
                   templateName.includes('pre-arrival') ||
                   templateName.includes('five day');
          });

          if (fiveDayChecklist) {
            // Load the newly created checklist
            const [fullChecklist, templateData] = await Promise.all([
              checklistService.getChecklistById(fiveDayChecklist.checklist_id),
              checklistService.getTemplateById(fiveDayChecklist.template_id)
            ]);

            logDebug('step3b_loaded', {
              checklist: {
                id: fullChecklist.checklist_id,
                status: fullChecklist.status,
                progress: fullChecklist.progress_percentage
              },
              template: {
                id: templateData.template_id || templateData.id,
                name: templateData.name,
                items: templateData.processed_items?.length || 0
              }
            });

            setChecklist(fullChecklist);
            setTemplate(templateData);
            setChecklistStatus('draft');
            setMode('edit');
          } else {
            throw new Error('5-day checklist template not found in created checklists');
          }
        } catch (createError) {
          logDebug('step3b_error', createError);
          throw new Error(`Failed to create checklist: ${createError.message}`);
        }
      }

      logDebug('success', 'Checklist loaded successfully');

    } catch (err) {
      logDebug('error', {
        message: err.message,
        stack: err.stack
      });
      console.error('ChecklistModal: Error loading checklist:', err);
      setError(`Failed to load checklist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [vessel?.id, vessel?.vessel_name, getUserId, determineMode, logDebug]);

  // Load checklist when modal opens
  useEffect(() => {
    if (isOpen && vessel) {
      loadChecklist();
    }
  }, [isOpen, vessel, loadChecklist]);

  // Handle checklist save
  const handleSave = useCallback(async (responses, isAutoSave = false) => {
    try {
      logDebug('save_start', { isAutoSave, responseCount: Object.keys(responses).length });

      // The ModernChecklistForm handles the actual saving
      // We just need to refresh our local state after save
      if (!isAutoSave) {
        // Refresh the checklist data to get updated progress
        const updatedChecklist = await checklistService.getChecklistById(checklist.checklist_id);
        setChecklist(updatedChecklist);
        setChecklistStatus(updatedChecklist.status || 'in_progress');

        // Notify parent component about the update
        if (onChecklistUpdate) {
          onChecklistUpdate(vessel.id, {
            status: updatedChecklist.status,
            progress: updatedChecklist.progress_percentage,
            items_completed: updatedChecklist.items_completed,
            total_items: updatedChecklist.total_items
          });
        }

        logDebug('save_success', 'Checklist saved and updated');
      }
    } catch (err) {
      logDebug('save_error', err);
      console.error('ChecklistModal: Error in handleSave:', err);
      throw err; // Re-throw to let ModernChecklistForm handle the error display
    }
  }, [checklist, vessel, onChecklistUpdate, logDebug]);

  // UPDATED: Handle checklist submit with proper 409 handling and force overwrite
  const handleSubmit = useCallback(async (responses) => {
    try {
      setIsSubmitting(true);
      logDebug('submit_start', { responseCount: Object.keys(responses).length });

      console.log('🚀 ChecklistModal: Starting submit process...');

      // Call the submit API with force overwrite enabled
      const submitResult = await checklistService.submitChecklist(
        checklist.checklist_id,
        getUserId() || 'system',
        true // ✅ FORCE OVERWRITE to handle 409 conflicts
      );

      console.log('✅ ChecklistModal: Submit API result:', submitResult);

      // Handle the result - could be a new submission or a 409 handled case
      const newStatus = submitResult.checklist?.status || 'submitted';
      const wasAlreadySubmitted = submitResult.already_submitted || false;

      if (wasAlreadySubmitted) {
        console.log('⚠️ ChecklistModal: Checklist was already submitted, but handling gracefully');
      }

      // Update local state immediately
      setChecklist(prev => ({
        ...prev,
        status: newStatus,
        submitted_at: submitResult.checklist?.submitted_at,
        submitted_by: submitResult.checklist?.submitted_by,
        progress_percentage: 100
      }));
      setChecklistStatus(newStatus);
      setMode('view'); // Switch to view mode after submission

      // CRITICAL: Notify parent component with the actual backend status
      if (onChecklistUpdate) {
        console.log('📡 ChecklistModal: Notifying parent of submission...');
        onChecklistUpdate(vessel.id, {
          status: newStatus,
          progress: 100,
          items_completed: submitResult.checklist?.items_completed,
          total_items: submitResult.checklist?.total_items,
          submitted_at: submitResult.checklist?.submitted_at,
          submitted_by: submitResult.checklist?.submitted_by,
          was_already_submitted: wasAlreadySubmitted
        });
      }

      logDebug('submit_success', {
        newStatus: newStatus,
        submitted_at: submitResult.checklist?.submitted_at,
        was_already_submitted: wasAlreadySubmitted
      });

      console.log('🎉 ChecklistModal: Submit process completed successfully');

      // Show success message briefly, then close
      setTimeout(() => {
        onClose();
      }, wasAlreadySubmitted ? 1000 : 1500); // Shorter delay if already submitted

    } catch (err) {
      logDebug('submit_error', err);
      console.error('❌ ChecklistModal: Error in handleSubmit:', err);

      // Reset submitting state on error
      setIsSubmitting(false);

      // Enhanced error handling - don't show generic submit errors for 409s that we couldn't handle
      if (err.message.includes('already submitted')) {
        console.log('🔄 ChecklistModal: Treating "already submitted" as success');

        // If we get this error, treat it as a successful submission
        setChecklist(prev => ({
          ...prev,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          progress_percentage: 100
        }));
        setChecklistStatus('submitted');
        setMode('view');

        if (onChecklistUpdate) {
          onChecklistUpdate(vessel.id, {
            status: 'submitted',
            progress: 100,
            was_already_submitted: true
          });
        }

        setTimeout(() => {
          onClose();
        }, 1000);

        return; // Don't throw the error
      }

      throw err; // Re-throw other errors to let ModernChecklistForm handle the error display
    }
  }, [checklist, vessel, onChecklistUpdate, onClose, logDebug, getUserId]);

  // Handle mode toggle (view <-> edit)
  const handleModeToggle = useCallback(() => {
    setMode(prevMode => prevMode === 'view' ? 'edit' : 'view');
  }, []);

  // UPDATED: Handle modal close with proper state cleanup
  const handleClose = useCallback(() => {
    // Don't close if we're in the middle of submitting
    if (isSubmitting) {
      console.log('⏳ ChecklistModal: Preventing close during submission');
      return;
    }

    console.log('🔄 ChecklistModal: Closing and cleaning up state');

    setLoading(true);
    setError(null);
    setChecklist(null);
    setTemplate(null);
    setMode('edit');
    setChecklistStatus('pending');
    setDebugInfo({});
    setIsSubmitting(false);
    onClose();
  }, [onClose, isSubmitting]);

  if (!isOpen) return null;

  const statusInfo = getStatusInfo(checklistStatus);

  return (
    <div className="checklist-modal-overlay" onClick={!isSubmitting ? handleClose : undefined}>
      <div
        className="checklist-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="checklist-modal-header">
          <div className="checklist-modal-title">
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

          <div className="checklist-modal-status">
            {/* UPDATED: Show submitting status */}
            {isSubmitting ? (
              <div
                className="status-badge submitting"
                style={{
                  color: '#F39C12',
                  backgroundColor: 'rgba(243, 156, 18, 0.1)',
                  borderColor: 'rgba(243, 156, 18, 0.3)'
                }}
              >
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

            {/* UPDATED: Handle submitted status in mode toggle */}
            {(checklistStatus === 'complete' || checklistStatus === 'submitted') && mode === 'view' && !isSubmitting && (
              <button
                className="mode-toggle-btn"
                onClick={handleModeToggle}
                title="Edit checklist"
              >
                Edit
              </button>
            )}

            {mode === 'edit' && (checklistStatus === 'complete' || checklistStatus === 'submitted') && !isSubmitting && (
              <button
                className="mode-toggle-btn"
                onClick={handleModeToggle}
                title="View mode"
              >
                View
              </button>
            )}
          </div>

          {/* UPDATED: Disable close button during submission */}
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

        {/* Modal Body */}
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

              {/* Debug Information */}
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Debug Information</summary>
                <pre style={{
                  background: 'var(--filter-bg-light, #e9ecef)',
                  color: 'var(--text-dark, #333333)',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid var(--border-light, rgba(0, 0, 0, 0.1))'
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  className="retry-button"
                  onClick={loadChecklist}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                <button
                  className="debug-button"
                  onClick={() => {
                    console.log('=== CHECKLIST MODAL DEBUG INFO ===');
                    console.log('Vessel:', vessel);
                    console.log('Current User:', currentUser);
                    console.log('Debug Info:', debugInfo);
                    console.log('================================');
                  }}
                >
                  Log Debug Info
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
              selectedChecklist={checklist}
              disabled={isSubmitting} // NEW: Pass submitting state to form
              style={{ marginTop: '0' }}
            />
          ) : (
            <div className="checklist-modal-error">
              <AlertTriangle size={32} />
              <h3>Checklist Not Available</h3>
              <p>Could not load the 5-day checklist template</p>
              <button
                className="retry-button"
                onClick={loadChecklist}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Styles */}
      <style jsx>{`
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
          background: var(--checklist-card-bg-enhanced);
          border: 1px solid var(--checklist-card-border-enhanced);
          border-radius: 12px;
          width: 100%;
          max-width: 1200px;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--checklist-card-shadow-enhanced);
          animation: slideUp 0.3s ease-out;
          overflow: hidden;
        }

        .checklist-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--card-bg-light);
          border-bottom: 1px solid var(--border-light);
          flex-shrink: 0;
        }

        .checklist-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .title-icon {
          width: 40px;
          height: 40px;
          background: rgba(0, 123, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--checklist-primary);
          flex-shrink: 0;
        }

        .title-content h2 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-dark);
        }

        .vessel-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--text-muted-light);
        }

        .vessel-name,
        .vessel-eta,
        .vessel-port {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .vessel-imo {
          color: var(--text-muted-light);
        }

        .checklist-modal-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 13px;
          font-weight: 500;
        }

        .status-badge.submitting {
          animation: pulse 2s ease-in-out infinite;
        }

        .mode-toggle-btn {
          background: rgba(0, 123, 255, 0.1);
          border: 1px solid rgba(0, 123, 255, 0.3);
          border-radius: 6px;
          color: var(--checklist-primary);
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-toggle-btn:hover {
          background: rgba(0, 123, 255, 0.2);
          transform: translateY(-1px);
        }

        .checklist-modal-close {
          width: 36px;
          height: 36px;
          background: var(--filter-bg-light);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-muted-light);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .checklist-modal-close:hover:not(:disabled) {
          background: var(--filter-hover-light);
          border-color: var(--checklist-primary);
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
          padding: 6px;
          background: var(--background-light);
          margin-top: 2px !important;
          
        }

        .checklist-modal-loading,
        .checklist-modal-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
          color: var(--text-dark);
          flex-grow: 1;
        }

        .checklist-modal-loading .spinning {
          color: var(--checklist-primary);
          margin-bottom: 20px;
        }

        .checklist-modal-error {
          color: var(--checklist-danger);
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
          color: var(--text-muted-light);
          max-width: 400px;
          line-height: 1.5;
        }

        .retry-button,
        .debug-button {
          background: rgba(0, 123, 255, 0.1);
          border: 1px solid rgba(0, 123, 255, 0.3);
          border-radius: 8px;
          color: var(--checklist-primary);
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .retry-button:hover,
        .debug-button:hover {
          background: rgba(0, 123, 255, 0.2);
          transform: translateY(-2px);
        }

        .debug-button {
          background: var(--filter-bg-light);
          border-color: var(--border-light);
          color: var(--text-muted-light);
        }

        /* Animations */
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

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .checklist-modal-container {
            margin: 8px;
            max-width: calc(100vw - 16px);
            max-height: calc(100vh - 16px);
          }

          .checklist-modal-header {
            padding: 16px;
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }

          .checklist-modal-title {
            width: 100%;
          }

          .vessel-info {
            gap: 12px;
            font-size: 12px;
          }

          .checklist-modal-status {
            align-self: flex-end;
          }

          .checklist-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
          }

          .title-content h2 {
            font-size: 16px;
          }

          .checklist-modal-loading,
          .checklist-modal-error {
            padding: 40px 20px;
          }
        }

        @media (max-width: 480px) {
          .vessel-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
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