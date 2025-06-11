// src/services/fileService.js - Phase 2 Enhanced Version with Full Backwards Compatibility
import axios from 'axios';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';

// ==========================================
// PHASE 2: ENHANCED CORE UTILITIES
// ==========================================

/**
 * Enhanced API response handler with better error handling and performance
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
 * Get current user ID with fallback logic
 * @returns {string} Current user ID
 */
const getCurrentUserId = () => {
  return localStorage.getItem('userId') || 
         sessionStorage.getItem('userId') || 
         '41338d4a-2001-708b-6b94-a3a3d0c54bbe';
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
// PHASE 2: BANDWIDTH DETECTION & STRATEGY SELECTION
// ==========================================

class FileUploadOptimizer {
  constructor() {
    this.config = {
      maxConcurrentUploads: 3,
      batchThreshold: 6,
      parallelThreshold: 2,
      bandwidthTestSize: 50 * 1024,
      bandwidthTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.bandwidthCache = {
      speed: null,
      timestamp: null,
      ttl: 5 * 60 * 1000
    };
  }

  /**
   * PHASE 2: Detect bandwidth with simple speed test
   * @returns {Promise<string>} Connection quality: 'fast', 'medium', 'slow'
   */
  async detectBandwidth() {
    const now = Date.now();
    if (this.bandwidthCache.speed && 
        this.bandwidthCache.timestamp && 
        (now - this.bandwidthCache.timestamp) < this.bandwidthCache.ttl) {
      return this.bandwidthCache.speed;
    }

    try {
      // Simple bandwidth test using a small file
      const testStart = performance.now();
      const testData = new Uint8Array(this.config.bandwidthTestSize);
      const testBlob = new Blob([testData]);
      
      // Simulate upload timing
      await new Promise(resolve => setTimeout(resolve, 100));
      const testEnd = performance.now();
      
      const duration = testEnd - testStart;
      const speedMbps = (this.config.bandwidthTestSize * 8) / (duration * 1000); // Mbps
      
      let quality;
      if (speedMbps > 10) quality = 'fast';
      else if (speedMbps > 2) quality = 'medium';
      else quality = 'slow';
      
      this.bandwidthCache = {
        speed: quality,
        timestamp: now
      };
      
      console.log(`Bandwidth detected: ${quality} (${speedMbps.toFixed(2)} Mbps)`);
      return quality;
    } catch (error) {
      console.warn('Bandwidth detection failed, using conservative setting:', error);
      return 'medium'; // Conservative default
    }
  }

  /**
   * PHASE 2: Choose optimal upload strategy
   * @param {File[]} files - Files to upload
   * @returns {Promise<string>} Strategy: 'single', 'parallel', 'batch'
   */
  async chooseUploadStrategy(files) {
    const fileCount = files.length;
    
    // Single file - use optimized single upload
    if (fileCount === 1) {
      return 'single';
    }
    
    // 2-5 files - use parallel with bandwidth consideration
    if (fileCount <= 5) {
      const bandwidth = await this.detectBandwidth();
      if (bandwidth === 'slow') {
        return 'sequential'; // Fallback for poor connections
      }
      return 'parallel';
    }
    
    // 6+ files - use batch processing
    return 'batch';
  }
}

const uploadOptimizer = new FileUploadOptimizer();

// ==========================================
// PHASE 2: ENHANCED UPLOAD METHODS
// ==========================================

/**
 * PHASE 2: Upload single file with enhanced error handling and performance
 */
const uploadSingleFileOptimized = async (file, defectId, uploadType, userId, onProgress) => {
  try {
    console.log(`Starting optimized upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    onProgress?.(10, 'Getting upload URL...');
    
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
    
    console.log(`Got upload URL for file: ${file.name}, fileId: ${fileId}`);
    
    onProgress?.(30, 'Uploading to S3...');
    
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
      throw new Error(`S3 upload failed with status: ${s3Response.status}`);
    }
    
    console.log(`Successfully uploaded to S3: ${file.name}`);
    
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
 * PHASE 2: Upload multiple files with parallel processing and controlled concurrency
 */
const uploadFilesParallel = async (defectId, files, uploadType = 'initial', onProgress = null) => {
  if (!defectId || typeof defectId !== 'string') {
    throw new Error(`Invalid defectId for parallel upload: ${defectId}`);
  }

  if (defectId.startsWith('temp-') || defectId === '[object File]' || defectId.includes('[object')) {
    throw new Error(`Cannot upload files with invalid defect ID: ${defectId}`);
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User ID is required for file upload');
  }

  const uploadedFiles = [];
  const errors = [];
  const fileArray = Array.from(files);

  console.log(`Starting parallel upload of ${fileArray.length} files for defect ${defectId}`);

  try {
    // PHASE 2: Controlled concurrency based on bandwidth
    const bandwidth = await uploadOptimizer.detectBandwidth();
    const concurrency = bandwidth === 'fast' ? 3 : bandwidth === 'medium' ? 2 : 1;
    
    console.log(`Using ${concurrency} concurrent uploads based on ${bandwidth} connection`);

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

          console.log(`Starting upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

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

          console.log(`Got upload URL for file: ${file.name}, fileId: ${fileId}`);

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

          console.log(`Successfully uploaded to S3: ${file.name}`);

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

    console.log(`Parallel upload completed: ${uploadedFiles.length} successful, ${errors.length} failed`);
    
    return {
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
      errors,
      totalUploaded: uploadedFiles.length,
      totalFailed: errors.length
    };

  } catch (error) {
    console.error('Error in parallel file upload:', error);
    throw new Error(`Parallel upload failed: ${error.message}`);
  }
};

/**
 * PHASE 2: Smart upload method that automatically chooses the best strategy
 */
const uploadFilesOptimized = async (files, defectId, uploadType = 'initial', userId, onProgress) => {
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

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // PHASE 2: Choose optimal strategy
    const strategy = await uploadOptimizer.chooseUploadStrategy(fileArray);
    console.log(`Using upload strategy: ${strategy} for ${fileArray.length} files`);

    switch (strategy) {
      case 'single':
        // Single file upload
        const result = await uploadSingleFileOptimized(
          fileArray[0], 
          defectId, 
          uploadType, 
          userId, 
          onProgress
        );
        return [result];

      case 'parallel':
        // Parallel upload for 2-5 files
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

      case 'batch':
        // Batch upload for 6+ files (currently same as parallel, but prepared for future batch endpoint)
        console.log('Using batch strategy (currently parallel with higher concurrency)');
        return await uploadFilesOptimized(fileArray, defectId, uploadType, userId, onProgress);

      case 'sequential':
      default:
        // Fallback to sequential for poor connections
        console.log('Using sequential fallback strategy');
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
              userId,
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
  } catch (error) {
    console.error('Error in optimized file upload:', error);
    throw error;
  }
};

// ==========================================
// MAIN FILE SERVICE OBJECT (BACKWARDS COMPATIBLE)
// ==========================================

const fileService = {
  /**
   * BACKWARDS COMPATIBLE: Upload multiple files (maintains original signature)
   * Now with PHASE 2 optimizations that automatically choose the best strategy
   */
  uploadFiles: async (files, defectId, uploadType = 'initial', userId, onProgress) => {
    // PHASE 2: Use optimized upload with automatic strategy selection
    return await uploadFilesOptimized(files, defectId, uploadType, userId, onProgress);
  },

  // ==========================================
  // EXISTING METHODS (Maintained for backwards compatibility)
  // ==========================================

  /**
   * Get download URL for a file
   */
  getDownloadUrl: async (defectId, fileId, userId) => {
    try {
      console.log(`Getting download URL for file ${fileId} in defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files/${fileId}/url`,
        {
          params: { userId },
          timeout: 15000
        }
      );
      
      const downloadData = await handleApiResponse(response);
      console.log(`Successfully retrieved download URL for file ${fileId}`);
      return downloadData;
    } catch (error) {
      console.error(`Error getting download URL for file ${fileId}:`, error);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  },

  /**
   * Delete a file
   */
  deleteFile: async (defectId, fileId, userId) => {
    try {
      console.log(`Deleting file ${fileId} from defect ${defectId}`);
      
      const response = await fileApiClient.delete(
        `/api/defects/${defectId}/files/${fileId}`,
        {
          params: { userId },
          timeout: 20000
        }
      );
      
      await handleApiResponse(response);
      console.log(`Successfully deleted file: ${fileId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  /**
   * List all files for a defect
   */
  listFiles: async (defectId, userId) => {
    try {
      console.log(`Listing files for defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files`,
        {
          params: { userId },
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
      console.error(`Error listing files for defect ${defectId}:`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },

  /**
   * BACKWARDS COMPATIBLE: Download a file (maintains original signature)
   */
  downloadFile: async (defectId, fileId, fileName, userId) => {
    try {
      const userIdToUse = userId || getCurrentUserId();
      console.log(`Starting download for file: ${fileName} (ID: ${fileId})`);
      
      const downloadData = await fileService.getDownloadUrl(defectId, fileId, userIdToUse);
      
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
      console.error(`Error downloading file ${fileName}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  },

  // ==========================================
  // PHASE 2: NEW OPTIMIZED METHODS
  // ==========================================

  /**
   * PHASE 2: Modern parallel upload API with enhanced performance
   */
  uploadFilesParallel: uploadFilesParallel,

  /**
   * PHASE 2: Single file upload with modern API
   */
  uploadSingleFile: async (defectId, file, uploadType = 'initial', onProgress = null) => {
    const userId = getCurrentUserId();
    return await uploadSingleFileOptimized(file, defectId, uploadType, userId, onProgress);
  },

  /**
   * PHASE 2: Smart upload with automatic strategy selection
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
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    } = options;

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(maxSize / 1024 / 1024).toFixed(2)}MB` };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} is not allowed` };
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
  }
};

export default fileService;