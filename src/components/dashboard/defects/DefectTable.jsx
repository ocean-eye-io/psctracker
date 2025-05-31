// DefectTable.jsx - Updated for truly floating pagination

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table';
import FloatingPagination from './FloatingPagination';
import { Trash2, FileText, Download, Upload, Plus } from 'lucide-react';
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import styles from './defect.module.css';

const STATUS_COLORS = {
  'OPEN': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'CLOSED': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'IN PROGRESS': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' }
};

const CRITICALITY_COLORS = {
  'High': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'Medium': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'Low': { bg: 'bg-blue-500/20', text: 'text-blue-300' }
};

const PER_PAGE = 10;

const DefectTable = ({
  defects = [],
  onEdit,
  onDelete,
  currentUser,
  loading = false,
  emptyMessage = "No defects found",
  permissions = { 
    actionPermissions: { 
      update: true, 
      delete: true, 
      create: true,
      export: true,
      import: true
    } 
  },
  onExport,
  onImport,
  onAddDefect,
  removeFilterBar = false
}) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [defects]);

  const totalPages = useMemo(() => Math.ceil(defects.length / PER_PAGE), [defects]);
  
  const paginatedDefects = useMemo(() => {
    const startIndex = (currentPage - 1) * PER_PAGE;
    const endIndex = startIndex + PER_PAGE;
    return defects.slice(startIndex, endIndex);
  }, [defects, currentPage]);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
    
    // Smooth scroll to top of table
    const tableElement = document.querySelector(`.${styles.responsiveTableContainer}`);
    if (tableElement) {
      tableElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const TruncatedText = ({ text, maxWidth = "max-w-[200px]" }) => (
    !text ? '-' : (
      <div 
        className={`truncate ${maxWidth}`} 
        title={text}
        style={{ cursor: 'help' }}
      >
        {text}
      </div>
    )
  );

  const shouldHideColumn = (fieldId) => {
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const isSmallDesktop = windowWidth >= 1024 && windowWidth < 1280;

    if (isMobile) {
      return ['criticality', 'actionPlanned', 'targetDate', 'dateReported', 'raisedBy'].includes(fieldId);
    }

    if (isTablet) {
      return ['actionPlanned', 'raisedBy'].includes(fieldId);
    }

    if (isSmallDesktop) {
      return ['dateCompleted'].includes(fieldId);
    }

    return false;
  };

  const columns = useMemo(() => (
    Object.entries(DEFECT_FIELDS.TABLE)
      .filter(([_, field]) => !field.isAction)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => ({
        field: field.dbField,
        label: field.label,
        width: field.width,
        minWidth: field.minWidth,
        sortable: true,
        cellClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
        headerClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
        render: (value, rowData) => {
          if (fieldId === 'status') {
            const status = rowData[DEFECT_FIELDS.TABLE.status.dbField] || '-';
            const statusKey = status !== '-' ? 
              Object.keys(STATUS_COLORS).find(key => status.toUpperCase().includes(key)) : null;
            
            if (!statusKey) {
              return (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300">
                  <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                  {status}
                </div>
              );
            }
            
            return (
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[statusKey].bg} ${STATUS_COLORS[statusKey].text}`}>
                <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                {status}
              </div>
            );
          }
          
          if (fieldId === 'criticality') {
            const criticality = value || '-';
            const criticalityKey = criticality !== '-' ? 
              Object.keys(CRITICALITY_COLORS).find(key => 
                criticality.toLowerCase().includes(key.toLowerCase())
              ) : null;
            
            if (!criticalityKey) {
              return (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300">
                  {criticality}
                </span>
              );
            }
            
            return (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${CRITICALITY_COLORS[criticalityKey].bg} ${CRITICALITY_COLORS[criticalityKey].text}`}>
                {criticality}
              </span>
            );
          }
          
          if (field.type === 'date') {
            return formatDate(value);
          }
          
          if (['description', 'actionPlanned', 'equipment'].includes(fieldId)) {
            const calculatedMaxWidth = field.width ? 
              `max-w-[${field.width.replace('px', '')}px]` : "max-w-[200px]";
            return <TruncatedText text={value} maxWidth={calculatedMaxWidth} />;
          }
          
          return value || '-';
        }
      }))
  ), [windowWidth]);

  const actions = useMemo(() => ({
    label: 'Actions',
    width: '80px',
    minWidth: '80px',
    content: (defect) => (
      <div className="flex justify-center gap-2">
        {permissions.actionPermissions.update && (
          <button
            onClick={e => { 
              e.stopPropagation(); 
              onEdit && onEdit(defect); 
            }}
            className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            title="Edit defect"
          >
            <FileText size={16} color="#3BADE5" />
          </button>
        )}
        {permissions.actionPermissions.delete && (
          <button
            onClick={e => { 
              e.stopPropagation(); 
              onDelete && onDelete(defect); 
            }}
            className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/50"
            title="Delete defect"
          >
            <Trash2 size={16} color="#EF4444" />
          </button>
        )}
      </div>
    )
  }), [permissions, onDelete, onEdit]);

  const renderExpandedContent = useCallback((defect) => {
    const expandedFields = Object.entries(DEFECT_FIELDS.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority)
      .filter(([_, field]) => !(field.conditionalDisplay && !field.conditionalDisplay(defect)));

    const FileListPlaceholder = ({ files, title }) => {
      if (!files?.length) return null;
      return (
        <div className="space-y-2">
          {title && <div className="text-xs font-medium text-white/80 mb-1">{title}</div>}
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
              <span className="text-white/90 truncate flex-1">{file.name} (Placeholder)</span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="expanded-content p-4 relative min-h-[180px]">
        <div className="expanded-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          {expandedFields.map(([fieldId, field]) => {
            if (field.dbField === 'initial_files') {
              return (
                <div key={fieldId}>
                  <div className="font-semibold text-white/80 mb-1">{field.label}</div>
                  <FileListPlaceholder files={defect.initial_files || []} />
                </div>
              );
            }
            
            if (field.dbField === 'completion_files') {
              return (
                <div key={fieldId}>
                  <div className="font-semibold text-white/80 mb-1">{field.label}</div>
                  <FileListPlaceholder files={defect.completion_files || []} />
                </div>
              );
            }
            
            if (field.type === 'checkbox') {
              const value = defect[field.dbField];
              return (
                <div key={fieldId}>
                  <div className="font-semibold text-white/80 mb-1">{field.label}</div>
                  <div>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ? 'Yes' : 'No')}</div>
                </div>
              );
            }
            
            if (field.type === 'date') {
              return (
                <div key={fieldId}>
                  <div className="font-semibold text-white/80 mb-1">{field.label}</div>
                  <div>{formatDate(defect[field.dbField]) || '-'}</div>
                </div>
              );
            }
            
            return (
              <div key={fieldId}>
                <div className="font-semibold text-white/80 mb-1">{field.label}</div>
                <div>{defect[field.dbField] || '-'}</div>
              </div>
            );
          })}
        </div>
        
        <div className="absolute right-6 bottom-6 z-10">
          <button
            onClick={e => {
              e.stopPropagation();
              console.log('Generate report for defect (placeholder):', defect.id);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition-all"
          >
            <FileText className="h-5 w-5" />
            Generate Report
          </button>
        </div>
      </div>
    );
  }, []);

  return (
    <div className={styles.defectTableWrapper}>
      {/* Table header with action buttons */}
      <div className={styles.tableHeader}>
        <h2 className={styles.tableTitle}>
          Defects List ({defects.length} {defects.length === 1 ? 'item' : 'items'})
        </h2>
        <div className={styles.tableActions}>
          {permissions.actionPermissions.export && (
            <button
              onClick={onExport}
              className={styles.actionButton}
              title="Export data to Excel"
            >
              <Download size={16} />
              Export Excel
            </button>
          )}
          {permissions.actionPermissions.import && (
            <button
              onClick={onImport}
              className={styles.actionButton}
              title="Import VIR Excel file"
            >
              <Upload size={16} />
              Import VIR Excel
            </button>
          )}
          {permissions.actionPermissions.create && (
            <button
              onClick={onAddDefect}
              className={`${styles.actionButton} ${styles.primary}`}
              title="Add new defect"
            >
              <Plus size={16} />
              Add Defect
            </button>
          )}
        </div>
      </div>

      {/* Main table container - No bottom padding needed for truly floating pagination */}
      <div className={styles.responsiveTableContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading defect data...</p>
          </div>
        ) : paginatedDefects.length === 0 ? (
          <div className={styles.noResults}>
            <p>{emptyMessage}</p>
            {defects.length > 0 && (
              <button 
                className={styles.resetFilters} 
                onClick={() => setCurrentPage(1)}
              >
                Go to First Page
              </button>
            )}
          </div>
        ) : (
          <Table
            data={paginatedDefects}
            columns={columns}
            expandedContent={renderExpandedContent}
            actions={actions}
            uniqueIdField="id"
            defaultSortKey="target_date"
            defaultSortDirection="desc"
            className="defect-table"
            onRowClick={onEdit}
          />
        )}
      </div>

      {/* Truly Floating Pagination - Fixed position, small and compact, centered */}
      {totalPages > 1 && !loading && paginatedDefects.length > 0 && (
        <FloatingPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={defects.length}
          itemsPerPage={PER_PAGE}
          onPageChange={handlePageChange}
          position="bottom-center"
        />
      )}
    </div>
  );
};

export default DefectTable;