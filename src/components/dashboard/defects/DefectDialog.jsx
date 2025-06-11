// DefectDialog.jsx - Phase 4 Enhanced with Auto-Report Generation on Save/Add + RBAC

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, X, Download, Trash2, AlertCircle, RefreshCw, Shield, Eye } from 'lucide-react';
import { useToast } from '../../common/ui/ToastContext';
import { usePermissions } from '../../../context/PermissionContext'; // NEW: Import permissions hook
import { formatDateForInput, formatDateDisplay } from '../../../utils/dateUtils';
import { DEFECT_FIELDS, FIELD_SECTIONS } from './config/DefectFieldMappings';
import fileService from './services/fileService';
import reportService from './services/reportService';
import formStyles from '../../common/ui/form.module.css';

// Import the dialog components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogButton
} from '../../common/ui/dialog';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const DefectDialog = ({
  isOpen,
  onClose,
  defect,
  onChange,
  onSave,
  vessels = [],
  isNew,
  permissions: legacyPermissions, // Legacy prop for backward compatibility
  isExternal,
  currentUser,
  isReadOnly: propIsReadOnly, // Legacy prop
  canCreate: propCanCreate, // Legacy prop
  canUpdate: propCanUpdate // Legacy prop
}) => {
  const { toast } = useToast();
  
  // NEW: Get permissions from context (takes precedence over props)
  const {
    canCreate,
    canUpdate,
    canDelete,
    isReadOnly,
    roleName,
    getPermissionStatus
  } = usePermissions();

  // Use context permissions or fall back to props
  const effectiveCanCreate = canCreate() || propCanCreate;
  const effectiveCanUpdate = canUpdate() || propCanUpdate;
  const effectiveIsReadOnly = isReadOnly() || propIsReadOnly;

  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // PHASE 4: Auto-report generation states
  const [autoGeneratingReport, setAutoGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportMessage, setReportMessage] = useState('');

  const userId = currentUser?.id || currentUser?.userId;

  console.log("DefectDialog component rendering. isOpen:", isOpen, "defect:", defect?.id, "permissions:", {
    canCreate: effectiveCanCreate,
    canUpdate: effectiveCanUpdate,
    isReadOnly: effectiveIsReadOnly,
    roleName
  });

  // Initial form data structure
  const initialFormData = useCallback(() => ({
    id: '',
    vessel_id: '',
    vessel_name: '',
    Equipments: '',
    Description: '',
    'Action Planned': '',
    Criticality: '',
    Status: 'OPEN',
    'Date Reported': new Date().toISOString().split('T')[0],
    'Date Completed': '',
    target_date: '',
    initial_files: [],
    completion_files: [],
    raised_by: '',
    closure_comments: '',
    external_visibility: true,
    Comments: ''
  }), []);

  const [formData, setFormData] = useState(initialFormData());
  const [isDirty, setIsDirty] = useState(false);

  // Effect to update internal formData when 'defect' prop changes
  useEffect(() => {
    console.log("DefectDialog useEffect triggered. isOpen:", isOpen, "defect:", defect?.id);
    if (isOpen && defect) {
      const initialFilesData = defect.initial_files || [];
      const completionFilesData = defect.completion_files || [];

      console.log("DefectDialog: Loading existing files:", {
        initialFiles: initialFilesData,
        completionFiles: completionFilesData
      });

      setFormData({
        id: defect.id || '',
        vessel_id: defect.vessel_id || '',
        vessel_name: defect.vessel_name || '',
        Equipments: defect.Equipments || '',
        Description: defect.Description || '',
        'Action Planned': defect['Action Planned'] || '',
        Criticality: defect.Criticality || '',
        Status: defect.Status || 'OPEN',
        'Date Reported': defect['Date Reported'] || new Date().toISOString().split('T')[0],
        'Date Completed': defect['Date Completed'] || '',
        target_date: defect.target_date || '',
        initial_files: initialFilesData,
        completion_files: completionFilesData,
        raised_by: defect.raised_by || '',
        closure_comments: defect.closure_comments || '',
        external_visibility: typeof defect.external_visibility === 'boolean' ? defect.external_visibility : true,
        Comments: defect.Comments || ''
      });
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress({});
      setIsDirty(false);
      setUploadingFiles(false);
      
      // PHASE 4: Reset report generation states
      setAutoGeneratingReport(false);
      setReportProgress(0);
      setReportMessage('');
    } else if (!isOpen) {
      console.log("DefectDialog: Resetting state on close.");
      setFormData(initialFormData());
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress({});
      setShowConfirmClose(false);
      setIsDirty(false);
      setUploadingFiles(false);
      
      // PHASE 4: Reset report generation states
      setAutoGeneratingReport(false);
      setReportProgress(0);
      setReportMessage('');
    }
  }, [isOpen, defect, initialFormData]);

  // Handle form field changes
  const handleChange = useCallback((e) => {
    // NEW: Block changes if in read-only mode
    if (effectiveIsReadOnly) {
      console.log("DefectDialog: Change blocked - user in read-only mode");
      return;
    }

    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'vessel_id') {
        const selectedVessel = vessels.find(v => v.vessel_id === value);
        newState.vessel_name = selectedVessel ? selectedVessel.vessel_name : '';
      }

      return newState;
    });
    setIsDirty(true);
  }, [vessels, effectiveIsReadOnly]);

  // Function to check if field is visible
  const isFieldVisible = useCallback((fieldId) => {
    return true;
  }, []);

  // Function to handle silent mode change
  const handleSilentModeChange = async (checked) => {
    // NEW: Block changes if in read-only mode
    if (effectiveIsReadOnly) {
      console.log("DefectDialog: Silent mode change blocked - user in read-only mode");
      return;
    }

    setFormData(prev => ({ ...prev, external_visibility: !checked }));
    setIsDirty(true);
    if (!isNew) {
      console.log(`Updating external_visibility to ${!checked} for defect ${defect.id}`);
      toast({
        title: "Info",
        description: `Defect visibility changed locally.`,
      });
    }
  };

  // NEW: Function to check if field is editable based on permissions
  const isFieldEditable = useCallback((fieldId) => {
    // Always allow editing in view mode if user has proper permissions
    if (isNew && !effectiveCanCreate) {
      return false; // Can't create new defects
    }
    if (!isNew && !effectiveCanUpdate) {
      return false; // Can't update existing defects
    }
    if (effectiveIsReadOnly) {
      return false; // User is in read-only mode
    }
    return true;
  }, [isNew, effectiveCanCreate, effectiveCanUpdate, effectiveIsReadOnly]);

  // Function to get visible fields from section
  const getVisibleFields = useCallback(() => {
    const allFields = Object.entries(DEFECT_FIELDS.DIALOG);
    return allFields
      .filter(([fieldId, field]) => {
        if (!isFieldVisible(fieldId)) return false;
        if (field.conditionalDisplay && !field.conditionalDisplay(formData)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder);
  }, [formData, isFieldVisible]);

  // NEW: Function to check if save should be enabled based on permissions
  const canSave = useCallback(() => {
    if (saving || uploadingFiles || autoGeneratingReport) {
      return false;
    }
    
    if (isNew && !effectiveCanCreate) {
      return false; // Can't create new defects
    }
    
    if (!isNew && !effectiveCanUpdate) {
      return false; // Can't update existing defects
    }
    
    return true;
  }, [isNew, effectiveCanCreate, effectiveCanUpdate, saving, uploadingFiles, autoGeneratingReport]);

  // Handle dialog close attempt
  const handleCloseAttempt = () => {
    console.log("DefectDialog: handleCloseAttempt called.");
    if (isDirty || initialFiles.length > 0 || closureFiles.length > 0 || autoGeneratingReport) {
      console.log("DefectDialog: Unsaved changes or report generation in progress, showing confirmation.");
      setShowConfirmClose(true);
    } else {
      console.log("DefectDialog: No unsaved changes, closing directly.");
      onClose();
    }
  };

  // Handle confirmed close
  const handleConfirmedClose = () => {
    console.log("DefectDialog: Confirmed close, proceeding with onClose.");
    setShowConfirmClose(false);
    
    // PHASE 4: Cancel auto-report generation if in progress
    if (autoGeneratingReport) {
      setAutoGeneratingReport(false);
      setReportProgress(0);
      setReportMessage('');
    }
    
    onClose();
  };

  // Cancel close attempt
  const handleCancelClose = () => {
    console.log("DefectDialog: Cancelled close.");
    setShowConfirmClose(false);
  };

  // Validation functions
  const validateDefect = (defectData) => {
    if (defectData['Date Completed'] && defectData['Date Reported']) {
      const closureDate = new Date(defectData['Date Completed']);
      const reportedDate = new Date(defectData['Date Reported']);

      if (closureDate < reportedDate) {
        toast({
          title: "Invalid Date",
          description: "Closure date cannot be before the reported date",
          variant: "destructive",
        });
        return false;
      }
    }

    const visibleFields = Object.entries(DEFECT_FIELDS.DIALOG)
      .filter(([fieldId, field]) => {
        if (!isFieldVisible(fieldId)) return false;
        if (field.conditionalDisplay && !field.conditionalDisplay(defectData)) {
          return false;
        }
        return true;
      })
      .filter(([_, field]) => {
        if (field.required) return true;
        if (field.conditionalRequired && field.conditionalRequired(defectData)) {
          return true;
        }
        return false;
      })
      .map(([_, field]) => {
        return field.dbField;
      });

    if (defectData['Status'] === 'CLOSED') {
      if (!defectData['Date Completed']) {
        toast({
          title: "Required Field Missing",
          description: "Please enter Date Completed for closed defects",
          variant: "destructive",
        });
        return false;
      }
    }

    const missing = visibleFields.filter(field => !defectData[field]);

    if (missing.length > 0) {
      const fieldLabels = Object.values(DEFECT_FIELDS.DIALOG).reduce((acc, field) => {
        acc[field.dbField] = field.label;
        return acc;
      }, {});

      const missingFieldLabels = missing.map(field => fieldLabels[field] || field);

      toast({
        title: "Missing Information",
        description: `Please fill in the following fields: ${missingFieldLabels.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `${file.name} exceeds 2MB limit`,
        variant: "destructive",
      });
      return false;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: `${file.name} is not a supported file type`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // File upload with optimization
  const handleFileUpload = async (files, uploadType, defectId) => {
    if (!files || files.length === 0) return [];

    setUploadingFiles(true);
    setUploadProgress({});

    try {
      console.log(`Starting Phase 2 optimized upload of ${files.length} ${uploadType} files`);
      console.log('Current defect ID (passed):', defectId);
      console.log('Files to upload:', files);

      if (!defectId || defectId.startsWith('temp-')) {
        throw new Error('Cannot upload files: Invalid or temporary defect ID. Please save the defect first.');
      }

      if (!userId) {
        throw new Error('Cannot upload files: User ID is required');
      }

      console.log('Using Phase 2 optimized fileService.uploadFiles with smart strategy selection');
      
      const uploadedFiles = await fileService.uploadFiles(
        Array.from(files),
        defectId,
        uploadType,
        userId,
        (progress, message, fileIndex) => {
          if (typeof fileIndex === 'number' && files[fileIndex]) {
            const fileName = files[fileIndex]?.name || `File ${fileIndex + 1}`;
            setUploadProgress(prev => ({
              ...prev,
              [fileName]: progress
            }));
          } else if (message && message.includes('Uploading')) {
            const fileName = message.match(/Uploading (.+)\.\.\.$/)?.[1] || 'Unknown file';
            setUploadProgress(prev => ({
              ...prev,
              [fileName]: progress
            }));
          } else {
            setUploadProgress(prev => ({
              ...prev,
              '_overall': progress
            }));
          }
        }
      );

      console.log(`Phase 2: Successfully uploaded ${uploadedFiles.length} files using optimized strategy`);

      toast({
        title: "Upload Successful",
        description: `${uploadedFiles.length} files uploaded successfully using optimized upload`,
      });

      return uploadedFiles;

    } catch (error) {
      console.error('Phase 2: Error uploading files:', error);

      if (error.message.includes('CORS') || error.message.includes('Network Error')) {
        toast({
          title: "Upload Configuration Issue",
          description: "File upload is currently unavailable due to server configuration.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: `Upload failed: ${error.message}`,
          variant: "destructive",
        });
      }

      return [];
    } finally {
      setUploadingFiles(false);
      setUploadProgress({});
    }
  };

  // File handling functions
  const handleInitialFileChange = (e) => {
    // NEW: Block file changes if not editable
    if (!isFieldEditable('initialFiles')) {
      console.log("DefectDialog: File upload blocked - insufficient permissions");
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload files",
        variant: "destructive",
      });
      return;
    }

    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    setInitialFiles(prevFiles => [...prevFiles, ...validFiles]);
    setIsDirty(true);
  };

  const handleClosureFileChange = (e) => {
    // NEW: Block file changes if not editable
    if (!isFieldEditable('closureFiles')) {
      console.log("DefectDialog: File upload blocked - insufficient permissions");
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload files",
        variant: "destructive",
      });
      return;
    }

    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    setClosureFiles(prevFiles => [...prevFiles, ...validFiles]);
    setIsDirty(true);
  };

  const removeInitialFile = (index) => {
    // NEW: Block file removal if not editable
    if (!isFieldEditable('initialFiles')) {
      return;
    }
    setInitialFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const removeClosureFile = (index) => {
    // NEW: Block file removal if not editable
    if (!isFieldEditable('closureFiles')) {
      return;
    }
    setClosureFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Download and delete handlers
  const handleDownloadFile = async (file) => {
    if (!userId || !formData.id) {
      toast({
        title: "Error",
        description: "Cannot download file: missing user or defect information",
        variant: "destructive",
      });
      return;
    }

    try {
      await fileService.downloadFile(formData.id, file.id, file.name || file.originalName, userId);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: `Failed to download ${file.name}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteExistingFile = async (file, fileType) => {
    // NEW: Block file deletion if not editable
    if (!isFieldEditable('fileManagement')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete files",
        variant: "destructive",
      });
      return;
    }

    if (!userId || !formData.id) {
      toast({
        title: "Error",
        description: "Cannot delete file: missing user or defect information",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await fileService.deleteFile(formData.id, file.id, userId);

      setFormData(prev => ({
        ...prev,
        [fileType]: prev[fileType].filter(f => f.id !== file.id)
      }));

      setIsDirty(true);

      toast({
        title: "Success",
        description: `${file.name} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: `Failed to delete ${file.name}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // PHASE 4: Auto-generate report after successful save
  const autoGenerateReport = async (savedDefectData, wasNewDefect) => {
    console.log(`PHASE 4: Starting auto-report generation for ${wasNewDefect ? 'new' : 'updated'} defect ${savedDefectData.id}`);
    
    setAutoGeneratingReport(true);
    setReportProgress(0);
    setReportMessage('Preparing report generation...');

    try {
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setReportMessage('Generating comprehensive report...');
      setReportProgress(20);

      // PHASE 4: Use auto-generation method (no download, just create/update)
      const reportResult = await reportService.autoGenerateReportOnSave(
        savedDefectData,
        userId,
        wasNewDefect
      );

      setReportProgress(100);
      setReportMessage('Report generation complete!');

      console.log('PHASE 4: Auto-report generation result:', reportResult);

      // Show success message
      if (reportResult.success) {
        toast({
          title: "Defect Saved Successfully",
          description: `${reportResult.message}. Use "Generate Report" button to download.`,
        });
      } else {
        // Report generation failed, but defect save succeeded
        toast({
          title: "Defect Saved",
          description: `${reportResult.message}. You can try generating the report manually later.`,
          variant: "warning",
        });
      }

      // Keep auto-generation indicator for a moment
      setTimeout(() => {
        setAutoGeneratingReport(false);
        setReportProgress(0);
        setReportMessage('');
      }, 1500);

    } catch (error) {
      console.error('PHASE 4: Error in auto-report generation:', error);
      
      setAutoGeneratingReport(false);
      setReportProgress(0);
      setReportMessage('');

      // Don't show error for auto-generation failure - defect save was successful
      toast({
        title: "Defect Saved",
        description: "Defect saved successfully. Report generation can be done manually later.",
      });
    }
  };

  // PHASE 4: Enhanced Save handler with auto-report generation
  const handleSave = async () => {
    // NEW: Check permissions before saving
    if (!canSave()) {
      const message = isNew 
        ? "You don't have permission to create defects" 
        : "You don't have permission to update defects";
      
      toast({
        title: "Permission Denied",
        description: message,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("DefectDialog: Starting PHASE 4 enhanced save operation...");
      setSaving(true);
      setUploadProgress({});

      const updatedDefectData = {
        ...formData,
        external_visibility: formData.external_visibility ?? true
      };

      if (!validateDefect(updatedDefectData)) {
        console.log("DefectDialog: Validation failed, exiting save operation");
        setSaving(false);
        return;
      }

      // File upload logic - same as before
      const hasNewFiles = initialFiles.length > 0 || closureFiles.length > 0;
      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];
      let defectToUse = updatedDefectData;
      let actualDefectId = defectToUse.id;

      // For new defects with files, create defect first
      if (isNew && hasNewFiles) {
        console.log("DefectDialog: Creating defect first to get ID for file upload...");
        try {
          const tempDefectData = {
            ...updatedDefectData,
            initial_files: [],
            completion_files: []
          };
          delete tempDefectData.id;

          const createdDefect = await onSave(tempDefectData);
          actualDefectId = createdDefect?.id || createdDefect;
          defectToUse = { ...updatedDefectData, id: actualDefectId };

          console.log("DefectDialog: Defect created with ID:", actualDefectId);
          setFormData(prev => ({ ...prev, id: actualDefectId }));

        } catch (saveError) {
          console.error("DefectDialog: Error creating defect for file upload:", saveError);
          throw saveError;
        }
      }

      // Upload files
      if (initialFiles.length > 0 && actualDefectId && !actualDefectId.startsWith('temp-')) {
        console.log(`DefectDialog: Uploading ${initialFiles.length} initial files...`);
        uploadedInitialFiles = await handleFileUpload(initialFiles, 'initial', actualDefectId);
        console.log("DefectDialog: Initial files uploaded successfully");
      }

      if (closureFiles.length > 0 && defectToUse['Status'] === 'CLOSED' && actualDefectId && !actualDefectId.startsWith('temp-')) {
        console.log(`DefectDialog: Uploading ${closureFiles.length} closure files...`);
        uploadedClosureFiles = await handleFileUpload(closureFiles, 'completion', actualDefectId);
        console.log("DefectDialog: Closure files uploaded successfully");
      }

      // Final save with file metadata
      let savedDefect;
      if (uploadedInitialFiles.length > 0 || uploadedClosureFiles.length > 0) {
        const finalDefect = {
          ...defectToUse,
          initial_files: [
            ...(formData.initial_files || []),
            ...uploadedInitialFiles
          ],
          completion_files: [
            ...(formData.completion_files || []),
            ...uploadedClosureFiles
          ],
          closure_comments: defectToUse.closure_comments || '',
          target_date: defectToUse.target_date || null
        };

        console.log("DefectDialog: Updating defect with uploaded file metadata...");
        try {
          savedDefect = await onSave(finalDefect);
          console.log("DefectDialog: Defect updated with files successfully:", savedDefect?.id);
        } catch (saveError) {
          console.error("DefectDialog: Error updating defect with files:", saveError);
          throw saveError;
        }
      } else {
        console.log("DefectDialog: Saving defect without files...");
        try {
          if (isNew) {
            const newDefectData = { ...defectToUse };
            if (newDefectData.id && newDefectData.id.startsWith('temp-')) {
              delete newDefectData.id;
            }
            savedDefect = await onSave(newDefectData);
          } else {
            savedDefect = await onSave(defectToUse);
          }
          console.log("DefectDialog: Defect saved successfully:", savedDefect?.id);
        } catch (saveError) {
          console.error("DefectDialog: Error saving defect:", saveError);
          throw saveError;
        }
      }

      // Clear file selections
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress({});
      setIsDirty(false);

      // PHASE 4: Auto-generate report after successful save
      if (savedDefect && savedDefect.id) {
        console.log("PHASE 4: Starting auto-report generation...");
        
        // Don't await this - let it run in background
        autoGenerateReport(savedDefect, isNew).catch(error => {
          console.error('PHASE 4: Background auto-report generation failed:', error);
        });
      } else {
        // Manual success message if no auto-report generation
        toast({
          title: "Success",
          description: isNew ? "Defect added successfully" : "Changes saved successfully",
        });
      }

      // Close dialog after successful save (auto-report runs in background)
      onClose();

    } catch (error) {
      console.error("DefectDialog: Error in PHASE 4 enhanced handleSave:", error);
      toast({
        title: "Error",
        description: "Failed to save defect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadingFiles(false);
    }
  };

  // Check if closure file upload should be displayed
  const shouldShowClosureFiles = () => {
    return formData && (formData['Status'] === 'CLOSED' || formData['Status (Vessel)'] === 'CLOSED');
  };

  // Group fields by section
  const groupedFields = getVisibleFields().reduce((acc, [fieldId, field]) => {
    const sectionId = field.section || 'basic';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push([fieldId, field]);
    return acc;
  }, {});

  const sortedSections = Object.entries(FIELD_SECTIONS)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([sectionId, section]) => {
      if (section.conditionalDisplay && !section.conditionalDisplay(formData)) {
        return false;
      }
      return groupedFields[sectionId] && groupedFields[sectionId].length > 0;
    });

  // Upload progress rendering
  const renderUploadProgress = () => {
    if (!uploadingFiles || Object.keys(uploadProgress).length === 0) return null;

    return (
      <div className="upload-progress-container">
        <h4>Phase 2 Optimized Upload in Progress...</h4>
        {Object.entries(uploadProgress).map(([fileName, progress]) => {
          if (fileName === '_overall') {
            return (
              <div key="overall" className="upload-progress-item overall-progress">
                <span className="file-name">Overall Progress</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.max(0, progress)}%`,
                      backgroundColor: progress === -1 ? '#e74c3c' : '#3bade5'
                    }}
                  />
                </div>
                <span className="progress-text">
                  {progress === -1 ? 'Failed' : `${progress}%`}
                </span>
              </div>
            );
          }
          
          return (
            <div key={fileName} className="upload-progress-item">
              <span className="file-name">{fileName}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.max(0, progress)}%`,
                    backgroundColor: progress === -1 || progress === 0 ? '#e74c3c' : '#3bade5'
                  }}
                />
              </div>
              <span className="progress-text">
                {progress === -1 || (progress === 0 && uploadingFiles) ? 'Failed' : `${progress}%`}
              </span>
            </div>
          );
        })}
        <div className="upload-strategy-info">
          <small>Using Phase 2 smart upload strategy for optimal performance</small>
        </div>
      </div>
    );
  };

  // PHASE 4: Auto-report generation progress rendering
  const renderAutoReportProgress = () => {
    if (!autoGeneratingReport) return null;

    return (
      <div className="auto-report-progress-container">
        <div className="auto-report-progress-header">
          <RefreshCw size={16} className="animate-spin" />
          <h4>Generating Report...</h4>
        </div>
        <div className="auto-report-progress-content">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${reportProgress}%`,
                backgroundColor: '#2ECC71'
              }}
            />
          </div>
          <div className="progress-text">
            {reportProgress}% - {reportMessage}
          </div>
        </div>
        <div className="auto-report-progress-note">
          <small>Report will be available for download after completion</small>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseAttempt();
            return false;
          }
          return true;
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={effectiveIsReadOnly ? formStyles.readOnlyContainer : ''}
        >
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Add New Defect' : 'Edit Defect'}
              {/* NEW: Permission status indicator */}
              {effectiveIsReadOnly && (
                <span className={formStyles.readOnlyBadge}>
                  <Eye size={14} />
                  Read Only
                </span>
              )}
              {roleName && (
                <span className={formStyles.roleBadge}>
                  <Shield size={12} />
                  {roleName}
                </span>
              )}
            </DialogTitle>
            <DialogDescription id="dialog-description">
              {effectiveIsReadOnly ? (
                'Viewing defect details - you can view but not modify this defect'
              ) : (
                isNew ? 'Create a new defect record with auto-report generation' : 'Edit existing defect details with report update'
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className={`${formStyles.formContainer} ${effectiveIsReadOnly ? formStyles.readOnly : ''}`}>
              {/* NEW: Read-only overlay */}
              {effectiveIsReadOnly && (
                <div className={formStyles.readOnlyOverlay}>
                  View Only
                </div>
              )}
              
              {/* PHASE 4: Auto-report generation progress */}
              {renderAutoReportProgress()}
              
              {sortedSections.map(([sectionId, section]) => (
                <div key={sectionId} className={formStyles.formSection}>
                  <h3 className={formStyles.sectionTitle}>
                    {section.label}
                  </h3>
                  <div className={formStyles.fieldGrid}>
                    {groupedFields[sectionId]?.map(([fieldId, field]) => {
                      const isEditable = isFieldEditable(fieldId);

                      switch (field.type) {
                        case 'checkbox':
                          return (
                            <div key={fieldId} className={formStyles.formGroup}>
                              <label className={formStyles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  className={formStyles.checkboxInput}
                                  checked={fieldId === 'silentMode'
                                    ? !formData?.[field.dbField]
                                    : formData?.[field.dbField] ?? field.defaultValue}
                                  onChange={(e) => {
                                    if (fieldId === 'silentMode') {
                                      handleSilentModeChange(e.target.checked);
                                    } else {
                                      handleChange({ target: { name: field.dbField, value: e.target.checked, type: 'checkbox' } });
                                    }
                                  }}
                                  disabled={!isEditable}
                                  readOnly={!isEditable}
                                  id={fieldId}
                                />
                                <span className={formStyles.checkboxText}>
                                  {field.label}
                                  {fieldId === 'silentMode' && (
                                    <span className={formStyles.checkboxHint}>
                                      ({!formData?.[field.dbField] ? 'Hidden from external users' : 'Visible to external users'})
                                    </span>
                                  )}
                                </span>
                              </label>
                            </div>
                          );

                        case 'select':
                          return (
                            <div key={fieldId} className={formStyles.formGroup}>
                              <label htmlFor={fieldId} className={formStyles.formLabel}>
                                {field.label} {field.required && <span className={formStyles.required}>*</span>}
                              </label>
                              <div className={formStyles.selectWrapper}>
                                <select
                                  id={fieldId}
                                  className={`${formStyles.formSelect} ${!isEditable ? formStyles.readOnlyField : ''}`}
                                  name={field.dbField}
                                  value={formData?.[field.dbField] || ''}
                                  onChange={handleChange}
                                  required={field.required}
                                  disabled={!isEditable}
                                  aria-required={field.required}
                                >
                                  <option value="">Select {field.label}</option>
                                  {field.dbField === 'vessel_id'
                                    ? vessels.map(vessel => (
                                      <option key={vessel.vessel_id} value={vessel.vessel_id}>{vessel.vessel_name}</option>
                                    ))
                                    : field.options?.map(option => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                                <div className={formStyles.selectArrow}>
                                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          );

                        case 'textarea':
                          return (
                            <div key={fieldId} className={`${formStyles.formGroup} ${field.width === 'full' ? formStyles.fullWidth : ''}`}>
                              <label htmlFor={fieldId} className={formStyles.formLabel}>
                                {field.label} {field.required && <span className={formStyles.required}>*</span>}
                              </label>
                              <textarea
                                id={fieldId}
                                className={`${formStyles.formTextarea} ${!isEditable ? formStyles.readOnlyField : ''}`}
                                name={field.dbField}
                                value={formData?.[field.dbField] || ''}
                                onChange={handleChange}
                                placeholder={!isEditable ? '' : `Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                                disabled={!isEditable}
                                readOnly={!isEditable}
                                rows={field.rows || 3}
                              />
                            </div>
                          );

                        case 'date':
                          return (
                            <div key={fieldId} className={formStyles.formGroup}>
                              <label htmlFor={fieldId} className={formStyles.formLabel}>
                                {field.label} {field.required && <span className={formStyles.required}>*</span>}
                              </label>
                              <div className={formStyles.dateInputWrapper}>
                                <input
                                  id={fieldId}
                                  type="date"
                                  className={`${formStyles.dateInput} ${!isEditable ? formStyles.readOnlyField : ''}`}
                                  name={field.dbField}
                                  value={formatDateForInput(formData?.[field.dbField])}
                                  onChange={handleChange}
                                  required={field.required}
                                  disabled={!isEditable}
                                  readOnly={!isEditable}
                                  aria-required={field.required}
                                />
                                <div className={formStyles.dateDisplay}>
                                  {formatDateDisplay(formData?.[field.dbField]) || 'dd/mm/yyyy'}
                                </div>
                              </div>
                            </div>
                          );

                        case 'file':
                          const isInitialFilesField = fieldId === 'initialFiles';
                          const currentFiles = isInitialFilesField ? initialFiles : closureFiles;
                          const handleFileChange = isInitialFilesField ? handleInitialFileChange : handleClosureFileChange;
                          const removeFileHandler = isInitialFilesField ? removeInitialFile : removeClosureFile;
                          const existingFiles = formData?.[field.dbField] || [];

                          if (!isInitialFilesField && !shouldShowClosureFiles()) {
                            return null;
                          }

                          return (
                            <div key={fieldId} className={`${formStyles.formGroup} ${field.width === 'full' ? formStyles.fullWidth : ''}`}>
                              <label className={formStyles.formLabel}>
                                {field.label}
                                {!isEditable && (
                                  <span className={formStyles.fieldNote}> (View Only)</span>
                                )}
                              </label>
                              <div className={`${formStyles.fileUploadContainer} ${!isEditable ? formStyles.readOnlyContainer : ''}`}>
                                {isEditable && (
                                  <label className={formStyles.fileUploadButton}>
                                    <Upload className={formStyles.fileUploadIcon} />
                                    <span>Upload {field.label} (Max 2MB: PDF, DOC, Images)</span>
                                    <input
                                      type="file"
                                      multiple={field.multiple}
                                      className={formStyles.hiddenFileInput}
                                      onChange={handleFileChange}
                                      accept={field.accept}
                                      disabled={!isEditable || uploadingFiles}
                                    />
                                  </label>
                                )}

                                {/* Show newly selected files */}
                                {currentFiles.length > 0 && (
                                  <div className={formStyles.fileList}>
                                    <div className={formStyles.fileListHeader}>New files to upload:</div>
                                    {currentFiles.map((file, index) => (
                                      <div key={index} className={formStyles.fileItem}>
                                        <FileText className={formStyles.fileIcon} />
                                        <span className={formStyles.fileName}>{file.name}</span>
                                        <span className={formStyles.fileSize}>
                                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                        {isEditable && (
                                          <button
                                            onClick={() => removeFileHandler(index)}
                                            className={formStyles.fileRemoveButton}
                                            disabled={!isEditable || uploadingFiles}
                                            title="Remove file"
                                          >
                                            <X className={formStyles.fileRemoveIcon} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Show existing files */}
                                {existingFiles.length > 0 && (
                                  <div className={formStyles.existingFileList}>
                                    <div className={formStyles.existingFilesHeader}>Existing files:</div>
                                    {existingFiles.map((file, index) => (
                                      <div key={file.id || index} className={formStyles.fileItem}>
                                        <FileText className={formStyles.fileIcon} />
                                        <span className={formStyles.fileName}>{file.name || file.originalName}</span>
                                        <span className={formStyles.fileSize}>
                                          ({((file.size || 0) / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                        <div className={formStyles.fileActions}>
                                          <button
                                            onClick={() => handleDownloadFile(file)}
                                            className={formStyles.fileActionButton}
                                            title="Download file"
                                            disabled={!userId}
                                          >
                                            <Download size={14} />
                                          </button>
                                          {isEditable && (
                                            <button
                                              onClick={() => handleDeleteExistingFile(file, field.dbField)}
                                              className={`${formStyles.fileActionButton} ${formStyles.fileDeleteButton}`}
                                              title="Delete file"
                                              disabled={!userId}
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Show upload progress */}
                                {renderUploadProgress()}

                                {/* Enhanced error state for upload failures */}
                                {Object.values(uploadProgress).some(p => p === -1) && (
                                  <div className={formStyles.fileUploadError}>
                                    <AlertCircle size={16} />
                                    <span>Some files failed to upload. Please check file size and format.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );

                        default:
                          return (
                            <div key={fieldId} className={formStyles.formGroup}>
                              <label htmlFor={fieldId} className={formStyles.formLabel}>
                                {field.label} {field.required && <span className={formStyles.required}>*</span>}
                              </label>
                              <input
                                id={fieldId}
                                type={field.type || 'text'}
                                className={`${formStyles.formInput} ${!isEditable ? formStyles.readOnlyField : ''}`}
                                name={field.dbField}
                                value={formData?.[field.dbField] || ''}
                                onChange={handleChange}
                                placeholder={!isEditable ? '' : `Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                                disabled={!isEditable}
                                readOnly={!isEditable}
                                aria-required={field.required}
                              />
                            </div>
                          );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogButton
              onClick={handleCloseAttempt}
              disabled={saving || uploadingFiles || autoGeneratingReport}
              variant="cancel"
            >
              {effectiveIsReadOnly ? 'Close' : 'Cancel'}
            </DialogButton>
            {canSave() && (
              <DialogButton
                onClick={handleSave}
                disabled={!canSave()}
                variant="save"
                className={!canSave() ? formStyles.disabledButton : ''}
                title={!canSave() ? 'Insufficient permissions to save' : ''}
              >
                {saving ? 'Saving...' : 
                 uploadingFiles ? 'Uploading...' : 
                 autoGeneratingReport ? 'Generating Report...' :
                 (isNew ? 'Add Defect' : 'Save Changes')}
              </DialogButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {showConfirmClose && (
        <Dialog open={showConfirmClose} onOpenChange={handleCancelClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Discard Changes?
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className={formStyles.confirmationText}>
                {autoGeneratingReport 
                  ? 'Report generation is in progress. Are you sure you want to close and cancel the operation?'
                  : 'You have unsaved changes. Are you sure you want to close this form and discard your changes?'
                }
              </p>
            </DialogBody>
            <DialogFooter>
              <DialogButton
                onClick={handleCancelClose}
                variant="cancel"
              >
                Continue Editing
              </DialogButton>
              <DialogButton
                onClick={handleConfirmedClose}
                variant="destructive"
                className={formStyles.discardButton}
              >
                {autoGeneratingReport ? 'Cancel & Close' : 'Discard Changes'}
              </DialogButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PHASE 4: Enhanced CSS styles */}
      <style jsx>{`
        /* Upload progress styles - same as before */
        .upload-progress-container {
          margin: 16px 0;
          padding: 16px;
          background: rgba(59, 173, 229, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(59, 173, 229, 0.2);
          backdrop-filter: blur(5px);
        }

        .upload-progress-container h4 {
          margin: 0 0 12px 0;
          color: var(--table-text-color);
          font-size: 14px;
          font-weight: 600;
        }

        .upload-progress-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          padding: 8px;
          background: rgba(244, 244, 244, 0.05);
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .upload-progress-item.overall-progress {
          background: rgba(59, 173, 229, 0.15);
          border: 1px solid rgba(59, 173, 229, 0.3);
          font-weight: 600;
        }

        .file-name {
          flex: 1;
          font-size: 13px;
          color: var(--table-text-color);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .progress-bar {
          flex: 2;
          height: 8px;
          background: rgba(244, 244, 244, 0.1);
          border-radius: 4px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
          border-radius: 4px;
          box-shadow: 0 0 4px rgba(59, 173, 229, 0.3);
        }

        .progress-text {
          flex: 0 0 60px;
          text-align: right;
          font-size: 12px;
          color: var(--table-muted-text-color);
          font-weight: 600;
        }

        .upload-strategy-info {
          margin-top: 12px;
          padding: 8px;
          background: rgba(46, 204, 113, 0.1);
          border: 1px solid rgba(46, 204, 113, 0.2);
          border-radius: 4px;
          text-align: center;
        }

        .upload-strategy-info small {
          color: #2ECC71;
          font-weight: 500;
        }

        /* PHASE 4: Auto-report generation progress styles */
        .auto-report-progress-container {
          margin: 16px 0;
          padding: 16px;
          background: rgba(46, 204, 113, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(46, 204, 113, 0.2);
          backdrop-filter: blur(5px);
          position: relative;
        }

        .auto-report-progress-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #2ECC71;
        }

        .auto-report-progress-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .auto-report-progress-content {
          margin-bottom: 8px;
        }

        .auto-report-progress-content .progress-bar {
          height: 10px;
          background: rgba(244, 244, 244, 0.1);
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 8px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .auto-report-progress-content .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2ECC71, #27AE60);
          transition: width 0.3s ease;
          border-radius: 5px;
          box-shadow: 0 0 6px rgba(46, 204, 113, 0.4);
        }

        .auto-report-progress-content .progress-text {
          color: #2ECC71;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }

        .auto-report-progress-note {
          text-align: center;
          margin-top: 8px;
        }

        .auto-report-progress-note small {
          color: rgba(46, 204, 113, 0.8);
          font-style: italic;
          font-size: 12px;
        }

        /* Spin animation for refresh icon */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
};

export default DefectDialog;