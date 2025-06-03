// src/components/dashboard/defects/DefectDialog.jsx - Phase 2 Enhanced with Optimized Uploads
import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, X, Download, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '../../common/ui/ToastContext';
import { formatDateForInput, formatDateDisplay } from '../../../utils/dateUtils';
import { DEFECT_FIELDS, FIELD_SECTIONS } from './config/DefectFieldMappings';
import { generateDefectPDF } from '../../../utils/generateDefectPDF';
import fileService from './services/fileService'; // Now uses PHASE 2 optimized service
import formStyles from '../../common/ui/form.module.css';

// Import the new dialog components
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
  permissions,
  isExternal,
  currentUser
}) => {
  const { toast } = useToast();
  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Get userId from currentUser prop
  const userId = currentUser?.id || currentUser?.userId;

  console.log("DefectDialog component rendering. isOpen:", isOpen, "defect:", defect?.id);

  // Initial form data structure - UNCHANGED
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

  // Effect to update internal formData when 'defect' prop changes - UNCHANGED
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
    } else if (!isOpen) {
      console.log("DefectDialog: Resetting state on close.");
      setFormData(initialFormData());
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress({});
      setShowConfirmClose(false);
      setIsDirty(false);
      setUploadingFiles(false);
    }
  }, [isOpen, defect, initialFormData]);

  // Handle form field changes - UNCHANGED
  const handleChange = useCallback((e) => {
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
  }, [vessels]);

  // Function to check if field is visible - UNCHANGED
  const isFieldVisible = useCallback((fieldId) => {
    return true;
  }, []);

  // Function to handle silent mode change - UNCHANGED
  const handleSilentModeChange = async (checked) => {
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

  // Function to check if field is editable - UNCHANGED
  const isFieldEditable = useCallback((fieldId) => {
    return true;
  }, []);

  // Function to get visible fields from section - UNCHANGED
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

  // Function to check if save should be enabled - UNCHANGED
  const canSave = useCallback(() => {
    return true;
  }, []);

  // Handle dialog close attempt - UNCHANGED
  const handleCloseAttempt = () => {
    console.log("DefectDialog: handleCloseAttempt called.");
    if (isDirty || initialFiles.length > 0 || closureFiles.length > 0) {
      console.log("DefectDialog: Unsaved changes detected, showing confirmation.");
      setShowConfirmClose(true);
    } else {
      console.log("DefectDialog: No unsaved changes, closing directly.");
      onClose();
    }
  };

  // Handle confirmed close - UNCHANGED
  const handleConfirmedClose = () => {
    console.log("DefectDialog: Confirmed close, proceeding with onClose.");
    setShowConfirmClose(false);
    onClose();
  };

  // Cancel close attempt - UNCHANGED
  const handleCancelClose = () => {
    console.log("DefectDialog: Cancelled close.");
    setShowConfirmClose(false);
  };

  // Validation functions - UNCHANGED
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

  // PHASE 2 ENHANCED: Optimized file upload with automatic strategy selection
  const handleFileUpload = async (files, uploadType, defectId) => {
    if (!files || files.length === 0) return [];

    setUploadingFiles(true);
    setUploadProgress({});

    try {
      console.log(`Starting PHASE 2 optimized upload of ${files.length} ${uploadType} files`);
      console.log('Current defect ID (passed):', defectId);
      console.log('Files to upload:', files);

      // Parameter validation - UNCHANGED
      if (!defectId || defectId.startsWith('temp-')) {
        throw new Error('Cannot upload files: Invalid or temporary defect ID. Please save the defect first.');
      }

      if (!userId) {
        throw new Error('Cannot upload files: User ID is required');
      }

      // PHASE 2 ENHANCEMENT: Use new optimized upload method with automatic strategy selection
      console.log('Using PHASE 2 optimized fileService.uploadFiles with smart strategy selection');
      
      const uploadedFiles = await fileService.uploadFiles(
        Array.from(files), // Ensure it's an array, not FileList
        defectId,          // Correct defect ID
        uploadType,        // 'initial' or 'completion'
        userId,           // User ID
        (progress, message, fileIndex) => {
          // PHASE 2 ENHANCED: Better progress tracking for different strategies
          if (typeof fileIndex === 'number' && files[fileIndex]) {
            // Individual file progress (sequential or detailed parallel)
            const fileName = files[fileIndex]?.name || `File ${fileIndex + 1}`;
            setUploadProgress(prev => ({
              ...prev,
              [fileName]: progress
            }));
          } else if (message && message.includes('Uploading')) {
            // General progress message from parallel uploads
            const fileName = message.match(/Uploading (.+)\.\.\.$/)?.[1] || 'Unknown file';
            setUploadProgress(prev => ({
              ...prev,
              [fileName]: progress
            }));
          } else {
            // Overall progress
            setUploadProgress(prev => ({
              ...prev,
              '_overall': progress
            }));
          }
        }
      );

      console.log(`PHASE 2: Successfully uploaded ${uploadedFiles.length} files using optimized strategy`);

      toast({
        title: "Upload Successful",
        description: `${uploadedFiles.length} files uploaded successfully using optimized upload`,
      });

      return uploadedFiles;

    } catch (error) {
      console.error('PHASE 2: Error uploading files:', error);

      // Enhanced error handling - UNCHANGED
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

  // File handling functions - UNCHANGED
  const handleInitialFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    setInitialFiles(prevFiles => [...prevFiles, ...validFiles]);
    setIsDirty(true);
  };

  const handleClosureFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    setClosureFiles(prevFiles => [...prevFiles, ...validFiles]);
    setIsDirty(true);
  };

  const removeInitialFile = (index) => {
    setInitialFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const removeClosureFile = (index) => {
    setClosureFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Download and delete handlers - UNCHANGED (uses existing fileService methods)
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

  // PHASE 2 ENHANCED: Save handler with optimized file upload flow
  const handleSave = async () => {
    try {
      console.log("DefectDialog: Starting PHASE 2 optimized save operation...");
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

      // File upload logic - SAME LOGIC, now using PHASE 2 optimized uploads
      const hasNewFiles = initialFiles.length > 0 || closureFiles.length > 0;
      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];
      let defectToUse = updatedDefectData;
      let actualDefectId = defectToUse.id;

      // For new defects with files, create defect first - UNCHANGED LOGIC
      if (isNew && hasNewFiles) {
        console.log("DefectDialog: Creating defect first to get ID for PHASE 2 optimized file upload...");
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

          console.log("DefectDialog: Defect created with ID for PHASE 2 upload:", actualDefectId);
          setFormData(prev => ({ ...prev, id: actualDefectId }));

        } catch (saveError) {
          console.error("DefectDialog: Error creating defect for PHASE 2 file upload:", saveError);
          throw saveError;
        }
      }

      // PHASE 2 ENHANCED: Upload files using optimized strategy
      if (initialFiles.length > 0 && actualDefectId && !actualDefectId.startsWith('temp-')) {
        console.log(`DefectDialog: PHASE 2 uploading ${initialFiles.length} initial files...`);
        uploadedInitialFiles = await handleFileUpload(initialFiles, 'initial', actualDefectId);
        console.log("DefectDialog: PHASE 2 initial files uploaded successfully");
      }

      if (closureFiles.length > 0 && defectToUse['Status'] === 'CLOSED' && actualDefectId && !actualDefectId.startsWith('temp-')) {
        console.log(`DefectDialog: PHASE 2 uploading ${closureFiles.length} closure files...`);
        uploadedClosureFiles = await handleFileUpload(closureFiles, 'completion', actualDefectId);
        console.log("DefectDialog: PHASE 2 closure files uploaded successfully");
      }

      // Final save with file metadata - UNCHANGED LOGIC
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

        console.log("DefectDialog: Updating defect with PHASE 2 uploaded file metadata...");
        try {
          savedDefect = await onSave(finalDefect);
          console.log("DefectDialog: Defect updated with PHASE 2 files successfully:", savedDefect?.id);
        } catch (saveError) {
          console.error("DefectDialog: Error updating defect with PHASE 2 files:", saveError);
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

      // PDF generation - UNCHANGED (kept as placeholder)
      if (savedDefect && savedDefect.id) {
        console.log("DefectDialog: Starting PDF generation process for defect:", savedDefect.id);

        try {
          const pdfPath = `placeholder/defect-reports/${savedDefect.id}.pdf`;
          console.log("DefectDialog: PDF will be saved to (placeholder):", pdfPath);

          const fileSignedUrls = {};
          const filePublicUrls = {};

          (savedDefect.initial_files || []).forEach(f => {
            if (f.url) filePublicUrls[f.path || f.s3Key] = f.url;
          });
          (savedDefect.completion_files || []).forEach(f => {
            if (f.url) filePublicUrls[f.path || f.s3Key] = f.url;
          });

          console.log("DefectDialog: Calling generateDefectPDF function with (placeholder)");

          let pdfBlob;
          try {
            pdfBlob = await generateDefectPDF(
              {
                ...savedDefect,
                vessel_name: vessels.find(v => v.vessel_id === savedDefect.vessel_id)?.vessel_name || 'Unknown Vessel'
              },
              fileSignedUrls,
              filePublicUrls
            );

            console.log(`DefectDialog: PDF generated successfully (placeholder), size: ${pdfBlob?.size || 0} bytes`);

            if (!pdfBlob || pdfBlob.size === 0) {
              throw new Error('Generated PDF is empty or invalid (placeholder)');
            }
          } catch (pdfGenError) {
            console.error("DefectDialog: Error generating PDF (placeholder):", pdfGenError);
            throw pdfGenError;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          console.log("DefectDialog: PDF uploaded successfully (placeholder)");

        } catch (pdfError) {
          console.error("DefectDialog: PDF generation or upload failed (placeholder):", pdfError);
          toast({
            title: "Warning",
            description: "Defect saved, but PDF report generation failed (placeholder).",
            variant: "destructive",
          });
        }
      }

      // Clear file selections and finish - UNCHANGED
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress({});
      setIsDirty(false);

      toast({
        title: "Success",
        description: isNew ? "Defect added successfully with PHASE 2 optimized uploads" : "Changes saved successfully with PHASE 2 optimized uploads",
      });

      onClose();

    } catch (error) {
      console.error("DefectDialog: Error in PHASE 2 optimized handleSave:", error);
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

  // Check if closure file upload should be displayed - UNCHANGED
  const shouldShowClosureFiles = () => {
    return formData && (formData['Status'] === 'CLOSED' || formData['Status (Vessel)'] === 'CLOSED');
  };

  // Group fields by section - UNCHANGED
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

  // PHASE 2 ENHANCED: Upload progress with better strategy feedback
  const renderUploadProgress = () => {
    if (!uploadingFiles || Object.keys(uploadProgress).length === 0) return null;

    return (
      <div className="upload-progress-container">
        <h4>PHASE 2 Optimized Upload in Progress...</h4>
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
          <small>Using PHASE 2 smart upload strategy for optimal performance</small>
        </div>
      </div>
    );
  };

  // ALL UI RENDERING REMAINS EXACTLY THE SAME - NO CHANGES TO USER INTERFACE
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
        >
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Add New Defect' : 'Edit Defect'}
            </DialogTitle>
            <DialogDescription id="dialog-description">
              {isNew ? 'Create a new defect record' : 'Edit existing defect details'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className={formStyles.formContainer}>
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
                                  className={formStyles.formSelect}
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
                                className={formStyles.formTextarea}
                                name={field.dbField}
                                value={formData?.[field.dbField] || ''}
                                onChange={handleChange}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                                disabled={!isEditable}
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
                                  className={formStyles.dateInput}
                                  name={field.dbField}
                                  value={formatDateForInput(formData?.[field.dbField])}
                                  onChange={handleChange}
                                  required={field.required}
                                  disabled={!isEditable}
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
                              </label>
                              <div className={formStyles.fileUploadContainer}>
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
                                        <button
                                          onClick={() => removeFileHandler(index)}
                                          className={formStyles.fileRemoveButton}
                                          disabled={!isEditable || uploadingFiles}
                                          title="Remove file"
                                        >
                                          <X className={formStyles.fileRemoveIcon} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Show existing files (already uploaded) */}
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

                                {/* Show PHASE 2 optimized upload progress */}
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
                                className={formStyles.formInput}
                                name={field.dbField}
                                value={formData?.[field.dbField] || ''}
                                onChange={handleChange}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                required={field.required}
                                disabled={!isEditable}
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
              disabled={saving || uploadingFiles}
              variant="cancel"
            >
              Cancel
            </DialogButton>
            {canSave() && (
              <DialogButton
                onClick={handleSave}
                disabled={saving || uploadingFiles}
                variant="save"
              >
                {saving ? 'Saving...' : uploadingFiles ? 'Uploading...' : (isNew ? 'Add Defect' : 'Save Changes')}
              </DialogButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - UNCHANGED */}
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
                You have unsaved changes. Are you sure you want to close this form and discard your changes?
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
                Discard Changes
              </DialogButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PHASE 2 ENHANCED: CSS styles with optimized progress display */}
      <style jsx>{`
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

        .upload-progress-item:hover {
          background: rgba(244, 244, 244, 0.08);
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

        /* Enhanced error states */
        .upload-progress-item .progress-fill[style*="e74c3c"] {
          box-shadow: 0 0 4px rgba(231, 76, 60, 0.4);
        }

        /* Loading animation */
        @keyframes progressPulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .upload-progress-container:has(.progress-fill[style*="width: 0%"]) {
          animation: progressPulse 2s ease-in-out infinite;
        }

        /* Success state */
        .upload-progress-item:has(.progress-text:contains("100%")) {
          background: rgba(46, 204, 113, 0.1);
          border: 1px solid rgba(46, 204, 113, 0.2);
        }

        /* Error state */
        .upload-progress-item:has(.progress-text:contains("Failed")) {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.2);
        }

        /* Enhanced file upload error styling */
        ${formStyles.fileUploadError} {
          margin-top: 12px;
          padding: 12px;
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e74c3c;
          font-size: 13px;
        }

        /* Responsive design for mobile */
        @media (max-width: 768px) {
          .upload-progress-item {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .file-name {
            max-width: none;
            text-align: center;
          }

          .progress-bar {
            order: 2;
          }

          .progress-text {
            order: 3;
            text-align: center;
            flex: 1;
          }
        }
      `}</style>
    </>
  );
};

export default DefectDialog;