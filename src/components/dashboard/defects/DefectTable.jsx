// DefectTable.jsx - Updated with file display and preview functionality

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table';
import FloatingPagination from './FloatingPagination';
import { Trash2, FileText, Download, Upload, Plus, Eye, X } from 'lucide-react';
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import fileService from './services/fileService'; // Fixed import path
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

// File Preview Modal Component
const FilePreviewModal = ({ file, isOpen, onClose, onDownload, defectId, currentUser }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && file) {
      loadFilePreview();
    }
    
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, file]);

  const loadFilePreview = async () => {
    if (!file || !currentUser?.id || !defectId) return;

    setLoading(true);
    setError(null);

    try {
      const downloadData = await fileService.getDownloadUrl(defectId, file.id, currentUser.id);
      
      // For images, load the actual content for preview
      if (file.type && file.type.startsWith('image/')) {
        const response = await fetch(downloadData.downloadUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error('Error loading file preview:', err);
      setError('Failed to load file preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await fileService.downloadFile(defectId, file.id, file.name, currentUser.id);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  if (!isOpen) return null;

  const isImage = file?.type?.startsWith('image/');
  const isPDF = file?.type === 'application/pdf';

  return (
    <div className={styles.filePreviewOverlay} onClick={onClose}>
      <div className={styles.filePreviewModal} onClick={e => e.stopPropagation()}>
        <div className={styles.filePreviewHeader}>
          <h3 className={styles.filePreviewTitle}>{file?.name}</h3>
          <div className={styles.filePreviewActions}>
            <button
              onClick={handleDownload}
              className={styles.filePreviewDownload}
              title="Download file"
            >
              <Download size={16} />
              Download
            </button>
            <button
              onClick={onClose}
              className={styles.filePreviewClose}
              title="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className={styles.filePreviewContent}>
          {loading && (
            <div className={styles.filePreviewLoading}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading preview...</span>
            </div>
          )}
          
          {error && (
            <div className={styles.filePreviewError}>
              <FileText size={48} />
              <p>{error}</p>
              <button onClick={handleDownload} className={styles.downloadButton}>
                Download File
              </button>
            </div>
          )}
          
          {!loading && !error && isImage && previewUrl && (
            <img
              src={previewUrl}
              alt={file.name}
              className={styles.filePreviewImage}
            />
          )}
          
          {!loading && !error && isPDF && (
            <div className={styles.filePreviewPdf}>
              <FileText size={48} />
              <p>PDF Preview</p>
              <p className={styles.filePreviewPdfNote}>
                Click download to view the full PDF document
              </p>
              <button onClick={handleDownload} className={styles.downloadButton}>
                Download PDF
              </button>
            </div>
          )}
          
          {!loading && !error && !isImage && !isPDF && (
            <div className={styles.filePreviewDocument}>
              <FileText size={48} />
              <p>Document Preview</p>
              <p className={styles.filePreviewDocNote}>
                {file.name}
              </p>
              <button onClick={handleDownload} className={styles.downloadButton}>
                Download Document
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.filePreviewFooter}>
          <div className={styles.filePreviewInfo}>
            <span>Size: {((file?.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
            <span>Type: {file?.type || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [previewFile, setPreviewFile] = useState(null);
  const [previewDefectId, setPreviewDefectId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleFilePreview = (file, defectId) => {
    setPreviewFile(file);
    setPreviewDefectId(defectId);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
    setPreviewDefectId(null);
  };

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

    const FileListCompact = ({ files, fileType, defectId }) => {
      if (!files?.length) {
        return <span className="text-gray-400 text-xs italic">No files</span>;
      }
      
      return (
        <div className={styles.filesListCompact}>
          {files.map((file, index) => (
            <div key={file.id || index} className={styles.fileItemCompact}>
              <FileText className={styles.fileIconCompact} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFilePreview(file, defectId);
                }}
                className={styles.fileNameButton}
                title="Click to preview file"
              >
                {file.name || file.originalName}
              </button>
              <span className={styles.fileSizeCompact}>
                ({((file.size || 0) / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          ))}
        </div>
      );
    };

    const renderFieldValue = (fieldId, field, value) => {
      // Handle file fields - Updated to show files with preview functionality
      if (field.dbField === 'initial_files') {
        return <FileListCompact files={value || []} fileType="initial" defectId={defect.id} />;
      }

      if (field.dbField === 'completion_files') {
        return <FileListCompact files={value || []} fileType="completion" defectId={defect.id} />;
      }

      // Handle status with compact styling
      if (fieldId === 'status') {
        const status = value || 'Unknown';
        const statusClass = `${styles.statusBadgeCompact} ${
          status.toUpperCase().includes('OPEN') ? 'bg-red-500/20 text-red-300' :
          status.toUpperCase().includes('CLOSED') ? 'bg-green-500/20 text-green-300' :
          status.toUpperCase().includes('PROGRESS') ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-gray-500/20 text-gray-300'
        }`;
        
        return (
          <div className={statusClass}>
            <span className={styles.statusDotCompact}></span>
            {status}
          </div>
        );
      }

      // Handle criticality with compact styling
      if (fieldId === 'criticality') {
        const criticality = value || 'Unknown';
        const priorityClass = `${styles.statusBadgeCompact} ${
          criticality.toLowerCase().includes('high') ? 'bg-red-500/20 text-red-300' :
          criticality.toLowerCase().includes('medium') ? 'bg-yellow-500/20 text-yellow-300' :
          criticality.toLowerCase().includes('low') ? 'bg-blue-500/20 text-blue-300' :
          'bg-gray-500/20 text-gray-300'
        }`;
        
        return (
          <span className={priorityClass}>
            {criticality}
          </span>
        );
      }

      // Handle dates
      if (field.type === 'date') {
        return formatDate(value);
      }

      // Handle checkboxes
      if (field.type === 'checkbox') {
        const boolValue = typeof value === 'boolean' ? value : Boolean(value);
        return (
          <div className={`inline-flex items-center gap-1 text-xs ${boolValue ? 'text-green-300' : 'text-gray-400'}`}>
            <span className={`w-1 h-1 rounded-full ${boolValue ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            {boolValue ? 'Yes' : 'No'}
          </div>
        );
      }

      // Handle all other fields with consistent truncation
      if (!value) return '-';
      
      const stringValue = String(value);
      return stringValue;
    };

    return (
      <div className={styles.expandedContentContainer}>
        <div className={styles.expandedUniformGrid}>
          {/* Render all fields in uniform grid */}
          {expandedFields.map(([fieldId, field]) => {
            const value = defect[field.dbField];
            
            return (
              <div key={fieldId} className={styles.expandedField}>
                <div className={styles.expandedFieldLabel}>
                  {field.label}
                </div>
                <div className={styles.expandedFieldValue}>
                  {renderFieldValue(fieldId, field, value)}
                </div>
              </div>
            );
          })}
          
          {/* Generate Report button as a single cell */}
          <button
            onClick={e => {
              e.stopPropagation();
              console.log('Generate report for defect:', defect.id);
            }}
            className={styles.expandedFieldAction}
            title="Generate detailed report for this defect"
          >
            <FileText className="h-3 w-3" />
            <span>Generate Report</span>
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

      {/* Main table container */}
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

      {/* Floating Pagination */}
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

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={showPreview}
        onClose={handleClosePreview}
        defectId={previewDefectId}
        currentUser={currentUser}
      />
    </div>
  );
};

export default DefectTable;