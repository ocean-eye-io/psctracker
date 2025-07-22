// src/components/common/Table/Table.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import TableRow from './TableRow';
import ResizableTableHeader from './ResizableTableHeader';
import { ChevronDown } from 'lucide-react';
import './tableStyles.css';

const Table = ({ 
  data, 
  columns, 
  expandedContent,
  actions,
  uniqueIdField = 'id',
  defaultSortKey,
  defaultSortDirection = 'asc',
  onRowClick,
  className = '',
  onColumnResize, // NEW PROP for handling column resize
  userColumnWidths = {} // NEW PROP for user-defined column widths
}) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ 
    key: defaultSortKey || (columns[0]?.field || null), 
    direction: defaultSortDirection 
  });
  const tableWrapperRef = useRef(null);
  const [showShadows, setShowShadows] = useState({
    top: false,
    right: false,
    bottom: false,
    left: false
  });

  const toggleRowExpansion = (rowId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Get effective column width (user preference or default)
  const getColumnWidth = (column) => {
    return userColumnWidths[column.field] || column.width;
  };

  // Handle column resize
  const handleColumnResize = (columnField, newWidth) => {
    if (onColumnResize) {
      onColumnResize(columnField, newWidth);
    }
  };

  // Check scroll position to show/hide shadows
  const handleScroll = () => {
    if (!tableWrapperRef.current) return;
    
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = tableWrapperRef.current;
    
    setShowShadows({
      top: scrollTop > 5,
      right: scrollLeft < (scrollWidth - clientWidth - 5) && scrollWidth > clientWidth,
      bottom: scrollTop < (scrollHeight - clientHeight - 5) && scrollHeight > clientHeight,
      left: scrollLeft > 5
    });
  };

  // Set up scroll event listener
  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    if (tableWrapper) {
      tableWrapper.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      // Window resize should also trigger a check
      window.addEventListener('resize', handleScroll);
      
      return () => {
        tableWrapper.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, []);

  // UPDATED: Sort the data based on sort configuration with support for custom sort values
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      // Find the column configuration for the current sort key
      const column = columns.find(col => col.field === sortConfig.key);
      
      let aValue, bValue;
      
      // Check if the column has a custom sort value getter
      if (column && column.getSortValue) {
        aValue = column.getSortValue(a);
        bValue = column.getSortValue(b);
      } else {
        // Use the original logic for fields without custom sort
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Compare based on data type
      let result;
      
      // For custom sort values (like timestamps from getSortValue), do numeric comparison
      if (column && column.getSortValue) {
        result = aValue - bValue;
      }
      // Date comparison
      else if (aValue instanceof Date && bValue instanceof Date) {
        result = aValue.getTime() - bValue.getTime();
      }
      // String comparison
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = aValue.localeCompare(bValue);
      }
      // Number comparison
      else {
        result = aValue - bValue;
      }
      
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [data, sortConfig, columns]); // Added columns to dependencies

  return (
    <div className={`data-table-container ${className}`}>
      {/* Scrolling shadows for visual indication */}
      {showShadows.top && <div className="table-shadow-top"></div>}
      {showShadows.right && <div className="table-shadow-right"></div>}
      {showShadows.bottom && <div className="table-shadow-bottom"></div>}
      {showShadows.left && <div className="table-shadow-left"></div>}
      
      <div 
        className="data-table-wrapper" 
        ref={tableWrapperRef}
        onScroll={handleScroll}
      >
        <table className="data-table">
          <thead>
            <tr>
              {expandedContent && <th style={{ width: '32px' }}></th>}
              {columns.map((column, index) => {
                const effectiveWidth = getColumnWidth(column);
                const headerStyle = {
                  width: effectiveWidth,
                  minWidth: column.minWidth,
                };

                // Check if column has custom header renderer
                if (column.headerRenderer) {
                  return (
                    <ResizableTableHeader
                      key={column.field}
                      column={column}
                      index={index}
                      onColumnResize={handleColumnResize}
                      style={headerStyle}
                      className={`${column.headerClassName || ''} custom-header`}
                    >
                      {column.headerRenderer()}
                    </ResizableTableHeader>
                  );
                }

                // Default sortable header
                return (
                  <ResizableTableHeader
                    key={column.field}
                    column={column}
                    index={index}
                    onColumnResize={handleColumnResize}
                    onClick={() => column.sortable !== false && handleSort(column.field)}
                    style={headerStyle}
                    className={`${column.headerClassName || ''} ${column.sortable !== false ? 'sortable-header' : ''}`}
                  >
                    <div className="table-header-content">
                      {column.label}
                      {column.sortable !== false && sortConfig.key === column.field && (
                        <ChevronDown 
                          size={14} 
                          className="sort-icon"
                          style={{ 
                            transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                          }} 
                        />
                      )}
                    </div>
                  </ResizableTableHeader>
                );
              })}
              {actions && <th style={{ width: actions.width || '100px' }}>{actions.label || 'Actions'}</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((row) => (
                <TableRow
                  key={row[uniqueIdField]}
                  rowData={row}
                  columns={columns.map(col => ({
                    ...col,
                    width: getColumnWidth(col) // Pass effective width to rows
                  }))}
                  isExpanded={expandedRows.has(row[uniqueIdField])}
                  onToggleExpand={() => toggleRowExpansion(row[uniqueIdField])}
                  expandedContent={expandedContent ? expandedContent(row) : null}
                  actions={actions ? actions.content(row) : null}
                  onRowClick={onRowClick ? () => onRowClick(row) : null}
                />
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (expandedContent ? 1 : 0) + (actions ? 1 : 0)} className="empty-table-message">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table; 