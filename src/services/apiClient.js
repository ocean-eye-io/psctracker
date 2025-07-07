// src/services/apiClient.js

class ApiClient {
    constructor() {
      // Base URL for your AWS Lambda Function URL
      this.baseURL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
      this.timeout = 30000; // 30 seconds timeout
    }
  
    /**
     * Make HTTP request with error handling
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} url - Full URL or path
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async request(method, url, options = {}) {
      try {
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        const requestOptions = {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
          },
          ...options
        };
  
        // Add body for non-GET requests
        if (options.data && method.toUpperCase() !== 'GET') {
          requestOptions.body = JSON.stringify(options.data);
        }
  
        console.log(`ApiClient: Making ${method.toUpperCase()} request to ${fullUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        // Check if response is ok
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { message: errorText || `HTTP ${response.status}` };
          }
  
          throw new Error(`API request failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }
  
        // Parse JSON response
        const data = await response.json();
        console.log(`ApiClient: Request successful, received ${JSON.stringify(data).length} characters`);
        
        return { data, status: response.status, headers: response.headers };
  
      } catch (error) {
        console.error(`ApiClient: Request failed for ${method.toUpperCase()} ${url}:`, error);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        throw error;
      }
    }
  
    /**
     * GET request
     * @param {string} url - URL or path
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async get(url, options = {}) {
      return this.request('GET', url, options);
    }
  
    /**
     * POST request
     * @param {string} url - URL or path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async post(url, data = {}, options = {}) {
      return this.request('POST', url, { ...options, data });
    }
  
    /**
     * PUT request
     * @param {string} url - URL or path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async put(url, data = {}, options = {}) {
      return this.request('PUT', url, { ...options, data });
    }
  
    /**
     * PATCH request
     * @param {string} url - URL or path
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async patch(url, data = {}, options = {}) {
      return this.request('PATCH', url, { ...options, data });
    }
  
    /**
     * DELETE request
     * @param {string} url - URL or path
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async delete(url, options = {}) {
      return this.request('DELETE', url, options);
    }
  
    /**
     * Upload file using pre-signed URL
     * @param {string} uploadUrl - Pre-signed upload URL
     * @param {File} file - File to upload
     * @param {Object} options - Upload options
     * @returns {Promise<Response>} Upload response
     */
    async uploadFile(uploadUrl, file, options = {}) {
      try {
        console.log(`ApiClient: Uploading file ${file.name} (${file.size} bytes)`);
        
        const uploadOptions = {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
            'Content-Length': file.size.toString(),
            ...options.headers
          }
        };
  
        const response = await fetch(uploadUrl, uploadOptions);
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
  
        console.log('ApiClient: File upload successful');
        return response;
  
      } catch (error) {
        console.error('ApiClient: File upload failed:', error);
        throw error;
      }
    }
  
    /**
     * Download file using pre-signed URL
     * @param {string} downloadUrl - Pre-signed download URL
     * @param {string} filename - Filename for download
     * @returns {Promise<void>} Download completion
     */
    async downloadFile(downloadUrl, filename) {
      try {
        console.log(`ApiClient: Downloading file: ${filename}`);
        
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
  
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('ApiClient: File download completed');
  
      } catch (error) {
        console.error('ApiClient: File download failed:', error);
        throw error;
      }
    }
  
    /**
     * Set base URL
     * @param {string} url - New base URL
     */
    setBaseURL(url) {
      this.baseURL = url;
      console.log('ApiClient: Base URL updated to', url);
    }
  
    /**
     * Set timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
      this.timeout = timeout;
      console.log('ApiClient: Timeout updated to', timeout, 'ms');
    }
  
    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
      return {
        baseURL: this.baseURL,
        timeout: this.timeout
      };
    }
  }
  
  // Create and export a singleton instance
  const apiClient = new ApiClient();
  export default apiClient;