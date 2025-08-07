// src/components/dashboard/reporting/DynamicTable.jsx - Enhanced with Yes/No tabs and reversed highlighting
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Table } from 'lucide-react';
import './DynamicTable.css';

const DynamicTable = ({ 
  item, 
  value = [], 
  onChange, 
  disabled = false, 
  hasError = false,
  isMlcBiosecurity = false // New prop to identify MLC/Biosecurity tables
}) => {
  const [tableData, setTableData] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(-1);
  const [newRowData, setNewRowData] = useState({});
  const [editRowData, setEditRowData] = useState({});

  const tableStructure = useMemo(() => {
    if (item.table_structure && item.table_structure.columns) {
      return item.table_structure.columns;
    }
    
    if (item.item_id === 'crew_changes_table') {
      return [
        { id: 'rank', label: 'RANK', type: 'text', required: true },
        { id: 'number', label: 'NUMBER', type: 'number', required: true },
        { id: 'remarks', label: 'REMARKS', type: 'text', required: false }
      ];
    }
    
    return [
      { id: 'description', label: 'Description', type: 'text', required: true },
      { id: 'value', label: 'Value', type: 'text', required: false }
    ];
  }, [item]);

  // Check if this table has predefined rows (like MLC/BIO-SECURITY)
  const hasPredefinedRows = useMemo(() => {
    return item.table_structure?.predefined_rows && Array.isArray(item.table_structure.predefined_rows);
  }, [item]);

  const predefinedRows = useMemo(() => {
    if (!hasPredefinedRows) return [];
    return item.table_structure.predefined_rows;
  }, [item, hasPredefinedRows]);

  // UPDATED: Check if this is an MLC/Biosecurity table
  const isMLCBiosecurityTable = useMemo(() => {
    return isMlcBiosecurity || 
           hasPredefinedRows || 
           item.item_id?.toLowerCase().includes('mlc') ||
           item.item_id?.toLowerCase().includes('biosecurity') ||
           item.label?.toLowerCase().includes('mlc') ||
           item.label?.toLowerCase().includes('biosecurity');
  }, [isMlcBiosecurity, hasPredefinedRows, item]);

  // Initialize table data
  useEffect(() => {
    if (hasPredefinedRows) {
      // For predefined rows (like MLC/BIO-SECURITY), merge existing data with predefined structure
      const initialData = predefinedRows.map((predefinedRow, index) => {
        const existingRow = Array.isArray(value) && value[index] ? value[index] : {};
        return {
          _id: `predefined_row_${index}`,
          _isPredefined: true,
          ...predefinedRow,
          // Default to "Yes" for MLC/Biosecurity tables
          response: existingRow.response || (isMLCBiosecurityTable ? 'Yes' : ''),
          ...existingRow // Overlay any existing responses
        };
      });
      setTableData(initialData);
    } else {
      // For regular tables, use existing logic
      if (Array.isArray(value) && value.length > 0) {
        const cleanedData = value.map((row, index) => {
          const cleanRow = { _id: `row_${index}_${Date.now()}` };
          
          tableStructure.forEach((col) => {
            const columnId = col.id || col.column_id || col.label;
            if (row[columnId] !== undefined && row[columnId] !== null) {
              cleanRow[columnId] = row[columnId];
            }
          });
          
          return cleanRow;
        }).filter(row => {
          return tableStructure.some((col) => {
            const columnId = col.id || col.column_id || col.label;
            return row[columnId] !== undefined && 
                   row[columnId] !== null && 
                   row[columnId] !== '';
          });
        });
        
        setTableData(cleanedData);
      } else {
        setTableData([]);
      }
    }
  }, [value, tableStructure, hasPredefinedRows, predefinedRows, isMLCBiosecurityTable]);

  useEffect(() => {
    if (!hasPredefinedRows) {
      const initialNewRow = {};
      tableStructure.forEach((col) => {
        const columnId = col.id || col.column_id || col.label;
        // Default to "Yes" for response columns in MLC/Biosecurity tables
        if (columnId === 'response' && isMLCBiosecurityTable) {
          initialNewRow[columnId] = 'Yes';
        } else {
          initialNewRow[columnId] = col.type === 'yes_no' ? '' : '';
        }
      });
      setNewRowData(initialNewRow);
    }
  }, [tableStructure, hasPredefinedRows, isMLCBiosecurityTable]);

  // UPDATED: Check if table has any "No" responses for container styling (reversed logic)
  const hasNoResponses = useMemo(() => {
    return tableData.some(row => row.response === 'No');
  }, [tableData]);

  // UPDATED: Helper function to check if a row has "No" response (reversed logic)
  const rowHasNoResponse = (row) => {
    return row.response === 'No';
  };

  const notifyParentOfChange = (updatedData) => {
    let cleanedData;
    
    if (hasPredefinedRows) {
      // For predefined rows, only return the response and remarks data
      cleanedData = updatedData.map((row, index) => {
        const cleanRow = {};
        tableStructure.forEach((col) => {
          const columnId = col.id || col.column_id || col.label;
          if (columnId === 'query') {
            // Always include the query from predefined data
            cleanRow[columnId] = predefinedRows[index]?.query || row[columnId];
          } else if (row[columnId] !== undefined && row[columnId] !== null) {
            cleanRow[columnId] = row[columnId];
          }
        });
        return cleanRow;
      });
    } else {
      // Regular table logic
      cleanedData = updatedData.map((row) => {
        const cleanRow = {};
        tableStructure.forEach((col) => {
          const columnId = col.id || col.column_id || col.label;
          if (row[columnId] !== undefined && row[columnId] !== null && row[columnId] !== '') {
            cleanRow[columnId] = row[columnId];
          }
        });
        return cleanRow;
      }).filter(row => {
        return Object.keys(row).length > 0;
      });
    }
    
    if (onChange) {
      onChange(cleanedData);
    }
  };

  const handleCellChange = (rowIndex, columnId, newValue) => {
    const updatedData = [...tableData];
    const oldValue = updatedData[rowIndex][columnId];
    
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [columnId]: newValue
    };
    
    // UPDATED: Add animation class if response changed to "No" (reversed logic)
    if (columnId === 'response' && newValue === 'No' && oldValue !== 'No') {
      setTimeout(() => {
        const rowElement = document.querySelector(`[data-row-index="${rowIndex}"]`);
        if (rowElement) {
          rowElement.classList.add('newly-marked');
          // Remove the animation class after animation completes
          setTimeout(() => {
            rowElement.classList.remove('newly-marked');
          }, 2000);
        }
      }, 50);
    }
    
    setTableData(updatedData);
    notifyParentOfChange(updatedData);
  };

  const handleAddRow = () => {
    if (hasPredefinedRows) {
      // Don't allow adding rows for predefined tables
      return;
    }

    const missingRequired = tableStructure.filter((col) => {
      const columnId = col.id || col.column_id || col.label;
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
      const columnId = col.id || col.column_id || col.label;
      // Default to "Yes" for response columns in MLC/Biosecurity tables
      if (columnId === 'response' && isMLCBiosecurityTable) {
        resetData[columnId] = 'Yes';
      } else {
        resetData[columnId] = col.type === 'yes_no' ? '' : '';
      }
    });
    setNewRowData(resetData);
  };

  const handleEditRow = (index) => {
    setEditingRowIndex(index);
    setEditRowData({ ...tableData[index] });
  };

  const handleSaveEdit = () => {
    const missingRequired = tableStructure.filter((col) => {
      const columnId = col.id || col.column_id || col.label;
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
    if (hasPredefinedRows) {
      // For predefined rows, just clear the response data but keep the row
      const updatedData = [...tableData];
      const clearedRow = {
        ...updatedData[index],
        response: isMLCBiosecurityTable ? 'Yes' : '', // Default back to Yes for MLC/Biosecurity
        remarks: ''
      };
      updatedData[index] = clearedRow;
      setTableData(updatedData);
      notifyParentOfChange(updatedData);
      return;
    }

    if (confirm('Are you sure you want to delete this row?')) {
      const updatedData = tableData.filter((_, i) => i !== index);
      setTableData(updatedData);
      notifyParentOfChange(updatedData);
    }
  };

  // UPDATED: Render Yes/No tabs for MLC/Biosecurity response columns
  const renderYesNoTabs = (value, onChange, disabled) => {
    return (
      <div className="yes-no-tabs">
        <button
          type="button"
          className={`yes-no-tab yes-tab ${value === 'Yes' ? 'active' : ''}`}
          onClick={() => !disabled && onChange('Yes')}
          disabled={disabled}
        >
          Yes
        </button>
        <button
          type="button"
          className={`yes-no-tab no-tab ${value === 'No' ? 'active' : ''}`}
          onClick={() => !disabled && onChange('No')}
          disabled={disabled}
        >
          No
        </button>
      </div>
    );
  };

  const renderCell = (column, rowData, rowIndex, isEditing = false) => {
    const columnId = column.id || column.column_id || column.label;
    const value = isEditing ? editRowData[columnId] : rowData[columnId];
    const isQueryColumn = columnId === 'query' && hasPredefinedRows;
    const isResponseColumn = columnId === 'response';
    
    // For predefined query column, make it readonly
    if (isQueryColumn) {
      return (
        <span className="dynamic-table-cell-value dynamic-table-predefined-query">
          {value}
        </span>
      );
    }
    
    if (isEditing) {
      switch (column.type) {
        case 'yes_no':
          // Use tabs for MLC/Biosecurity response columns in edit mode
          if (isMLCBiosecurityTable && isResponseColumn) {
            return renderYesNoTabs(
              value || '',
              (newValue) => setEditRowData(prev => ({ ...prev, [columnId]: newValue })),
              disabled
            );
          } else {
            return (
              <select
                value={value || ''}
                onChange={(e) => setEditRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
                className="dynamic-table-input dynamic-table-select"
                disabled={disabled}
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            );
          }
        
        case 'date':
          return (
            <input
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
      // For predefined tables in view mode, allow direct editing
      if (hasPredefinedRows && !disabled) {
        switch (column.type) {
          case 'yes_no':
            // Use tabs for MLC/Biosecurity response columns
            if (isMLCBiosecurityTable && isResponseColumn) {
              return renderYesNoTabs(
                value || '',
                (newValue) => handleCellChange(rowIndex, columnId, newValue),
                disabled
              );
            } else {
              return (
                <select
                  value={value || ''}
                  onChange={(e) => handleCellChange(rowIndex, columnId, e.target.value)}
                  className="dynamic-table-input dynamic-table-select"
                  disabled={disabled}
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              );
            }
          
          case 'text':
            if (isQueryColumn) {
              return (
                <span className="dynamic-table-cell-value dynamic-table-predefined-query">
                  {value}
                </span>
              );
            }
            return (
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleCellChange(rowIndex, columnId, e.target.value)}
                className="dynamic-table-input"
                disabled={disabled}
                placeholder={columnId === 'remarks' ? 'Enter remarks...' : `Enter ${column.label.toLowerCase()}...`}
              />
            );
          
          default:
            return (
              <span className="dynamic-table-cell-value">
                {value || '-'}
              </span>
            );
        }
      }
      
      // Regular view mode
      if (value === null || value === undefined || value === '') {
        return <span className="dynamic-table-cell-value dynamic-table-cell-empty">-</span>;
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

  const renderNewRowCell = (column, index) => {
    const columnId = column.id || column.column_id || column.label;
    const isResponseColumn = columnId === 'response';
    
    switch (column.type) {
      case 'yes_no':
        // Use tabs for MLC/Biosecurity response columns in new row
        if (isMLCBiosecurityTable && isResponseColumn) {
          return renderYesNoTabs(
            newRowData[columnId] || '',
            (newValue) => setNewRowData(prev => ({ ...prev, [columnId]: newValue })),
            disabled
          );
        } else {
          return (
            <select
              value={newRowData[columnId] || ''}
              onChange={(e) => setNewRowData(prev => ({ ...prev, [columnId]: e.target.value }))}
              className="dynamic-table-input dynamic-table-select"
              disabled={disabled}
            >
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          );
        }
      
      case 'date':
        return (
          <input
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
    <div className={`dynamic-table-container ${hasError ? 'has-error' : ''} ${disabled ? 'disabled-table' : ''} ${hasPredefinedRows ? 'predefined-table' : ''} ${isMLCBiosecurityTable ? 'mlc-biosecurity-table' : ''} ${hasNoResponses ? 'has-no-responses' : ''}`}>
      <div className="dynamic-table-wrapper">
        <table className="dynamic-table">
          <thead>
            <tr>
              {tableStructure.map((column, index) => (
                <th key={`header_${column.id || column.column_id || column.label || index}`} 
                    className={`dynamic-table-column-header dynamic-table-column-${column.type}`}>
                  <div className="dynamic-table-column-header-content">
                    <span className="dynamic-table-column-label">
                      {column.label}
                      {column.required && <span className="dynamic-table-mandatory-indicator">*</span>}
                    </span>
                  </div>
                </th>
              ))}
              {!disabled && !hasPredefinedRows && <th className="dynamic-table-actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* Table Data Rows */}
            {tableData.map((row, rowIndex) => (
              <tr key={row._id || `row_${rowIndex}`} 
                  data-row-index={rowIndex}
                  className={`dynamic-table-data-row ${row._isPredefined ? 'predefined-row' : ''} ${rowHasNoResponse(row) ? 'has-no-response' : ''}`}>
                {tableStructure.map((column, index) => {
                  const columnId = column.id || column.column_id || column.label;
                  return (
                    <td key={`cell_${rowIndex}_${columnId}`} 
                        className={`dynamic-table-cell dynamic-table-cell-${column.type}`}>
                      {renderCell(column, row, rowIndex, editingRowIndex === rowIndex)}
                    </td>
                  );
                })}
                {!disabled && !hasPredefinedRows && (
                  <td className="dynamic-table-actions-cell">
                    <div className={`dynamic-table-action-buttons ${editingRowIndex === rowIndex ? 'editing' : ''}`}>
                      {editingRowIndex === rowIndex ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="dynamic-table-action-btn dynamic-table-save-btn"
                            title="Save changes"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="dynamic-table-action-btn dynamic-table-cancel-btn"
                            title="Cancel editing"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditRow(rowIndex)}
                            className="dynamic-table-action-btn dynamic-table-edit-btn"
                            title="Edit row"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(rowIndex)}
                            className="dynamic-table-action-btn dynamic-table-delete-btn"
                            title="Delete row"
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

            {/* New Row (only for non-predefined tables) */}
            {!disabled && !hasPredefinedRows && editingRowIndex === -1 && (
              <tr className="dynamic-table-new-row">
                {tableStructure.map((column, index) => (
                  <td key={`new_${column.id || column.column_id || column.label || index}`} 
                      className={`dynamic-table-new-cell dynamic-table-cell-${column.type}`}>
                    {renderNewRowCell(column, index)}
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
            <Table size={24} />
            <p>No data available</p>
          </div>
        )}

        {/* UPDATED: Instructions for predefined tables (reversed logic) */}
        {hasPredefinedRows && !disabled && (
          <div className="dynamic-table-instructions">
            {hasNoResponses 
              ? "⚠️ Attention required - review highlighted questions with 'No' responses."
              : "✅ Complete the checklist by selecting Yes/No for each question and adding remarks as needed."
            }
          </div>
        )}
      </div>

      {/* UPDATED: Add CSS for Yes/No tabs */}
      <style jsx>{`
        /* Yes/No Tabs Styling */
        .yes-no-tabs {
          display: flex;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          width: 100%;
          max-width: 120px;
        }

        .yes-no-tab {
          flex: 1;
          padding: 6px 8px;
          border: none;
          background: transparent;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
        }

        .yes-no-tab:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
        }

        .yes-no-tab:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .yes-no-tab.active.yes-tab {
          background: #22c55e;
          color: white;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .yes-no-tab.active.no-tab {
          background: #ef4444;
          color: white;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .yes-no-tab:first-child {
          border-right: 1px solid #d1d5db;
        }

        /* MLC/Biosecurity table styling */
        .mlc-biosecurity-table {
          border-color: #06b6d4;
          background: rgba(6, 182, 212, 0.02);
        }

        .mlc-biosecurity-table .dynamic-table thead {
          background: linear-gradient(180deg, #0891b2, #06b6d4);
          color: white;
        }

        /* UPDATED: Highlight rows with "No" responses (reversed logic) */
        .has-no-responses {
          border-color: #ef4444;
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
        }

        .has-no-response {
          background-color: rgba(239, 68, 68, 0.05) !important;
          border-left: 3px solid #ef4444;
        }

        .has-no-response:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
        }

        /* Animation for newly marked "No" responses */
        .newly-marked {
          animation: highlightNo 2s ease-in-out;
        }

        @keyframes highlightNo {
          0% { background-color: rgba(239, 68, 68, 0.05); }
          50% { background-color: rgba(239, 68, 68, 0.3); }
          100% { background-color: rgba(239, 68, 68, 0.05); }
        }

        /* Enhanced instructions styling */
        .dynamic-table-instructions {
          padding: 12px 16px;
          margin: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }

        .has-no-responses .dynamic-table-instructions {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .dynamic-table-instructions:not(.has-no-responses *) {
          background: rgba(34, 197, 94, 0.1);
          color: #059669;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
      `}</style>
    </div>
  );
};

export default DynamicTable;