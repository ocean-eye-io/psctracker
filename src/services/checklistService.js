// src/services/checklistService.js - OPTIMIZED VERSION
import apiClient from './apiClient';

class ChecklistService {
  constructor() {
    this.baseUrl = '/api';
    
    // Add caching for performance
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    // Add request deduplication
    this.pendingRequests = new Map();
    
    // Response type mapping (pre-computed for performance)
    this.FIELD_TYPE_MAPPING = Object.freeze({
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
      'file': 'text',
      'select': 'text',
      'radio': 'yes_no_na',
      'checkbox': 'yes_no_na'
    });
  }

  // Cache utilities
  _getCacheKey(method, ...args) {
    return `${method}:${args.join(':')}`;
  }

  _isExpired(key) {
    const expiry = this.cacheExpiry.get(key);
    return !expiry || Date.now() > expiry;
  }

  _setCache(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  _getCache(key) {
    if (this._isExpired(key)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  // Request deduplication
  async _dedupedRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Get all checklist templates with caching
   */
  async getAvailableTemplates() {
    const cacheKey = this._getCacheKey('templates');
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    return this._dedupedRequest(cacheKey, async () => {
      try {
        const response = await apiClient.get(`${this.baseUrl}/checklist-templates`);
        this._setCache(cacheKey, response.data);
        return response.data;
      } catch (error) {
        this._handleError(error, 'Failed to fetch checklist templates');
      }
    });
  }

  /**
   * Optimized template fetching with better error handling
   */
  async getTemplateById(templateId) {
    if (!templateId) {
      throw new Error('Template ID is required');
    }

    const cacheKey = this._getCacheKey('template', templateId);
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    return this._dedupedRequest(cacheKey, async () => {
      try {
        const response = await apiClient.get(`${this.baseUrl}/checklist-templates/${templateId}`);
        const processedTemplate = this._processTemplateForForm(response.data);
        this._setCache(cacheKey, processedTemplate);
        return processedTemplate;
      } catch (error) {
        this._handleError(error, `Failed to fetch template ${templateId}`);
      }
    });
  }

  /**
   * Get checklists for vessel with caching
   */
  async getChecklistsForVessel(voyageId) {
    if (!voyageId) {
      throw new Error('Voyage ID is required');
    }

    const cacheKey = this._getCacheKey('voyage-checklists', voyageId);
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(`${this.baseUrl}/voyage/${voyageId}/checklists`);
      const processed = this._processChecklistData(response.data);
      this._setCache(cacheKey, processed);
      return processed;
    } catch (error) {
      this._handleError(error, 'Failed to fetch vessel checklists');
    }
  }

  /**
   * Optimized checklist creation with conflict handling
   */
  async createChecklistsForVoyage(voyageId, options = {}) {
    if (!voyageId) {
      throw new Error('Voyage ID is required');
    }

    try {
      let response;
      
      if (!options.template_id) {
        response = await apiClient.post(`${this.baseUrl}/voyage/${voyageId}/checklists/auto-create`, {
          vessel_name: options.vessel_name || 'Unknown Vessel',
          user_id: options.user_id || 'system'
        });
        return response.data.checklists || [];
      } else {
        response = await apiClient.post(`${this.baseUrl}/voyage/${voyageId}/checklists/create`, {
          template_id: options.template_id,
          vessel_name: options.vessel_name || 'Unknown Vessel',
          user_id: options.user_id || 'system'
        });
        return [response.data.checklist];
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Conflict - checklist exists, fetch existing ones
        return this.getChecklistsForVessel(voyageId);
      }
      this._handleError(error, 'Failed to create checklists');
    }
  }

  /**
   * Optimized checklist fetching
   */
  async getChecklistById(checklistId) {
    if (!checklistId) {
      throw new Error('Checklist ID is required');
    }

    const cacheKey = this._getCacheKey('checklist', checklistId);
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get(`${this.baseUrl}/checklist/${checklistId}`);
      const processed = this._processChecklistItem(response.data);
      this._setCache(cacheKey, processed);
      return processed;
    } catch (error) {
      this._handleError(error, 'Failed to fetch checklist');
    }
  }

  /**
   * Optimized response updates with validation and deduplication
   */
  async updateChecklistResponses(checklistId, responses, userId = 'system') {
    if (!checklistId) {
      throw new Error('Checklist ID is required');
    }

    if (!Array.isArray(responses)) {
      throw new Error('Responses must be an array');
    }

    try {
      // Optimize response processing
      const processedResponses = this._optimizeResponses(responses);
      
      if (processedResponses.length === 0) {
        return {
          message: 'No responses with values to save',
          summary: { created: 0, updated: 0, total_processed: 0 }
        };
      }

      const requestBody = {
        responses: processedResponses,
        user_id: userId
      };

      const response = await apiClient.put(
        `${this.baseUrl}/checklist/${checklistId}/responses`, 
        requestBody
      );

      // Clear cache for this checklist
      this._clearChecklistCache(checklistId);

      return response.data;
    } catch (error) {
      this._handleError(error, 'Failed to update checklist responses', error.response?.status);
    }
  }

  /**
   * Optimized checklist submission with retry logic
   */
  async submitChecklist(checklistId, userId = 'system', forceOverwrite = true) {
    if (!checklistId) {
      throw new Error('Checklist ID is required');
    }

    try {
      const response = await apiClient.post(`${this.baseUrl}/checklist/${checklistId}/submit`, {
        user_id: userId,
        force_overwrite: forceOverwrite
      });

      // Clear cache
      this._clearChecklistCache(checklistId);

      return response.data;
    } catch (error) {
      if (error.response?.status === 409 && forceOverwrite) {
        // Handle conflict by returning current status
        try {
          const currentChecklist = await this.getChecklistById(checklistId);
          return {
            message: 'Checklist already submitted',
            checklist: {
              checklist_id: checklistId,
              status: currentChecklist.status || 'submitted',
              submitted_at: currentChecklist.submitted_at || new Date().toISOString(),
              submitted_by: currentChecklist.submitted_by || userId,
              progress_percentage: 100
            },
            already_submitted: true
          };
        } catch (fetchError) {
          // Fallback response
          return {
            message: 'Checklist submission completed',
            checklist: {
              checklist_id: checklistId,
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              submitted_by: userId,
              progress_percentage: 100
            },
            already_submitted: true
          };
        }
      }
      this._handleError(error, 'Failed to submit checklist', error.response?.status);
    }
  }

  /**
   * Delete checklist with cache cleanup
   */
  async deleteChecklist(checklistId) {
    if (!checklistId) {
      throw new Error('Checklist ID is required');
    }

    try {
      await apiClient.delete(`${this.baseUrl}/checklist/${checklistId}`);
      this._clearChecklistCache(checklistId);
      return true;
    } catch (error) {
      this._handleError(error, 'Failed to delete checklist');
    }
  }

  // PRIVATE OPTIMIZATION METHODS

  /**
   * Optimized response processing with deduplication and validation
   */
  _optimizeResponses(responses) {
    const responseMap = new Map();
    
    // Process in reverse to keep latest values, then deduplicate
    for (let i = responses.length - 1; i >= 0; i--) {
      const response = responses[i];
      
      if (!response.item_id) continue;
      
      if (!responseMap.has(response.item_id)) {
        const hasValue = this._hasValidValue(response);
        
        if (hasValue) {
          responseMap.set(response.item_id, this._cleanResponse(response, i));
        }
      }
    }

    return Array.from(responseMap.values());
  }

  /**
   * Check if response has valid value (optimized)
   */
  _hasValidValue(response) {
    return !!(
      (response.yes_no_na_value !== null && response.yes_no_na_value !== undefined) ||
      (response.text_value && response.text_value.trim()) ||
      response.date_value ||
      (response.table_data && Array.isArray(response.table_data) && response.table_data.length > 0) ||
      (response.remarks && response.remarks.trim())
    );
  }

  /**
   * Clean and validate response object (optimized)
   */
  _cleanResponse(response, index) {
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
      requires_evidence: Boolean(response.requires_evidence),
      table_data: Array.isArray(response.table_data) ? response.table_data : undefined
    };
  }

  /**
   * Optimized template processing with better error handling
   */
  _processTemplateForForm(template) {
    if (!template) {
      return this._createErrorTemplate('No template provided');
    }

    let templateData = template.template_data;

    // Parse JSON if needed
    if (typeof templateData === 'string') {
      try {
        templateData = JSON.parse(templateData);
      } catch (parseError) {
        return this._createErrorTemplate('Invalid JSON in template_data');
      }
    }

    if (!templateData?.sections || !Array.isArray(templateData.sections)) {
      return this._createErrorTemplate('Template sections are missing or invalid');
    }

    const processedItems = [];
    const seenItemIds = new Set();
    let itemCounter = 0;

    // Process sections efficiently
    templateData.sections.forEach((section, sectionIndex) => {
      const sectionName = section.section_name || section.name || `Section ${sectionIndex + 1}`;

      if (section.fields && Array.isArray(section.fields)) {
        // Handle fields structure
        section.fields.forEach(field => {
          const item = this._processField(field, sectionName, null, itemCounter++, seenItemIds);
          if (item) processedItems.push(item);
        });
      } else if (section.subsections && Array.isArray(section.subsections)) {
        // Handle subsections structure
        section.subsections.forEach(subsection => {
          const subsectionName = subsection.subsection_name || subsection.name || 'Subsection';
          
          if (subsection.items && Array.isArray(subsection.items)) {
            subsection.items.forEach(item => {
              const processedItem = this._processItem(item, sectionName, subsectionName, itemCounter++, seenItemIds);
              if (processedItem) processedItems.push(processedItem);
            });
          }
        });
      }
    });

    if (processedItems.length === 0) {
      return this._createErrorTemplate('No items could be processed from template');
    }

    // Generate legacy arrays for compatibility
    const items = processedItems.map(item => item.description);
    const itemTypes = processedItems.map(item => item.response_type);
    const isMandatory = processedItems.map(item => item.is_mandatory);

    return {
      ...template,
      items,
      item_types: itemTypes,
      is_mandatory: isMandatory,
      processed_items: processedItems,
      total_items: processedItems.length,
      mandatory_items: processedItems.filter(item => item.is_mandatory).length
    };
  }

  /**
   * Create error template (helper)
   */
  _createErrorTemplate(errorMessage) {
    return {
      name: 'Error Template',
      items: [],
      item_types: [],
      is_mandatory: [],
      processed_items: [],
      template_id: null,
      template_type: null,
      error: errorMessage
    };
  }

  /**
   * Process field (optimized)
   */
  _processField(field, sectionName, subsectionName, orderIndex, seenItemIds) {
    const fieldId = field.field_id || `field_${orderIndex}`;
    
    if (seenItemIds.has(fieldId)) return null;
    seenItemIds.add(fieldId);

    return {
      item_id: fieldId,
      section_name: sectionName,
      sub_section_name: subsectionName,
      description: field.label || field.description || `Field ${fieldId}`,
      check_description: field.label || field.description || `Check ${fieldId}`,
      pic: field.pic || '',
      guidance: field.guidance || field.placeholder || '',
      response_type: this._mapFieldType(field.field_type),
      is_mandatory: Boolean(field.is_mandatory),
      requires_evidence: Boolean(field.requires_evidence),
      order_index: orderIndex,
      table_structure: field.field_type === 'table' ? field.table_structure : null,
      field_type: field.field_type || 'text'
    };
  }

  /**
   * Process item (optimized)
   */
  _processItem(item, sectionName, subsectionName, orderIndex, seenItemIds) {
    const itemId = item.item_id || `item_${orderIndex}`;
    
    if (seenItemIds.has(itemId)) return null;
    seenItemIds.add(itemId);

    return {
      item_id: itemId,
      section_name: sectionName,
      sub_section_name: subsectionName,
      description: item.description || `Item ${itemId}`,
      check_description: item.description || `Check ${itemId}`,
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
   * Optimized field type mapping
   */
  _mapFieldType(fieldType) {
    if (!fieldType) return 'text';
    return this.FIELD_TYPE_MAPPING[fieldType.toLowerCase()] || 'text';
  }

  /**
   * Process checklist data efficiently
   */
  _processChecklistData(rawData) {
    if (!Array.isArray(rawData)) return [];
    return rawData.map(checklist => this._processChecklistItem(checklist));
  }

  /**
   * Process individual checklist item (optimized)
   */
  _processChecklistItem(checklist) {
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
   * Clear cache for specific checklist
   */
  _clearChecklistCache(checklistId) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(checklistId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  /**
   * Centralized error handling
   */
  _handleError(error, defaultMessage, statusCode = null) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status || statusCode,
      url: error.config?.url
    };

    // Only log critical errors
    if (error.response?.status >= 500 || !error.response) {
      console.error('ChecklistService Error:', errorDetails);
    }

    // Provide specific error messages based on status
    let message = defaultMessage;
    switch (error.response?.status) {
      case 400:
        message = 'Invalid request. Please check your data and try again.';
        break;
      case 401:
        message = 'Authentication required. Please log in.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 409:
        message = 'Conflict: The resource already exists or is being modified.';
        break;
      case 429:
        message = 'Too many requests. Please wait and try again.';
        break;
      default:
        if (error.response?.status >= 500) {
          message = 'Server error. Please try again later.';
        }
    }

    throw new Error(message);
  }

  // UTILITY METHODS

  /**
   * Optimized completion percentage calculation
   */
  calculateCompletionPercentage(responses, totalItems) {
    if (!responses || !Array.isArray(responses) || totalItems === 0) {
      return 0;
    }

    const uniqueResponses = new Map();
    responses.forEach(response => {
      const key = response.item_id || response.response_id;
      if (key) uniqueResponses.set(key, response);
    });

    let completedItems = 0;
    for (const response of uniqueResponses.values()) {
      if (this._hasValidValue(response)) {
        completedItems++;
      }
    }

    return Math.round((completedItems / totalItems) * 100);
  }

  /**
   * Validate checklist responses (optimized)
   */
  validateChecklistResponses(responses) {
    const errors = {};
    let isValid = true;

    if (!Array.isArray(responses)) {
      return { isValid: false, errors: { general: 'Invalid responses data' } };
    }

    responses.forEach((response, index) => {
      const itemKey = `item_${index}`;

      if (response.is_mandatory && !this._hasValidValue(response)) {
        errors[itemKey] = 'This field is required';
        isValid = false;
      }

      if (response.requires_evidence && !response.evidence_provided) {
        errors[`${itemKey}_evidence`] = 'Evidence is required for this item';
        isValid = false;
      }
    });

    return { isValid, errors };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      memoryUsage: JSON.stringify([...this.cache.values()]).length
    };
  }
}

// Create and export singleton instance
const checklistService = new ChecklistService();
export default checklistService;