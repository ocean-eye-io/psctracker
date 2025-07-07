// DynamicTable.jsx - Fixed version with better data handling
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Save, X, Table } from 'lucide-react';

const DynamicTable = ({ 
  item, 
  value = [], 
  onChange, 
  disabled = false, 
  hasError = false 
}) => {
  // CRITICAL FIX: Better state management
  const [tableData, setTableData] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(-1);
  const [newRowData, setNewRowData] = useState({});
  const [editRowData, setEditRowData] = useState({});

  // CRITICAL FIX: Extract table structure from item
  const tableStructure = useMemo(() => {
    console.log('🏗️ Building table structure for:', item.item_id);
    console.log('🏗️ Item table_structure:', item.table_structure);
    
    if (item.table_structure && item.table_structure.columns) {
      console.log('✅ Using item.table_structure.columns');
      return item.table_structure.columns;
    }
    
    // Fallback structure for crew changes table
    if (item.item_id === 'crew_changes_table') {
      console.log('🚢 Using fallback structure for crew_changes_table');
      return [
        { id: 'name', label: 'Name', type: 'text', required: true },
        { id: 'rank', label: 'Rank', type: 'text', required: true },
        { id: 'joining_leaving', label: 'Joining/Leaving', type: 'yes_no', required: true },
        { id: 'date', label: 'Date', type: 'date', required: false },
        { id: 'remarks', label: 'Remarks', type: 'text', required: false }
      ];
    }
    
    // Generic fallback
    console.log('⚠️ Using generic fallback structure');
    return [
      { id: 'description', label: 'Description', type: 'text', required: true },
      { id: 'value', label: 'Value', type: 'text', required: false }
    ];
  }, [item]);

  // CRITICAL FIX: Initialize state from value prop
  useEffect(() => {
    console.log('🔄 DynamicTable useEffect - value changed:', value);
    
    if (Array.isArray(value) && value.length > 0) {
      // Clean the incoming data
      const cleanedData = value.map((row, index) => {
        const cleanRow = { _id: `row_${index}_${Date.now()}` };
        
        // Only include valid columns
        tableStructure.forEach((col, colIndex) => {
          const columnId = col.id || col.label || `col_${colIndex}`;
          if (row[columnId] !== undefined && row[columnId] !== null) {
            cleanRow[columnId] = row[columnId];
          }
        });
        
        return cleanRow;
      }).filter(row => {
        // Only keep rows that have at least one meaningful value
        return tableStructure.some((col, colIndex) => {
          const columnId = col.id || col.label || `col_${colIndex}`;
          return row[columnId] !== undefined && 
                 row[columnId] !== null && 
                 row[columnId] !== '';
        });
      });
      
      console.log('🔄 Setting tableData to:', cleanedData);
      setTableData(cleanedData);
    } else {
      console.log('🔄 Setting tableData to empty array');
      setTableData([]);
    }
  }, [value, tableStructure]);

  // CRITICAL FIX: Initialize new row data when structure changes
  useEffect(() => {
    const initialNewRow = {};
    tableStructure.forEach((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      initialNewRow[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(initialNewRow);
  }, [tableStructure]);

  // CRITICAL FIX: Better data transmission to parent
  const notifyParentOfChange = (updatedData) => {
    console.log('📤 DynamicTable notifying parent of change:', updatedData);
    
    // Clean the data before sending to parent
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
      // Only send rows that have meaningful data
      return Object.keys(row).length > 0;
    });
    
    console.log('📤 Cleaned data being sent to parent:', cleanedData);
    
    if (onChange) {
      onChange(cleanedData);
    }
  };

  // CRITICAL FIX: Add new row handler
  const handleAddRow = () => {
    console.log('➕ Adding new row:', newRowData);
    
    // Validate required fields
    const missingRequired = tableStructure.filter((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      return col.required && (!newRowData[columnId] || newRowData[columnId].trim() === '');
    });
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(col => col.label).join(', ')}`);
      return;
    }
    
    // Create new row with unique ID
    const newRow = {
      _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newRowData
    };
    
    const updatedData = [...tableData, newRow];
    console.log('➕ Updated table data after add:', updatedData);
    
    setTableData(updatedData);
    notifyParentOfChange(updatedData);
    
    // Reset new row form
    const resetData = {};
    tableStructure.forEach((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      resetData[columnId] = col.type === 'yes_no' ? 'Yes' : '';
    });
    setNewRowData(resetData);
  };

  // CRITICAL FIX: Edit row handlers
  const handleEditRow = (index) => {
    console.log('✏️ Starting edit for row:', index, tableData[index]);
    setEditingRowIndex(index);
    setEditRowData({ ...tableData[index] });
  };

  const handleSaveEdit = () => {
    console.log('💾 Saving edit for row:', editingRowIndex, editRowData);
    
    // Validate required fields
    const missingRequired = tableStructure.filter((col, index) => {
      const columnId = col.id || col.label || `col_${index}`;
      return col.required && (!editRowData[columnId] || editRowData[columnId].trim() === '');
    });
    
    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map(col => col.label).join(', ')}`);
      return;
    }
    
    const updatedData = [...tableData];
    updatedData[editingRowIndex] = { ...editRowData };
    
    console.log('💾 Updated table data after edit:', updatedData);
    
    setTableData(updatedData);
    notifyParentOfChange(updatedData);
    setEditingRowIndex(-1);
    setEditRowData({});
  };

  const handleCancelEdit = () => {
    console.log('❌ Cancelling edit');
    setEditingRowIndex(-1);
    setEditRowData({});
  };

  const handleDeleteRow = (index) => {
    console.log('🗑️ Deleting row:', index);
    
    if (confirm('Are you sure you want to delete this row?')) {
      const updatedData = tableData.filter((_, i) => i !== index);
      console.log('🗑️ Updated table data after delete:', updatedData);
      
      setTableData(updatedData);
      notifyParentOfChange(updatedData);
    }
  };

  // CRITICAL FIX: Cell renderers
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
              className="table-cell-select"
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
              className="table-cell-input"
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
              className="table-cell-input number"
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
              className="table-cell-input"
              disabled={disabled}
              placeholder={`Enter ${column.label.toLowerCase()}...`}
            />
          );
      }
    } else {
      // Display mode
      if (value === null || value === undefined || value === '') {
        return <span className="table-cell-value">-</span>;
      }
      
      switch (column.type) {
        case 'yes_no':
          return (
            <span className={`table-cell-value yes-no-${value.toLowerCase()}`}>
              {value}
            </span>
          );
        
        case 'number':
          return (
            <span className="table-cell-value number">
              {value}
            </span>
          );
        
        default:
          return (
            <span className="table-cell-value">
              {value}
            </span>
          );
      }
    }
  };

  // CRITICAL FIX: New row cell renderer
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
            className="table-cell-select"
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
            className="table-cell-input"
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
            className="table-cell-input number"
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
            className="table-cell-input"
            disabled={disabled}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
          />
        );
    }
  };

  console.log('🎨 DynamicTable render:', {
    itemId: item.item_id,
    tableDataLength: tableData.length,
    tableStructureLength: tableStructure.length,
    hasError,
    disabled
  });

  return (
    <div className={`dynamic-table-container ${hasError ? 'has-error' : ''}`}>
      {/* Table Header */}
      <div className="table-header">
        <div className="table-title">
          <Table className="table-icon" />
          <span>{item.description || item.check_description || 'Data Table'}</span>
        </div>
        <div className="table-info">
          {tableData.length} {tableData.length === 1 ? 'row' : 'rows'}
        </div>
      </div>

      {/* Table Content */}
      <div className="table-wrapper">
        <table className="dynamic-table">
          <thead>
            <tr>
              {tableStructure.map((column, index) => (
                <th key={`header_${column.id || column.label || index}`} className={`column-${column.type}`}>
                  <div className="column-header">
                    <span className="column-label">
                      {column.label}
                      {column.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                    </span>
                    <span className="column-type">{column.type}</span>
                  </div>
                </th>
              ))}
              {!disabled && <th className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* Existing Data Rows */}
            {tableData.map((row, rowIndex) => (
              <tr key={row._id || `row_${rowIndex}`} className="data-row">
                {tableStructure.map((column, index) => (
                  <td key={`cell_${rowIndex}_${column.id || column.label || index}`} className={`cell-${column.type}`}>
                    {renderCell(column, row, rowIndex, editingRowIndex === rowIndex)}
                  </td>
                ))}
                {!disabled && (
                  <td className="actions-cell">
                    <div className={`action-buttons ${editingRowIndex === rowIndex ? 'editing' : ''}`}>
                      {editingRowIndex === rowIndex ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="action-btn save"
                            title="Save changes"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="action-btn cancel"
                            title="Cancel editing"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditRow(rowIndex)}
                            className="action-btn edit"
                            title="Edit row"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(rowIndex)}
                            className="action-btn delete"
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
              <tr className="new-row">
                {tableStructure.map((column, index) => (
                  <td key={`new_${column.id || column.label || index}`} className={`new-cell cell-${column.type}`}>
                    {renderNewRowCell(column)}
                  </td>
                ))}
                <td className="actions-cell">
                  <button
                    onClick={handleAddRow}
                    className="action-btn add"
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
          <div className="table-empty-state">
            <p>No data available</p>
          </div>
        )}
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '10px', 
          color: '#666', 
          padding: '4px 8px', 
          background: '#f9f9f9',
          borderTop: '1px solid #eee'
        }}>
          Debug: {tableData.length} rows, Structure: {tableStructure.length} columns
        </div>
      )}
    </div>
  );
};

export default DynamicTable;