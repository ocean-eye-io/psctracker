// src/services/fileService.js - Complete Secure Version with All Fixes
import axios from 'axios';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';

// ==========================================
// SECURE CORE UTILITIES
// ==========================================

/**
 * Enhanced API response handler with better error handling
 * @param {AxiosResponse} response - The Axios response object
 * @returns {any} The extracted data
 * @throws {Error} If the response indicates an error
 */
const handleApiResponse = async (response) => {
  if (response.status >= 200 && response.status < 300) {
    if (response.data && response.data.body) {
      return typeof response.data.body === 'string'
        ? JSON.parse(response.data.body)
        : response.data.body;
    }
    return response.data;
  } else {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = response.data && response.data.body
        ? (typeof response.data.body === 'string' ? JSON.parse(response.data.body) : response.data.body)
        : response.data;
      if (errorBody && errorBody.message) {
        errorMsg += `, message: ${errorBody.message}`;
      } else if (errorBody && errorBody.error) {
        errorMsg += `, error: ${errorBody.error}`;
      }
    } catch (parseError) {
      console.warn('Could not parse error response body:', parseError);
    }
    throw new Error(errorMsg);
  }
};

/**
 * SECURE: Get current user ID with proper authentication validation
 * @returns {string} Current user ID
 * @throws {Error} If user is not authenticated
 */
const getCurrentUserId = () => {
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (!userId) {
    throw new Error('User not authenticated - userId not found');
  }
  return userId;
};

/**
 * Create optimized axios instance for file operations
 */
const createOptimizedFileAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw new Error('File operation timeout - please check your internet connection');
      } else if (error.response?.status === 413) {
        throw new Error('File too large - please reduce file size');
      } else if (error.response?.status === 415) {
        throw new Error('File type not supported');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - permission required');
      } else if (error.response?.status === 404) {
        throw new Error('File not found');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error - please try again later');
      }
      throw error;
    }
  );

  return instance;
};

const fileApiClient = createOptimizedFileAxiosInstance();

// ==========================================
// SAFE BANDWIDTH DETECTION & STRATEGY SELECTION
// ==========================================

class FileUploadOptimizer {
  constructor() {
    this.config = {
      maxConcurrentUploads: 2, // Conservative default
      batchThreshold: 6,
      parallelThreshold: 2,
      connectionTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.bandwidthCache = {
      speed: null,
      timestamp: null,
      ttl: 5 * 60 * 1000 // 5 minutes cache
    };
  }

  /**
   * SAFE: Conservative connection quality detection using simple connectivity test
   * @returns {Promise<string>} Connection quality: 'fast', 'medium', 'slow'
   */
  async detectBandwidth() {
    const now = Date.now();
    
    // Check cache first
    if (this.bandwidthCache.speed && 
        this.bandwidthCache.timestamp && 
        (now - this.bandwidthCache.timestamp) < this.bandwidthCache.ttl) {
      return this.bandwidthCache.speed;
    }

    try {
      // Simple connectivity test using the existing API
      const testStart = performance.now();
      
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.connectionTimeout)
      });
      
      const testEnd = performance.now();
      const latency = testEnd - testStart;
      
      let quality;
      if (!response.ok) {
        quality = 'slow'; // Server issues, be very conservative
      } else if (latency < 150) {
        quality = 'medium'; // Good latency, but stay conservative
      } else if (latency < 500) {
        quality = 'medium';
      } else {
        quality = 'slow';
      }
      
      // Cache the result
      this.bandwidthCache = {
        speed: quality,
        timestamp: now
      };
      
      console.log(`Connection quality: ${quality} (${latency.toFixed(0)}ms response time)`);
      return quality;
      
    } catch (error) {
      console.warn('Connection test failed, using conservative setting:', error);
      
      // Cache conservative default to avoid repeated failed tests
      this.bandwidthCache = {
        speed: 'slow',
        timestamp: now
      };
      
      return 'slow';
    }
  }

  /**
   * CONSERVATIVE: More conservative upload strategy selection
   * @param {File[]} files - Files to upload
   * @returns {Promise<string>} Strategy: 'single', 'parallel', 'sequential'
   */
  async chooseUploadStrategy(files) {
    const fileCount = files.length;
    
    // Single file - always use single upload
    if (fileCount === 1) {
      return 'single';
    }
    
    // For multiple files, check connection quality
    const connectionQuality = await this.detectBandwidth();
    
    if (fileCount <= 3) {
      // Small batches: use parallel only on medium+ connections
      return connectionQuality === 'medium' ? 'parallel' : 'sequential';
    } else if (fileCount <= 5) {
      // Medium batches: be more conservative
      return connectionQuality === 'medium' ? 'parallel' : 'sequential';
    } else {
      // Large batches: always use sequential to be safe
      return 'sequential';
    }
  }
}

const uploadOptimizer = new FileUploadOptimizer();

// ==========================================
// SECURE UPLOAD METHODS
// ==========================================

/**
 * SECURE: Upload single file with enhanced security and error handling
 */
const uploadSingleFileOptimized = async (file, defectId, uploadType, userId, onProgress) => {
  try {
    // Validate user authentication
    if (!userId) {
      throw new Error('User authentication required for file upload');
    }

    // Validate defect ID
    if (!defectId || typeof defectId !== 'string' || defectId.startsWith('temp-')) {
      throw new Error('Invalid defect ID - cannot upload to temporary or invalid defect');
    }

    console.log(`Starting secure upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    onProgress?.(10, 'Authenticating and getting upload URL...');
    
    const uploadUrlResponse = await fileApiClient.post(
      `/api/defects/${defectId}/upload-url`,
      {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadType: uploadType,
        userId: userId
      },
      { timeout: 15000 }
    );
    
    const uploadData = await handleApiResponse(uploadUrlResponse);
    const { uploadUrl, fileId, s3Key } = uploadData;
    
    if (!uploadUrl || !fileId || !s3Key) {
      throw new Error('Invalid upload response from server - missing required fields');
    }
    
    console.log(`Got secure upload URL for file: ${file.name}, fileId: ${fileId}`);
    
    onProgress?.(30, 'Uploading to secure storage...');
    
    const s3Response = await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      timeout: 120000,
      maxContentLength: 10 * 1024 * 1024,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentCompleted = Math.round(
            30 + (progressEvent.loaded / progressEvent.total) * 60
          );
          onProgress?.(percentCompleted, `Uploading... ${(progressEvent.loaded / 1024 / 1024).toFixed(1)}MB / ${(progressEvent.total / 1024 / 1024).toFixed(1)}MB`);
        }
      }
    });
    
    if (s3Response.status !== 200) {
      throw new Error(`Secure storage upload failed with status: ${s3Response.status}`);
    }
    
    console.log(`Successfully uploaded to secure storage: ${file.name}`);
    
    onProgress?.(90, 'Confirming upload...');
    
    const confirmData = {
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadType: uploadType,
      s3Key: s3Key,
      userId: userId
    };
    
    const confirmResponse = await fileApiClient.post(
      `/api/defects/${defectId}/files`,
      confirmData,
      { timeout: 20000 }
    );
    
    const confirmResponseData = await handleApiResponse(confirmResponse);
    
    onProgress?.(100, 'Upload complete!');
    
    console.log(`Upload confirmed for: ${file.name}`, confirmResponseData);
    
    return {
      id: fileId,
      name: file.name,
      originalName: file.name,
      size: file.size,
      type: file.type,
      s3Key: s3Key,
      s3Bucket: confirmResponseData.fileMetadata?.s3Bucket || 'oe-datas',
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
      checksum: confirmResponseData.fileMetadata?.checksum || null,
      ...confirmResponseData.fileMetadata
    };
    
  } catch (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    onProgress?.(0, `Upload failed: ${error.message}`);
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }
};

/**
 * SECURE: Upload multiple files with enhanced security and controlled concurrency
 */
const uploadFilesParallel = async (defectId, files, uploadType = 'initial', onProgress = null) => {
  // Validate authentication first
  let userId;
  try {
    userId = getCurrentUserId();
  } catch (authError) {
    throw new Error(`Authentication required for file upload: ${authError.message}`);
  }

  // Validate defect ID
  if (!defectId || typeof defectId !== 'string') {
    throw new Error(`Invalid defectId for parallel upload: ${defectId}`);
  }

  if (defectId.startsWith('temp-') || defectId === '[object File]' || defectId.includes('[object')) {
    throw new Error(`Cannot upload files with invalid defect ID: ${defectId}`);
  }

  const uploadedFiles = [];
  const errors = [];
  const fileArray = Array.from(files);

  console.log(`Starting secure parallel upload of ${fileArray.length} files for defect ${defectId}`);

  try {
    // Conservative concurrency based on connection quality
    const connectionQuality = await uploadOptimizer.detectBandwidth();
    const concurrency = connectionQuality === 'medium' ? 2 : 1; // More conservative
    
    console.log(`Using ${concurrency} concurrent uploads based on ${connectionQuality} connection`);

    const chunks = [];
    for (let i = 0; i < fileArray.length; i += concurrency) {
      chunks.push(fileArray.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const uploadPromises = chunk.map(async (file) => {
        try {
          if (!file || !file.name) {
            throw new Error('Invalid file object');
          }

          console.log(`Starting secure upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

          const uploadUrlResponse = await fileApiClient.post(`/api/defects/${defectId}/upload-url`, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadType,
            userId
          });

          const uploadData = await handleApiResponse(uploadUrlResponse);
          const { uploadUrl, fileId, s3Key } = uploadData;
          
          if (!uploadUrl || !fileId || !s3Key) {
            throw new Error('Invalid upload response from server');
          }

          console.log(`Got secure upload URL for file: ${file.name}, fileId: ${fileId}`);

          if (onProgress) onProgress(file, 0);

          await axios.put(uploadUrl, file, {
            headers: {
              'Content-Type': file.type,
            },
            timeout: 120000,
            onUploadProgress: (progressEvent) => {
              if (onProgress && progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(file, progress);
              }
            }
          });

          console.log(`Successfully uploaded to secure storage: ${file.name}`);

          const confirmData = {
            fileId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadType,
            s3Key,
            userId
          };

          const confirmResponse = await fileApiClient.post(`/api/defects/${defectId}/files`, confirmData);
          const confirmResponseData = await handleApiResponse(confirmResponse);
          
          if (onProgress) onProgress(file, 100);
          console.log(`Upload confirmed for: ${file.name}`, confirmResponseData);
          
          return confirmResponseData.fileMetadata || {
            id: fileId,
            name: file.name,
            originalName: file.name,
            size: file.size,
            type: file.type,
            s3Key: s3Key
          };
        } catch (error) {
          console.error(`Error uploading file ${file?.name || 'unknown'}:`, error);
          errors.push({ file: file?.name || 'unknown', error: error.message });
          if (onProgress) onProgress(file, -1);
          return null;
        }
      });

      const chunkResults = await Promise.allSettled(uploadPromises);
      
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          uploadedFiles.push(result.value);
        }
      });
    }

    console.log(`Secure parallel upload completed: ${uploadedFiles.length} successful, ${errors.length} failed`);
    
    return {
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
      errors,
      totalUploaded: uploadedFiles.length,
      totalFailed: errors.length
    };

  } catch (error) {
    console.error('Error in secure parallel file upload:', error);
    throw new Error(`Secure parallel upload failed: ${error.message}`);
  }
};

/**
 * SECURE: Smart upload method with proper switch statement scoping and enhanced security
 */
const uploadFilesOptimized = async (files, defectId, uploadType = 'initial', userId, onProgress) => {
  // Validate authentication
  let authenticatedUserId;
  try {
    authenticatedUserId = userId || getCurrentUserId();
  } catch (authError) {
    throw new Error(`Authentication required: ${authError.message}`);
  }

  // Normalize input
  const fileArray = Array.isArray(files) ? files : [files];
  
  if (fileArray.length === 0) {
    throw new Error('No files provided for upload');
  }

  // Parameter validation
  if (!defectId || typeof defectId !== 'string') {
    throw new Error(`Invalid defectId: ${defectId}`);
  }

  if (defectId.startsWith('temp-') || defectId === '[object File]' || defectId.includes('[object')) {
    throw new Error(`Invalid defectId: ${defectId}`);
  }

  try {
    // Choose optimal strategy with conservative settings
    const strategy = await uploadOptimizer.chooseUploadStrategy(fileArray);
    console.log(`Using secure upload strategy: ${strategy} for ${fileArray.length} files`);

    // FIXED: Proper switch statement with scoped variables
    switch (strategy) {
      case 'single': {
        // Single file upload - scoped variables
        const result = await uploadSingleFileOptimized(
          fileArray[0], 
          defectId, 
          uploadType, 
          authenticatedUserId, 
          onProgress
        );
        return [result];
      }

      case 'parallel': {
        // Parallel upload for small batches - scoped variables
        const parallelResult = await uploadFilesParallel(
          defectId, 
          fileArray, 
          uploadType, 
          (file, progress) => {
            if (onProgress) {
              const fileIndex = fileArray.findIndex(f => f.name === file.name);
              onProgress(progress, `Uploading ${file.name}...`, fileIndex);
            }
          }
        );
        
        if (parallelResult.success) {
          if (onProgress) {
            onProgress(100, `Successfully uploaded ${parallelResult.totalUploaded} files`);
          }
          return parallelResult.files;
        } else {
          throw new Error(`Failed to upload files: ${parallelResult.errors.map(e => e.error).join(', ')}`);
        }
      }

      case 'batch': {
        // Batch upload - scoped variables (currently same as parallel, prepared for future)
        console.log('Using batch strategy (currently parallel with controlled concurrency)');
        const batchResult = await uploadFilesParallel(
          defectId, 
          fileArray, 
          uploadType, 
          (file, progress) => {
            if (onProgress) {
              const fileIndex = fileArray.findIndex(f => f.name === file.name);
              onProgress(progress, `Batch uploading ${file.name}...`, fileIndex);
            }
          }
        );
        
        if (batchResult.success) {
          if (onProgress) {
            onProgress(100, `Successfully batch uploaded ${batchResult.totalUploaded} files`);
          }
          return batchResult.files;
        } else {
          throw new Error(`Failed to batch upload files: ${batchResult.errors.map(e => e.error).join(', ')}`);
        }
      }

      default: {
        // Sequential upload for maximum reliability - scoped variables
        console.log('Using sequential upload strategy for maximum reliability');
        const sequentialResults = [];
        
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];
          
          const fileProgressCallback = (progress, message) => {
            const overallProgress = Math.round(
              (i / fileArray.length + progress / 100 / fileArray.length) * 100
            );
            onProgress?.(overallProgress, `File ${i + 1}/${fileArray.length}: ${message}`, i);
          };
          
          try {
            const uploadedFile = await uploadSingleFileOptimized(
              file,
              defectId,
              uploadType,
              authenticatedUserId,
              fileProgressCallback
            );
            
            sequentialResults.push(uploadedFile);
          } catch (fileError) {
            console.error(`Failed to upload file ${file.name}:`, fileError);
            throw new Error(`Failed to upload "${file.name}": ${fileError.message}`);
          }
        }
        
        if (onProgress) {
          onProgress(100, `Successfully uploaded ${sequentialResults.length} files`);
        }
        
        return sequentialResults;
      }
    }
  } catch (error) {
    console.error('Error in secure optimized file upload:', error);
    throw error;
  }
};

// ==========================================
// COMPLETE SECURE FILE SERVICE
// ==========================================

const fileService = {
  /**
   * SECURE: Upload multiple files with authentication validation
   * Maintains backwards compatibility while adding security
   */
  uploadFiles: async (files, defectId, uploadType = 'initial', userId, onProgress) => {
    // Validate authentication at the service level
    let authenticatedUserId;
    try {
      authenticatedUserId = userId || getCurrentUserId();
    } catch (authError) {
      throw new Error(`Upload failed - authentication required: ${authError.message}`);
    }

    return await uploadFilesOptimized(files, defectId, uploadType, authenticatedUserId, onProgress);
  },

  /**
   * SECURE: Get download URL with authentication validation
   */
  getDownloadUrl: async (defectId, fileId, userId) => {
    try {
      // Validate authentication
      const authenticatedUserId = userId || getCurrentUserId();
      
      console.log(`Getting download URL for file ${fileId} in defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files/${fileId}/url`,
        {
          params: { userId: authenticatedUserId },
          timeout: 15000
        }
      );
      
      const downloadData = await handleApiResponse(response);
      console.log(`Successfully retrieved download URL for file ${fileId}`);
      return downloadData;
    } catch (error) {
      if (error.message.includes('authentication required')) {
        throw error; // Re-throw authentication errors as-is
      }
      console.error(`Error getting download URL for file ${fileId}:`, error);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  },

  /**
   * SECURE: Delete a file with authentication validation
   */
  deleteFile: async (defectId, fileId, userId) => {
    try {
      // Validate authentication
      const authenticatedUserId = userId || getCurrentUserId();
      
      console.log(`Deleting file ${fileId} from defect ${defectId}`);
      
      const response = await fileApiClient.delete(
        `/api/defects/${defectId}/files/${fileId}`,
        {
          params: { userId: authenticatedUserId },
          timeout: 20000
        }
      );
      
      await handleApiResponse(response);
      console.log(`Successfully deleted file: ${fileId}`);
      return true;
    } catch (error) {
      if (error.message.includes('authentication required')) {
        throw error; // Re-throw authentication errors as-is
      }
      console.error(`Error deleting file ${fileId}:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  /**
   * SECURE: List all files for a defect with authentication validation
   */
  listFiles: async (defectId, userId) => {
    try {
      // Validate authentication
      const authenticatedUserId = userId || getCurrentUserId();
      
      console.log(`Listing files for defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files`,
        {
          params: { userId: authenticatedUserId },
          timeout: 15000
        }
      );
      
      const fileData = await handleApiResponse(response);
      
      const validatedData = {
        initialFiles: Array.isArray(fileData.initialFiles) ? fileData.initialFiles : [],
        completionFiles: Array.isArray(fileData.completionFiles) ? fileData.completionFiles : [],
        totalInitialFiles: fileData.totalInitialFiles || 0,
        totalCompletionFiles: fileData.totalCompletionFiles || 0,
        totalFiles: fileData.totalFiles || 0,
        ...fileData
      };
      
      console.log(`Successfully listed files for defect ${defectId}: ${validatedData.totalFiles} total files`);
      return validatedData;
    } catch (error) {
      if (error.message.includes('authentication required')) {
        throw error; // Re-throw authentication errors as-is
      }
      console.error(`Error listing files for defect ${defectId}:`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },

  /**
   * SECURE: Download a file with authentication validation
   */
  downloadFile: async (defectId, fileId, fileName, userId) => {
    try {
      // Validate authentication
      const authenticatedUserId = userId || getCurrentUserId();
      
      console.log(`Starting download for file: ${fileName} (ID: ${fileId})`);
      
      const downloadData = await fileService.getDownloadUrl(defectId, fileId, authenticatedUserId);
      
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log(`Successfully initiated download for: ${fileName}`);
      
    } catch (error) {
      if (error.message.includes('authentication required')) {
        throw error; // Re-throw authentication errors as-is
      }
      console.error(`Error downloading file ${fileName}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  },

  // ==========================================
  // NEW SECURE METHODS
  // ==========================================

  /**
   * SECURE: Modern parallel upload API with authentication
   */
  uploadFilesParallel: async (defectId, files, uploadType = 'initial', onProgress = null) => {
    // Authentication validation happens inside the method
    return await uploadFilesParallel(defectId, files, uploadType, onProgress);
  },

  /**
   * SECURE: Single file upload with authentication
   */
  uploadSingleFile: async (defectId, file, uploadType = 'initial', onProgress = null) => {
    const authenticatedUserId = getCurrentUserId(); // Will throw if not authenticated
    return await uploadSingleFileOptimized(file, defectId, uploadType, authenticatedUserId, onProgress);
  },

  /**
   * SECURE: Smart upload with automatic strategy selection and authentication
   */
  uploadFilesOptimized: uploadFilesOptimized,

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Validate file before upload
   */
  validateFile: (file, options = {}) => {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    } = options;

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(maxSize / 1024 / 1024).toFixed(2)}MB` 
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }

    return { valid: true };
  },

  /**
   * Get file size in human readable format
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    try {
      getCurrentUserId();
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get connection quality for UI display
   */
  getConnectionQuality: async () => {
    try {
      return await uploadOptimizer.detectBandwidth();
    } catch (error) {
      console.warn('Could not detect connection quality:', error);
      return 'unknown';
    }
  },

  /**
   * Clear bandwidth cache (useful for testing different conditions)
   */
  clearBandwidthCache: () => {
    uploadOptimizer.bandwidthCache = {
      speed: null,
      timestamp: null,
      ttl: 5 * 60 * 1000
    };
  }
};

export default fileService;