// src/components/dashboard/reporting/checklist/ModernChecklistForm.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Ship,
  Clock,
  User,
  Save,
  Send,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  Calendar,
  Shield,
  Users,
  Wrench,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter
} from 'lucide-react';

// Import your existing DynamicTable component
import DynamicTable from './DynamicTable'; // Adjust path as needed

const ModernChecklistForm = ({
  vessel = {
    vessel_name: "GENCO BEAR",
    imo_no: "9469259"
  },
  template = {
    name: "5 Day Pre-Arrival Checklist",
    processed_items: []
  },
  existingChecklist = null,
  onSave = () => {},
  onSubmit = () => {},
  onCancel = () => {}, // Still passed, but not used for header back button
  loading = false,
  currentUser = { id: "user123", name: "John Doe" },
  mode = 'edit',
  disabled = false
}) => {
  const [responses, setResponses] = useState({});
  const [completedItems, setCompletedItems] = useState(new Set());
  const [saving, setSaving] = useState(false); // This state will now be managed by parent
  const [submitting, setSubmitting] = useState(false); // This state will now be managed by parent
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  // const [lastSaveTime, setLastSaveTime] = useState(null); // Moved to parent

  // Map response types to field types (moved before useMemo)
  const mapResponseTypeToFieldType = useCallback((responseType) => {
    const mapping = {
      'yes_no_na': 'yes_no',
      'yes_no': 'yes_no',
      'text': 'text',
      'date': 'date',
      'table': 'table',
      'number': 'text'
    };
    return mapping[responseType] || 'text';
  }, []);

  // Generate form sections from template
  const formSections = useMemo(() => {
    if (!template?.processed_items || !Array.isArray(template.processed_items)) {
      console.warn('📋 ModernChecklistForm: No processed items in template');
      return [];
    }

    console.log('📋 ModernChecklistForm: Processing template items:', template.processed_items.length);

    // Group items by section
    const sectionMap = new Map();

    template.processed_items.forEach((item) => {
      const sectionName = item.section_name || 'General';
      
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, {
          section_id: sectionName.toLowerCase().replace(/\s+/g, '_'),
          section_name: sectionName,
          fields: []
        });
      }

      // Convert template item to field format
      const field = {
        field_id: item.item_id,
        label: item.description || item.check_description,
        field_type: mapResponseTypeToFieldType(item.response_type),
        placeholder: item.guidance || `Enter ${item.description || 'value'}...`,
        is_mandatory: Boolean(item.is_mandatory),
        response_type: item.response_type,
        table_structure: item.table_structure,
        guidance: item.guidance
      };

      sectionMap.get(sectionName).fields.push(field);
    });

    const sections = Array.from(sectionMap.values());
    console.log('📋 ModernChecklistForm: Generated sections:', sections.length);
    return sections;
  }, [template, mapResponseTypeToFieldType]);

  // Load existing responses
  useEffect(() => {
    if (existingChecklist?.responses && Array.isArray(existingChecklist.responses)) {
      console.log('📋 ModernChecklistForm: Loading existing responses:', existingChecklist.responses.length);
      
      const responseMap = {};
      const completed = new Set();

      existingChecklist.responses.forEach((response) => {
        const itemId = response.item_id;
        let value = null;

        // Extract value based on response type
        if (response.yes_no_na_value !== null && response.yes_no_na_value !== undefined) {
          value = response.yes_no_na_value;
        } else if (response.text_value) {
          value = response.text_value;
        } else if (response.date_value) {
          value = response.date_value;
        } else if (response.table_data && Array.isArray(response.table_data)) {
          value = response.table_data;
        }

        if (value !== null && value !== undefined) {
          responseMap[itemId] = value;
          completed.add(itemId);
        }
      });

      setResponses(responseMap);
      setCompletedItems(completed);
      console.log('📋 ModernChecklistForm: Loaded responses:', Object.keys(responseMap).length);
    }
  }, [existingChecklist]);

  // Auto-save functionality
  useEffect(() => {
    if (mode === 'edit' && !disabled && Object.keys(responses).length > 0) {
      const autoSaveTimer = setTimeout(() => {
        onSave(responses, true); // Auto-save, pass responses to parent
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [responses, mode, disabled, onSave]); // Added onSave to dependency array

  // Update timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Handle response changes with validation
  const handleResponseChange = useCallback((fieldId, value) => {
    console.log('📋 ModernChecklistForm: Response change:', { 
      fieldId, 
      value, 
      type: typeof value,
      isDate: value && !isNaN(Date.parse(value)) && value.includes('-')
    });

    setResponses(prev => {
      const updated = { ...prev, [fieldId]: value };
      console.log('📋 ModernChecklistForm: Updated responses count:', Object.keys(updated).length);
      console.log('📋 ModernChecklistForm: Field updated:', { fieldId, oldValue: prev[fieldId], newValue: value });
      return updated;
    });

    // Update completion tracking - for dates, check if it's a valid date string
    let hasValue = false;
    if (value !== null && value !== undefined && value !== '') {
      // Special handling for date fields
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        hasValue = true; // Valid date format YYYY-MM-DD
      } else if (typeof value === 'string' && value.length > 0) {
        hasValue = true; // Non-empty string
      } else if (Array.isArray(value) && value.length > 0) {
        hasValue = true; // Non-empty array (for tables)
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        hasValue = true; // Boolean or number values
      }
    }

    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (hasValue) {
        newSet.add(fieldId);
        console.log('📋 ModernChecklistForm: Field marked as completed:', fieldId);
      } else {
        newSet.delete(fieldId);
        console.log('📋 ModernChecklistForm: Field marked as incomplete:', fieldId);
      }
      return newSet;
    });

    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  }, [validationErrors]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};
    let isValid = true;

    if (!template?.processed_items) {
      return { isValid: false, errors: { general: 'No template items available' } };
    }

    template.processed_items.forEach((item) => {
      if (item.is_mandatory) {
        const value = responses[item.item_id];
        const hasValue = value !== null && value !== undefined && value !== '';
        
        if (!hasValue) {
          errors[item.item_id] = 'This field is required';
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return { isValid, errors };
  }, [template, responses]);

  // Calculate progress
  const getProgress = useCallback(() => {
    if (!template?.processed_items) {
      return {
        total: 0,
        completed: 0,
        mandatory: 0,
        mandatoryCompleted: 0,
        percentage: 0,
        mandatoryPercentage: 0
      };
    }

    const totalItems = template.processed_items.length;
    const completedCount = completedItems.size;
    const mandatoryFields = template.processed_items.filter(item => item.is_mandatory);
    const mandatoryCompleted = mandatoryFields.filter(item => completedItems.has(item.item_id)).length;

    return {
      total: totalItems,
      completed: completedCount,
      mandatory: mandatoryFields.length,
      mandatoryCompleted,
      percentage: totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
      mandatoryPercentage: mandatoryFields.length > 0 ? Math.round((mandatoryCompleted / mandatoryFields.length) * 100) : 100
    };
  }, [template, completedItems]);

  const progress = getProgress();

  // Handle save (now just calls parent's onSave)
  const handleSaveClick = useCallback(async () => {
    if (disabled) return;
    try {
      // setSaving(true); // Parent handles this
      console.log('💾 ModernChecklistForm: Triggering parent save...');
      await onSave(responses, false); // Pass current responses to parent
      console.log('✅ ModernChecklistForm: Parent save triggered successfully');
    } catch (error) {
      console.error('❌ ModernChecklistForm: Save failed via parent:', error);
      alert(`Save failed: ${error.message}`);
    } finally {
      // setSaving(false); // Parent handles this
    }
  }, [responses, onSave, disabled]);

  // Handle submit (now just calls parent's onSubmit)
  const handleSubmitClick = useCallback(async () => {
    if (disabled) return;

    try {
      // setSubmitting(true); // Parent handles this
      console.log('🚀 ModernChecklistForm: Starting submit...');

      // Validate form first
      const validation = validateForm();
      if (!validation.isValid) {
        console.error('❌ ModernChecklistForm: Validation failed:', validation.errors);
        alert(`Please complete all required fields:\n${Object.values(validation.errors).join('\n')}`);
        return;
      }

      // Save current state first (parent will handle this as part of submit)
      // await handleSaveClick(); // No need to call directly, parent's onSubmit will handle saving

      console.log('📤 ModernChecklistForm: Calling onSubmit...');
      const result = await onSubmit(responses); // Pass current responses to parent
      console.log('✅ ModernChecklistForm: Submit successful:', result);

      return result;
    } catch (error) {
      console.error('❌ ModernChecklistForm: Submit failed:', error);
      alert(`Submit failed: ${error.message}`);
      throw error;
    } finally {
      // setSubmitting(false); // Parent handles this
    }
  }, [responses, onSubmit, disabled, validateForm]);

  // Filter fields based on search and filters
  const filteredFields = useMemo(() => {
    const allFields = formSections.flatMap(section => 
      section.fields.map(field => ({ ...field, section: section.section_name }))
    );
    
    return allFields.filter(field => {
      const matchesSearch = !searchTerm || 
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMandatory = !showOnlyMandatory || field.is_mandatory;
      
      return matchesSearch && matchesMandatory;
    });
  }, [formSections, searchTerm, showOnlyMandatory]);

  // Get section icon
  const getSectionIcon = (sectionName) => {
    const name = sectionName.toLowerCase();
    if (name.includes('boarding') || name.includes('si')) return <User size={16} />;
    if (name.includes('crew') || name.includes('contract')) return <Users size={16} />;
    if (name.includes('mlc') || name.includes('security')) return <Shield size={16} />;
    if (name.includes('defect') || name.includes('rectification')) return <Wrench size={16} />;
    if (name.includes('checklist') || name.includes('psc')) return <FileText size={16} />;
    return <FileText size={16} />;
  };

  // Render field based on type
  const renderField = (field) => {
    const value = responses[field.field_id] || '';
    const isCompleted = completedItems.has(field.field_id);
    const hasError = validationErrors[field.field_id];

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
            placeholder={field.placeholder}
            className={`light-form-input ${isCompleted ? 'completed' : ''} ${hasError ? 'error' : ''}`}
            disabled={mode === 'view' || disabled}
          />
        );

      case 'date':
        // Handle date field properly - ensure proper format conversion
        const dateValue = value ? 
          (value instanceof Date ? value.toISOString().split('T')[0] : 
           typeof value === 'string' && value.includes('T') ? value.split('T')[0] : 
           value) : '';
        
        return (
          <input
            type="date"
            value={dateValue}
            onChange={(e) => {
              const inputDate = e.target.value; // This is in YYYY-MM-DD format
              console.log('📅 Date field changed:', { 
                fieldId: field.field_id, 
                inputValue: inputDate,
                previousValue: value 
              });
              handleResponseChange(field.field_id, inputDate);
            }}
            className={`light-form-input ${isCompleted ? 'completed' : ''} ${hasError ? 'error' : ''}`}
            disabled={mode === 'view' || disabled}
          />
        );

      case 'yes_no':
        return (
          <div className="light-radio-group">
            {['Yes', 'No'].map((option) => (
              <label key={option} className={`light-radio-option ${value === option ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={field.field_id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
                  disabled={mode === 'view' || disabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'table':
        return (
          <DynamicTable
            item={field}
            value={value}
            onChange={(tableData) => handleResponseChange(field.field_id, tableData)}
            disabled={mode === 'view' || disabled}
            hasError={hasError}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
            className={`light-form-input ${isCompleted ? 'completed' : ''} ${hasError ? 'error' : ''}`}
            disabled={mode === 'view' || disabled}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="light-loading">
        <Ship size={20} className="spinning" />
        <span>Loading Checklist...</span>
      </div>
    );
  }

  return (
    <div className="light-form-container">
      {/* Removed Header - now handled by ChecklistModal */}
      {/* Filters */}
      {/* <div className="light-filters">
        <div className="light-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => setShowOnlyMandatory(!showOnlyMandatory)}
          className={`light-filter-btn ${showOnlyMandatory ? 'active' : ''}`}
        >
          <Filter size={14} />
          {showOnlyMandatory ? 'Required Only' : 'All Items'}
        </button>
      </div> */}

      {/* Form Content */}
      <div className="light-form-content">
        {formSections.length === 0 ? (
          <div className="light-no-sections">
            <AlertTriangle size={32} />
            <h3>No Checklist Items</h3>
            <p>No items could be loaded from the template.</p>
            <button
              onClick={() => {
                console.log('Template Debug Info:');
                console.log('Template:', template);
                console.log('Processed Items:', template?.processed_items);
                console.log('Form Sections:', formSections);
              }}
              className="light-debug-btn"
            >
              Debug Template
            </button>
          </div>
        ) : (
          formSections.map((section, sectionIndex) => {
            const sectionFields = section.fields.filter(field => {
              if (!searchTerm && !showOnlyMandatory) return true;
              return filteredFields.some(f => f.field_id === field.field_id);
            });
            
            if (sectionFields.length === 0) return null;
            
            const sectionCompleted = sectionFields.filter(field => completedItems.has(field.field_id)).length;
            
            return (
              <div key={section.section_id} className="light-section">
                <div className="light-section-header">
                  <div className="light-section-title">
                    {getSectionIcon(section.section_name)}
                    <span>{section.section_name}</span>
                  </div>
                  <div className="light-section-badge">
                    {sectionCompleted}/{sectionFields.length}
                  </div>
                </div>

                <div className="light-fields-grid">
                  {sectionFields.map((field) => {
                    const hasError = validationErrors[field.field_id];
                    
                    return (
                      <div
                        key={field.field_id}
                        className={`light-field-item ${field.field_type} ${completedItems.has(field.field_id) ? 'completed' : ''} ${field.is_mandatory ? 'mandatory' : ''} ${hasError ? 'error' : ''}`}
                      >
                        <div className="light-field-header">
                          <label className="light-field-label">
                            {field.label}
                            {field.is_mandatory && <span className="light-required">*</span>}
                          </label>
                          {completedItems.has(field.field_id) && (
                            <CheckCircle size={14} className="light-completed-icon" />
                          )}
                        </div>
                        <div className="light-field-input">
                          {renderField(field)}
                          {hasError && (
                            <div className="light-field-error">
                              <AlertCircle size={12} />
                              <span>{hasError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Status Bar - Removed, now handled by ChecklistModal */}

      {/* Styles */}
      <style jsx>{`
        .light-form-container {
          height: 100%; /* Changed to 100% to fill parent modal body */
          display: flex;
          flex-direction: column;
          background: #f7fafd;
          color: #333333;
          font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        /* Header - REMOVED */
        /* Filters - REMOVED */

        /* Form Content */
        .light-form-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .light-no-sections {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
          color: #dc3545;
        }

        .light-no-sections h3 {
          margin: 16px 0 8px;
          font-size: 20px;
          font-weight: 600;
        }

        .light-no-sections p {
          margin: 0 0 20px;
          color: #6c757d;
        }

        .light-debug-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .light-section {
          margin-bottom: 16px;
        }

        .light-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 6px 10px;
          background: #ffffff;
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .light-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #333333;
        }

        .light-section-badge {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
        }

        /* Fields Grid */
        .light-fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 10px;
        }

        .light-field-item {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          padding: 10px;
          transition: all 0.2s ease;
          position: relative;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .light-field-item:hover {
          border-color: rgba(0, 123, 255, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .light-field-item.completed {
          border-color: #28a745;
          box-shadow: 0 1px 3px rgba(40, 167, 69, 0.2);
        }

        .light-field-item.error {
          border-color: #dc3545;
          box-shadow: 0 1px 3px rgba(220, 53, 69, 0.2);
        }

        .light-field-item.mandatory::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-top: 10px solid #dc3545;
          border-top-right-radius: 4px;
        }

        .light-field-item.table {
          grid-column: 1 / -1;
        }

        .light-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .light-field-label {
          font-size: 12px;
          font-weight: 500;
          color: #333333;
          line-height: 1.3;
        }

        .light-required {
          color: #dc3545;
          margin-left: 2px;
        }

        .light-completed-icon {
          color: #28a745;
        }

        .light-field-input {
          width: 100%;
        }

        .light-field-error {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          color: #dc3545;
          font-size: 11px;
        }

        /* Form Inputs */
        .light-form-input {
          width: 100%;
          padding: 6px 8px;
          background: #f0f4f8;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          color: #333333;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .light-form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .light-form-input.completed {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.05);
        }

        .light-form-input.error {
          border-color: #dc3545;
          background: rgba(220, 53, 69, 0.05);
        }

        .light-form-input:disabled {
          background: #e9ecef;
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Radio Groups */
        .light-radio-group {
          display: flex;
          gap: 6px;
        }

        .light-radio-option {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #f0f4f8;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 11px;
        }

        .light-radio-option:hover {
          border-color: #007bff;
          background: rgba(0, 123, 255, 0.1);
        }

        .light-radio-option.selected {
          border-color: #007bff;
          background: #007bff;
          color: white;
        }

        .light-radio-option input {
          display: none;
        }

        /* Loading */
        .light-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 100%; /* Changed to 100% to fill parent modal body */
          background: #f7fafd;
          color: #333333;
        }

        /* Status Bar - REMOVED */

        /* Responsive */
        @media (max-width: 768px) {
          .light-fields-grid {
            grid-template-columns: 1fr;
          }

          .light-form-content {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernChecklistForm;