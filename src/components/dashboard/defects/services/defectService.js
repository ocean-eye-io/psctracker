// src/services/defectService.js

import axios from 'axios';

const API_BASE_URL = 'https://msnvxmo3ezbbkd2pbmlsojhf440fxmpf.lambda-url.ap-south-1.on.aws';

/**
 * Enhanced defectService with improved API handling and field mapping
 */
const defectService = {
  /**
   * Fetch all defects from API
   * @returns {Promise<Array>} Array of defect objects with standardized fields
   */
  getAllDefects: async () => {
    try {
      console.log('Fetching defects from API...');
      
      // Make the API call
      const response = await axios.get(`${API_BASE_URL}/api/defects`);
      console.log('API response status:', response.status);
      
      // Handle different response formats
      let defectsData = [];
      
      if (response.data) {
        // Check for array in different locations based on API structure
        if (Array.isArray(response.data)) {
          console.log('Response is a direct array with', response.data.length, 'items');
          defectsData = response.data;
        } else if (response.data.body) {
          // Lambda function often returns data in the body property
          const bodyData = typeof response.data.body === 'string' 
            ? JSON.parse(response.data.body) 
            : response.data.body;
            
          if (Array.isArray(bodyData)) {
            console.log('Body is an array with', bodyData.length, 'items');
            defectsData = bodyData;
          }
        } else if (response.data.data && Array.isArray(response.data.data)) {
          console.log('Response has a data array property');
          defectsData = response.data.data;
        }
      }
      
      // Log the first defect to check data structure
      if (defectsData.length > 0) {
        console.log('Sample defect:', defectsData[0]);
        console.log('Available fields:', Object.keys(defectsData[0]));
      }
      
      // Map the API fields to the expected component fields
      const processedDefects = defectsData.map(defect => {
        // For field mapping, explicitly check for each possible field variation
        // This handles case sensitivity issues and different naming conventions

        // Check for Description field variations
        let description = '';
        if (defect.Description !== undefined) description = defect.Description;
        else if (defect.description !== undefined) description = defect.description;
        
        // Check for Action Planned field variations
        let actionPlanned = '';
        if (defect['Action Planned'] !== undefined) actionPlanned = defect['Action Planned'];
        else if (defect.action_planned !== undefined) actionPlanned = defect.action_planned;
        else if (defect.ActionPlanned !== undefined) actionPlanned = defect.ActionPlanned;
        
        // Check for Status field variations
        let status = 'OPEN'; // Default value
        if (defect['Status'] !== undefined) status = defect['Status'];
        else if (defect.status !== undefined) status = defect.status;
        
        // Check for Criticality field variations
        let criticality = 'Medium'; // Default value
        if (defect.Criticality !== undefined) criticality = defect.Criticality;
        else if (defect.criticality !== undefined) criticality = defect.criticality;
        
        // Check for Equipments field variations
        let equipments = '';
        if (defect.Equipments !== undefined) equipments = defect.Equipments;
        else if (defect.equipments !== undefined) equipments = defect.equipments;
        
        // Check for Date fields
        let dateReported = null;
        if (defect['Date Reported'] !== undefined) dateReported = defect['Date Reported'];
        else if (defect.date_reported !== undefined) dateReported = defect.date_reported;
        
        let dateCompleted = null;
        if (defect['Date Completed'] !== undefined) dateCompleted = defect['Date Completed'];
        else if (defect.date_completed !== undefined) dateCompleted = defect.date_completed;
        
        // Create standardized defect object
        return {
          // Base fields from the API response
          id: defect.id,
          vessel_id: defect.vessel_id,
          vessel_name: defect.vessel_name || 'Unknown Vessel',
          target_date: defect.target_date,
          Comments: defect.Comments || '',
          closure_comments: defect.closure_comments,
          raised_by: defect.raised_by,
          attachments: defect.attachments || 0,
          silentMode: defect.silentMode,
          
          // Mapped and standardized fields for the UI
          Description: description,
          'Action Planned': actionPlanned,
          'Status': status,
          Criticality: criticality,
          Equipments: equipments,
          'Date Reported': dateReported,
          'Date Completed': dateCompleted,
          external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
        };
      });
      
      console.log('Processed defects:', processedDefects.length);
      if (processedDefects.length > 0) {
        console.log('First processed defect:', processedDefects[0]);
      }
      
      return processedDefects;
    } catch (error) {
      console.error('Error fetching defects:', error);
      // Return empty array on error
      return [];
    }
  },
  
  /**
   * Get a single defect by ID
   * @param {string} id - Defect ID
   * @returns {Promise<Object>} Defect object
   */
  getDefectById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/defects/${id}`);
      
      // Handle different response formats
      let defect;
      
      if (response.data) {
        if (response.data.body) {
          defect = typeof response.data.body === 'string' 
            ? JSON.parse(response.data.body) 
            : response.data.body;
        } else {
          defect = response.data;
        }
      }
      
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
        
        // Map to expected fields for the form (if they exist)
        Equipments: defect.Equipments || defect.equipments || '',
        Description: defect.Description || defect.description || '',
        'Action Planned': defect['Action Planned'] || defect.action_planned || '',
        'Status': defect['Status'] || 'OPEN',
        Criticality: defect.Criticality || 'Medium',
        'Date Reported': defect['Date Reported'] || defect.date_reported || null,
        'Date Completed': defect['Date Completed'] || defect.date_completed || null,
        external_visibility: defect.external_visibility !== undefined ? defect.external_visibility : true
      };
    } catch (error) {
      console.error(`Error fetching defect with id ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new defect
   * @param {Object} defectData - Defect data
   * @returns {Promise<Object>} Created defect
   */
  createDefect: async (defectData) => {
    try {
      // Send create request
      const response = await axios.post(`${API_BASE_URL}/api/defects`, defectData);
      
      // Handle different response formats
      let createdDefect;
      
      if (response.data) {
        if (response.data.body) {
          createdDefect = typeof response.data.body === 'string' 
            ? JSON.parse(response.data.body) 
            : response.data.body;
        } else {
          createdDefect = response.data;
        }
      }
      
      return createdDefect;
    } catch (error) {
      console.error('Error creating defect:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing defect
   * @param {string} id - Defect ID
   * @param {Object} defectData - Updated defect data
   * @returns {Promise<Object>} Updated defect
   */
  updateDefect: async (id, defectData) => {
    try {
      // Send update request
      const response = await axios.put(`${API_BASE_URL}/api/defects/${id}`, defectData);
      
      // Handle different response formats
      let updatedDefect;
      
      if (response.data) {
        if (response.data.body) {
          updatedDefect = typeof response.data.body === 'string' 
            ? JSON.parse(response.data.body) 
            : response.data.body;
        } else {
          updatedDefect = response.data;
        }
      }
      
      return updatedDefect;
    } catch (error) {
      console.error(`Error updating defect with id ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete a defect
   * @param {string} id - Defect ID
   * @returns {Promise<boolean>} Success indicator
   */
  deleteDefect: async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/defects/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting defect with id ${id}:`, error);
      throw error;
    }
  }
};

export default defectService;