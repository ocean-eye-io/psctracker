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
      
      console.log(`[DocumentModal] Fetching documents for port ID: ${portId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/documents?port_id=${portId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[DocumentModal] Fetched ${data.length} documents:`, data);
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
      
      console.log(`[DocumentModal] Getting view URL for document ${document.id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/view-url`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DocumentModal] View URL API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to get view URL: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[DocumentModal] Got view URL:`, data);
      
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
      
      console.log(`[DocumentModal] Getting download URL for document ${document.id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/download-url`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DocumentModal] Download URL API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to get download URL: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[DocumentModal] Got download URL:`, data);
      
      // FIXED: Better download handling
      try {
        // Method 1: Try direct download with fetch
        const downloadResponse = await fetch(data.download_url);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          
          // Create blob URL and download
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = data.file_name || document.original_file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        } else {
          // Method 2: Fallback to direct link
          console.log('[DocumentModal] Direct fetch failed, using link method');
          const link = document.createElement('a');
          link.href = data.download_url;
          link.download = data.file_name || document.original_file_name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (downloadError) {
        console.error('[DocumentModal] Download method failed:', downloadError);
        // Method 3: Final fallback - open in new window
        window.open(data.download_url, '_blank');
      }
      
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
      
      console.log(`[DocumentModal] Deleting document ${document.id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DocumentModal] Delete API error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to delete document: ${response.status}`);
      }
      
      console.log(`[DocumentModal] Document ${document.id} deleted successfully`);
      
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format upload date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comments-modal-overlay">
      <div className="comments-modal" style={{ maxWidth: '700px' }}>
        {/* Header */}
        <div className="comments-modal-header">
          <div>
            <h2 className="comments-modal-title">
              Documents for {portName}
            </h2>
            <p className="comments-modal-subtitle">
              {loading ? 'Loading...' : `${documents.length} document${documents.length === 1 ? '' : 's'}`}
            </p>
          </div>
          
          <div className="filter-section-right">
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="control-btn"
              title="Refresh documents"
              style={{
                background: 'rgba(244, 244, 244, 0.05)',
                border: 'none',
                color: '#333333',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
            
            <button onClick={onClose} className="comments-modal-close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="comments-modal-body">
          {loading ? (
            <div className="loading-container">
              <Loader2 size={32} className="loading-spinner" />
              <p className="loading-message">Loading documents...</p>
            </div>
          ) : error ? (
            <div className="comments-error">
              <AlertCircle size={20} />
              <p>Error loading documents: {error}</p>
              <button onClick={fetchDocuments} className="reset-button">
                Try Again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="no-results">
              <FileText size={48} style={{ color: 'rgba(244, 244, 244, 0.6)', marginBottom: '16px' }} />
              <h3 style={{ color: '#f4f4f4', fontSize: '18px', margin: '0 0 8px' }}>No documents found</h3>
              <p style={{ color: 'rgba(244, 244, 244, 0.6)', fontSize: '14px', margin: '0', textAlign: 'center' }}>
                No documents have been uploaded for this port yet.
              </p>
            </div>
          ) : (
            <div className="filter-dropdown-items" style={{ maxHeight: 'unset', padding: '0' }}>
              {documents.map((doc, index) => (
                <div 
                  key={doc.id} 
                  className="filter-checkbox-item" 
                  style={{ 
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: index < documents.length - 1 ? '1px solid rgba(244, 244, 244, 0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '40px', 
                      height: '40px', 
                      background: 'rgba(59, 173, 229, 0.15)', 
                      borderRadius: '6px', 
                      flexShrink: 0 
                    }}>
                      <FileText size={20} style={{ color: '#3BADE5' }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: '#333333', 
                        fontSize: '14px', 
                        fontWeight: 500,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.original_file_name}
                      </div>
                      
                      <div style={{ 
                        color: 'rgba(244, 244, 244, 0.6)', 
                        fontSize: '12px',
                        display: 'flex',
                        gap: '12px'
                      }}>
                        {doc.file_size && (
                          <span>{formatFileSize(doc.file_size)}</span>
                        )}
                        {doc.upload_date && (
                          <span>{formatDate(doc.upload_date)}</span>
                        )}
                        {/* {doc.uploaded_by && (
                          <span>by {doc.uploaded_by}</span>
                        )} */}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleView(doc)}
                      disabled={isActionLoading(`view-${doc.id}`)}
                      className="action-button"
                      title="View document"
                      style={{ padding: '8px', width: '36px', height: '36px' }}
                    >
                      {isActionLoading(`view-${doc.id}`) ? (
                        <Loader2 size={16} className="spinning" />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isActionLoading(`download-${doc.id}`)}
                      className="action-button"
                      title="Download document"
                      style={{ 
                        padding: '8px', 
                        width: '36px', 
                        height: '36px',
                        background: 'rgba(46, 204, 113, 0.1)',
                        borderColor: 'rgba(46, 204, 113, 0.2)',
                        color: '#2ECC71'
                      }}
                    >
                      {isActionLoading(`download-${doc.id}`) ? (
                        <Loader2 size={16} className="spinning" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={isActionLoading(`delete-${doc.id}`)}
                      className="action-button"
                      style={{ 
                        padding: '8px', 
                        width: '36px', 
                        height: '36px',
                        background: 'rgba(231, 76, 60, 0.1)',
                        borderColor: 'rgba(231, 76, 60, 0.2)',
                        color: '#E74C3C'
                      }}
                      title="Delete document"
                    >
                      {isActionLoading(`delete-${doc.id}`) ? (
                        <Loader2 size={16} className="spinning" />
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

      {/* Add spinning animation CSS */}
      <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DocumentModal;