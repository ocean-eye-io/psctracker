import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '../../common/ui/ToastContext';
import { formatDateForInput, formatDateDisplay } from '../../../utils/dateUtils';
import { DEFECT_FIELDS, FIELD_SECTIONS } from './config/DefectFieldMappings';
import { generateDefectPDF } from '../../../utils/generateDefectPDF';
import formStyles from '../../common/ui/form.module.css'; // Import form-specific styles

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
} from '../../common/ui/dialog'; // Import the dialog components

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
  onChange, // This prop is no longer directly used for internal state management
  onSave,
  vessels,
  isNew,
  permissions,
  isExternal
}) => {
  const { toast } = useToast();
  const [initialFiles, setInitialFiles] = useState([]);
  const [closureFiles, setClosureFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Add this log to see when the dialog component itself renders
  console.log("DefectDialog component rendering. isOpen:", isOpen, "defect:", defect?.id);

  // Initial form data structure (used for resetting)
  const initialFormData = useCallback(() => ({
    id: '',
    vessel_id: '', // This should be the ID, not the name
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

  // State for form data, managed internally by DefectDialog
  const [formData, setFormData] = useState(initialFormData());
  const [isDirty, setIsDirty] = useState(false); // Track if form has changes

  // Effect to update internal formData when 'defect' prop changes (for edit mode)
  useEffect(() => {
    console.log("DefectDialog useEffect triggered. isOpen:", isOpen, "defect:", defect?.id);
    if (isOpen && defect) {
      // Initialize form state from defect prop
      setFormData({
        id: defect.id || '',
        vessel_id: defect.vessel_id || '', // Ensure this is correctly mapped
        Equipments: defect.Equipments || '',
        Description: defect.Description || '',
        'Action Planned': defect['Action Planned'] || '',
        Criticality: defect.Criticality || '',
        Status: defect.Status || 'OPEN',
        'Date Reported': defect['Date Reported'] || new Date().toISOString().split('T')[0],
        'Date Completed': defect['Date Completed'] || '',
        target_date: defect.target_date || '',
        initial_files: defect.initial_files || [],
        completion_files: defect.completion_files || [],
        raised_by: defect.raised_by || '',
        closure_comments: defect.closure_comments || '',
        external_visibility: typeof defect.external_visibility === 'boolean' ? defect.external_visibility : true,
        Comments: defect.Comments || ''
      });
      setInitialFiles(defect.initial_files || []); // Set existing files
      setClosureFiles(defect.completion_files || []); // Set existing files
      setIsDirty(false); // Reset dirty state on initial load
    } else if (!isOpen) {
      // Reset state when dialog closes
      console.log("DefectDialog: Resetting state on close.");
      setFormData(initialFormData());
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress(0);
      setShowConfirmClose(false);
      setIsDirty(false); // Reset dirty state on close
    }
  }, [isOpen, defect, initialFormData]);

  // Handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setIsDirty(true); // Mark form as dirty on any change
  }, []);

  // Function to check if field is visible
  const isFieldVisible = useCallback((fieldId) => {
    // Placeholder for actual visibility logic based on permissions, defect status, etc.
    // For now, all fields are visible.
    return true;
  }, []);

  // Function to handle silent mode change (placeholder for DB update)
  const handleSilentModeChange = async (checked) => {
    setFormData(prev => ({ ...prev, external_visibility: !checked })); // Note the inversion: checked means hidden
    setIsDirty(true);
    if (!isNew) {
      console.log(`Placeholder: Updating external_visibility to ${!checked} for defect ${defect.id}`);
      toast({
        title: "Info",
        description: `Defect visibility changed locally. DB update is a placeholder.`,
      });
    }
  };

  // Function to check if field is editable
  const isFieldEditable = useCallback((fieldId) => {
    // Placeholder for actual editability logic based on permissions, defect status, etc.
    // For now, all fields are editable.
    return true;
  }, []);

  // Function to get visible fields from section
  const getVisibleFields = useCallback(() => {
    const allFields = Object.entries(DEFECT_FIELDS.DIALOG);
    return allFields
      .filter(([fieldId, field]) => {
        if (!isFieldVisible(fieldId)) return false;
        if (field.conditionalDisplay && !field.conditionalDisplay(formData)) { // Use formData for conditional display
          return false;
        }
        return true;
      })
      .sort((a, b) => a[1].displayOrder - b[1].displayOrder);
  }, [formData, isFieldVisible]); // Depend on formData

  // Function to check if save should be enabled
  const canSave = useCallback(() => {
    // Placeholder for actual save validation logic
    // e.g., return formData.vessel_id && formData.Description && formData.Status;
    return true;
  }, [formData]); // Depend on formData

  // Handle dialog close attempt
  const handleCloseAttempt = () => {
    console.log("DefectDialog: handleCloseAttempt called.");
    if (isDirty || initialFiles.length > 0 || closureFiles.length > 0) { // Check isDirty state
      console.log("DefectDialog: Unsaved changes detected, showing confirmation.");
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
    onClose();
  };

  // Cancel close attempt
  const handleCancelClose = () => {
    console.log("DefectDialog: Cancelled close.");
    setShowConfirmClose(false);
  };

  const validateDefect = (defectData) => {
    // Check dates logic
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

    // Get visible fields and their requirements
    const visibleFields = Object.entries(DEFECT_FIELDS.DIALOG)
      .filter(([fieldId, field]) => {
        if (!isFieldVisible(fieldId)) return false;

        // Check conditional display
        if (field.conditionalDisplay && !field.conditionalDisplay(defectData)) {
          return false;
        }
        return true;
      })
      .filter(([_, field]) => {
        // Check if field is required
        if (field.required) return true;
        if (field.conditionalRequired && field.conditionalRequired(defectData)) {
          return true;
        }
        return false;
      })
      .map(([_, field]) => {
        return field.dbField;
      });

    // Add specific requirements for CLOSED status
    if (defectData['Status'] === 'CLOSED') { // Use 'Status' as per your DIALOG config
      if (!defectData['Date Completed']) {
        toast({
          title: "Required Field Missing",
          description: "Please enter Date Completed for closed defects",
          variant: "destructive",
        });
        return false;
      }
      // closure_comments is conditionally required in DEFECT_FIELDS.DIALOG
      // so it will be included in visibleFields if status is CLOSED
    }

    // Check for missing required fields
    const missing = visibleFields.filter(field => !defectData[field]);

    if (missing.length > 0) {
      // Map field names to more readable labels from DEFECT_FIELDS.DIALOG
      const fieldLabels = Object.values(DEFECT_FIELDS.DIALOG).reduce((acc, field) => {
        acc[field.dbField] = field.label;
        return acc;
      }, {});

      const missingFieldLabels = missing.map(field => fieldLabels[field] || field);

      toast({
        title: "Missing Information",
        description: (
          <div className="space-y-2">
            <p className="text-sm font-medium">Please fill in the following fields:</p>
            <ul className="list-disc pl-4 text-sm space-y-1">
              {missingFieldLabels.map((field, index) => (
                <li key={index} className="text-sm opacity-90">{field}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "subtle",
        className: "bg-[#132337] border border-[#3BADE5]/20 text-white",
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

  // Placeholder for file upload
  const uploadFiles = async (files, defectId, type = 'initial') => {
    console.warn(`Placeholder: Uploading ${files.length} files of type ${type} for defect ${defectId}`);
    setUploadProgress(50); // Simulate progress
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    const uploadedFiles = files.map(file => ({
      name: file.name,
      path: `placeholder/path/${defectId}/${type}/${file.name}`, // Dummy path
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: `https://example.com/placeholder/${defectId}/${type}/${file.name}` // Dummy URL
    }));
    setUploadProgress(100);
    return uploadedFiles;
  };

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

  const handleSave = async () => {
    try {
      console.log("DefectDialog: Starting save operation...");
      setSaving(true);
      setUploadProgress(0);

      // Set default value for external_visibility if not set
      const updatedDefectData = {
        ...formData, // Use formData from internal state
        external_visibility: formData.external_visibility ?? true
      };

      if (!validateDefect(updatedDefectData)) {
        console.log("DefectDialog: Validation failed, exiting save operation");
        setSaving(false);
        return;
      }

      // Upload files if any (using placeholder)
      let uploadedInitialFiles = [];
      let uploadedClosureFiles = [];

      if (initialFiles.length > 0) {
        console.log(`DefectDialog: Uploading ${initialFiles.length} initial files...`);
        uploadedInitialFiles = await uploadFiles(initialFiles, updatedDefectData.id || 'temp', 'initial');
      }

      if (closureFiles.length > 0 && updatedDefectData['Status'] === 'CLOSED') { // Use 'Status'
        console.log(`DefectDialog: Uploading ${closureFiles.length} closure files...`);
        uploadedClosureFiles = await uploadFiles(closureFiles, updatedDefectData.id || 'temp', 'closure');
      }

      // Combine existing and new files
      const finalDefect = {
        ...updatedDefectData,
        initial_files: [
          ...(defect?.initial_files || []), // Use defect prop for existing files
          ...uploadedInitialFiles
        ],
        completion_files: [
          ...(defect?.completion_files || []), // Use defect prop for existing files
          ...uploadedClosureFiles
        ],
        closure_comments: updatedDefectData.closure_comments || '',
        target_date: updatedDefectData.target_date || null
      };

      console.log("DefectDialog: Saving defect to database (via onSave prop)...");
      // Save the defect - IMPORTANT: make sure this returns the saved object with ID
      let savedDefect;
      try {
        savedDefect = await onSave(finalDefect);
        console.log("DefectDialog: Defect saved successfully:", savedDefect?.id);
      } catch (saveError) {
        console.error("DefectDialog: Error saving defect:", saveError);
        throw saveError; // Rethrow to be caught by outer try/catch
      }

      console.log("DefectDialog: Checking if we can generate PDF...");
      console.log("DefectDialog: savedDefect exists:", !!savedDefect);
      console.log("DefectDialog: savedDefect.id exists:", !!savedDefect?.id);

      // Only proceed with PDF generation if we have a valid savedDefect with ID
      if (savedDefect && savedDefect.id) {
        console.log("DefectDialog: Starting PDF generation process for defect:", savedDefect.id);

        try {
          // Define the PDF path (placeholder)
          const pdfPath = `placeholder/defect-reports/${savedDefect.id}.pdf`;
          console.log("DefectDialog: PDF will be saved to (placeholder):", pdfPath);

          // Get signed URLs for file attachments (placeholder)
          console.log("DefectDialog: Getting signed URLs for attachments (placeholder)...");
          const fileSignedUrls = {};
          const filePublicUrls = {};

          // Populate dummy URLs for PDF generation
          (savedDefect.initial_files || []).forEach(f => filePublicUrls[f.path] = f.url);
          (savedDefect.completion_files || []).forEach(f => filePublicUrls[f.path] = f.url);

          // Generate PDF blob (using placeholder)
          console.log("DefectDialog: Calling generateDefectPDF function with (placeholder):", {
            defectId: savedDefect.id,
            vesselName: vessels[savedDefect.vessel_id] || 'Unknown Vessel',
            publicUrlCount: Object.keys(filePublicUrls).length
          });

          let pdfBlob;
          try {
            pdfBlob = await generateDefectPDF(
              {
                ...savedDefect,
                vessel_name: vessels[savedDefect.vessel_id] || 'Unknown Vessel'
              },
              fileSignedUrls, // Placeholder
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

          // Upload the PDF (placeholder)
          console.log("DefectDialog: Preparing to upload PDF (placeholder)...");
          console.log(`DefectDialog: Uploading PDF (${pdfBlob.size} bytes) to (placeholder): ${pdfPath}`);
          // Simulate upload success
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log("DefectDialog: PDF uploaded successfully (placeholder)");

        } catch (pdfError) {
          console.error("DefectDialog: PDF generation or upload failed (placeholder):", pdfError);
          // Continue without failing the save operation
          toast({
            title: "Warning",
            description: "Defect saved, but PDF report generation failed (placeholder).",
            variant: "warning",
          });
        }
      } else {
        console.warn("DefectDialog: Cannot generate PDF - savedDefect or savedDefect.id is missing!");
      }

      // Clear file selections
      setInitialFiles([]);
      setClosureFiles([]);
      setUploadProgress(0);
      setIsDirty(false); // Reset dirty state after successful save

      // Show success message
      toast({
        title: "Success",
        description: isNew ? "Defect added successfully" : "Changes saved successfully",
      });

      // Close the dialog
      onClose();

    } catch (error) {
      console.error("DefectDialog: Error in handleSave:", error);
      toast({
        title: "Error",
        description: "Failed to save defect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if closure file upload should be displayed
  const shouldShowClosureFiles = () => {
    return formData && (formData['Status'] === 'CLOSED' || formData['Status (Vessel)'] === 'CLOSED');
  };

  // Group fields by section
  const groupedFields = getVisibleFields().reduce((acc, [fieldId, field]) => {
    const sectionId = field.section || 'basic'; // Default to 'basic' if no section
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push([fieldId, field]);
    return acc;
  }, {});

  const sortedSections = Object.entries(FIELD_SECTIONS)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([sectionId, section]) => {
      // Only show sections that have visible fields or are conditionally displayed
      if (section.conditionalDisplay && !section.conditionalDisplay(formData)) { // Use formData
        return false;
      }
      return groupedFields[sectionId] && groupedFields[sectionId].length > 0;
    });

  return (
    <>
      {/* Main Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Intercept the close event
            handleCloseAttempt();
            return false; // Prevent default closing behavior
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
                                    ? !formData?.[field.dbField] // Invert for silent mode
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
                                  name={field.dbField} // Add name attribute
                                  value={formData?.[field.dbField] || ''} // Use formData
                                  onChange={handleChange} // Use local handleChange
                                  required={field.required}
                                  disabled={!isEditable}
                                  aria-required={field.required}
                                >
                                  <option value="">Select {field.label}</option>
                                  {field.dbField === 'vessel_id'
                                    ? Object.entries(vessels).map(([id, name]) => (
                                      <option key={id} value={id}>{name}</option>
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
                                name={field.dbField} // Add name attribute
                                value={formData?.[field.dbField] || ''} // Use formData
                                onChange={handleChange} // Use local handleChange
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
                                  name={field.dbField} // Add name attribute
                                  value={formatDateForInput(formData?.[field.dbField])} // Use formData
                                  onChange={handleChange} // Use local handleChange
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
                          // Handle initialFiles and completionFiles separately based on fieldId
                          const isInitialFilesField = fieldId === 'initialFiles';
                          const currentFiles = isInitialFilesField ? initialFiles : closureFiles;
                          const handleFileChange = isInitialFilesField ? handleInitialFileChange : handleClosureFileChange;
                          const removeFile = isInitialFilesField ? removeInitialFile : removeClosureFile;

                          // Only render completionFiles if shouldShowClosureFiles is true
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
                                    disabled={!isEditable}
                                  />
                                </label>
                                {/* Show selected files */}
                                {currentFiles.length > 0 && (
                                  <div className={formStyles.fileList}>
                                    {currentFiles.map((file, index) => (
                                      <div key={index} className={formStyles.fileItem}>
                                        <FileText className={formStyles.fileIcon} />
                                        <span className={formStyles.fileName}>{file.name}</span>
                                        <button
                                          onClick={() => removeFile(index)}
                                          className={formStyles.fileRemoveButton}
                                          disabled={!isEditable}
                                        >
                                          <X className={formStyles.fileRemoveIcon} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Show existing files (from defect object) */}
                                {defect?.[field.dbField]?.length > 0 && (
                                  <div className={formStyles.existingFileList}>
                                    <div className={formStyles.existingFilesHeader}>Existing files:</div>
                                    {defect[field.dbField].map((file, index) => (
                                      <div key={index} className={formStyles.fileItem}>
                                        <FileText className={formStyles.fileIcon} />
                                        <span className={formStyles.fileName}>{file.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );

                        default:
                          // For text/number inputs (default case)
                          return (
                            <div key={fieldId} className={formStyles.formGroup}>
                              <label htmlFor={fieldId} className={formStyles.formLabel}>
                                {field.label} {field.required && <span className={formStyles.required}>*</span>}
                              </label>
                              <input
                                id={fieldId}
                                type={field.type || 'text'} // Default to text if type is not specified
                                className={formStyles.formInput}
                                name={field.dbField} // Add name attribute
                                value={formData?.[field.dbField] || ''} // Use formData
                                onChange={handleChange} // Use local handleChange
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

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className={formStyles.progressBar}>
                  <div
                    className={formStyles.progressBarFill}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogButton
              onClick={handleCloseAttempt}
              disabled={saving}
              variant="cancel"
            >
              Cancel
            </DialogButton>
            {canSave() && (
              <DialogButton
                onClick={handleSave}
                disabled={saving}
                variant="save"
              >
                {saving ? 'Saving...' : (isNew ? 'Add Defect' : 'Save Changes')}
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
                variant="destructive" // Use destructive variant for discard
                className={formStyles.discardButton} // Apply specific discard button style
              >
                Discard Changes
              </DialogButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DefectDialog;