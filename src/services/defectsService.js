// src/services/defectsService.js - COMPLETE OPTIMIZED VERSION

class DefectsService {
  constructor() {
    this.baseURL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.cacheExpiry = 5 * 60 * 1000;
    
    // OPTIMIZED: Better user ID management
    this.userId = null;
    
    // OPTIMIZED: Add request deduplication
    this.pendingRequests = new Map();
    
    // OPTIMIZED: Batch processing capabilities
    this.batchQueue = new Map();
    this.batchTimeout = null;
    this.batchSize = 10;
    this.batchDelay = 100; // 100ms
  }

  // OPTIMIZED: Enhanced UUID validation
  isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    
    const flexibleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12,}$/i;
    const alternativePattern = /^[0-9a-f-]{36,}$/i;
    
    return flexibleUuidRegex.test(uuid) || alternativePattern.test(uuid);
  }

  // OPTIMIZED: Improved user ID validation
  ensureValidUserId(userId = null) {
    const targetUserId = userId || this.userId;
    
    if (!targetUserId) {
      throw new Error('User ID not set. Please call setUserId() first or provide userId parameter.');
    }
    
    if (this.isValidUUID(targetUserId)) {
      return targetUserId;
    }
    
    // Convert known mock users to UUIDs for development
    const mockUUIDs = {
      'mock-user-123': '123e4567-e89b-12d3-a456-426614174000',
      'mock-admin-456': '456e7890-e89b-12d3-a456-426614174001',
      'mock-user-789': '789e0123-e89b-12d3-a456-426614174002'
    };
    
    if (mockUUIDs[targetUserId]) {
      return mockUUIDs[targetUserId];
    }
    
    // Accept UUID-like strings
    if (typeof targetUserId === 'string' && 
        targetUserId.length >= 32 && 
        targetUserId.includes('-') && 
        /^[0-9a-f-]+$/i.test(targetUserId)) {
      return targetUserId;
    }
    
    throw new Error(`Invalid userId format: ${targetUserId}. Please provide a valid UUID or UUID-like string.`);
  }

  // OPTIMIZED: Enhanced API response handler
  async handleApiResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      
      if (data && data.body) {
        return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }
      return data;
    } else {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        errorMsg += `, response: ${errorText}`;
      } catch (parseError) {
        // Silent error handling
      }
      throw new Error(errorMsg);
    }
  }

  // OPTIMIZED: Process defect data with better performance
  processDefectData(defect) {
    return {
      id: defect.id,
      vessel_id: defect.vessel_id,
      vessel_name: defect.vessel_name || 'Unknown Vessel',
      target_date: defect.target_date,
      Comments: defect.Comments || '',
      closure_comments: defect.closure_comments,
      raised_by: defect.raised_by,
      attachments: defect.attachments || 0,
      silentMode: defect.silentMode,
      
      // File-related fields
      initial_files: Array.isArray(defect.initial_files) ? defect.initial_files : [],
      completion_files: Array.isArray(defect.completion_files) ? defect.completion_files : [],
      file_count_initial: defect.file_count_initial || 0,
      file_count_completion: defect.file_count_completion || 0,
      last_file_uploaded: defect.last_file_uploaded,
      
      // Mapped fields for UI
      Description: defect.Description || '',
      'Action Planned': defect['Action Planned'] || '',
      'Status': defect.Status || defect.Status_Vessel || 'OPEN',
      Criticality: defect.Criticality || '',
      Equipments: defect.Equipments || '',
      'Date Reported': defect['Date Reported'] || null,
      'Date Completed': defect['Date Completed'] || null,
      external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
    };
  }

  // OPTIMIZED: Request deduplication helper
  async deduplicateRequest(requestKey, requestFn) {
    // Check if the same request is already pending
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Execute the request and cache the promise
    const requestPromise = requestFn().finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  // OPTIMIZED: Get all defects with deduplication
  async getAllDefects(userId = null) {
    const validUserId = this.ensureValidUserId(userId);
    const cacheKey = `all-defects-${validUserId}`;
    const requestKey = `getAllDefects-${validUserId}`;

    return this.deduplicateRequest(requestKey, async () => {
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      try {
        const response = await fetch(`${this.baseURL}/api/defects?userId=${validUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await this.handleApiResponse(response);
        const defects = Array.isArray(data) ? data.map(defect => this.processDefectData(defect)) : [];
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });

        return defects;
      } catch (error) {
        // Check if we have cached data to fall back to
        if (cached) {
          return cached.data;
        }
        
        // Return empty array instead of throwing to prevent app crashes
        return [];
      }
    });
  }

  // OPTIMIZED: Get defects by vessel name with deduplication
  async getVesselDefectsByName(vesselName, userId = null) {
    const validUserId = this.ensureValidUserId(userId);

    if (!vesselName) {
      throw new Error('Vessel name is required');
    }

    const cacheKey = `defects_vessel_name_${vesselName.toLowerCase().replace(/\s+/g, '_')}_${validUserId}`;
    const requestKey = `getVesselDefectsByName-${vesselName}-${validUserId}`;

    return this.deduplicateRequest(requestKey, async () => {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
        return cached.data;
      }

      try {
        const requestBody = {
          userId: validUserId,
          vesselName: vesselName
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

        return defects;

      } catch (error) {
        throw error;
      }
    });
  }

  // OPTIMIZED: Batch vessel defects loading
  async batchGetVesselDefects(vesselNames, userId = null) {
    const validUserId = this.ensureValidUserId(userId);
    
    if (!Array.isArray(vesselNames) || vesselNames.length === 0) {
      return {};
    }

    const results = {};
    const uncachedVessels = [];

    // Check cache for each vessel
    for (const vesselName of vesselNames) {
      const cacheKey = `defects_vessel_name_${vesselName.toLowerCase().replace(/\s+/g, '_')}_${validUserId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
        results[vesselName] = cached.data;
      } else {
        uncachedVessels.push(vesselName);
      }
    }

    // Batch fetch uncached vessels
    if (uncachedVessels.length > 0) {
      try {
        const response = await fetch(`${this.baseURL}/api/vessel-defects-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: validUserId,
            vesselNames: uncachedVessels
          })
        });

        const data = await this.handleApiResponse(response);
        
        // Process and cache results
        Object.entries(data).forEach(([vesselName, defects]) => {
          const processedDefects = Array.isArray(defects) ? defects.map(defect => this.processDefectData(defect)) : [];
          
          results[vesselName] = processedDefects;
          
          // Cache individual vessel results
          const cacheKey = `defects_vessel_name_${vesselName.toLowerCase().replace(/\s+/g, '_')}_${validUserId}`;
          this.cache.set(cacheKey, {
            data: processedDefects,
            timestamp: Date.now()
          });
        });

      } catch (error) {
        // For failed vessels, return empty arrays
        uncachedVessels.forEach(vesselName => {
          results[vesselName] = [];
        });
      }
    }

    return results;
  }

  // OPTIMIZED: Get defects for a specific vessel with better logic
  async getVesselDefects(vesselId, userId = null) {
    const validUserId = this.ensureValidUserId(userId);

    // If vesselId is actually a vessel object, extract the name
    if (typeof vesselId === 'object' && vesselId.vessel_name) {
      return this.getVesselDefectsByName(vesselId.vessel_name, validUserId);
    }

    // If it's a string that looks like a vessel name, use name lookup
    if (typeof vesselId === 'string' && (vesselId.includes(' ') || /[a-zA-Z]/.test(vesselId))) {
      return this.getVesselDefectsByName(vesselId, validUserId);
    }

    if (!vesselId) {
      throw new Error('Vessel ID is required');
    }

    const cacheKey = `defects_${vesselId}_${validUserId}`;
    const requestKey = `getVesselDefects-${vesselId}-${validUserId}`;

    return this.deduplicateRequest(requestKey, async () => {
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
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

        // Filter by vessel ID if multiple vessels returned
        if (vesselId && defects.length > 0) {
          defects = defects.filter(defect => defect.vessel_id === String(vesselId) || defect.vessel_id === vesselId);
        }

        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });

        return defects;

      } catch (error) {
        throw error;
      }
    });
  }

  // OPTIMIZED: Get single defect with caching
  async getDefect(defectId, userId = null) {
    const validUserId = this.ensureValidUserId(userId);
    const cacheKey = `defect_${defectId}_${validUserId}`;
    const requestKey = `getDefect-${defectId}-${validUserId}`;

    return this.deduplicateRequest(requestKey, async () => {
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
        return cached.data;
      }

      try {
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
        
        const processedDefect = this.processDefectData(data);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: processedDefect,
          timestamp: Date.now()
        });
        
        return processedDefect;
      } catch (error) {
        throw error;
      }
    });
  }

  // OPTIMIZED: Create defect with cache invalidation
  async createDefect(defectData, userId = null) {
    try {
      const validUserId = this.ensureValidUserId(userId);
      
      const payload = { 
        ...defectData, 
        userId: validUserId,
        initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
        completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
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
      
      // Clear relevant caches
      this.clearCacheForUser(validUserId);
      
      return this.processDefectData(result);
    } catch (error) {
      throw error;
    }
  }

  // OPTIMIZED: Update defect with cache invalidation
  async updateDefect(defectId, defectData, userId = null) {
    try {
      const validUserId = this.ensureValidUserId(userId);
      
      const payload = { 
        ...defectData, 
        userId: validUserId,
        initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
        completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
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
      
      // Clear relevant caches
      this.clearCacheForUser(validUserId);
      
      return this.processDefectData(result);
    } catch (error) {
      throw error;
    }
  }

  // OPTIMIZED: Delete defect with cache invalidation
  async deleteDefect(defectId, userId = null) {
    try {
      const validUserId = this.ensureValidUserId(userId);
      
      const response = await fetch(`${this.baseURL}/api/defects/${defectId}?userId=${validUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status >= 200 && response.status < 300) {
        // Clear relevant caches
        this.clearCacheForUser(validUserId);
        return true;
      } else {
        await this.handleApiResponse(response);
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  // OPTIMIZED: Get defect statistics with caching
  async getDefectStats(userId = null) {
    try {
      const validUserId = this.ensureValidUserId(userId);
      const cacheKey = `defect_stats_${validUserId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
        return cached.data;
      }
      
      // Calculate from all defects
      const allDefects = await this.getAllDefects(validUserId);
      
      if (!Array.isArray(allDefects)) {
        return this.getDefaultStats();
      }

      const stats = {
        total: allDefects.length,
        open: allDefects.filter(d => d.Status?.toUpperCase() === 'OPEN').length,
        inProgress: allDefects.filter(d => d.Status?.toUpperCase() === 'IN PROGRESS').length,
        closed: allDefects.filter(d => d.Status?.toUpperCase() === 'CLOSED').length,
        overdue: 0,
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

      // Cache the stats
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      return this.getDefaultStats();
    }
  }

  // OPTIMIZED: Get default stats structure
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

  // OPTIMIZED: Process defects counts efficiently
  processDefectCounts(defects) {
    if (!Array.isArray(defects)) {
      return { total: 0, high: 0, medium: 0, low: 0 };
    }

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

  // OPTIMIZED: Map defect fields
  mapDefectFields(defect) {
    return this.processDefectData(defect);
  }

  // OPTIMIZED: Clear cache with more granular control
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // OPTIMIZED: Clear cache for specific user
  clearCacheForUser(userId) {
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // OPTIMIZED: Set user ID with validation
  setUserId(userId) {
    if (!userId) {
      throw new Error('UserId cannot be null or undefined');
    }
    
    try {
      this.userId = this.ensureValidUserId(userId);
      this.clearCache(); // Clear cache when user changes
    } catch (error) {
      throw error;
    }
  }

  // Get current user ID
  getUserId() {
    return this.userId;
  }

  // OPTIMIZED: Get user assigned vessels with caching
  async getUserAssignedVessels(userId = null) {
    try {
      const validUserId = this.ensureValidUserId(userId);
      const cacheKey = `user_vessels_${validUserId}`;
      const requestKey = `getUserAssignedVessels-${validUserId}`;

      return this.deduplicateRequest(requestKey, async () => {
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
          return cached.data;
        }
        
        const response = await fetch(`${this.baseURL}/api/user-vessels`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: validUserId })
        });

        const vesselsData = await this.handleApiResponse(response);

        if (!Array.isArray(vesselsData)) {
          return [];
        }
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: vesselsData,
          timestamp: Date.now()
        });
        
        return vesselsData;
      });
    } catch (error) {
      throw error;
    }
  }

  // OPTIMIZED: Get cache statistics for debugging
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      userId: this.userId
    };
  }

  // OPTIMIZED: Preload defects for multiple vessels (non-blocking)
  async preloadDefectsForVessels(vesselNames, userId = null) {
    if (!Array.isArray(vesselNames) || vesselNames.length === 0) {
      return;
    }

    const validUserId = this.ensureValidUserId(userId);

    // Do this in background without blocking
    setTimeout(async () => {
      try {
        await this.batchGetVesselDefects(vesselNames, validUserId);
      } catch (error) {
        // Silent background preloading
      }
    }, 500);
  }

  // Additional utility methods for completeness

  // OPTIMIZED: Check if defect exists
  async defectExists(defectId, userId = null) {
    try {
      await this.getDefect(defectId, userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // OPTIMIZED: Get defects by status
  async getDefectsByStatus(status, userId = null) {
    const allDefects = await this.getAllDefects(userId);
    return allDefects.filter(defect => defect.Status?.toLowerCase() === status.toLowerCase());
  }

  // OPTIMIZED: Get defects by criticality
  async getDefectsByCriticality(criticality, userId = null) {
    const allDefects = await this.getAllDefects(userId);
    return allDefects.filter(defect => defect.Criticality?.toLowerCase() === criticality.toLowerCase());
  }

  // OPTIMIZED: Get overdue defects
  async getOverdueDefects(userId = null) {
    const allDefects = await this.getAllDefects(userId);
    const today = new Date();
    
    return allDefects.filter(defect => {
      if (defect.Status?.toUpperCase() === 'CLOSED' || !defect.target_date) {
        return false;
      }
      const targetDate = new Date(defect.target_date);
      return !isNaN(targetDate) && targetDate < today;
    });
  }

  // OPTIMIZED: Bulk operations
  async bulkUpdateDefects(updates, userId = null) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateDefect(update.id, update.data, userId);
        results.push({ success: true, id: update.id, data: result });
      } catch (error) {
        results.push({ success: false, id: update.id, error: error.message });
      }
    }
    
    return results;
  }

  // OPTIMIZED: Export defects to CSV
  exportDefectsToCSV(defects, filename = 'defects') {
    try {
      if (!defects || defects.length === 0) {
        throw new Error('No defects to export');
      }

      const headers = [
        'ID', 'Vessel Name', 'Description', 'Status', 'Criticality',
        'Equipment', 'Target Date', 'Date Reported', 'Date Completed',
        'Raised By', 'Comments'
      ];

      const csvContent = [
        headers.join(','),
        ...defects.map(defect => [
          defect.id,
          `"${(defect.vessel_name || '').replace(/"/g, '""')}"`,
          `"${(defect.Description || '').replace(/"/g, '""')}"`,
          defect.Status || '',
          defect.Criticality || '',
          `"${(defect.Equipments || '').replace(/"/g, '""')}"`,
          defect.target_date ? new Date(defect.target_date).toLocaleDateString() : '',
          defect['Date Reported'] ? new Date(defect['Date Reported']).toLocaleDateString() : '',
          defect['Date Completed'] ? new Date(defect['Date Completed']).toLocaleDateString() : '',
          `"${(defect.raised_by || '').replace(/"/g, '""')}"`,
          `"${(defect.Comments || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error('Failed to export defects');
    }
  }
}

// Create and export a singleton instance
const defectsService = new DefectsService();
export default defectsService;