// src/components/dashboards/admin/tabs/UsersTab.js
import React, { useState, useEffect } from 'react';
import UserTable from '../components/UserTable';
import UserForm from '../components/UserForm';
import { API_BASE_URL } from '../config'; // Updated import path

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // IMPORTANT: Replace with actual token retrieval from your AuthContext or similar
      const idToken = localStorage.getItem('idToken'); // Placeholder: Get from localStorage
      if (!idToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove them from Cognito and RDS.')) return;

    try {
      const idToken = localStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      alert('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert(`Error deleting user: ${err.message}`);
    }
  };

  const handleFormSubmit = async (userData) => {
    try {
      const idToken = localStorage.getItem('idToken');
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `${API_BASE_URL}/admin/users/${editingUser.rdsData.user_id}` : `${API_BASE_URL}/admin/users`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
      }

      alert(`User ${editingUser ? 'updated' : 'created'} successfully!`);
      setShowUserForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(`Error ${editingUser ? 'updating' : 'creating'} user:`, err);
      alert(`Error ${editingUser ? 'updating' : 'creating'} user: ${err.message}`);
    }
  };

  return (
    <div className="users-tab-content" style={{ marginTop: '20px' }}>
      <h4>Manage Users</h4>
      <button onClick={handleAddUser} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}>Add New User</button>

      {loading && <p>Loading users...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <UserTable users={users} onEdit={handleEditUser} onDelete={handleDeleteUser} />
      )}

      {showUserForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleFormSubmit}
          onClose={() => setShowUserForm(false)}
        />
      )}
    </div>
  );
};

export default UsersTab;