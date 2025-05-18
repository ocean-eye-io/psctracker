// src/components/dashboard/defects/DefectsDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, RefreshCw } from 'lucide-react';
import '../DashboardStyles.css';
import '../../common/Table/tableStyles.css';
import DefectTable from './DefectTable';
import defectService from './services/defectService';

/**
 * DefectsDashboard component for displaying and managing defects
 */
const DefectsDashboard = () => {
  const [defects, setDefects] = useState([]);
  const [filteredDefects, setFilteredDefects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  
  // Current user mock (in a real app, this would come from auth context)
  const currentUser = {
    id: 123,
    name: 'John Doe',
    role: 'admin' // or 'user'
  };

  // Fetch defects data from API
  const fetchDefects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await defectService.getAllDefects();
      console.log('Fetched defects:', data.length);
      
      setDefects(data);
      setFilteredDefects(data);
    } catch (error) {
      console.error('Error fetching defects:', error);
      setError('Failed to fetch data. Please check the API connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  // Apply filters and search whenever the source data or filter criteria change
  useEffect(() => {
    if (!defects.length) return;
    
    let result = [...defects];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(defect => 
        defect['Status (Vessel)']?.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    // Apply criticality filter
    if (filterCriticality !== 'all') {
      result = result.filter(defect => 
        defect['Criticality']?.toLowerCase() === filterCriticality.toLowerCase()
      );
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      result = result.filter(defect => 
        Object.values(defect).some(value => 
          value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    setFilteredDefects(result);
  }, [defects, filterStatus, filterCriticality, searchQuery]);

  // Handle search input changes
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCriticality('all');
  };

  // Export data to CSV
  const handleExport = () => {
    // Get visible columns
    const visibleColumns = [
      'id', 'vessel_name', 'Status (Vessel)', 'Criticality', 'Equipments', 
      'Description', 'Action Planned', 'Date Reported', 'target_date'
    ];
    
    // Create CSV header
    const header = visibleColumns.join(',');
    
    // Create CSV rows
    const rows = filteredDefects.map(defect => {
      return visibleColumns.map(field => {
        const value = defect[field];
        // Handle null values and escape commas for CSV
        return value !== null && value !== undefined 
          ? `"${String(value).replace(/"/g, '""')}"` 
          : '';
      }).join(',');
    });
    
    // Combine header and rows
    const csv = [header, ...rows].join('\n');
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `defects_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers for table actions
  const handleView = (defect) => {
    console.log('View defect:', defect);
    // Implement view logic here - e.g., open a modal or navigate to details page
  };

  const handleEdit = (defect) => {
    console.log('Edit defect:', defect);
    // Implement edit logic here
  };

  const handleDelete = async (defect) => {
    if (window.confirm(`Are you sure you want to delete this defect?`)) {
      try {
        await defectService.deleteDefect(defect.id);
        // Refresh the data
        fetchDefects();
      } catch (error) {
        console.error('Error deleting defect:', error);
        alert('Failed to delete defect. Please try again.');
      }
    }
  };

  const handleOpenInstructions = (defect) => {
    console.log('Open instructions for defect:', defect);
    // Implement instructions dialog here
  };

  // Calculate counts for the stats display
  const totalDefects = defects.length;
  const openDefects = defects.filter(d => d['Status (Vessel)']?.toLowerCase() === 'open').length;
  const inProgressDefects = defects.filter(d => d['Status (Vessel)']?.toLowerCase() === 'in progress').length;
  const closedDefects = defects.filter(d => d['Status (Vessel)']?.toLowerCase() === 'closed').length;
  
  // Calculate overdue defects
  const overdueDefects = defects.filter(defect => {
    if (defect['Status (Vessel)']?.toLowerCase() === 'closed') return false;
    
    const targetDate = defect.target_date ? new Date(defect.target_date) : null;
    if (!targetDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    return targetDate < today;
  }).length;

  // Loading state
  if (loading && defects.length === 0) {
    return (
      <div className="dashboard-container loading">
        <div className="loading-spinner">Loading defects data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-container error">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchDefects} className="retry-button">
            <RefreshCw size={16} className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <h1>FleetWatch Dashboard</h1>
        </div>
        <div className="dashboard-controls">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search defects..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="filter-container">
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
            
            <select 
              className="filter-select"
              value={filterCriticality}
              onChange={(e) => setFilterCriticality(e.target.value)}
            >
              <option value="all">All Criticality</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <button 
              className="reset-button"
              onClick={resetFilters}
              title="Reset all filters"
            >
              Reset
            </button>
          </div>
          
          <button 
            className="control-btn export-btn"
            onClick={handleExport}
            disabled={filteredDefects.length === 0}
          >
            <Download size={16} className="mr-1" />
            Export
          </button>
        </div>
      </header>

      {/* Stats Container - commented out but the values are calculated */}
      {/* 
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-card-title">Total Defects</div>
          <div className="stat-card-value">{totalDefects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Open</div>
          <div className="stat-card-value status-open">{openDefects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">In Progress</div>
          <div className="stat-card-value status-progress">{inProgressDefects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Closed</div>
          <div className="stat-card-value status-closed">{closedDefects}</div>
        </div>
        <div className="stat-card overdue-card">
          <div className="stat-card-title">Overdue</div>
          <div className="stat-card-value overdue-value">{overdueDefects}</div>
        </div>
      </div>
      */}

      {/* Defects Table Section */}
      <div className="data-table-wrapper defect-table-section">
        <div className="table-header">
          <h3>Equipment Defects</h3>
          <div className="table-controls">
            <span className="defect-count">
              {filteredDefects.length} {filteredDefects.length === 1 ? 'defect' : 'defects'} found
            </span>
            
            <button 
              className="refresh-btn" 
              onClick={fetchDefects}
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        
        <DefectTable
          defects={filteredDefects}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenInstructions={handleOpenInstructions}
          currentUser={currentUser}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default DefectsDashboard;