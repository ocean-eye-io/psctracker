import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table';
import FloatingPagination from './FloatingPagination';
import { 
  Trash2, FileText, Download, Upload, Plus, Eye, X, RefreshCw, 
  Zap, AlertTriangle, CheckCircle, Clock, AlertCircle, Shield
} from 'lucide-react';
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import fileService from './services/fileService';
import reportService from './services/reportService';
import { useToast } from '../../common/ui/ToastContext';
import { usePermissions } from '../../../context/PermissionContext'; // NEW: Import permissions hook
import styles from './defect.module.css';

const PER_PAGE = 10;

// Enhanced Badge Components - Subtle and Professional
const StatusBadge = ({ status, variant = 'subtle', size = 'medium' }) => {
  if (!status) return <span className={styles.textMuted}>-</span>;
  
  const statusUpper = status.toUpperCase();
  
  const getStatusType = (status) => {
    if (status.includes('OPEN')) return 'open';
    if (status.includes('CLOSED')) return 'closed';
    if (status.includes('PROGRESS') || status.includes('IN PROGRESS')) return 'inProgress';
    return 'unknown';
  };
  
  const statusType = getStatusType(statusUpper);
  
  // Handle different variants
  if (variant === 'pill') {
    const pillClass = `${styles.statusBadgePill} ${styles[statusType] || ''}`;
    return (
      <div className={pillClass}>
        <span>{status}</span>
      </div>
    );
  }
  
  if (variant === 'accent') {
    const accentClass = `${styles.statusBadgeAccent} ${styles[statusType] || ''}`;
    return (
      <div className={accentClass}>
        <span>{status}</span>
      </div>
    );
  }
  
  if (variant === 'minimal') {
    const minimalClass = `${styles.statusBadgeMinimal} ${styles[statusType] || ''}`;
    return (
      <div className={minimalClass}>
        <span>{status}</span>
      </div>
    );
  }
  
  // Default subtle variant - very understated
  const subtleClass = `${styles.statusBadgeSubtle} ${styles[statusType] || ''}`;
  return (
    <div className={subtleClass}>
      <span>{status}</span>
    </div>
  );
};

const CriticalityBadge = ({ criticality, variant = 'subtle', size = 'medium' }) => {
  if (!criticality) return <span className={styles.textMuted}>-</span>;
  
  const getCriticalityType = (crit) => {
    const critLower = crit.toLowerCase();
    if (critLower.includes('high') || critLower.includes('critical')) return 'high';
    if (critLower.includes('medium') || critLower.includes('moderate')) return 'medium';
    if (critLower.includes('low') || critLower.includes('minor')) return 'low';
    return 'unknown';
  };
  
  const criticalityType = getCriticalityType(criticality);
  
  // Handle different variants
  if (variant === 'pill') {
    const pillClass = `${styles.criticalityBadgePill} ${styles[`criticality${criticalityType.charAt(0).toUpperCase() + criticalityType.slice(1)}`] || ''}`;
    return (
      <div className={pillClass}>
        <span>{criticality}</span>
      </div>
    );
  }
  
  if (variant === 'accent') {
    const accentClass = `${styles.criticalityBadgeAccent} ${styles[`criticality${criticalityType.charAt(0).toUpperCase() + criticalityType.slice(1)}`] || ''}`;
    return (
      <div className={accentClass}>
        <span>{criticality}</span>
      </div>
    );
  }
  
  if (variant === 'minimal') {
    const minimalClass = `${styles.criticalityBadgeMinimal} ${styles[`criticality${criticalityType.charAt(0).toUpperCase() + criticalityType.slice(1)}`] || ''}`;
    return (
      <div className={minimalClass}>
        <span>{criticality}</span>
      </div>
    );
  }
  
  // Default subtle variant
  const subtleClass = `${styles.criticalityBadgeSubtle} ${styles[`criticality${criticalityType.charAt(0).toUpperCase() + criticalityType.slice(1)}`] || ''}`;
  return (
    <div className={subtleClass}>
      <span>{criticality}</span>
    </div>
  );
};

// Premium Design Option - For high-end applications
const StatusBadgePremium = ({ status }) => {
  if (!status) return <span className={styles.textMuted}>-</span>;
  
  const statusUpper = status.toUpperCase();
  
  // Inline styles for premium look with glassmorphism
  const getPremiumStyle = (status) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      borderRadius: '10px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      border: '1px solid',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: '85px',
      justifyContent: 'center',
      cursor: 'default'
    };
    
    if (status.includes('OPEN')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
        color: '#dc2626',
        borderColor: 'rgba(239, 68, 68, 0.25)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    if (status.includes('CLOSED')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)',
        color: '#16a34a',
        borderColor: 'rgba(34, 197, 94, 0.25)',
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    if (status.includes('PROGRESS')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
        color: '#d97706',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.12) 0%, rgba(75, 85, 99, 0.08) 100%)',
      color: '#6b7280',
      borderColor: 'rgba(107, 114, 128, 0.25)',
      boxShadow: '0 4px 12px rgba(107, 114, 128, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    };
  };
  
  return (
    <div 
      style={getPremiumStyle(statusUpper)}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = e.target.style.boxShadow.replace('0 4px 12px', '0 6px 16px');
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = e.target.style.boxShadow.replace('0 6px 16px', '0 4px 12px');
      }}
    >
      <span>{status}</span>
    </div>
  );
};

const CriticalityBadgePremium = ({ criticality }) => {
  if (!criticality) return <span className={styles.textMuted}>-</span>;
  
  // Premium glassmorphism design with proper visual hierarchy
  const getPremiumCriticalityStyle = (crit) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '5px 12px',
      borderRadius: '10px',
      fontSize: '0.7rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      border: '1px solid',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: '80px',
      justifyContent: 'center',
      cursor: 'default'
    };
    
    const critLower = crit.toLowerCase();
    
    if (critLower.includes('high')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(220, 38, 38, 0.10) 100%)',
        color: '#dc2626',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    if (critLower.includes('medium')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.10) 100%)',
        color: '#d97706',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    if (critLower.includes('low')) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14) 0%, rgba(37, 99, 235, 0.10) 100%)',
        color: '#2563eb',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    }
    
    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.14) 0%, rgba(75, 85, 99, 0.10) 100%)',
      color: '#6b7280',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      boxShadow: '0 4px 12px rgba(107, 114, 128, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    };
  };
  
  // Add appropriate icon based on criticality
  const getIcon = (crit) => {
    const critLower = crit.toLowerCase();
    if (critLower.includes('high')) return '⚠';
    if (critLower.includes('medium')) return '●';
    if (critLower.includes('low')) return '●';
    return '';
  };
  
  return (
    <div 
      style={getPremiumCriticalityStyle(criticality)}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = e.target.style.boxShadow.replace('0 4px 12px', '0 6px 16px');
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = e.target.style.boxShadow.replace('0 6px 16px', '0 4px 12px');
      }}
    >
      <span>{criticality}</span>
      <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: '2px' }}>
        {getIcon(criticality)}
      </span>
    </div>
  );
};

// Export options - choose your preferred design approach
export { 
  StatusBadge, 
  CriticalityBadge,           // Modern professional (recommended)
  StatusBadgePremium, 
  CriticalityBadgePremium     // Premium glassmorphism (high-end)
};

// Floating Generate Report Button - No Height Impact
const GenerateReportButton = ({ 
  defect, 
  onGenerate, 
  isGenerating, 
  variant = 'floating',
  size = 'medium',
  canGenerateReport = true // NEW: Permission prop
}) => {
  const buttonProps = {
    onClick: (e) => {
      e.stopPropagation();
      if (canGenerateReport) {
        onGenerate(defect);
      }
    },
    disabled: isGenerating || !canGenerateReport,
    title: !canGenerateReport 
      ? "Report generation not permitted" 
      : "Generate comprehensive defect report with all attachments"
  };
  
  const content = (
    <>
      {isGenerating ? (
        <RefreshCw size={16} className={styles.spinning} />
      ) : (
        <FileText size={16} />
      )}
      <span>{isGenerating ? 'Generating...' : 'Generate Report'}</span>
      {!isGenerating && canGenerateReport && (
        <Zap size={12} className={styles.pulseIcon} />
      )}
    </>
  );
  
  // Floating button - positioned outside normal flow, doesn't affect container height
  const buttonStyle = {
    position: 'absolute',
    bottom: '12px',  // Small margin from bottom
    right: '12px',   // Small margin from right
    zIndex: 30,      // High z-index to float above everything
    
    // Styling
    background: canGenerateReport 
      ? 'linear-gradient(135deg, rgba(59, 173, 229, 0.9) 0%, rgba(41, 128, 185, 0.9) 100%)'
      : 'linear-gradient(135deg, rgba(107, 114, 128, 0.6) 0%, rgba(75, 85, 99, 0.6) 100%)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${canGenerateReport ? 'rgba(59, 173, 229, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
    borderRadius: '12px',
    
    // Size
    padding: '10px 16px',
    minWidth: '140px',
    height: '44px',
    
    // Typography
    color: canGenerateReport ? 'white' : 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.8rem',
    fontWeight: '600',
    letterSpacing: '0.3px',
    
    // Layout
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    
    // Interactions
    cursor: (isGenerating || !canGenerateReport) ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Effects
    boxShadow: canGenerateReport 
      ? '0 4px 16px rgba(59, 173, 229, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    opacity: (isGenerating || !canGenerateReport) ? 0.7 : 1,
    
    // Ensure it doesn't affect layout
    pointerEvents: 'auto'
  };
  
  const hoverStyle = canGenerateReport ? {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 24px rgba(59, 173, 229, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)'
  } : {};
  
  return (
    <button 
      {...buttonProps} 
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!isGenerating && canGenerateReport) {
          Object.assign(e.currentTarget.style, { ...buttonStyle, ...hoverStyle });
        }
      }}
      onMouseLeave={(e) => {
        if (!isGenerating && canGenerateReport) {
          Object.assign(e.currentTarget.style, buttonStyle);
        }
      }}
    >
      {content}
    </button>
  );
};

// Report Generation Progress Modal
const ReportProgressModal = ({ isOpen, onClose, progress, message, defectId }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.reportProgressOverlay}>
      <div className={styles.reportProgressModal}>
        <div className={styles.reportProgressHeader}>
          <h3>
            <FileText size={20} />
            Generating Report
          </h3>
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
              <CheckCircle size={16} />
              Close
            </button>
          </div>
        )}
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
  permissions: legacyPermissions = { // Legacy prop for backward compatibility
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
  
  // NEW: Get permissions from context (takes precedence over props)
  const {
    canCreate,
    canUpdate,
    canDelete,
    canExport,
    canImport,
    canGenerateReport,
    isReadOnly,
    roleName,
    getPermissionStatus
  } = usePermissions();

  // Use context permissions or fall back to legacy props
  const effectivePermissions = {
    actionPermissions: {
      create: canCreate() || legacyPermissions.actionPermissions.create,
      update: canUpdate() || legacyPermissions.actionPermissions.update,
      delete: canDelete() || legacyPermissions.actionPermissions.delete,
      export: canExport() || legacyPermissions.actionPermissions.export,
      import: canImport() || legacyPermissions.actionPermissions.import,
      generateReport: canGenerateReport() || true // Default to true for report generation
    }
  };

  console.log("DefectTable: Rendering with permissions:", {
    contextPermissions: {
      canCreate: canCreate(),
      canUpdate: canUpdate(),
      canDelete: canDelete(),
      canExport: canExport(),
      canImport: canImport(),
      canGenerateReport: canGenerateReport(),
      isReadOnly: isReadOnly()
    },
    effectivePermissions,
    roleName
  });

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

  // NEW: Enhanced Report Generation Handler with permission checks
  const handleGenerateReport = async (defect) => {
    console.log('Generate report button clicked for defect:', defect.id);
    
    // NEW: Check permissions first
    if (!effectivePermissions.actionPermissions.generateReport) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to generate reports.",
        variant: "destructive",
      });
      return;
    }
    
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

  const TruncatedText = ({ text }) => (
    !text ? '-' : (
      <div className={styles.truncateText} title={text}>
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

  // Updated DefectTable render function
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
        cellClassName: shouldHideColumn(fieldId) ? styles.hiddenColumn : '',
        headerClassName: shouldHideColumn(fieldId) ? styles.hiddenColumn : '',
        render: (value, rowData) => {
          if (fieldId === 'status') {
            return <StatusBadge status={value} variant="pill" size="medium" />;
          }
        
          if (fieldId === 'criticality') {
            return <CriticalityBadge criticality={value} variant="pill" size="medium" />;
          }
        
          if (field.type === 'date') {
            return (
              <span className={styles.dateValue}>
                {formatDate(value)}
              </span>
            );
          }
        
          if (['description', 'actionPlanned', 'equipment'].includes(fieldId)) {
            return <TruncatedText text={value} />;
          }
        
          return value || <span className={styles.textMuted}>-</span>;
        }
      }))
  ), [windowWidth]);

  // NEW: Enhanced actions configuration with permission-based button states
  const actions = useMemo(() => ({
    label: 'Actions',
    width: '140px',
    minWidth: '140px',
    content: (defect) => {
      const actionsContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '4px'
      };

      return (
        <div style={actionsContainerStyle}>
          {/* Enhanced Generate Report Button */}
          <button
            onClick={e => { 
              e.stopPropagation(); 
              handleGenerateReport(defect); 
            }}
            className={`${styles.enhancedActionButton} ${styles.generate} ${
              generatingReportForDefect === defect.id ? styles.generating : ''
            } ${!effectivePermissions.actionPermissions.generateReport ? styles.disabled : ''}`}
            title={!effectivePermissions.actionPermissions.generateReport 
              ? "Report generation not permitted" 
              : "Generate comprehensive defect report"}
            disabled={generatingReportForDefect === defect.id || !effectivePermissions.actionPermissions.generateReport}
            data-tooltip={!effectivePermissions.actionPermissions.generateReport ? "Insufficient permissions" : undefined}
          >
            {generatingReportForDefect === defect.id ? (
              <RefreshCw size={16} className={styles.spinning} />
            ) : (
              <FileText size={16} />
            )}
          </button>
          
          {/* Enhanced Edit Button */}
          <button
            onClick={e => { 
              e.stopPropagation(); 
              onEdit && onEdit(defect); 
            }}
            className={`${styles.enhancedActionButton} ${styles.edit} ${
              !effectivePermissions.actionPermissions.update ? styles.disabled : ''
            }`}
            title={!effectivePermissions.actionPermissions.update 
              ? "Edit not permitted" 
              : (isReadOnly() ? "View defect details" : "Edit defect details")}
            data-tooltip={!effectivePermissions.actionPermissions.update ? "Insufficient permissions" : undefined}
          >
            <Eye size={16} />
          </button>
          
          {/* Enhanced Delete Button */}
          <button
            onClick={e => { 
              e.stopPropagation(); 
              if (effectivePermissions.actionPermissions.delete) {
                onDelete && onDelete(defect);
              }
            }}
            className={`${styles.enhancedActionButton} ${styles.delete} ${
              !effectivePermissions.actionPermissions.delete ? styles.disabled : ''
            }`}
            title={!effectivePermissions.actionPermissions.delete 
              ? "Delete not permitted" 
              : "Delete defect"}
            disabled={!effectivePermissions.actionPermissions.delete}
            data-tooltip={!effectivePermissions.actionPermissions.delete ? "Insufficient permissions" : undefined}
          >
            <Trash2 size={16} />
          </button>
        </div>
      );
    }
  }), [effectivePermissions, onDelete, onEdit, handleGenerateReport, generatingReportForDefect, isReadOnly]);

  // Enhanced expanded content renderer with improved file display
  const renderExpandedContent = useCallback((defect) => {
    const expandedFields = Object.entries(DEFECT_FIELDS.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority)
      .filter(([_, field]) => !(field.conditionalDisplay && !field.conditionalDisplay(defect)));

    // Enhanced File List Component
    const FileListCompact = ({ files, fileType, defectId }) => {
      if (!files?.length) {
        return (
          <div className={styles.filesListCompact}>
            <div className={styles.fileItemCompact}>
              <FileText className={styles.fileIconCompact} />
              <span className={styles.textMuted}>No files</span>
            </div>
          </div>
        );
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
                title={`Click to preview: ${file.name || file.originalName}`}
              >
                {file.name || file.originalName}
              </button>
              
              <span className={styles.fileSizeCompact}>
                {file.size ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : '--'}
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
        return <StatusBadge status={value} variant="accent" size="small" />;
      }

      if (fieldId === 'criticality') {
        return <CriticalityBadge criticality={value} size="small" />;
      }

      if (field.type === 'date') {
        return (
          <span className={styles.dateValue}>
            {formatDate(value)}
          </span>
        );
      }

      if (field.type === 'checkbox') {
        const boolValue = typeof value === 'boolean' ? value : Boolean(value);
        const checkboxClass = `${styles.statusBadgeCompact} ${boolValue ? styles.statusGreen : styles.statusGrey}`;
        return (
          <div className={checkboxClass}>
            <span className={styles.statusDotCompact}></span>
            {boolValue ? 'Yes' : 'No'}
          </div>
        );
      }

      if (!value) return <span className={styles.textMuted}>-</span>;
      
      const stringValue = String(value);
      
      // Handle long text fields
      if (stringValue.length > 100) {
        return (
          <div className={styles.expandedFieldLarge}>
            <div className={styles.expandedFieldValue} title={stringValue}>
              {stringValue}
            </div>
          </div>
        );
      }
      
      return <span className={styles.expandedFieldValue}>{stringValue}</span>;
    };

    return (
      <div className={styles.expandedContentContainer} style={{ position: 'relative' }}>
        {/* Fields Grid - natural height based on content only */}
        <div className={styles.expandedUniformGrid}>
          {expandedFields.map(([fieldId, field]) => {
            const value = defect[field.dbField];
            
            return (
              <div key={fieldId} className={styles.expandedField}>
                <div className={styles.expandedFieldLabel}>
                  {field.label}
                </div>
                <div>
                  {renderFieldValue(fieldId, field, value)}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Floating button - doesn't affect container height */}
        <GenerateReportButton
          defect={defect}
          onGenerate={handleGenerateReport}
          isGenerating={generatingReportForDefect === defect.id}
          variant="floating"
          size="medium"
          canGenerateReport={effectivePermissions.actionPermissions.generateReport}
        />
      </div>
    );
  }, [handleGenerateReport, generatingReportForDefect, handleFilePreview, effectivePermissions]);

  // Main render function with enhanced styling
  return (
    <div className={styles.defectTableWrapper}>
      {/* Enhanced Table Header */}
      <div className={styles.enhancedTableHeader}>
        <h2 className={styles.enhancedTableTitle}>
          Defects List 
          <span className={styles.tableItemCount}>
            {defects.length} {defects.length === 1 ? 'item' : 'items'}
          </span>
          {/* NEW: Permission status indicator */}
          {/* {roleName && (
            <span className={styles.tablePermissionBadge}>
              <Shield size={12} />
              {roleName}
            </span>
          )}
          {isReadOnly() && (
            <span className={styles.tableReadOnlyBadge}>
              <Eye size={12} />
              Read Only
            </span>
          )} */}
        </h2>
        
        <div className={styles.enhancedTableActions}>
          {/* NEW: Enhanced Export Button with permission checks */}
          <button
            onClick={onExport}
            className={`${styles.enhancedHeaderButton} ${styles.export} ${
              !effectivePermissions.actionPermissions.export ? styles.disabled : ''
            }`}
            title={!effectivePermissions.actionPermissions.export 
              ? "Export not permitted" 
              : "Export data to Excel"}
            disabled={!effectivePermissions.actionPermissions.export}
            data-tooltip={!effectivePermissions.actionPermissions.export ? "Insufficient permissions" : undefined}
          >
            <Download size={16} />
            Export Excel
          </button>
          
          {/* NEW: Enhanced Import Button with permission checks */}
          <button
            onClick={onImport}
            className={`${styles.enhancedHeaderButton} ${styles.import} ${
              !effectivePermissions.actionPermissions.import ? styles.disabled : ''
            }`}
            title={!effectivePermissions.actionPermissions.import 
              ? "Import not permitted" 
              : "Import VIR Excel file"}
            disabled={!effectivePermissions.actionPermissions.import}
            data-tooltip={!effectivePermissions.actionPermissions.import ? "Insufficient permissions" : undefined}
          >
            <Upload size={16} />
            Import VIR Excel
          </button>
          
          {/* NEW: Enhanced Add Defect Button with permission checks */}
          <button
            onClick={onAddDefect}
            className={`${styles.enhancedHeaderButton} ${styles.add} ${
              !effectivePermissions.actionPermissions.create ? styles.disabled : ''
            }`}
            title={!effectivePermissions.actionPermissions.create 
              ? "Create not permitted" 
              : "Add new defect"}
            disabled={!effectivePermissions.actionPermissions.create}
            data-tooltip={!effectivePermissions.actionPermissions.create ? "Insufficient permissions" : undefined}
          >
            <Plus size={16} />
            Add Defect
          </button>
        </div>
      </div>

      {/* Main table container with enhanced styling */}
      <div className={styles.responsiveTableContainer}>
        {loading ? (
          <div className={styles.enhancedLoadingContainer}>
            <div className={styles.enhancedLoadingSpinner}></div>
            <p className={styles.enhancedLoadingText}>Loading defect data...</p>
            <div className={styles.enhancedLoadingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : paginatedDefects.length === 0 ? (
          <div className={styles.enhancedEmptyState}>
            <div className={styles.enhancedEmptyIcon}>
              <FileText size={32} className={styles.textMuted} />
            </div>
            <div className={styles.enhancedEmptyText}>
              <h3>{emptyMessage}</h3>
              {defects.length > 0 && (
                <p>Try adjusting your search or filters</p>
              )}
              {/* NEW: Permission-aware empty state */}
              {defects.length === 0 && !effectivePermissions.actionPermissions.create && (
                <p>Contact your administrator for permission to add defects</p>
              )}
            </div>
            {defects.length > 0 && (
              <button 
                className={styles.enhancedEmptyAction}
                onClick={() => setCurrentPage(1)}
              >
                Go to First Page
              </button>
            )}
            {/* NEW: Add first defect button with permission check */}
            {defects.length === 0 && effectivePermissions.actionPermissions.create && (
              <button 
                className={styles.enhancedEmptyAction}
                onClick={onAddDefect}
              >
                <Plus size={16} />
                Add First Defect
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

      {/* Enhanced Floating Pagination */}
      {totalPages > 1 && !loading && paginatedDefects.length > 0 && (
        <div className={styles.enhancedPaginationContainer}>
          <FloatingPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={defects.length}
            itemsPerPage={PER_PAGE}
            onPageChange={handlePageChange}
            position="bottom-center"
          />
        </div>
      )}

      {/* Enhanced Report Generation Progress Modal */}
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

      {/* NEW: Permission Debug Info (Development Only) */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugPermissionInfo}>
          <details>
            <summary>Debug: Table Permissions</summary>
            <pre>
              {JSON.stringify({
                contextPermissions: {
                  canCreate: canCreate(),
                  canUpdate: canUpdate(),
                  canDelete: canDelete(),
                  canExport: canExport(),
                  canImport: canImport(),
                  canGenerateReport: canGenerateReport(),
                  isReadOnly: isReadOnly()
                },
                effectivePermissions,
                roleName,
                permissionStatus: getPermissionStatus()
              }, null, 2)}
            </pre>
          </details>
        </div>
      )} */}
    </div>
  );
};

export default DefectTable;