import axios from 'axios';

const API_BASE_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';

class VesselFlagService {
  async getUserVesselFlags(userId) {
    try {
      // ✅ FIX: URL encode the userId (email) to handle @ symbol
      const encodedUserId = encodeURIComponent(userId);
      const response = await axios.get(`${API_BASE_URL}/api/vessel-flags/user/${encodedUserId}`);
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
        user_id: String(userId), // No need to encode here since it's in the request body
        flag_type: flagType.toLowerCase()
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
        user_id: String(userId) // No need to encode here since it's in the request body
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