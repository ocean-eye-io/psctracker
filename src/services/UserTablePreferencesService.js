// src/services/UserTablePreferencesService.js
import apiClient from './apiClient';

class UserTablePreferencesService {
  constructor() {
    this.cache = new Map();
    this.saveQueue = new Map();
    this.saveTimeout = null;
  }

  /**
   * Get user's table preferences for a specific table
   * @param {string} userId - User ID
   * @param {string} tableName - Table identifier (e.g., 'vesselTable', 'defectTable')
   * @returns {Promise<Object>} Table preferences object
   */
  async getTablePreferences(userId, tableName) {
    if (!userId || !tableName) {
      console.warn('UserTablePreferencesService: Missing userId or tableName');
      return this.getDefaultPreferences();
    }

    const cacheKey = `${userId}-${tableName}`;
    
    // Return cached data if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await apiClient.get(`/api/user-table-preferences/${userId}/${tableName}`);
      
      if (response.data && response.data.preferences) {
        const preferences = response.data.preferences;
        this.cache.set(cacheKey, preferences);
        return preferences;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching table preferences:', error);
      }
    }

    // Return default preferences if none found
    const defaultPrefs = this.getDefaultPreferences();
    this.cache.set(cacheKey, defaultPrefs);
    return defaultPrefs;
  }

  /**
   * Update column width for a specific table
   * @param {string} userId - User ID
   * @param {string} tableName - Table identifier
   * @param {string} columnId - Column field ID
   * @param {string} width - New width (e.g., '150px')
   */
  async updateColumnWidth(userId, tableName, columnId, width) {
    if (!userId || !tableName || !columnId || !width) {
      console.warn('UserTablePreferencesService: Missing required parameters for updateColumnWidth');
      return;
    }

    const cacheKey = `${userId}-${tableName}`;
    
    // Get current preferences
    let preferences = this.cache.get(cacheKey) || this.getDefaultPreferences();
    
    // Update column width
    if (!preferences.columnWidths) {
      preferences.columnWidths = {};
    }
    preferences.columnWidths[columnId] = width;
    
    // Update cache
    this.cache.set(cacheKey, preferences);
    
    // Queue for saving (debounced)
    this.queueSave(userId, tableName, preferences);
  }

  /**
   * Update visible columns for a specific table
   * @param {string} userId - User ID
   * @param {string} tableName - Table identifier
   * @param {Array<string>} visibleColumns - Array of visible column IDs
   */
  async updateVisibleColumns(userId, tableName, visibleColumns) {
    if (!userId || !tableName || !Array.isArray(visibleColumns)) {
      console.warn('UserTablePreferencesService: Missing required parameters for updateVisibleColumns');
      return;
    }

    const cacheKey = `${userId}-${tableName}`;
    
    // Get current preferences
    let preferences = this.cache.get(cacheKey) || this.getDefaultPreferences();
    
    // Update visible columns
    preferences.visibleColumns = visibleColumns;
    
    // Update cache
    this.cache.set(cacheKey, preferences);
    
    // Save immediately for column visibility changes
    await this.savePreferences(userId, tableName, preferences);
  }

  /**
   * Reset table preferences to default
   * @param {string} userId - User ID
   * @param {string} tableName - Table identifier
   */
  async resetToDefault(userId, tableName) {
    if (!userId || !tableName) {
      console.warn('UserTablePreferencesService: Missing userId or tableName for reset');
      return;
    }

    const cacheKey = `${userId}-${tableName}`;
    const defaultPrefs = this.getDefaultPreferences();
    
    // Update cache
    this.cache.set(cacheKey, defaultPrefs);
    
    try {
      // Delete from server (let it fall back to defaults)
      await apiClient.delete(`/api/user-table-preferences/${userId}/${tableName}`);
    } catch (error) {
      console.error('Error resetting table preferences:', error);
    }
    
    return defaultPrefs;
  }

  /**
   * Queue save operation with debouncing
   * @private
   */
  queueSave(userId, tableName, preferences) {
    const queueKey = `${userId}-${tableName}`;
    this.saveQueue.set(queueKey, { userId, tableName, preferences });
    
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Set new timeout for batched save
    this.saveTimeout = setTimeout(() => {
      this.processSaveQueue();
    }, 1000); // Save after 1 second of inactivity
  }

  /**
   * Process queued save operations
   * @private
   */
  async processSaveQueue() {
    const saves = Array.from(this.saveQueue.values());
    this.saveQueue.clear();
    
    for (const { userId, tableName, preferences } of saves) {
      try {
        await this.savePreferences(userId, tableName, preferences);
      } catch (error) {
        console.error(`Error saving preferences for ${userId}-${tableName}:`, error);
      }
    }
  }

  /**
   * Save preferences to server
   * @private
   */
  async savePreferences(userId, tableName, preferences) {
    try {
      await apiClient.put(`/api/user-table-preferences/${userId}/${tableName}`, {
        preferences
      });
    } catch (error) {
      console.error('Error saving table preferences:', error);
      throw error;
    }
  }

  /**
   * Get default table preferences
   * @private
   */
  getDefaultPreferences() {
    return {
      columnWidths: {},
      visibleColumns: [], // Empty means show all columns
      columnOrder: [] // Future enhancement
    };
  }

  /**
   * Clear cache for a specific user and table
   * @param {string} userId - User ID
   * @param {string} tableName - Table identifier
   */
  clearCache(userId = null, tableName = null) {
    if (userId && tableName) {
      const cacheKey = `${userId}-${tableName}`;
      this.cache.delete(cacheKey);
    } else if (userId) {
      // Clear all tables for this user
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}-`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.cache.clear();
    }
  }
}

// Export singleton instance
const userTablePreferencesService = new UserTablePreferencesService();
export default userTablePreferencesService;