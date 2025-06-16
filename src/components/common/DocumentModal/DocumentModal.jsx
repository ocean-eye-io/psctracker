import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';

const DocumentModal = ({ 
  isOpen, 
  onClose, 
  portId, 
  portName,
  initialDocumentCount = 0 
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(new Set());

  // API base URL - update this to match your Lambda URL
  const API_BASE_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';

  // Fetch documents when modal opens
  useEffect(() => {
    if (isOpen && portId) {
      fetchDocuments();
    } else {
      // Reset state when modal closes
      setDocuments([]);
      setError(null);
    }
  }, [isOpen, portId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/documents?port_id=${portId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
      
      const data = await response.json();
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (document) => {
    const actionId = `view-${document.id}`;
    
    try {
      setActionLoading(prev => new Set([...prev, actionId]));
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/view-url`);
      
      if (!response.ok) {
        throw new Error(`Failed to get view URL: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Open in new tab
      window.open(data.view_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error viewing document:', err);
      alert(`Error viewing document: ${err.message}`);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  const handleDownload = async (document) => {
    const actionId = `download-${document.id}`;
    
    try {
      setActionLoading(prev => new Set([...prev, actionId]));
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/download-url`);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert(`Error downloading document: ${err.message}`);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  const handleDelete = async (document) => {
    const actionId = `delete-${document.id}`;
    
    if (!window.confirm(`Are you sure you want to delete "${document.original_file_name}"?`)) {
      return;
    }
    
    try {
      setActionLoading(prev => new Set([...prev, actionId]));
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.status}`);
      }
      
      // Remove document from local state
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(`Error deleting document: ${err.message}`);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  const isActionLoading = (actionId) => actionLoading.has(actionId);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerContentStyle}>
            <h2 style={titleStyle}>
              Documents for {portName}
            </h2>
            <p style={subtitleStyle}>
              {loading ? 'Loading...' : `${documents.length} document${documents.length === 1 ? '' : 's'}`}
            </p>
          </div>
          
          <div style={headerActionsStyle}>
            <button
              onClick={fetchDocuments}
              disabled={loading}
              style={refreshButtonStyle}
              title="Refresh documents"
            >
              <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            
            <button onClick={onClose} style={closeButtonStyle}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {loading ? (
            <div style={loadingStateStyle}>
              <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
              <p>Loading documents...</p>
            </div>
          ) : error ? (
            <div style={errorStateStyle}>
              <AlertCircle size={32} style={{ color: '#ef4444' }} />
              <p>Error loading documents: {error}</p>
              <button onClick={fetchDocuments} style={retryButtonStyle}>
                Try Again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div style={emptyStateStyle}>
              <FileText size={48} style={{ color: '#6b7280' }} />
              <h3 style={emptyTitleStyle}>No documents found</h3>
              <p style={emptyTextStyle}>No documents have been uploaded for this port yet.</p>
            </div>
          ) : (
            <div style={documentsListStyle}>
              {documents.map((doc, index) => (
                <div key={doc.id} style={documentItemStyle}>
                  <div style={documentContentStyle}>
                    <div style={fileIconContainerStyle}>
                      <FileText size={18} style={{ color: '#3bade5' }} />
                    </div>
                    <div style={fileNameContainerStyle}>
                      <span style={fileNameStyle} title={doc.original_file_name}>
                        {doc.original_file_name}
                      </span>
                    </div>
                  </div>
                  
                  <div style={actionsContainerStyle}>
                    <button
                      onClick={() => handleView(doc)}
                      disabled={isActionLoading(`view-${doc.id}`)}
                      style={actionButtonStyle}
                      title="View document"
                    >
                      {isActionLoading(`view-${doc.id}`) ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isActionLoading(`download-${doc.id}`)}
                      style={actionButtonStyle}
                      title="Download document"
                    >
                      {isActionLoading(`download-${doc.id}`) ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={isActionLoading(`delete-${doc.id}`)}
                      style={{...actionButtonStyle, ...deleteButtonStyle}}
                      title="Delete document"
                    >
                      {isActionLoading(`delete-${doc.id}`) ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle = {
  background: '#0e1e2f',
  borderRadius: '12px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  maxWidth: '600px',
  width: '100%',
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid rgba(244, 244, 244, 0.1)'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '24px',
  borderBottom: '1px solid rgba(244, 244, 244, 0.1)',
  background: 'linear-gradient(180deg, #0a1725, #112032)',
  borderRadius: '12px 12px 0 0'
};

const headerContentStyle = {};

const titleStyle = {
  margin: 0,
  color: '#f4f4f4',
  fontSize: '20px',
  fontWeight: 600
};

const subtitleStyle = {
  margin: '4px 0 0',
  color: 'rgba(244, 244, 244, 0.6)',
  fontSize: '14px'
};

const headerActionsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
};

const refreshButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(244, 244, 244, 0.6)',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(244, 244, 244, 0.6)',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const contentStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 24px 24px'
};

const loadingStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '40px 20px',
  color: 'rgba(244, 244, 244, 0.6)'
};

const errorStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '40px 20px',
  color: 'rgba(244, 244, 244, 0.6)'
};

const emptyStateStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '40px 20px',
  color: 'rgba(244, 244, 244, 0.6)'
};

const emptyTitleStyle = {
  margin: '16px 0 8px',
  color: '#f4f4f4',
  fontSize: '18px'
};

const emptyTextStyle = {
  margin: '0',
  fontSize: '14px'
};

const retryButtonStyle = {
  marginTop: '16px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'background 0.2s ease'
};

const documentsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const documentItemStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'rgba(244, 244, 244, 0.03)',
  border: '1px solid rgba(244, 244, 244, 0.08)',
  borderRadius: '8px',
  padding: '12px 16px',
  transition: 'all 0.2s ease',
  ':hover': {
    background: 'rgba(244, 244, 244, 0.06)',
    borderColor: 'rgba(59, 173, 229, 0.2)'
  }
};

const documentContentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  minWidth: 0
};

const fileIconContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  background: 'rgba(59, 173, 229, 0.1)',
  borderRadius: '6px',
  flexShrink: 0
};

const fileNameContainerStyle = {
  flex: 1,
  minWidth: 0
};

const fileNameStyle = {
  color: '#f4f4f4',
  fontSize: '14px',
  fontWeight: 500,
  display: 'block',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const actionsContainerStyle = {
  display: 'flex',
  gap: '4px',
  flexShrink: 0
};

const actionButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(244, 244, 244, 0.1)',
  color: 'rgba(244, 244, 244, 0.7)',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px'
};

const deleteButtonStyle = {
  color: '#ef4444',
  borderColor: 'rgba(239, 68, 68, 0.2)'
};

export default DocumentModal;