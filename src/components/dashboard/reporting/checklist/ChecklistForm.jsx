// src/components/dashboard/reporting/checklist/ChecklistForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Download,
  X
} from 'lucide-react';
import PropTypes from 'prop-types';

const ChecklistForm = ({ 
  vessel, 
  template, 
  existingChecklist, 
  onSave, 
  onSubmit, 
  onCancel, 
  loading, 
  currentUser,
  mode = 'edit' 
}) => {
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  // Get items from processed template
  const items = useMemo(() => {
    console.log('ChecklistForm - Processing template:', template);
    
    if (!template) {
      console.warn('ChecklistForm - No template provided');
      return [];
    }
    
    if (!template.processed_items) {
      console.warn('ChecklistForm - Template has no processed_items:', template);
      
      // Try to process template data if it exists but wasn't processed
      if (template.template_data && template.template_data.sections) {
        console.log('ChecklistForm - Attempting to process template data manually');
        const manualItems = [];
        
        template.template_data.sections.forEach((section) => {
          const sectionName = section.section_name || section.name || 'Unknown Section';
          
          // Check for subsections (lowercase)
          if (section.subsections && Array.isArray(section.subsections)) {
            section.subsections.forEach((subSection) => {
              const subSectionName = subSection.subsection_name || subSection.name || 'Unknown Subsection';
              
              if (subSection.items && Array.isArray(subSection.items)) {
                subSection.items.forEach((item, itemIndex) => {
                  manualItems.push({
                    item_id: item.item_id || `${sectionName}_${subSectionName}_${itemIndex}`,
                    section_name: sectionName,
                    sub_section_name: subSectionName,
                    check_description: item.check || item.check_description || '',
                    pic: item.pic || '',
                    guidance: item.guidance || '',
                    response_type: 'yes_no_na', // Default response type
                    is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
                    requires_evidence: item.requires_evidence || false,
                    order_index: manualItems.length
                  });
                });
              }
            });
          }
          // Check for sub_sections (with underscore)
          else if (section.sub_sections && Array.isArray(section.sub_sections)) {
            section.sub_sections.forEach((subSection) => {
              const subSectionName = subSection.sub_section_name || subSection.name || 'Unknown Subsection';
              
              if (subSection.items && Array.isArray(subSection.items)) {
                subSection.items.forEach((item, itemIndex) => {
                  manualItems.push({
                    item_id: item.item_id || `${sectionName}_${subSectionName}_${itemIndex}`,
                    section_name: sectionName,
                    sub_section_name: subSectionName,
                    check_description: item.check || item.check_description || '',
                    pic: item.pic || '',
                    guidance: item.guidance || '',
                    response_type: 'yes_no_na', // Default response type
                    is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
                    requires_evidence: item.requires_evidence || false,
                    order_index: manualItems.length
                  });
                });
              }
            });
          }
          // Check for direct items in section
          else if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item, itemIndex) => {
              manualItems.push({
                item_id: item.item_id || `${sectionName}_${itemIndex}`,
                section_name: sectionName,
                sub_section_name: null,
                check_description: item.check || item.check_description || '',
                pic: item.pic || '',
                guidance: item.guidance || '',
                response_type: 'yes_no_na', // Default response type
                is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
                requires_evidence: item.requires_evidence || false,
                order_index: manualItems.length
              });
            });
          }
        });
        
        console.log('ChecklistForm - Manually processed items:', manualItems.length);
        return manualItems;
      }
      
      return [];
    }
    
    console.log('ChecklistForm - Using processed_items:', template.processed_items.length);
    return template.processed_items;
  }, [template]);

  // Initialize responses from existing checklist
  useEffect(() => {
    if (existingChecklist?.responses && Array.isArray(existingChecklist.responses)) {
      const responseMap = {};
      existingChecklist.responses.forEach(response => {
        responseMap[response.item_id] = {
          yes_no_na_value: response.yes_no_na_value,
          text_value: response.text_value || '',
          date_value: response.date_value || '',
          comments: response.comments || '',
          evidence: response.evidence || []
        };
      });
      setResponses(responseMap);
    }
  }, [existingChecklist]);

  // Auto-save functionality
  useEffect(() => {
    if (mode === 'edit' && Object.keys(responses).length > 0) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 30000); // Auto-save every 30 seconds
      
      setAutoSaveTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [responses, mode]);

  const handleAutoSave = async () => {
    if (mode !== 'edit') return;
    
    try {
      const responseArray = items.map(item => ({
        item_id: item.item_id,
        yes_no_na_value: responses[item.item_id]?.yes_no_na_value || null,
        text_value: responses[item.item_id]?.text_value || '',
        date_value: responses[item.item_id]?.date_value || '',
        comments: responses[item.item_id]?.comments || '',
        is_mandatory: item.is_mandatory
      }));
      
      await onSave(responseArray, true); // true indicates auto-save
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleResponseChange = (itemId, field, value) => {
    if (mode === 'view') return;
    
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));

    // Clear any existing errors for this field
    if (errors[itemId]) {
      setErrors(prev => ({
        ...prev,
        [itemId]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    items.forEach(item => {
      if (item.is_mandatory) {
        const response = responses[item.item_id];
        const hasResponse = response?.yes_no_na_value !== null && response?.yes_no_na_value !== undefined ||
                           response?.text_value?.trim() ||
                           response?.date_value;
        
        if (!hasResponse) {
          newErrors[item.item_id] = 'This field is required';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (mode === 'view') return;
    
    setSaving(true);
    try {
      const responseArray = items.map(item => ({
        item_id: item.item_id,
        yes_no_na_value: responses[item.item_id]?.yes_no_na_value || null,
        text_value: responses[item.item_id]?.text_value || '',
        date_value: responses[item.item_id]?.date_value || '',
        comments: responses[item.item_id]?.comments || '',
        is_mandatory: item.is_mandatory
      }));
      
      await onSave(responseArray, false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save checklist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;
    
    if (!validateForm()) {
      alert('Please complete all mandatory fields before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = items.map(item => ({
        item_id: item.item_id,
        yes_no_na_value: responses[item.item_id]?.yes_no_na_value || null,
        text_value: responses[item.item_id]?.text_value || '',
        date_value: responses[item.item_id]?.date_value || '',
        comments: responses[item.item_id]?.comments || '',
        is_mandatory: item.is_mandatory
      }));
      
      await onSubmit(responseArray);
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to submit checklist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCompletionPercentage = () => {
    if (items.length === 0) return 0;
    
    const completedItems = items.filter(item => {
      const response = responses[item.item_id];
      return response?.yes_no_na_value !== null && response?.yes_no_na_value !== undefined ||
             response?.text_value?.trim() ||
             response?.date_value;
    }).length;
    
    return Math.round((completedItems / items.length) * 100);
  };

  const renderResponseField = (item) => {
    const response = responses[item.item_id] || {};
    const hasError = errors[item.item_id];
    const isReadonly = mode === 'view';

    switch (item.response_type) {
      case 'yes_no_na':
        return (
          <div className="response-field">
            <div className="radio-group">
              {['Yes', 'No', 'N/A'].map(option => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name={`response_${item.item_id}`}
                    value={option}
                    checked={response.yes_no_na_value === option}
                    onChange={(e) => handleResponseChange(item.item_id, 'yes_no_na_value', e.target.value)}
                    disabled={isReadonly}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {hasError && <span className="error-text">{hasError}</span>}
          </div>
        );

      case 'text':
        return (
          <div className="response-field">
            <textarea
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              rows={3}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="error-text">{hasError}</span>}
          </div>
        );

      case 'date':
        return (
          <div className="response-field">
            <input
              type="date"
              value={response.date_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'date_value', e.target.value)}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="error-text">{hasError}</span>}
          </div>
        );

      default:
        return (
          <div className="response-field">
            <input
              type="text"
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="error-text">{hasError}</span>}
          </div>
        );
    }
  };

  // Group items by section for better organization
  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const sectionKey = item.section_name || 'General';
      if (!groups[sectionKey]) {
        groups[sectionKey] = {};
      }
      
      const subSectionKey = item.sub_section_name || 'Items';
      if (!groups[sectionKey][subSectionKey]) {
        groups[sectionKey][subSectionKey] = [];
      }
      
      groups[sectionKey][subSectionKey].push(item);
    });
    return groups;
  }, [items]);

  if (loading) {
    return (
      <div className="checklist-form loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checklist-form">
      <style jsx>{`
        .checklist-form {
          background: var(--primary-dark);
          min-height: 100vh-100px;
          color: var(--text-light);
        }

        .checklist-form.loading {
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

        .form-header {
          background: var(--secondary-dark);
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 50px;
          z-index: 10;
        }

        .header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
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

        .form-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .mode-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .mode-badge.view {
          background: rgba(46, 204, 113, 0.2);
          color: var(--success-color);
        }

        .mode-badge.edit {
          background: rgba(52, 152, 219, 0.2);
          color: #3498DB;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          font-size: 14px;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-btn.secondary {
          background: rgba(244, 244, 244, 0.1);
          color: var(--text-light);
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: rgba(244, 244, 244, 0.2);
        }

        .action-btn.primary {
          background: var(--blue-accent);
          color: white;
        }

        .action-btn.primary:hover:not(:disabled) {
          background: var(--secondary-accent, #2A95C5);
          transform: translateY(-1px);
        }

        .action-btn.success {
          background: var(--success-color);
          color: white;
        }

        .action-btn.success:hover:not(:disabled) {
          background: #27AE60;
          transform: translateY(-1px);
        }

        .progress-bar {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          height: 8px;
          overflow: hidden;
          flex: 1;
          margin: 0 16px;
        }

        .progress-fill {
          background: linear-gradient(90deg, var(--blue-accent), var(--success-color));
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: var(--text-muted);
        }

        .form-content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section {
          background: var(--card-bg);
          border-radius: 8px;
          margin-bottom: 24px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }

        .section-header {
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

        .sub-section {
          border-bottom: 1px solid var(--border-subtle);
        }

        .sub-section:last-child {
          border-bottom: none;
        }

        .sub-section-header {
          background: rgba(0, 0, 0, 0.2);
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .sub-section-title {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
          color: var(--text-light);
        }

        .item {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(244, 244, 244, 0.05);
          transition: background-color 0.2s ease;
        }

        .item:last-child {
          border-bottom: none;
        }

        .item:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .item.mandatory {
          border-left: 3px solid var(--blue-accent);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 16px;
        }

        .item-question {
          flex: 1;
        }

        .question-text {
          font-weight: 500;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .question-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .mandatory-indicator {
          color: var(--blue-accent);
          font-weight: 600;
          font-size: 12px;
        }

        .response-field {
          margin-top: 12px;
        }

        .radio-group {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .radio-option input[type="radio"] {
          accent-color: var(--blue-accent);
          cursor: pointer;
        }

        .response-field input,
        .response-field textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px 12px;
          color: var(--text-light);
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .response-field input:focus,
        .response-field textarea:focus {
          outline: none;
          border-color: var(--blue-accent);
          box-shadow: 0 0 0 2px rgba(59, 173, 229, 0.2);
        }

        .response-field input.error,
        .response-field textarea.error {
          border-color: var(--danger-color);
        }

        .response-field input:disabled,
        .response-field textarea:disabled {
          background: rgba(0, 0, 0, 0.1);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .error-text {
          color: var(--danger-color);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }

        .comments-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(244, 244, 244, 0.1);
        }

        .comments-label {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 6px;
          display: block;
        }

        .comments-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px 12px;
          color: var(--text-light);
          font-size: 13px;
          min-height: 60px;
          resize: vertical;
        }

        .comments-textarea:focus {
          outline: none;
          border-color: var(--blue-accent);
        }

        .comments-textarea:disabled {
          background: rgba(0, 0, 0, 0.1);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .evidence-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(244, 244, 244, 0.1);
        }

        .evidence-label {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }

        .evidence-upload {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .upload-btn {
          background: rgba(59, 173, 229, 0.1);
          border: 1px solid rgba(59, 173, 229, 0.3);
          color: var(--blue-accent);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .upload-btn:hover:not(:disabled) {
          background: rgba(59, 173, 229, 0.2);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .evidence-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .evidence-item {
          background: rgba(0, 0, 0, 0.3);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .evidence-item button {
          background: none;
          border: none;
          color: var(--danger-color);
          cursor: pointer;
          padding: 0;
          display: flex;
        }

        .empty-form {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .empty-icon {
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .action-buttons {
            width: 100%;
            justify-content: flex-end;
          }

          .radio-group {
            flex-direction: column;
            gap: 8px;
          }

          .item-header {
            flex-direction: column;
            gap: 8px;
          }

          .evidence-upload {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      {/* Form Header */}
      <div className="form-header">
        <div className="header-top">
          <div className="header-left">
            <button className="back-button" onClick={onCancel}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="form-title">
              {template?.name || template?.template_name || 'Checklist'}
            </h1>
            <span className={`mode-badge ${mode}`}>
              {mode === 'view' ? 'View Only' : 'Editing'}
            </span>
          </div>

          {mode === 'edit' && (
            <div className="action-buttons">
              <button
                className="action-btn secondary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Draft
                  </>
                )}
              </button>

              <button
                className="action-btn success"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="progress-text">Progress:</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
          <span className="progress-text">{getCompletionPercentage()}%</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="form-content">
        {items.length === 0 ? (
          <div className="empty-form">
            <div className="empty-icon">
              <FileText size={48} color="var(--text-muted)" />
            </div>
            <h3>No Items Available</h3>
            <p>This checklist template appears to be empty or not properly configured.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([sectionName, subSections]) => (
            <div key={sectionName} className="section">
              <div className="section-header">
                <h2 className="section-title">{sectionName}</h2>
              </div>

              {Object.entries(subSections).map(([subSectionName, sectionItems]) => (
                <div key={`${sectionName}-${subSectionName}`} className="sub-section">
                  {subSectionName !== 'Items' && (
                    <div className="sub-section-header">
                      <h3 className="sub-section-title">{subSectionName}</h3>
                    </div>
                  )}

                  {sectionItems.map((item, index) => (
                    <div 
                      key={item.item_id} 
                      className={`item ${item.is_mandatory ? 'mandatory' : ''}`}
                    >
                      <div className="item-header">
                        <div className="item-question">
                          <div className="question-text">
                            {item.check_description}
                          </div>
                          <div className="question-meta">
                            {item.pic && <span>PIC: {item.pic}</span>}
                            {item.is_mandatory && (
                              <span className="mandatory-indicator">* MANDATORY</span>
                            )}
                            {item.guidance && <span>Guidance: {item.guidance}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Response Field */}
                      {renderResponseField(item)}

                      {/* Comments Section */}
                      <div className="comments-section">
                        <label className="comments-label">Comments (Optional)</label>
                        <textarea
                          className="comments-textarea"
                          value={responses[item.item_id]?.comments || ''}
                          onChange={(e) => handleResponseChange(item.item_id, 'comments', e.target.value)}
                          placeholder="Add any additional comments..."
                          disabled={mode === 'view'}
                        />
                      </div>

                      {/* Evidence Section (if required) */}
                      {item.requires_evidence && (
                        <div className="evidence-section">
                          <label className="evidence-label">Evidence Required</label>
                          <div className="evidence-upload">
                            <button 
                              className="upload-btn"
                              disabled={mode === 'view'}
                            >
                              <Upload size={14} />
                              Upload Evidence
                            </button>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Upload photos, documents, or other evidence
                            </span>
                          </div>
                          {responses[item.item_id]?.evidence && responses[item.item_id].evidence.length > 0 && (
                            <div className="evidence-list">
                              {responses[item.item_id].evidence.map((file, fileIndex) => (
                                <div key={fileIndex} className="evidence-item">
                                  <span>{file.name}</span>
                                  {mode === 'edit' && (
                                    <button onClick={() => {/* Handle remove evidence */}}>
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

ChecklistForm.propTypes = {
  vessel: PropTypes.object.isRequired,
  template: PropTypes.object.isRequired,
  existingChecklist: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  currentUser: PropTypes.object.isRequired,
  mode: PropTypes.oneOf(['edit', 'view'])
};

export default ChecklistForm;