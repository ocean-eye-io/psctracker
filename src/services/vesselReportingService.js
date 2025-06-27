// src/services/vesselReportingService.js

class VesselReportingService {
    constructor() {
      this.BASE_API_URL = 'https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws';
      this.VESSELS_WITH_OVERRIDES_API_URL = `${this.BASE_API_URL}/api/vessels-with-overrides`;
      this.USER_VESSELS_API_URL = `${this.BASE_API_URL}/api/user-vessels`; // Adjust endpoint as needed
    }
  
    /**
     * Get all vessels with overrides (main data source)
     */
    async getAllVessels() {
      try {
        console.log('VesselReportingService: Fetching all vessels');
        const response = await fetch(this.VESSELS_WITH_OVERRIDES_API_URL);
  
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
  
        const data = await response.json();
        console.log('VesselReportingService: Successfully fetched vessels:', data.length);
        
        return data;
      } catch (error) {
        console.error('VesselReportingService: Error fetching vessels:', error);
        throw new Error(`Failed to fetch vessels: ${error.message}`);
      }
    }
  
    /**
     * Get user's assigned vessels (similar to defects service pattern)
     * @param {string} userId - The user ID
     */
    async getUserAssignedVessels(userId) {
      if (!userId) {
        console.warn('VesselReportingService: No user ID provided for assigned vessels');
        return [];
      }
  
      try {
        console.log('VesselReportingService: Fetching assigned vessels for user:', userId);
        
        // For now, this might need to be implemented based on your backend
        // You can either:
        // 1. Have a separate endpoint for user-vessel assignments
        // 2. Filter from the main vessels data based on user assignments
        // 3. Use a user profile endpoint that includes vessel assignments
        
        const response = await fetch(`${this.USER_VESSELS_API_URL}/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add any required auth headers here
          },
        });
  
        if (!response.ok) {
          // If the endpoint doesn't exist yet, return empty array for now
          if (response.status === 404) {
            console.log('VesselReportingService: User vessels endpoint not found, returning empty assignments');
            return [];
          }
          throw new Error(`Failed to fetch user vessels: ${response.status}`);
        }
  
        const assignedVessels = await response.json();
        console.log('VesselReportingService: Successfully fetched assigned vessels:', assignedVessels.length);
        
        return assignedVessels;
      } catch (error) {
        console.error('VesselReportingService: Error fetching user assigned vessels:', error);
        // For development, return empty array instead of throwing
        console.log('VesselReportingService: Returning empty vessel assignments due to error');
        return [];
      }
    }
  
    /**
     * Process and filter vessels data for reporting
     * @param {Array} vessels - Raw vessels data
     * @param {string} userId - User ID for filtering
     * @param {Array} userAssignments - User's vessel assignments (IMO numbers)
     */
    processVesselsForReporting(vessels, userId, userAssignments = []) {
      console.log('VesselReportingService: Processing vessels for reporting');
      console.log('VesselReportingService: Input - vessels:', vessels.length, 'assignments:', userAssignments.length);
  
      // Helper function for date parsing
      const parseDate = (dateString) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          return !isNaN(date.getTime()) ? date : null;
        } catch (e) {
          return null;
        }
      };
  
      // Function to determine checklist status
      const getChecklistStatus = (vessel) => {
        if (vessel.checklist_received) {
          const checklistValue = this.normalizeChecklistValue(vessel.checklist_received);
          if (checklistValue === 'Submitted') return 'completed';
          if (checklistValue === 'Acknowledged') return 'in_progress';
          return 'pending';
        }
        return 'not_started';
      };
  
      // Filter vessels with valid data
      const vesselsWithValidData = vessels.filter(vessel => {
        const imoNo = vessel.imo_no;
        const vesselName = vessel.vessel_name;
  
        return imoNo &&
          imoNo !== "-" &&
          Number.isInteger(Number(imoNo)) &&
          !String(imoNo).includes('.') &&
          vesselName &&
          vesselName !== "-";
      });
  
      console.log('VesselReportingService: Vessels with valid data:', vesselsWithValidData.length);
  
      // Filter by user assignments if provided
      const userVessels = (userAssignments.length > 0) 
        ? vesselsWithValidData.filter(vessel => 
            userAssignments.includes(vessel.imo_no.toString()))
        : vesselsWithValidData; // Show all if no assignments (for testing)
  
      console.log('VesselReportingService: User filtered vessels:', userVessels.length);
  
      // Find the latest rds_load_date
      const allLoadDates = userVessels
        .map(v => parseDate(v.rds_load_date))
        .filter(date => date !== null);
  
      const latestLoadDate = allLoadDates.length ?
        new Date(Math.max(...allLoadDates.map(d => d.getTime()))) : null;
  
      // Calculate the date 2 months ago for report_date filtering
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
      // Active vessels processing
      const activeVessels = latestLoadDate ?
        userVessels.filter(vessel => {
          const isActive = vessel.status === "Active" &&
            vessel.rds_load_date &&
            new Date(vessel.rds_load_date).getTime() === latestLoadDate.getTime();
  
          let hasRecentReport = false;
          if (vessel.report_date) {
            const reportDate = parseDate(vessel.report_date);
            if (reportDate) {
              hasRecentReport = reportDate >= twoMonthsAgo;
            }
          }
  
          return isActive && hasRecentReport;
        }) : [];
  
      // Inactive vessels: all with status="Inactive"
      const inactiveVessels = userVessels.filter(vessel => vessel.status === "Inactive");
  
      console.log('VesselReportingService: Active vessels:', activeVessels.length);
      console.log('VesselReportingService: Inactive vessels:', inactiveVessels.length);
  
      // Enhance vessel data with calculated fields
      const enhanceVessel = (vessel, isActive = true) => {
        const etaDate = parseDate(vessel.eta);
  
        let days_to_go = 0;
        if (etaDate) {
          const currentDate = new Date();
          const timeDiff = etaDate.getTime() - currentDate.getTime();
          days_to_go = Math.max(0, Math.round(timeDiff / (1000 * 3600 * 24) * 10) / 10);
        }
  
        const checklistStatus = getChecklistStatus(vessel);
        
        return {
          ...vessel,
          etaDate,
          days_to_go,
          uniqueKey: `vessel-${vessel.imo_no}-${vessel.id}`,
          checklistStatus,
          isReportingReady: checklistStatus !== 'not_started',
          isActiveVessel: isActive
        };
      };
  
      // Process both active and inactive vessels
      const enhancedActiveVessels = activeVessels.map(v => enhanceVessel(v, true));
      const enhancedInactiveVessels = inactiveVessels.map(v => enhanceVessel(v, false));
  
      const processedData = {
        activeVessels: enhancedActiveVessels,
        inactiveVessels: enhancedInactiveVessels,
        allVessels: [...enhancedActiveVessels, ...enhancedInactiveVessels]
      };
  
      console.log('VesselReportingService: Processing complete. Total processed vessels:', processedData.allVessels.length);
      return processedData;
    }
  
    /**
     * Normalize checklist value for consistent status determination
     * @param {*} value - The checklist value to normalize
     */
    normalizeChecklistValue(value) {
      if (value === null || value === undefined) return "Pending";
      if (typeof value === 'boolean') return value ? 'Submitted' : 'Pending';
      if (typeof value === 'string') {
        const validValues = ["Pending", "Acknowledged", "Submitted"];
        if (validValues.includes(value)) return value;
        if (value.toLowerCase() === 'true') return 'Submitted';
        if (value.toLowerCase() === 'false') return 'Pending';
      }
      return "Pending";
    }
  
    /**
     * Get vessels data with user filtering applied
     * @param {string} userId - User ID
     */
    async getVesselsForUser(userId) {
      try {
        console.log('VesselReportingService: Getting vessels for user:', userId);
        
        // Fetch all vessels and user assignments in parallel
        const [vesselsData, userAssignments] = await Promise.all([
          this.getAllVessels(),
          this.getUserAssignedVessels(userId)
        ]);
  
        // Extract IMO numbers from user assignments
        const assignedIMOs = userAssignments.map(assignment => 
          assignment.imo_no || assignment.vessel_imo || assignment
        ).filter(Boolean);
  
        console.log('VesselReportingService: User has', assignedIMOs.length, 'vessel assignments');
  
        // Process and filter vessels
        const processedData = this.processVesselsForReporting(vesselsData, userId, assignedIMOs);
        
        return {
          ...processedData,
          userAssignments: assignedIMOs,
          totalAvailableVessels: vesselsData.length
        };
      } catch (error) {
        console.error('VesselReportingService: Error getting vessels for user:', error);
        throw error;
      }
    }
  
    /**
     * Update vessel checklist status
     * @param {string} vesselId - Vessel ID
     * @param {string} checklistStatus - New checklist status
     * @param {string} userId - User ID making the update
     */
    async updateChecklistStatus(vesselId, checklistStatus, userId) {
      try {
        console.log('VesselReportingService: Updating checklist status for vessel:', vesselId);
        
        const response = await fetch(`${this.BASE_API_URL}/api/vessels/${vesselId}/checklist`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checklist_status: checklistStatus,
            updated_by: userId,
            updated_at: new Date().toISOString()
          }),
        });
  
        if (!response.ok) {
          throw new Error(`Failed to update checklist status: ${response.status}`);
        }
  
        const result = await response.json();
        console.log('VesselReportingService: Checklist status updated successfully');
        
        return result;
      } catch (error) {
        console.error('VesselReportingService: Error updating checklist status:', error);
        throw error;
      }
    }
  
    /**
     * Get vessel checklist details
     * @param {string} vesselId - Vessel ID
     */
    async getVesselChecklist(vesselId) {
      try {
        console.log('VesselReportingService: Fetching checklist for vessel:', vesselId);
        
        const response = await fetch(`${this.BASE_API_URL}/api/vessels/${vesselId}/checklist`);
  
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No checklist found
          }
          throw new Error(`Failed to fetch vessel checklist: ${response.status}`);
        }
  
        const checklist = await response.json();
        console.log('VesselReportingService: Successfully fetched vessel checklist');
        
        return checklist;
      } catch (error) {
        console.error('VesselReportingService: Error fetching vessel checklist:', error);
        throw error;
      }
    }
  
    /**
     * Export vessel data to CSV format
     * @param {Array} vessels - Vessels to export
     * @param {Object} fieldMappings - Field mappings for columns
     */
    exportToCsv(vessels, fieldMappings) {
      try {
        console.log('VesselReportingService: Exporting', vessels.length, 'vessels to CSV');
        
        // Get visible columns
        const visibleColumns = Object.entries(fieldMappings.TABLE)
          .filter(([_, field]) => !field.isAction)
          .sort((a, b) => a[1].priority - b[1].priority);
        
        // Create CSV header
        const header = visibleColumns.map(([_, field]) => field.label).join(',');
        
        // Create CSV rows
        const rows = vessels.map(vessel => {
          return visibleColumns.map(([_, field]) => {
            const value = vessel[field.dbField];
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
        link.setAttribute('download', `vessel_reporting_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('VesselReportingService: CSV export completed successfully');
        return true;
      } catch (error) {
        console.error('VesselReportingService: Error exporting to CSV:', error);
        throw new Error(`Failed to export data: ${error.message}`);
      }
    }
  
    /**
     * Get vessel reporting statistics
     * @param {Array} vessels - Vessels array
     */
    getReportingStats(vessels) {
      const stats = {
        total: vessels.length,
        active: vessels.filter(v => v.isActiveVessel).length,
        inactive: vessels.filter(v => !v.isActiveVessel).length,
        overdue: vessels.filter(v => {
          const etaDate = v.user_eta || v.eta;
          return etaDate && new Date(etaDate) < new Date();
        }).length,
        checklistStats: {
          completed: vessels.filter(v => v.checklistStatus === 'completed').length,
          in_progress: vessels.filter(v => v.checklistStatus === 'in_progress').length,
          pending: vessels.filter(v => v.checklistStatus === 'pending').length,
          not_started: vessels.filter(v => v.checklistStatus === 'not_started').length
        },
        urgentVessels: vessels.filter(v => {
          const etaDate = v.user_eta || v.eta;
          if (!etaDate) return false;
          const eta = new Date(etaDate);
          const now = new Date();
          const diffHours = (eta.getTime() - now.getTime()) / (1000 * 60 * 60);
          return diffHours > 0 && diffHours <= 24; // Within 24 hours
        }).length
      };
  
      console.log('VesselReportingService: Generated reporting stats:', stats);
      return stats;
    }
  }
  
  // Create and export a singleton instance
  const vesselReportingService = new VesselReportingService();
  export default vesselReportingService;