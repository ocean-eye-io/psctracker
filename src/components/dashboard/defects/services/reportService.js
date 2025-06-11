// src/services/reportService.js - Phase 4: Comprehensive Report Management
import { generateDefectPDF } from '../utils/generateDefectPDF'; // Will create this file
import fileService from './fileService';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';

class ReportService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/api`;
  }

  /**
   * PHASE 4: Main method - Generate and download defect report
   * Handles all scenarios: check existing, create new, replace old
   * @param {string} defectId - The defect ID
   * @param {string} userId - Current user ID
   * @param {Object} defectData - Complete defect data (optional, fetched if not provided)
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Report generation result with download URL
   */
  async generateAndDownloadReport(defectId, userId, defectData = null, onProgress = null) {
    console.log(`PHASE 4: Starting comprehensive report generation for defect ${defectId}`);
    
    try {
      // Step 1: Check if report exists (quick check)
      if (onProgress) onProgress(10, 'Checking existing report...');
      
      const existsResult = await this.checkReportExists(defectId, userId);
      console.log(`PHASE 4: Report exists check result:`, existsResult);

      // Step 2: Generate/regenerate report using Lambda endpoint
      if (onProgress) onProgress(30, 'Generating report...');
      
      const reportResult = await this.generateReport(defectId, userId, 'generate');
      console.log(`PHASE 4: Report generation result:`, reportResult);

      if (onProgress) onProgress(90, 'Preparing download...');

      // Step 3: Download the report automatically
      if (reportResult.reportUrl) {
        if (onProgress) onProgress(95, 'Starting download...');
        
        // Extract filename from defect data or use default
        const filename = this.generateReportFilename(defectData);
        
        await this.downloadFromUrl(reportResult.reportUrl, filename);
        
        if (onProgress) onProgress(100, 'Download complete!');
        
        return {
          success: true,
          isNewlyGenerated: reportResult.isNewlyGenerated,
          lastGenerated: reportResult.lastGenerated,
          filename,
          message: reportResult.isNewlyGenerated ? 
            'New report generated and downloaded successfully' : 
            'Updated report generated and downloaded successfully'
        };
      } else {
        throw new Error('No download URL received from report generation');
      }

    } catch (error) {
      console.error('PHASE 4: Error in generateAndDownloadReport:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * PHASE 4: Check if report exists for a defect
   * @param {string} defectId - The defect ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Report existence status
   */
  async checkReportExists(defectId, userId) {
    try {
      const response = await fetch(`${this.apiUrl}/defects/${defectId}/report-exists?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking report existence:', error);
      throw error;
    }
  }

  /**
   * PHASE 4: Generate report using Lambda (create new or replace existing)
   * @param {string} defectId - The defect ID
   * @param {string} userId - User ID
   * @param {string} action - 'generate', 'download', or 'check'
   * @returns {Promise<Object>} Report generation result
   */
  async generateReport(defectId, userId, action = 'generate') {
    try {
      const response = await fetch(`${this.apiUrl}/defects/${defectId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * PHASE 4: Download report from signed URL
   * @param {string} downloadUrl - Signed URL for download
   * @param {string} filename - Filename for download
   */
  async downloadFromUrl(downloadUrl, filename) {
    try {
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`PHASE 4: Successfully downloaded report: ${filename}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  /**
   * PHASE 4: Generate appropriate filename for report
   * @param {Object} defectData - Defect data object
   * @returns {string} Generated filename
   */
  generateReportFilename(defectData) {
    if (!defectData) {
      return `defect-report-${Date.now()}.pdf`;
    }

    const vesselName = (defectData.vessel_name || 'Unknown-Vessel')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const equipment = (defectData.Equipments || 'Unknown-Equipment')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    const defectId = defectData.id || 'unknown';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    return `Defect-Report_${vesselName}_${equipment}_${defectId}_${timestamp}.pdf`;
  }

  /**
   * PHASE 4: Auto-generate report during defect save operations
   * Called from DefectDialog when saving/updating defects
   * @param {Object} defectData - Complete defect data
   * @param {string} userId - User ID
   * @param {boolean} isNewDefect - Whether this is a new defect
   * @returns {Promise<Object>} Generation result (no auto-download)
   */
  async autoGenerateReportOnSave(defectData, userId, isNewDefect = false) {
    console.log(`PHASE 4: Auto-generating report for ${isNewDefect ? 'new' : 'updated'} defect ${defectData.id}`);
    
    try {
      // For defect save operations, we generate but don't auto-download
      // The user can manually download later using the "Generate Report" button
      const reportResult = await this.generateReport(defectData.id, userId, 'generate');
      
      console.log(`PHASE 4: Auto-generation complete for defect ${defectData.id}`, {
        isNewlyGenerated: reportResult.isNewlyGenerated,
        lastGenerated: reportResult.lastGenerated
      });

      return {
        success: true,
        isNewlyGenerated: reportResult.isNewlyGenerated,
        lastGenerated: reportResult.lastGenerated,
        message: isNewDefect ? 
          'Defect saved and report generated' : 
          'Defect updated and report regenerated'
      };

    } catch (error) {
      console.error(`PHASE 4: Error in auto-generating report for defect ${defectData.id}:`, error);
      
      // Don't throw error for auto-generation failures
      // The defect save should still succeed even if report generation fails
      console.warn('PHASE 4: Auto-report generation failed, but defect save will continue');
      
      return {
        success: false,
        error: error.message,
        message: 'Defect saved, but report generation failed'
      };
    }
  }

  /**
   * PHASE 4: Generate PDF locally (client-side) - Alternative method
   * Uses the existing generateDefectPDF utility for offline generation
   * @param {Object} defectData - Complete defect data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Local PDF generation result
   */
  async generatePDFLocally(defectData, userId) {
    console.log('PHASE 4: Starting local PDF generation for defect:', defectData.id);
    
    try {
      // Fetch file download URLs for PDF generation
      const signedUrls = {};
      const publicUrls = {};
      
      // Get download URLs for initial files
      if (defectData.initial_files && defectData.initial_files.length > 0) {
        for (const file of defectData.initial_files) {
          try {
            const downloadData = await fileService.getDownloadUrl(defectData.id, file.id, userId);
            signedUrls[file.s3Key] = downloadData.downloadUrl;
            publicUrls[file.s3Key] = downloadData.downloadUrl; // Same URL for now
          } catch (error) {
            console.warn(`Failed to get download URL for file ${file.id}:`, error);
          }
        }
      }
      
      // Get download URLs for completion files
      if (defectData.completion_files && defectData.completion_files.length > 0) {
        for (const file of defectData.completion_files) {
          try {
            const downloadData = await fileService.getDownloadUrl(defectData.id, file.id, userId);
            signedUrls[file.s3Key] = downloadData.downloadUrl;
            publicUrls[file.s3Key] = downloadData.downloadUrl; // Same URL for now
          } catch (error) {
            console.warn(`Failed to get download URL for file ${file.id}:`, error);
          }
        }
      }

      // Generate PDF using the existing utility
      const pdfBlob = await generateDefectPDF(defectData, signedUrls, publicUrls);
      
      // Create download
      const filename = this.generateReportFilename(defectData).replace('.html', '.pdf');
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('PHASE 4: Local PDF generation completed successfully');
      
      return {
        success: true,
        filename,
        message: 'PDF report generated and downloaded locally'
      };

    } catch (error) {
      console.error('PHASE 4: Error in local PDF generation:', error);
      throw new Error(`Local PDF generation failed: ${error.message}`);
    }
  }

  /**
   * PHASE 4: Bulk report generation for multiple defects
   * @param {Array} defectIds - Array of defect IDs
   * @param {string} userId - User ID
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Bulk generation results
   */
  async generateBulkReports(defectIds, userId, onProgress = null) {
    console.log(`PHASE 4: Starting bulk report generation for ${defectIds.length} defects`);
    
    const results = {
      successful: [],
      failed: [],
      total: defectIds.length
    };

    for (let i = 0; i < defectIds.length; i++) {
      const defectId = defectIds[i];
      
      if (onProgress) {
        const progress = Math.round(((i + 1) / defectIds.length) * 100);
        onProgress(progress, `Processing defect ${i + 1} of ${defectIds.length}`);
      }

      try {
        await this.generateReport(defectId, userId, 'generate');
        results.successful.push(defectId);
        console.log(`PHASE 4: Bulk generation successful for defect ${defectId}`);
      } catch (error) {
        console.error(`PHASE 4: Bulk generation failed for defect ${defectId}:`, error);
        results.failed.push({ defectId, error: error.message });
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`PHASE 4: Bulk generation complete. Success: ${results.successful.length}, Failed: ${results.failed.length}`);
    return results;
  }
}

// Export singleton instance
const reportService = new ReportService();
export default reportService;