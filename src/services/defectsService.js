// Replace your src/services/defectsService.js with this simpler version:

class DefectsService {
    constructor() {
      // Use current domain or hardcoded API base URL
      this.baseURL = ''; // Empty string means relative to current domain
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
  
    /**
     * Get all defects for a specific vessel
     * @param {string|number} vesselId - The vessel ID
     * @returns {Promise<Array>} Array of defects
     */
    async getVesselDefects(vesselId) {
      if (!vesselId) {
        throw new Error('Vessel ID is required');
      }
  
      // Check cache first
      const cacheKey = `vessel-defects-${vesselId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
  
      try {
        // For now, return mock data until your API is ready
        const mockDefects = [
          {
            id: 1,
            vessel_id: vesselId,
            equipment_name: "Main Engine",
            description: "Fuel injector malfunction causing reduced performance",
            action_planned: "Replace fuel injector unit and test system",
            criticality: "high",
            status_vessel: "open",
            created_date: new Date().toISOString(),
            target_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 2,
            vessel_id: vesselId,
            equipment_name: "Navigation System",
            description: "GPS signal intermittent during heavy weather",
            action_planned: "Calibrate GPS antenna and check connections",
            criticality: "medium",
            status_vessel: "open",
            created_date: new Date().toISOString(),
            target_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            vessel_id: vesselId,
            equipment_name: "Deck Equipment",
            description: "Minor hydraulic leak in crane system",
            action_planned: "Replace hydraulic seals and test operation",
            criticality: "low",
            status_vessel: "open",
            created_date: new Date().toISOString(),
            target_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
  
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
  
        // Cache the result
        this.cache.set(cacheKey, {
          data: mockDefects,
          timestamp: Date.now()
        });
  
        return mockDefects;
  
        // When your API is ready, replace the above with:
        /*
        const response = await fetch(`/api/defects/vessel/${vesselId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        const defects = Array.isArray(data) ? data : [];
        
        this.cache.set(cacheKey, {
          data: defects,
          timestamp: Date.now()
        });
  
        return defects;
        */
      } catch (error) {
        console.error(`Error fetching defects for vessel ${vesselId}:`, error);
        throw error;
      }
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
  
      // Filter only open defects
      const openDefects = defects.filter(defect => 
        defect.status_vessel?.toLowerCase() === 'open'
      );
  
      return {
        total: openDefects.length,
        high: openDefects.filter(d => d.criticality?.toLowerCase() === 'high').length,
        medium: openDefects.filter(d => d.criticality?.toLowerCase() === 'medium').length,
        low: openDefects.filter(d => d.criticality?.toLowerCase() === 'low').length
      };
    }
  
    /**
     * Clear cache for a specific vessel or all cache
     */
    clearCache(vesselId = null) {
      if (vesselId) {
        const cacheKey = `vessel-defects-${vesselId}`;
        this.cache.delete(cacheKey);
      } else {
        this.cache.clear();
      }
    }
  }
  
  // Create and export a singleton instance
  const defectsService = new DefectsService();
  export default defectsService;