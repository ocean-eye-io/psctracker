import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Enhanced DynamicTable Component with matching light theme
const DynamicTable = ({ 
  item, 
  value = [], 
  onChange, 
  disabled = false, 
  hasError = false 
}) => {
  const [tableData, setTableData] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(-1);
  const [newRowData, setNewRowData] = useState({});
  const [editRowData, setEditRowData] = useState({});

  const tableStructure = useMemo(() => {
    if (item.table_structure && item.table_structure.columns) {
      return item.table_structure.columns.map(col => ({
        id: col.column_id,
        label: col.label,
        type: col.type,
        required: col.required || false
      }));
    }
    
    // Fallback structure
    return [
      { id: 'description', label: 'Description', type: 'text', required: true },
      { id: 'value', label: 'Value', type: 'text', required: false }
    ];
  }, [item]);

  useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      const cleanedData = value.map((row, index) => {
        const cleanRow = { _id: `row_${index}_${Date.now()}` };
        
        tableStructure.forEach((col) => {
          const columnId = col.id;
          if (row[columnId] !== undefined && row[columnId] !== null) {
            cleanRow[columnId] = row[columnId];
          }
        });
        
        return cleanRow;
      }).filter(row => {
        return tableStructure.some((col) => {
          const columnId = col.id;
          return row[columnId] !== undefined && 
                 row[columnId] !== null && 
                 row[columnId] !== '';
        });
      });
      
      setTableData(cleanedData);
    } else {
      setTableData([]);
    }
  }, [value, tableStructure]);

  useEffect(() => {
    const initialNewRow = {};
    tableStructure.forEach((col) => {
      const columnId = col.id;
      initialNewRow[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(initialNewRow);
  }, [tableStructure]);

  const notifyParentOfChange = (updatedData) => {
    const cleanedData = updatedData.map((row) => {
      const cleanRow = {};
      tableStructure.forEach((col) => {
        const columnId = col.id;
        if (row[columnId] !== undefined && row[columnId] !== null && row[columnId] !== '') {
          cleanRow[columnId] = row[columnId];
        }
      });
      return cleanRow;
    }).filter(row => {
      return Object.keys(row).length > 0;
    });
    
    if (onChange) {
      onChange(cleanedData);
    }
  };

  const handleAddRow = () => {
    const missingRequired = tableStructure.filter((col) => {
      const columnId = col.id;
      return col.required && (!newRowData[columnId] || String(newRowData[columnId]).trim() === '');
    });
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(col => col.label).join(', ')}`);
      return;
    }
    
    const newRow = {
      _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newRowData
    };
    
    const updatedData = [...tableData, newRow];
    setTableData(updatedData);
    notifyParentOfChange(updatedData);
    
    const resetData = {};
    tableStructure.forEach((col) => {
      const columnId = col.id;
      resetData[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(resetData);
  };

  const handleEditRow = (index) => {
    setEditingRowIndex(index);
    setEditRowData({ ...tableData[index] });
  };

  const handleSaveEdit = () => {
    const missingRequired = tableStructure.filter((col) => {
      const columnId = col.id;
      return col.required && (!editRowData[columnId] || String(editRowData[columnId]).trim() === '');
    });
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(col => col.label).join(', ')}`);
      return;
    }
    
    const updatedData = [...tableData];
    updatedData[editingRowIndex] = { ...editRowData };
    
    setTableData(updatedData);
    notifyParentOfChange(updatedData);
    setEditingRowIndex(-1);
    setEditRowData({});
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(-1);
    setEditRowData({});
  };

  const handleDeleteRow = (index) => {
    if (confirm('Are you sure you want to delete this row?')) {
      const updatedData = tableData.filter((_, i) => i !== index);
      setTableData(updatedData);
      notifyParentOfChange(updatedData);
    }
  };

  const renderCell = (column, rowData, rowIndex, isEditing = false) => {
    const columnId = column.id;
    const value = isEditing ? editRowData[columnId] : rowData[columnId];
    const cellKey = `cell_${rowIndex}_${columnId}_${isEditing ? 'edit' : 'view'}`;
    
    if (isEditing) {
      switch (column.type) {
        case 'yes_no':
          return (
            <select
              key={cellKey}
              value={value || 'Yes'}
              onChange={(e) => setEditRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
              className="dynamic-table-input dynamic-table-select"
              disabled={disabled}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          );
        
        case 'date':
          return (
            <input
              key={cellKey}
              type="date"
              value={value || ''}
              onChange={(e) => setEditRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
              className="dynamic-table-input"
              disabled={disabled}
            />
          );
        
        case 'number':
          return (
            <input
              key={cellKey}
              type="number"
              value={value || ''}
              onChange={(e) => setEditRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
              className="dynamic-table-input dynamic-table-input-number"
              disabled={disabled}
            />
          );
        
        default:
          return (
            <input
              key={cellKey}
              type="text"
              value={value || ''}
              onChange={(e) => setEditRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
              className="dynamic-table-input"
              disabled={disabled}
              placeholder={`Enter ${column.label.toLowerCase()}...`}
            />
          );
      }
    } else {
      if (value === null || value === undefined || value === '') {
        return <span className="dynamic-table-cell-empty">-</span>;
      }
      
      switch (column.type) {
        case 'yes_no':
          return (
            <span className={`dynamic-table-cell-value dynamic-table-cell-yes-no-${String(value).toLowerCase()}`}>
              {value}
            </span>
          );
        
        case 'number':
          return (
            <span className="dynamic-table-cell-value dynamic-table-cell-number">
              {value}
            </span>
          );
        
        default:
          return (
            <span className="dynamic-table-cell-value">
              {value}
            </span>
          );
      }
    }
  };

  const renderNewRowCell = (column) => {
    const columnId = column.id;
    const cellKey = `new_cell_${columnId}`;
    
    switch (column.type) {
      case 'yes_no':
        return (
          <select
            key={cellKey}
            value={newRowData[columnId] || 'Yes'}
            onChange={(e) => setNewRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
            className="dynamic-table-input dynamic-table-select"
            disabled={disabled}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        );
      
      case 'date':
        return (
          <input
            key={cellKey}
            type="date"
            value={newRowData[columnId] || ''}
            onChange={(e) => setNewRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
            className="dynamic-table-input"
            disabled={disabled}
          />
        );
      
      case 'number':
        return (
          <input
            key={cellKey}
            type="number"
            value={newRowData[columnId] || ''}
            onChange={(e) => setNewRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
            className="dynamic-table-input dynamic-table-input-number"
            disabled={disabled}
          />
        );
      
      default:
        return (
          <input
            key={cellKey}
            type="text"
            value={newRowData[columnId] || ''}
            onChange={(e) => setNewRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
            className="dynamic-table-input"
            disabled={disabled}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
          />
        );
    }
  };

  return (
    <div className={`dynamic-table-container ${hasError ? 'has-error' : ''} ${disabled ? 'disabled-table' : ''}`}>
      <div className="dynamic-table-wrapper">
        <table className="dynamic-table">
          <thead>
            <tr>
              {tableStructure.map((column) => (
                <th key={`header_${column.id}`} className="dynamic-table-column-header">
                  <div className="dynamic-table-column-header-content">
                    <span className="dynamic-table-column-label">
                      {column.label}
                      {column.required && <span className="dynamic-table-mandatory-indicator">*</span>}
                    </span>
                  </div>
                </th>
              ))}
              {!disabled && <th className="dynamic-table-actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* Existing Data Rows */}
            {tableData.map((row, rowIndex) => (
              <tr key={row._id || `row_${rowIndex}`} className="dynamic-table-data-row">
                {tableStructure.map((column) => (
                  <td key={`cell_${rowIndex}_${column.id}`} className="dynamic-table-cell">
                    {renderCell(column, row, rowIndex, editingRowIndex === rowIndex)}
                  </td>
                ))}
                {!disabled && (
                  <td className="dynamic-table-actions-cell">
                    <div className={`dynamic-table-action-buttons ${editingRowIndex === rowIndex ? 'editing' : ''}`}>
                      {editingRowIndex === rowIndex ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="dynamic-table-action-btn dynamic-table-save-btn"
                            title="Save"
                          >
                            <CheckCircle size={12} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="dynamic-table-action-btn dynamic-table-cancel-btn"
                            title="Cancel"
                          >
                            <AlertCircle size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditRow(rowIndex)}
                            className="dynamic-table-action-btn dynamic-table-edit-btn"
                            title="Edit"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(rowIndex)}
                            className="dynamic-table-action-btn dynamic-table-delete-btn"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {/* New Row */}
            {!disabled && editingRowIndex === -1 && (
              <tr className="dynamic-table-new-row">
                {tableStructure.map((column) => (
                  <td key={`new_${column.id}`} className="dynamic-table-new-cell">
                    {renderNewRowCell(column)}
                  </td>
                ))}
                <td className="dynamic-table-actions-cell">
                  <button
                    onClick={handleAddRow}
                    className="dynamic-table-action-btn dynamic-table-add-btn"
                    title="Add row"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Empty State */}
        {tableData.length === 0 && disabled && (
          <div className="dynamic-table-empty-state">
            <FileText size={16} />
            <span>No data available</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Form Component - Light Theme Version
const ModernChecklistForm = ({
  vessel = {
    vessel_name: "GENCO BEAR",
    imo_no: "9469259"
  },
  template = {
    name: "5 Day Pre-Arrival Checklist",
    sections: []
  },
  existingChecklist = null,
  onSave = () => {},
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  currentUser = { id: "user123", name: "John Doe" },
  mode = 'edit'
}) => {
  const [responses, setResponses] = useState({});
  const [completedItems, setCompletedItems] = useState(new Set());
  const [currentSection, setCurrentSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);

  // Sample form data based on your provided structure
  const formSections = template.sections || [
    {
      section_id: "si_boarding_info",
      section_name: "SI Boarding Information",
      fields: [
        {
          field_id: "si_boarding_name",
          label: "SI BOARDING (NAME)",
          field_type: "text",
          placeholder: "Enter SI boarding officer name",
          is_mandatory: true
        },
        {
          field_id: "third_party_company",
          label: "3RD PARTY ATTENDING (COMPANY)",
          field_type: "text",
          placeholder: "Enter third party company name",
          is_mandatory: false
        }
      ]
    },
    {
      section_id: "crew_contracts",
      section_name: "Crew Contracts",
      fields: [
        {
          field_id: "maximum_tenure",
          label: "MAXIMUM TENURE THAT ANY CREW HAS STAYED ON BOARD",
          field_type: "text",
          placeholder: "Enter maximum tenure period",
          is_mandatory: true
        }
      ]
    },
    {
      section_id: "crew_changes",
      section_name: "Non-Routine Crew Change / Doctor Visit Planned",
      fields: [
        {
          field_id: "crew_changes_table",
          label: "Crew Changes and Medical Visits",
          field_type: "table",
          is_mandatory: false,
          table_structure: {
            columns: [
              { type: "text", label: "RANK", column_id: "rank" },
              { type: "number", label: "NUMBER", column_id: "number" },
              { type: "text", label: "REMARKS", column_id: "remarks" }
            ]
          }
        }
      ]
    },
    {
      section_id: "psc_checklist_status",
      section_name: "PSC Checklist Status",
      fields: [
        {
          field_id: "checklist_completed_date",
          label: "PSC CHECKLIST COMPLETED BY VESSEL",
          field_type: "date",
          is_mandatory: true
        },
        {
          field_id: "feedback_sent_date",
          label: "CHECKLIST FEEDBACK SENT FROM OFFICE TO VESSEL",
          field_type: "date",
          is_mandatory: false
        }
      ]
    },
    {
      section_id: "mlc_biosecurity",
      section_name: "MLC / BIO-SECURITY",
      fields: [
        {
          field_id: "infestation_issue",
          label: "ANY INFESTATION ISSUE?",
          field_type: "yes_no",
          is_mandatory: true
        },
        {
          field_id: "provision_fw_sufficient",
          label: "ARE PROVISION AND FW SUFFICIENT?",
          field_type: "yes_no",
          is_mandatory: true
        },
        {
          field_id: "ac_systems_order",
          label: "ALL SHIPS A/C SYSTEMS IN ORDER?",
          field_type: "yes_no",
          is_mandatory: true
        },
        {
          field_id: "excess_garbage",
          label: "ANY EXCESS GARBAGE ONBOARD?",
          field_type: "yes_no",
          is_mandatory: true
        },
        {
          field_id: "medical_issues",
          label: "ANY MEDICAL ISSUE(S)",
          field_type: "yes_no",
          is_mandatory: true
        },
        {
          field_id: "itf_psc_concerns",
          label: "ANY CONCERNS REPORTED TO ITF / PSC?",
          field_type: "yes_no",
          is_mandatory: true
        }
      ]
    },
    {
      section_id: "defects_table",
      section_name: "Defects and Rectification Plans",
      fields: [
        {
          field_id: "defects_list",
          label: "Defects List",
          field_type: "table",
          is_mandatory: false,
          table_structure: {
            columns: [
              { type: "number", label: "Sr. No.", column_id: "sr_no" },
              { type: "text", label: "Defect Description", column_id: "defect_description" },
              { type: "text", label: "Notifications", column_id: "notifications" },
              { type: "text", label: "COCs", column_id: "cocs" },
              { type: "text", label: "Rectification Plan(s)", column_id: "rectification_plan" },
              { type: "yes_no", label: "AMSA / MNZ", column_id: "amsa_mnz" },
              { type: "yes_no", label: "Flag", column_id: "flag" },
              { type: "yes_no", label: "Class", column_id: "class" }
            ]
          }
        }
      ]
    }
  ];

  // Update timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Handle response changes
  const handleResponseChange = useCallback((fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Update completion tracking
    const hasValue = value !== null && value !== undefined && value !== '';
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (hasValue) {
        newSet.add(fieldId);
      } else {
        newSet.delete(fieldId);
      }
      return newSet;
    });
  }, []);

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

  // Calculate progress
  const getProgress = () => {
    const allFields = formSections.flatMap(section => section.fields);
    const totalItems = allFields.length;
    const completedCount = completedItems.size;
    const mandatoryFields = allFields.filter(field => field.is_mandatory);
    const mandatoryCompleted = mandatoryFields.filter(field => completedItems.has(field.field_id)).length;

    return {
      total: totalItems,
      completed: completedCount,
      mandatory: mandatoryFields.length,
      mandatoryCompleted,
      percentage: totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
      mandatoryPercentage: mandatoryFields.length > 0 ? Math.round((mandatoryCompleted / mandatoryFields.length) * 100) : 100
    };
  };

  const progress = getProgress();

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await onSave(responses);
    } finally {
      setSaving(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await onSubmit(responses);
    } finally {
      setSubmitting(false);
    }
  };

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

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
            placeholder={field.placeholder}
            className={`light-form-input ${isCompleted ? 'completed' : ''}`}
            disabled={mode === 'view'}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
            className={`light-form-input ${isCompleted ? 'completed' : ''}`}
            disabled={mode === 'view'}
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
                  disabled={mode === 'view'}
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
            disabled={mode === 'view'}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleResponseChange(field.field_id, e.target.value)}
            className={`light-form-input ${isCompleted ? 'completed' : ''}`}
            disabled={mode === 'view'}
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
      {/* Light Theme Header */}
      <div className="light-header">
        <div className="light-header-left">
          <button onClick={onCancel} className="light-back-btn">
            <ArrowLeft size={16} />
          </button>
          <div className="light-vessel-info">
            <div className="light-title">
              <Ship size={16} />
              <span>5 Day Pre-Arrival Checklist</span>
            </div>
            <div className="light-subtitle">
              {vessel.vessel_name} • IMO: {vessel.imo_no}
            </div>
          </div>
        </div>
        
        <div className="light-header-right">
          <div className="light-progress">
            <div className="light-progress-circle">
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
                  strokeDasharray={`${progress.percentage * 0.503}, 50.3`}
                  strokeLinecap="round"
                  transform="rotate(-90 10 10)"
                />
              </svg>
              <span className="light-progress-text">{progress.percentage}%</span>
            </div>
            <div className="light-progress-info">
              <span>{progress.completed}/{progress.total}</span>
              <small>{progress.mandatoryCompleted}/{progress.mandatory} req</small>
            </div>
          </div>
          
          {mode === 'edit' && (
            <div className="light-actions">
              <button
                onClick={handleSave}
                disabled={saving}
                className="light-btn save"
              >
                {saving ? <RefreshCw size={14} className="spinning" /> : <Save size={14} />}
                Save
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={submitting || progress.mandatoryPercentage < 100}
                className="light-btn submit"
              >
                {submitting ? <RefreshCw size={14} className="spinning" /> : <Send size={14} />}
                Submit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Light Theme Filters */}
      <div className="light-filters">
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
      </div>

      {/* Light Theme Form Content */}
      <div className="light-form-content">
        {formSections.map((section, sectionIndex) => {
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
                {sectionFields.map((field) => (
                  <div
                    key={field.field_id}
                    className={`light-field-item ${field.field_type} ${completedItems.has(field.field_id) ? 'completed' : ''} ${field.is_mandatory ? 'mandatory' : ''}`}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Light Theme Styles - Matching Your Theme */}
      <style jsx>{`
        .light-form-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f7fafd;
          color: #333333;
          font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        /* Light Theme Header */
        .light-header {
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 50px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .light-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .light-back-btn {
          background: #f0f4f8;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          padding: 6px;
          cursor: pointer;
          color: #333333;
          transition: all 0.2s ease;
        }

        .light-back-btn:hover {
          background: #eef4f8;
          transform: translateY(-1px);
        }

        .light-vessel-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .light-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #333333;
        }

        .light-subtitle {
          font-size: 12px;
          color: #6c757d;
        }

        .light-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .light-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .light-progress-circle {
          position: relative;
          width: 28px;
          height: 28px;
        }

        .light-progress-circle svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .light-progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 600;
          color: #007bff;
        }

        .light-progress-info {
          display: flex;
          flex-direction: column;
          font-size: 11px;
          line-height: 1.2;
        }

        .light-progress-info small {
          color: #6c757d;
          font-size: 9px;
        }

        .light-actions {
          display: flex;
          gap: 6px;
        }

        .light-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .light-btn.save {
          background: #f0f4f8;
          color: #333333;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-btn.save:hover:not(:disabled) {
          background: #eef4f8;
          transform: translateY(-1px);
        }

        .light-btn.submit {
          background: #28a745;
          color: white;
        }

        .light-btn.submit:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
        }

        .light-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Light Theme Filters */
        .light-filters {
          background: #ffffff;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 6px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .light-search {
          position: relative;
          flex: 1;
          max-width: 280px;
        }

        .light-search svg {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .light-search input {
          width: 100%;
          padding: 5px 8px 5px 26px;
          background: #f0f4f8;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          color: #333333;
          font-size: 12px;
        }

        .light-search input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }

        .light-filter-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          background: #f0f4f8;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          color: #6c757d;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .light-filter-btn:hover {
          background: #eef4f8;
          color: #333333;
        }

        .light-filter-btn.active {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }

        /* Light Theme Form Content */
        .light-form-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
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

        /* Light Theme Fields Grid */
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

        /* Light Theme Form Inputs */
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

        .light-form-input:disabled {
          background: #e9ecef;
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Light Theme Radio Groups */
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

        /* Light Theme Loading */
        .light-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 100vh;
          background: #f7fafd;
          color: #333333;
        }

        /* Light Theme Dynamic Table Overrides */
        .dynamic-table-container {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          font-family: 'Nunito', sans-serif !important;
        }

        .dynamic-table {
          background: #ffffff !important;
          font-family: 'Nunito', sans-serif !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }

        .dynamic-table th {
          background: #eef4f8 !important;
          color: #333333 !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
          border-right: 1px solid rgba(0, 0, 0, 0.05) !important;
          font-family: 'Nunito', sans-serif !important;
        }

        .dynamic-table-column-label {
          color: #333333 !important;
          font-family: 'Nunito', sans-serif !important;
        }

        .dynamic-table-mandatory-indicator {
          color: #dc3545 !important;
        }

        .dynamic-table tbody tr {
          border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
        }

        .dynamic-table-data-row:hover {
          background: #f8fafc !important;
        }

        .dynamic-table-new-row {
          background: linear-gradient(135deg, rgba(0, 123, 255, 0.05) 0%, #f8fafc 100%) !important;
          border: 2px dashed #007bff !important;
        }

        .dynamic-table-cell {
          border-right: 1px solid rgba(0, 0, 0, 0.05) !important;
          font-family: 'Nunito', sans-serif !important;
        }

        .dynamic-table-input, .dynamic-table-select {
          background: #f0f4f8 !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          color: #333333 !important;
          font-family: 'Nunito', sans-serif !important;
        }

        .dynamic-table-input:focus, .dynamic-table-select:focus {
          border-color: #007bff !important;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1) !important;
        }

        .dynamic-table-cell-yes-no-yes {
          background: rgba(40, 167, 69, 0.1) !important;
          color: #28a745 !important;
          border: 1px solid #28a745 !important;
        }

        .dynamic-table-cell-yes-no-no {
          background: rgba(220, 53, 69, 0.1) !important;
          color: #dc3545 !important;
          border: 1px solid #dc3545 !important;
        }

        .dynamic-table-cell-number {
          background: #f8fafc !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }

        .dynamic-table-add-btn {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%) !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 6px 12px !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3) !important;
          transition: all 0.2s ease !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          font-size: 10px !important;
          min-width: 60px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
        }

        .dynamic-table-add-btn:hover {
          background: linear-gradient(135deg, #0056b3 0%, #004085 100%) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4) !important;
        }

        .dynamic-table-add-btn:active {
          transform: translateY(0) !important;
          box-shadow: 0 1px 2px rgba(0, 123, 255, 0.3) !important;
        }

        .dynamic-table-edit-btn {
          background: #f8fafc !important;
          color: #6c757d !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }

        .dynamic-table-edit-btn:hover {
          background: rgba(0, 123, 255, 0.1) !important;
          color: #007bff !important;
          border-color: #007bff !important;
        }

        .dynamic-table-delete-btn {
          background: rgba(220, 53, 69, 0.1) !important;
          color: #dc3545 !important;
          border-color: #dc3545 !important;
        }

        .dynamic-table-delete-btn:hover {
          background: #dc3545 !important;
          color: white !important;
        }

        .dynamic-table-save-btn {
          background: #28a745 !important;
          color: white !important;
          border-color: #28a745 !important;
        }

        .dynamic-table-save-btn:hover {
          background: #218838 !important;
        }

        .dynamic-table-cancel-btn {
          background: #f8fafc !important;
          color: #6c757d !important;
          border-color: rgba(0, 0, 0, 0.2) !important;
        }

        .dynamic-table-cancel-btn:hover {
          background: #6c757d !important;
          color: white !important;
        }

        .dynamic-table-empty-state {
          background: #f8fafc !important;
          color: #6c757d !important;
          border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .light-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            padding: 8px 12px;
          }

          .light-header-right {
            width: 100%;
            justify-content: space-between;
          }

          .light-filters {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }

          .light-search {
            max-width: none;
          }

          .light-fields-grid {
            grid-template-columns: 1fr;
          }

          .light-form-content {
            padding: 8px;
          }

          .light-actions {
            width: 100%;
          }

          .light-btn {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .light-header {
            padding: 6px 8px;
          }

          .light-title {
            font-size: 13px;
          }

          .light-subtitle {
            font-size: 10px;
          }

          .light-progress-circle {
            width: 24px;
            height: 24px;
          }

          .light-progress-text {
            font-size: 8px;
          }

          .light-field-item {
            padding: 8px;
          }

          .light-radio-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernChecklistForm;