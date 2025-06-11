// src/context/PermissionContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import permissionService from '../services/permissionService';
import { useAuth } from './AuthContext'; // Assuming you have an auth context

// Create the Permission Context
const PermissionContext = createContext();

// Default permissions for fallback
const DEFAULT_PERMISSIONS = {
  actionPermissions: {
    create: false,
    read: true,
    update: false,
    delete: false,
    export: true,
    import: false,
    generateReport: true
  },
  roleName: null,
  hasWriteAccess: false
};

// Permission Provider Component
export const PermissionProvider = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user ID from auth context
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id;

  // Fetch permissions function
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      console.log('PermissionProvider: No user ID available, using default permissions');
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    // Don't fetch if we already have permissions and not forcing refresh
    if (!forceRefresh && permissions !== DEFAULT_PERMISSIONS && !error) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`PermissionProvider: Fetching permissions for user ${userId}`);
      
      const userPermissions = await permissionService.fetchUserPermissions(userId);
      const formattedPermissions = permissionService.getAllPermissions();
      
      setPermissions(formattedPermissions);
      console.log('PermissionProvider: Permissions updated:', formattedPermissions);

    } catch (err) {
      console.error('PermissionProvider: Error fetching permissions:', err);
      setError(err.message);
      
      // On error, keep current permissions or use defaults
      if (permissions === DEFAULT_PERMISSIONS) {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, permissions, error]);

  // Fetch permissions when user changes or component mounts
  useEffect(() => {
    if (!authLoading && userId) {
      console.log('PermissionProvider: Auth loaded, fetching permissions');
      fetchPermissions();
    } else if (!authLoading && !userId) {
      console.log('PermissionProvider: No authenticated user, using default permissions');
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [authLoading, userId, fetchPermissions]);

  // Helper functions for easier access
  const canCreate = useCallback(() => permissions.actionPermissions.create, [permissions]);
  const canRead = useCallback(() => permissions.actionPermissions.read, [permissions]);
  const canUpdate = useCallback(() => permissions.actionPermissions.update, [permissions]);
  const canDelete = useCallback(() => permissions.actionPermissions.delete, [permissions]);
  const canExport = useCallback(() => permissions.actionPermissions.export, [permissions]);
  const canImport = useCallback(() => permissions.actionPermissions.import, [permissions]);
  const canGenerateReport = useCallback(() => permissions.actionPermissions.generateReport, [permissions]);

  // Check if user has write permissions
  const hasWriteAccess = useCallback(() => {
    return canCreate() || canUpdate() || canDelete();
  }, [canCreate, canUpdate, canDelete]);

  // Check if user is read-only
  const isReadOnly = useCallback(() => {
    return !hasWriteAccess();
  }, [hasWriteAccess]);

  // Get permission status for UI feedback
  const getPermissionStatus = useCallback(() => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (isReadOnly()) return 'readonly';
    return 'full';
  }, [loading, error, isReadOnly]);

  // Refresh permissions (useful for admin panel or role changes)
  const refreshPermissions = useCallback(() => {
    console.log('PermissionProvider: Manually refreshing permissions');
    return fetchPermissions(true);
  }, [fetchPermissions]);

  // Clear permissions (useful for logout)
  const clearPermissions = useCallback(() => {
    console.log('PermissionProvider: Clearing permissions');
    setPermissions(DEFAULT_PERMISSIONS);
    setError(null);
    permissionService.clearCache();
  }, []);

  // Context value
  const value = {
    // Permission state
    permissions,
    loading,
    error,
    
    // Permission checkers
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    canImport,
    canGenerateReport,
    hasWriteAccess,
    isReadOnly,
    
    // Utility functions
    getPermissionStatus,
    refreshPermissions,
    clearPermissions,
    
    // User info
    roleName: permissions.roleName,
    userId
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

// Custom hook to use permissions
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  
  return context;
};

// HOC for components that need permissions
export const withPermissions = (Component) => {
  return function PermissionWrappedComponent(props) {
    const permissions = usePermissions();
    return <Component {...props} permissions={permissions} />;
  };
};

export default PermissionContext;