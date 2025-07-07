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
   * Enhanced getTemplateById with comprehensive debugging
   * Add this to your ChecklistService to replace the existing method
   */
  async getTemplateById(templateId) {
    try {
      console.log('=== TEMPLATE FETCH DEBUG ===');
      console.log('1. Fetching template by ID:', templateId);
      console.log('2. API endpoint:', `${this.baseUrl}/checklist-templates/${templateId}`);

      const response = await apiClient.get(`${this.baseUrl}/checklist-templates/${templateId}`);

      console.log('3. API response received:', {
        status: response.status,
        hasData: !!response.data,
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      const template = response.data;

      console.log('4. Raw template analysis:', {
        name: template?.name,
        template_id: template?.template_id,
        template_type: template?.template_type,
        has_template_data: !!template?.template_data,
        template_data_type: typeof template?.template_data,
        template_data_length: typeof template?.template_data === 'string' ?
          template.template_data.length :
          (template?.template_data && typeof template.template_data === 'object' ?
            Object.keys(template.template_data).length : 0)
      });

      // Log a sample of the template_data if it's a string
      if (typeof template?.template_data === 'string') {
        console.log('5. Template data sample (first 200 chars):',
          template.template_data.substring(0, 200) + '...');
      } else if (template?.template_data && typeof template.template_data === 'object') {
        console.log('5. Template data object keys:', Object.keys(template.template_data));
      }

      // Process the template data for form compatibility
      const processedTemplate = this.processTemplateForForm(template);

      console.log('6. Processed template result:', {
        has_processed_items: !!processedTemplate.processed_items,
        processed_items_count: processedTemplate.processed_items?.length || 0,
        has_error: !!processedTemplate.error,
        error: processedTemplate.error
      });

      return processedTemplate;
    } catch (error) {
      console.error('=== TEMPLATE FETCH ERROR ===');
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        url: error.config?.url
      });
      throw new Error('Failed to fetch template: ' + error.message);
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
   * Update checklist responses - ENHANCED VERSION with proper error handling
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
        // FIXED: Improved logic to detect responses with actual values
        const hasStandardValue = r.yes_no_na_value !== null && r.yes_no_na_value !== undefined ||
          (r.text_value !== null && r.text_value !== undefined && r.text_value.trim() !== '') ||
          r.date_value !== null && r.date_value !== undefined;

        const hasTableData = r.table_data && Array.isArray(r.table_data) && r.table_data.length > 0;

        const hasRemarks = r.remarks !== null && r.remarks !== undefined && r.remarks.trim() !== '';

        const hasAnyValue = hasStandardValue || hasTableData || hasRemarks;

        if (!hasAnyValue) {
          console.log(`Filtering out response without values for item: ${r.item_id}`);
        }

        return hasAnyValue;
      });

      console.log('ChecklistService: Sending', responsesWithValues.length, 'responses with values out of', uniqueResponses.length, 'total');

      if (responsesWithValues.length === 0) {
        console.warn('ChecklistService: No responses with values to save');
        return {
          message: 'No responses with values to save',
          summary: { created: 0, updated: 0, total_processed: 0 },
          checklist_status: null
        };
      }

      // ENHANCED: Validate and clean each response
      const validatedResponses = responsesWithValues.map((response, index) => {
        if (!response.item_id) {
          throw new Error(`Response at index ${index} is missing item_id`);
        }

        // Clean and validate the response object
        const cleanedResponse = {
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

        // FIXED: Properly handle table_data
        if (response.table_data) {
          if (Array.isArray(response.table_data)) {
            cleanedResponse.table_data = response.table_data;
          } else {
            console.warn(`Invalid table_data for item ${response.item_id}, converting to array`);
            cleanedResponse.table_data = [];
          }
        }

        return cleanedResponse;
      });

      console.log('ChecklistService: Validated responses sample:', validatedResponses.slice(0, 3));

      // Prepare the request body
      const requestBody = {
        responses: validatedResponses,
        user_id: userId
      };

      console.log('ChecklistService: Making API call to:', `${this.baseUrl}/checklist/${checklistId}/responses`);
      console.log('ChecklistService: Request summary:', {
        responsesCount: requestBody.responses.length,
        user_id: requestBody.user_id,
        sampleResponse: requestBody.responses[0]
      });

      // ✅ REAL API CALL
      const response = await apiClient.put(`${this.baseUrl}/checklist/${checklistId}/responses`, requestBody);

      console.log('ChecklistService: API response received:', {
        status: response.status,
        summary: response.data?.summary,
        checklist_status: response.data?.checklist_status,
        sample_responses: response.data?.sample_responses
      });

      // FIXED: Enhanced response validation
      if (response && response.data) {
        const result = response.data;

        // Validate that the save actually worked
        if (result.summary && result.summary.total_processed > 0) {
          console.log('ChecklistService: Save confirmed successful:', {
            created: result.summary.created,
            updated: result.summary.updated,
            total_processed: result.summary.total_processed,
            progress: result.checklist_status?.progress_percentage
          });

          return result;
        } else {
          console.warn('ChecklistService: Save may have failed - no items processed');
          return result;
        }
      } else {
        throw new Error('Empty or invalid response from server');
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
        throw new Error('Invalid request data. Please check your responses and try again.');
      } else if (error.response?.status === 404) {
        throw new Error('Checklist not found or has been deleted.');
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
   * FIXED processTemplateForForm method - handles both structures
   * Replace your existing method with this one
   */
  processTemplateForForm(template) {
    console.log('=== PROCESSING TEMPLATE ===');
    console.log('Template name:', template?.name);
    console.log('Template type:', template?.template_type);

    if (!template) {
      console.error('❌ No template provided');
      return {
        name: 'Unknown Template',
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: [],
        template_id: null,
        template_type: null,
        error: 'No template provided'
      };
    }

    // Get template_data
    let templateData = template.template_data;
    console.log('Template data type:', typeof templateData);

    // Parse JSON string if needed
    if (typeof templateData === 'string') {
      try {
        console.log('🔄 Parsing JSON string...');
        templateData = JSON.parse(templateData);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError.message);
        return {
          ...template,
          items: [],
          item_types: [],
          is_mandatory: [],
          processed_items: [],
          error: 'Invalid JSON in template_data: ' + parseError.message
        };
      }
    }

    if (!templateData) {
      console.error('❌ No template_data found');
      return {
        ...template,
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: [],
        error: 'Template data is missing'
      };
    }

    console.log('Template data keys:', Object.keys(templateData));

    // Validate sections exist
    if (!templateData.sections || !Array.isArray(templateData.sections)) {
      console.error('❌ No sections array found');
      return {
        ...template,
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: [],
        error: 'Template sections are missing or invalid'
      };
    }

    console.log('✅ Found sections:', templateData.sections.length);

    const processed_items = [];
    let itemCounter = 0;
    const seenItemIds = new Set();

    // Process each section
    templateData.sections.forEach((section, sectionIndex) => {
      const sectionName = section.section_name || section.name || `Section ${sectionIndex + 1}`;
      console.log(`📂 Processing section: "${sectionName}"`);

      // FIXED: Handle both structures
      if (section.fields && Array.isArray(section.fields)) {
        // Structure 1: sections → fields (5-Day Checklist)
        console.log(`  📝 Found ${section.fields.length} fields`);

        section.fields.forEach((field, fieldIndex) => {
          const processedItem = this.processField(field, sectionName, null, itemCounter++, seenItemIds);
          if (processedItem) {
            processed_items.push(processedItem);
          }
        });

      } else if (section.subsections && Array.isArray(section.subsections)) {
        // Structure 2: sections → subsections → items (PSC Template)
        console.log(`  📁 Found ${section.subsections.length} subsections`);

        section.subsections.forEach((subsection, subsectionIndex) => {
          const subsectionName = subsection.subsection_name || subsection.name || `Subsection ${subsectionIndex + 1}`;
          console.log(`    📋 Processing subsection: "${subsectionName}"`);

          if (subsection.items && Array.isArray(subsection.items)) {
            console.log(`      📝 Found ${subsection.items.length} items`);

            subsection.items.forEach((item, itemIndex) => {
              const processedItem = this.processItem(item, sectionName, subsectionName, itemCounter++, seenItemIds);
              if (processedItem) {
                processed_items.push(processedItem);
              }
            });
          } else {
            console.warn(`    ⚠️  Subsection "${subsectionName}" has no items`);
          }
        });

      } else {
        console.warn(`  ⚠️  Section "${sectionName}" has neither fields nor subsections`);
      }
    });

    console.log('✅ Processing complete:', {
      sectionsCount: templateData.sections.length,
      processedItemsCount: processed_items.length,
      uniqueItemIds: seenItemIds.size
    });

    if (processed_items.length === 0) {
      console.error('❌ No items were processed');
      return {
        ...template,
        items: [],
        item_types: [],
        is_mandatory: [],
        processed_items: [],
        error: 'No items could be processed from template'
      };
    }

    // Generate legacy arrays for compatibility
    const items = processed_items.map(item => item.description);
    const item_types = processed_items.map(item => item.response_type);
    const is_mandatory = processed_items.map(item => item.is_mandatory);

    const result = {
      ...template,
      items,
      item_types,
      is_mandatory,
      processed_items,
      total_items: processed_items.length,
      mandatory_items: processed_items.filter(item => item.is_mandatory).length
    };

    console.log('=== TEMPLATE PROCESSING COMPLETE ===');
    console.log(`✅ Processed ${result.total_items} items (${result.mandatory_items} mandatory)`);

    return result;
  }

  /**
   * NEW: Process field (for 5-Day Checklist structure)
   */
  processField(field, sectionName, subsectionName, orderIndex, seenItemIds) {
    if (!field.field_id) {
      console.warn('⚠️  Field missing field_id, generating one');
      field.field_id = `field_${orderIndex}`;
    }

    if (seenItemIds.has(field.field_id)) {
      console.warn(`⚠️  Duplicate field_id: ${field.field_id}`);
      return null;
    }

    seenItemIds.add(field.field_id);

    return {
      item_id: field.field_id,
      section_name: sectionName,
      sub_section_name: subsectionName,
      description: field.label || field.description || `Field ${field.field_id}`,
      check_description: field.label || field.description || `Check ${field.field_id}`,
      pic: field.pic || '',
      guidance: field.guidance || field.placeholder || '',
      response_type: this.mapFieldTypeToResponseType(field.field_type || 'text'),
      is_mandatory: Boolean(field.is_mandatory),
      requires_evidence: Boolean(field.requires_evidence),
      order_index: orderIndex,
      table_structure: field.field_type === 'table' ?
        this.validateTableStructure(field.table_structure) : null,
      field_type: field.field_type || 'text'
    };
  }

  /**
   * NEW: Process item (for PSC Template structure)
   */
  processItem(item, sectionName, subsectionName, orderIndex, seenItemIds) {
    if (!item.item_id) {
      console.warn('⚠️  Item missing item_id, generating one');
      item.item_id = `item_${orderIndex}`;
    }

    if (seenItemIds.has(item.item_id)) {
      console.warn(`⚠️  Duplicate item_id: ${item.item_id}`);
      return null;
    }

    seenItemIds.add(item.item_id);

    return {
      item_id: item.item_id,
      section_name: sectionName,
      sub_section_name: subsectionName,
      description: item.description || `Item ${item.item_id}`,
      check_description: item.description || `Check ${item.item_id}`,
      pic: item.pic || '',
      guidance: item.guidance || '',
      response_type: item.response_type || 'yes_no_na',
      is_mandatory: Boolean(item.is_mandatory),
      requires_evidence: Boolean(item.requires_evidence),
      order_index: orderIndex,
      sr_no: item.sr_no || orderIndex + 1,
      evidence_types: item.evidence_types || [],
      field_type: item.response_type || 'yes_no_na'
    };
  }

  /**
   * FIXED: Enhanced field type mapping
   */
  mapFieldTypeToResponseType(field_type) {
    if (!field_type) {
      console.warn('ChecklistService: No field_type provided, defaulting to text');
      return 'text';
    }

    const mapping = {
      'text': 'text',
      'textarea': 'text',
      'date': 'date',
      'datetime': 'date',
      'yes_no': 'yes_no_na',
      'boolean': 'yes_no_na',
      'number': 'text',
      'integer': 'text',
      'decimal': 'text',
      'table': 'table',
      'file': 'text', // Files handled separately via evidence
      'select': 'text',
      'radio': 'yes_no_na',
      'checkbox': 'yes_no_na'
    };

    const responseType = mapping[field_type.toLowerCase()] || 'text';

    if (!mapping[field_type.toLowerCase()]) {
      console.warn(`ChecklistService: Unknown field_type: ${field_type}, defaulting to text`);
    }

    return responseType;
  }

  /**
   * NEW: Validate table structure for table fields
   */
  validateTableStructure(tableStructure) {
    if (!tableStructure) {
      console.warn('ChecklistService: Table field has no table_structure');
      return null;
    }

    try {
      // Ensure it has the required structure
      if (!tableStructure.columns || !Array.isArray(tableStructure.columns)) {
        console.warn('ChecklistService: Table structure missing columns array');
        return {
          columns: [
            { field_id: 'item', label: 'Item', type: 'text' },
            { field_id: 'status', label: 'Status', type: 'yes_no' }
          ]
        };
      }

      // Validate each column
      const validatedColumns = tableStructure.columns.map((col, index) => ({
        field_id: col.field_id || `col_${index}`,
        label: col.label || `Column ${index + 1}`,
        type: col.type || 'text',
        required: Boolean(col.required),
        width: col.width || null
      }));

      return {
        ...tableStructure,
        columns: validatedColumns
      };

    } catch (error) {
      console.error('ChecklistService: Error validating table structure:', error);
      return null;
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

  /**
   * Debug function to test template fetching
   * Call this from browser console: checklistService.debugTemplateAccess()
   */
  async debugTemplateAccess() {
    try {
      console.log('=== TEMPLATE ACCESS DEBUG ===');

      // 1. Test getting all templates
      console.log('1. Testing get all templates...');
      const templates = await this.getAvailableTemplates();
      console.log('Available templates:', templates.map(t => ({
        id: t.template_id,
        name: t.name,
        type: t.template_type,
        active: t.is_active
      })));

      if (templates.length === 0) {
        console.error('❌ No templates found!');
        return;
      }

      // 2. Test fetching each template individually
      for (const template of templates) {
        console.log(`\n2. Testing template: ${template.name} (${template.template_id})`);
        try {
          const fullTemplate = await this.getTemplateById(template.template_id);
          console.log(`✅ Template ${template.name} processed successfully:`, {
            items_count: fullTemplate.processed_items?.length || 0,
            has_error: !!fullTemplate.error
          });

          if (fullTemplate.error) {
            console.error(`❌ Template ${template.name} has error:`, fullTemplate.error);
          }
        } catch (err) {
          console.error(`❌ Failed to fetch template ${template.name}:`, err.message);
        }
      }

      console.log('=== TEMPLATE DEBUG COMPLETE ===');
    } catch (error) {
      console.error('Template debug failed:', error);
    }
  }

  /**
   * Debug function to check a specific checklist's template
   * Call this from browser console: checklistService.debugChecklistTemplate(checklistId)
   */
  async debugChecklistTemplate(checklistId) {
    try {
      console.log('=== CHECKLIST TEMPLATE DEBUG ===');
      console.log('1. Fetching checklist:', checklistId);

      const checklist = await this.getChecklistById(checklistId);
      console.log('2. Checklist data:', {
        template_id: checklist.template_id,
        template_name: checklist.template_name,
        responses_count: checklist.responses?.length || 0
      });

      if (checklist.template_id) {
        console.log('3. Fetching template for checklist...');
        const template = await this.getTemplateById(checklist.template_id);
        console.log('4. Template result:', {
          name: template.name,
          processed_items_count: template.processed_items?.length || 0,
          error: template.error
        });

        if (template.processed_items && template.processed_items.length > 0) {
          console.log('5. Sample template items:',
            template.processed_items.slice(0, 3).map(item => ({
              id: item.item_id,
              description: item.description.substring(0, 50) + '...',
              type: item.response_type,
              section: item.section_name
            }))
          );
        }
      }

      console.log('=== CHECKLIST TEMPLATE DEBUG COMPLETE ===');
    } catch (error) {
      console.error('Checklist template debug failed:', error);
    }
  }
}

// Create and export a singleton instance
const checklistService = new ChecklistService();
export default checklistService;