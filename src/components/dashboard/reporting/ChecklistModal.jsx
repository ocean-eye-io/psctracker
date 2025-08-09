// src/components/dashboard/reporting/ChecklistModal.jsx - COMPLETE FINAL VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Save,
  Send,
  Download
} from 'lucide-react';
import ModernChecklistForm from './checklist/ModernChecklistForm';
import checklistService from '../../../services/checklistService';
import { useAuth } from '../../../context/AuthContext';
import PropTypes from 'prop-types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [debugInfo, setDebugInfo] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  const { currentUser } = useAuth();
  const formRef = useRef();

  // Debug logging function
  const logDebug = useCallback((step, data) => {
    console.log(`🔍 ChecklistModal Debug [${step}]:`, data);
    setDebugInfo(prev => ({ ...prev, [step]: data }));
  }, []);

  // Enhanced user ID extraction
  const getUserId = useCallback(() => {
    if (!currentUser) {
      logDebug('getUserId_error', 'No currentUser available');
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
    logDebug('getUserId_result', { userId, availableFields: Object.keys(currentUser) });
    return userId;
  }, [currentUser, logDebug]);

  // Determine mode based on checklist status
  const determineMode = useCallback((checklistData) => {
    if (!checklistData) return 'edit';
    const mode = ['complete', 'submitted'].includes(checklistData.status) ? 'view' : 'edit';
    logDebug('determineMode', { status: checklistData.status, mode });
    return mode;
  }, [logDebug]);

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
      logDebug('loadChecklist_start', { vesselId: vessel.id, userId });

      // Get existing checklists
      const existingChecklists = await checklistService.getChecklistsForVessel(vessel.id);
      logDebug('existing_checklists', existingChecklists);

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
        logDebug('loading_existing', fiveDayChecklist);
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
        logDebug('creating_new', 'No existing 5-day checklist found');
        const createdChecklists = await checklistService.createChecklistsForVoyage(
          vessel.id,
          { vessel_name: vessel.vessel_name, user_id: userId }
        );
        
        // ADD DEBUGGING TO SEE WHAT WE GOT
        console.log('🔍 API Response - Full Response:', createdChecklists);
        console.log('🔍 Available Templates:', createdChecklists.map(c => ({
          id: c.checklist_id,
          template_name: c.template_name,
          template_id: c.template_id
        })));
        
        fiveDayChecklist = createdChecklists.find(checklist => {
          const templateName = (checklist.template_name || '').toLowerCase();
          console.log('🔍 Checking template name:', templateName); // SEE EACH NAME
          
          const matches = templateName.includes('5-day') ||
                 templateName.includes('5 day') ||
                 templateName.includes('pre-arrival') ||
                 templateName.includes('five day');
                 
          if (matches) {
            console.log('✅ Found matching template:', templateName);
          }
          
          return matches;
        });
        
        console.log('🔍 Final fiveDayChecklist result:', fiveDayChecklist);
        
        if (fiveDayChecklist) {
          // Your existing code...
        } else {
          // ENHANCED ERROR MESSAGE
          const availableNames = createdChecklists.map(c => c.template_name).join(', ');
          throw new Error(`5-day checklist template not found. Available templates: ${availableNames}`);
        }

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

      logDebug('loadChecklist_success', 'Checklist loaded successfully');
    } catch (err) {
      logDebug('loadChecklist_error', err);
      console.error('❌ ChecklistModal: Error loading checklist:', err);
      setError(`Failed to load checklist: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [vessel?.id, vessel?.vessel_name, getUserId, determineMode, logDebug]);

  // Convert form responses to API format
  const convertFormResponsesToAPI = useCallback((formResponses, templateData) => {
    if (!templateData?.processed_items) {
      logDebug('convert_error', 'No processed items in template');
      return [];
    }

    const apiResponses = [];

    templateData.processed_items.forEach((item, index) => {
      const value = formResponses[item.item_id];

      // Skip empty values (null, undefined, or empty string)
      if (value === null || value === undefined || value === '') return;

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
          // Enhanced date handling - ensure proper format
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            response.date_value = value; // Already in YYYY-MM-DD format
          } else if (value) {
            // Try to parse and format
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
              response.date_value = parsedDate.toISOString().split('T')[0];
            } else {
              response.date_value = value; // Keep original if parsing fails
            }
          }
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

    logDebug('convert_result', {
      inputCount: Object.keys(formResponses).length,
      outputCount: apiResponses.length
    });

    return apiResponses;
  }, [logDebug]);

  // Handle save with proper error handling and state updates
  const handleSave = useCallback(async (_, isAutoSave = false) => {
    if (!checklist?.checklist_id || !formRef.current) {
      throw new Error('No checklist or form available for saving');
    }

    try {
      if (!isAutoSave) {
        setIsSaving(true);
      }
      
      // Get current responses from form
      const currentResponses = formRef.current.getCurrentResponses();
      
      logDebug('save_start', {
        checklistId: checklist.checklist_id,
        responseCount: Object.keys(currentResponses).length,
        isAutoSave
      });

      // Convert form responses to API format
      const apiResponses = convertFormResponsesToAPI(currentResponses, template);
      logDebug('converted_responses', {
        originalCount: Object.keys(currentResponses).length,
        convertedCount: apiResponses.length
      });

      // Save via API
      const result = await checklistService.updateChecklistResponses(
        checklist.checklist_id,
        apiResponses,
        getUserId()
      );

      logDebug('save_api_result', result);

      if (!isAutoSave) {
        // Refresh checklist data after manual save
        const updatedChecklist = await checklistService.getChecklistById(checklist.checklist_id);

        setChecklist(updatedChecklist);
        setChecklistStatus(updatedChecklist.status || 'in_progress');
        setLastSaveTime(new Date());

        // Notify parent
        if (onChecklistUpdate) {
          onChecklistUpdate(vessel.id, {
            status: updatedChecklist.status,
            progress: updatedChecklist.progress_percentage,
            items_completed: updatedChecklist.items_completed,
            total_items: updatedChecklist.total_items
          });
        }

        logDebug('save_success', 'Manual save completed');
      } else {
        logDebug('save_success', 'Auto-save completed');
      }

      return result;
    } catch (err) {
      logDebug('save_error', err);
      console.error('❌ ChecklistModal: Save error:', err);
      throw err;
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  }, [checklist, template, getUserId, vessel, onChecklistUpdate, logDebug, convertFormResponsesToAPI]);

  // Handle submit with enhanced error handling
  const handleSubmit = useCallback(async () => {
    if (!checklist?.checklist_id || !formRef.current) {
      throw new Error('No checklist or form available for submission');
    }

    try {
      setIsSubmitting(true);
      
      // Get current responses from form
      const currentResponses = formRef.current.getCurrentResponses();
      
      logDebug('submit_start', {
        checklistId: checklist.checklist_id,
        responseCount: Object.keys(currentResponses).length,
        currentStatus: checklistStatus
      });

      // Validate form first using form's validation
      const validation = formRef.current.getFormValidation();
      if (!validation.isValid) {
        console.error('❌ ChecklistModal: Validation failed:', validation.errors);
        alert(`Please complete all required fields:\n${Object.values(validation.errors).join('\n')}`);
        return;
      }

      // First save the current responses
      await handleSave(null, false);

      // Then submit
      const submitResult = await checklistService.submitChecklist(
        checklist.checklist_id,
        getUserId(),
        true // force overwrite
      );

      logDebug('submit_api_result', submitResult);

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

      logDebug('submit_success', 'Submission completed');

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      logDebug('submit_error', err);
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
  }, [checklist, checklistStatus, handleSave, getUserId, vessel, onChecklistUpdate, onClose, logDebug]);

  // Handle mode toggle
  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'view' ? 'edit' : 'view';
    setMode(newMode);
    logDebug('mode_toggle', { from: mode, to: newMode });
  }, [mode, logDebug]);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (isSubmitting) {
      logDebug('close_prevented', 'Submission in progress');
      return;
    }

    logDebug('close_modal', 'Cleaning up and closing');

    setLoading(true);
    setError(null);
    setChecklist(null);
    setTemplate(null);
    setMode('edit');
    setChecklistStatus('pending');
    setDebugInfo({});
    setIsSubmitting(false);
    setIsSaving(false);
    setLastSaveTime(null);
    onClose();
  }, [isSubmitting, onClose, logDebug]);

  // Enhanced PDF Download Functionality - Uses Current Form Data
  const handleDownloadPdf = useCallback(() => {
    if (!checklist || !template || !formRef.current) {
      alert('Checklist data not available for download.');
      return;
    }

    try {
      // Get current responses from form for PDF generation
      const currentResponses = formRef.current.getCurrentResponses();
      
      const doc = new jsPDF('p', 'mm', 'a4');
      
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function for page breaks
      const checkPageBreak = (requiredSpace = 15) => {
        if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };

      // Header
      doc.setFillColor(45, 55, 72);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('5-DAY PRE-ARRIVAL CHECKLIST', margin, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(vessel?.vessel_name || 'Unknown Vessel', margin, 23);

      yPos = 40;

      // Vessel information
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('VESSEL INFORMATION', margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Vessel: ${vessel?.vessel_name || 'Unknown'}`, margin, yPos);
      doc.text(`IMO: ${vessel?.imo_no || 'N/A'}`, margin + 80, yPos);
      yPos += 6;
      
      doc.text(`Port: ${vessel?.arrival_port || 'N/A'}`, margin, yPos);
      doc.text(`ETA: ${vessel?.eta ? new Date(vessel.eta).toLocaleDateString() : 'N/A'}`, margin + 80, yPos);
      yPos += 6;

      const statusInfo = getStatusInfo(checklistStatus);
      doc.text(`Status: ${statusInfo.label}`, margin, yPos);
      doc.text(`Progress: ${checklist?.progress_percentage || 0}%`, margin + 80, yPos);
      yPos += 12;

      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Checklist items
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CHECKLIST ITEMS', margin, yPos);
      yPos += 10;

      // Group items by section
      const groupedItems = {};
      template.processed_items.forEach(item => {
        const sectionKey = item.section_name || 'General';
        if (!groupedItems[sectionKey]) {
          groupedItems[sectionKey] = [];
        }
        groupedItems[sectionKey].push(item);
      });

      let itemCounter = 1;
      Object.entries(groupedItems).forEach(([sectionName, sectionItems]) => {
        checkPageBreak(12);

        // Section header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text(`${sectionName.toUpperCase()}`, margin, yPos);
        yPos += 8;

        // Section items
        sectionItems.forEach(item => {
          checkPageBreak(15);

          // Get current response for this item from form
          const currentValue = currentResponses[item.item_id];
          
          // Item number and description
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          
          const itemNum = itemCounter.toString() + (item.is_mandatory ? '*' : '');
          doc.text(itemNum, margin, yPos);
          
          // Description (with word wrapping)
          doc.setFont('helvetica', 'normal');
          const description = item.description || item.check_description || '';
          const descriptionLines = doc.splitTextToSize(description, contentWidth - 60);
          doc.text(descriptionLines, margin + 12, yPos);
          
          const descHeight = descriptionLines.length * 3;

          // Response value - use current form data
          let responseText = 'Not Answered';
          if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
            if (item.response_type === 'yes_no' || item.response_type === 'yes_no_na') {
              responseText = currentValue;
              // Set color based on response
              if (currentValue === 'Yes') {
                doc.setTextColor(16, 185, 129); // Green
              } else if (currentValue === 'No') {
                doc.setTextColor(239, 68, 68); // Red
              } else {
                doc.setTextColor(245, 158, 11); // Orange
              }
            } else if (item.response_type === 'date') {
              responseText = currentValue.match(/^\d{4}-\d{2}-\d{2}$/) ? 
                new Date(currentValue).toLocaleDateString() : 
                currentValue;
              doc.setTextColor(30, 41, 59);
            } else if (Array.isArray(currentValue)) {
              responseText = `Table data (${currentValue.length} entries)`;
              doc.setTextColor(30, 41, 59);
            } else {
              responseText = currentValue.length > 30 ? 
                currentValue.substring(0, 30) + '...' : 
                currentValue;
              doc.setTextColor(30, 41, 59);
            }
          } else {
            doc.setTextColor(156, 163, 175); // Gray for no response
          }

          doc.setFont('helvetica', 'bold');
          doc.text(responseText, pageWidth - margin - 45, yPos);

          // PIC if available
          if (item.pic) {
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text(`PIC: ${item.pic}`, margin + 12, yPos + descHeight + 3);
          }

          yPos += Math.max(descHeight + 8, 12);
          itemCounter++;
        });

        yPos += 5; // Space between sections
      });

      // Footer
      checkPageBreak(20);
      yPos += 8;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Summary
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY:', margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`${checklist?.items_completed || 0}/${checklist?.total_items || 0} items completed (${checklist?.progress_percentage || 0}%)`, margin + 25, yPos);
      
      if (checklist.submitted_at) {
        doc.text(`Submitted: ${new Date(checklist.submitted_at).toLocaleDateString()}`, margin + 100, yPos);
      }

      yPos += 10;

      // Signature lines
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Officer: _________________________ Date: _________', margin, yPos);
      yPos += 6;
      doc.text('Master: __________________________ Date: _________', margin, yPos);

      // Add page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        
        const pageText = `Page ${i} of ${totalPages}`;
        const textWidth = doc.getTextWidth(pageText);
        doc.text(pageText, pageWidth - margin - textWidth, doc.internal.pageSize.getHeight() - 8);
        
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, doc.internal.pageSize.getHeight() - 8);
      }

      // Generate filename
      const vesselName = vessel?.vessel_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Vessel';
      const date = new Date().toISOString().slice(0, 10);
      const filename = `${vesselName}_PreArrival_${date}.pdf`;
      
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }, [checklist, template, vessel, checklistStatus, getStatusInfo]);

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

            {/* Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={!checklist || !template || isSubmitting || isSaving}
              className="action-btn download-btn"
              title="Download Checklist as PDF"
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Action Buttons (Save, Submit) */}
            {mode === 'edit' && !isSubmitting && (
              <div className="checklist-action-buttons">
                <button
                  onClick={() => handleSave(null, false)}
                  disabled={isSaving || isSubmitting}
                  className="action-btn save-btn"
                >
                  {isSaving ? <RefreshCw size={14} className="spinning" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>

                <button
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || isSaving || progressPercentage < 100}
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

              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>Debug Information</summary>
                <pre style={{
                  background: '#f8f9fa',
                  color: '#333',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid #dee2e6'
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="retry-button" onClick={loadChecklist}>
                  <RefreshCw size={16} />
                  Try Again
                </button>
              </div>
            </div>
          ) : template && checklist ? (
            <ModernChecklistForm
              ref={formRef}
              vessel={vessel}
              template={template}
              existingChecklist={checklist}
              onSave={handleSave}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              loading={false}
              currentUser={currentUser}
              mode={mode}
              disabled={isSubmitting || isSaving}
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

      {/* Complete Styles */}
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
          padding: 12px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
          gap: 16px;
        }

        .checklist-modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .title-icon {
          width: 36px;
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
          margin: 0 0 4px 0;
          font-size: 17px;
          font-weight: 600;
          color: #1f2937;
        }

        .vessel-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
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
          gap: 16px;
          flex-grow: 1;
          justify-content: flex-end;
          flex-wrap: wrap;
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
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 12px;
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
          gap: 8px;
          flex-shrink: 0;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
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
          background: #22c55e;
          color: white;
        }

        .action-btn.submit-btn:hover:not(:disabled) {
          background: #16a34a;
          transform: translateY(-1px);
        }

        .action-btn.download-btn {
          background: #007bff;
          color: white;
        }

        .action-btn.download-btn:hover:not(:disabled) {
          background: #0056b3;
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
          width: 32px;
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

        /* Responsive Design */
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