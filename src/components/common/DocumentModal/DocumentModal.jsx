// src/components/common/DocumentModal/DocumentModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Calendar,
  User,
  HardDrive
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getFileTypeIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText style={{ color: '#ef4444' }} size={20} />;
      case 'docx':
      case 'doc':
        return <FileText style={{ color: '#3b82f6' }} size={20} />;
      default:
        return <FileText style={{ color: '#6b7280' }} size={20} />;
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
              {loading ? 'Loading...' : `${documents.length} document${documents.length === 1 ? '' : 's'} available`}
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
              <FileText size={48} style={{ color: '#9ca3af' }} />
              <h3 style={emptyTitleStyle}>No documents found</h3>
              <p style={emptyTextStyle}>No documents have been uploaded for this port yet.</p>
            </div>
          ) : (
            <div style={documentsGridStyle}>
              {documents.map((doc) => (
                <div key={doc.id} style={documentCardStyle}>
                  <div style={documentHeaderStyle}>
                    <div style={fileIconStyle}>
                      {getFileTypeIcon(doc.file_type)}
                    </div>
                    <div style={fileInfoStyle}>
                      <h4 style={fileNameStyle} title={doc.original_file_name}>
                        {doc.original_file_name}
                      </h4>
                      <div style={fileMetadataStyle}>
                        <span style={metadataItemStyle}>
                          <HardDrive size={12} />
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span style={metadataItemStyle}>
                          <Calendar size={12} />
                          {formatDate(doc.upload_date)}
                        </span>
                        {doc.uploaded_by && (
                          <span style={metadataItemStyle}>
                            <User size={12} />
                            {doc.uploaded_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={documentActionsStyle}>
                    <button
                      onClick={() => handleView(doc)}
                      disabled={isActionLoading(`view-${doc.id}`)}
                      style={viewButtonStyle}
                      title="View document"
                    >
                      {isActionLoading(`view-${doc.id}`) ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Eye size={16} />
                      )}
                      View
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isActionLoading(`download-${doc.id}`)}
                      style={downloadButtonStyle}
                      title="Download document"
                    >
                      {isActionLoading(`download-${doc.id}`) ? (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Download size={16} />
                      )}
                      Download
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

// Styles as JavaScript objects
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
  maxWidth: '800px',
  width: '100%',
  maxHeight: '80vh',
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
  padding: '24px',
  minHeight: '200px'
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
  margin: '16px 0 0',
  fontSize: '16px'
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

const documentsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '16px'
};

const documentCardStyle = {
  background: 'rgba(244, 244, 244, 0.05)',
  border: '1px solid rgba(244, 244, 244, 0.1)',
  borderRadius: '8px',
  padding: '16px',
  transition: 'all 0.2s ease'
};

const documentHeaderStyle = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px'
};

const fileIconStyle = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  background: 'rgba(244, 244, 244, 0.1)',
  borderRadius: '6px'
};

const fileInfoStyle = {
  flex: 1,
  minWidth: 0
};

const fileNameStyle = {
  margin: '0 0 8px',
  color: '#f4f4f4',
  fontSize: '14px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const fileMetadataStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontSize: '12px',
  color: 'rgba(244, 244, 244, 0.6)'
};

const metadataItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

const documentActionsStyle = {
  display: 'flex',
  gap: '8px'
};

const viewButtonStyle = {
  background: 'rgba(34, 197, 94, 0.1)',
  border: '1px solid rgba(34, 197, 94, 0.2)',
  color: '#22c55e',
  padding: '8px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
  flex: 1,
  justifyContent: 'center'
};

const downloadButtonStyle = {
  background: 'rgba(59, 173, 229, 0.1)',
  border: '1px solid rgba(59, 173, 229, 0.2)',
  color: '#3bade5',
  padding: '8px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease',
  flex: 1,
  justifyContent: 'center'
};

export default DocumentModal;