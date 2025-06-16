// src/services/PortMappingService.js
class PortMappingService {
    constructor() {
      this.portCache = new Map();
      this.documentCountsCache = new Map();
      this.portsData = null;
      this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
      this.lastFetched = null;
      
      // CONFIGURE YOUR API BASE URL HERE
      this.baseURL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
    }
  
    /**
     * Initialize the service by fetching all ports from the database
     */
    async initialize() {
      if (this.shouldRefreshCache()) {
        try {
          const response = await fetch(`${this.baseURL}/api/ports`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ports: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          this.portsData = data.ports || [];
          this.buildPortCache();
          this.lastFetched = Date.now();
          
          console.log(`Initialized port mapping with ${this.portsData.length} ports`);
        } catch (error) {
          console.error('Error initializing port mapping service:', error);
          throw error;
        }
      }
    }
  
    /**
     * Check if cache needs refresh
     */
    shouldRefreshCache() {
      return !this.lastFetched || (Date.now() - this.lastFetched) > this.cacheExpiry;
    }
  
    /**
     * Build internal cache for faster lookups
     */
    buildPortCache() {
      this.portCache.clear();
      
      this.portsData.forEach(port => {
        // Store by exact port name
        const portKey = this.normalizePortName(port.port_name);
        this.portCache.set(portKey, port);
        
        // Store by port name + country for more specific matching
        const portCountryKey = this.normalizePortName(`${port.port_name}, ${port.country_name}`);
        this.portCache.set(portCountryKey, port);
        
        // Store by common abbreviations if country is Australia/New Zealand
        if (port.country_name?.toLowerCase() === 'australia') {
          const abbrevKey = this.normalizePortName(`${port.port_name}, AU`);
          this.portCache.set(abbrevKey, port);
        } else if (port.country_name?.toLowerCase() === 'new zealand') {
          const abbrevKey = this.normalizePortName(`${port.port_name}, NZ`);
          this.portCache.set(abbrevKey, port);
        }
      });
    }
  
    /**
     * Normalize port name for consistent matching
     */
    normalizePortName(portName) {
      if (!portName) return '';
      
      return portName
        .toString()
        .toUpperCase()
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\w\s,]/g, '') // Remove special characters except commas
        .replace(/\bPORT\s+OF\s+/g, '') // Remove "PORT OF" prefix
        .replace(/\bPORT\s+/g, ''); // Remove "PORT" prefix
    }
  
    /**
     * Find port ID by vessel port name
     */
    async findPortId(vesselPortName) {
      await this.initialize();
      
      if (!vesselPortName) return null;
      
      const normalizedName = this.normalizePortName(vesselPortName);
      
      // Try exact match first
      let port = this.portCache.get(normalizedName);
      if (port) return port.id;
      
      // Try fuzzy matching
      port = this.fuzzyMatch(normalizedName);
      if (port) return port.id;
      
      return null;
    }
  
    /**
     * Get port details by vessel port name
     */
    async findPortDetails(vesselPortName) {
      await this.initialize();
      
      if (!vesselPortName) return null;
      
      const normalizedName = this.normalizePortName(vesselPortName);
      
      // Try exact match first
      let port = this.portCache.get(normalizedName);
      if (port) return port;
      
      // Try fuzzy matching
      port = this.fuzzyMatch(normalizedName);
      return port || null;
    }
  
    /**
     * Fuzzy matching for port names
     */
    fuzzyMatch(targetName) {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const [cachedName, port] of this.portCache) {
        const score = this.calculateSimilarity(targetName, cachedName);
        
        // Require at least 80% similarity for fuzzy matching
        if (score > 0.8 && score > bestScore) {
          bestScore = score;
          bestMatch = port;
        }
      }
      
      return bestMatch;
    }
  
    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateSimilarity(str1, str2) {
      const len1 = str1.length;
      const len2 = str2.length;
      const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
      
      for (let i = 0; i <= len1; i++) matrix[0][i] = i;
      for (let j = 0; j <= len2; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,     // deletion
            matrix[j - 1][i] + 1,     // insertion
            matrix[j - 1][i - 1] + indicator   // substitution
          );
        }
      }
      
      const distance = matrix[len2][len1];
      const maxLength = Math.max(len1, len2);
      return 1 - (distance / maxLength);
    }
  
    /**
     * Get document counts for multiple ports efficiently
     */
    async getDocumentCounts(portNames) {
      const counts = new Map();
      const uncachedPorts = [];
      
      // Check cache first
      for (const portName of portNames) {
        const cached = this.documentCountsCache.get(portName);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
          counts.set(portName, cached.count);
        } else {
          uncachedPorts.push(portName);
        }
      }
      
      // Fetch uncached counts
      if (uncachedPorts.length > 0) {
        try {
          const response = await fetch(`${this.baseURL}/api/documents/summary`);
          if (response.ok) {
            const data = await response.json();
            const summary = data.lookup || {};
            
            // Map summary data to port names
            for (const portName of uncachedPorts) {
              const portDetails = await this.findPortDetails(portName);
              const count = portDetails ? (summary[portDetails.id]?.document_count || 0) : 0;
              
              counts.set(portName, count);
              this.documentCountsCache.set(portName, {
                count,
                timestamp: Date.now()
              });
            }
          } else {
            // If summary endpoint fails, set zero counts
            uncachedPorts.forEach(portName => counts.set(portName, 0));
          }
        } catch (error) {
          console.error('Error fetching document counts:', error);
          // Set zero counts for failed requests
          uncachedPorts.forEach(portName => counts.set(portName, 0));
        }
      }
      
      return counts;
    }
  
    /**
     * Get document count for a single port
     */
    async getDocumentCount(portName) {
      const counts = await this.getDocumentCounts([portName]);
      return counts.get(portName) || 0;
    }
  
    /**
     * Clear caches (useful for testing or forced refresh)
     */
    clearCache() {
      this.portCache.clear();
      this.documentCountsCache.clear();
      this.portsData = null;
      this.lastFetched = null;
    }
  
    /**
     * Batch process vessel data to add port IDs and document counts
     */
    async enrichVesselData(vessels) {
      await this.initialize();
      
      // Extract unique port names
      const uniquePortNames = new Set();
      vessels.forEach(vessel => {
        if (vessel.arrival_port) uniquePortNames.add(vessel.arrival_port);
        if (vessel.departure_port) uniquePortNames.add(vessel.departure_port);
      });
      
      // Get document counts for all unique ports
      const documentCounts = await this.getDocumentCounts(Array.from(uniquePortNames));
      
      // Enrich vessel data
      return vessels.map(vessel => ({
        ...vessel,
        arrival_port_id: vessel.arrival_port ? this.portCache.get(this.normalizePortName(vessel.arrival_port))?.id : null,
        departure_port_id: vessel.departure_port ? this.portCache.get(this.normalizePortName(vessel.departure_port))?.id : null,
        arrival_port_document_count: documentCounts.get(vessel.arrival_port) || 0,
        departure_port_document_count: documentCounts.get(vessel.departure_port) || 0
      }));
    }
  }
  
  // Create singleton instance
  const portMappingService = new PortMappingService();
  
  export default portMappingService;