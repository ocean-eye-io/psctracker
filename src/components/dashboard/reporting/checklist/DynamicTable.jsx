// DynamicTable.jsx - New component for handling table fields
import React, { useState, useEffect } from 'react';
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

  // Initialize new row template based on columns
  const initializeNewRow = () => {
    const template = {};
    if (item.table_structure?.columns) {
      item.table_structure.columns.forEach(col => {
        template[col.column_id] = col.type === 'number' ? 0 : 
                                  col.type === 'yes_no' ? null : '';
      });
    }
    return template;
  };

  // Update parent when table data changes
  useEffect(() => {
    onChange(tableData);
  }, [tableData, onChange]);

  // Initialize new row when component mounts
  useEffect(() => {
    setNewRow(initializeNewRow());
  }, [item.table_structure]);

  const handleAddRow = () => {
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
      _id: Date.now().toString() // Simple ID for row tracking
    };

    setTableData(prev => [...prev, rowWithId]);
    setNewRow(initializeNewRow());
  };

  const handleEditRow = (index) => {
    setEditingRow(index);
  };

  const handleSaveRow = (index) => {
    setEditingRow(null);
  };

  const handleCancelEdit = (index) => {
    setEditingRow(null);
  };

  const handleDeleteRow = (index) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      setTableData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleCellChange = (rowIndex, columnId, value) => {
    if (rowIndex === -1) {
      // Editing new row
      setNewRow(prev => ({
        ...prev,
        [columnId]: value
      }));
    } else {
      // Editing existing row
      setTableData(prev => prev.map((row, index) => 
        index === rowIndex 
          ? { ...row, [columnId]: value }
          : row
      ));
    }
  };

  const renderCell = (column, value, rowIndex, isEditing = false) => {
    const cellId = `${item.item_id}_${rowIndex}_${column.column_id}`;
    
    if (!isEditing && rowIndex !== -1) {
      // Display mode
      switch (column.type) {
        case 'yes_no':
          return (
            <span className={`table-cell-value ${value ? 'yes-no-' + value.toLowerCase() : ''}`}>
              {value || '-'}
            </span>
          );
        case 'number':
          return (
            <span className="table-cell-value number">
              {value !== null && value !== undefined ? value : '-'}
            </span>
          );
        default:
          return (
            <span className="table-cell-value">
              {value || '-'}
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
            value={value || ''}
            onChange={(e) => handleCellChange(rowIndex, column.column_id, e.target.value)}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
            disabled={disabled}
            className="table-cell-input"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value !== null && value !== undefined ? value : ''}
            onChange={(e) => handleCellChange(rowIndex, column.column_id, 
              e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="0"
            disabled={disabled}
            className="table-cell-input number"
          />
        );
      
      case 'yes_no':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleCellChange(rowIndex, column.column_id, 
              e.target.value === '' ? null : e.target.value)}
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
            value={value || ''}
            onChange={(e) => handleCellChange(rowIndex, column.column_id, e.target.value)}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
            disabled={disabled}
            className="table-cell-input"
          />
        );
    }
  };

  if (!item.table_structure?.columns) {
    return (
      <div className="table-error">
        <p>Table configuration error: No columns defined</p>
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
    </div>
  );
};

export default DynamicTable;