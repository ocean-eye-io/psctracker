// src/services/checklistService.js
import apiClient from './apiClient';

class ChecklistService {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Get all checklist templates
   * @returns {Promise<Array>} Array of templates
   */
  async getAvailableTemplates() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/checklist-templates`);
      return response.data;
    } catch (error) {
      console.error('Error fetching checklist templates:', error);
      throw new Error('Failed to fetch checklist templates');
    }
  }

  /**
   * Get specific template with full data
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template with full JSON data
   */
  async getTemplateById(templateId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/checklist-templates/${templateId}`);
      const template = response.data;
      
      // Process the template data for form compatibility
      const processedTemplate = this.processTemplateForForm(template);
      return processedTemplate;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error('Failed to fetch template');
    }
  }

  /**
   * Get checklists for a specific voyage (vessel)
   * @param {string|number} voyageId - Voyage ID from psc_tracker_comments.id
   * @returns {Promise<Array>} Array of checklists
   */
  async getChecklistsForVessel(voyageId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/voyage/${voyageId}/checklists`);
      return this.processChecklistData(response.data);
    } catch (error) {
      console.error('Error fetching checklists for voyage:', error);
      throw new Error('Failed to fetch vessel checklists');
    }
  }

  /**
   * Create checklists for a voyage (auto-create mandatory ones)
   * @param {string|number} voyageId - Voyage ID
   * @param {Object} options - Creation options
   * @returns {Promise<Array>} Created checklists
   */
  async createChecklistsForVoyage(voyageId, options = {}) {
    try {
      console.log('Creating checklists for voyage:', voyageId, 'options:', options);
      
      // Always use auto-create endpoint when no specific template_id is provided
      if (!options.template_id) {
        console.log('Using auto-create endpoint');
        const response = await apiClient.post(`${this.baseUrl}/voyage/${voyageId}/checklists/auto-create`, {
          vessel_name: options.vessel_name || 'Unknown Vessel',
          user_id: options.user_id || 'system'
        });
        return response.data.checklists || [];
      } else {
        console.log('Using single template create endpoint for template:', options.template_id);
        // Create checklist for specific template
        const response = await apiClient.post(`${this.baseUrl}/voyage/${voyageId}/checklists/create`, {
          template_id: options.template_id,
          vessel_name: options.vessel_name || 'Unknown Vessel',
          user_id: options.user_id || 'system'
        });
        return [response.data.checklist];
      }
    } catch (error) {
      console.error('Error creating checklists for voyage:', error);
      
      // Handle 409 conflict error specifically
      if (error.message.includes('409')) {
        console.warn('Checklist already exists, fetching existing checklists instead');
        return await this.getChecklistsForVessel(voyageId);
      }
      
      throw new Error('Failed to create checklists');
    }
  }

  /**
   * Get specific checklist with responses and evidence
   * @param {string} checklistId - Checklist UUID
   * @returns {Promise<Object>} Complete checklist data
   */
  async getChecklistById(checklistId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/checklist/${checklistId}`);
      return this.processChecklistItem(response.data);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      throw new Error('Failed to fetch checklist');
    }
  }

  /**
   * Update checklist responses
   * @param {string} checklistId - Checklist UUID
   * @param {Array} responses - Array of response objects
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async updateChecklistResponses(checklistId, responses, userId) {
    try {
      const response = await apiClient.put(`${this.baseUrl}/checklist/${checklistId}/responses`, {
        responses,
        user_id: userId
      });
      return response.data;
    } catch (error) {
      console.error('Error updating checklist responses:', error);
      throw new Error('Failed to update checklist');
    }
  }

  /**
   * Submit checklist (mark as complete)
   * @param {string} checklistId - Checklist UUID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Submission result
   */
  async submitChecklist(checklistId, userId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/checklist/${checklistId}/submit`, {
        user_id: userId
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting checklist:', error);
      throw new Error('Failed to submit checklist');
    }
  }

  /**
   * Delete a checklist
   * @param {string} checklistId - Checklist UUID
   * @returns {Promise<boolean>} Success status
   */
  async deleteChecklist(checklistId) {
    try {
      await apiClient.delete(`${this.baseUrl}/checklist/${checklistId}`);
      return true;
    } catch (error) {
      console.error('Error deleting checklist:', error);
      throw new Error('Failed to delete checklist');
    }
  }

  /**
   * Process raw checklist data from API
   * @param {Array} rawData - Raw checklist data
   * @returns {Array} Processed checklist data
   */
  processChecklistData(rawData) {
    if (!Array.isArray(rawData)) {
      console.warn('Expected array of checklists, got:', typeof rawData);
      return [];
    }

    return rawData.map(checklist => this.processChecklistItem(checklist));
  }

  /**
   * Process individual checklist item
   * @param {Object} checklist - Raw checklist data
   * @returns {Object} Processed checklist
   */
  processChecklistItem(checklist) {
    return {
      checklist_id: checklist.checklist_id,
      voyage_id: checklist.voyage_id,
      vessel_name: checklist.vessel_name,
      template_id: checklist.template_id,
      template_name: checklist.template_name,
      template_type: checklist.template_type,
      type_code: checklist.type_code,
      type_name: checklist.type_name,
      category: checklist.category,
      status: checklist.status,
      progress_percentage: checklist.progress_percentage || 0,
      items_completed: checklist.items_completed || 0,
      mandatory_items_completed: checklist.mandatory_items_completed || 0,
      total_items: checklist.total_items || 0,
      departure_port: checklist.departure_port,
      arrival_port: checklist.arrival_port,
      eta: checklist.eta,
      etd: checklist.etd,
      due_date: checklist.due_date,
      created_by: checklist.created_by,
      submitted_by: checklist.submitted_by,
      created_at: checklist.created_at,
      updated_at: checklist.updated_at,
      submitted_at: checklist.submitted_at,
      is_complete: checklist.is_complete || checklist.status === 'complete',
      is_urgent: checklist.is_urgent,
      is_overdue: checklist.is_overdue,
      requires_approval: checklist.requires_approval,
      estimated_duration_minutes: checklist.estimated_duration_minutes,
      responses: checklist.responses || [],
      template_data: checklist.template_data || null,
      evidence_summary: checklist.evidence_summary || null
    };
  }

  /**
   * Process template data from nested JSON structure to flat form structure
   * @param {Object} template - Template with nested JSON structure
   * @returns {Object} Processed template for form compatibility
   */
  processTemplateForForm(template) {
    console.log('Processing template:', template);
    
    if (!template) {
      console.warn('Template is null or undefined');
      return {
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: []
      };
    }

    if (!template.template_data) {
      console.warn('Template has no template_data:', template);
      return {
        ...template,
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: []
      };
    }

    const templateData = template.template_data;
    console.log('Template data structure:', templateData);
    
    const items = [];
    const item_types = [];
    const is_mandatory = [];
    const processed_items = [];

    // Process nested sections structure from your database
    if (templateData.sections && Array.isArray(templateData.sections)) {
      console.log('Found sections:', templateData.sections.length);
      
      templateData.sections.forEach((section, sectionIndex) => {
        // Use section_name instead of name based on the actual structure
        const sectionName = section.section_name || section.name || `Section ${sectionIndex}`;
        console.log(`Processing section ${sectionIndex}:`, sectionName);
        
        // Check for subsections (note: lowercase 's' in 'subsections')
        if (section.subsections && Array.isArray(section.subsections)) {
          console.log(`Found ${section.subsections.length} subsections in ${sectionName}`);
          
          section.subsections.forEach((subSection, subSectionIndex) => {
            const subSectionName = subSection.subsection_name || subSection.name || `Subsection ${subSectionIndex}`;
            console.log(`Processing subsection ${subSectionIndex}:`, subSectionName);
            
            if (subSection.items && Array.isArray(subSection.items)) {
              console.log(`Found ${subSection.items.length} items in ${subSectionName}`);
              
              subSection.items.forEach((item, itemIndex) => {
                console.log(`Processing item ${itemIndex}:`, item.item_id, item.check);
                
                const processedItem = {
                  item_id: item.item_id || `${sectionName}_${subSectionName}_${itemIndex}`,
                  section_name: sectionName,
                  sub_section_name: subSectionName,
                  check_description: item.check || item.check_description || '',
                  pic: item.pic || '',
                  guidance: item.guidance || '',
                  response_type: this.determineResponseType(item),
                  is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
                  requires_evidence: item.requires_evidence || false,
                  order_index: processed_items.length
                };

                processed_items.push(processedItem);
                items.push(processedItem.check_description);
                item_types.push(processedItem.response_type);
                is_mandatory.push(processedItem.is_mandatory);
              });
            } else {
              console.log(`Subsection ${subSectionName} has no items or items is not an array:`, subSection.items);
            }
          });
        } 
        // Also check for sub_sections (with underscore) as fallback
        else if (section.sub_sections && Array.isArray(section.sub_sections)) {
          console.log(`Found ${section.sub_sections.length} sub_sections in ${sectionName}`);
          
          section.sub_sections.forEach((subSection, subSectionIndex) => {
            const subSectionName = subSection.sub_section_name || subSection.name || `Subsection ${subSectionIndex}`;
            console.log(`Processing sub_section ${subSectionIndex}:`, subSectionName);
            
            if (subSection.items && Array.isArray(subSection.items)) {
              console.log(`Found ${subSection.items.length} items in ${subSectionName}`);
              
              subSection.items.forEach((item, itemIndex) => {
                console.log(`Processing item ${itemIndex}:`, item.item_id, item.check);
                
                const processedItem = {
                  item_id: item.item_id || `${sectionName}_${subSectionName}_${itemIndex}`,
                  section_name: sectionName,
                  sub_section_name: subSectionName,
                  check_description: item.check || item.check_description || '',
                  pic: item.pic || '',
                  guidance: item.guidance || '',
                  response_type: this.determineResponseType(item),
                  is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
                  requires_evidence: item.requires_evidence || false,
                  order_index: processed_items.length
                };

                processed_items.push(processedItem);
                items.push(processedItem.check_description);
                item_types.push(processedItem.response_type);
                is_mandatory.push(processedItem.is_mandatory);
              });
            } else {
              console.log(`Sub_section ${subSectionName} has no items or items is not an array:`, subSection.items);
            }
          });
        }
        // Check for direct items in section
        else if (section.items && Array.isArray(section.items)) {
          console.log(`Section ${sectionName} has direct items:`, section.items.length);
          
          section.items.forEach((item, itemIndex) => {
            console.log(`Processing direct item ${itemIndex}:`, item.item_id, item.check);
            
            const processedItem = {
              item_id: item.item_id || `${sectionName}_${itemIndex}`,
              section_name: sectionName,
              sub_section_name: null,
              check_description: item.check || item.check_description || '',
              pic: item.pic || '',
              guidance: item.guidance || '',
              response_type: this.determineResponseType(item),
              is_mandatory: item.mandatory !== undefined ? item.mandatory : true,
              requires_evidence: item.requires_evidence || false,
              order_index: processed_items.length
            };

            processed_items.push(processedItem);
            items.push(processedItem.check_description);
            item_types.push(processedItem.response_type);
            is_mandatory.push(processedItem.is_mandatory);
          });
        } else {
          console.log(`Section ${sectionName} has no subsections or direct items:`, section);
        }
      });
    } else {
      console.warn('Template data has no sections or sections is not an array:', templateData);
    }

    console.log('Final processed template items:', processed_items.length);
    console.log('Sample processed items:', processed_items.slice(0, 3));
    
    const result = {
      ...template,
      items,
      item_types,
      is_mandatory,
      processed_items,
      total_items: processed_items.length,
      mandatory_items: processed_items.filter(item => item.is_mandatory).length
    };
    
    console.log('Returning processed template:', result);
    return result;
  }

  /**
   * Determine response type from item structure
   * @param {Object} item - Item from template
   * @returns {string} Response type
   */
  determineResponseType(item) {
    // Check if item has specific response type
    if (item.response_type) {
      return item.response_type;
    }

    // Default logic based on item properties
    if (item.yes_no_na !== undefined) {
      return 'yes_no_na';
    }

    if (item.text_value !== undefined || item.remarks !== undefined) {
      return 'text';
    }

    if (item.date_value !== undefined) {
      return 'date';
    }

    // Default to yes_no_na for most checklist items
    return 'yes_no_na';
  }

  /**
   * Upload evidence for checklist item
   * @param {string} checklistId - Checklist UUID
   * @param {string} itemId - Item ID
   * @param {File} file - File object
   * @param {string} description - Optional description
   * @param {string} uploadedBy - User ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadEvidence(checklistId, itemId, file, description = '', uploadedBy) {
    try {
      // Step 1: Get upload URL
      const uploadUrlResponse = await apiClient.post(
        `${this.baseUrl}/checklist/${checklistId}/evidence/upload-url`,
        {
          item_id: itemId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        }
      );

      const { upload_url, s3_key } = uploadUrlResponse.data;

      // Step 2: Upload to S3
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Step 3: Save metadata
      const metadataResponse = await apiClient.post(
        `${this.baseUrl}/checklist/${checklistId}/evidence`,
        {
          item_id: itemId,
          s3_key,
          original_filename: file.name,
          file_size: file.size,
          file_type: file.type,
          description,
          uploaded_by: uploadedBy
        }
      );

      return metadataResponse.data;
    } catch (error) {
      console.error('Error uploading evidence:', error);
      throw new Error('Failed to upload evidence file');
    }
  }

  /**
   * Get download URL for evidence
   * @param {string} evidenceId - Evidence UUID
   * @returns {Promise<Object>} Download URL and metadata
   */
  async getEvidenceDownloadUrl(evidenceId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/evidence/${evidenceId}/download-url`);
      return response.data;
    } catch (error) {
      console.error('Error getting evidence download URL:', error);
      throw new Error('Failed to get download URL');
    }
  }

  /**
   * Delete evidence file
   * @param {string} evidenceId - Evidence UUID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEvidence(evidenceId) {
    try {
      await apiClient.delete(`${this.baseUrl}/evidence/${evidenceId}`);
      return true;
    } catch (error) {
      console.error('Error deleting evidence:', error);
      throw new Error('Failed to delete evidence');
    }
  }

  /**
   * Calculate completion percentage based on responses
   * @param {Array} responses - Checklist responses
   * @param {number} totalItems - Total number of items
   * @returns {number} Completion percentage (0-100)
   */
  calculateCompletionPercentage(responses, totalItems) {
    if (!responses || !Array.isArray(responses) || totalItems === 0) {
      return 0;
    }

    const completedItems = responses.filter(response => {
      return response.yes_no_na_value !== null || 
             response.text_value?.trim() || 
             response.date_value;
    }).length;

    return Math.round((completedItems / totalItems) * 100);
  }

  /**
   * Validate checklist responses before submission
   * @param {Array} responses - Checklist responses
   * @returns {Object} Validation result
   */
  validateChecklistResponses(responses) {
    const errors = {};
    let isValid = true;

    if (!responses || !Array.isArray(responses)) {
      return { isValid: false, errors: { general: 'Invalid responses data' } };
    }

    responses.forEach((response, index) => {
      const itemKey = `item_${index}`;
      
      if (response.is_mandatory) {
        const hasResponse = response.yes_no_na_value !== null || 
                           response.text_value?.trim() || 
                           response.date_value;
        
        if (!hasResponse) {
          errors[itemKey] = 'This field is required';
          isValid = false;
        }
      }

      // Check evidence requirements
      if (response.requires_evidence && !response.evidence_provided) {
        errors[`${itemKey}_evidence`] = 'Evidence is required for this item';
        isValid = false;
      }
    });

    return { isValid, errors };
  }

  /**
   * Export checklist data to CSV
   * @param {Array} checklists - Array of checklists to export
   * @param {string} filename - Custom filename
   * @returns {void}
   */
  exportChecklistsToCSV(checklists, filename = 'checklists') {
    try {
      if (!checklists || checklists.length === 0) {
        throw new Error('No checklists to export');
      }

      const headers = [
        'Checklist ID',
        'Vessel Name',
        'Template Name',
        'Type',
        'Status',
        'Progress %',
        'Items Completed',
        'Total Items',
        'Departure Port',
        'Arrival Port',
        'ETA',
        'Due Date',
        'Created Date',
        'Submitted Date',
        'Is Overdue',
        'Is Urgent'
      ];

      const csvContent = [
        headers.join(','),
        ...checklists.map(checklist => [
          checklist.checklist_id,
          `"${(checklist.vessel_name || '').replace(/"/g, '""')}"`,
          `"${(checklist.template_name || '').replace(/"/g, '""')}"`,
          checklist.type_code || '',
          checklist.status || '',
          checklist.progress_percentage || 0,
          checklist.items_completed || 0,
          checklist.total_items || 0,
          `"${(checklist.departure_port || '').replace(/"/g, '""')}"`,
          `"${(checklist.arrival_port || '').replace(/"/g, '""')}"`,
          checklist.eta ? new Date(checklist.eta).toLocaleDateString() : '',
          checklist.due_date ? new Date(checklist.due_date).toLocaleDateString() : '',
          checklist.created_at ? new Date(checklist.created_at).toLocaleDateString() : '',
          checklist.submitted_at ? new Date(checklist.submitted_at).toLocaleDateString() : '',
          checklist.is_overdue ? 'Yes' : 'No',
          checklist.is_urgent ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting checklists to CSV:', error);
      throw new Error('Failed to export checklists');
    }
  }

  /**
   * Get summary statistics for vessel reporting
   * @param {Array} vessels - Array of vessels with checklist data
   * @returns {Object} Summary statistics
   */
  getVesselChecklistSummary(vessels) {
    const summary = {
      total_vessels: vessels.length,
      vessels_with_checklists: 0,
      total_checklists: 0,
      completed_checklists: 0,
      overdue_checklists: 0,
      urgent_checklists: 0,
      completion_rate: 0
    };

    vessels.forEach(vessel => {
      if (vessel.checklists && vessel.checklists.length > 0) {
        summary.vessels_with_checklists++;
        summary.total_checklists += vessel.checklists.length;
        
        vessel.checklists.forEach(checklist => {
          if (checklist.status === 'complete') {
            summary.completed_checklists++;
          }
          if (checklist.is_overdue) {
            summary.overdue_checklists++;
          }
          if (checklist.is_urgent) {
            summary.urgent_checklists++;
          }
        });
      }
    });

    if (summary.total_checklists > 0) {
      summary.completion_rate = Math.round(
        (summary.completed_checklists / summary.total_checklists) * 100
      );
    }

    return summary;
  }
}

// Create and export a singleton instance
const checklistService = new ChecklistService();
export default checklistService;