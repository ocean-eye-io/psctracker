import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Eye, 
  FileText, 
  X, 
  Plus, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Search,
  RefreshCw,
  FolderOpen,
  Cloud,
  File,
  Trash2
} from 'lucide-react';

const DocumentsDashboard = ({ 
  apiBaseUrl = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws/',
  currentUser = { name: 'User', id: 'anonymous' }
}) => {
  // State
  const [ports, setPorts] = useState([]);
  const [selectedUploadPort, setSelectedUploadPort] = useState('');
  const [selectedViewPort, setSelectedViewPort] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPorts, setIsLoadingPorts] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadPortSearch, setUploadPortSearch] = useState('');
  const [viewPortSearch, setViewPortSearch] = useState('');
  const [showUploadPortDropdown, setShowUploadPortDropdown] = useState(false);
  const [showViewPortDropdown, setShowViewPortDropdown] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const uploadPortDropdownRef = useRef(null);
  const viewPortDropdownRef = useRef(null);

  const API_BASE_URL = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;

  // Add CSS for animations
  useEffect(() => {
    if (!document.querySelector('#spin-keyframes')) {
      const style = document.createElement('style');
      style.id = 'spin-keyframes';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // API Functions
  const fetchPorts = async () => {
    try {
      setIsLoadingPorts(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/ports`);
      if (!response.ok) throw new Error(`Failed to fetch ports: ${response.status}`);
      const data = await response.json();
      setPorts(data.ports || []);
    } catch (error) {
      console.error('Error fetching ports:', error);
      setError(`Failed to load ports: ${error.message}`);
    } finally {
      setIsLoadingPorts(false);
    }
  };

  const fetchDocuments = async (portId) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/documents?port_id=${portId}`);
      if (!response.ok) throw new Error(`Failed to fetch documents: ${response.status}`);
      const data = await response.json();
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(`Failed to load documents: ${error.message}`);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // File handling
  const handleFileSelect = (files) => {
    if (!selectedUploadPort) {
      setError('Please select a port first');
      return;
    }

    const fileList = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileList.forEach(file => {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only PDF and Word documents are allowed`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 10MB`);
        return;
      }
      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending'
      });
    });

    if (errors.length > 0) setError(errors.join('; '));
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    setError(null);

    const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
    let successCount = 0;

    for (const fileItem of pendingFiles) {
      const success = await uploadFile(fileItem);
      if (success) successCount++;
    }

    if (successCount > 0) {
      setSuccessMessage(`Successfully uploaded ${successCount} file(s)`);
      if (selectedViewPort === selectedUploadPort) {
        fetchDocuments(selectedViewPort);
      }
    }

    setIsUploading(false);
    
    setTimeout(() => {
      setSelectedFiles(prev => prev.filter(f => f.status !== 'completed'));
      setUploadProgress({});
    }, 3000);
  };

  const uploadFile = async (fileItem) => {
    const { file, id } = fileItem;
    try {
      setUploadProgress(prev => ({ ...prev, [id]: 10 }));
      
      // Get upload URL
      const uploadUrlResponse = await fetch(`${API_BASE_URL}/api/documents/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port_id: selectedUploadPort,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size
        })
      });

      if (!uploadUrlResponse.ok) throw new Error('Failed to get upload URL');
      const { upload_url, s3_key } = await uploadUrlResponse.json();
      setUploadProgress(prev => ({ ...prev, [id]: 30 }));

      // Upload to S3
      const s3Response = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!s3Response.ok) throw new Error('S3 upload failed');
      setUploadProgress(prev => ({ ...prev, [id]: 70 }));

      // Save metadata
      const metadataResponse = await fetch(`${API_BASE_URL}/api/documents/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port_id: selectedUploadPort,
          s3_key: s3_key,
          original_file_name: file.name,
          file_size: file.size,
          file_type: file.type.includes('pdf') ? 'pdf' : 'docx',
          uploaded_by: currentUser.name
        })
      });

      if (!metadataResponse.ok) throw new Error('Failed to save metadata');

      setUploadProgress(prev => ({ ...prev, [id]: 100 }));
      setSelectedFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'completed' } : f
      ));

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setSelectedFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'error', error: error.message } : f
      ));
      return false;
    }
  };

  // Document actions
  const handleViewDocument = async (doc) => {
    try {
      console.log('Viewing document:', doc);
      const url = `${API_BASE_URL}/api/documents/${doc.id}/view-url`;
      console.log('View URL request:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get view URL: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('View response data:', data);
      
      // Open in new tab
      window.open(data.view_url, '_blank');
      
      setSuccessMessage(`Opening "${doc.original_file_name}" in new tab`);
      
    } catch (error) {
      console.error('View error:', error);
      setError(`Failed to view file: ${error.message}`);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      console.log('Downloading document:', doc);
      const url = `${API_BASE_URL}/api/documents/${doc.id}/download-url`;
      console.log('Download URL request:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Download response data:', data);
      
      // Create a temporary link and trigger download
      const link = window.document.createElement('a');
      link.href = data.download_url;
      link.download = doc.original_file_name;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      setSuccessMessage(`Download started for "${doc.original_file_name}"`);
      
    } catch (error) {
      console.error('Download error:', error);
      setError(`Failed to download file: ${error.message}`);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.original_file_name}"? This cannot be undone.`)) return;

    try {
      console.log('Deleting document:', doc);
      const url = `${API_BASE_URL}/api/documents/${doc.id}`;
      console.log('Delete URL request:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`Failed to delete document: ${response.status} ${response.statusText}`);
      }
      
      setSuccessMessage(`Document "${doc.original_file_name}" deleted successfully`);
      
      // Refresh documents list
      if (selectedViewPort) {
        console.log('Refreshing documents for port:', selectedViewPort);
        fetchDocuments(selectedViewPort);
      }
      
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Failed to delete file: ${error.message}`);
    }
  };

  // Helper functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf': 
        return React.createElement(File, { size: 16, style: { color: '#ef4444' } });
      case 'docx':
      case 'doc': 
        return React.createElement(FileText, { size: 16, style: { color: '#3b82f6' } });
      default: 
        return React.createElement(FileText, { size: 16, style: { color: '#94a3b8' } });
    }
  };

  const getSelectedPortInfo = (portId) => {
    const port = ports.find(p => p.id === parseInt(portId));
    return port ? `${port.port_name}, ${port.country_name}` : '';
  };

  const getFilteredPorts = (searchQuery) => {
    if (!searchQuery.trim()) return ports;
    const query = searchQuery.toLowerCase();
    return ports.filter(port => 
      port.port_name.toLowerCase().includes(query) ||
      port.country_name.toLowerCase().includes(query)
    );
  };

  // Port selection handlers
  const handleUploadPortSelect = (port) => {
    setSelectedUploadPort(port.id);
    setUploadPortSearch(`${port.port_name}, ${port.country_name}`);
    setShowUploadPortDropdown(false);
    setError(null);
  };

  const handleViewPortSelect = (port) => {
    setSelectedViewPort(port.id);
    setViewPortSearch(`${port.port_name}, ${port.country_name}`);
    setShowViewPortDropdown(false);
  };

  // Effects
  useEffect(() => {
    fetchPorts();
  }, []);

  useEffect(() => {
    if (selectedViewPort) {
      fetchDocuments(selectedViewPort);
    } else {
      setDocuments([]);
    }
  }, [selectedViewPort]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = documents.filter(doc =>
        doc.original_file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(documents);
    }
  }, [documents, searchQuery]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadPortDropdownRef.current && !uploadPortDropdownRef.current.contains(event.target)) {
        setShowUploadPortDropdown(false);
      }
      if (viewPortDropdownRef.current && !viewPortDropdownRef.current.contains(event.target)) {
        setShowViewPortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate stats
  const totalDocs = documents.length;
  const pdfDocs = documents.filter(doc => doc.file_type === 'pdf').length;
  const wordDocs = documents.filter(doc => doc.file_type === 'docx' || doc.file_type === 'doc').length;
  const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#0f172a',
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' }}>
              Port Documents
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#94a3b8' }}>
              <span>{totalDocs} docs</span>
              <span>{formatFileSize(totalSize)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              fetchPorts();
              if (selectedViewPort) fetchDocuments(selectedViewPort);
            }}
            style={{
              padding: '8px',
              backgroundColor: '#334155',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} style={{ animation: isLoadingPorts ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {[
            { label: 'Total', value: totalDocs, icon: FileText },
            { label: 'PDF', value: pdfDocs, icon: File },
            { label: 'Word', value: wordDocs, icon: FileText },
            { label: 'Size', value: formatFileSize(totalSize), icon: Cloud }
          ].map((stat, i) => (
            <div key={`stat-${i}`} style={{
              padding: '12px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{stat.value}</div>
              </div>
              <stat.icon size={18} style={{ color: '#60a5fa' }} />
            </div>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fca5a5'
          }}>
            <AlertCircle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#86efac'
          }}>
            <CheckCircle size={16} />
            <span style={{ flex: 1 }}>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage('')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Upload size={20} style={{ color: '#60a5fa' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Upload Documents</h2>
          </div>
          
          <div style={{ padding: '16px' }}>
            {/* Port Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Select Port
              </label>
              <div style={{ position: 'relative' }} ref={uploadPortDropdownRef}>
                <input
                  type="text"
                  value={uploadPortSearch}
                  onChange={(e) => {
                    setUploadPortSearch(e.target.value);
                    setShowUploadPortDropdown(true);
                    const exactMatch = ports.find(port => 
                      `${port.port_name}, ${port.country_name}` === e.target.value
                    );
                    if (!exactMatch) setSelectedUploadPort('');
                  }}
                  onFocus={() => setShowUploadPortDropdown(true)}
                  placeholder="Search and select a port..."
                  style={{
                    width: '100%',
                    padding: '8px 40px 8px 12px',
                    backgroundColor: '#334155',
                    border: `1px solid ${selectedUploadPort ? '#22c55e' : '#475569'}`,
                    borderRadius: '6px',
                    color: '#f1f5f9',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: selectedUploadPort ? '#22c55e' : '#94a3b8'
                }}>
                  {selectedUploadPort ? <CheckCircle size={16} /> : <Search size={16} />}
                </div>

                {showUploadPortDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#334155',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10
                  }}>
                    {getFilteredPorts(uploadPortSearch).map(port => (
                      <div
                        key={`upload-port-${port.id}`}
                        onClick={() => handleUploadPortSelect(port)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #475569'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#475569'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: '500' }}>{port.port_name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{port.country_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedUploadPort && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '6px',
                  color: '#86efac',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={16} />
                  <span>Selected: {getSelectedPortInfo(selectedUploadPort)}</span>
                </div>
              )}
            </div>

            {/* File Upload Area */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Upload Documents
              </label>
              <div
                style={{
                  border: `2px dashed ${dragActive ? '#3b82f6' : '#475569'}`,
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: selectedUploadPort ? 'pointer' : 'not-allowed',
                  opacity: selectedUploadPort ? 1 : 0.6,
                  backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (selectedUploadPort) setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileSelect(e.dataTransfer.files);
                  }
                }}
                onClick={() => selectedUploadPort && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                
                <Upload size={32} style={{ color: '#60a5fa', marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  {selectedUploadPort ? 'Drop files here or click to browse' : 'Please select a port first'}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  PDF and Word documents only, max 10MB per file
                </div>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>
                      Selected Files ({selectedFiles.length})
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedFiles([]);
                          setUploadProgress({});
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#334155',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          color: '#f1f5f9',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear All
                      </button>
                      <button
                        onClick={uploadAllFiles}
                        disabled={isUploading || selectedFiles.filter(f => f.status === 'pending').length === 0}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isUploading ? 
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 
                          <Upload size={12} />
                        }
                        Upload All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedFiles.map((fileItem) => (
                      <div
                        key={fileItem.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          backgroundColor: '#334155',
                          border: `1px solid ${
                            fileItem.status === 'completed' ? '#22c55e' : 
                            fileItem.status === 'error' ? '#ef4444' : '#475569'
                          }`,
                          borderRadius: '6px'
                        }}
                      >
                        <div>{getFileIcon(fileItem.file.name.split('.').pop())}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>
                            {fileItem.file.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {formatFileSize(fileItem.file.size)}
                          </div>
                          {uploadProgress[fileItem.id] !== undefined && (
                            <div style={{
                              width: '100%',
                              height: '4px',
                              backgroundColor: '#475569',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              marginTop: '4px'
                            }}>
                              <div style={{
                                width: `${uploadProgress[fileItem.id]}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {fileItem.status === 'completed' && (
                            <CheckCircle size={16} style={{ color: '#22c55e' }} />
                          )}
                          {fileItem.status === 'error' && (
                            <AlertCircle size={16} style={{ color: '#ef4444' }} />
                          )}
                          {uploadProgress[fileItem.id] !== undefined && uploadProgress[fileItem.id] < 100 && (
                            <Loader2 size={16} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                          )}
                          <button
                            onClick={() => {
                              setSelectedFiles(prev => prev.filter(f => f.id !== fileItem.id));
                              setUploadProgress(prev => {
                                const newProgress = { ...prev };
                                delete newProgress[fileItem.id];
                                return newProgress;
                              });
                            }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Documents Section */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FolderOpen size={20} style={{ color: '#60a5fa' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>View Documents</h2>
          </div>

          <div style={{ padding: '16px' }}>
            {/* Port Selection and Search */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: selectedViewPort ? 'repeat(auto-fit, minmax(250px, 1fr))' : '1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                  Select Port to View Documents
                </label>
                <div style={{ position: 'relative' }} ref={viewPortDropdownRef}>
                  <input
                    type="text"
                    value={viewPortSearch}
                    onChange={(e) => {
                      setViewPortSearch(e.target.value);
                      setShowViewPortDropdown(true);
                      const exactMatch = ports.find(port => 
                        `${port.port_name}, ${port.country_name}` === e.target.value
                      );
                      if (!exactMatch) setSelectedViewPort('');
                    }}
                    onFocus={() => setShowViewPortDropdown(true)}
                    placeholder="Search and select a port..."
                    style={{
                      width: '100%',
                      padding: '8px 40px 8px 12px',
                      backgroundColor: '#334155',
                      border: `1px solid ${selectedViewPort ? '#3b82f6' : '#475569'}`,
                      borderRadius: '6px',
                      color: '#f1f5f9',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: selectedViewPort ? '#3b82f6' : '#94a3b8'
                  }}>
                    {selectedViewPort ? <CheckCircle size={16} /> : <Search size={16} />}
                  </div>

                  {showViewPortDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#334155',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 10
                    }}>
                      {getFilteredPorts(viewPortSearch).map(port => (
                        <div
                          key={`view-port-${port.id}`}
                          onClick={() => handleViewPortSelect(port)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #475569'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#475569'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ fontWeight: '500' }}>{port.port_name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{port.country_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedViewPort && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    color: '#93c5fd',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={16} />
                    <span>Viewing: {getSelectedPortInfo(selectedViewPort)}</span>
                  </div>
                )}
              </div>

              {selectedViewPort && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Search Documents
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search by filename or uploader..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 40px 8px 40px',
                        backgroundColor: '#334155',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f1f5f9',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Search size={16} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8'
                    }} />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Documents Display */}
            {selectedViewPort ? (
              <div style={{
                border: '1px solid #475569',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <Loader2 size={32} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Loading documents...</div>
                  </div>
                ) : filteredDocuments.length > 0 ? (
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '16px', fontSize: '14px', color: '#94a3b8' }}>
                      Found {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredDocuments.map((doc) => (
                        <div
                          key={`doc-${doc.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: '#334155',
                            borderRadius: '6px',
                            border: '1px solid #475569'
                          }}
                        >
                          <div>{getFileIcon(doc.file_type)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              marginBottom: '4px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {doc.original_file_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {formatFileSize(doc.file_size)} • {doc.uploaded_by} • {new Date(doc.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              title="View document"
                              style={{
                                padding: '6px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '4px',
                                color: '#60a5fa',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              title="Download document"
                              style={{
                                padding: '6px',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                borderRadius: '4px',
                                color: '#22c55e',
                                cursor: 'pointer'
                              }}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              title="Delete document"
                              style={{
                                padding: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '4px',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#334155',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <FileText size={24} style={{ color: '#94a3b8' }} />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                      No documents found
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
                      {searchQuery ? 'No documents match your search criteria' : 'No documents have been uploaded for this port yet'}
                    </div>
                    {!searchQuery && (
                      <button
                        onClick={() => {
                          setSelectedUploadPort(selectedViewPort);
                          setUploadPortSearch(getSelectedPortInfo(selectedViewPort));
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto'
                        }}
                      >
                        <Plus size={16} />
                        Upload First Document
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 16px',
                border: '1px solid #475569',
                borderRadius: '8px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#334155',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <FolderOpen size={24} style={{ color: '#60a5fa' }} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                  Select a Port to View Documents
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Choose a port from the dropdown above to view and manage documents
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #334155',
          padding: '12px 0',
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cloud size={12} />
            Secure cloud storage
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsDashboard;