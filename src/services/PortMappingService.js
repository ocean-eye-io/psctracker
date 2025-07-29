// services/PortMappingService.js - PHASE 2 OPTIMIZATION: Lazy Loading Implementation + Smart Page Detection

class PortMappingService {
  constructor() {
    this.baseURL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
    
    // OPTIMIZED: Separate caches for better management
    this.portCache = new Map();
    this.documentCountsCache = new Map();
    this.portsData = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastFetched = null;
    
    // PHASE 2: NEW - Lazy loading state
    this.isInitializing = false;
    this.initPromise = null;
    this.loadingPromises = new Map(); // Prevent duplicate API calls
    
    // PHASE 2: NEW - Session storage integration
    this.sessionStorageKey = 'portMappingCache_v2';
    this.loadFromSessionStorage();
  }

  // PHASE 2: NEW - Smart page detection to skip port mapping on certain pages
  isPageRequiringPortMapping() {
    const currentPath = window.location.pathname;
    const excludedPaths = ['/psc-data', '/admin'];
    return !excludedPaths.includes(currentPath);
  }

  // PHASE 2: NEW - Load cache from sessionStorage
  loadFromSessionStorage() {
    try {
      const cached = sessionStorage.getItem(this.sessionStorageKey);
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check if cache is still valid (not expired)
        if (data.timestamp && (Date.now() - data.timestamp) < this.cacheExpiry) {
          // Restore caches
          if (data.ports) {
            this.portCache = new Map(data.ports);
          }
          if (data.documents) {
            this.documentCountsCache = new Map(data.documents);
          }
          this.lastFetched = data.timestamp;
          return true;
        }
      }
    } catch (error) {
      // Silent error handling
    }
    return false;
  }

  // PHASE 2: NEW - Save cache to sessionStorage
  saveToSessionStorage() {
    try {
      const data = {
        ports: Array.from(this.portCache.entries()),
        documents: Array.from(this.documentCountsCache.entries()),
        timestamp: Date.now()
      };
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(data));
    } catch (error) {
      // Silent error handling - sessionStorage might be full
    }
  }

  // OPTIMIZED: Check if cache needs refresh
  shouldRefreshCache() {
    return !this.lastFetched || (Date.now() - this.lastFetched) > this.cacheExpiry;
  }

  // PHASE 2: LAZY LOADING - Only initialize when needed and for specific ports
  async initializeForPorts(portNames = []) {
    // Skip port mapping for certain pages
    if (!this.isPageRequiringPortMapping()) {
      console.log('Port mapping skipped for current page:', window.location.pathname);
      return;
    }

    // If we have valid cache, use it
    if (!this.shouldRefreshCache() && this.portCache.size > 0) {
      return;
    }

    // Prevent multiple initialization calls
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.performLazyInitialization(portNames);

    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  // PHASE 2: NEW - Perform lazy initialization for specific ports only
  async performLazyInitialization(portNames) {
    try {
      if (portNames.length === 0) {
        // If no specific ports requested, do minimal initialization
        return;
      }

      // Check which ports we don't have cached
      const uncachedPorts = portNames.filter(portName => {
        const normalizedName = this.normalizePortName(portName);
        return !this.portCache.has(normalizedName);
      });

      if (uncachedPorts.length === 0) {
        return; // All requested ports are already cached
      }

      // OPTIMIZED: Use batch API to fetch only needed ports
      await this.fetchSpecificPorts(uncachedPorts);

    } catch (error) {
      // Silent error handling for better UX
    }
  }

  // PHASE 2: NEW - Fetch only specific ports via batch API with smart page detection
  async fetchSpecificPorts(portNames) {
    // Skip port mapping for certain pages
    if (!this.isPageRequiringPortMapping()) {
      console.log('Port mapping API call skipped for current page:', window.location.pathname);
      return { success: false, data: [] };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/ports/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          port_names: portNames,
          fuzzy_match: true // Enable fuzzy matching for better results
        }),
      });

      if (!response.ok) {
        console.warn(`Port mapping API unavailable (${response.status}). Continuing without port data.`);
        return { success: false, data: [] };
      }

      const data = await response.json();
      const ports = data.ports || [];

      // Build cache for found ports
      ports.forEach(port => {
        const portKey = this.normalizePortName(port.port_name);
        this.portCache.set(portKey, port);
        
        // Also cache with country variations
        const portCountryKey = this.normalizePortName(`${port.port_name}, ${port.country_name}`);
        this.portCache.set(portCountryKey, port);
        
        // Cache abbreviations for AU/NZ
        if (port.country_name?.toLowerCase() === 'australia') {
          const abbrevKey = this.normalizePortName(`${port.port_name}, AU`);
          this.portCache.set(abbrevKey, port);
        } else if (port.country_name?.toLowerCase() === 'new zealand') {
          const abbrevKey = this.normalizePortName(`${port.port_name}, NZ`);
          this.portCache.set(abbrevKey, port);
        }
      });

      // Load document counts for found ports (non-blocking)
      if (ports.length > 0) {
        const portIds = ports.map(port => port.id);
        this.loadDocumentCountsAsync(portIds); // Fire and forget
      }

      this.lastFetched = Date.now();
      this.saveToSessionStorage();

      return { success: true, data: ports };

    } catch (error) {
      console.warn('Port mapping service unavailable:', error.message);
      return { success: false, data: [] };
    }
  }

  // PHASE 2: NEW - Load document counts asynchronously (non-blocking)
  async loadDocumentCountsAsync(portIds) {
    try {
      // Use timeout to make this truly non-blocking
      setTimeout(async () => {
        try {
          await this.getDocumentCountsForPorts(portIds);
        } catch (error) {
          // Silent error handling
        }
      }, 100);
    } catch (error) {
      // Silent error handling
    }
  }

  // PHASE 2: NEW - Get document counts for specific port IDs
  async getDocumentCountsForPorts(portIds) {
    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return {};
    }

    const uncachedPortIds = portIds.filter(portId => !this.documentCountsCache.has(portId));
    
    if (uncachedPortIds.length === 0) {
      return;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/documents/counts-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port_ids: uncachedPortIds }),
      });

      if (!response.ok) {
        return; // Silent failure for document counts
      }

      const data = await response.json();
      const counts = data.counts || {};

      // Cache the counts
      Object.entries(counts).forEach(([portId, count]) => {
        this.documentCountsCache.set(parseInt(portId), count);
      });

      this.saveToSessionStorage();

    } catch (error) {
      // Silent error handling
    }
  }

  // OPTIMIZED: Normalize port name for consistent matching
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

  // OPTIMIZED: Find port ID with lazy loading and page detection
  async findPortId(vesselPortName) {
    if (!vesselPortName) return null;

    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return null;
    }

    const normalizedName = this.normalizePortName(vesselPortName);
    
    // Check cache first
    let port = this.portCache.get(normalizedName);
    if (port) return port.id;

    // Initialize for this specific port if not found
    await this.initializeForPorts([vesselPortName]);
    
    // Check cache again
    port = this.portCache.get(normalizedName);
    if (port) return port.id;
    
    // Try fuzzy matching
    port = this.fuzzyMatch(normalizedName);
    return port ? port.id : null;
  }

  // OPTIMIZED: Find port details with lazy loading and page detection
  async findPortDetails(vesselPortName) {
    if (!vesselPortName) return null;

    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return null;
    }

    const normalizedName = this.normalizePortName(vesselPortName);
    
    // Check cache first
    let port = this.portCache.get(normalizedName);
    if (port) return port;

    // Initialize for this specific port if not found
    await this.initializeForPorts([vesselPortName]);
    
    // Check cache again
    port = this.portCache.get(normalizedName);
    if (port) return port;
    
    // Try fuzzy matching
    return this.fuzzyMatch(normalizedName);
  }

  // OPTIMIZED: Fuzzy matching (kept as is, working well)
  fuzzyMatch(targetName) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [cachedName, port] of this.portCache) {
      const score = this.calculateSimilarity(targetName, cachedName);
      
      if (score > 0.8 && score > bestScore) {
        bestScore = score;
        bestMatch = port;
      }
    }
    
    return bestMatch;
  }

  // OPTIMIZED: Calculate string similarity (kept as is)
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
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    return 1 - (distance / maxLength);
  }

  // PHASE 2: OPTIMIZED - Get document counts with better caching and page detection
  async getDocumentCounts(portNames) {
    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return new Map();
    }

    const counts = new Map();
    const portsNeedingCounts = [];
    
    // Check cache first
    for (const portName of portNames) {
      const cached = this.documentCountsCache.get(portName);
      if (cached !== undefined) {
        counts.set(portName, cached);
      } else {
        portsNeedingCounts.push(portName);
      }
    }
    
    // Get document counts for uncached ports
    if (portsNeedingCounts.length > 0) {
      try {
        // First ensure we have port mappings for these ports
        await this.initializeForPorts(portsNeedingCounts);
        
        // Get port IDs for the ports we need counts for
        const portIds = [];
        for (const portName of portsNeedingCounts) {
          const portDetails = await this.findPortDetails(portName);
          if (portDetails) {
            portIds.push(portDetails.id);
          }
        }
        
        // Fetch document counts for these port IDs
        if (portIds.length > 0) {
          await this.getDocumentCountsForPorts(portIds);
          
          // Map back to port names
          for (const portName of portsNeedingCounts) {
            const portDetails = await this.findPortDetails(portName);
            const count = portDetails ? (this.documentCountsCache.get(portDetails.id) || 0) : 0;
            counts.set(portName, count);
          }
        } else {
          // Set zero counts for ports we couldn't find
          portsNeedingCounts.forEach(portName => counts.set(portName, 0));
        }
        
      } catch (error) {
        // Set zero counts for failed requests
        portsNeedingCounts.forEach(portName => counts.set(portName, 0));
      }
    }
    
    return counts;
  }

  // OPTIMIZED: Get document count for single port with page detection
  async getDocumentCount(portName) {
    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return 0;
    }

    const counts = await this.getDocumentCounts([portName]);
    return counts.get(portName) || 0;
  }

  // PHASE 2: OPTIMIZED - Batch process vessel data with lazy loading and page detection
  async enrichVesselData(vessels) {
    if (!vessels || vessels.length === 0) {
      return vessels;
    }

    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      console.log('Vessel data enrichment skipped for current page:', window.location.pathname);
      return vessels;
    }

    // Extract unique port names
    const uniquePortNames = new Set();
    vessels.forEach(vessel => {
      if (vessel.arrival_port) uniquePortNames.add(vessel.arrival_port);
      if (vessel.departure_port) uniquePortNames.add(vessel.departure_port);
    });

    const portNamesArray = Array.from(uniquePortNames);

    // PHASE 2: Initialize only for the ports we actually need
    await this.initializeForPorts(portNamesArray);

    // Get document counts for all unique ports
    const documentCounts = await this.getDocumentCounts(portNamesArray);

    // Enrich vessel data
    return vessels.map(vessel => ({
      ...vessel,
      arrival_port_id: vessel.arrival_port ? this.portCache.get(this.normalizePortName(vessel.arrival_port))?.id : null,
      departure_port_id: vessel.departure_port ? this.portCache.get(this.normalizePortName(vessel.departure_port))?.id : null,
      arrival_port_document_count: documentCounts.get(vessel.arrival_port) || 0,
      departure_port_document_count: documentCounts.get(vessel.departure_port) || 0
    }));
  }

  // PHASE 2: NEW - Enrich only for specific ports (for performance) with page detection
  async enrichVesselDataForPorts(vessels, specificPortNames) {
    if (!vessels || vessels.length === 0) {
      return vessels;
    }

    // Skip for excluded pages
    if (!this.isPageRequiringPortMapping()) {
      return vessels;
    }

    if (!specificPortNames || specificPortNames.length === 0) {
      // No specific ports requested, return vessels as-is (no enrichment)
      return vessels;
    }

    // Initialize only for the specific ports
    await this.initializeForPorts(specificPortNames);

    // Get document counts for specific ports only
    const documentCounts = await this.getDocumentCounts(specificPortNames);

    // Enrich vessel data
    return vessels.map(vessel => {
      const enrichedVessel = { ...vessel };
      
      // Only enrich if the vessel's port is in our specific list
      if (vessel.arrival_port && specificPortNames.includes(vessel.arrival_port)) {
        const normalizedName = this.normalizePortName(vessel.arrival_port);
        const portData = this.portCache.get(normalizedName);
        
        enrichedVessel.arrival_port_id = portData?.id || null;
        enrichedVessel.arrival_port_document_count = documentCounts.get(vessel.arrival_port) || 0;
      }
      
      if (vessel.departure_port && specificPortNames.includes(vessel.departure_port)) {
        const normalizedName = this.normalizePortName(vessel.departure_port);
        const portData = this.portCache.get(normalizedName);
        
        enrichedVessel.departure_port_id = portData?.id || null;
        enrichedVessel.departure_port_document_count = documentCounts.get(vessel.departure_port) || 0;
      }
      
      return enrichedVessel;
    });
  }

  // OPTIMIZED: Clear caches
  clearCache() {
    this.portCache.clear();
    this.documentCountsCache.clear();
    this.portsData = null;
    this.lastFetched = null;
    
    // Clear session storage
    try {
      sessionStorage.removeItem(this.sessionStorageKey);
    } catch (error) {
      // Silent error handling
    }
  }

  // PHASE 2: NEW - Get cache statistics for debugging
  getCacheStats() {
    return {
      portCacheSize: this.portCache.size,
      documentCacheSize: this.documentCountsCache.size,
      lastFetched: this.lastFetched,
      cacheAge: this.lastFetched ? Date.now() - this.lastFetched : null,
      isExpired: this.shouldRefreshCache(),
      currentPage: window.location.pathname,
      isPortMappingRequired: this.isPageRequiringPortMapping()
    };
  }

  // PHASE 2: NEW - Preload common ports in background (only for pages that need it)
  async preloadCommonPorts() {
    // Only preload for pages that actually need port mapping
    if (!this.isPageRequiringPortMapping()) {
      return;
    }

    const commonPorts = [
      'Newcastle', 'Melbourne', 'Sydney', 'Brisbane', 'Perth',
      'Adelaide', 'Port Hedland', 'Dampier', 'Gladstone', 'Port Kembla'
    ];

    // Do this in background without blocking
    setTimeout(async () => {
      try {
        await this.initializeForPorts(commonPorts);
      } catch (error) {
        // Silent background preloading
      }
    }, 5000); // Wait 5 seconds before preloading
  }
}

// Create singleton instance
const portMappingService = new PortMappingService();

// PHASE 2: NEW - Start background preloading of common ports (only for applicable pages)
portMappingService.preloadCommonPorts();

export default portMappingService;