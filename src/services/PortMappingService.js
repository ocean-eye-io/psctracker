// src/services/PortMappingService.js - FIXED to use existing Lambda APIs
class PortMappingService {
  constructor() {
    this.baseURL = 'https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws';
    
    // Simple caches
    this.portsCache = null;
    this.documentSummaryCache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastFetched = null;
  }

  // Check if cache needs refresh
  shouldRefreshCache() {
    return !this.lastFetched || (Date.now() - this.lastFetched) > this.cacheExpiry;
  }

  // Initialize by loading all ports
  async initialize() {
    if (this.shouldRefreshCache()) {
      try {
        console.log('[PortMappingService] Loading all ports from API...');
        
        // Load ports and document summary in parallel
        const [portsResponse, docsResponse] = await Promise.all([
          fetch(`${this.baseURL}/api/ports`),
          fetch(`${this.baseURL}/api/documents/summary`).catch(() => ({ ok: false }))
        ]);

        // Handle ports response
        if (!portsResponse.ok) {
          throw new Error(`Failed to fetch ports: ${portsResponse.status}`);
        }
        
        const portsData = await portsResponse.json();
        this.portsCache = portsData.ports || [];
        
        // Handle documents response (optional)
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          this.documentSummaryCache = docsData.lookup || {};
        } else {
          console.warn('[PortMappingService] Documents API unavailable, using empty data');
          this.documentSummaryCache = {};
        }
        
        this.lastFetched = Date.now();
        console.log(`[PortMappingService] Loaded ${this.portsCache.length} ports and ${Object.keys(this.documentSummaryCache).length} document entries`);
        
      } catch (error) {
        console.error('[PortMappingService] Error loading data:', error);
        // Set empty defaults on error
        this.portsCache = [];
        this.documentSummaryCache = {};
      }
    }
  }

  // Lazy loading for specific ports (compatibility method)
  async initializeForPorts(portNames = []) {
    await this.initialize();
  }

  // Normalize port name for consistent matching
  normalizePortName(portName) {
    if (!portName) return '';
    
    return portName
      .toString()
      .toUpperCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,]/g, '')
      .replace(/\bPORT\s+OF\s+/g, '')
      .replace(/\bPORT\s+/g, '');
  }

  // Find port ID by vessel port name
  async findPortId(vesselPortName) {
    await this.initialize();
    
    if (!vesselPortName || !this.portsCache) return null;
    
    const port = this.findPortByName(vesselPortName);
    return port ? port.id : null;
  }

  // Get port details by vessel port name
  async findPortDetails(vesselPortName) {
    await this.initialize();
    
    if (!vesselPortName || !this.portsCache) return null;
    
    return this.findPortByName(vesselPortName);
  }

  // Internal method to find port by name
  findPortByName(vesselPortName) {
    if (!vesselPortName || !this.portsCache) return null;

    const normalizedSearch = this.normalizePortName(vesselPortName);
    
    // Try exact match first
    let found = this.portsCache.find(port => 
      this.normalizePortName(port.port_name) === normalizedSearch
    );
    
    if (found) return found;

    // Try fuzzy matching
    found = this.portsCache.find(port => {
      const normalizedPort = this.normalizePortName(port.port_name);
      return normalizedPort.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedPort);
    });

    return found;
  }

  // Get document counts for multiple ports
  async getDocumentCounts(portNames) {
    await this.initialize();
    
    const counts = new Map();
    
    for (const portName of portNames) {
      const port = this.findPortByName(portName);
      if (port && this.documentSummaryCache) {
        const portDocInfo = this.documentSummaryCache[port.id];
        const count = portDocInfo ? portDocInfo.document_count : 0;
        counts.set(portName, count);
      } else {
        counts.set(portName, 0);
      }
    }
    
    return counts;
  }

  // Get document count for single port
  async getDocumentCount(portName) {
    const counts = await this.getDocumentCounts([portName]);
    return counts.get(portName) || 0;
  }

  // Clear caches
  clearCache() {
    this.portsCache = null;
    this.documentSummaryCache = null;
    this.lastFetched = null;
  }

  // Batch process vessel data to add port IDs and document counts
  async enrichVesselData(vessels) {
    if (!vessels || vessels.length === 0) {
      return vessels;
    }

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
    return vessels.map(vessel => {
      const arrivalPort = vessel.arrival_port ? this.findPortByName(vessel.arrival_port) : null;
      const departurePort = vessel.departure_port ? this.findPortByName(vessel.departure_port) : null;

      return {
        ...vessel,
        arrival_port_id: arrivalPort ? arrivalPort.id : null,
        departure_port_id: departurePort ? departurePort.id : null,
        arrival_port_document_count: documentCounts.get(vessel.arrival_port) || 0,
        departure_port_document_count: documentCounts.get(vessel.departure_port) || 0
      };
    });
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      portCacheSize: this.portsCache ? this.portsCache.length : 0,
      documentCacheSize: this.documentSummaryCache ? Object.keys(this.documentSummaryCache).length : 0,
      lastFetched: this.lastFetched,
      cacheAge: this.lastFetched ? Date.now() - this.lastFetched : null,
      isExpired: this.shouldRefreshCache()
    };
  }
}

// Create singleton instance
const portMappingService = new PortMappingService();

export default portMappingService;