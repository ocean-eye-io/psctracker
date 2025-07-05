// src/services/checklistService.js - FIXED VERSION
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
      console.log('ChecklistService: Fetching template by ID:', templateId);
      const response = await apiClient.get(`${this.baseUrl}/checklist-templates/${templateId}`);
      const template = response.data;

      console.log('ChecklistService: Raw template received:', template);

      // Process the template data for form compatibility
      const processedTemplate = this.processTemplateForForm(template);
      console.log('ChecklistService: Processed template:', processedTemplate);
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
      console.log('ChecklistService: Fetching checklist by ID:', checklistId);

      // REAL API CALL to your Lambda
      const response = await apiClient.get(`${this.baseUrl}/checklist/${checklistId}`);
      console.log('ChecklistService: Raw checklist received:', response.data);

      const processedChecklist = this.processChecklistItem(response.data);
      console.log('ChecklistService: Processed checklist:', processedChecklist);
      return processedChecklist;

    } catch (error) {
      console.error('Error fetching checklist:', error);
      throw new Error('Failed to fetch checklist');
    }
  }

  /**
   * Update checklist responses - ENHANCED VERSION with duplicate handling
   * @param {string} checklistId - Checklist UUID
   * @param {Array} responses - Array of response objects
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Update result
   */
  async updateChecklistResponses(checklistId, responses, userId = 'system') {
    try {
      console.log('ChecklistService: updateChecklistResponses called with:');
      console.log('  checklistId:', checklistId);
      console.log('  responses count:', responses?.length);
      console.log('  userId:', userId);

      // Validation
      if (!checklistId) {
        throw new Error('Checklist ID is required');
      }

      if (!responses || !Array.isArray(responses)) {
        console.error('ChecklistService: Invalid responses data');
        throw new Error('Responses must be an array');
      }

      // Remove duplicates and filter responses with values
      const uniqueResponses = [];
      const seenItemIds = new Set();

      for (let i = responses.length - 1; i >= 0; i--) {
        const response = responses[i];
        if (response.item_id && !seenItemIds.has(response.item_id)) {
          seenItemIds.add(response.item_id);
          uniqueResponses.unshift(response);
        } else if (response.item_id) {
          console.warn(`Duplicate item_id found and removed: ${response.item_id}`);
        } else {
          console.warn('Response without item_id found and removed:', response);
        }
      }

      console.log(`ChecklistService: Deduplicated responses from ${responses.length} to ${uniqueResponses.length}`);

      const responsesWithValues = uniqueResponses.filter(r => {
        const hasValue = r.yes_no_na_value !== null ||
          r.text_value !== null ||
          r.date_value !== null ||
          (r.remarks !== null && r.remarks !== '');

        if (!hasValue) {
          console.log(`Filtering out response without values for item: ${r.item_id}`);
        }

        return hasValue;
      });

      console.log('ChecklistService: Sending', responsesWithValues.length, 'responses with values out of', uniqueResponses.length, 'total');

      // ENHANCED: Validate each response has required fields
      const validatedResponses = responsesWithValues.map((response, index) => {
        // Ensure required fields are present
        if (!response.item_id) {
          throw new Error(`Response at index ${index} is missing item_id`);
        }

        // Clean and validate the response object
        return {
          item_id: response.item_id,
          sr_no: response.sr_no || index + 1,
          section: response.section || 'GENERAL',
          subsection: response.subsection || null,
          check_description: response.check_description || '',
          pic: response.pic || '',
          response_type: response.response_type || 'yes_no_na',
          yes_no_na_value: response.yes_no_na_value || null,
          text_value: response.text_value || null,
          date_value: response.date_value || null,
          remarks: response.remarks || null,
          guidance: response.guidance || '',
          is_mandatory: Boolean(response.is_mandatory),
          requires_evidence: Boolean(response.requires_evidence)
        };
      });

      console.log('ChecklistService: Validated responses sample:', validatedResponses.slice(0, 3));

      // Prepare the request body exactly as your Lambda expects
      const requestBody = {
        responses: validatedResponses,
        user_id: userId
      };

      console.log('ChecklistService: Making REAL API call to:', `${this.baseUrl}/checklist/${checklistId}/responses`);
      console.log('ChecklistService: Request body summary:', {
        responsesCount: requestBody.responses.length,
        user_id: requestBody.user_id,
        sampleResponse: requestBody.responses[0]
      });

      // ✅ REAL API CALL to your Lambda
      const response = await apiClient.put(`${this.baseUrl}/checklist/${checklistId}/responses`, requestBody);

      console.log('ChecklistService: REAL API response received:', response);

      // Enhanced response validation
      if (response && response.data) {
        console.log('ChecklistService: Update successful:', {
          summary: response.data.summary,
          checklist_status: response.data.checklist_status
        });
        return response.data;
      } else if (response) {
        console.log('ChecklistService: Update successful (legacy format):', response);
        return response;
      } else {
        throw new Error('Empty response from server');
      }

    } catch (error) {
      console.error('ChecklistService: Error updating checklist responses:', error);
      console.error('ChecklistService: Error details:', {
        message: error.message,
        status: error.response?.status,
        response: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });

      // Provide more specific error messages
      if (error.response?.status === 400) {
        throw new Error('Invalid request data. Please check your responses.');
      } else if (error.response?.status === 404) {
        throw new Error('Checklist not found.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to update this checklist.');
      } else if (error.response?.status === 409) {
        throw new Error('Conflict: Another user may be editing this checklist.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to update checklist responses: ' + error.message);
      }
    }
  }

  /**
   * Submit checklist (mark as complete) - FIXED VERSION
   * @param {string} checklistId - Checklist UUID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} Submission result
   */
  async submitChecklist(checklistId, userId = 'system') {
    try {
      console.log('ChecklistService: Submitting checklist:', checklistId, 'by user:', userId);

      // ✅ REAL API CALL
      const response = await apiClient.post(`${this.baseUrl}/checklist/${checklistId}/submit`, {
        user_id: userId
      });

      console.log('ChecklistService: Submit successful:', response);
      return response.data || response;

    } catch (error) {
      console.error('Error submitting checklist:', error);
      throw new Error('Failed to submit checklist: ' + error.message);
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
   * Fixed processTemplateForForm method to handle your JSON structure
   * Add this to your ChecklistService class
   */
  processTemplateForForm(template) {
    console.log('ChecklistService: Processing template for form:', template?.name || template?.template_name);

    if (!template || !template.template_data) {
      return {
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: []
      };
    }

    const templateData = template.template_data;
    const processed_items = [];
    let itemCounter = 0;
    const seenItemIds = new Set();

    if (templateData.sections && Array.isArray(templateData.sections)) {
      console.log('ChecklistService: Found sections:', templateData.sections.length);

      templateData.sections.forEach((section, sectionIndex) => {
        const sectionName = section.section_name || section.name || `Section ${sectionIndex}`;
        console.log(`ChecklistService: Processing section ${sectionIndex}:`, sectionName);

        if (section.fields && Array.isArray(section.fields)) {
          console.log(`ChecklistService: Section ${sectionName} has fields:`, section.fields.length);

          section.fields.forEach((field, fieldIndex) => {
            if (!field.field_id) {
              console.warn('ChecklistService: Field missing field_id:', field);
              return;
            }

            if (seenItemIds.has(field.field_id)) {
              console.warn(`ChecklistService: Duplicate field_id found: ${field.field_id} (skipping)`);
              return;
            }
            seenItemIds.add(field.field_id);

            console.log(`ChecklistService: Processing field ${itemCounter}:`, field.field_id, field.label?.substring(0, 50));

            // INCLUDE TABLE FIELDS NOW - don't skip them
            const processedItem = {
              item_id: field.field_id,
              section_name: sectionName, // Use the actual section name
              sub_section_name: null,
              description: field.label || '',
              check_description: field.label || field.description || '',
              pic: field.pic || '',
              guidance: field.guidance || field.placeholder || '',
              response_type: this.mapFieldTypeToResponseType(field.field_type),
              is_mandatory: field.is_mandatory !== undefined ? field.is_mandatory : true,
              requires_evidence: field.requires_evidence || false,
              order_index: itemCounter++,
              // ADD TABLE STRUCTURE FOR TABLE FIELDS
              table_structure: field.field_type === 'table' ? field.table_structure : null
            };

            processed_items.push(processedItem);
          });
        }
      });
    }

    console.log('ChecklistService: Final processed template items:', processed_items.length);
    console.log('ChecklistService: Items by section:', 
      processed_items.reduce((acc, item) => {
        acc[item.section_name] = (acc[item.section_name] || 0) + 1;
        return acc;
      }, {})
    );

    const items = processed_items.map(item => item.description);
    const item_types = processed_items.map(item => item.response_type);
    const is_mandatory = processed_items.map(item => item.is_mandatory);

    return {
      ...template,
      items,
      item_types,
      is_mandatory,
      processed_items,
      total_items: processed_items.length,
      mandatory_items: processed_items.filter(item => item.is_mandatory).length,
      unique_items: seenItemIds.size
    };
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
   * New helper method to map your field_type to response_type
   */
  mapFieldTypeToResponseType(field_type) {
    switch (field_type) {
      case 'text':
        return 'text';
      case 'date':
        return 'date';
      case 'yes_no':
        return 'yes_no_na';
      case 'number':
        return 'text'; // Numbers can be handled as text inputs
      case 'table':
        return 'table'; // Special handling needed
      default:
        console.warn(`ChecklistService: Unknown field_type: ${field_type}, defaulting to text`);
        return 'text';
    }
  }

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

  async getEvidenceDownloadUrl(evidenceId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/evidence/${evidenceId}/download-url`);
      return response.data;
    } catch (error) {
      console.error('Error getting evidence download URL:', error);
      throw new Error('Failed to get download URL');
    }
  }

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
   * Enhanced method to calculate completion percentage with duplicate handling
   */
  calculateCompletionPercentage(responses, totalItems) {
    if (!responses || !Array.isArray(responses) || totalItems === 0) {
      return 0;
    }

    // Remove duplicates by response_id or item_id
    const uniqueResponses = [];
    const seenItems = new Set();

    responses.forEach(response => {
      const key = response.item_id || response.response_id;
      if (key && !seenItems.has(key)) {
        seenItems.add(key);
        uniqueResponses.push(response);
      }
    });

    const completedItems = uniqueResponses.filter(response => {
      return response.yes_no_na_value !== null ||
        response.text_value?.trim() ||
        response.date_value;
    }).length;

    const percentage = Math.round((completedItems / totalItems) * 100);

    console.log('ChecklistService: Completion calculation:', {
      originalResponses: responses.length,
      uniqueResponses: uniqueResponses.length,
      completedItems,
      totalItems,
      percentage
    });

    return percentage;
  }

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
