// src/components/common/Table/PortDocumentIcon.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import portMappingService from '../../../services/PortMappingService';

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

  useEffect(() => {
    if (!portName) {
      setLoading(false);
      return;
    }

    const fetchDocumentInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get port details and document count
        const [portDetails, count] = await Promise.all([
          portMappingService.findPortDetails(portName),
          portMappingService.getDocumentCount(portName)
        ]);
        
        setPortId(portDetails?.id || null);
        setDocumentCount(count || 0);
      } catch (err) {
        console.error('Error fetching document info for port:', portName, err);
        setError(err.message);
        setDocumentCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentInfo();
  }, [portName]);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (portId && onOpenDocuments) {
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

// Styles as JavaScript objects
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