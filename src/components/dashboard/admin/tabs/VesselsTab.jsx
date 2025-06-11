// src/components/dashboards/admin/tabs/VesselsTab.js
import React, { useState, useEffect } from 'react';
import VesselTable from '../components/VesselTable';
import VesselForm from '../components/VesselForm';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';

import styles from '../admin.module.css';

const VesselsTab = () => {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);

  const { currentUser, loading: authLoading, getSession } = useAuth();

  const fetchVessels = async () => {
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

      const response = await fetch(`${API_BASE_URL}/admin/vessels`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch vessels');
      }

      const data = await response.json();
      setVessels(data);
    } catch (err) {
      console.error("Error fetching vessels:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchVessels();
    } else if (!authLoading && !currentUser) {
      setError('Please log in to view and manage vessels.');
      setLoading(false);
      setVessels([]);
    }
  }, [currentUser, authLoading]);

  const handleAddVesselClick = () => {
    setEditingVessel(null);
    setShowForm(true);
  };

  const handleEditVessel = (vessel) => {
    setEditingVessel(vessel);
    setShowForm(true);
  };

  const handleDeleteVessel = async (vesselId) => {
    if (!window.confirm('Are you sure you want to delete this vessel? This action cannot be undone.')) {
      return;
    }

    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      const response = await fetch(`${API_BASE_URL}/admin/vessels/${vesselId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vessel');
      }

      alert('Vessel deleted successfully!');
      fetchVessels(); // Refresh the list
    } catch (err) {
      console.error("Error deleting vessel:", err);
      alert(`Error deleting vessel: ${err.message}`);
    }
  };

  const handleFormSubmit = async (vesselData) => {
    try {
      const session = getSession();
      if (!session || !session.idToken) {
        throw new Error('Authentication session or ID token not found.');
      }
      const idToken = session.idToken;

      let response;
      const method = editingVessel ? 'PUT' : 'POST';
      const url = editingVessel
        ? `${API_BASE_URL}/admin/vessels/${editingVessel.vessel_id}`
        : `${API_BASE_URL}/admin/vessels`;

      response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(vesselData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingVessel ? 'update' : 'create'} vessel`);
      }

      alert(`Vessel ${editingVessel ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingVessel(null);
      fetchVessels(); // Refresh the list
    } catch (err) {
      console.error(`Error ${editingVessel ? 'updating' : 'creating'} vessel:`, err);
      alert(`Error ${editingVessel ? 'updating' : 'creating'} vessel: ${err.message}`);
    }
  };

  if (authLoading || loading) {
    return <p className={styles.emptyTableMessage}>Loading vessels...</p>;
  }

  if (error) {
    return <p className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {error}</p>;
  }

  if (!currentUser) {
    return <p className={styles.emptyTableMessage}>Please log in to view and manage vessels.</p>;
  }

  return (
    <div className={styles.dataTableContainer}>
      <div style={{ padding: '15px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleAddVesselClick}
          className={`${styles.defectActionBtn} ${styles.add}`}
        >
          Add New Vessel
        </button>
      </div>

      {!loading && !error && (
        <div className={styles.dataTableWrapper}>
          <VesselTable vessels={vessels} onEdit={handleEditVessel} onDelete={handleDeleteVessel} />
        </div>
      )}

      {showForm && (
        <VesselForm
          vessel={editingVessel}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default VesselsTab;