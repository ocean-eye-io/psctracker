// src/components/dashboards/admin/tabs/RolesTab.js
import React, { useState, useEffect } from 'react';
import RoleTable from '../components/RoleTable';
import RoleForm from '../components/RoleForm';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';

// Import the CSS Module
import styles from '../admin.module.css'; // Correct path for CSS Module

const RolesTab = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const { currentUser, loading: authLoading, getSession } = useAuth();

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!currentUser) {
        throw new Error('No authenticated user found. Please log in.');
      }
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      const response = await fetch(`${API_BASE_URL}/admin/roles`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
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
    if (!authLoading && currentUser) {
      fetchRoles();
    } else if (!authLoading && !currentUser) {
      setError('Please log in to view and manage roles.');
      setLoading(false);
      setRoles([]);
    }
  }, [currentUser, authLoading]);

  const handleAddRoleClick = () => {
    setEditingRole(null);
    setShowForm(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowForm(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      const response = await fetch(`${API_BASE_URL}/admin/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role');
      }

      alert('Role deleted successfully!');
      fetchRoles(); // Refresh the list
    } catch (err) {
      console.error("Error deleting role:", err);
      alert(`Error deleting role: ${err.message}`);
    }
  };

  // The onSubmit handler now expects the CRUD flags directly
  const handleFormSubmit = async (roleData) => {
    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      let response;
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole
        ? `${API_BASE_URL}/admin/roles/${editingRole.role_id}`
        : `${API_BASE_URL}/admin/roles`;

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        // roleData now directly contains can_create, can_read, etc.
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingRole ? 'update' : 'create'} role`);
      }

      alert(`Role ${editingRole ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingRole(null);
      fetchRoles(); // Refresh the list
    } catch (err) {
      console.error(`Error ${editingRole ? 'updating' : 'creating'} role:`, err);
      alert(`Error ${editingRole ? 'updating' : 'creating'} role: ${err.message}`);
    }
  };

  if (authLoading || loading) {
    return <p className={styles.emptyTableMessage}>Loading roles...</p>; {/* Use CSS Module class */}
  }

  if (error) {
    return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {error}</p>; {/* Use CSS Module class */}
  }

  if (!currentUser) {
    return <p className={styles.emptyTableMessage}>Please log in to view and manage roles.</p>; {/* Use CSS Module class */}
  }

  return (
    <div className={styles.dataTableContainer}> {/* Use CSS Module class */}
      <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleAddRoleClick}
          className={`${styles.defectActionBtn} ${styles.add}`} 
        >
          Add New Role
        </button>
      </div>

      {!loading && !error && (
        <div className={styles.dataTableWrapper}> {/* Use CSS Module class for scrolling */}
          <RoleTable roles={roles} onEdit={handleEditRole} onDelete={handleDeleteRole} />
        </div>
      )}

      {showForm && (
        <RoleForm
          role={editingRole}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default RolesTab;