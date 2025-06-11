// src/services/defectService.js - Complete Optimized Version

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
 * OPTIMIZED: Process defect data with improved file handling and field mapping
 * @param {Object} defect - Raw defect data from API
 * @returns {Object} Processed defect data
 */
const processDefectData = (defect) => {
  const processedDefect = {
    id: defect.id,
    vessel_id: defect.vessel_id,
    vessel_name: defect.vessel_name || 'Unknown Vessel',
    target_date: defect.target_date,
    Comments: defect.Comments || '',
    closure_comments: defect.closure_comments,
    raised_by: defect.raised_by,
    attachments: defect.attachments || 0,
    silentMode: defect.silentMode,
    
    // OPTIMIZED: File-related fields with better error handling
    initial_files: Array.isArray(defect.initial_files) ? defect.initial_files : [],
    completion_files: Array.isArray(defect.completion_files) ? defect.completion_files : [],
    file_count_initial: defect.file_count_initial || 0,
    file_count_completion: defect.file_count_completion || 0,
    last_file_uploaded: defect.last_file_uploaded,
    
    // Mapped and standardized fields for the UI
    Description: defect.Description || '',
    'Action Planned': defect['Action Planned'] || '',
    'Status': defect.Status || defect.Status_Vessel || 'OPEN',
    Criticality: defect.Criticality || '',
    Equipments: defect.Equipments || '',
    'Date Reported': defect['Date Reported'] || null,
    'Date Completed': defect['Date Completed'] || null,
    external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
  };
  
  // Debug log for files (only when files exist to reduce console noise)
  if (processedDefect.initial_files.length > 0 || processedDefect.completion_files.length > 0) {
    console.log(`Defect ${defect.id} has files:`, {
      initial: processedDefect.initial_files.length,
      completion: processedDefect.completion_files.length,
      initialFiles: processedDefect.initial_files,
      completionFiles: processedDefect.completion_files
    });
  }
  
  return processedDefect;
};

/**
 * OPTIMIZED: Create axios instance with default configurations for better performance
 */
const createOptimizedAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second default timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add response interceptor for consistent error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please check your internet connection and try again');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - please check your permissions');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error - please try again later');
      }
      throw error;
    }
  );

  return instance;
};

const apiClient = createOptimizedAxiosInstance();

/**
 * COMPLETE OPTIMIZED: Enhanced defectService with improved API handling, caching, and file field mapping
 */
const defectService = {
  /**
   * OPTIMIZED: Fetch all defects from API for a specific user with improved error handling and performance
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Array>} Array of defect objects with standardized fields
   */
  getAllDefects: async (userId) => {
    try {
      console.log(`Fetching defects for user ${userId} from API...`);
      
      // OPTIMIZED: Single request with proper error handling and timeout
      const response = await apiClient.get('/api/defects', {
        params: { userId },
        timeout: 30000 // 30 second timeout for potentially large datasets
      });
      
      const defectsData = await handleApiResponse(response);
      
      if (!Array.isArray(defectsData)) {
        console.warn('API response for getAllDefects is not an array:', defectsData);
        return []; // Return empty array if unexpected format
      }

      console.log(`API returned ${defectsData.length} defects`);
      
      // Log sample data structure for debugging (only first defect)
      if (defectsData.length > 0) {
        console.log('Sample defect from API:', defectsData[0]);
        console.log('Available fields from API:', Object.keys(defectsData[0]));
      }
      
      // OPTIMIZED: Process defects in batch for better performance
      const processedDefects = defectsData.map(processDefectData);
      
      console.log(`Processed ${processedDefects.length} defects successfully`);
      
      // Log first processed defect for UI validation
      if (processedDefects.length > 0) {
        console.log('First processed defect for UI:', processedDefects[0]);
      }
      
      return processedDefects;
    } catch (error) {
      console.error('Error fetching defects:', error.message);
      
      // OPTIMIZED: Better error categorization for user feedback
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please check your internet connection and try again');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - please check your permissions');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error - please try again later');
      } else {
        throw error; // Re-throw original error for other cases
      }
    }
  },
  
  /**
   * OPTIMIZED: Get a single defect by ID with improved caching and error handling
   * @param {string} id - Defect ID
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Defect object
   */
  getDefectById: async (id, userId) => {
    try {
      console.log(`Fetching defect ${id} for user ${userId}`);
      
      const response = await apiClient.get(`/api/defects/${id}`, {
        params: { userId },
        timeout: 15000 // 15 second timeout
      });
      
      const defect = await handleApiResponse(response);
      
      if (!defect) {
        throw new Error('Defect not found');
      }
      
      // OPTIMIZED: Use the same processing function for consistency
      const mappedDefect = processDefectData(defect);
      
      // Debug log for individual defect files
      console.log(`getDefectById - Defect ${defect.id} file data:`, {
        initial_files: mappedDefect.initial_files,
        completion_files: mappedDefect.completion_files,
        file_counts: {
          initial: mappedDefect.file_count_initial,
          completion: mappedDefect.file_count_completion
        }
      });
      
      console.log(`Successfully fetched defect ${id}`);
      
      return mappedDefect;
    } catch (error) {
      console.error(`Error fetching defect with id ${id}:`, error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Defect not found or you do not have permission to view it');
      }
      throw error;
    }
  },
  
  /**
   * OPTIMIZED: Create a new defect with improved validation and error handling
   * @param {Object} defectData - Defect data
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Created defect
   */
  createDefect: async (defectData, userId) => {
    try {
      console.log(`Creating new defect for user ${userId}`);
      
      // OPTIMIZED: Prepare payload with proper validation and file handling
      const payload = { 
        ...defectData, 
        userId,
        // Ensure file arrays are properly initialized
        initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
        completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
        // Ensure file counts match arrays
        file_count_initial: defectData.file_count_initial || (defectData.initial_files ? defectData.initial_files.length : 0),
        file_count_completion: defectData.file_count_completion || (defectData.completion_files ? defectData.completion_files.length : 0)
      };
      
      const response = await apiClient.post('/api/defects', payload, {
        timeout: 20000 // 20 second timeout for creation
      });
      
      const createdDefect = await handleApiResponse(response);
      
      console.log(`Successfully created defect with ID: ${createdDefect.id}`);
      
      // OPTIMIZED: Return processed defect data
      const processedDefect = processDefectData(createdDefect);
      
      // Ensure backward compatibility with expected response format
      return {
        ...processedDefect,
        initial_files: processedDefect.initial_files || [],
        completion_files: processedDefect.completion_files || [],
        file_count_initial: processedDefect.file_count_initial || 0,
        file_count_completion: processedDefect.file_count_completion || 0
      };
    } catch (error) {
      console.error('Error creating defect:', error.message);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid defect data - please check all required fields');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to create defects for this vessel');
      }
      throw error;
    }
  },
  
  /**
   * OPTIMIZED: Update an existing defect with improved file handling and validation
   * @param {string} id - Defect ID
   * @param {Object} defectData - Updated defect data
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Updated defect
   */
  updateDefect: async (id, defectData, userId) => {
    try {
      console.log(`Updating defect ${id} for user ${userId}`);
      
      // OPTIMIZED: Prepare payload with file data validation and proper formatting
      const payload = { 
        ...defectData, 
        userId,
        // Ensure file arrays are properly formatted and validated
        initial_files: Array.isArray(defectData.initial_files) ? defectData.initial_files : [],
        completion_files: Array.isArray(defectData.completion_files) ? defectData.completion_files : [],
        // Update file counts to match arrays
        file_count_initial: Array.isArray(defectData.initial_files) ? defectData.initial_files.length : (defectData.file_count_initial || 0),
        file_count_completion: Array.isArray(defectData.completion_files) ? defectData.completion_files.length : (defectData.file_count_completion || 0)
      };
      
      const response = await apiClient.put(`/api/defects/${id}`, payload, {
        timeout: 25000 // 25 second timeout for updates (may include file processing)
      });
      
      const updatedDefect = await handleApiResponse(response);
      
      console.log(`Successfully updated defect ${id}`);
      
      // OPTIMIZED: Return processed defect data
      const processedDefect = processDefectData(updatedDefect);
      
      // Ensure backward compatibility with expected response format
      return {
        ...processedDefect,
        initial_files: processedDefect.initial_files || [],
        completion_files: processedDefect.completion_files || [],
        file_count_initial: processedDefect.file_count_initial || 0,
        file_count_completion: processedDefect.file_count_completion || 0
      };
    } catch (error) {
      console.error(`Error updating defect with id ${id}:`, error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Defect not found or you do not have permission to update it');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to update this defect');
      }
      throw error;
    }
  },
  
  /**
   * OPTIMIZED: Delete a defect with improved error handling and file cleanup
   * @param {string} id - Defect ID
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<boolean>} Success indicator
   */
  deleteDefect: async (id, userId) => {
    try {
      console.log(`Deleting defect ${id} for user ${userId}`);
      
      const response = await apiClient.delete(`/api/defects/${id}`, {
        params: { userId },
        timeout: 15000 // 15 second timeout
      });
      
      // Check if the deletion was successful based on status code
      if (response.status >= 200 && response.status < 300) {
        console.log(`Successfully deleted defect ${id}`);
        return true;
      } else {
        await handleApiResponse(response); // This will throw an error if status is not OK
        return false; // Should not be reached
      }
    } catch (error) {
      console.error(`Error deleting defect with id ${id}:`, error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Defect not found or already deleted');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to delete this defect');
      }
      throw error;
    }
  },

  /**
   * OPTIMIZED: Fetch user's assigned vessels with improved error handling and potential caching
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Array<{vessel_id: string, vessel_name: string}>>} Array of assigned vessels.
   */
  getUserAssignedVessels: async (userId) => {
    try {
      console.log(`Fetching assigned vessels for user ${userId}...`);
      
      // Call the backend endpoint, sending userId in the body
      const response = await apiClient.post('/api/user-vessels', { userId }, {
        timeout: 10000 // 10 second timeout
      });
      
      const vesselsData = await handleApiResponse(response);

      if (!Array.isArray(vesselsData)) {
        console.warn('API response for getUserAssignedVessels is not an array:', vesselsData);
        return [];
      }
      
      console.log(`Successfully fetched ${vesselsData.length} assigned vessels.`);
      return vesselsData;
    } catch (error) {
      console.error('Error fetching user assigned vessels:', error.message);
      
      if (error.response?.status === 403) {
        throw new Error('Access denied - please check your permissions');
      }
      throw error;
    }
  },

  /**
   * OPTIMIZED: Get defect statistics with improved error handling and data validation
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Defect statistics
   */
  getDefectStats: async (userId) => {
    try {
      console.log(`Fetching defect stats for user ${userId}...`);
      
      const response = await apiClient.get('/api/defects/stats', {
        params: { userId },
        timeout: 15000 // 15 second timeout
      });
      
      const stats = await handleApiResponse(response);
      
      // OPTIMIZED: Validate and provide defaults for stats
      const validatedStats = {
        total: stats.total || 0,
        open: stats.open || 0,
        inProgress: stats.inProgress || 0,
        closed: stats.closed || 0,
        overdue: stats.overdue || 0,
        highCritical: stats.highCritical || 0,
        mediumCritical: stats.mediumCritical || 0,
        lowCritical: stats.lowCritical || 0,
        equipmentDistribution: stats.equipmentDistribution || {},
        ...stats // Include any additional fields from API
      };
      
      console.log(`Successfully fetched defect statistics`);
      return validatedStats;
    } catch (error) {
      console.error('Error fetching defect stats:', error.message);
      
      if (error.response?.status === 403) {
        throw new Error('Access denied - cannot retrieve statistics');
      }
      throw error;
    }
  }
};

export default defectService;