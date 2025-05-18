// src/components/dashboard/defects/DefectTable.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Table from '../../common/Table/Table';
import { Eye, Edit, Trash2, MessageSquare, FileText } from 'lucide-react';
import { TableBadge, StatusIndicator, ExpandedItem, ActionButton } from '../../common/Table';
import { DEFECT_FIELDS, FIELD_SECTIONS } from './config/DefectFieldMappings';

// Status color mapping to match reference implementation
const STATUS_COLORS = {
  'OPEN': {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    color: '#E74C3C'
  },
  'CLOSED': {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    color: '#2ECC71'
  },
  'IN PROGRESS': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    color: '#F1C40F'
  }
};

// Criticality color mapping to match reference implementation
const CRITICALITY_COLORS = {
  'High': {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    color: '#E74C3C'
  },
  'Medium': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    color: '#F1C40F'
  },
  'Low': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-300',
    color: '#3498DB'
  }
};

/**
 * Enhanced DefectTable Component with all reference functionality
 */
const DefectTable = ({
  defects = [],
  onView,
  onEdit,
  onDelete,
  onOpenInstructions,
  currentUser,
  loading = false,
  emptyMessage = "No defects found",
  permissions = { actionPermissions: { update: true, delete: true } }
}) => {
  const [selectedFile, setSelectedFile] = useState(null);

  // Get status color based on status value
  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';
    
    const statusKey = Object.keys(STATUS_COLORS).find(key => 
      status.toUpperCase().includes(key)
    );
    
    return statusKey ? STATUS_COLORS[statusKey].color : '#f4f4f4';
  };

  // Get criticality badge class
  const getCriticalityBadgeClass = (criticality) => {
    if (!criticality) return 'info';
    
    const criticalityKey = Object.keys(CRITICALITY_COLORS).find(key => 
      criticality.toLowerCase().includes(key.toLowerCase())
    );
    
    return criticalityKey ? 
      (criticalityKey === 'High' ? 'danger' : 
       criticalityKey === 'Medium' ? 'warning' : 'success') : 'info';
  };

  // Format a date string
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
    } catch (e) {
      return dateString;
    }
  };

  // Truncate text with tooltip
  const TruncatedText = ({ text, maxWidth = "max-w-[200px]" }) => {
    if (!text) return '-';
    
    return (
      <div className={`truncate ${maxWidth}`} title={text}>
        {text}
      </div>
    );
  };

  // Convert field mappings to table columns
  const columns = useMemo(() => {
    return Object.entries(DEFECT_FIELDS.TABLE)
      .filter(([_, field]) => !field.isAction)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => ({
        field: field.dbField,
        label: field.label,
        width: field.width,
        minWidth: field.minWidth,
        sortable: true,
        render: (value, rowData) => {
          // For debugging
          console.log(`Rendering ${fieldId} with value:`, value);
          
          // Status column
          if (fieldId === 'status') {
            // Access the status using the correct field from the database
            const statusField = DEFECT_FIELDS.TABLE.status.dbField;
            const status = rowData[statusField] || '-';
            console.log('Status value from DB:', status, 'using field:', statusField);
            
            // Find matching status key only if we have a valid value
            const statusKey = status !== '-' ? 
              Object.keys(STATUS_COLORS).find(key => status.toUpperCase().includes(key)) : null;
            
            // If we didn't find a matching status, use a neutral style
            if (!statusKey) {
              return (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300">
                  <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                  {status}
                </div>
              );
            }
            
            return (
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs
                ${STATUS_COLORS[statusKey].bg} 
                ${STATUS_COLORS[statusKey].text}`}
              >
                <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                {status}
              </div>
            );
          }
          
          // Criticality column
          if (fieldId === 'criticality') {
            // Only use default if value is actually null/undefined/empty
            const criticality = value || '-';
            // Find matching criticality key only if we have a valid value
            const criticalityKey = criticality !== '-' ? 
              Object.keys(CRITICALITY_COLORS).find(key => criticality.toLowerCase().includes(key.toLowerCase())) : null;
            
            // If we didn't find a matching criticality, use a neutral style
            if (!criticalityKey) {
              return (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-300">
                  {criticality}
                </span>
              );
            }
            
            return (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs
                ${CRITICALITY_COLORS[criticalityKey].bg} 
                ${CRITICALITY_COLORS[criticalityKey].text}`}
              >
                {criticality}
              </span>
            );
          }
          
          // Date fields
          if (field.type === 'date') {
            return formatDate(value);
          }
          
          // Description, Action Planned, and other text fields that need truncation
          if (fieldId === 'description' || fieldId === 'actionPlanned' || fieldId === 'equipment') {
            return <TruncatedText text={value} maxWidth={`max-w-[${field.width.replace('px', '')}px]`} />;
          }
          
          // Index/ID column - shows shortened version of UUID
          if (fieldId === 'index') {
            return value ? value.substring(0, 6) + '...' : '-';
          }
          
          // Default rendering
          return value || '-';
        }
      }));
  }, []);

  // File viewer component (simplified version of reference)
  const FileViewer = ({ url, filename, onClose }) => {
    if (!url) return null;
    
    const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i);
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0B1623] border border-white/10 rounded-lg overflow-hidden max-w-4xl max-h-[90vh] w-full flex flex-col">
          <div className="p-3 border-b border-white/10 flex justify-between items-center">
            <div className="text-sm font-medium text-white truncate">{filename}</div>
            <button 
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {isImage ? (
              <img 
                src={url} 
                alt={filename} 
                className="max-w-full max-h-[70vh] object-contain" 
              />
            ) : (
              <iframe 
                src={url} 
                className="w-full h-full" 
                title={filename} 
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // File list component
  const FileList = ({ files, title }) => {
    if (!files?.length) return null;
    
    return (
      <div className="space-y-2">
        {title && <div className="text-xs font-medium text-white/80 mb-1">{title}</div>}
        {files.map((file, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5 text-[#3BADE5]" />
            <button
              onClick={() => handleFileClick(file)}
              className="text-white/90 hover:text-white truncate flex-1"
            >
              {file.name}
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Handle file click (placeholder implementation)
  const handleFileClick = (file) => {
    setSelectedFile({
      url: file.url || '#',
      name: file.name
    });
  };

  // Create expanded content renderer using field mappings
  // This approach matches the VesselTable implementation pattern
  const renderExpandedContent = (defect) => {
    // Create organized sections based on field mappings
    const sections = {};
    
    // Get all section definitions from FIELD_SECTIONS and sort by order
    const sectionDefinitions = Object.entries(FIELD_SECTIONS)
      .sort((a, b) => a[1].order - b[1].order)
      .filter(([_, sectionConfig]) => {
        // Skip sections with conditionalDisplay if the condition isn't met
        if (sectionConfig.conditionalDisplay && !sectionConfig.conditionalDisplay(defect)) {
          return false;
        }
        return true;
      })
      .map(([sectionId, config]) => ({
        id: sectionId,
        label: config.label,
        order: config.order,
        fields: []
      }));
    
    // Initialize sections object with empty arrays for each valid section
    sectionDefinitions.forEach(section => {
      sections[section.id] = {
        ...section,
        fields: []
      };
    });
    
    // Add 'other' section for fields without a defined section
    sections.other = {
      id: 'other',
      label: 'Additional Information',
      order: 999,
      fields: []
    };
    
    // Add expanded fields to their respective sections
    Object.entries(DEFECT_FIELDS.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority)
      .forEach(([fieldId, field]) => {
        // Skip fields with conditionalDisplay if the condition isn't met
        if (field.conditionalDisplay && !field.conditionalDisplay(defect)) {
          return;
        }
        
        const sectionId = field.section || 'other';
        if (!sections[sectionId]) {
          sections[sectionId] = {
            id: sectionId,
            label: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
            order: 900,
            fields: []
          };
        }
        
        sections[sectionId].fields.push({
          id: fieldId,
          ...field
        });
      });
    
    // Filter out empty sections
    const nonEmptySections = Object.values(sections).filter(section => section.fields.length > 0);
    
    // Sort sections by order
    nonEmptySections.sort((a, b) => a.order - b.order);
    
    return (
      <div className="expanded-content p-6">
        {nonEmptySections.map(section => (
          <div key={section.id} className="mb-6">
            <h4 className="text-base font-semibold text-white/90 mb-3 border-b border-white/10 pb-2">
              {section.label}
            </h4>
            
            <div className="expanded-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map(field => {
                // Special handling for file fields
                if (field.dbField === 'initial_files') {
                  return (
                    <div key={field.id} className="expanded-item">
                      <p className="expanded-label">{field.label}</p>
                      <FileList 
                        files={defect.initial_files || []}
                        title={null}
                      />
                    </div>
                  );
                } else if (field.dbField === 'completion_files') {
                  return (
                    <div key={field.id} className="expanded-item">
                      <p className="expanded-label">{field.label}</p>
                      <FileList 
                        files={defect.completion_files || []}
                        title={null}
                      />
                    </div>
                  );
                } else if (field.type === 'checkbox') {
                  // Handle checkbox/boolean fields
                  const value = defect[field.dbField];
                  const displayValue = typeof value === 'boolean' 
                    ? (value ? 'Yes' : 'No')
                    : (value ? 'Yes' : 'No');
                  
                  return (
                    <ExpandedItem
                      key={field.id}
                      label={field.label}
                      value={displayValue}
                    />
                  );
                } else if (field.type === 'date') {
                  // Format date values
                  return (
                    <ExpandedItem
                      key={field.id}
                      label={field.label}
                      value={formatDate(defect[field.dbField])}
                    />
                  );
                } else {
                  // Standard field display
                  return (
                    <ExpandedItem
                      key={field.id}
                      label={field.label}
                      value={defect[field.dbField] || '-'}
                    />
                  );
                }
              })}
            </div>
          </div>
        ))}
        
        {/* Actions Section with Report Generation */}
        <div className="border-t border-white/10 pt-6 flex justify-start">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Generate report for defect:', defect.id);
            }}
            className="inline-flex items-center text-sm py-2 px-4 bg-[#1E293B] hover:bg-[#283548] text-white/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#3BADE5]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>
    );
  };

  // Define actions based on field mappings
  const actions = useMemo(() => ({
    label: DEFECT_FIELDS.TABLE.actions?.label || 'Actions',
    width: DEFECT_FIELDS.TABLE.actions?.width || '160px',
    content: (defect) => (
      <div style={{ display: 'flex', gap: '8px' }}>
        <ActionButton
          onClick={() => onView && onView(defect)}
          icon={<Eye size={16} />}
        >
          View
        </ActionButton>
        
        {permissions.actionPermissions.update && (
          <ActionButton
            onClick={() => onEdit && onEdit(defect)}
            icon={<Edit size={16} />}
          >
            Edit
          </ActionButton>
        )}
        
        {permissions.actionPermissions.delete && (
          <ActionButton
            onClick={() => onDelete && onDelete(defect)}
            icon={<Trash2 size={16} />}
            className="text-red-400"
          >
            Delete
          </ActionButton>
        )}
      </div>
    )
  }), [permissions, onView, onEdit, onDelete]);

  useEffect(() => {
    // Deep inspect the data structure when defects change
    if (defects.length > 0) {
      console.log('Full data structure of first defect:', JSON.stringify(defects[0], null, 2));
      console.log('All keys in first defect (with exact capitalization):', Object.keys(defects[0]));
      
      // Check all top-level properties and their values
      console.log('All properties and their values:');
      Object.entries(defects[0]).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      
      // Check if any field might contain status information
      const possibleStatusFields = Object.entries(defects[0])
        .filter(([_, value]) => 
          typeof value === 'string' && 
          (value.toUpperCase().includes('OPEN') || 
           value.toUpperCase().includes('CLOSED') || 
           value.toUpperCase().includes('PROGRESS'))
        )
        .map(([key, value]) => ({ key, value }));
      
      if (possibleStatusFields.length > 0) {
        console.log('Possible fields containing status information:', possibleStatusFields);
      }
    }
  }, [defects]);

  // Normalize defects data to ensure consistent field access
  const normalizedDefects = useMemo(() => {
    return defects.map(defect => {
      // Create a normalized copy with consistent field names
      const normalized = { ...defect };
      
      // Check all properties to find potential status field
      Object.entries(defect).forEach(([key, value]) => {
        // If we find a field that might be the status, copy it to a standard field name
        if (typeof value === 'string' && 
            (value.toUpperCase().includes('OPEN') || 
             value.toUpperCase().includes('CLOSED') || 
             value.toUpperCase().includes('PROGRESS'))) {
          normalized._normalizedStatus = value;
        }
      });
      
      return normalized;
    });
  }, [defects]);

  // If no defects, show empty message
  if (!Array.isArray(defects) || defects.length === 0) {
    return (
      <div className="empty-table-message">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Add some custom styles to ensure proper layout */}
      <style jsx>{`
        .expanded-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }
        
        @media (max-width: 768px) {
          .expanded-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .expanded-item {
          background: rgba(11, 22, 35, 0.3);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(244, 244, 244, 0.05);
          transition: all 0.3s ease;
        }
        
        .expanded-item:hover {
          background: rgba(11, 22, 35, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      
      <Table
        data={normalizedDefects}
        columns={columns}
        expandedContent={renderExpandedContent}
        actions={actions}
        uniqueIdField="id"
        defaultSortKey="target_date"
        defaultSortDirection="desc"
        className="defect-table"
      />
      
      {/* File Viewer modal */}
      {selectedFile && (
        <FileViewer
          url={selectedFile.url}
          filename={selectedFile.name}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
};

export default DefectTable;

