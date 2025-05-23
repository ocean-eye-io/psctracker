// src/components/dashboard/datavalidation/DataQualityDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Download, RefreshCw, Database, AlertTriangle, 
  ChevronLeft, ChevronRight, TrendingUp, CheckCircle, 
  XCircle, Clock, BarChart2, PlayCircle, Filter
} from 'lucide-react';
import '../DashboardStyles.css';
import '../../common/Table/tableStyles.css';
import DataQualityTable from './DataQualityTable';
import { DATA_QUALITY_FIELDS } from './dataQualityFieldMappings'; // Import from the new file

// API Configuration
const API_URL = 'https://ijvra3ghrlijudmmxpny7bj4aa0oqfbz.lambda-url.ap-south-1.on.aws/';
const ANALYSIS_DAYS = 10;
const REQUEST_TIMEOUT = 60000;

// Quality score thresholds
const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  ACCEPTABLE: 50,
  POOR: 0
};

const DataQualityDashboard = () => {
  // State Management
  const [dataQualityMetrics, setDataQualityMetrics] = useState([]);
  const [filteredMetrics, setFilteredMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [analysisStartTime, setAnalysisStartTime] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  // Utility Functions
  const getQualityScoreColor = (score) => {
    if (score >= QUALITY_THRESHOLDS.EXCELLENT) return 'var(--color-success)';
    if (score >= QUALITY_THRESHOLDS.GOOD) return 'var(--color-primary)';
    if (score >= QUALITY_THRESHOLDS.ACCEPTABLE) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getQualityScoreLabel = (score) => {
    if (score >= QUALITY_THRESHOLDS.EXCELLENT) return 'Excellent';
    if (score >= QUALITY_THRESHOLDS.GOOD) return 'Good';
    if (score >= QUALITY_THRESHOLDS.ACCEPTABLE) return 'Acceptable';
    return 'Poor';
  };

  // Enhanced fetch with timeout
  const fetchWithTimeout = async (url, options, timeout = REQUEST_TIMEOUT) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - the analysis is taking longer than expected');
      }
      throw error;
    }
  };

  // Main data fetching function
  const fetchDataQualityMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysisStartTime(new Date());

    try {
      console.log('Starting comprehensive data quality analysis...');
      
      const requestBody = {
        operation: 'getAllVesselQualityMetrics'
      };

      const response = await fetchWithTimeout(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data || !Array.isArray(data.data)) {
        throw new Error(data.error || 'Invalid response format from analysis service');
      }

      const metrics = data.data;
      console.log(`Successfully analyzed ${metrics.length} vessels`);

      // Sort metrics by overall score descending
      const sortedMetrics = metrics.sort((a, b) => b.overall_score - a.overall_score);

      setDataQualityMetrics(sortedMetrics);
      setTotalItems(sortedMetrics.length);
      
      // Apply search filter if active
      if (searchTerm.trim()) {
        applySearchFilter(sortedMetrics, searchTerm);
      } else {
        setFilteredMetrics(sortedMetrics);
      }

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Critical error in data quality analysis:', error);
      setError(`Failed to analyze data quality: ${error.message}`);
      setDataQualityMetrics([]);
      setFilteredMetrics([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Search filtering logic
  const applySearchFilter = (metrics, term) => {
    if (!term.trim()) {
      setFilteredMetrics(metrics);
      setTotalItems(metrics.length);
      return;
    }

    const searchTerm = term.toLowerCase();
    const filtered = metrics.filter(metric => 
      (metric.vessel_name && metric.vessel_name.toLowerCase().includes(searchTerm)) ||
      (metric.vessel_imo && metric.vessel_imo.toString().toLowerCase().includes(searchTerm)) ||
      (metric.vessel_type && metric.vessel_type.toLowerCase().includes(searchTerm)) ||
      (metric.quality_label && metric.quality_label.toLowerCase().includes(searchTerm)) ||
      (metric.issue_type && metric.issue_type.toLowerCase().includes(searchTerm))
    );

    setFilteredMetrics(filtered);
    setTotalItems(filtered.length);
    setCurrentPage(1);
  };

  // Effects
  useEffect(() => {
    // Auto-start analysis on component mount
    fetchDataQualityMetrics();
  }, []);

  useEffect(() => {
    applySearchFilter(dataQualityMetrics, searchTerm);
  }, [dataQualityMetrics, searchTerm]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMetrics.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMetrics, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // KPI Calculations
  const summaryMetrics = useMemo(() => {
    if (!dataQualityMetrics.length) {
      return {
        overall: 0, completeness: 0, correctness: 0, freshness: 0,
        totalIssues: 0, criticalVessels: 0, vesselsWithData: 0,
        vesselsWithoutData: 0, excellentVessels: 0, goodVessels: 0,
        acceptableVessels: 0, poorVessels: 0
      };
    }

    const vesselsWithData = dataQualityMetrics.filter(m => m.overall_score > 0);
    const vesselsWithoutData = dataQualityMetrics.filter(m => m.overall_score === 0);

    const calculateAverage = (field) => 
      vesselsWithData.length > 0
        ? Math.round(vesselsWithData.reduce((sum, m) => sum + m[field], 0) / vesselsWithData.length)
        : 0;

    return {
      overall: calculateAverage('overall_score'),
      completeness: calculateAverage('completeness'),
      correctness: calculateAverage('correctness'),
      freshness: calculateAverage('freshness'),
      totalIssues: dataQualityMetrics.reduce((sum, m) => sum + m.issue_count, 0),
      criticalVessels: dataQualityMetrics.filter(m => m.overall_score > 0 && m.overall_score < 70).length,
      vesselsWithData: vesselsWithData.length,
      vesselsWithoutData: vesselsWithoutData.length,
      excellentVessels: dataQualityMetrics.filter(m => m.overall_score >= 90).length,
      goodVessels: dataQualityMetrics.filter(m => m.overall_score >= 70 && m.overall_score < 90).length,
      acceptableVessels: dataQualityMetrics.filter(m => m.overall_score >= 50 && m.overall_score < 70).length,
      poorVessels: dataQualityMetrics.filter(m => m.overall_score > 0 && m.overall_score < 50).length
    };
  }, [dataQualityMetrics]);

  // Calculate analysis duration
  const getAnalysisDuration = () => {
    if (!analysisStartTime || !lastUpdated) return null;
    const duration = Math.round((lastUpdated - analysisStartTime) / 1000);
    return duration;
  };

  // Format date for display
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleString();
  };

  // Export functionality
  const handleExport = () => {
    const headers = [
      'Vessel Name', 'IMO Number', 'Vessel Type', 'Completeness (%)', 
      'Correctness (%)', 'Freshness (%)', 'Overall Score (%)', 
      'Quality Level', 'Last Updated', 'Issues Count', 'Entries Analyzed',
      'Issue Type', 'Issue Description', 'Missing Fields', 'Incorrect Fields',
      'Days Since Update', 'Last Validated'
    ];

    const csvData = filteredMetrics.map(metric => [
      metric.vessel_name,
      metric.vessel_imo,
      metric.vessel_type,
      metric.completeness,
      metric.correctness,
      metric.freshness,
      metric.overall_score,
      metric.quality_label,
      metric.last_updated,
      metric.issue_count,
      metric.entries_analyzed,
      metric.issue_type,
      `"${metric.issue_description.replace(/"/g, '""')}"`,
      metric.missing_fields_info,
      metric.incorrect_fields_info,
      metric.days_since_update,
      metric.last_validated
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `data_quality_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render Component
  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content"> {/* This is the main flex container */}
          <div className="header-title-section">
            <div className="header-title">
              <BarChart2 size={18} className="header-icon" />
              <h1>Data Quality Dashboard</h1>
            </div>
            
            <div className="header-subtitle">
              <span className="analysis-period">Last {ANALYSIS_DAYS} days</span>
              <span className="vessel-count">{totalItems} vessels</span>
              <span className="last-updated">Updated: {formatLastUpdated()}</span>
              {getAnalysisDuration() && (
                <span className="analysis-duration">
                  Analysis: {getAnalysisDuration()}s
                </span>
              )}
            </div>
          </div>
          
          {/* This new container will be pushed to the right */}
          <div className="header-right-section"> 
            <div className="quality-summary">
              <div className="quality-indicator excellent">
                <span className="quality-count">{summaryMetrics.excellentVessels}</span>
                <span className="quality-label">Excellent</span>
              </div>
              <div className="quality-indicator good">
                <span className="quality-count">{summaryMetrics.goodVessels}</span>
                <span className="quality-label">Good</span>
              </div>
              <div className="quality-indicator acceptable">
                <span className="quality-count">{summaryMetrics.acceptableVessels}</span>
                <span className="quality-label">Acceptable</span>
              </div>
              <div className="quality-indicator poor">
                <span className="quality-count">{summaryMetrics.poorVessels}</span>
                <span className="quality-label">Poor</span>
              </div>
            </div>
            
            <div className="header-actions">
              <div className="search-container">
                <button 
                  className="action-btn search-btn" 
                  onClick={() => setShowSearch(!showSearch)}
                  title="Search vessels"
                >
                  <Search size={14} />
                  <span>Search</span>
                </button>
                
                {showSearch && (
                  <div className="search-popup">
                    <input 
                      type="text" 
                      placeholder="Search vessels, IMO, type..." 
                      className="search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>
              
              <button 
                className="action-btn refresh-btn" 
                onClick={fetchDataQualityMetrics} 
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spinning" : ""} />
                <span>{loading ? 'Analyzing...' : 'Refresh'}</span>
              </button>
              
              <button 
                className="action-btn export-btn" 
                onClick={handleExport}
                disabled={filteredMetrics.length === 0 || loading}
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>
          </div> {/* End of header-right-section */}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="analysis-progress">
          <div className="progress-spinner"></div>
          <div className="progress-info">
            <h3>Analyzing vessel data...</h3>
            <div className="progress-bar">
              <div className="progress-bar-fill"></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <AlertTriangle size={18} />
          <div className="error-content">
            <strong>Analysis Failed</strong>
            <p>{error}</p>
          </div>
          <button 
            className="retry-button" 
            onClick={fetchDataQualityMetrics}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* KPI Dashboard - Gauge Chart Style */}
      <div className="metrics-dashboard">
        <div className="gauge-container">
          <div className="gauge-card">
            <div className="gauge-title">Fleet Data Quality Score</div>
            <div className="gauge-wrapper">
              <div className="gauge">
                <div className="gauge-fill" style={{ 
                  transform: `rotate(${Math.min(180, (summaryMetrics.overall / 100) * 180)}deg)`,
                  background: getQualityScoreColor(summaryMetrics.overall)
                }}></div>
                <div className="gauge-cover">
                  <span className="gauge-value">{summaryMetrics.overall}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="metrics-trio">
            <div className="metric-pill" style={{ borderColor: getQualityScoreColor(summaryMetrics.completeness) }}>
              <span className="metric-pill-label">Data Completeness</span>
              <span className="metric-pill-value" style={{ color: getQualityScoreColor(summaryMetrics.completeness) }}>
                {summaryMetrics.completeness}%
              </span>
            </div>
            
            <div className="metric-pill" style={{ borderColor: getQualityScoreColor(summaryMetrics.correctness) }}>
              <span className="metric-pill-label">Data Accuracy</span>
              <span className="metric-pill-value" style={{ color: getQualityScoreColor(summaryMetrics.correctness) }}>
                {summaryMetrics.correctness}%
              </span>
            </div>
            
            <div className="metric-pill" style={{ borderColor: getQualityScoreColor(summaryMetrics.freshness) }}>
              <span className="metric-pill-label">Data Recency</span>
              <span className="metric-pill-value" style={{ color: getQualityScoreColor(summaryMetrics.freshness) }}>
                {summaryMetrics.freshness}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="issues-summary">
          <div className="issues-card">
            <div className="issues-icon">
              <AlertTriangle size={18} />
            </div>
            <div className="issues-content">
              <div className="issues-value" style={{ color: summaryMetrics.totalIssues > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {summaryMetrics.totalIssues}
              </div>
              <div className="issues-label">Total Issues</div>
            </div>
          </div>
          
          <div className="issues-card">
            <div className="issues-icon">
              <XCircle size={18} />
            </div>
            <div className="issues-content">
              <div className="issues-value" style={{ color: summaryMetrics.criticalVessels > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {summaryMetrics.criticalVessels}
              </div>
              <div className="issues-label">Critical Vessels</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="table-container">
        {!loading && filteredMetrics.length === 0 && !error ? (
          <div className="empty-state">
            <AlertTriangle size={48} className="empty-icon" />
            <h3>No Analysis Results</h3>
            <p>Click "Refresh" to start data quality assessment</p>
            <button 
              className="action-btn start-btn" 
              onClick={fetchDataQualityMetrics}
              disabled={loading}
            >
              <PlayCircle size={16} />
              Start Analysis
            </button>
          </div>
        ) : !loading && filteredMetrics.length === 0 && searchTerm ? (
          <div className="empty-state">
            <Search size={48} className="empty-icon" />
            <h3>No Search Results</h3>
            <p>No vessels match "{searchTerm}"</p>
            <button 
              className="action-btn" 
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
          </div>
        ) : !loading ? (
          <>
            {/* Table Header */}
            <div className="table-header">
              <div className="table-title">
                <h2>Data Quality Analysis Results</h2>
              </div>
              
              <div className="table-actions">
                <div className="page-size">
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="page-size-select"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>per page</span>
                </div>
              </div>
            </div>
            
            {/* Data Quality Table */}
            <DataQualityTable 
              metrics={paginatedData}
              fieldMappings={DATA_QUALITY_FIELDS}
            />
            
            {/* Ultra-Sleek Floating Pagination */}
            {totalPages > 1 && (
              <div className="floating-pagination">
                <div className="pagination-controls">
                  <button 
                    className="pagination-arrow" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="pagination-info">
                    <span className="current-page">{currentPage}</span>
                    <span className="page-separator">/</span>
                    <span className="total-pages">{totalPages}</span>
                  </div>
                  
                  <button 
                    className="pagination-arrow" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="pagination-summary">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* SLEEK MODERN STYLES */}
      <style jsx>{`
        :root {
          --color-background: #0A0E17;
          --color-surface: #111827;
          --color-surface-light: #1F2937;
          --color-primary: #3B82F6;
          --color-primary-light: rgba(59, 130, 246, 0.1);
          --color-success: #10B981;
          --color-warning: #F59E0B;
          --color-danger: #EF4444;
          --color-text: #F9FAFB;
          --color-text-secondary: #9CA3AF;
          --color-border: rgba(75, 85, 99, 0.4);
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --radius-sm: 0.25rem;
          --radius-md: 0.375rem;
          --radius-lg: 0.5rem;
          --radius-full: 9999px;
          --transition: all 0.2s ease;
        }

        /* Base Styles */
        .dashboard-container {
          background-color: var(--color-background);
          color: var(--color-text);
          min-height: 100vh;
          padding: 0.75rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Header Styles */
        .dashboard-header {
          margin-bottom: 0.75rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem; /* Adjusted padding here */
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
        }

        .header-content {
          display: flex;
          justify-content: space-between; /* THIS IS THE KEY FOR LEFT/RIGHT ALIGNMENT */
          align-items: center; /* Vertically centers items */
          flex-wrap: wrap; /* Allows items to wrap on smaller screens */
          width: 100%; /* Explicitly ensure it takes full width */
          gap: 0.75rem; /* This gap is for when items wrap, not for space-between */
        }

        .header-title-section {
          min-width: 200px; /* Ensure it doesn't shrink too much */
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-icon {
          color: var(--color-primary);
        }

        .header-title h1 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          color: var(--color-primary);
        }

        .header-subtitle {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.7rem;
          color: var(--color-text-secondary);
          margin-top: 0.25rem;
        }

        .analysis-period, .vessel-count, .last-updated, .analysis-duration {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }

        .analysis-period::after, .vessel-count::after, .last-updated::after {
          content: "•";
          margin-left: 0.75rem;
          opacity: 0.5;
        }

        .analysis-duration {
          color: var(--color-success);
        }

        /* New style for the right-aligned section */
        .header-right-section {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem; /* Gap between quality summary and actions */
        }

        /* Quality Summary */
        .quality-summary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .quality-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.4rem;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 500;
        }

        .quality-indicator.excellent {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);
        }

        .quality-indicator.good {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
        }

        .quality-indicator.acceptable {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-warning);
        }

        .quality-indicator.poor {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);
        }

        .quality-count {
          font-weight: 600;
        }

        /* Header Actions */
        .header-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        /* Button Styles */
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: var(--color-surface-light);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 0.3rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          height: 1.75rem;
        }

        .action-btn:hover:not(:disabled) {
          background: var(--color-primary);
          color: white;
          transform: translateY(-1px);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .search-btn {
          color: var(--color-primary);
          border-color: var(--color-primary);
          background: var(--color-primary-light);
        }

        .refresh-btn {
          background: var(--color-surface-light);
        }

        .export-btn {
          background: var(--color-surface-light);
        }

        .start-btn {
          background: var(--color-primary);
          color: white;
        }

        .search-container {
          position: relative;
        }

        .search-popup {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 0.5rem;
          width: 250px;
          z-index: 10;
          background: var(--color-surface);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          padding: 0.5rem;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface-light);
          color: var(--color-text);
          font-size: 0.75rem;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-light);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Loading State */
        .analysis-progress {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
        }

        .progress-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid var(--color-primary-light);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .progress-info {
          flex: 1;
        }

        .progress-info h3 {
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0 0 0.375rem;
        }

        .progress-bar {
          height: 0.25rem;
          background: var(--color-surface-light);
          border-radius: 1rem;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--color-primary);
          border-radius: 1rem;
          width: 75%;
          animation: progress 2s ease infinite;
        }

        @keyframes progress {
          0% { width: 15%; }
          50% { width: 85%; }
          100% { width: 15%; }
        }

        /* Error Message */
        .error-message {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--color-danger);
          padding: 0.75rem;
          border-radius: var(--radius-md);
          margin-bottom: 0.75rem;
        }

        .error-content {
          flex: 1;
        }

        .error-content strong {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .error-content p {
          margin: 0;
          font-size: 0.75rem;
        }

        .retry-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: var(--color-danger);
          color: white;
          border: none;
          padding: 0.375rem 0.625rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
        }

        .retry-button:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-1px);
        }

        /* Metrics Dashboard - New Gauge Style */
        .metrics-dashboard {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .gauge-container {
          flex: 3;
          display: flex;
          gap: 0.75rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
        }

        .gauge-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .gauge-title {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--color-text-secondary);
        }

        .gauge-wrapper {
          position: relative;
          width: 100px;
          height: 50px;
          overflow: hidden;
          margin: 0 auto;
        }

        .gauge:before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--color-surface-light);
          border-radius: 100px 100px 0 0;
        }

        .gauge-fill {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: var(--color-primary);
          border-radius: 100px 100px 0 0;
          transform-origin: center bottom;
          transform: rotate(0deg);
          transition: transform 1s ease-out;
        }

        .gauge-cover {
          position: absolute;
          top: 15px;
          left: 10px;
          width: 80px;
          height: 40px;
          background: var(--color-surface);
          border-radius: 80px 80px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gauge-value {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .metrics-trio {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .metric-pill {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: var(--color-surface-light);
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
        }

        .metric-pill-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .metric-pill-value {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .issues-summary {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .issues-card {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 0.75rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
        }

        .issues-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background: var(--color-surface-light);
          border-radius: var(--radius-sm);
          color: var(--color-danger);
        }

        .issues-content {
          flex: 1;
        }

        .issues-value {
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .issues-label {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        /* Table Container */
        .table-container {
          position: relative;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
          overflow: hidden;
          margin-bottom: 0.75rem;
          padding-bottom: 3rem; /* Space for floating pagination */
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: linear-gradient(to right, var(--color-surface), var(--color-surface-light));
          border-bottom: 1px solid var(--color-border);
        }

        .table-title h2 {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0;
        }

        .table-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .page-size {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.7rem;
          color: var(--color-text-secondary);
        }

        .page-size-select {
          padding: 0.25rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface-light);
          color: var(--color-text);
          font-size: 0.7rem;
          cursor: pointer;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          text-align: center;
        }

        .empty-icon {
          color: var(--color-text-secondary);
          margin-bottom: 0.75rem;
        }

        .empty-state h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.375rem;
        }

        .empty-state p {
          color: var(--color-text-secondary);
          margin: 0 0 1rem;
          font-size: 0.75rem;
        }

        /* Ultra-Sleek Floating Pagination */
        .floating-pagination {
          position: absolute;
          bottom: 0.75rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          background: var(--color-surface-light);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 0.25rem 0.75rem;
          box-shadow: var(--shadow-lg);
          z-index: 10;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          background: transparent;
          border: none;
          color: var(--color-text);
          cursor: pointer;
          transition: var(--transition);
          padding: 0;
        }

        .pagination-arrow:hover:not(:disabled) {
          color: var(--color-primary);
        }

        .pagination-arrow:disabled {
          color: var(--color-text-secondary);
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
        }

        .current-page {
          font-weight: 600;
          color: var(--color-primary);
        }

        .page-separator {
          color: var(--color-text-secondary);
        }

        .total-pages {
          color: var(--color-text-secondary);
        }

        .pagination-summary {
          font-size: 0.65rem;
          color: var(--color-text-secondary);
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column; /* Stack items vertically */
            align-items: flex-start; /* Align to left */
          }

          .header-right-section { 
            width: 100%; /* Take full width when stacked */
            justify-content: flex-start; /* Align its content to start */
          }

          .quality-summary {
            width: 100%;
            justify-content: space-between;
          }

          .metrics-dashboard {
            flex-direction: column;
          }

          .gauge-container {
            flex-direction: column;
          }

          .floating-pagination {
            width: 90%;
            max-width: 300px;
          }
        }

        /* Utility Classes */
        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Form Element Styling */
        select, input {
          appearance: none;
          -webkit-appearance: none;
        }

        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.25rem center;
          padding-right: 1.5rem;
        }

        /* Focus States */
        .action-btn:focus,
        .search-input:focus,
        .page-size-select:focus,
        .pagination-arrow:focus,
        .jump-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--color-primary-light);
        }
      `}</style>
    </div>
  );
};

export default DataQualityDashboard;