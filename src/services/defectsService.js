// src/services/defectsService.js - FIXED to properly handle dynamic userId while maintaining all functionality

class DefectsService {
    constructor() {
      // Your Lambda function URL (same as reference service)
      this.baseURL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
      this.cacheExpiry = 5 * 60 * 1000; // Added for consistency with the update
      
      // FIXED: Remove hardcoded default userId - will be set dynamically
      this.userId = null; // Start with null instead of hardcoded value
    }
  
    /**
     * Helper function to validate UUID format (more flexible to handle various UUID formats)
     * @param {string} uuid - UUID to validate
     * @returns {boolean} Whether the UUID is valid
     */
    isValidUUID(uuid) {
      if (!uuid || typeof uuid !== 'string') {
        return false;
      }
      
      // More flexible UUID pattern that accepts:
      // - Standard UUIDs: 8-4-4-4-12 format
      // - Longer UUIDs that might have additional characters
      const flexibleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12,}$/i;
      
      // Also accept the exact format we're seeing in logs
      const alternativePattern = /^[0-9a-f-]{36,}$/i;
      
      return flexibleUuidRegex.test(uuid) || alternativePattern.test(uuid);
    }
  
    /**
     * FIXED: Helper function to ensure userId is valid - now more flexible with UUID validation
     * @param {string} userId - User ID to validate/convert (optional - will use this.userId if not provided)
     * @returns {string} Valid UUID
     */
    ensureValidUserId(userId = null) {
      // Use provided userId or fall back to instance userId
      const targetUserId = userId || this.userId;
      
      if (!targetUserId) {
        throw new Error('User ID not set. Please call setUserId() first or provide userId parameter.');
      }
      
      // If it's already a valid UUID, return it
      if (this.isValidUUID(targetUserId)) {
        return targetUserId;
      }
      
      // Convert known mock users to UUIDs for development (keep this for backward compatibility)
      const mockUUIDs = {
        'mock-user-123': '123e4567-e89b-12d3-a456-426614174000',
        'mock-admin-456': '456e7890-e89b-12d3-a456-426614174001',
        'mock-user-789': '789e0123-e89b-12d3-a456-426614174002'
      };
      
      if (mockUUIDs[targetUserId]) {
        return mockUUIDs[targetUserId];
      }
      
      // ADDITIONAL: Check if it's a reasonable UUID-like string even if format is slightly off
      // Accept strings that are mostly UUID-like (contains hyphens and hex characters)
      if (typeof targetUserId === 'string' && 
          targetUserId.length >= 32 && 
          targetUserId.includes('-') && 
          /^[0-9a-f-]+$/i.test(targetUserId)) {
        console.warn(`Accepting UUID-like string: ${targetUserId}`);
        return targetUserId;
      }
      
      // If nothing works, throw an error
      throw new Error(`Invalid userId format: ${targetUserId}. Please provide a valid UUID or UUID-like string.`);
    }
  
    /**
     * Enhanced API response handler (following reference methodology)
     * @param {Response} response - The fetch response object
     * @returns {any} The extracted data
     * @throws {Error} If the response indicates an error
     */
    async handleApiResponse(response) {
      if (response.status >= 200 && response.status < 300) {
        const data = await response.json();
        
        // Lambda function often returns data in the body property (like reference service)
        if (data && data.body) {
          return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        }
        return data; // Direct data if not wrapped in 'body'
      } else {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          console.error(`API Error ${response.status}:`, errorText);
          errorMsg += `, response: ${errorText}`;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        throw new Error(errorMsg);
      }
    }
  
    /**
     * Process defect data with improved field mapping (following reference methodology)
     * @param {Object} defect - Raw defect data from API
     * @returns {Object} Processed defect data
     */
    processDefectData(defect) {
      const processedDefect = {
        id: defect.id,
        vessel_id: defect.vessel_id,
        vessel_name: defect.vessel_name || 'Unknown Vessel',
        target_date: defect.target_date,
        Comments: defect.Comments || '',
        closure_comments: defect.closure_comments,
        raised_by: defect.raised_by,
        attachments: defect.attachments || 0,
        silentMode: defect.silentMode,
        
        // File-related fields with better error handling (like reference service)
        initial_files: Array.isArray(defect.initial_files) ? defect.initial_files : [],
        completion_files: Array.isArray(defect.completion_files) ? defect.completion_files : [],
        file_count_initial: defect.file_count_initial || 0,
        file_count_completion: defect.file_count_completion || 0,
        last_file_uploaded: defect.last_file_uploaded,
        
        // Mapped and standardized fields for the UI (following reference field mapping)
        Description: defect.Description || '',
        'Action Planned': defect['Action Planned'] || '',
        'Status': defect.Status || defect.Status_Vessel || 'OPEN',
        Criticality: defect.Criticality || '',
        Equipments: defect.Equipments || '',
        'Date Reported': defect['Date Reported'] || null,
        'Date Completed': defect['Date Completed'] || null,
        external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
      };
      
      return processedDefect;
    }
  
    /**
     * FIXED: Get all defects - now properly uses dynamic userId
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Array>} Array of all defects
     */
    async getAllDefects(userId = null) {
      // Use provided userId or fall back to instance userId
      const validUserId = this.ensureValidUserId(userId);
      
      const cacheKey = `all-defects-${validUserId}`; // Include userId in cache key
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      try {
        console.log(`Fetching defects from API for user: ${validUserId}`);
        
        const response = await fetch(`${this.baseURL}/api/defects?userId=${validUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await this.handleApiResponse(response);
        console.log('API Response:', data);
        
        // Process the data (following reference methodology)
        const defects = Array.isArray(data) ? data.map(defect => this.processDefectData(defect)) : [];
        console.log(`Processed ${defects.length} defects from API for user: ${validUserId}`);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });

        return defects;
      } catch (error) {
        console.error('Error fetching defects:', error);
        
        // Check if we have cached data to fall back to
        if (cached) {
          console.log('Using cached data due to API error');
          return cached.data;
        }
        
        // Return empty array instead of throwing to prevent app crashes
        console.log('Returning empty array due to API error');
        return [];
      }
    }
  
    /**
     * FIXED: Get defects by vessel name (case-insensitive) - now properly uses dynamic userId
     * @param {string} vesselName - The vessel name
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Array>} Array of defects for the vessel
     */
    async getVesselDefectsByName(vesselName, userId = null) {
      const validUserId = this.ensureValidUserId(userId);

      if (!vesselName) {
        throw new Error('Vessel name is required');
      }

      console.log(`Fetching defects for vessel name: "${vesselName}" (user: ${validUserId})`);

      const cacheKey = `defects_vessel_name_${vesselName.toLowerCase().replace(/\s+/g, '_')}_${validUserId}`; // Include userId in cache key
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
        console.log('Returning cached defects for vessel name:', vesselName);
        return cached.data;
      }

      try {
        const requestBody = {
          userId: validUserId,
          vesselName: vesselName // Send vessel name instead of ID
        };

        const response = await fetch(`${this.baseURL}/api/vessel-defects-by-name`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        const data = await this.handleApiResponse(response);
        const defects = Array.isArray(data) ? data.map(defect => this.processDefectData(defect)) : [];

        // Cache the results
        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });

        console.log(`Fetched ${defects.length} defects for vessel name: ${vesselName} (user: ${validUserId})`);
        return defects;

      } catch (error) {
        console.error(`Error fetching defects for vessel name ${vesselName}:`, error);
        throw error;
      }
    }

    /**
     * FIXED: Get defects for a specific vessel - now properly uses dynamic userId
     * @param {string|number|Object} vesselId - The vessel ID or vessel object
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Array>} Array of defects for the vessel
     */
    async getVesselDefects(vesselId, userId = null) {
      const validUserId = this.ensureValidUserId(userId);

      // If vesselId is actually a vessel object, extract the name
      if (typeof vesselId === 'object' && vesselId.vessel_name) {
        console.log('Received vessel object, using vessel_name for lookup');
        return this.getVesselDefectsByName(vesselId.vessel_name, validUserId);
      }

      // If it's a string that looks like a vessel name (contains spaces or letters), use name lookup
      if (typeof vesselId === 'string' && (vesselId.includes(' ') || /[a-zA-Z]/.test(vesselId))) {
        console.log('Detected vessel name format, using name lookup');
        return this.getVesselDefectsByName(vesselId, validUserId);
      }

      if (!vesselId) {
        throw new Error('Vessel ID is required');
      }

      console.log(`Fetching defects for vessel ID: ${vesselId} (user: ${validUserId})`);

      const cacheKey = `defects_${vesselId}_${validUserId}`; // Include userId in cache key
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
        console.log('Returning cached defects for vessel:', vesselId);
        return cached.data;
      }

      try {
        const response = await fetch(`${this.baseURL}/api/defects?userId=${encodeURIComponent(validUserId)}&vesselId=${encodeURIComponent(vesselId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await this.handleApiResponse(response);
        let defects = Array.isArray(data) ? data.map(defect => this.processDefectData(defect)) : [];

        // Filter by vessel ID if multiple vessels returned (this might be redundant if API filters)
        if (vesselId && defects.length > 0) {
          defects = defects.filter(defect => defect.vessel_id === String(vesselId) || defect.vessel_id === vesselId);
        }

        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });

        console.log(`Fetched ${defects.length} defects for vessel ID: ${vesselId} (user: ${validUserId})`);
        return defects;

      } catch (error) {
        console.error(`Error fetching defects for vessel ${vesselId}:`, error);
        throw error;
      }
    }
  
    /**
     * FIXED: Get a single defect by ID - now properly uses dynamic userId
     * @param {string|number} defectId - The defect ID
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Object>} Single defect object
     */
    async getDefect(defectId, userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        
        const response = await fetch(`${this.baseURL}/api/defects/${defectId}?userId=${validUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await this.handleApiResponse(response);
        
        if (!data) {
          throw new Error('Defect not found');
        }
        
        // Process the defect data
        const processedDefect = this.processDefectData(data);
        console.log(`Successfully fetched defect ${defectId} for user: ${validUserId}`);
        
        return processedDefect;
      } catch (error) {
        console.error(`Error fetching defect ${defectId}:`, error);
        throw error;
      }
    }
  
    /**
     * FIXED: Create a new defect - now properly uses dynamic userId
     * @param {Object} defectData - The defect data
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Object>} Created defect
     */
    async createDefect(defectData, userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        console.log(`Creating new defect for user ${validUserId}`);
        
        // Prepare payload (following reference methodology)
        const payload = { 
          ...defectData, 
          userId: validUserId,
          // Ensure file arrays are properly initialized
          initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
          completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
          // Ensure file counts match arrays
          file_count_initial: defectData.file_count_initial || (defectData.initial_files ? defectData.initial_files.length : 0),
          file_count_completion: defectData.file_count_completion || (defectData.completion_files ? defectData.completion_files.length : 0)
        };
        
        const response = await fetch(`${this.baseURL}/api/defects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const result = await this.handleApiResponse(response);
        console.log(`Successfully created defect with ID: ${result.id} for user: ${validUserId}`);
        
        // Clear cache after creating
        this.clearCache();
        
        // Return processed defect data
        return this.processDefectData(result);
      } catch (error) {
        console.error('Error creating defect:', error);
        throw error;
      }
    }
  
    /**
     * FIXED: Update an existing defect - now properly uses dynamic userId
     * @param {string|number} defectId - The defect ID
     * @param {Object} defectData - The updated defect data
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Object>} Updated defect
     */
    async updateDefect(defectId, defectData, userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        console.log(`Updating defect ${defectId} for user ${validUserId}`);
        
        // Prepare payload (following reference methodology)
        const payload = { 
          ...defectData, 
          userId: validUserId,
          // Ensure file arrays are properly formatted
          initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
          completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
          // Update file counts to match arrays
          file_count_initial: Array.isArray(defectData.initial_files) ? defectData.initial_files.length : (defectData.file_count_initial || 0),
          file_count_completion: Array.isArray(defectData.completion_files) ? defectData.completion_files.length : (defectData.file_count_completion || 0)
        };
        
        const response = await fetch(`${this.baseURL}/api/defects/${defectId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const result = await this.handleApiResponse(response);
        console.log(`Successfully updated defect ${defectId} for user: ${validUserId}`);
        
        // Clear cache after updating
        this.clearCache();
        
        // Return processed defect data
        return this.processDefectData(result);
      } catch (error) {
        console.error(`Error updating defect ${defectId}:`, error);
        throw error;
      }
    }
  
    /**
     * FIXED: Delete a defect - now properly uses dynamic userId
     * @param {string|number} defectId - The defect ID
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<boolean>} Success indicator
     */
    async deleteDefect(defectId, userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        console.log(`Deleting defect ${defectId} for user ${validUserId}`);
        
        const response = await fetch(`${this.baseURL}/api/defects/${defectId}?userId=${validUserId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`Successfully deleted defect ${defectId} for user: ${validUserId}`);
          
          // Clear cache after deleting
          this.clearCache();
          
          return true;
        } else {
          await this.handleApiResponse(response); // This will throw an error
          return false;
        }
      } catch (error) {
        console.error(`Error deleting defect ${defectId}:`, error);
        throw error;
      }
    }
  
    /**
     * FIXED: Get defect statistics - now properly uses dynamic userId
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Object>} Statistics object
     */
    async getDefectStats(userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        
        // Calculate from all defects (following reference methodology)
        const allDefects = await this.getAllDefects(validUserId);
        
        if (!Array.isArray(allDefects)) {
          return this.getDefaultStats();
        }

        const stats = {
          total: allDefects.length,
          open: allDefects.filter(d => d.Status?.toUpperCase() === 'OPEN').length,
          inProgress: allDefects.filter(d => d.Status?.toUpperCase() === 'IN PROGRESS').length,
          closed: allDefects.filter(d => d.Status?.toUpperCase() === 'CLOSED').length,
          overdue: 0, // We'll calculate this based on target_date
          highCritical: allDefects.filter(d => d.Criticality?.toLowerCase() === 'high').length,
          mediumCritical: allDefects.filter(d => d.Criticality?.toLowerCase() === 'medium').length,
          lowCritical: allDefects.filter(d => d.Criticality?.toLowerCase() === 'low').length,
          equipmentDistribution: {}
        };

        // Calculate overdue defects
        const today = new Date();
        stats.overdue = allDefects.filter(defect => {
          if (defect.Status?.toUpperCase() === 'CLOSED' || !defect.target_date) {
            return false;
          }
          const targetDate = new Date(defect.target_date);
          return !isNaN(targetDate) && targetDate < today;
        }).length;

        // Calculate equipment distribution
        allDefects.forEach(defect => {
          const equipment = defect.Equipments || 'Unknown';
          stats.equipmentDistribution[equipment] = (stats.equipmentDistribution[equipment] || 0) + 1;
        });

        console.log(`Calculated defect stats for user: ${validUserId}`, stats);
        return stats;
      } catch (error) {
        console.error('Error calculating defect stats:', error);
        return this.getDefaultStats();
      }
    }
  
    /**
     * Get default stats structure
     * @returns {Object} Default stats object
     */
    getDefaultStats() {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        closed: 0,
        overdue: 0,
        highCritical: 0,
        mediumCritical: 0,
        lowCritical: 0,
        equipmentDistribution: {}
      };
    }
  
    /**
     * Process raw defects data to calculate counts by criticality
     * @param {Array} defects - Raw defects array
     * @returns {Object} Processed counts
     */
    processDefectCounts(defects) {
      if (!Array.isArray(defects)) {
        return { total: 0, high: 0, medium: 0, low: 0 };
      }

      // Filter only open defects using the correct field name from your DB
      const openDefects = defects.filter(defect => 
        defect.Status?.toLowerCase() === 'open' || defect.Status === 'OPEN'
      );

      return {
        total: openDefects.length,
        high: openDefects.filter(d => d.Criticality?.toLowerCase() === 'high').length,
        medium: openDefects.filter(d => d.Criticality?.toLowerCase() === 'medium').length,
        low: openDefects.filter(d => d.Criticality?.toLowerCase() === 'low').length
      };
    }
  
    /**
     * Map API field names to display names for consistency
     * @param {Object} defect - Raw defect from API
     * @returns {Object} Mapped defect with consistent field names
     */
    mapDefectFields(defect) {
      return this.processDefectData(defect); // Use the main processing function
    }
  
    /**
     * Clear cache for specific items or all cache
     */
    clearCache(key = null) {
      if (key) {
        this.cache.delete(key);
      } else {
        this.cache.clear();
      }
    }
  
    /**
     * FIXED: Set user ID for API calls (ensuring UUID format) - now properly sets the userId
     * @param {string} userId - User ID
     */
    setUserId(userId) {
      if (!userId) {
        throw new Error('UserId cannot be null or undefined');
      }
      
      try {
        this.userId = this.ensureValidUserId(userId);
        this.clearCache(); // Clear cache when user changes
        console.log(`DefectsService userId set to: ${this.userId}`);
      } catch (error) {
        console.error('Error setting userId:', error);
        throw error;
      }
    }
  
    /**
     * Get current user ID
     * @returns {string|null} Current user ID
     */
    getUserId() {
      return this.userId;
    }
  
    /**
     * FIXED: Get user's assigned vessels - now properly uses dynamic userId
     * @param {string} userId - Optional userId parameter (will use this.userId if not provided)
     * @returns {Promise<Array>} Array of assigned vessels
     */
    async getUserAssignedVessels(userId = null) {
      try {
        const validUserId = this.ensureValidUserId(userId);
        console.log(`Fetching assigned vessels for user ${validUserId}...`);
        
        const response = await fetch(`${this.baseURL}/api/user-vessels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: validUserId })
        });

        const vesselsData = await this.handleApiResponse(response);

        if (!Array.isArray(vesselsData)) {
          console.warn('API response for getUserAssignedVessels is not an array:', vesselsData);
          return [];
        }
        
        console.log(`Successfully fetched ${vesselsData.length} assigned vessels for user: ${validUserId}`);
        return vesselsData;
      } catch (error) {
        console.error('Error fetching user assigned vessels:', error);
        throw error;
      }
    }
  }
  
  // Create and export a singleton instance
  const defectsService = new DefectsService();
  export default defectsService;