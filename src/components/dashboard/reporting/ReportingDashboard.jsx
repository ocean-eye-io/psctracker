// src/components/dashboard/reporting/ReportingDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, StatusIndicator, TableBadge, ExpandedItem, ActionButton } from '../../common/Table';
import { Calendar, CheckSquare, AlertTriangle, Eye, Info, Star, Ship, X, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import VesselReportingTable from './VesselReportingTable';
import vesselService from '../../../services/vesselService'; // Assuming you have this service
import { VESSEL_FIELDS } from '../../../config/vesselFieldMappings'; // Assuming you have this
import PropTypes from 'prop-types'; // Import PropTypes

const ReportingDashboard = ({ 
  initialVessels = [],
  onFormSubmit,
  currentUser
}) => {
  // State management
  const [vessels, setVessels] = useState(initialVessels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false); // Legacy form state
  const [activeVessel, setActiveVessel] = useState(null); // Legacy form state
  const [activeFormType, setActiveFormType] = useState('notification'); // Legacy form state
  const [vesselDetailsOpen, setVesselDetailsOpen] = useState(false);
  const [selectedVesselDetails, setSelectedVesselDetails] = useState(null);
  const [savingStates, setSavingStates] = useState({});
  
  const formDialogRef = useRef(null);
  const detailsDialogRef = useRef(null);

  // Enhanced vessel data fetching with error handling
  const fetchVessels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Dashboard: Fetching vessel data...');
      
      const vesselData = await vesselService.getAllVessels();
      
      // Map legacy status fields to a single 'status' field for consistency
      // This ensures that even if the backend returns old fields, our frontend
      // uses a consistent 'status' property.
      const processedVesselData = vesselData.map(vessel => ({
        ...vessel,
        // Prioritize existing 'status', then computed, then raw, then legacy
        status: vessel.status || vessel.computed_checklist_status || vessel.checklist_status || vessel.checklistStatus || 'pending'
      }));

      console.log('✅ Dashboard: Vessel data fetched and processed:', {
        count: processedVesselData.length,
        sample: processedVesselData[0] ? {
          name: processedVesselData[0].vessel_name,
          status: processedVesselData[0].status, // Now logging the consolidated 'status'
          // You can remove these if they are truly deprecated from backend response
          // checklist_status: processedVesselData[0].checklist_status,
          // computed_checklist_status: processedVesselData[0].computed_checklist_status
        } : null
      });
      
      setVessels(processedVesselData);
      
    } catch (error) {
      console.error('❌ Dashboard: Error fetching vessels:', error);
      setError('Failed to fetch vessel data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh vessels function for checklist updates
  const handleRefreshVessels = useCallback(async () => {
    console.log('🔄 Dashboard: Refresh vessels requested');
    await fetchVessels();
  }, [fetchVessels]);

  // Handle vessel updates with proper state management
  // This function is called by VesselReportingTable when a checklist status changes
  // or when an override (ETA/ETB/ETD) is updated.
  const handleUpdateVessel = useCallback(async (vesselId, fieldName, newValue) => {
    console.log('📝 Dashboard: Vessel update requested:', { vesselId, fieldName, newValue });
    
    try {
      // Handle checklist status updates (from ChecklistModal via VesselReportingTable)
      if (fieldName === 'status') { 
        console.log('📋 Dashboard: Checklist status updated, updating vessel state locally...');
        
        // Update specific vessel in state immediately for UI feedback
        setVessels(prevVessels => 
          prevVessels.map(vessel => 
            vessel.id === vesselId 
              ? { 
                  ...vessel, 
                  status: newValue, // Update the consolidated 'status' field
                  // If your backend still relies on these, you might need to update them too
                  // computed_checklist_status: newValue, 
                  // checklist_status: newValue,
                  // checklistStatus: newValue 
                }
              : vessel
          )
        );
        
        console.log('⚡ Dashboard: Vessel state updated locally for status');
        
        // The actual refresh from the backend will be triggered by VesselReportingTable
        // after a delay to ensure backend is updated, which will then re-fetch
        // and consolidate the status.
      }
      
      // Handle other field updates (like overrides for ETA, ETB, ETD)
      if (['eta', 'etb', 'etd'].includes(fieldName)) {
        console.log('📅 Dashboard: Date override update');
        
        const saveKey = `${vesselId}-${fieldName}`;
        setSavingStates(prev => ({ ...prev, [saveKey]: true }));
        
        try {
          // Call your vessel service to update the override
          await vesselService.updateOverride(vesselId, fieldName, newValue);
          
          // Update vessel state with the user_ override value
          setVessels(prevVessels => 
            prevVessels.map(vessel => 
              vessel.id === vesselId 
                ? { 
                    ...vessel, 
                    [`user_${fieldName}`]: newValue
                  }
                : vessel
            )
          );
          
          console.log('✅ Dashboard: Override updated successfully');
          
        } catch (overrideError) {
          console.error('❌ Dashboard: Override update failed:', overrideError);
          throw overrideError; // Re-throw to be caught by outer try-catch
        } finally {
          setSavingStates(prev => {
            const updated = { ...prev };
            delete updated[saveKey];
            return updated;
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Dashboard: Error in handleUpdateVessel:', error);
      alert(`Failed to update ${fieldName}: ${error.message}`);
    }
  }, []);

  // Handle override updates (this is essentially the same as the override part of handleUpdateVessel)
  // Keeping it separate if it's called from other places, otherwise can be merged.
  const handleUpdateOverride = useCallback(async (vesselId, fieldName, newValue) => {
    console.log('🔄 Dashboard: Override update requested:', { vesselId, fieldName, newValue });
    
    const saveKey = `${vesselId}-${fieldName}`;
    
    try {
      setSavingStates(prev => ({ ...prev, [saveKey]: true }));
      
      if (newValue === null) {
        await vesselService.deleteOverride(vesselId, fieldName);
      } else {
        await vesselService.updateOverride(vesselId, fieldName, newValue);
      }
      
      setVessels(prevVessels => 
        prevVessels.map(vessel => 
          vessel.id === vesselId 
            ? { 
                ...vessel, 
                [`user_${fieldName}`]: newValue
              }
            : vessel
        )
      );
      
      console.log('✅ Dashboard: Override updated successfully');
      
    } catch (error) {
      console.error('❌ Dashboard: Override update failed:', error);
      alert(`Failed to update ${fieldName}: ${error.message}`);
    } finally {
      setSavingStates(prev => {
        const updated = { ...prev };
        delete updated[saveKey];
        return updated;
      });
    }
  }, []);

  // Handle remarks modal (if you have one)
  const handleOpenRemarks = useCallback((vessel) => {
    console.log('💬 Dashboard: Opening remarks for vessel:', vessel.vessel_name);
    // Implement your remarks modal logic here
    // For now, just log
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (initialVessels.length === 0) {
      fetchVessels();
    } else {
      // If initialVessels are provided, process them to ensure 'status' field exists
      const processedInitialVessels = initialVessels.map(vessel => ({
        ...vessel,
        status: vessel.status || vessel.computed_checklist_status || vessel.checklist_status || vessel.checklistStatus || 'pending'
      }));
      setVessels(processedInitialVessels);
    }
  }, [initialVessels, fetchVessels]);

  // Add click outside handlers for dialogs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFormOpen && formDialogRef.current && !formDialogRef.current.contains(event.target)) {
        setIsFormOpen(false);
      }
      if (vesselDetailsOpen && detailsDialogRef.current && !detailsDialogRef.current.contains(event.target)) {
        setVesselDetailsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFormOpen, vesselDetailsOpen]);

  // Legacy form handling (if you still need these)
  const handleOpenForm = (vessel, formType) => {
    setActiveVessel(vessel);
    setActiveFormType(formType);
    setIsFormOpen(true);
  };
  
  const handleSubmitForm = (formData) => {
    if (activeVessel && activeFormType && onFormSubmit) {
      onFormSubmit(activeVessel.imo_no, activeFormType, formData);
      setIsFormOpen(false);
    }
  };
  
  const handleRowClick = (vessel) => {
    setSelectedVesselDetails(vessel);
    setVesselDetailsOpen(true);
  };
  
  // Get status color based on vessel event_type status
  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('at sea') || statusLower.includes('transit')) {
      return '#3498DB';
    } else if (statusLower.includes('port') || statusLower.includes('berth')) {
      return '#2ECC71';
    } else if (statusLower.includes('anchor')) {
      return '#F1C40F';
    } else {
      return '#f4f4f4';
    }
  };
  
  // Import form components (if you have them)
  const NotificationForm = React.lazy(() => import('./forms/NotificationForm'));
  const ChecklistForm = React.lazy(() => import('./forms/ChecklistForm'));
  
  // Vessel details component
  const VesselDetailsView = () => {
    if (!selectedVesselDetails) return null;
    
    // Use the consolidated 'status' field for display here too
    const currentChecklistStatus = selectedVesselDetails.status || 'pending';

    return (
      <div className="space-y-4">
        {/* Vessel header with status */}
        <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors shadow-md">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-blue-900/50 p-3 rounded-full shadow-inner">
                <Ship size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedVesselDetails.vessel_name}</h3>
                <p className="text-sm text-gray-400">IMO: {selectedVesselDetails.imo_no}</p>
              </div>
            </div>
            <StatusIndicator 
              status={selectedVesselDetails.event_type || '-'}
              color={getStatusColor(selectedVesselDetails.event_type)}
              className="inline-flex justify-end shadow-sm"
            />
          </div>
        </div>
        
        {/* Use ExpandedItem for details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpandedItem
            label={
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                ETA
              </div>
            }
            value={
              selectedVesselDetails.eta ? 
              new Date(selectedVesselDetails.eta).toLocaleString() : 
              '-'
            }
            className="hover:border-blue-600/30 transition-colors"
          />
          
          <ExpandedItem
            label={
              <div className="flex items-center gap-1">
                <Info size={14} />
                Checklist Status
              </div>
            }
            value={
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span>Current Status:</span>
                  <TableBadge variant={
                    currentChecklistStatus === 'submitted' ? "success" :
                    currentChecklistStatus === 'in_progress' ? "warning" : "danger"
                  }>
                    {currentChecklistStatus}
                  </TableBadge>
                </div>
              </div>
            }
            className="hover:border-blue-600/30 transition-colors"
          />
        </div>
        
        <div className="flex justify-between w-full mt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVesselDetailsOpen(false);
                // You can add logic to open checklist modal here
                // For example: handleOpenChecklistModal(selectedVesselDetails);
              }}
              className="flex items-center gap-2 hover:bg-blue-900/30 hover:border-blue-500 transition-all"
            >
              <CheckSquare size={16} />
              View Checklist
            </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => setVesselDetailsOpen(false)}
            className="hover:bg-gray-800 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    );
  };
  
  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12 animate-fadeIn">
      <div className="inline-flex justify-center items-center w-16 h-16 bg-gray-800 rounded-full mb-4 shadow-inner">
        <Info size={28} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-medium mb-2">No vessels found</h3>
      <p className="text-gray-400 max-w-md mx-auto">
        There are no vessels matching the current filter criteria. Try refreshing the data or check your connection.
      </p>
      <Button 
        onClick={fetchVessels}
        className="mt-4 flex items-center gap-2"
        variant="outline"
      >
        <RefreshCw size={16} />
        Refresh Data
      </Button>
    </div>
  );
  
  // Loading state component
  const LoadingState = () => (
    <div className="text-center py-16 animate-pulse">
      <div className="inline-flex justify-center items-center w-16 h-16 bg-gray-800 rounded-full mb-4">
        <Loader2 size={28} className="text-blue-400 animate-spin" />
      </div>
      <h3 className="text-lg font-medium mb-2">Loading vessels...</h3>
      <p className="text-gray-400 max-w-md mx-auto">
        Please wait while we fetch the vessel data.
      </p>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="text-center py-12">
      <div className="inline-flex justify-center items-center w-16 h-16 bg-red-900/20 rounded-full mb-4">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h3 className="text-lg font-medium mb-2 text-red-400">Error Loading Data</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-4">
        {error}
      </p>
      <Button 
        onClick={fetchVessels}
        className="flex items-center gap-2"
        variant="outline"
      >
        <RefreshCw size={16} />
        Try Again
      </Button>
    </div>
  );
  
  return (
    <div className="w-full">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Vessel Reporting Dashboard</h2>
          <p className="text-gray-400 text-sm">
            {vessels.length} vessel{vessels.length !== 1 ? 's' : ''} 
            {loading && ' (refreshing...)'}
          </p>
        </div>
        <Button
          onClick={handleRefreshVessels}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* Main content */}
      {error ? (
        <ErrorState />
      ) : loading && vessels.length === 0 ? (
        <LoadingState />
      ) : vessels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="w-full">
          <VesselReportingTable
            vessels={vessels}
            fieldMappings={VESSEL_FIELDS} // Use your field mappings
            loading={loading}
            onUpdateVessel={handleUpdateVessel}
            onUpdateOverride={handleUpdateOverride}
            onOpenRemarks={handleOpenRemarks}
            onRefreshVessels={handleRefreshVessels} // Pass refresh function
            savingStates={savingStates}
            currentUser={currentUser}
          />
        </div>
      )}
      
      {/* Legacy Form Dialog (if you still need it) */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setIsFormOpen(false)}
        >
          <div 
            ref={formDialogRef}
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-200 animate-zoomIn"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {activeFormType === 'notification' ? (
                  <>
                    <Calendar size={18} className="text-blue-400" />
                    5-Day Notification
                  </>
                ) : (
                  <>
                    <CheckSquare size={18} className="text-blue-400" />
                    Checklist
                  </>
                )}
                {activeVessel && (
                  <span className="text-sm text-gray-400 ml-1">
                    - {activeVessel.vessel_name}
                  </span>
                )}
              </h2>
              <button
                className="text-gray-400 hover:text-white focus:outline-none hover:bg-gray-800 p-1 rounded-full transition-colors"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              {activeVessel && (
                <React.Suspense fallback={
                  <div className="p-4 animate-pulse space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-10 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                    <div className="h-20 bg-gray-700 rounded"></div>
                    <div className="flex justify-end gap-2">
                      <div className="h-9 bg-gray-700 rounded w-20"></div>
                      <div className="h-9 bg-blue-700 rounded w-20"></div>
                    </div>
                  </div>
                }>
                  {activeFormType === 'notification' ? (
                    <NotificationForm 
                      vessel={activeVessel}
                      onSubmit={handleSubmitForm}
                      onCancel={() => setIsFormOpen(false)}
                    />
                  ) : (
                    <ChecklistForm 
                      vessel={activeVessel}
                      onSubmit={handleSubmitForm}
                      onCancel={() => setIsFormOpen(false)}
                    />
                  )}
                </React.Suspense>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Vessel Details Dialog */}
      {vesselDetailsOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setVesselDetailsOpen(false)}
        >
          <div 
            ref={detailsDialogRef}
            className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-200 animate-zoomIn"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Ship size={18} className="text-blue-400" />
                Vessel Details
                {selectedVesselDetails && (
                  <span className="text-sm text-gray-400 ml-1">
                    - {selectedVesselDetails.vessel_name}
                  </span>
                )}
              </h2>
              <button
                className="text-gray-400 hover:text-white focus:outline-none hover:bg-gray-800 p-1 rounded-full transition-colors"
                onClick={() => setVesselDetailsOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <VesselDetailsView />
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium mb-2 text-gray-300">Debug Info</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Total Vessels: {vessels.length}</p>
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
            <p>Saving States: {Object.keys(savingStates).length} active</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-400">Vessel Status Sample</summary>
              <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(
                  vessels.slice(0, 3).map(v => ({
                    name: v.vessel_name,
                    status: v.status, // Now logging the consolidated 'status'
                    // You can remove these if they are truly deprecated from backend response
                    // checklist_status: v.checklist_status,
                    // computed_checklist_status: v.computed_checklist_status,
                    // checklistStatus: v.checklistStatus
                  })), 
                  null, 
                  2
                )}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

// Add PropTypes for better component documentation and validation
ReportingDashboard.propTypes = {
  initialVessels: PropTypes.arrayOf(PropTypes.object),
  onFormSubmit: PropTypes.func,
  currentUser: PropTypes.object
};

ReportingDashboard.defaultProps = {
  initialVessels: [],
  onFormSubmit: () => {},
  currentUser: null
};

// Add these CSS animations if not already present
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-zoomIn {
    animation: zoomIn 0.2s ease-out forwards;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('reporting-dashboard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'reporting-dashboard-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ReportingDashboard;