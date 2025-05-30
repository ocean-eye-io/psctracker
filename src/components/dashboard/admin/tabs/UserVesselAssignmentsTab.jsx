import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Users, Ship, Check, X, Eye, EyeOff, Bookmark, BookmarkCheck, ChevronDown, Grid, List, MapPin, Calendar, Anchor, Plus, Minus, RotateCcw, Save } from 'lucide-react';
import UserSelector from '../components/UserSelector';
import { API_BASE_URL } from '../config';
import { useAuth } from '../../../../context/AuthContext';
import styles from '../admin.module.css';

const UserVesselAssignmentsTab = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [allVessels, setAllVessels] = useState([]);
  const [loadingVessels, setLoadingVessels] = useState(true);
  const [errorVessels, setErrorVessels] = useState(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVessels, setSelectedVessels] = useState(new Set());
  const [viewMode, setViewMode] = useState('table'); // Changed default to 'table'
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('vessel_name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk operation states
  const [bulkMode, setBulkMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(new Set()); // Tracks changes to be saved

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

  // Reset selections and initialize pendingChanges when user changes
  useEffect(() => {
    setSelectedVessels(new Set());
    setBulkMode(false);
    // Initialize pendingChanges with the assigned vessels of the newly selected user
    setPendingChanges(new Set(selectedUser?.assigned_vessels || []));
  }, [selectedUser]);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const types = [...new Set(allVessels.map(v => v.vessel_type || v.type).filter(Boolean))];
    const regions = [...new Set(allVessels.map(v => v.region).filter(Boolean))];
    const statuses = [...new Set(allVessels.map(v => v.status).filter(Boolean))];
    
    return { types, regions, statuses };
  }, [allVessels]);

  // Filter and sort vessels
  const filteredVessels = useMemo(() => {
    let filtered = allVessels.filter(vessel => {
      // Search filter
      const searchMatch = !searchQuery || 
        vessel.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.imo_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vessel.vessel_id?.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const typeMatch = typeFilter === 'all' || vessel.vessel_type === typeFilter || vessel.type === typeFilter;
      
      // Region filter
      const regionMatch = regionFilter === 'all' || vessel.region === regionFilter;
      
      // Status filter
      const statusMatch = statusFilter === 'all' || vessel.status === statusFilter;

      // Assignment filters
      // Check against pendingChanges for current assignment status
      const isAssigned = pendingChanges.has(vessel.vessel_id);
      const assignmentMatch = (!showAssignedOnly && !showUnassignedOnly) ||
        (showAssignedOnly && isAssigned) ||
        (showUnassignedOnly && !isAssigned);

      return searchMatch && typeMatch && regionMatch && statusMatch && assignmentMatch;
    });

    // Sort vessels
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase(); // Fixed typo: bVal was 'string'
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allVessels, searchQuery, typeFilter, regionFilter, statusFilter, showAssignedOnly, showUnassignedOnly, sortBy, sortOrder, pendingChanges]); // Added pendingChanges to dependencies

  // Toggle vessel assignment
  const toggleVesselAssignment = (vesselId) => {
    const newPendingChanges = new Set(pendingChanges);
    if (newPendingChanges.has(vesselId)) {
      newPendingChanges.delete(vesselId);
    } else {
      newPendingChanges.add(vesselId);
    }
    setPendingChanges(newPendingChanges);
  };

  // Bulk operations
  const handleBulkAssign = () => {
    const newPendingChanges = new Set(pendingChanges);
    selectedVessels.forEach(vesselId => {
      newPendingChanges.add(vesselId);
    });
    setPendingChanges(newPendingChanges);
    setSelectedVessels(new Set());
  };

  const handleBulkUnassign = () => {
    const newPendingChanges = new Set(pendingChanges);
    selectedVessels.forEach(vesselId => {
      newPendingChanges.delete(vesselId);
    });
    setPendingChanges(newPendingChanges);
    setSelectedVessels(new Set());
  };

  const handleSelectAll = () => {
    if (selectedVessels.size === filteredVessels.length) {
      setSelectedVessels(new Set());
    } else {
      setSelectedVessels(new Set(filteredVessels.map(v => v.vessel_id)));
    }
  };

  const resetChanges = () => {
    setPendingChanges(new Set(selectedUser?.assigned_vessels || []));
    setSelectedVessels(new Set());
  };

  // Save assignments
  const handleSaveAssignments = async () => {
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

      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.user_id}/vessels`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ assigned_vessels: Array.from(pendingChanges) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save vessel assignments');
      }

      // Update local state to reflect saved changes
      setSelectedUser({...selectedUser, assigned_vessels: Array.from(pendingChanges)});
      alert('Vessel assignments saved successfully!');
    } catch (err) {
      console.error("Error saving vessel assignments:", err);
      alert(`Error saving vessel assignments: ${err.message}`);
    }
  };

  // Get assignment status for a vessel
  const getAssignmentStatus = (vesselId) => {
    const originallyAssigned = selectedUser?.assigned_vessels?.includes(vesselId);
    const pendingAssigned = pendingChanges.has(vesselId);
    
    if (originallyAssigned && pendingAssigned) return 'assigned'; // Was assigned, still assigned
    if (!originallyAssigned && !pendingAssigned) return 'unassigned'; // Was unassigned, still unassigned
    if (!originallyAssigned && pendingAssigned) return 'pending-assign'; // Was unassigned, now assigned
    if (originallyAssigned && !pendingAssigned) return 'pending-unassign'; // Was assigned, now unassigned
  };

  // Check if there are any changes from the original assigned_vessels
  const hasChanges = useMemo(() => {
    if (!selectedUser) return false;
    const originalAssigned = new Set(selectedUser.assigned_vessels || []);
    
    if (originalAssigned.size !== pendingChanges.size) return true;
    
    for (const vesselId of pendingChanges) {
      if (!originalAssigned.has(vesselId)) return true;
    }
    return false;
  }, [selectedUser, pendingChanges]);


  if (authLoading || loadingVessels) {
    return <div className={styles.emptyTableMessage}>Loading data for vessel assignments...</div>;
  }

  if (errorVessels) {
    return <div className={styles.emptyTableMessage} style={{ color: 'var(--negative-color)' }}>Error: {errorVessels}</div>;
  }

  if (!currentUser) {
    return <div className={styles.emptyTableMessage}>Please log in to manage user-vessel assignments.</div>;
  }

  return (
    <div className={styles.userVesselAssignmentsTabContent}>
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: 'var(--text-light)', marginBottom: '15px' }}>Manage User-Vessel Assignments</h4>
        
        {/* User Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'var(--text-light)', marginBottom: '8px', display: 'block' }}>Select User:</label>
          <UserSelector onUserSelect={handleUserSelect} selectedUser={selectedUser} />
        </div>
      </div>

      {selectedUser && allVessels.length > 0 && (
        <div className={styles.vesselAssignmentContainer}>
          {/* Header Controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h5 style={{ color: 'var(--blue-accent)', margin: 0 }}>
                Assigning to: {selectedUser.name || selectedUser.email || selectedUser.cognito_username}
              </h5>
              <span style={{ 
                color: 'var(--text-muted)', 
                fontSize: '12px',
                padding: '4px 8px',
                background: 'rgba(77, 195, 255, 0.1)',
                borderRadius: '4px'
              }}>
                {pendingChanges.size} vessels assigned
              </span>
            </div>
            
            {hasChanges && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={resetChanges}
                  className={styles.actionButton}
                  style={{ background: 'rgba(231, 76, 60, 0.1)', color: 'var(--negative-color)' }}
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button 
                  onClick={handleSaveAssignments}
                  className={`${styles.actionButton} ${styles.formButton} ${styles.saveButton}`}
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                placeholder="Search vessels by name, IMO, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(59, 173, 229, 0.2)',
                  borderRadius: '6px',
                  color: 'var(--text-light)',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={styles.actionButton}
              style={{ 
                background: showFilters ? 'rgba(77, 195, 255, 0.2)' : 'rgba(77, 195, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}
            >
              <Filter size={14} />
              Filters
            </button>

            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setViewMode('cards')}
                className={styles.actionButton}
                style={{ 
                  background: viewMode === 'cards' ? 'rgba(77, 195, 255, 0.2)' : 'rgba(77, 195, 255, 0.1)'
                }}
              >
                <Grid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={styles.actionButton}
                style={{ 
                  background: viewMode === 'table' ? 'rgba(77, 195, 255, 0.2)' : 'rgba(77, 195, 255, 0.1)'
                }}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '20px',
              padding: '15px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              flexWrap: 'wrap'
            }}>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(59, 173, 229, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--text-light)',
                  minWidth: '120px'
                }}
              >
                <option value="all">All Types</option>
                {filterOptions.types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select 
                value={regionFilter} 
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(59, 173, 229, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--text-light)',
                  minWidth: '120px'
                }}
              >
                <option value="all">All Regions</option>
                {filterOptions.regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(59, 173, 229, 0.2)',
                  borderRadius: '4px',
                  color: 'var(--text-light)',
                  minWidth: '120px'
                }}
              >
                <option value="all">All Statuses</option>
                {filterOptions.statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-light)', fontSize: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={showAssignedOnly}
                    onChange={(e) => {
                      setShowAssignedOnly(e.target.checked);
                      if (e.target.checked) setShowUnassignedOnly(false);
                    }}
                  />
                  Assigned Only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-light)', fontSize: '12px' }}>
                  <input 
                    type="checkbox" 
                    checked={showUnassignedOnly}
                    onChange={(e) => {
                      setShowUnassignedOnly(e.target.checked);
                      if (e.target.checked) setShowAssignedOnly(false);
                    }}
                  />
                  Unassigned Only
                </label>
              </div>
            </div>
          )}

          {/* Bulk Operations */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {filteredVessels.length} vessels • {selectedVessels.size} selected
              </span>
              {selectedVessels.size > 0 && (
                <>
                  <button 
                    onClick={handleBulkAssign}
                    className={styles.actionButton}
                    style={{ background: 'rgba(46, 204, 113, 0.1)', color: 'var(--positive-color)' }}
                  >
                    <Plus size={14} />
                    Assign ({selectedVessels.size})
                  </button>
                  <button 
                    onClick={handleBulkUnassign}
                    className={styles.actionButton}
                    style={{ background: 'rgba(231, 76, 60, 0.1)', color: 'var(--negative-color)' }}
                  >
                    <Minus size={14} />
                    Unassign ({selectedVessels.size})
                  </button>
                </>
              )}
            </div>
            
            <button 
              onClick={handleSelectAll}
              className={styles.actionButton}
            >
              {selectedVessels.size === filteredVessels.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Vessel Display */}
          <div style={{ 
            maxHeight: 'calc(100vh - 500px)', 
            overflow: 'auto',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            {viewMode === 'cards' ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '15px',
                padding: '15px'
              }}>
                {filteredVessels.map(vessel => {
                  const assignmentStatus = getAssignmentStatus(vessel.vessel_id);
                  const isSelected = selectedVessels.has(vessel.vessel_id);
                  
                  return (
                    <div 
                      key={vessel.vessel_id}
                      style={{
                        background: isSelected ? 'rgba(77, 195, 255, 0.1)' : 'var(--card-bg)',
                        border: `1px solid ${isSelected ? 'var(--blue-accent)' : 'var(--border-subtle)'}`,
                        borderRadius: '8px',
                        padding: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onClick={() => {
                        const newSelected = new Set(selectedVessels);
                        if (newSelected.has(vessel.vessel_id)) {
                          newSelected.delete(vessel.vessel_id);
                        } else {
                          newSelected.add(vessel.vessel_id);
                        }
                        setSelectedVessels(newSelected);
                      }}
                    >
                      {/* Assignment Status Badge */}
                      <div style={{ 
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        ...(assignmentStatus === 'assigned' ? {
                          background: 'rgba(46, 204, 113, 0.2)',
                          color: 'var(--positive-color)',
                          border: '1px solid rgba(46, 204, 113, 0.3)'
                        } : assignmentStatus === 'pending-assign' ? {
                          background: 'rgba(241, 196, 15, 0.2)',
                          color: 'var(--warning-color)',
                          border: '1px solid rgba(241, 196, 15, 0.3)'
                        } : assignmentStatus === 'pending-unassign' ? {
                          background: 'rgba(231, 76, 60, 0.2)',
                          color: 'var(--negative-color)',
                          border: '1px solid rgba(231, 76, 60, 0.3)'
                        } : {
                          background: 'rgba(149, 165, 166, 0.2)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(149, 165, 166, 0.3)'
                        })
                      }}>
                        {assignmentStatus === 'assigned' ? 'Assigned' :
                         assignmentStatus === 'pending-assign' ? 'Pending +' :
                         assignmentStatus === 'pending-unassign' ? 'Pending -' :
                         'Unassigned'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <Ship size={16} style={{ color: 'var(--blue-accent)', marginRight: '8px' }} />
                        <h6 style={{ margin: 0, color: 'var(--text-light)', fontSize: '14px', fontWeight: '600' }}>
                          {vessel.vessel_name}
                        </h6>
                      </div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        IMO: {vessel.imo_number} • ID: {vessel.vessel_id}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <MapPin size={10} />
                          {vessel.region || 'Unknown'}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 6px',
                          background: 'rgba(77, 195, 255, 0.1)',
                          color: 'var(--blue-accent)',
                          borderRadius: '8px'
                        }}>
                          {vessel.vessel_type || vessel.type || 'Unknown'}
                        </span>
                      </div>

                      {/* Quick assign/unassign button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVesselAssignment(vessel.vessel_id);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: 'none',
                          background: assignmentStatus === 'assigned' || assignmentStatus === 'pending-assign' 
                            ? 'var(--positive-color)' 
                            : 'var(--text-muted)',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {assignmentStatus === 'assigned' || assignmentStatus === 'pending-assign' ? 
                          <Check size={12} /> : <Plus size={12} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Table View
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ 
                    background: 'linear-gradient(180deg, #0a1725, #112032)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px', width: '40px' }}>
                        <input 
                          type="checkbox"
                          checked={selectedVessels.size === filteredVessels.length && filteredVessels.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px' }}>
                        Vessel Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px' }}>
                        IMO Number
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px' }}>
                        Type
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px' }}>
                        Region
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-light)', fontSize: '12px' }}>
                        Status
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12px', width: '100px' }}>
                        Assignment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVessels.map(vessel => {
                      const assignmentStatus = getAssignmentStatus(vessel.vessel_id);
                      const isSelected = selectedVessels.has(vessel.vessel_id);
                      
                      return (
                        <tr 
                          key={vessel.vessel_id}
                          style={{
                            background: isSelected ? 'rgba(77, 195, 255, 0.05)' : 'transparent',
                            borderBottom: '1px solid var(--border-subtle)'
                          }}
                        >
                          <td style={{ padding: '12px' }}>
                            <input 
                              type="checkbox"
                              // Check if the vessel is in pendingChanges to reflect its assignment status
                              checked={pendingChanges.has(vessel.vessel_id)}
                              onChange={() => toggleVesselAssignment(vessel.vessel_id)} // Toggle assignment on click
                            />
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-light)', fontSize: '13px' }}>
                            {vessel.vessel_name}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {vessel.imo_number}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {vessel.vessel_type || vessel.type || '-'}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {vessel.region || '-'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '12px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '500',
                              background: vessel.status === 'Active' ? 'rgba(46, 204, 113, 0.2)' : 
                                         vessel.status === 'In Port' ? 'rgba(52, 152, 219, 0.2)' :
                                         'rgba(149, 165, 166, 0.2)',
                              color: vessel.status === 'Active' ? 'var(--positive-color)' : 
                                    vessel.status === 'In Port' ? 'var(--blue-accent)' :
                                    'var(--text-muted)'
                            }}>
                              {vessel.status || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={() => toggleVesselAssignment(vessel.vessel_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                ...(assignmentStatus === 'assigned' ? {
                                  background: 'rgba(46, 204, 113, 0.2)',
                                  color: 'var(--positive-color)'
                                } : assignmentStatus === 'pending-assign' ? {
                                  background: 'rgba(241, 196, 15, 0.2)',
                                  color: 'var(--warning-color)'
                                } : assignmentStatus === 'pending-unassign' ? {
                                  background: 'rgba(231, 76, 60, 0.2)',
                                  color: 'var(--negative-color)'
                                } : {
                                  background: 'rgba(77, 195, 255, 0.1)',
                                  color: 'var(--blue-accent)'
                                })
                              }}
                            >
                              {assignmentStatus === 'assigned' ? 'Assigned' :
                               assignmentStatus === 'pending-assign' ? 'Pending +' :
                               assignmentStatus === 'pending-unassign' ? 'Pending -' :
                               'Assign'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {filteredVessels.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              No vessels found matching your criteria
            </div>
          )}
        </div>
      )}

      {!selectedUser && (
        <div className={styles.emptyTableMessage}>Please select a user to manage their vessel assignments.</div>
      )}
    </div>
  );
};

export default UserVesselAssignmentsTab;