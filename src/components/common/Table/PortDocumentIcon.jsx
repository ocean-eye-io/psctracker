// src/components/common/Table/PortDocumentIcon.jsx - FIXED to use existing APIs
import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

const PortDocumentIcon = ({ 
  portName, 
  onOpenDocuments,
  className = '',
  size = 16 
}) => {
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portId, setPortId] = useState(null);

  // Direct API base URL
  const baseURL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';

  // Cache for ports and document counts (simple in-memory cache)
  const [portsCache, setPortsCache] = useState(null);
  const [documentsCache, setDocumentsCache] = useState(null);

  // Normalize port name function (same as your service)
  const normalizePortName = (portName) => {
    if (!portName) return '';
    
    return portName
      .toString()
      .toUpperCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,]/g, '')
      .replace(/\bPORT\s+OF\s+/g, '')
      .replace(/\bPORT\s+/g, '');
  };

  // Find port by name with fuzzy matching
  const findPortByName = (portName, allPorts) => {
    if (!portName || !allPorts) return null;

    const normalizedSearch = normalizePortName(portName);
    
    // Try exact match first
    let found = allPorts.find(port => 
      normalizePortName(port.port_name) === normalizedSearch
    );
    
    if (found) return found;

    // Try fuzzy matching
    found = allPorts.find(port => {
      const normalizedPort = normalizePortName(port.port_name);
      return normalizedPort.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedPort);
    });

    return found;
  };

  // Load all ports (cached)
  const loadAllPorts = async () => {
    if (portsCache) return portsCache;

    try {
      const response = await fetch(`${baseURL}/api/ports`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ports: ${response.status}`);
      }

      const data = await response.json();
      const ports = data.ports || [];
      
      setPortsCache(ports);
      return ports;
    } catch (error) {
      console.error('Error loading ports:', error);
      throw error;
    }
  };

  // Load document summary (cached)
  const loadDocumentSummary = async () => {
    if (documentsCache) return documentsCache;

    try {
      const response = await fetch(`${baseURL}/api/documents/summary`);
      if (!response.ok) {
        console.warn(`Document summary API returned ${response.status}, using empty data`);
        return {};
      }

      const data = await response.json();
      const summary = data.lookup || {};
      
      setDocumentsCache(summary);
      return summary;
    } catch (error) {
      console.warn('Error loading document summary:', error);
      return {};
    }
  };

  useEffect(() => {
    if (!portName) {
      setLoading(false);
      return;
    }

    const fetchDocumentInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[PortDocumentIcon] Fetching data for port: ${portName}`);
        
        // Load all ports and document summary in parallel
        const [allPorts, documentSummary] = await Promise.all([
          loadAllPorts(),
          loadDocumentSummary()
        ]);

        console.log(`[PortDocumentIcon] Loaded ${allPorts.length} ports and ${Object.keys(documentSummary).length} document entries`);

        // Find the port
        const port = findPortByName(portName, allPorts);
        
        if (!port) {
          console.log(`[PortDocumentIcon] No port found for: ${portName}`);
          setPortId(null);
          setDocumentCount(0);
          return;
        }

        console.log(`[PortDocumentIcon] Found port:`, port);
        setPortId(port.id);

        // Get document count from summary
        const portDocInfo = documentSummary[port.id];
        const count = portDocInfo ? portDocInfo.document_count : 0;
        
        console.log(`[PortDocumentIcon] Document count for ${portName} (ID ${port.id}): ${count}`);
        setDocumentCount(count);
        
      } catch (err) {
        console.error(`[PortDocumentIcon] Error fetching data for port ${portName}:`, err);
        setError(err.message);
        setDocumentCount(0);
        setPortId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [portName, baseURL]);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (portId && onOpenDocuments) {
      console.log(`[PortDocumentIcon] Opening documents for port ID: ${portId}, name: ${portName}, count: ${documentCount}`);
      onOpenDocuments(portId, portName, documentCount);
    }
  };

  // Don't render anything if no port name
  if (!portName) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className={`port-document-icon loading ${className}`} style={loadingStyle}>
        <Loader2 size={size - 2} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state (show inactive icon)
  if (error) {
    return (
      <div 
        className={`port-document-icon error ${className}`}
        title={`Error loading documents: ${error}`}
        style={errorStyle}
      >
        <FileText 
          size={size} 
          className="text-gray-300 cursor-not-allowed" 
        />
      </div>
    );
  }

  // No port ID found (port not in database)
  if (!portId) {
    return (
      <div 
        className={`port-document-icon no-port ${className}`}
        title="No documents available for this port"
        style={noPortStyle}
      >
        <FileText 
          size={size} 
          className="text-gray-300" 
        />
      </div>
    );
  }

  // Render active icon with document count
  const hasDocuments = documentCount > 0;
  
  return (
    <div 
      className={`port-document-icon ${hasDocuments ? 'has-documents' : 'no-documents'} ${className}`}
      onClick={handleClick}
      title={hasDocuments 
        ? `View ${documentCount} document${documentCount === 1 ? '' : 's'} for ${portName}`
        : `No documents available for ${portName}`
      }
      style={baseStyle}
    >
      <div style={iconContainerStyle}>
        <FileText 
          size={size} 
          style={{
            color: hasDocuments ? '#3b82f6' : '#9ca3af',
            cursor: 'pointer',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (hasDocuments) {
              e.target.style.color = '#2563eb';
            } else {
              e.target.style.color = '#6b7280';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.color = hasDocuments ? '#3b82f6' : '#9ca3af';
          }}
        />
        
        {hasDocuments && documentCount > 0 && (
          <span style={badgeStyle}>
            {documentCount > 99 ? '99+' : documentCount}
          </span>
        )}
      </div>
    </div>
  );
};

// Styles as JavaScript objects (same as before)
const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  marginLeft: '4px',
  transition: 'all 0.2s ease'
};

const loadingStyle = {
  ...baseStyle,
  opacity: 0.6
};

const errorStyle = {
  ...baseStyle
};

const noPortStyle = {
  ...baseStyle
};

const iconContainerStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const badgeStyle = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  background: '#3b82f6',
  color: 'white',
  borderRadius: '10px',
  padding: '1px 4px',
  fontSize: '10px',
  fontWeight: '600',
  lineHeight: '1',
  minWidth: '16px',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  border: '1px solid white',
  animation: 'fadeIn 0.3s ease'
};

export default PortDocumentIcon;