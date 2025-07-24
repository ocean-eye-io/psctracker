// src/components/dashboard/reporting/DynamicTable.jsx - Clean version without debug info
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Table } from 'lucide-react';
import './DynamicTable.css'; // Import the CSS file

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
        { id: 'name', label: 'Name', type: 'text', required: true },
        { id: 'rank', label: 'Rank', type: 'text', required: true },
        { id: 'joining_leaving', label: 'Joining/Leaving', type: 'yes_no', required: true },
        { id: 'date', label: 'Date', type: 'date', required: false },
        { id: 'remarks', label: 'Remarks', type: 'text', required: false }
      ];
    }
    
    return [
      { id: 'description', label: 'Description', type: 'text', required: true },
      { id: 'value', label: 'Value', type: 'text', required: false }
    ];
  }, [item]);

  useEffect(() => {
    if (Array.isArray(value) && value.length > 0) {
      const cleanedData = value.map((row, index) => {
        const cleanRow = { _id: `row_${index}_${Date.now()}` };
        
        tableStructure.forEach((col, colIndex) => {
          const columnId = col.id || col.label || `col_${colIndex}`;
          if (row[columnId] !== undefined && row[columnId] !== null) {
            cleanRow[columnId] = row[columnId];
          }
        });
        
        return cleanRow;
      }).filter(row => {
        return tableStructure.some((col, colIndex) => {
          const columnId = col.id || col.label || `col_${colIndex}`;
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
    tableStructure.forEach((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      initialNewRow[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(initialNewRow);
  }, [tableStructure]);

  const notifyParentOfChange = (updatedData) => {
    const cleanedData = updatedData.map((row, rowIndex) => {
      const cleanRow = {};
      tableStructure.forEach((col, colIndex) => {
        const columnId = col.id || col.label || `col_${colIndex}`;
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
    const missingRequired = tableStructure.filter((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
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
    tableStructure.forEach((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      resetData[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(resetData);
  };

  const handleEditRow = (index) => {
    setEditingRowIndex(index);
    setEditRowData({ ...tableData[index] });
  };

  const handleSaveEdit = () => {
    const missingRequired = tableStructure.filter((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
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
    const columnId = column.id || column.label || `col_${tableStructure.indexOf(column)}`;
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
    const columnId = column.id || column.label || `col_${index}`;
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
              {tableStructure.map((column, index) => (
                <th key={`header_${column.id || column.label || index}`} className={`dynamic-table-column-header dynamic-table-column-${column.type}`}>
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
                {tableStructure.map((column, index) => (
                  <td key={`cell_${rowIndex}_${column.id || column.label || index}`} className={`dynamic-table-cell dynamic-table-cell-${column.type}`}>
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

            {/* New Row */}
            {!disabled && editingRowIndex === -1 && (
              <tr className="dynamic-table-new-row">
                {tableStructure.map((column, index) => (
                  <td key={`new_${column.id || column.label || index}`} className={`dynamic-table-new-cell dynamic-table-cell-${column.type}`}>
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
            <p>No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicTable;