// src/services/defectService.js

import axios from 'axios';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws'; // Your Lambda Function URL

/**
 * Helper to handle API responses and extract data/errors
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
 * Enhanced defectService with improved API handling and field mapping
 */
const defectService = {
  /**
   * Fetch all defects from API for a specific user.
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Array>} Array of defect objects with standardized fields
   */
  getAllDefects: async (userId) => {
    try {
      console.log(`Fetching defects for user ${userId} from API...`);
      
      // Pass userId as a query parameter for GET request
      const response = await axios.get(`${API_BASE_URL}/api/defects`, {
        params: { userId }
      });
      
      const defectsData = await handleApiResponse(response);
      
      if (!Array.isArray(defectsData)) {
        console.warn('API response for getAllDefects is not an array:', defectsData);
        return []; // Return empty array if unexpected format
      }

      console.log('API response status:', response.status);
      
      // Log the first defect to check data structure
      if (defectsData.length > 0) {
        console.log('Sample defect from API:', defectsData[0]);
        console.log('Available fields from API:', Object.keys(defectsData[0]));
      }
      
      // Map the API fields to the expected component fields
      const processedDefects = defectsData.map(defect => {
        return {
          id: defect.id,
          vessel_id: defect.vessel_id,
          vessel_name: defect.vessel_name || 'Unknown Vessel', // Now comes from DB join
          target_date: defect.target_date,
          Comments: defect.Comments || '',
          closure_comments: defect.closure_comments,
          raised_by: defect.raised_by,
          attachments: defect.attachments || 0, // Assuming attachments is a count or similar
          silentMode: defect.silentMode,
          
          // Mapped and standardized fields for the UI (using mapDbToApiFields logic from Lambda)
          Description: defect.Description || '',
          'Action Planned': defect['Action Planned'] || '',
          'Status': defect.Status || defect.Status_Vessel || 'OPEN', // Prioritize 'Status' if API sends it directly
          Criticality: defect.Criticality || '',
          Equipments: defect.Equipments || '',
          'Date Reported': defect['Date Reported'] || null,
          'Date Completed': defect['Date Completed'] || null,
          external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
        };
      });
      
      console.log('Processed defects:', processedDefects.length);
      if (processedDefects.length > 0) {
        console.log('First processed defect for UI:', processedDefects[0]);
      }
      
      return processedDefects;
    } catch (error) {
      console.error('Error fetching defects:', error.message);
      throw error; // Re-throw to be handled by the component
    }
  },
  
  /**
   * Get a single defect by ID for a specific user.
   * @param {string} id - Defect ID
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Defect object
   */
  getDefectById: async (id, userId) => {
    try {
      // Pass userId as a query parameter for GET request
      const response = await axios.get(`${API_BASE_URL}/api/defects/${id}`, {
        params: { userId }
      });
      
      const defect = await handleApiResponse(response);
      
      if (!defect) {
        throw new Error('Defect not found');
      }
      
      // Map the API fields to the expected component fields
      return {
        id: defect.id,
        vessel_id: defect.vessel_id,
        vessel_name: defect.vessel_name || 'Unknown Vessel',
        target_date: defect.target_date,
        Comments: defect.Comments || '',
        closure_comments: defect.closure_comments,
        raised_by: defect.raised_by,
        attachments: defect.attachments || 0,
        silentMode: defect.silentMode,
        
        Equipments: defect.Equipments || '',
        Description: defect.Description || '',
        'Action Planned': defect['Action Planned'] || '',
        'Status': defect.Status || defect.Status_Vessel || 'OPEN',
        Criticality: defect.Criticality || '',
        'Date Reported': defect['Date Reported'] || null,
        'Date Completed': defect['Date Completed'] || null,
        external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
      };
    } catch (error) {
      console.error(`Error fetching defect with id ${id}:`, error.message);
      throw error;
    }
  },
  
  /**
   * Create a new defect for a specific user.
   * @param {Object} defectData - Defect data
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Created defect
   */
  createDefect: async (defectData, userId) => {
    try {
      // Add userId to the request body for POST
      const payload = { ...defectData, userId };
      const response = await axios.post(`${API_BASE_URL}/api/defects`, payload);
      
      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error creating defect:', error.message);
      throw error;
    }
  },
  
  /**
   * Update an existing defect for a specific user.
   * @param {string} id - Defect ID
   * @param {Object} defectData - Updated defect data
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Updated defect
   */
  updateDefect: async (id, defectData, userId) => {
    try {
      // Add userId to the request body for PUT
      const payload = { ...defectData, userId };
      const response = await axios.put(`${API_BASE_URL}/api/defects/${id}`, payload);
      
      return await handleApiResponse(response);
    } catch (error) {
      console.error(`Error updating defect with id ${id}:`, error.message);
      throw error;
    }
  },
  
  /**
   * Delete a defect for a specific user.
   * @param {string} id - Defect ID
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<boolean>} Success indicator
   */
  deleteDefect: async (id, userId) => {
    try {
      // For DELETE, we'll pass userId as a query parameter as per Lambda's expectation
      const response = await axios.delete(`${API_BASE_URL}/api/defects/${id}`, {
        params: { userId }
      });
      
      // Check if the deletion was successful based on status code
      if (response.status >= 200 && response.status < 300) {
        return true;
      } else {
        await handleApiResponse(response); // This will throw an error if status is not OK
        return false; // Should not be reached
      }
    } catch (error) {
      console.error(`Error deleting defect with id ${id}:`, error.message);
      throw error;
    }
  },

  /**
   * NEW: Function to fetch user's assigned vessels.
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Array<{vessel_id: string, vessel_name: string}>>} Array of assigned vessels.
   */
  getUserAssignedVessels: async (userId) => {
    try {
      console.log(`Fetching assigned vessels for user ${userId}...`);
      // Call the new backend endpoint, sending userId in the body
      const response = await axios.post(`${API_BASE_URL}/api/user-vessels`, { userId });
      
      const vesselsData = await handleApiResponse(response);

      if (!Array.isArray(vesselsData)) {
        console.warn('API response for getUserAssignedVessels is not an array:', vesselsData);
        return [];
      }
      console.log(`Successfully fetched ${vesselsData.length} assigned vessels.`);
      return vesselsData;
    } catch (error) {
      console.error('Error fetching user assigned vessels:', error.message);
      throw error;
    }
  },

  /**
   * Get defect statistics for a specific user.
   * @param {string} userId - The ID of the current user.
   * @returns {Promise<Object>} Defect statistics
   */
  getDefectStats: async (userId) => {
    try {
      console.log(`Fetching defect stats for user ${userId}...`);
      // Pass userId as a query parameter for GET request
      const response = await axios.get(`${API_BASE_URL}/api/defects/stats`, {
        params: { userId }
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching defect stats:', error.message);
      throw error;
    }
  }
};

export default defectService;