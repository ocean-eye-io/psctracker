import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';
import styles from '../admin.module.css';

const UserSelector = ({ onUserSelect, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, loading: authLoading, getSession } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
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

        const response = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }

        const data = await response.json();
        // Filter out users that don't have a user_id or cognito_username or email
        const validUsers = data.filter(user => user.user_id && (user.cognito_username || user.email));
        setUsers(validUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && currentUser) {
      fetchUsers();
    } else if (!authLoading && !currentUser) {
      setError('Please log in to view users.');
      setLoading(false);
      setUsers([]);
    }
  }, [currentUser, authLoading]);

  if (loading) {
    return <div className={styles.loadingMessage}>Loading users...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>Error: {error}</div>;
  }

  if (users.length === 0) {
    return <div className={styles.emptyTableMessage}>No users found.</div>;
  }

  return (
    <select
      className={styles.selectInput}
      onChange={(e) => {
        const selectedId = e.target.value;
        const user = users.find(u => u.user_id === selectedId);
        onUserSelect(user);
      }}
      value={selectedUser?.user_id || ''}
    >
      <option value="">Select a user</option>
      {users.map(user => (
        <option key={user.user_id} value={user.user_id}>
          {user.email || user.cognito_username} {/* Display email, fallback to cognito_username */}
        </option>
      ))}
    </select>
  );
};

export default UserSelector;