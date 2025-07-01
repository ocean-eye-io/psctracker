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
import '../../../styles/checklistStyles.css'; // Import the external CSS file

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
          <div className="checklist-form-response-field">
            <div className="checklist-form-radio-group">
              {['Yes', 'No', 'N/A'].map(option => (
                <label key={option} className="checklist-form-radio-option">
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
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      case 'text':
        return (
          <div className="checklist-form-response-field">
            <textarea
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              rows={3}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      case 'date':
        return (
          <div className="checklist-form-response-field">
            <input
              type="date"
              value={response.date_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'date_value', e.target.value)}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      default:
        return (
          <div className="checklist-form-response-field">
            <input
              type="text"
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
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
        <div className="checklist-form loading-container">
          <div className="checklist-form loading-spinner"></div>
          <p>Loading checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checklist-form">
      {/* Form Header */}
      <div className="checklist-form-header-section">
        <div className="checklist-form-header-top">
          <div className="checklist-form-header-left">
            <button className="checklist-form-back-button" onClick={onCancel}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="checklist-form-title">
              {template?.name || template?.template_name || 'Checklist'}
            </h1>
            <span className={`checklist-form-mode-badge ${mode}`}>
              {mode === 'view' ? 'View Only' : 'Editing'}
            </span>
          </div>

          {mode === 'edit' && (
            <div className="checklist-form-action-buttons">
              <button
                className="checklist-form-action-btn secondary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="checklist-form loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
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
                className="checklist-form-action-btn success"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="checklist-form loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
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
          <span className="checklist-form-progress-text">Progress:</span>
          <div className="checklist-form-progress-bar">
            <div 
              className="checklist-form-progress-fill" 
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
          <span className="checklist-form-progress-text">{getCompletionPercentage()}%</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="checklist-form-content">
        {items.length === 0 ? (
          <div className="checklist-form-empty-state-container">
            <div className="checklist-form-empty-icon">
              <FileText size={48} color="var(--checklist-form-text-muted)" />
            </div>
            <h3>No Items Available</h3>
            <p>This checklist template appears to be empty or not properly configured.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([sectionName, subSections]) => (
            <div key={sectionName} className="checklist-form-section">
              <div className="checklist-form-section-header">
                <h2 className="checklist-form-section-title">{sectionName}</h2>
              </div>

              {Object.entries(subSections).map(([subSectionName, sectionItems]) => (
                <div key={`${sectionName}-${subSectionName}`} className="checklist-form-sub-section">
                  {subSectionName !== 'Items' && (
                    <div className="checklist-form-sub-section-header">
                      <h3 className="checklist-form-sub-section-title">{subSectionName}</h3>
                    </div>
                  )}

                  {sectionItems.map((item, index) => (
                    <div 
                      key={item.item_id} 
                      className={`checklist-form-item ${item.is_mandatory ? 'mandatory' : ''}`}
                    >
                      <div className="checklist-form-item-header">
                        <div className="checklist-form-item-question">
                          <div className="checklist-form-question-text">
                            {item.check_description}
                          </div>
                          <div className="checklist-form-question-meta">
                            {item.pic && <span>PIC: {item.pic}</span>}
                            {item.is_mandatory && (
                              <span className="checklist-form-mandatory-indicator">* MANDATORY</span>
                            )}
                            {item.guidance && <span>Guidance: {item.guidance}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Response Field */}
                      {renderResponseField(item)}

                      {/* Comments Section */}
                      <div className="checklist-form-comments-section">
                        <label className="checklist-form-comments-label">Comments (Optional)</label>
                        <textarea
                          className="checklist-form-comments-textarea"
                          value={responses[item.item_id]?.comments || ''}
                          onChange={(e) => handleResponseChange(item.item_id, 'comments', e.target.value)}
                          placeholder="Add any additional comments..."
                          disabled={mode === 'view'}
                        />
                      </div>

                      {/* Evidence Section (if required) */}
                      {item.requires_evidence && (
                        <div className="checklist-form-evidence-section">
                          <label className="checklist-form-evidence-label">Evidence Required</label>
                          <div className="checklist-form-evidence-upload">
                            <button 
                              className="checklist-form-upload-btn"
                              disabled={mode === 'view'}
                            >
                              <Upload size={14} />
                              Upload Evidence
                            </button>
                            <span style={{ fontSize: '12px', color: 'var(--checklist-form-text-muted)' }}>
                              Upload photos, documents, or other evidence
                            </span>
                          </div>
                          {responses[item.item_id]?.evidence && responses[item.item_id].evidence.length > 0 && (
                            <div className="checklist-form-evidence-list">
                              {responses[item.item_id].evidence.map((file, fileIndex) => (
                                <div key={fileIndex} className="checklist-form-evidence-item">
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