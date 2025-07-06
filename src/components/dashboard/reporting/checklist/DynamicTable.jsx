// FIXED DynamicTable.jsx - Prevents input validation errors
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';

const DynamicTable = ({ 
  item, 
  value = [], 
  onChange, 
  disabled = false,
  hasError = false 
}) => {
  const [tableData, setTableData] = useState(value || []);
  const [editingRow, setEditingRow] = useState(null);
  const [newRow, setNewRow] = useState({});

  // FIXED: Memoize the template to prevent recreating on every render
  const newRowTemplate = useMemo(() => {
    const template = {};
    if (item.table_structure?.columns) {
      item.table_structure.columns.forEach(col => {
        switch (col.type) {
          case 'number':
            template[col.column_id] = '';
            break;
          case 'yes_no':
            template[col.column_id] = '';
            break;
          case 'date':
            template[col.column_id] = '';
            break;
          default:
            template[col.column_id] = '';
        }
      });
    }
    return template;
  }, [item.table_structure]);

  // FIXED: Initialize new row only when template changes
  useEffect(() => {
    setNewRow(newRowTemplate);
  }, [newRowTemplate]);

  // FIXED: Only sync with parent when value prop changes (not when internal state changes)
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(tableData)) {
      setTableData(value || []);
    }
  }, [value]);

  // FIXED: Use callback to prevent infinite loops with debouncing
  const handleTableDataChange = useCallback((newData) => {
    setTableData(newData);
    
    // Debounce onChange calls to prevent excessive API calls
    if (onChange) {
      const timeoutId = setTimeout(() => {
        onChange(newData);
      }, 300); // Increased debounce time
      
      return () => clearTimeout(timeoutId);
    }
  }, [onChange]);

  const handleAddRow = useCallback(() => {
    // Validate new row has required data
    const hasData = Object.values(newRow).some(val => 
      val !== null && val !== undefined && val !== ''
    );

    if (!hasData) {
      alert('Please enter some data before adding a row.');
      return;
    }

    const rowWithId = {
      ...newRow,
      _id: Date.now().toString()
    };

    const newTableData = [...tableData, rowWithId];
    handleTableDataChange(newTableData);
    setNewRow(newRowTemplate);
  }, [newRow, tableData, newRowTemplate, handleTableDataChange]);

  const handleEditRow = useCallback((index) => {
    setEditingRow(index);
  }, []);

  const handleSaveRow = useCallback((index) => {
    setEditingRow(null);
  }, []);

  const handleCancelEdit = useCallback((index) => {
    setEditingRow(null);
  }, []);

  const handleDeleteRow = useCallback((index) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      const newTableData = tableData.filter((_, i) => i !== index);
      handleTableDataChange(newTableData);
    }
  }, [tableData, handleTableDataChange]);

  const handleCellChange = useCallback((rowIndex, columnId, value) => {
    console.log(`Cell change: row ${rowIndex}, column ${columnId}, value:`, value, typeof value);
    
    if (rowIndex === -1) {
      // Editing new row
      setNewRow(prev => ({
        ...prev,
        [columnId]: value
      }));
    } else {
      // Editing existing row
      const newTableData = tableData.map((row, index) => 
        index === rowIndex 
          ? { ...row, [columnId]: value }
          : row
      );
      handleTableDataChange(newTableData);
    }
  }, [tableData, handleTableDataChange]);

  // CRITICAL FIX: Enhanced input validation and value sanitization
  const sanitizeInputValue = useCallback((column, rawValue) => {
    if (rawValue === null || rawValue === undefined) {
      return '';
    }

    switch (column.type) {
      case 'number':
        // For number inputs, only allow valid numeric strings or empty
        if (rawValue === '') return '';
        const numStr = String(rawValue);
        // Allow partial numbers like "1.", "-", etc. during typing
        if (/^-?(\d*\.?\d*)$/.test(numStr)) {
          return numStr;
        }
        return '';
        
      case 'date':
        // For date inputs, ensure YYYY-MM-DD format or empty
        if (rawValue === '') return '';
        const dateStr = String(rawValue);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        return '';
        
      case 'yes_no':
        // For select inputs, only allow valid options
        const validOptions = ['', 'Yes', 'No'];
        return validOptions.includes(rawValue) ? rawValue : '';
        
      default:
        // For text inputs, convert to string
        return String(rawValue);
    }
  }, []);

  const renderCell = useCallback((column, value, rowIndex, isEditing = false) => {
    const cellId = `${item.item_id}_${rowIndex}_${column.column_id}`;
    
    // FIXED: Sanitize value before rendering
    const sanitizedValue = sanitizeInputValue(column, value);
    
    if (!isEditing && rowIndex !== -1) {
      // Display mode
      switch (column.type) {
        case 'yes_no':
          const displayValue = sanitizedValue || '-';
          const cssClass = sanitizedValue ? 'yes-no-' + sanitizedValue.toLowerCase() : '';
          return (
            <span className={`table-cell-value ${cssClass}`}>
              {displayValue}
            </span>
          );
        case 'number':
          return (
            <span className="table-cell-value number">
              {sanitizedValue || '-'}
            </span>
          );
        case 'date':
          return (
            <span className="table-cell-value date">
              {sanitizedValue ? new Date(sanitizedValue).toLocaleDateString() : '-'}
            </span>
          );
        default:
          return (
            <span className="table-cell-value">
              {sanitizedValue || '-'}
            </span>
          );
      }
    }

    // Edit mode or new row
    switch (column.type) {
      case 'text':
        return (
          <input
            type="text"
            value={sanitizedValue}
            onChange={(e) => {
              const newValue = e.target.value;
              handleCellChange(rowIndex, column.column_id, newValue);
            }}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
            disabled={disabled}
            className="table-cell-input"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={sanitizedValue}
            onChange={(e) => {
              const inputValue = e.target.value;
              console.log(`Number input change: "${inputValue}"`);
              
              // Allow empty string or valid number strings
              if (inputValue === '' || /^-?(\d*\.?\d*)$/.test(inputValue)) {
                handleCellChange(rowIndex, column.column_id, inputValue);
              }
            }}
            onBlur={(e) => {
              // On blur, convert to actual number or null
              const inputValue = e.target.value;
              if (inputValue === '' || inputValue === '-' || inputValue === '.') {
                handleCellChange(rowIndex, column.column_id, '');
              } else {
                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  handleCellChange(rowIndex, column.column_id, numValue);
                } else {
                  handleCellChange(rowIndex, column.column_id, '');
                }
              }
            }}
            placeholder="0"
            disabled={disabled}
            className="table-cell-input number"
            step="any"
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={sanitizedValue}
            onChange={(e) => {
              const dateValue = e.target.value;
              console.log(`Date input change: "${dateValue}"`);
              
              // Only allow empty string or valid date format
              if (dateValue === '' || /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                handleCellChange(rowIndex, column.column_id, dateValue);
              }
            }}
            disabled={disabled}
            className="table-cell-input date"
            min="1900-01-01"
            max="2099-12-31"
          />
        );
      
      case 'yes_no':
        return (
          <select
            value={sanitizedValue}
            onChange={(e) => {
              const selectValue = e.target.value;
              handleCellChange(rowIndex, column.column_id, selectValue);
            }}
            disabled={disabled}
            className="table-cell-select"
          >
            <option value="">Select...</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        );
      
      default:
        return (
          <input
            type="text"
            value={sanitizedValue}
            onChange={(e) => {
              const newValue = e.target.value;
              handleCellChange(rowIndex, column.column_id, newValue);
            }}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
            disabled={disabled}
            className="table-cell-input"
          />
        );
    }
  }, [item.item_id, handleCellChange, disabled, sanitizeInputValue]);

  if (!item.table_structure?.columns) {
    return (
      <div className="table-error">
        <p>Table configuration error: No columns defined</p>
        <details style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify(item, null, 2)}</pre>
        </details>
      </div>
    );
  }

  return (
    <div className={`dynamic-table-container ${hasError ? 'has-error' : ''}`}>
      <div className="table-header">
        <div className="table-title">
          <span className="table-icon">📊</span>
          <strong>{item.description}</strong>
        </div>
        <div className="table-info">
          {tableData.length} {tableData.length === 1 ? 'row' : 'rows'}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="dynamic-table">
          <thead>
            <tr>
              {item.table_structure.columns.map((column) => (
                <th key={column.column_id} className={`column-${column.type}`}>
                  <div className="column-header">
                    <span className="column-label">{column.label}</span>
                    <span className="column-type">({column.type})</span>
                  </div>
                </th>
              ))}
              {!disabled && <th className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* Existing rows */}
            {tableData.map((row, rowIndex) => (
              <tr key={row._id || rowIndex} className="data-row">
                {item.table_structure.columns.map((column) => (
                  <td key={column.column_id} className={`cell-${column.type}`}>
                    {renderCell(
                      column, 
                      row[column.column_id], 
                      rowIndex, 
                      editingRow === rowIndex
                    )}
                  </td>
                ))}
                {!disabled && (
                  <td className="actions-cell">
                    {editingRow === rowIndex ? (
                      <div className="action-buttons editing">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(rowIndex)}
                          className="action-btn save"
                          title="Save changes"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(rowIndex)}
                          className="action-btn cancel"
                          title="Cancel editing"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button
                          type="button"
                          onClick={() => handleEditRow(rowIndex)}
                          className="action-btn edit"
                          title="Edit row"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="action-btn delete"
                          title="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {/* New row */}
            {!disabled && (
              <tr className="new-row">
                {item.table_structure.columns.map((column) => (
                  <td key={column.column_id} className={`cell-${column.type} new-cell`}>
                    {renderCell(column, newRow[column.column_id], -1, true)}
                  </td>
                ))}
                <td className="actions-cell">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="action-btn add"
                    title="Add new row"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasError && (
        <div className="table-error-message">
          This table field is required and must have at least one row.
        </div>
      )}

      {tableData.length === 0 && !disabled && (
        <div className="table-empty-state">
          <p>No data entered yet. Use the row above to add your first entry.</p>
        </div>
      )}

      {/* Debug panel (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: '16px', fontSize: '12px', background: '#f8f9fa', padding: '8px' }}>
          <summary>Debug Info (dev only)</summary>
          <div>Table Data: {JSON.stringify(tableData, null, 2)}</div>
          <div>New Row: {JSON.stringify(newRow, null, 2)}</div>
          <div>Columns: {JSON.stringify(item.table_structure?.columns || [], null, 2)}</div>
        </details>
      )}
    </div>
  );
};

export default DynamicTable;