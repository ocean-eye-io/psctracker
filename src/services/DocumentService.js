// src/services/DocumentService.js
class DocumentService {
    constructor() {
      this.baseURL = '/api'; // Adjust based on your API base URL
    }
  
    /**
     * Get documents for a specific port
     */
    async getDocuments(portId) {
      try {
        const response = await fetch(`${this.baseURL}/documents?port_id=${portId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
        }
        
        const documents = await response.json();
        return documents;
      } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }
    }
  
    /**
     * Get document counts summary for all ports
     */
    async getDocumentSummary() {
      try {
        const response = await fetch(`${this.baseURL}/documents/summary`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document summary: ${response.status} ${response.statusText}`);
        }
        
        const summary = await response.json();
        return summary;
      } catch (error) {
        console.error('Error fetching document summary:', error);
        throw error;
      }
    }
  
    /**
     * Get view URL for a document
     */
    async getViewUrl(documentId) {
      try {
        const response = await fetch(`${this.baseURL}/documents/${documentId}/view-url`);
        
        if (!response.ok) {
          throw new Error(`Failed to get view URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error getting view URL:', error);
        throw error;
      }
    }
  
    /**
     * Get download URL for a document
     */
    async getDownloadUrl(documentId) {
      try {
        const response = await fetch(`${this.baseURL}/documents/${documentId}/download-url`);
        
        if (!response.ok) {
          throw new Error(`Failed to get download URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error getting download URL:', error);
        throw error;
      }
    }
  
    /**
     * Upload a document
     */
    async uploadDocument(portId, file, uploadedBy = 'Anonymous') {
      try {
        // Step 1: Get pre-signed upload URL
        const uploadUrlResponse = await fetch(`${this.baseURL}/documents/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            port_id: portId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          }),
        });
  
        if (!uploadUrlResponse.ok) {
          throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status} ${uploadUrlResponse.statusText}`);
        }
  
        const uploadData = await uploadUrlResponse.json();
  
        // Step 2: Upload file to S3
        const uploadResponse = await fetch(uploadData.upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
  
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
  
        // Step 3: Save metadata
        const metadataResponse = await fetch(`${this.baseURL}/documents/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            port_id: portId,
            s3_key: uploadData.s3_key,
            original_file_name: file.name,
            file_size: file.size,
            file_type: this.getFileTypeFromMime(file.type),
            uploaded_by: uploadedBy,
          }),
        });
  
        if (!metadataResponse.ok) {
          throw new Error(`Failed to save metadata: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
  
        const metadata = await metadataResponse.json();
        return metadata;
      } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
      }
    }
  
    /**
     * Delete a document
     */
    async deleteDocument(documentId) {
      try {
        const response = await fetch(`${this.baseURL}/documents/${documentId}`, {
          method: 'DELETE',
        });
  
        if (!response.ok) {
          throw new Error(`Failed to delete document: ${response.status} ${response.statusText}`);
        }
  
        const result = await response.json();
        return result;
      } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
      }
    }
  
    /**
     * Get document statistics
     */
    async getDocumentStats(portId = null) {
      try {
        const url = portId 
          ? `${this.baseURL}/documents/stats?port_id=${portId}`
          : `${this.baseURL}/documents/stats`;
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document stats: ${response.status} ${response.statusText}`);
        }
        
        const stats = await response.json();
        return stats;
      } catch (error) {
        console.error('Error fetching document stats:', error);
        throw error;
      }
    }
  
    /**
     * Get all ports for dropdown
     */
    async getPorts() {
      try {
        const response = await fetch(`${this.baseURL}/ports`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ports: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.ports || [];
      } catch (error) {
        console.error('Error fetching ports:', error);
        throw error;
      }
    }
  
    /**
     * Validate file before upload
     */
    validateFile(file) {
      const errors = [];
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        errors.push('File size must be less than 10MB');
      }
      
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        errors.push('Only PDF and Word documents are allowed');
      }
      
      // Check file name
      if (!file.name || file.name.trim() === '') {
        errors.push('File must have a valid name');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Get file type from MIME type
     */
    getFileTypeFromMime(mimeType) {
      switch (mimeType) {
        case 'application/pdf':
          return 'pdf';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return 'docx';
        case 'application/msword':
          return 'doc';
        default:
          return 'unknown';
      }
    }
  
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
      if (!bytes) return 'Unknown size';
      
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
  
    /**
     * Format date for display
     */
    formatDate(dateString) {
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
    }
  
    /**
     * Get file extension from filename
     */
    getFileExtension(filename) {
      return filename.split('.').pop()?.toLowerCase() || '';
    }
  
    /**
     * Check if file is PDF
     */
    isPDF(filename) {
      return this.getFileExtension(filename) === 'pdf';
    }
  
    /**
     * Check if file is Word document
     */
    isWordDocument(filename) {
      const ext = this.getFileExtension(filename);
      return ext === 'doc' || ext === 'docx';
    }
  
    /**
     * Generate file type icon class
     */
    getFileTypeClass(filename) {
      if (this.isPDF(filename)) {
        return 'file-pdf';
      } else if (this.isWordDocument(filename)) {
        return 'file-word';
      } else {
        return 'file-generic';
      }
    }
  }
  
  // Create singleton instance
  const documentService = new DocumentService();
  
  export default documentService;