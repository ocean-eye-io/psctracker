// src/components/dashboards/admin/tabs/VesselsTab.js
import React, { useState, useEffect } from 'react';
import VesselTable from '../components/VesselTable';
import VesselForm from '../components/VesselForm';
import { API_BASE_URL } from '../config'; // Updated import path

const VesselsTab = () => {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVesselForm, setShowVesselForm] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);

  const fetchVessels = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = localStorage.getItem('idToken');
      if (!idToken) throw new Error("Authentication token not found.");

      const response = await fetch(`${API_BASE_URL}/admin/vessels`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
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
    fetchVessels();
  }, []);

  const handleAddVessel = () => {
    setEditingVessel(null);
    setShowVesselForm(true);
  };

  const handleEditVessel = (vessel) => {
    setEditingVessel(vessel);
    setShowVesselForm(true);
  };

  const handleDeleteVessel = async (vesselId) => {
    if (!window.confirm('Are you sure you want to delete this vessel? This will also remove it from any user assignments.')) return;

    try {
      const idToken = localStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/admin/vessels/${vesselId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vessel');
      }

      alert('Vessel deleted successfully!');
      fetchVessels();
    } catch (err) {
      console.error("Error deleting vessel:", err);
      alert(`Error deleting vessel: ${err.message}`);
    }
  };

  const handleFormSubmit = async (vesselData) => {
    try {
      const idToken = localStorage.getItem('idToken');
      const method = editingVessel ? 'PUT' : 'POST';
      const url = editingVessel ? `${API_BASE_URL}/admin/vessels/${editingVessel.vessel_id}` : `${API_BASE_URL}/admin/vessels`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(vesselData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingVessel ? 'update' : 'create'} vessel`);
      }

      alert(`Vessel ${editingVessel ? 'updated' : 'created'} successfully!`);
      setShowVesselForm(false);
      setEditingVessel(null);
      fetchVessels();
    } catch (err) {
      console.error(`Error ${editingVessel ? 'updating' : 'creating'} vessel:`, err);
      alert(`Error ${editingVessel ? 'updating' : 'creating'} vessel: ${err.message}`);
    }
  };

  return (
    <div className="vessels-tab-content" style={{ marginTop: '20px' }}>
      <h4>Manage Vessels</h4>
      <button onClick={handleAddVessel} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}>Add New Vessel</button>

      {loading && <p>Loading vessels...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && (
        <VesselTable vessels={vessels} onEdit={handleEditVessel} onDelete={handleDeleteVessel} />
      )}

      {showVesselForm && (
        <VesselForm
          vessel={editingVessel}
          onSubmit={handleFormSubmit}
          onClose={() => setShowVesselForm(false)}
        />
      )}
    </div>
  );
};

export default VesselsTab;