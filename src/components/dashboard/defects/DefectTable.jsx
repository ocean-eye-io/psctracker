// Enhanced DefectTable.jsx with improved button and status styling
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table';
import FloatingPagination from './FloatingPagination';
import { Trash2, FileText, Download, Upload, Plus, Eye, X, RefreshCw, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import fileService from './services/fileService';
import reportService from './services/reportService';
import { useToast } from '../../common/ui/ToastContext';
import styles from './defect.module.css';

// Enhanced Status Colors with gradients and effects
const STATUS_COLORS = {
  'OPEN': { 
    bg: 'statusBadgeModern statusOpen', 
    text: 'text-white',
    icon: <AlertTriangle size={12} />,
    class: 'open'
  },
  'CLOSED': { 
    bg: 'statusBadgeModern statusClosed', 
    text: 'text-white',
    icon: <CheckCircle size={12} />,
    class: 'closed'
  },
  'IN PROGRESS': { 
    bg: 'statusBadgeModern statusInProgress', 
    text: 'text-gray-900',
    icon: <Clock size={12} />,
    class: 'inProgress'
  }
};

// Enhanced Criticality Colors
const CRITICALITY_COLORS = {
  'High': { 
    bg: 'criticalityBadgeModern criticalityHigh', 
    text: 'text-white',
    class: 'high'
  },
  'Medium': { 
    bg: 'criticalityBadgeModern criticalityMedium', 
    text: 'text-white',
    class: 'medium'
  },
  'Low': { 
    bg: 'criticalityBadgeModern criticalityLow', 
    text: 'text-white',
    class: 'low'
  }
};

const PER_PAGE = 10;

// Report Generation Progress Modal (unchanged)
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

// Enhanced Status Badge Component
const StatusBadge = ({ status, variant = 'modern' }) => {
  if (!status) return <span className="text-gray-400">-</span>;
  
  const statusKey = Object.keys(STATUS_COLORS).find(key => 
    status.toUpperCase().includes(key)
  );
  
  if (!statusKey) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-300">
        {status}
      </span>
    );
  }
  
  const statusConfig = STATUS_COLORS[statusKey];
  
  if (variant === 'minimal') {
    return (
      <div className={`statusMinimal ${statusConfig.class}`}>
        {statusConfig.icon}
        {status}
      </div>
    );
  }
  
  if (variant === 'dot') {
    return (
      <div className={`statusDot ${statusConfig.class}`}>
        {status}
      </div>
    );
  }
  
  // Default modern variant
  return (
    <div className={statusConfig.bg}>
      {statusConfig.icon}
      {status}
    </div>
  );
};

// Enhanced Criticality Badge Component
const CriticalityBadge = ({ criticality }) => {
  if (!criticality) return <span className="text-gray-400">-</span>;
  
  const criticalityKey = Object.keys(CRITICALITY_COLORS).find(key => 
    criticality.toLowerCase().includes(key.toLowerCase())
  );
  
  if (!criticalityKey) {
    return (
      <span className="inline-block px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-300">
        {criticality}
      </span>
    );
  }
  
  const criticalityConfig = CRITICALITY_COLORS[criticalityKey];
  
  return (
    <div className={criticalityConfig.bg}>
      {criticality}
    </div>
  );
};

// Enhanced Generate Report Button Component
const GenerateReportButton = ({ 
  defect, 
  onGenerate, 
  isGenerating, 
  variant = 'floating' // 'floating', 'pill', 'corner'
}) => {
  const buttonProps = {
    onClick: (e) => {
      e.stopPropagation();
      onGenerate(defect);
    },
    disabled: isGenerating,
    title: "Generate comprehensive defect report with all attachments"
  };
  
  const content = (
    <>
      {isGenerating ? (
        <RefreshCw size={14} className="animate-spin" />
      ) : (
        <FileText size={14} />
      )}
      <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
    </>
  );
  
  switch (variant) {
    case 'pill':
      return (
        <button 
          {...buttonProps}
          className={`expandedFieldActionPill ${isGenerating ? 'opacity-70' : ''}`}
        >
          {content}
        </button>
      );
    
    case 'corner':
      return (
        <button 
          {...buttonProps}
          className={`expandedFieldActionCorner ${isGenerating ? 'opacity-70' : ''}`}
        >
          {content}
        </button>
      );
    
    default: // floating
      return (
        <button 
          {...buttonProps}
          className={`expandedFieldAction ${isGenerating ? 'opacity-70' : ''}`}
        >
          {content}
        </button>
      );
  }
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
  
  // Report generation states
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

  // Enhanced Report Generation Handler
  const handleGenerateReport = async (defect) => {
    console.log('Generate report button clicked for defect:', defect.id);
    
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
      const result = await reportService.generateAndDownloadReport(
        defect.id,
        currentUser.userId,
        defect,
        (progress, message) => {
          setReportProgress(progress);
          setReportMessage(message);
        }
      );

      console.log('Report generation completed:', result);

      toast({
        title: "Report Generated Successfully",
        description: result.message || 'Report has been generated and downloaded.',
      });

      setTimeout(() => {
        setShowReportProgress(false);
        setGeneratingReportForDefect(null);
        setReportProgress(0);
        setReportMessage('');
      }, 2000);

    } catch (error) {
      console.error('Error generating report:', error);
      
      setShowReportProgress(false);
      setGeneratingReportForDefect(null);
      setReportProgress(0);
      setReportMessage('');

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
            return <StatusBadge status={value} variant="modern" />;
          }
          
          if (fieldId === 'criticality') {
            return <CriticalityBadge criticality={value} />;
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
        {/* Generate Report Button */}
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
        return <StatusBadge status={value} variant="modern" />;
      }

      if (fieldId === 'criticality') {
        return <CriticalityBadge criticality={value} />;
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
        </div>
        
        {/* Enhanced Generate Report Button in expanded view */}
        <GenerateReportButton
          defect={defect}
          onGenerate={handleGenerateReport}
          isGenerating={generatingReportForDefect === defect.id}
          variant="floating" // Try 'pill' or 'corner' for different styles
        />
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

      {/* Report Generation Progress Modal */}
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

      {/* File Preview Modal - Add this if you have the FilePreviewModal component */}
      {/* <FilePreviewModal
        file={previewFile}
        isOpen={showPreview}
        onClose={handleClosePreview}
        defectId={previewDefectId}
        currentUser={currentUser}
      /> */}
    </div>
  );
};

export default DefectTable;