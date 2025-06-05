// src/services/permissionService.js

class PermissionService {
    constructor() {
      this.baseURL = process.env.REACT_APP_ADMIN_API_URL || 'https://your-api-gateway-url';
      this.permissions = null;
      this.loading = false;
      this.error = null;
    }
  
    /**
     * Fetch user permissions from the backend
     * @param {string} userId - The user's ID
     * @returns {Promise<Object>} User permissions object
     */
    async fetchUserPermissions(userId) {
      if (!userId) {
        throw new Error('User ID is required to fetch permissions');
      }
  
      this.loading = true;
      this.error = null;
  
      try {
        console.log(`PermissionService: Fetching permissions for user ${userId}`);
        
        const response = await fetch(`${this.baseURL}/admin/users/${userId}/permissions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add authorization headers here if needed
            // 'Authorization': `Bearer ${token}`
          },
        });
  
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found or not authorized');
          }
          throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
        }
  
        const permissionData = await response.json();
        console.log('PermissionService: Permissions fetched successfully:', permissionData);
  
        this.permissions = {
          canCreate: permissionData.can_create || false,
          canRead: permissionData.can_read || true,
          canUpdate: permissionData.can_update || false,
          canDelete: permissionData.can_delete || false,
          roleName: permissionData.role_name || null,
          username: permissionData.cognito_username || '',
          email: permissionData.email || ''
        };
  
        return this.permissions;
  
      } catch (error) {
        console.error('PermissionService: Error fetching permissions:', error);
        this.error = error.message;
        
        // Default to read-only permissions on error
        this.permissions = {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
          roleName: null,
          username: '',
          email: ''
        };
  
        throw error;
      } finally {
        this.loading = false;
      }
    }
  
    /**
     * Get cached permissions (if available)
     * @returns {Object|null} Cached permissions or null
     */
    getCachedPermissions() {
      return this.permissions;
    }
  
    /**
     * Check if user can create
     * @returns {boolean}
     */
    canCreate() {
      return this.permissions?.canCreate || false;
    }
  
    /**
     * Check if user can read
     * @returns {boolean}
     */
    canRead() {
      return this.permissions?.canRead || true;
    }
  
    /**
     * Check if user can update
     * @returns {boolean}
     */
    canUpdate() {
      return this.permissions?.canUpdate || false;
    }
  
    /**
     * Check if user can delete
     * @returns {boolean}
     */
    canDelete() {
      return this.permissions?.canDelete || false;
    }
  
    /**
     * Get user's role name
     * @returns {string|null}
     */
    getRoleName() {
      return this.permissions?.roleName || null;
    }
  
    /**
     * Check if permissions are currently loading
     * @returns {boolean}
     */
    isLoading() {
      return this.loading;
    }
  
    /**
     * Get any error that occurred during permission fetching
     * @returns {string|null}
     */
    getError() {
      return this.error;
    }
  
    /**
     * Clear cached permissions and errors
     */
    clearCache() {
      this.permissions = null;
      this.error = null;
      this.loading = false;
    }
  
    /**
     * Check if user has any permissions (not just read-only)
     * @returns {boolean}
     */
    hasWritePermissions() {
      return this.canCreate() || this.canUpdate() || this.canDelete();
    }
  
    /**
     * Get all permissions as an object (for backward compatibility)
     * @returns {Object}
     */
    getAllPermissions() {
      return {
        actionPermissions: {
          create: this.canCreate(),
          read: this.canRead(),
          update: this.canUpdate(),
          delete: this.canDelete(),
          export: this.canRead(), // Export is considered a read operation
          import: this.canCreate(), // Import creates new data
          generateReport: this.canRead() // Report generation is a read operation
        },
        roleName: this.getRoleName(),
        hasWriteAccess: this.hasWritePermissions()
      };
    }
  }
  
  // Create a singleton instance
  const permissionService = new PermissionService();
  
  export default permissionService;