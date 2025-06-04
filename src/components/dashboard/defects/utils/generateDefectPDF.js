// src/utils/generateDefectPDF.js - Complete Phase 4 Implementation
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a comprehensive PDF report for a defect with multiple strategies based on file size
 * Phase 4: Complete implementation with enhanced formatting and professional styling
 * @param {Object} defect - The defect data object
 * @param {Object} signedUrls - Map of file paths to signed URLs
 * @param {Object} publicUrls - Map of file paths to public URLs (optional)
 * @returns {Blob} - PDF as a blob
 */
export const generateDefectPDF = async (defect, signedUrls = {}, publicUrls = {}) => {
  try {
    console.log('Phase 4: Generating comprehensive PDF for defect:', defect.id);
    
    // If publicUrls isn't provided, use signedUrls as fallback
    if (!publicUrls || Object.keys(publicUrls).length === 0) {
      publicUrls = { ...signedUrls };
    }
    
    // Strategy 1: Try with embedded images first using medium compression
    try {
      console.log('Phase 4: Attempting PDF generation with embedded images (medium compression)...');
      const pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, publicUrls, 'MEDIUM');
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`Phase 4: PDF with embedded images (medium compression): ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        console.log('Phase 4: Using embedded images with medium compression strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Phase 4: Error generating PDF with embedded images (medium compression):', error);
    }
    
    // Strategy 2: Try with embedded images with high compression
    try {
      console.log('Phase 4: Attempting PDF generation with embedded images (high compression)...');
      const pdfBlob = await generatePDFWithEmbeddedImages(defect, signedUrls, publicUrls, 'FAST');
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`Phase 4: PDF with embedded images (high compression): ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        console.log('Phase 4: Using embedded images with high compression strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Phase 4: Error generating PDF with embedded images (high compression):', error);
    }
    
    // Strategy 3: Use mixed approach (embed some, link others)
    try {
      console.log('Phase 4: Attempting PDF generation with mixed approach...');
      const pdfBlob = await generatePDFWithMixedApproach(defect, signedUrls, publicUrls);
      const fileSizeMB = pdfBlob.size / (1024 * 1024);
      
      console.log(`Phase 4: PDF with mixed approach: ${fileSizeMB.toFixed(2)}MB`);
      
      if (fileSizeMB <= 10) {
        console.log('Phase 4: Using mixed approach strategy');
        return pdfBlob;
      }
    } catch (error) {
      console.error('Phase 4: Error generating PDF with mixed approach:', error);
    }
    
    // Strategy 4: Last resort - all linked images
    try {
      console.log('Phase 4: Attempting PDF generation with all linked images (fallback)...');
      const pdfBlob = await generatePDFWithLinkedImages(defect, publicUrls);
      console.log(`Phase 4: PDF with linked images generated, size: ${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB`);
      console.log('Phase 4: Using linked images strategy (fallback)');
      return pdfBlob;
    } catch (error) {
      console.error('Phase 4: Error generating PDF with linked images:', error);
      throw new Error(`Failed to generate PDF with any strategy: ${error.message}`);
    }
  } catch (error) {
    console.error('Phase 4: Error in generateDefectPDF:', error);
    throw error;
  }
};

/**
 * Generate PDF with embedded images - Phase 4: Enhanced professional formatting
 */
const generatePDFWithEmbeddedImages = async (defect, signedUrls, publicUrls, compressionLevel = 'MEDIUM') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Phase 4: Enhanced Header with professional styling
  addProfessionalHeader(doc, defect);

  // Phase 4: Enhanced Basic Information Table
  let currentY = addBasicInformationSection(doc, defect, 25);

  // Phase 4: Enhanced Initial Assessment Table
  currentY = addInitialAssessmentSection(doc, defect, currentY + 5);

  // Phase 4: Enhanced Closure Information (if applicable)
  if (isDefectClosed(defect)) {
    currentY = addClosureInformationSection(doc, defect, currentY + 5);
  }

  // Phase 4: Enhanced File Sections with embedded images
  currentY = await addFileSections(doc, defect, signedUrls, publicUrls, currentY + 5, compressionLevel, 'embedded');

  // Phase 4: Enhanced Footer
  addProfessionalFooter(doc, defect);

  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF with linked images (fallback for large defects)
 */
const generatePDFWithLinkedImages = async (defect, publicUrls) => {
  const doc = new jsPDF();

  // Phase 4: Enhanced Header with size constraint note
  addProfessionalHeader(doc, defect, true);

  // Phase 4: Basic sections
  let currentY = addBasicInformationSection(doc, defect, 30);
  currentY = addInitialAssessmentSection(doc, defect, currentY + 5);
  
  if (isDefectClosed(defect)) {
    currentY = addClosureInformationSection(doc, defect, currentY + 5);
  }

  // Phase 4: File sections with links only
  currentY = await addFileSections(doc, defect, {}, publicUrls, currentY + 5, 'FAST', 'linked');

  // Phase 4: Enhanced Footer
  addProfessionalFooter(doc, defect);

  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF with mixed approach - embed some images, link others
 */
const generatePDFWithMixedApproach = async (defect, signedUrls, publicUrls) => {
  const MAX_IMAGES_TO_EMBED = 4;
  const doc = new jsPDF();

  // Phase 4: Process files to determine which to embed vs link
  const processedFiles = processFilesForMixedApproach(defect, MAX_IMAGES_TO_EMBED);

  // Phase 4: Enhanced Header with mixed approach note
  addProfessionalHeader(doc, defect, false, true);

  // Phase 4: Basic sections
  let currentY = addBasicInformationSection(doc, defect, 30);
  currentY = addInitialAssessmentSection(doc, defect, currentY + 5);
  
  if (isDefectClosed(defect)) {
    currentY = addClosureInformationSection(doc, defect, currentY + 5);
  }

  // Phase 4: Mixed file sections
  currentY = await addMixedFileSections(doc, processedFiles, signedUrls, publicUrls, currentY + 5);

  // Phase 4: Enhanced Footer
  addProfessionalFooter(doc, defect);

  return new Promise((resolve, reject) => {
    try {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Phase 4: Add professional header with FleetWatch branding
 */
const addProfessionalHeader = (doc, defect, isLinkedVersion = false, isMixedVersion = false) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Main title
  doc.setFontSize(20);
  doc.setTextColor(44, 123, 229);
  doc.setFont('helvetica', 'bold');
  doc.text('FleetWatch Defect Report', pageWidth / 2, 15, { align: 'center' });
  
  // Vessel name subtitle
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${defect.vessel_name || 'Unknown Vessel'}`, pageWidth / 2, 22, { align: 'center' });
  
  // Version indicator
  if (isLinkedVersion) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Note: Images available via links due to file size constraints', pageWidth / 2, 27, { align: 'center' });
  } else if (isMixedVersion) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Note: Some images are available via links due to file size constraints', pageWidth / 2, 27, { align: 'center' });
  }
  
  // Header line
  doc.setDrawColor(44, 123, 229);
  doc.setLineWidth(0.5);
  doc.line(15, isLinkedVersion || isMixedVersion ? 30 : 25, pageWidth - 15, isLinkedVersion || isMixedVersion ? 30 : 25);
};

/**
 * Phase 4: Add enhanced basic information section
 */
const addBasicInformationSection = (doc, defect, startY) => {
  const tableData = [
    ['Defect ID', defect.id || '-'],
    ['Vessel', defect.vessel_name || defect.vesselName || 'Unknown'],
    ['Equipment', defect.Equipments || '-'],
    ['Status', getStatusBadgeText(defect.Status || defect.Status_Vessel || '-')],
    ['Criticality', getCriticalityBadgeText(defect.Criticality || '-')],
    ['Date Reported', formatDate(defect['Date Reported'] || defect.Date_Reported)],
    ['Target Date', formatDate(defect.target_date)],
    ['Date Completed', formatDate(defect['Date Completed'] || defect.Date_Completed)],
    ['Defect Source', defect.raised_by || '-']
  ];

  doc.autoTable({
    startY: startY,
    head: [['Basic Information', '']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [44, 123, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [44, 123, 229],
      fontSize: 11
    },
    columnStyles: {
      0: { 
        cellWidth: 40,
        fontStyle: 'bold',
        fillColor: [245, 249, 255],
        textColor: [44, 123, 229]
      },
      1: { 
        cellWidth: 'auto',
        textColor: [60, 60, 60]
      }
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255]
    }
  });

  return doc.lastAutoTable.finalY;
};

/**
 * Phase 4: Add enhanced initial assessment section
 */
const addInitialAssessmentSection = (doc, defect, startY) => {
  const tableData = [
    ['Description', defect.Description || '-'],
    ['Action Planned', defect['Action Planned'] || defect.Action_Planned || '-'],
    ['Initial Comments', defect.Comments || '-']
  ];

  doc.autoTable({
    startY: startY,
    head: [['Initial Assessment', '']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [44, 123, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [44, 123, 229],
      fontSize: 11
    },
    columnStyles: {
      0: { 
        cellWidth: 40,
        fontStyle: 'bold',
        fillColor: [245, 249, 255],
        textColor: [44, 123, 229]
      },
      1: { 
        cellWidth: 'auto',
        textColor: [60, 60, 60]
      }
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255]
    }
  });

  return doc.lastAutoTable.finalY;
};

/**
 * Phase 4: Add enhanced closure information section
 */
const addClosureInformationSection = (doc, defect, startY) => {
  const tableData = [
    ['Closure Comments', defect.closure_comments || '-'],
    ['Closure Date', formatDate(defect['Date Completed'] || defect.Date_Completed)]
  ];

  doc.autoTable({
    startY: startY,
    head: [['Closure Information', '']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [76, 175, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [76, 175, 80],
      fontSize: 11
    },
    columnStyles: {
      0: { 
        cellWidth: 40,
        fontStyle: 'bold',
        fillColor: [245, 252, 245],
        textColor: [76, 175, 80]
      },
      1: { 
        cellWidth: 'auto',
        textColor: [60, 60, 60]
      }
    },
    alternateRowStyles: {
      fillColor: [250, 255, 250]
    }
  });

  return doc.lastAutoTable.finalY;
};

/**
 * Phase 4: Add comprehensive file sections with multiple strategies
 */
const addFileSections = async (doc, defect, signedUrls, publicUrls, startY, compressionLevel, strategy) => {
  let currentY = startY;

  // Add Initial Documentation
  if (defect.initial_files?.length > 0) {
    currentY = await addFileSection(
      doc, 
      'Initial Documentation', 
      defect.initial_files, 
      signedUrls, 
      publicUrls, 
      currentY, 
      compressionLevel, 
      strategy,
      [255, 193, 7] // Orange theme for initial files
    );
  }

  // Add Completion Documentation
  if (defect.completion_files?.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 15;
    }
    currentY = await addFileSection(
      doc, 
      'Completion Documentation', 
      defect.completion_files, 
      signedUrls, 
      publicUrls, 
      currentY + 10, 
      compressionLevel, 
      strategy,
      [76, 175, 80] // Green theme for completion files
    );
  }

  return currentY;
};

/**
 * Phase 4: Add individual file section with enhanced formatting
 */
const addFileSection = async (doc, title, files, signedUrls, publicUrls, startY, compressionLevel, strategy, themeColor) => {
  let currentY = startY;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;

  // Section header
  doc.setFontSize(12);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`${title} (${files.length} files)`, margin, currentY);
  currentY += 8;

  // Filter files by type
  const imageFiles = files.filter(file => file?.type?.startsWith('image/'));
  const documentFiles = files.filter(file => {
    const isDocument = 
      file?.type === 'application/pdf' || 
      file?.type === 'application/msword' ||
      file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return isDocument;
  });

  // Handle images based on strategy
  if (imageFiles.length > 0) {
    if (strategy === 'embedded') {
      currentY = await addEmbeddedImages(doc, imageFiles, signedUrls, currentY, compressionLevel);
    } else {
      currentY = addLinkedImages(doc, imageFiles, publicUrls, currentY);
    }
  }

  // Handle documents (always as links)
  if (documentFiles.length > 0) {
    currentY = addDocumentLinks(doc, documentFiles, publicUrls, currentY);
  }

  return currentY;
};

/**
 * Phase 4: Add embedded images with professional layout
 */
const addEmbeddedImages = async (doc, imageFiles, signedUrls, startY, compressionLevel) => {
  let currentY = startY;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  const spacing = 5;
  const imageWidth = (pageWidth - 2 * margin - spacing) / 2;
  const imageHeight = 50;

  for (let i = 0; i < imageFiles.length; i += 2) {
    // Check if we need a new page
    if (currentY + imageHeight + 15 > doc.internal.pageSize.height) {
      doc.addPage();
      currentY = 15;
    }

    try {
      // First image
      const file1 = imageFiles[i];
      const imageUrl1 = signedUrls[file1.s3Key] || signedUrls[file1.path];
      
      if (imageUrl1) {
        try {
          await addImageToDoc(doc, imageUrl1, margin, currentY, imageWidth, imageHeight, compressionLevel);
          addImageCaption(doc, file1.name || file1.originalName || 'Unknown', margin, currentY + imageHeight, imageWidth);
        } catch (imgError) {
          addImagePlaceholder(doc, margin, currentY, imageWidth, imageHeight, 'Image Unavailable');
        }
      }

      // Second image (if available)
      if (imageFiles[i + 1]) {
        const file2 = imageFiles[i + 1];
        const imageUrl2 = signedUrls[file2.s3Key] || signedUrls[file2.path];
        
        if (imageUrl2) {
          try {
            await addImageToDoc(doc, imageUrl2, margin + imageWidth + spacing, currentY, imageWidth, imageHeight, compressionLevel);
            addImageCaption(doc, file2.name || file2.originalName || 'Unknown', margin + imageWidth + spacing, currentY + imageHeight, imageWidth);
          } catch (imgError) {
            addImagePlaceholder(doc, margin + imageWidth + spacing, currentY, imageWidth, imageHeight, 'Image Unavailable');
          }
        }
      }

      currentY += imageHeight + 15;
    } catch (error) {
      console.error('Phase 4: Error processing images:', error);
      currentY += 10;
    }
  }

  return currentY;
};

/**
 * Phase 4: Add linked images with professional formatting
 */
const addLinkedImages = (doc, imageFiles, publicUrls, startY) => {
  let currentY = startY;

  doc.setFontSize(10);
  doc.setTextColor(44, 123, 229);
  doc.setFont('helvetica', 'bold');
  doc.text('Images:', 20, currentY);
  currentY += 6;

  imageFiles.forEach((file) => {
    const text = `📷 ${file.name || file.originalName || 'Unknown'}`;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 255);
    doc.setFont('helvetica', 'normal');
    currentY += 4;
    
    doc.text(text, 25, currentY);
    
    const url = publicUrls[file.s3Key] || publicUrls[file.path];
    if (url) {
      doc.link(25, currentY - 3, doc.getTextWidth(text), 5, { url });
    }
  });

  return currentY + 5;
};

/**
 * Phase 4: Add document links with professional formatting
 */
const addDocumentLinks = (doc, documentFiles, publicUrls, startY) => {
  let currentY = startY;

  doc.setFontSize(10);
  doc.setTextColor(44, 123, 229);
  doc.setFont('helvetica', 'bold');
  doc.text('Documents:', 20, currentY);
  currentY += 6;

  documentFiles.forEach((file) => {
    const icon = getDocumentIcon(file.name || file.originalName || '');
    const text = `${icon} ${file.name || file.originalName || 'Unknown'}`;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 255);
    doc.setFont('helvetica', 'normal');
    currentY += 4;
    
    doc.text(text, 25, currentY);
    
    const url = publicUrls[file.s3Key] || publicUrls[file.path];
    if (url) {
      doc.link(25, currentY - 3, doc.getTextWidth(text), 5, { url });
    }
  });

  return currentY + 5;
};

/**
 * Phase 4: Add mixed file sections (embedded + linked)
 */
const addMixedFileSections = async (doc, processedFiles, signedUrls, publicUrls, startY) => {
  let currentY = startY;

  // Add Initial Documentation
  if (processedFiles.initial.embeddedFiles.length > 0 || processedFiles.initial.linkedFiles.length > 0) {
    currentY = await addMixedFileSection(
      doc, 
      'Initial Documentation', 
      processedFiles.initial, 
      signedUrls, 
      publicUrls, 
      currentY,
      [255, 193, 7]
    );
  }

  // Add Completion Documentation
  if (processedFiles.completion.embeddedFiles.length > 0 || processedFiles.completion.linkedFiles.length > 0) {
    if (currentY > doc.internal.pageSize.height - 60) {
      doc.addPage();
      currentY = 15;
    }
    currentY = await addMixedFileSection(
      doc, 
      'Completion Documentation', 
      processedFiles.completion, 
      signedUrls, 
      publicUrls, 
      currentY + 10,
      [76, 175, 80]
    );
  }

  return currentY;
};

/**
 * Phase 4: Add mixed file section (some embedded, some linked)
 */
const addMixedFileSection = async (doc, title, fileGroups, signedUrls, publicUrls, startY, themeColor) => {
  let currentY = startY;

  // Section header
  doc.setFontSize(12);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setFont('helvetica', 'bold');
  const totalFiles = fileGroups.embeddedFiles.length + fileGroups.linkedFiles.length;
  doc.text(`${title} (${totalFiles} files)`, 15, currentY);
  currentY += 8;

  // Add embedded files
  if (fileGroups.embeddedFiles.length > 0) {
    currentY = await addEmbeddedImages(doc, fileGroups.embeddedFiles.filter(f => f?.type?.startsWith('image/')), signedUrls, currentY, 'FAST');
    currentY = addDocumentLinks(doc, fileGroups.embeddedFiles.filter(f => !f?.type?.startsWith('image/')), publicUrls, currentY);
  }

  // Add linked files
  if (fileGroups.linkedFiles.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Additional Files (via links):', 20, currentY);
    currentY += 6;
    
    currentY = addLinkedImages(doc, fileGroups.linkedFiles.filter(f => f?.type?.startsWith('image/')), publicUrls, currentY);
  }

  return currentY;
};

/**
 * Phase 4: Add professional footer with metadata
 */
const addProfessionalFooter = (doc, defect) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 20;

  // Footer line
  doc.setDrawColor(44, 123, 229);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  // Footer content
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  
  // Left side - Generation info
  const generationInfo = `Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`;
  doc.text(generationInfo, 15, footerY);
  
  // Center - System info
  doc.text('FleetWatch Defect Management System', pageWidth / 2, footerY, { align: 'center' });
  
  // Right side - Defect info
  const defectInfo = `Defect ID: ${defect.id} | Version: 1.0`;
  doc.text(defectInfo, pageWidth - 15, footerY, { align: 'right' });
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to format date as dd/mm/yyyy
 */
const formatDate = (dateString) => {
  try {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '-';
  }
};

/**
 * Check if defect is closed
 */
const isDefectClosed = (defect) => {
  const status = defect.Status || defect.Status_Vessel || '';
  return status.toUpperCase() === 'CLOSED';
};

/**
 * Get status badge text with indicator
 */
const getStatusBadgeText = (status) => {
  if (!status || status === '-') return '-';
  
  const statusUpper = status.toUpperCase();
  if (statusUpper.includes('OPEN')) return '🔴 OPEN';
  if (statusUpper.includes('CLOSED')) return '🟢 CLOSED';
  if (statusUpper.includes('PROGRESS')) return '🟡 IN PROGRESS';
  return status;
};

/**
 * Get criticality badge text with indicator
 */
const getCriticalityBadgeText = (criticality) => {
  if (!criticality || criticality === '-') return '-';
  
  const criticalityLower = criticality.toLowerCase();
  if (criticalityLower.includes('high')) return '🔴 HIGH';
  if (criticalityLower.includes('medium')) return '🟡 MEDIUM';
  if (criticalityLower.includes('low')) return '🔵 LOW';
  return criticality;
};

/**
 * Get document icon based on file type
 */
const getDocumentIcon = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf') return '📄';
  if (ext === 'doc' || ext === 'docx') return '📝';
  if (ext === 'xls' || ext === 'xlsx') return '📊';
  return '📎';
};

/**
 * Process files for mixed approach
 */
const processFilesForMixedApproach = (defect, maxEmbedded) => {
  const processFileGroup = (files) => {
    if (!files?.length) return { embeddedFiles: [], linkedFiles: [] };
    
    const imageFiles = files.filter(file => file?.type?.startsWith('image/'));
    const documentFiles = files.filter(file => {
      const isDocument = 
        file?.type === 'application/pdf' || 
        file?.type === 'application/msword' ||
        file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return isDocument;
    });
    
    const embeddedImageFiles = imageFiles.slice(0, maxEmbedded);
    const linkedImageFiles = imageFiles.slice(maxEmbedded);
    
    return {
      embeddedFiles: [...embeddedImageFiles, ...documentFiles], 
      linkedFiles: linkedImageFiles
    };
  };

  return {
    initial: processFileGroup(defect.initial_files),
    completion: processFileGroup(defect.completion_files)
  };
};

/**
 * Add image to document with error handling
 */
const addImageToDoc = async (doc, imageUrl, x, y, width, height, compressionLevel) => {
  try {
    // Add placeholder first
    addImagePlaceholder(doc, x, y, width, height, 'Loading...');
    
    // Try to add the actual image
    doc.addImage(
      imageUrl,
      'JPEG',
      x,
      y,
      width,
      height,
      undefined,
      compressionLevel,
      0
    );
  } catch (error) {
    console.error('Error adding image to PDF:', error);
    addImagePlaceholder(doc, x, y, width, height, 'Image Unavailable');
  }
};

/**
 * Add image placeholder
 */
const addImagePlaceholder = (doc, x, y, width, height, text) => {
  // Gray placeholder background
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y, width, height, 'F');
  
  // Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(x, y, width, height);
  
  // Placeholder text
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(text, x + width/2, y + height/2, { align: 'center' });
};

/**
 * Add image caption
 */
const addImageCaption = (doc, filename, x, y, width) => {
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const truncatedName = filename.length > 25 ? filename.substring(0, 22) + '...' : filename;
  doc.text(truncatedName, x + width/2, y + 8, { align: 'center' });
};

/**
 * Enhanced error handling for image loading
 */
const loadImageWithRetry = async (imageUrl, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      console.error(`Image load attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

/**
 * Calculate optimal image dimensions
 */
const calculateImageDimensions = (originalWidth, originalHeight, maxWidth, maxHeight) => {
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);
  
  return {
    width: originalWidth * ratio,
    height: originalHeight * ratio
  };
};

/**
 * Enhanced file size estimation
 */
const estimatePDFSize = (defect, strategy) => {
  let estimatedSize = 50; // Base PDF size in KB
  
  // Add size for text content
  const textContent = [
    defect.Description,
    defect['Action Planned'] || defect.Action_Planned,
    defect.Comments,
    defect.closure_comments
  ].join(' ');
  
  estimatedSize += textContent.length / 100; // Rough text size estimation
  
  // Add size for images based on strategy
  const totalImages = (defect.initial_files || []).filter(f => f?.type?.startsWith('image/')).length +
                     (defect.completion_files || []).filter(f => f?.type?.startsWith('image/')).length;
  
  if (strategy === 'embedded') {
    estimatedSize += totalImages * 200; // ~200KB per embedded image
  } else if (strategy === 'mixed') {
    estimatedSize += Math.min(totalImages, 4) * 200; // Embed up to 4 images
    estimatedSize += Math.max(0, totalImages - 4) * 5; // Links for the rest
  } else {
    estimatedSize += totalImages * 5; // ~5KB per linked image
  }
  
  return estimatedSize;
};

/**
 * Validate defect data for PDF generation
 */
const validateDefectData = (defect) => {
  if (!defect) {
    throw new Error('Defect data is required');
  }
  
  if (!defect.id) {
    throw new Error('Defect ID is required');
  }
  
  // Ensure we have at least basic information
  const requiredFields = ['vessel_name', 'Equipments', 'Description'];
  const missingFields = requiredFields.filter(field => !defect[field]);
  
  if (missingFields.length > 0) {
    console.warn('Some defect fields are missing:', missingFields);
  }
  
  return true;
};

/**
 * Generate PDF metadata
 */
const generatePDFMetadata = (defect) => {
  return {
    title: `Defect Report - ${defect.id}`,
    subject: `${defect.vessel_name || 'Unknown Vessel'} - ${defect.Equipments || 'Equipment Defect'}`,
    author: 'FleetWatch System',
    creator: 'FleetWatch Defect Management',
    producer: 'jsPDF',
    keywords: [
      'defect',
      'report',
      defect.vessel_name,
      defect.Equipments,
      defect.Criticality
    ].filter(Boolean).join(', ')
  };
};

/**
 * Apply PDF metadata
 */
const applyPDFMetadata = (doc, defect) => {
  const metadata = generatePDFMetadata(defect);
  
  doc.setProperties({
    title: metadata.title,
    subject: metadata.subject,
    author: metadata.author,
    creator: metadata.creator,
    producer: metadata.producer,
    keywords: metadata.keywords
  });
};

/**
 * Main export function with comprehensive error handling and validation
 */
export const generateComprehensiveDefectPDF = async (defect, signedUrls = {}, publicUrls = {}) => {
  try {
    console.log('Phase 4: Starting comprehensive PDF generation for defect:', defect.id);
    
    // Validate input data
    validateDefectData(defect);
    
    // Generate PDF with strategy selection
    const pdfBlob = await generateDefectPDF(defect, signedUrls, publicUrls);
    
    console.log(`Phase 4: PDF generation completed successfully. Size: ${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB`);
    
    return pdfBlob;
  } catch (error) {
    console.error('Phase 4: Comprehensive PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Utility function to download PDF directly
 */
export const downloadDefectPDF = async (defect, signedUrls = {}, publicUrls = {}, filename = null) => {
  try {
    const pdfBlob = await generateComprehensiveDefectPDF(defect, signedUrls, publicUrls);
    
    // Generate filename if not provided
    const downloadFilename = filename || generatePDFFilename(defect);
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`Phase 4: PDF downloaded successfully: ${downloadFilename}`);
    return { success: true, filename: downloadFilename, size: pdfBlob.size };
  } catch (error) {
    console.error('Phase 4: PDF download failed:', error);
    throw error;
  }
};

/**
 * Generate appropriate filename for PDF
 */
const generatePDFFilename = (defect) => {
  const vesselName = (defect.vessel_name || 'Unknown-Vessel')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const equipment = (defect.Equipments || 'Unknown-Equipment')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  
  const defectId = defect.id || 'unknown';
  const timestamp = new Date().toISOString().slice(0, 10);
  
  return `Defect-Report_${vesselName}_${equipment}_${defectId}_${timestamp}.pdf`;
};

/**
 * Generate PDF preview (smaller version for quick viewing)
 */
export const generateDefectPDFPreview = async (defect) => {
  try {
    console.log('Phase 4: Generating PDF preview for defect:', defect.id);
    
    const doc = new jsPDF();
    
    // Add basic header
    addProfessionalHeader(doc, defect);
    
    // Add only basic information (no files)
    let currentY = addBasicInformationSection(doc, defect, 25);
    currentY = addInitialAssessmentSection(doc, defect, currentY + 5);
    
    if (isDefectClosed(defect)) {
      addClosureInformationSection(doc, defect, currentY + 5);
    }
    
    // Add file summary instead of actual files
    addFileSummary(doc, defect, currentY + 10);
    
    // Add footer
    addProfessionalFooter(doc, defect);
    
    const pdfBlob = doc.output('blob');
    console.log(`Phase 4: PDF preview generated. Size: ${(pdfBlob.size / 1024).toFixed(2)}KB`);
    
    return pdfBlob;
  } catch (error) {
    console.error('Phase 4: PDF preview generation failed:', error);
    throw error;
  }
};

/**
 * Add file summary for preview
 */
const addFileSummary = (doc, defect, startY) => {
  const initialFiles = defect.initial_files || [];
  const completionFiles = defect.completion_files || [];
  
  if (initialFiles.length === 0 && completionFiles.length === 0) {
    return;
  }
  
  doc.setFontSize(12);
  doc.setTextColor(44, 123, 229);
  doc.setFont('helvetica', 'bold');
  doc.text('File Summary', 15, startY);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  let summaryY = startY + 8;
  
  if (initialFiles.length > 0) {
    doc.text(`• Initial Files: ${initialFiles.length} files`, 20, summaryY);
    summaryY += 5;
  }
  
  if (completionFiles.length > 0) {
    doc.text(`• Completion Files: ${completionFiles.length} files`, 20, summaryY);
    summaryY += 5;
  }
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Full file details available in complete report', 20, summaryY + 3);
};

// Export the main functions
export { };