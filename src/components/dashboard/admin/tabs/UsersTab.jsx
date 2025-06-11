// src/components/dashboards/admin/tabs/UsersTab.js
import React, { useState, useEffect } from 'react';
import UserTable from '../components/UserTable';
import UserForm from '../components/UserForm';
import { API_BASE_URL, AUTH_LAMBDA_FUNCTION_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';

// Import the CSS Module
import styles from '../admin.module.css'; // Import as 'styles'

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { currentUser, loading: authLoading, getSession } = useAuth();

  const fetchData = async () => {
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

      const cognitoResponse = await fetch(AUTH_LAMBDA_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'frontend', action: 'listUsers' })
      });
      if (!cognitoResponse.ok) {
        const errorData = await cognitoResponse.json();
        throw new Error(errorData.error || `Failed to fetch Cognito users: ${cognitoResponse.status}`);
      }
      const cognitoUsers = await cognitoResponse.json();

      const rdsResponse = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
      });
      if (!rdsResponse.ok) {
        const errorData = await rdsResponse.json();
        throw new Error(errorData.error || `Failed to fetch RDS users: ${rdsResponse.status}`);
      }
      const rdsUsers = await rdsResponse.json();

      const rolesResponse = await fetch(`${API_BASE_URL}/admin/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
      });
      if (!rolesResponse.ok) {
        const errorData = await rolesResponse.json();
        throw new Error(errorData.error || `Failed to fetch roles: ${rolesResponse.status}`);
      }
      const availableRoles = await rolesResponse.json();
      setRoles(availableRoles);

      const modulesResponse = await fetch(`${API_BASE_URL}/admin/modules`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
      });
      if (!modulesResponse.ok) {
        const errorData = await modulesResponse.json();
        throw new Error(errorData.error || `Failed to fetch modules: ${modulesResponse.status}`);
      }
      const availableModules = await modulesResponse.json();
      setModules(availableModules);

      const rdsUsersMap = new Map(rdsUsers.map(u => [u.user_id, u]));
      const mergedUsers = cognitoUsers.map(cognitoUser => {
        const cognitoSub = cognitoUser.Attributes.find(attr => attr.Name === 'sub')?.Value;
        const rdsData = rdsUsersMap.get(cognitoSub);

        return {
          cognitoUser,
          rdsData: rdsData || { role_name: null, assigned_vessels: [], assigned_modules: [] }
        };
      });
      setUsers(mergedUsers);

    } catch (err) {
      console.error('Frontend: Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchData();
    } else if (!authLoading && !currentUser) {
      setError('Please log in to view and manage users.');
      setLoading(false);
      setUsers([]);
      setRoles([]);
      setModules([]);
    }
  }, [currentUser, authLoading]);

  const handleAddUserClick = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleCloseUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData) => {
    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      let response;
      if (editingUser) {
        response = await fetch(`${API_BASE_URL}/admin/users/${editingUser.rdsData.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            role_name: userData.role_name,
            vessels: userData.vessels,
            email: userData.email,
            modules: userData.modules
          }),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(userData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save user: ${response.status}`);
      }

      handleCloseUserForm();
      fetchData();
    } catch (err) {
      console.error('Error saving user:', err);
      alert(`Error saving user: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    const userId = userToDelete.rdsData.user_id;

    if (!userId) {
      alert('Cannot delete: User not found in RDS.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${userToDelete.rdsData.cognito_username || userToDelete.cognitoUser.Username}" from the RDS table? This will NOT delete them from Cognito.`)) {
      try {
        const session = getSession();
        if (!session || !session.idToken) {
          throw new Error('Authentication session or ID token not found.');
        }
        const idToken = session.idToken;

        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete user: ${response.status}`);
        }

        alert(`User "${userToDelete.rdsUser.cognito_username || userToDelete.cognitoUser.Username}" deleted from RDS successfully.`);
        fetchData();
      } catch (err) {
        console.error('Error deleting user:', err);
        alert(`Error deleting user: ${err.message}`);
      }
    }
  };

  const handleSyncUser = async (cognitoUser, roleName = null, modules = []) => {
    if (!window.confirm(`Are you sure you want to sync user "${cognitoUser.Username}" to the RDS database?`)) {
      return;
    }

    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      const cognitoSub = cognitoUser.Attributes.find(attr => attr.Name === 'sub')?.Value;
      const emailAttr = cognitoUser.Attributes.find(attr => attr.Name === 'email');
      const email = emailAttr ? emailAttr.Value : 'N/A';

      if (!cognitoSub) {
        alert('Error: Could not find user ID (sub) for syncing.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          user_id: cognitoSub,
          cognito_username: cognitoUser.Username,
          email: email,
          role_name: roleName,
          modules: modules
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      alert(`User "${cognitoUser.Username}" synced to RDS successfully!`);
      fetchData();
    } catch (err) {
      console.error('Frontend: Error syncing user:', err);
      alert(`Error syncing user: ${err.message}`);
    }
  };

  if (authLoading || loading) {
    return <p className={styles.emptyTableMessage}>Loading users...</p>;
  }

  if (error) {
    return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {error}</p>;
  }

  if (!currentUser) {
    return <p className={styles.emptyTableMessage}>Please log in to view and manage users.</p>;
  }

  return (
    <div className={styles.dataTableContainer}> 
      <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleAddUserClick}
          className={`${styles.defectActionBtn} ${styles.add}`} // Use CSS Module classes
        >
          Add New User
        </button>
      </div>
      <div className={styles.dataTableWrapper}> 
        <UserTable
          users={users}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onSync={handleSyncUser}
          allModules={modules}
        />
      </div>

      {showUserForm && (
        <UserForm
          user={editingUser}
          roles={roles}
          modules={modules}
          onSubmit={handleSaveUser}
          onClose={handleCloseUserForm}
        />
      )}
    </div>
  );
};

export default UsersTab;