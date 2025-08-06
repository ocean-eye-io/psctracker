// Check if table has any "Yes" responses for container styling
const hasYesResponses = useMemo(() => {
  return tableData.some(row => row.response === 'Yes');
}, [tableData]);

// Helper function to check if a row has "Yes" response
const rowHasYesResponse = (row) => {
  return row.response === 'Yes';
};

const notifyParentOfChange = (updatedData) => {// src/components/dashboard/reporting/DynamicTable.jsx - Enhanced with predefined rows
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Table } from 'lucide-react';
import './DynamicTable.css';

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
}, [value, tableStructure, hasPredefinedRows, predefinedRows]);

useEffect(() => {
  if (!hasPredefinedRows) {
    const initialNewRow = {};
    tableStructure.forEach((col) => {
      const columnId = col.id || col.column_id || col.label;
      initialNewRow[columnId] = col.type === 'yes_no' ? '' : '';
    });
    setNewRowData(initialNewRow);
  }
}, [tableStructure, hasPredefinedRows]);

// Check if table has any "Yes" responses for container styling
const hasYesResponses = useMemo(() => {
  return tableData.some(row => row.response === 'Yes');
}, [tableData]);

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
  
  // Add animation class if response changed to "Yes"
  if (columnId === 'response' && newValue === 'Yes' && oldValue !== 'Yes') {
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
    resetData[columnId] = col.type === 'yes_no' ? '' : '';
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
      response: '',
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

const renderCell = (column, rowData, rowIndex, isEditing = false) => {
  const columnId = column.id || column.column_id || column.label;
  const value = isEditing ? editRowData[columnId] : rowData[columnId];
  const isQueryColumn = columnId === 'query' && hasPredefinedRows;
  
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
  
  switch (column.type) {
    case 'yes_no':
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
  <div className={`dynamic-table-container ${hasError ? 'has-error' : ''} ${disabled ? 'disabled-table' : ''} ${hasPredefinedRows ? 'predefined-table' : ''} ${hasYesResponses ? 'has-yes-responses' : ''}`}>
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
            {hasPredefinedRows && !disabled && <th className="dynamic-table-actions-column">Clear</th>}
          </tr>
        </thead>
        <tbody>
          {/* Table Data Rows */}
          {tableData.map((row, rowIndex) => (
            <tr key={row._id || `row_${rowIndex}`} 
                data-row-index={rowIndex}
                className={`dynamic-table-data-row ${row._isPredefined ? 'predefined-row' : ''} ${rowHasYesResponse(row) ? 'has-yes-response' : ''}`}>
              {tableStructure.map((column, index) => {
                const columnId = column.id || column.column_id || column.label;
                return (
                  <td key={`cell_${rowIndex}_${columnId}`} 
                      className={`dynamic-table-cell dynamic-table-cell-${column.type}`}>
                    {renderCell(column, row, rowIndex, editingRowIndex === rowIndex)}
                  </td>
                );
              })}
              {!disabled && (
                <td className="dynamic-table-actions-cell">
                  <div className={`dynamic-table-action-buttons ${editingRowIndex === rowIndex ? 'editing' : ''}`}>
                    {hasPredefinedRows ? (
                      // For predefined rows, just show clear button
                      <button
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="dynamic-table-action-btn dynamic-table-clear-btn"
                        title="Clear responses"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      // Regular table actions
                      editingRowIndex === rowIndex ? (
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
                      )
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

      {/* Instructions for predefined tables */}
      {hasPredefinedRows && !disabled && (
        <div className="dynamic-table-instructions">
          {hasYesResponses 
            ? "Some items require attention - review highlighted questions with 'Yes' responses."
            : "Complete the checklist by selecting Yes/No for each question and adding remarks as needed."
          }
        </div>
      )}
    </div>
  </div>
);
};

export default DynamicTable;