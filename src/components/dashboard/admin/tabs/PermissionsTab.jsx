// src/components/dashboards/admin/tabs/PermissionsTab.js
import React, { useState, useEffect } from 'react';
import PermissionTable from '../components/PermissionTable';
import PermissionForm from '../components/PermissionForm';
import { API_BASE_URL } from '../config'; // Updated import path

const PermissionsTab = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) throw new Error("Authentication token not found.");

      const response = await fetch(`${API_BASE_URL}/admin/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleAddPermission = () => {
    setEditingPermission(null);
    setShowPermissionForm(true);
  };

  const handleEditPermission = (permission) => {
    setEditingPermission(permission);
    setShowPermissionForm(true);
  };

  const handleDeletePermission = async (permissionId) => {
    if (!window.confirm('Are you sure you want to delete this permission? This will also remove it from any roles.')) return;

    try {
      const idToken = localStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/admin/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete permission');
      }

      alert('Permission deleted successfully!');
      fetchPermissions();
    } catch (err) {
      console.error("Error deleting permission:", err);
      alert(`Error deleting permission: ${err.message}`);
    }
  };

  const handleFormSubmit = async (permissionData) => {
    try {
      const idToken = localStorage.getItem('idToken');
      const method = editingPermission ? 'PUT' : 'POST';
      const url = editingPermission ? `${API_BASE_URL}/admin/permissions/${editingPermission.permission_id}` : `${API_BASE_URL}/admin/permissions`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(permissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingPermission ? 'update' : 'create'} permission`);
      }

      alert(`Permission ${editingPermission ? 'updated' : 'created'} successfully!`);
      setShowPermissionForm(false);
      setEditingPermission(null);
      fetchPermissions();
    } catch (err) {
      console.error(`Error ${editingPermission ? 'updating' : 'creating'} permission:`, err);
      alert(`Error ${editingPermission ? 'updating' : 'creating'} permission: ${err.message}`);
    }
  };

  return (
    <div className="permissions-tab-content" style={{ marginTop: '20px' }}>
      <h4>Manage Permissions</h4>
      <button onClick={handleAddPermission} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}>Add New Permission</button>

      {loading && <p>Loading permissions...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <PermissionTable permissions={permissions} onEdit={handleEditPermission} onDelete={handleDeletePermission} />
      )}

      {showPermissionForm && (
        <PermissionForm
          permission={editingPermission}
          onSubmit={handleFormSubmit}
          onClose={() => setShowPermissionForm(false)}
        />
      )}
    </div>
  );
};

export default PermissionsTab;