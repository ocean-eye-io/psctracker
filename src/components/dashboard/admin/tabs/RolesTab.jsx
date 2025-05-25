// src/components/dashboards/admin/tabs/RolesTab.js
import React, { useState, useEffect } from 'react';
import RoleTable from '../components/RoleTable';
import RoleForm from '../components/RoleForm';
import { API_BASE_URL } from '../config'; // Updated import path

const RolesTab = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) throw new Error("Authentication token not found.");

      const response = await fetch(`${API_BASE_URL}/admin/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data);
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddRole = () => {
    setEditingRole(null);
    setShowRoleForm(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowRoleForm(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? This will also remove it from any users.')) return;

    try {
      const idToken = localStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role');
      }

      alert('Role deleted successfully!');
      fetchRoles();
    } catch (err) {
      console.error("Error deleting role:", err);
      alert(`Error deleting role: ${err.message}`);
    }
  };

  const handleFormSubmit = async (roleData) => {
    try {
      const idToken = localStorage.getItem('idToken');
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole ? `${API_BASE_URL}/admin/roles/${editingRole.role_id}` : `${API_BASE_URL}/admin/roles`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(roleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingRole ? 'update' : 'create'} role`);
      }

      alert(`Role ${editingRole ? 'updated' : 'created'} successfully!`);
      setShowRoleForm(false);
      setEditingRole(null);
      fetchRoles();
    } catch (err) {
      console.error(`Error ${editingRole ? 'updating' : 'creating'} role:`, err);
      alert(`Error ${editingRole ? 'updating' : 'creating'} role: ${err.message}`);
    }
  };

  return (
    <div className="roles-tab-content" style={{ marginTop: '20px' }}>
      <h4>Manage Roles</h4>
      <button onClick={handleAddRole} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}>Add New Role</button>

      {loading && <p>Loading roles...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <RoleTable roles={roles} onEdit={handleEditRole} onDelete={handleDeleteRole} />
      )}

      {showRoleForm && (
        <RoleForm
          role={editingRole}
          onSubmit={handleFormSubmit}
          onClose={() => setShowRoleForm(false)}
        />
      )}
    </div>
  );
};

export default RolesTab;