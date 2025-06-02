// src/services/fileService.js - Complete Optimized Version with Full Backwards Compatibility

import axios from 'axios';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';

/**
 * OPTIMIZED: Enhanced API response handler with better error handling and performance
 * @param {AxiosResponse} response - The Axios response object
 * @returns {any} The extracted data
 * @throws {Error} If the response indicates an error
 */
const handleApiResponse = async (response) => {
  if (response.status >= 200 && response.status < 300) {
    // Lambda function often returns data in the body property
    if (response.data && response.data.body) {
      return typeof response.data.body === 'string'
        ? JSON.parse(response.data.body)
        : response.data.body;
    }
    return response.data; // Direct data if not wrapped in 'body'
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
 * OPTIMIZED: Get current user ID with fallback logic
 * @returns {string} Current user ID
 */
const getCurrentUserId = () => {
  // Try multiple sources for user ID (adjust based on your auth system)
  return localStorage.getItem('userId') || 
         sessionStorage.getItem('userId') || 
         '41338d4a-2001-708b-6b94-a3a3d0c54bbe'; // Fallback for development
};

/**
 * OPTIMIZED: Generate a unique file ID for tracking uploads
 * @returns {string} Unique file identifier
 */
const generateFileId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * OPTIMIZED: Create axios instance with enhanced configurations for file operations
 */
const createOptimizedFileAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 second default timeout for file operations
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for file-specific error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw new Error('File operation timeout - please check your internet connection and try again');
      } else if (error.response?.status === 413) {
        throw new Error('File too large - please reduce file size and try again');
      } else if (error.response?.status === 415) {
        throw new Error('File type not supported - please use PDF, DOC, or image files');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - you do not have permission to access this file');
      } else if (error.response?.status === 404) {
        throw new Error('File not found - it may have been deleted or moved');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error during file operation - please try again later');
      }
      throw error;
    }
  );

  return instance;
};

const fileApiClient = createOptimizedFileAxiosInstance();

/**
 * OPTIMIZED: Upload a single file to S3 via presigned URL workflow with enhanced error handling and performance
 * @param {File} file - The file object to upload
 * @param {string} defectId - The defect ID
 * @param {string} uploadType - 'initial' or 'completion'
 * @param {string} userId - User ID for authorization
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} File metadata object
 */
const uploadSingleFileOptimized = async (file, defectId, uploadType, userId, onProgress) => {
  try {
    console.log(`Starting optimized upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Step 1: Get presigned upload URL
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
      { timeout: 15000 } // 15 second timeout for URL generation
    );
    
    const uploadData = await handleApiResponse(uploadUrlResponse);
    const { uploadUrl, fileId, s3Key } = uploadData;
    
    console.log(`Got upload URL for file: ${file.name}, fileId: ${fileId}`);
    
    // Step 2: Upload file directly to S3 with optimized settings
    onProgress?.(30, 'Uploading to S3...');
    
    const s3Response = await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      timeout: 120000, // 2 minute timeout for large files
      maxContentLength: 10 * 1024 * 1024, // 10MB max file size
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percentCompleted = Math.round(
            30 + (progressEvent.loaded / progressEvent.total) * 60 // 30-90%
          );
          onProgress?.(percentCompleted, `Uploading... ${(progressEvent.loaded / 1024 / 1024).toFixed(1)}MB / ${(progressEvent.total / 1024 / 1024).toFixed(1)}MB`);
        }
      }
    });
    
    if (s3Response.status !== 200) {
      throw new Error(`S3 upload failed with status: ${s3Response.status}`);
    }
    
    console.log(`Successfully uploaded to S3: ${file.name}`);
    
    // Step 3: OPTIMIZED - Confirm upload with Lambda (skip S3 verification for speed)
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
    
    console.log('Confirming upload with optimized data:', confirmData);
    
    const confirmResponse = await fileApiClient.post(
      `/api/defects/${defectId}/files`,
      confirmData,
      { timeout: 20000 } // 20 second timeout for confirmation
    );
    
    const confirmResponseData = await handleApiResponse(confirmResponse);
    
    onProgress?.(100, 'Upload complete!');
    
    console.log(`Upload confirmed for: ${file.name}`, confirmResponseData);
    
    // Return enhanced file metadata
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
    
    // Enhanced error logging for debugging
    if (error.response) {
      console.error('Server responded with error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
    }
    
    onProgress?.(0, `Upload failed: ${error.message}`);
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }
};

/**
 * OPTIMIZED: Upload multiple files with parallel processing for maximum performance
 * @param {string} defectId - The defect ID
 * @param {FileList|Array} files - Files to upload
 * @param {string} uploadType - 'initial' or 'completion'
 * @param {Function} onProgress - Progress callback (file, progress)
 * @returns {Promise<Object>} Upload result with success status and file metadata
 */
const uploadFilesParallel = async (defectId, files, uploadType = 'initial', onProgress = null) => {
    // CRITICAL FIX: Validate parameters
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
    console.log('Parallel upload parameters:', { defectId, fileCount: fileArray.length, uploadType });
  
    try {
      // OPTIMIZED: Process files in parallel with controlled concurrency
      const CONCURRENT_UPLOADS = 3; // Limit concurrent uploads to avoid overwhelming the server
      const chunks = [];
      
      for (let i = 0; i < fileArray.length; i += CONCURRENT_UPLOADS) {
        chunks.push(fileArray.slice(i, i + CONCURRENT_UPLOADS));
      }
  
      for (const chunk of chunks) {
        const uploadPromises = chunk.map(async (file, chunkIndex) => {
          try {
            // CRITICAL FIX: Validate each file before upload
            if (!file || !file.name) {
              throw new Error('Invalid file object');
            }
  
            console.log(`Starting upload for file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  
            // Step 1: Get upload URL with proper error handling
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
  
            // Step 2: Upload directly to S3 with progress tracking
            if (onProgress) onProgress(file, 0);
  
            await axios.put(uploadUrl, file, {
              headers: {
                'Content-Type': file.type,
              },
              timeout: 120000, // 2 minute timeout
              onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  onProgress(file, progress);
                }
              }
            });
  
            console.log(`Successfully uploaded to S3: ${file.name}`);
  
            // Step 3: OPTIMIZED - Skip S3 verification and directly confirm upload
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
            if (onProgress) onProgress(file, -1); // Indicate error
            return null;
          }
        });
  
        // Wait for current chunk to complete before starting next chunk
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
      console.error('Parallel upload context:', { defectId, fileCount: fileArray.length, uploadType });
      throw new Error(`Parallel upload failed: ${error.message}`);
    }
  };

/**
 * COMPLETE OPTIMIZED FILE SERVICE: Enhanced file service with improved performance and backwards compatibility
 */
const fileService = {
  /**
   * BACKWARDS COMPATIBLE: Upload multiple files for a defect (maintains original signature)
   * @param {File[]} files - Array of file objects
   * @param {string} defectId - The defect ID
   * @param {string} uploadType - 'initial' or 'completion'
   * @param {string} userId - User ID for authorization
   * @param {Function} onProgress - Progress callback function (progress, message, fileIndex)
   * @returns {Promise<Object[]>} Array of uploaded file metadata
   */
  uploadFiles: async (files, defectId, uploadType = 'initial', userId, onProgress) => {
    // CRITICAL FIX: Validate all parameters before processing
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }
  
    if (!defectId || typeof defectId !== 'string') {
      throw new Error(`Invalid defectId: ${defectId}. Expected a valid string ID.`);
    }
  
    if (defectId.startsWith('temp-') || defectId === '[object File]' || defectId.includes('[object')) {
      throw new Error(`Invalid defectId: ${defectId}. Cannot upload files with temporary or invalid defect ID.`);
    }
  
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid userId: ${userId}. User authentication required.`);
    }
  
    const uploadedFiles = [];
    const totalFiles = files.length;
    const fileArray = Array.from(files);
    
    try {
      console.log(`Starting upload of ${totalFiles} files for defect ${defectId} using backwards compatible method`);
      
      // Log validation info
      console.log('Upload parameters validated:', {
        defectId,
        fileCount: totalFiles,
        uploadType,
        userId: userId.substring(0, 8) + '...' // Log partial userId for security
      });
      
      // OPTIMIZED: Choose upload strategy based on file count and progress needs
      if (onProgress && totalFiles <= 5) {
        // Sequential processing for detailed progress tracking (backwards compatibility)
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];
          
          console.log(`Uploading file ${i + 1}/${totalFiles}: ${file.name}`);
          
          const fileProgressCallback = (progress, message) => {
            // Calculate overall progress: each file gets 1/totalFiles of total progress
            const overallProgress = Math.round(
              (i / totalFiles + progress / 100 / totalFiles) * 100
            );
            onProgress?.(overallProgress, `File ${i + 1}/${totalFiles}: ${message}`, i);
          };
          
          try {
            const uploadedFile = await uploadSingleFileOptimized(
              file,
              defectId,
              uploadType,
              userId,
              fileProgressCallback
            );
            
            uploadedFiles.push(uploadedFile);
            
          } catch (fileError) {
            console.error(`Failed to upload file ${file.name}:`, fileError);
            // Continue with other files, but track the error
            throw new Error(`Failed to upload "${file.name}": ${fileError.message}`);
          }
        }
        
        onProgress?.(100, `Successfully uploaded ${uploadedFiles.length} files`);
      } else {
        // OPTIMIZED: Use parallel processing for better performance (5+ files or no detailed progress needed)
        console.log(`Using parallel upload for ${totalFiles} files`);
        
        const result = await uploadFilesParallel(defectId, fileArray, uploadType, (file, progress) => {
          // Simple progress callback for parallel uploads
          if (onProgress) {
            const fileIndex = fileArray.findIndex(f => f.name === file.name);
            onProgress(progress, `Uploading ${file.name}...`, fileIndex);
          }
        });
        
        if (result.success) {
          if (onProgress) {
            onProgress(100, `Successfully uploaded ${result.totalUploaded} files${result.totalFailed > 0 ? `, ${result.totalFailed} failed` : ''}`);
          }
          return result.files;
        } else {
          throw new Error(`Failed to upload files: ${result.errors.map(e => e.error).join(', ')}`);
        }
      }
      
      return uploadedFiles;
      
    } catch (error) {
      console.error('Error in uploadFiles:', error);
      console.error('Upload context:', { defectId, fileCount: totalFiles, uploadType, error: error.message });
      throw error;
    }
  },

  /**
   * OPTIMIZED: Get download URL for a file with enhanced error handling
   * @param {string} defectId - The defect ID
   * @param {string} fileId - The file ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Download URL and file info
   */
  getDownloadUrl: async (defectId, fileId, userId) => {
    try {
      console.log(`Getting download URL for file ${fileId} in defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files/${fileId}/url`,
        {
          params: { userId },
          timeout: 15000 // 15 second timeout
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
   * OPTIMIZED: Delete a file with enhanced error handling and cleanup
   * @param {string} defectId - The defect ID
   * @param {string} fileId - The file ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<boolean>} Success indicator
   */
  deleteFile: async (defectId, fileId, userId) => {
    try {
      console.log(`Deleting file ${fileId} from defect ${defectId}`);
      
      const response = await fileApiClient.delete(
        `/api/defects/${defectId}/files/${fileId}`,
        {
          params: { userId },
          timeout: 20000 // 20 second timeout for deletion
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
   * OPTIMIZED: List all files for a defect with enhanced data validation
   * @param {string} defectId - The defect ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} File lists and counts
   */
  listFiles: async (defectId, userId) => {
    try {
      console.log(`Listing files for defect ${defectId}`);
      
      const response = await fileApiClient.get(
        `/api/defects/${defectId}/files`,
        {
          params: { userId },
          timeout: 15000 // 15 second timeout
        }
      );
      
      const fileData = await handleApiResponse(response);
      
      // Validate and provide defaults
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
   * @param {string} defectId - The defect ID
   * @param {string} fileId - The file ID
   * @param {string} fileName - The file name
   * @param {string} userId - User ID for authorization (optional - will use current user if not provided)
   */
  downloadFile: async (defectId, fileId, fileName, userId) => {
    try {
      const userIdToUse = userId || getCurrentUserId();
      console.log(`Starting download for file: ${fileName} (ID: ${fileId})`);
      
      const downloadData = await fileService.getDownloadUrl(defectId, fileId, userIdToUse);
      
      // Create a temporary link and click it to download
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log(`Successfully initiated download for: ${fileName}`);
      
    } catch (error) {
      console.error(`Error downloading file ${fileName}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  },

  // NEW OPTIMIZED METHODS for modern API design

  /**
   * NEW: Modern parallel upload API with enhanced performance
   * @param {string} defectId - The defect ID
   * @param {FileList|Array} files - Files to upload
   * @param {string} uploadType - 'initial' or 'completion'
   * @param {Function} onProgress - Progress callback (file, progress)
   * @returns {Promise<Object>} Upload result
   */
  uploadFilesParallel: uploadFilesParallel,

  /**
   * NEW: Modern download API with file object
   * @param {string} defectId - Defect ID  
   * @param {Object} file - File metadata object
   */
  downloadFileModern: async (defectId, file) => {
    try {
      console.log(`Starting modern download for file: ${file.name || file.originalName}`);
      
      const userId = getCurrentUserId();
      const downloadData = await fileService.getDownloadUrl(defectId, file.id, userId);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = file.originalName || file.name;
      link.target = '_blank';
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log(`Successfully initiated modern download for: ${file.name || file.originalName}`);
    } catch (error) {
      console.error(`Error downloading file ${file.name || file.originalName}:`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  },

  /**
   * NEW: Modern delete API with automatic user ID
   * @param {string} defectId - Defect ID
   * @param {string} fileId - File ID  
   */
  deleteFileModern: async (defectId, fileId) => {
    const userId = getCurrentUserId();
    return await fileService.deleteFile(defectId, fileId, userId);
  },

  /**
   * NEW: Single file upload with modern API
   * @param {string} defectId - Defect ID
   * @param {File} file - File to upload
   * @param {string} uploadType - 'initial' or 'completion'
   * @param {Function} onProgress - Progress callback
   */
  uploadSingleFile: async (defectId, file, uploadType = 'initial', onProgress = null) => {
    const userId = getCurrentUserId();
    return await uploadSingleFileOptimized(file, defectId, uploadType, userId, onProgress);
  },

  /**
   * UTILITY: Validate file before upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFile: (file, options = {}) => {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
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
   * UTILITY: Get file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Human readable size
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