// DefectTable.jsx - Phase 4 Enhanced with Comprehensive Report Management

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table';
import FloatingPagination from './FloatingPagination';
import { Trash2, FileText, Download, Upload, Plus, Eye, X, RefreshCw } from 'lucide-react';
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import fileService from './services/fileService';
import reportService from './services/reportService'; // PHASE 4: New report service
import { useToast } from '../../common/ui/ToastContext';
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

// PHASE 4: Report Generation Progress Modal
const ReportProgressModal = ({ isOpen, onClose, progress, message, defectId }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.reportProgressOverlay}>
      <div className={styles.reportProgressModal}>
        <div className={styles.reportProgressHeader}>
          <h3>Generating Report</h3>
          <span className={styles.reportProgressDefectId}>Defect ID: {defectId}</span>
        </div>
        
        <div className={styles.reportProgressContent}>
          <div className={styles.reportProgressBar}>
            <div 
              className={styles.reportProgressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.reportProgressText}>
            {progress}% - {message}
          </div>
        </div>
        
        {progress >= 100 && (
          <div className={styles.reportProgressFooter}>
            <button onClick={onClose} className={styles.reportProgressClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// File Preview Modal Component - UNCHANGED
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
      const downloadData = await fileService.getDownloadUrl(defectId, file.id, currentUser.userId);
      
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
      await fileService.downloadFile(defectId, file.id, file.name, currentUser.userId);
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
            <button onClick={handleDownload} className={styles.filePreviewDownload} title="Download file">
              <Download size={16} />
              Download
            </button>
            <button onClick={onClose} className={styles.filePreviewClose} title="Close preview">
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
            <img src={previewUrl} alt={file.name} className={styles.filePreviewImage} />
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
              <p className={styles.filePreviewDocNote}>{file.name}</p>
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
  const { toast } = useToast();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewDefectId, setPreviewDefectId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // PHASE 4: Report generation states
  const [reportProgress, setReportProgress] = useState(0);
  const [reportMessage, setReportMessage] = useState('');
  const [showReportProgress, setShowReportProgress] = useState(false);
  const [generatingReportForDefect, setGeneratingReportForDefect] = useState(null);

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

  // PHASE 4: Enhanced Report Generation Handler
  const handleGenerateReport = async (defect) => {
    console.log('PHASE 4: Generate report button clicked for defect:', defect.id);
    
    if (!currentUser?.userId) {
      toast({
        title: "Error",
        description: "User information not available. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Show progress modal
    setGeneratingReportForDefect(defect.id);
    setShowReportProgress(true);
    setReportProgress(0);
    setReportMessage('Initializing report generation...');

    try {
      // PHASE 4: Use comprehensive report generation with progress tracking
      const result = await reportService.generateAndDownloadReport(
        defect.id,
        currentUser.userId,
        defect, // Pass defect data for filename generation
        (progress, message) => {
          setReportProgress(progress);
          setReportMessage(message);
        }
      );

      console.log('PHASE 4: Report generation completed:', result);

      // Success feedback
      toast({
        title: "Report Generated Successfully",
        description: result.message || 'Report has been generated and downloaded.',
      });

      // Keep progress modal open briefly to show completion
      setTimeout(() => {
        setShowReportProgress(false);
        setGeneratingReportForDefect(null);
        setReportProgress(0);
        setReportMessage('');
      }, 2000);

    } catch (error) {
      console.error('PHASE 4: Error generating report:', error);
      
      setShowReportProgress(false);
      setGeneratingReportForDefect(null);
      setReportProgress(0);
      setReportMessage('');

      // Enhanced error handling
      let errorMessage = 'Failed to generate report. Please try again.';
      
      if (error.message.includes('not found')) {
        errorMessage = 'Defect not found or you do not have access to it.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Report generation timed out. Please try again.';
      }

      toast({
        title: "Report Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
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
    width: '120px',
    minWidth: '120px',
    content: (defect) => (
      <div className="flex justify-center gap-1">
        {/* PHASE 4: Generate Report Button */}
        <button
          onClick={e => { 
            e.stopPropagation(); 
            handleGenerateReport(defect); 
          }}
          className="p-2 rounded-md bg-green-500/10 hover:bg-green-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-green-400/50"
          title="Generate and download defect report"
          disabled={generatingReportForDefect === defect.id}
        >
          {generatingReportForDefect === defect.id ? (
            <RefreshCw size={16} color="#10B981" className="animate-spin" />
          ) : (
            <FileText size={16} color="#10B981" />
          )}
        </button>
        
        {permissions.actionPermissions.update && (
          <button
            onClick={e => { 
              e.stopPropagation(); 
              onEdit && onEdit(defect); 
            }}
            className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            title="Edit defect"
          >
            <Eye size={16} color="#3BADE5" />
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
  }), [permissions, onDelete, onEdit, handleGenerateReport, generatingReportForDefect]);

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
      if (field.dbField === 'initial_files') {
        return <FileListCompact files={value || []} fileType="initial" defectId={defect.id} />;
      }

      if (field.dbField === 'completion_files') {
        return <FileListCompact files={value || []} fileType="completion" defectId={defect.id} />;
      }

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

      if (field.type === 'date') {
        return formatDate(value);
      }

      if (field.type === 'checkbox') {
        const boolValue = typeof value === 'boolean' ? value : Boolean(value);
        return (
          <div className={`inline-flex items-center gap-1 text-xs ${boolValue ? 'text-green-300' : 'text-gray-400'}`}>
            <span className={`w-1 h-1 rounded-full ${boolValue ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            {boolValue ? 'Yes' : 'No'}
          </div>
        );
      }

      if (!value) return '-';
      
      const stringValue = String(value);
      return stringValue;
    };

    return (
      <div className={styles.expandedContentContainer}>
        <div className={styles.expandedUniformGrid}>
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
          
          {/* PHASE 4: Enhanced Generate Report button in expanded view */}
          <button
            onClick={e => {
              e.stopPropagation();
              handleGenerateReport(defect);
            }}
            className={`${styles.expandedFieldAction} ${
              generatingReportForDefect === defect.id ? styles.expandedFieldActionGenerating : ''
            }`}
            title="Generate comprehensive defect report with all attachments"
            disabled={generatingReportForDefect === defect.id}
          >
            {generatingReportForDefect === defect.id ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText className="h-3 w-3" />
                <span>Generate Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }, [handleGenerateReport, generatingReportForDefect]);

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

      {/* PHASE 4: Report Generation Progress Modal */}
      <ReportProgressModal
        isOpen={showReportProgress}
        onClose={() => {
          setShowReportProgress(false);
          setGeneratingReportForDefect(null);
          setReportProgress(0);
          setReportMessage('');
        }}
        progress={reportProgress}
        message={reportMessage}
        defectId={generatingReportForDefect}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={showPreview}
        onClose={handleClosePreview}
        defectId={previewDefectId}
        currentUser={currentUser}
      />

      {/* PHASE 4: Enhanced CSS styles for report generation */}
      <style jsx>{`
        .reportProgressOverlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .reportProgressModal {
          background: linear-gradient(145deg, #0a1725, #112032);
          border: 1px solid rgba(59, 173, 229, 0.2);
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .reportProgressHeader {
          text-align: center;
          margin-bottom: 20px;
        }

        .reportProgressHeader h3 {
          color: #f4f4f4;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        .reportProgressDefectId {
          color: #3BADE5;
          font-size: 14px;
          font-weight: 500;
        }

        .reportProgressContent {
          margin-bottom: 20px;
        }

        .reportProgressBar {
          width: 100%;
          height: 12px;
          background: rgba(244, 244, 244, 0.1);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .reportProgressFill {
          height: 100%;
          background: linear-gradient(90deg, #3BADE5, #2ECC71);
          transition: width 0.3s ease;
          border-radius: 6px;
          box-shadow: 0 0 8px rgba(59, 173, 229, 0.4);
        }

        .reportProgressText {
          color: #f4f4f4;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
        }

        .reportProgressFooter {
          text-align: center;
        }

        .reportProgressClose {
          background: #3BADE5;
          color: white;
          border: none;
          padding: 8px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reportProgressClose:hover {
          background: #2c7be5;
          transform: translateY(-1px);
        }

        .expandedFieldActionGenerating {
          background: rgba(59, 173, 229, 0.2) !important;
          border-color: rgba(59, 173, 229, 0.4) !important;
          color: #3BADE5 !important;
          cursor: not-allowed !important;
        }

        /* Enhanced action button spacing */
        .defectTableWrapper .flex.justify-center.gap-1 {
          gap: 4px;
        }

        /* Responsive adjustments for mobile */
        @media (max-width: 768px) {
          .reportProgressModal {
            margin: 16px;
            padding: 20px;
          }

          .defectTableWrapper .flex.justify-center.gap-1 {
            flex-direction: column;
            gap: 2px;
          }

          .defectTableWrapper .flex.justify-center.gap-1 button {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default DefectTable;