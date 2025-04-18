import axios from 'axios';

const API_BASE_URL = 'https://6mfmavicpuezjic6mtwtbuw56e0pjysg.lambda-url.ap-south-1.on.aws';

class VesselFlagService {
  async getUserVesselFlags(userId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vessel-flags/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vessel flags:', error);
      throw error;
    }
  }
  
  async updateVesselFlag(rowId, userId, flagType) {
    try {
      // Add validation
      if (!rowId || !userId || !flagType) {
        throw new Error('Missing required parameters');
      }

      // Validate flag type
      const validFlagTypes = ['green', 'yellow', 'red'];
      if (!validFlagTypes.includes(flagType.toLowerCase())) {
        throw new Error('Invalid flag type');
      }

      const payload = {
        row_id: String(rowId),
        user_id: String(userId),
        flag_type: flagType.toLowerCase() // Ensure flag_type is the actual flag value
      };

      console.log('Updating vessel flag with payload:', payload);

      const response = await axios.post(`${API_BASE_URL}/api/vessel-flags`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating vessel flag:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        payload: error.config?.data
      });
      throw error;
    }
  }
  
  async deleteVesselFlag(rowId, userId) {
    try {
      if (!rowId || !userId) {
        throw new Error('Missing required parameters');
      }

      const payload = {
        row_id: String(rowId),
        user_id: String(userId)
      };

      console.log('Deleting vessel flag with payload:', payload);

      const response = await axios.delete(`${API_BASE_URL}/api/vessel-flags`, {
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error deleting vessel flag:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        payload: error.config?.data
      });
      throw error;
    }
  }
}

export default new VesselFlagService();