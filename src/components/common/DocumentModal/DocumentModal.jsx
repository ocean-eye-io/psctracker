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
    <div className="comments-modal-overlay">
      <div className="comments-modal">
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
          
          <div className="filter-section-right"> {/* Reusing filter-section-right for button grouping */}
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className={`control-btn ${loading ? 'spinning' : ''}`}
              title="Refresh documents"
            >
              <RefreshCw size={18} />
            </button>
            
            <button onClick={onClose} className="comments-modal-close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="comments-modal-body">
          {loading ? (
            <div className="loading-container"> {/* Reusing loading-container */}
              <Loader2 size={32} className="loading-spinner" />
              <p className="loading-message">Loading documents...</p>
            </div>
          ) : error ? (
            <div className="comments-error"> {/* Reusing comments-error */}
              <AlertCircle size={20} />
              <p>Error loading documents: {error}</p>
              <button onClick={fetchDocuments} className="reset-filters"> {/* Reusing reset-filters */}
                Try Again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="no-results"> {/* Reusing no-results */}
              <FileText size={48} style={{ color: 'var(--text-muted-light)' }} />
              <h3 style={{ color: 'var(--text-dark)', fontSize: '18px', margin: '16px 0 8px' }}>No documents found</h3>
              <p style={{ color: 'var(--text-muted-light)', fontSize: '14px', margin: '0' }}>No documents have been uploaded for this port yet.</p>
            </div>
          ) : (
            <div className="filter-dropdown-items" style={{ maxHeight: 'unset', padding: '0' }}> {/* Reusing filter-dropdown-items for list styling */}
              {documents.map((doc, index) => (
                <div key={doc.id} className="filter-checkbox-item" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'rgba(0, 123, 255, 0.1)', borderRadius: '6px', flexShrink: 0 }}>
                      <FileText size={18} style={{ color: 'var(--primary-accent-light)' }} />
                    </div>
                    <div className="text-ellipsis" style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-dark)', fontSize: '14px', fontWeight: 500 }}>
                        {doc.original_file_name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="filter-section-right" style={{ gap: '4px', marginLeft: '0' }}> {/* Reusing filter-section-right for button grouping */}
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
                      style={{ padding: '8px', width: '36px', height: '36px' }}
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
                      style={{ padding: '8px', width: '36px', height: '36px', color: 'var(--danger-color-light)', borderColor: 'rgba(220, 53, 69, 0.2)' }}
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
    </div>
  );
};

export default DocumentModal;