import React, { useState, useEffect } from 'react';
import UserSelector from '../components/UserSelector';
import VesselAssignmentSelector from '../components/VesselAssignmentSelector';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';

import styles from '../admin.module.css'; // Import the CSS module

const UserVesselAssignmentsTab = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [allVessels, setAllVessels] = useState([]);
  const [loadingVessels, setLoadingVessels] = useState(true);
  const [errorVessels, setErrorVessels] = useState(null);

  const { currentUser, loading: authLoading, getSession } = useAuth();

  // Fetch all vessels when the component mounts
  useEffect(() => {
    const fetchAllVessels = async () => {
      setLoadingVessels(true);
      setErrorVessels(null);
      try {
        if (!currentUser) {
          throw new Error('No authenticated user found. Please log in.');
        }
        const session = getSession();
        if (!session || !session.idToken) {
          throw new Error('Authentication session or ID token not found.');
        }
        const idToken = session.idToken;

        const response = await fetch(`${API_BASE_URL}/admin/vessels`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch all vessels');
        }

        const data = await response.json();
        setAllVessels(data);
      } catch (err) {
        console.error("Error fetching all vessels:", err);
        setErrorVessels(err.message);
      } finally {
        setLoadingVessels(false);
      }
    };

    if (!authLoading && currentUser) {
      fetchAllVessels();
    } else if (!authLoading && !currentUser) {
      setErrorVessels('Please log in to manage user-vessel assignments.');
      setLoadingVessels(false);
      setAllVessels([]);
    }
  }, [currentUser, authLoading]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleSaveAssignments = async (assignedVesselIds) => {
    if (!selectedUser) {
      alert('Please select a user first.');
      return;
    }

    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      // The backend /admin/users PUT endpoint already handles assigned_vessels
      // We need to send the full user object with updated assigned_vessels
      const updatedUser = {
        ...selectedUser,
        assigned_vessels: assignedVesselIds,
      };

      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save vessel assignments');
      }

      alert('Vessel assignments saved successfully!');
      // Optionally, refresh the selected user's data to reflect changes
      // For simplicity, we'll just alert for now.
      // In a real app, you might re-fetch the user or update local state.
    } catch (err) {
      console.error("Error saving vessel assignments:", err);
      alert(`Error saving vessel assignments: ${err.message}`);
    }
  };

  if (authLoading || loadingVessels) {
    return <p className={styles.emptyTableMessage}>Loading data for vessel assignments...</p>;
  }

  if (errorVessels) {
    return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {errorVessels}</p>;
  }

  if (!currentUser) {
    return <p className={styles.emptyTableMessage}>Please log in to manage user-vessel assignments.</p>;
  }

  return (
    // Ensure this container allows scrolling if its content overflows
    <div className={`${styles.dataTableContainer} ${styles.userVesselAssignmentsTabContent}`}>
      <h4 className={styles.formHeader} style={{ marginBottom: '20px' }}>Manage User-Vessel Assignments</h4>

      <div className={styles.formGroup} style={{ marginBottom: '30px' }}>
        <label htmlFor="user-select" className={styles.formGroupLabel}>Select User:</label>
        <UserSelector onUserSelect={handleUserSelect} selectedUser={selectedUser} />
      </div>

      {selectedUser && allVessels.length > 0 && (
        <VesselAssignmentSelector
          allVessels={allVessels}
          initialAssignedVesselIds={selectedUser.assigned_vessels || []}
          onSave={handleSaveAssignments}
        />
      )}

      {selectedUser && allVessels.length === 0 && !loadingVessels && !errorVessels && (
        <p className={styles.emptyTableMessage}>No vessels available to assign. Please add vessels first.</p>
      )}

      {!selectedUser && (
        <p className={styles.emptyTableMessage}>Please select a user to manage their vessel assignments.</p>
      )}
    </div>
  );
};

export default UserVesselAssignmentsTab;