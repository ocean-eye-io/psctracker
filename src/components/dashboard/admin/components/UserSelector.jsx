// src/components/dashboards/admin/components/UserSelector.jsx
import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';
import styles from '../admin.module.css'; // Import the CSS module

const UserSelector = ({ onUserSelect, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { currentUser, loading: authLoading, getSession } = useAuth();
  const dropdownRef = useRef(null);

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
        const validUsers = Array.isArray(data) ? data.filter(user => user && user.user_id && user.cognito_username && user.email) : [];
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
      setError('Authentication required to fetch users.');
      setLoading(false);
      setUsers([]);
    }
  }, [currentUser, authLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectUser = (user) => {
    onUserSelect(user);
    setSearchTerm(user.cognito_username);
    setDropdownOpen(false);
  };

  const filteredUsers = users.filter(user => {
    const usernameMatch = user.cognito_username && user.cognito_username.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return usernameMatch || emailMatch;
  });

  if (loading) {
    return <p className={styles.emptyTableMessage}>Loading users...</p>;
  }

  if (error) {
    return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {error}</p>;
  }

  if (users.length === 0) {
    return <p className={styles.emptyTableMessage}>No users found.</p>;
  }

  return (
    <div className={styles.userSelectorContainer} ref={dropdownRef}>
      <input
        type="text"
        placeholder="Search or select a user..."
        value={selectedUser ? selectedUser.cognito_username : searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setDropdownOpen(true);
          onUserSelect(null);
        }}
        onFocus={() => setDropdownOpen(true)}
        className={styles.formInput} // Apply formInput style
        style={{ width: '100%' }}
      />
      {dropdownOpen && (
        <ul className={styles.userDropdownList}> {/* New style for dropdown list */}
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <li key={user.user_id} onClick={() => handleSelectUser(user)} className={styles.userDropdownListItem}> {/* New style for list item */}
                {user.cognito_username} ({user.email})
              </li>
            ))
          ) : (
            <li className={styles.noResults}>No users found matching "{searchTerm}"</li>
          )}
        </ul>
      )}
      {selectedUser && (
        <p className={styles.selectedUserDisplay}> {/* New style for selected user display */}
          Selected: <strong>{selectedUser.cognito_username}</strong> ({selectedUser.email})
        </p>
      )}
    </div>
  );
};

export default UserSelector;