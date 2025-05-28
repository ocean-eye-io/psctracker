import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Table from '../../common/Table/Table'; // Assuming this path is correct
import { Trash2, FileText, Download, Upload, Plus } from 'lucide-react'; // Removed Filter, MoreHorizontal
import { DEFECT_FIELDS } from './config/DefectFieldMappings';
import '../DashboardStyles.css';

// --- Constants for styling ---
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

const PER_PAGE = 50;

const DefectTable = ({
  defects = [], // Already filtered by the dashboard
  onView, // This prop might become redundant if viewing is only via edit dialog
  onEdit, // <-- This is the key prop for editing
  onDelete,
  onOpenInstructions, // Not used in this context, can be removed if not needed
  currentUser, // Not directly used in table rendering, but good to keep for permissions
  loading = false,
  emptyMessage = "No defects found",
  permissions = { actionPermissions: { update: true, delete: true, create: true } }, // Added create
  onExport,
  onImport,
  onAddDefect, // <-- This is the key prop for adding
  removeFilterBar = false // New prop to control filter bar visibility
}) => {
  // const [selectedFile, setSelectedFile] = useState(null); // REMOVED: FileViewer is gone
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset pagination when defects change
  useEffect(() => {
    setPage(0);
  }, [defects]);

  // Pagination
  const pageCount = Math.ceil(defects.length / PER_PAGE);
  const pageData = useMemo(
    () => defects.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [defects, page]
  );

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const TruncatedText = ({ text, maxWidth = "max-w-[200px]" }) => (
    !text ? '-' : <div className={`truncate ${maxWidth}`} title={text}>{text}</div>
  );

  const shouldHideColumn = (fieldId) => {
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    if (isMobile) return ['criticality', 'actionPlanned', 'targetDate'].includes(fieldId);
    if (isTablet) return ['actionPlanned'].includes(fieldId);
    return false;
  };

  // Table columns
  const columns = useMemo(() => (
    Object.entries(DEFECT_FIELDS.TABLE)
      .filter(([_, field]) => !field.isAction) // Filter out action columns for the main data rendering
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
            const statusKey = status !== '-' ? Object.keys(STATUS_COLORS).find(key => status.toUpperCase().includes(key)) : null;
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
            const criticalityKey = criticality !== '-' ? Object.keys(CRITICALITY_COLORS).find(key => criticality.toLowerCase().includes(key.toLowerCase())) : null;
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
          if (field.type === 'date') return formatDate(value);
          if (['description', 'actionPlanned', 'equipment'].includes(fieldId)) {
            // Use the field's defined width for maxWidth if available, otherwise default
            const calculatedMaxWidth = field.width ? `max-w-[${field.width.replace('px', '')}px]` : "max-w-[200px]";
            return <TruncatedText text={value} maxWidth={calculatedMaxWidth} />;
          }
          return value || '-';
        }
      }))
  ), [windowWidth]);

  // Actions column
  const actions = useMemo(() => ({
    label: '',
    width: '80px', // Adjusted width to accommodate both buttons
    minWidth: '80px',
    content: (defect) => (
      <div className="flex justify-center gap-2"> {/* Added gap for spacing */}
        {permissions.actionPermissions.update && ( // Check for update permission
          <button
            onClick={e => { e.stopPropagation(); onEdit && onEdit(defect); }} // Call onEdit
            className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            title="Edit"
          >
            <FileText size={16} color="#3BADE5" /> {/* Changed icon to FileText for edit */}
          </button>
        )}
        {permissions.actionPermissions.delete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete && onDelete(defect); }}
            className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-red-400/50"
            title="Delete"
          >
            <Trash2 size={16} color="#EF4444" />
          </button>
        )}
      </div>
    )
  }), [permissions, onDelete, onEdit]); // Added onEdit to dependencies

  // File viewer modal (REMOVED from here, will be handled by DefectDialog or separate component)
  // const FileViewer = ...
  // const FileList = ...

  // Expanded content using ExpandedItem and custom button
  const renderExpandedContent = useCallback((defect) => {
    const expandedFields = Object.entries(DEFECT_FIELDS.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority)
      .filter(([_, field]) => !(field.conditionalDisplay && !field.conditionalDisplay(defect)));

    // Placeholder for FileList component
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
        {/* Button at bottom right */}
        <div className="absolute right-6 bottom-6 z-10">
          <button
            onClick={e => {
              e.stopPropagation();
              // Add your report generation logic here (placeholder)
              console.log('Generate report for defect (placeholder):', defect.id);
              // You might want to call a prop like onGenerateReport(defect) here
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg transition-all"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate Report (Placeholder)
          </button>
        </div>
      </div>
    );
  }, []); // Added useCallback for renderExpandedContent

  // Pagination controls
  const PageButtons = ({ page, setPage, pageCount }) => (
    <div className="flex justify-end items-center gap-2 mt-2 px-4">
      <button
        onClick={() => setPage(p => Math.max(0, p - 1))}
        disabled={page === 0}
        className="px-2 py-1 rounded bg-gray-700 text-white/80 disabled:opacity-50"
      >Prev</button>
      <span className="text-white/70 text-sm">{page + 1} / {pageCount || 1}</span>
      <button
        onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
        disabled={page >= pageCount - 1}
        className="px-2 py-1 rounded bg-gray-700 text-white/80 disabled:opacity-50"
      >Next</button>
    </div>
  );

  return (
    <div className="defect-table-wrapper">
      {/* Row for action buttons at the top (visible if filter bar is not removed) */}
      {!removeFilterBar && (
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={onExport}
            className="flex items-center gap-1 px-3 py-2 rounded bg-[#0c1c2f] border border-gray-700 text-white hover:bg-[#162d48] text-sm"
          >
            <Download size={16} className="mr-1" />
            Export Excel
          </button>

          <button
            onClick={onImport}
            className="flex items-center gap-1 px-3 py-2 rounded bg-[#0c1c2f] border border-gray-700 text-white hover:bg-[#162d48] text-sm"
          >
            <Upload size={16} className="mr-1" />
            Import VIR Excel
          </button>

          <button
            onClick={onAddDefect}
            className="flex items-center gap-1 px-3 py-2 rounded bg-[#3BADE5] text-white hover:bg-[#2496c7] font-medium text-sm"
          >
            <Plus size={16} className="mr-1" />
            Add Defect
          </button>
        </div>
      )}

      {/* Row for Defects List title with buttons on the right */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: '500',
          color: 'white'
        }}>Defects List</h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="action-button" onClick={onExport}>
            <Download size={16} />
            Export Excel
          </button>
          <button className="action-button" onClick={onImport}>
            <Upload size={16} />
            Import VIR Excel
          </button>
          <button className="action-button" onClick={onAddDefect}>
            <Plus size={16} />
            Add Defect
          </button>
        </div>
      </div>

      {/* Table container */}
      <div className="responsive-table-container" style={{ height: "calc(100vh - 180px)" }}>
        <Table
          data={pageData}
          columns={columns}
          expandedContent={renderExpandedContent}
          actions={actions} // Pass the actions object
          uniqueIdField="id"
          defaultSortKey="target_date"
          defaultSortDirection="desc"
          className="defect-table"
          onRowClick={onEdit} // <-- NEW: Call onEdit when a row is clicked
        />
      </div>

      {pageCount > 1 && <PageButtons page={page} setPage={setPage} pageCount={pageCount} />}

      {/* selectedFile state and FileViewer component are removed from here */}
    </div>
  );
};

export default DefectTable;