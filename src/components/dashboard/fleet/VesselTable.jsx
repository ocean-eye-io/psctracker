// src/components/dashboard/fleet/VesselTable.jsx
import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import TrafficLightIndicator from '../../common/Table/TrafficLightIndicator';
import {
  Table,
  StatusIndicator,
  TableBadge,
  ExpandedItem,
  DropdownField
} from '../../common/Table';
import PortalDropdown from '../../common/Table/PortalDropdown';
import { TextTooltip, VesselDetailsTooltip } from '../../common/Table/Tooltip';
import CommentTooltip from '../../common/Table/CommentTooltip';

const VesselTable = ({ 
  vessels, 
  onOpenRemarks, 
  fieldMappings,
  onUpdateVessel
}) => {
  const tableRef = useRef(null);
  
  // Monitor window resize to adjust table layout
  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current) {
        // Add/remove classes based on viewport width
        const tableContainer = tableRef.current.querySelector('.data-table-container');
        if (tableContainer) {
          if (window.innerWidth < 768) {
            tableContainer.classList.add('mobile-view');
          } else {
            tableContainer.classList.remove('mobile-view');
          }
        }
      }
    };

    // Initial call
    handleResize();
    
    // Set up resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced format function that can handle both date and date+time
  const formatDateTime = (dateString, includeTime = false) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      if (includeTime) {
        // Format as "Month Day, Year, HH:MM"
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // Format as "Month Day, Year"
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return dateString; // Return original on error
    }
  };

  // Helper function to get status color based on vessel status
  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('at sea') || statusLower.includes('transit')) {
      return '#3498DB'; // Blue for at sea
    } else if (statusLower.includes('port') || statusLower.includes('berth')) {
      return '#2ECC71'; // Green for at port
    } else if (statusLower.includes('anchor')) {
      return '#F1C40F'; // Yellow for at anchor
    } else {
      return '#f4f4f4'; // Default
    }
  };

  // Helper function to get risk score color based on score value
  const getRiskScoreVariant = (score) => {
    if (!score && score !== 0) return 'info';
    if (score < 50) return 'success';
    if (score < 75) return 'warning';
    return 'danger';
  };

  // Function to normalize checklist value
  const normalizeChecklistValue = (value) => {
    if (value === null || value === undefined) {
      return "Pending";
    }
    
    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'Submitted' : 'Pending';
    }
    
    // Handle string values
    if (typeof value === 'string') {
      const validValues = ["Pending", "Acknowledged", "Submitted"];
      if (validValues.includes(value)) {
        return value;
      }
      
      // Convert older boolean string values
      if (value.toLowerCase() === 'true') {
        return 'Submitted';
      }
      if (value.toLowerCase() === 'false') {
        return 'Pending';
      }
    }
    
    // Default fallback
    return "Pending";
  };

  // Get vessel status 
  const getVesselStatus = (vessel) => {
    // Create an array to store all factors and their statuses
    const factors = [];
    let worstStatus = 'green'; // Start with best status and downgrade as needed
    
    // Function to update the worst status
    const updateWorstStatus = (status) => {
      if (status === 'red' || worstStatus === 'red') {
        worstStatus = 'red';
      } else if (status === 'yellow' || worstStatus === 'yellow') {
        worstStatus = 'yellow';
      }
      // If both are green, worst status remains green
    };
    
    // Check vessel age
    if (vessel.BUILT_DATE) {
      try {
        const builtDate = new Date(vessel.BUILT_DATE);
        if (!isNaN(builtDate.getTime())) {
          const currentDate = new Date();
          const ageInMs = currentDate - builtDate;
          const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
          const formattedAge = ageInYears.toFixed(1);
          
          let ageStatus;
          if (ageInYears < 5) {
            ageStatus = 'green';
          } else if (ageInYears >= 5 && ageInYears < 10) {
            ageStatus = 'yellow';
          } else {
            ageStatus = 'red';
          }
          
          updateWorstStatus(ageStatus);
          factors.push({
            name: 'Vessel Age',
            value: `${formattedAge} years`,
            status: ageStatus,
            detail: ageInYears < 5 ? 'Less than 5 years old' : 
                   ageInYears < 10 ? 'Between 5-10 years old' : 
                   'More than 10 years old'
          });
        }
      } catch (error) {
        console.error('Error calculating vessel age:', error);
      }
    }
    
    // Check PSC inspection date
    if (vessel.psc_last_inspection_date) {
      try {
        const inspectionDate = new Date(vessel.psc_last_inspection_date);
        if (!isNaN(inspectionDate.getTime())) {
          const currentDate = new Date();
          const monthsDiff = (currentDate - inspectionDate) / (1000 * 60 * 60 * 24 * 30.4375);
          const formattedDate = formatDateTime(vessel.psc_last_inspection_date, false);
          
          let inspectionStatus;
          if (monthsDiff <= 3) {
            inspectionStatus = 'green';
          } else if (monthsDiff <= 6) {
            inspectionStatus = 'yellow';
          } else {
            inspectionStatus = 'red';
          }
          
          updateWorstStatus(inspectionStatus);
          factors.push({
            name: 'PSC Inspection',
            value: formattedDate,
            status: inspectionStatus
          });
        }
      } catch (error) {
        console.error('Error checking PSC inspection date:', error);
      }
    }
    
    // Check AMSA inspection date
    if (vessel.amsa_last_inspection_date) {
      try {
        const inspectionDate = new Date(vessel.amsa_last_inspection_date);
        if (!isNaN(inspectionDate.getTime())) {
          const currentDate = new Date();
          const monthsDiff = (currentDate - inspectionDate) / (1000 * 60 * 60 * 24 * 30.4375);
          const formattedDate = formatDateTime(vessel.amsa_last_inspection_date, false);
          
          let inspectionStatus;
          if (monthsDiff <= 3) {
            inspectionStatus = 'green';
          } else if (monthsDiff <= 6) {
            inspectionStatus = 'yellow';
          } else {
            inspectionStatus = 'red';
          }
          
          updateWorstStatus(inspectionStatus);
          factors.push({
            name: 'AMSA Inspection',
            value: formattedDate,
            status: inspectionStatus
          });
        }
      } catch (error) {
        console.error('Error checking AMSA inspection date:', error);
      }
    }
    
    // Add checklist status
    if (vessel.checklist_received !== undefined) {
      const checklistStatus = normalizeChecklistValue(vessel.checklist_received);
      let status;
      
      if (checklistStatus === 'Submitted') {
        status = 'green';
      } else if (checklistStatus === 'Acknowledged') {
        status = vessel.days_to_go < 7 ? 'yellow' : 'green';
      } else { // 'Pending'
        status = vessel.days_to_go < 3 ? 'red' : 'yellow';
      }
      
      updateWorstStatus(status);
      factors.push({
        name: 'Checklist',
        value: checklistStatus,
        status: status
      });
    }
    
    // If no factors were evaluated, use grey as default
    if (factors.length === 0) {
      return {
        status: 'grey',
        tooltip: 'Status not determined',
        factors: []
      };
    }
    
    return {
      status: worstStatus,
      tooltip: 'Multiple factors affect this status',
      factors: factors
    };
  };
 
  // Function to determine whether a column should be hidden on mobile
  const shouldHideColumnOnMobile = (fieldId) => {
    // Define which columns to hide on mobile
    const mobileHiddenColumns = [
      'riskScore', 
      'amsa_last_inspection_date',
      'psc_last_inspection_date',
      'dwt'
      // Add more fields to hide on mobile as needed
    ];
    
    return mobileHiddenColumns.includes(fieldId);
  };

  // Convert field mappings to table columns format
  const getTableColumns = () => {
    return Object.entries(fieldMappings.TABLE)
      .filter(([fieldId, field]) => !field.isAction && fieldId !== 'comments')
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([fieldId, field]) => ({
        field: field.dbField,
        label: field.label,
        width: field.width,
        minWidth: field.minWidth,
        // Add a class to hide columns on mobile
        cellClassName: shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : '',
        headerClassName: shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : '',
        render: (value, rowData) => {
          // Special rendering for event_type (status)
          if (fieldId === 'event_type') {
            return (
              <StatusIndicator 
                status={value}
                color={getStatusColor(value)}
              />
            );
          }
          
          // Special rendering for vessel_name with traffic light
          if (fieldId === 'vessel_name') {
            const statusInfo = getVesselStatus(rowData);
            
            return (
              <div className="vessel-name-with-status">
                <TrafficLightIndicator 
                  status={statusInfo.status} 
                  tooltipData={statusInfo}
                />
                <VesselDetailsTooltip vessel={rowData}>
                  <span className="vessel-name">{(value || '-').toUpperCase()}</span>
                </VesselDetailsTooltip>
              </div>
            );
          }
          
          if (fieldId === 'owner') {
            return (
              <TextTooltip text={value || '-'}>
                <span>{(value || '-').toUpperCase()}</span>
              </TextTooltip>
            );
          }
           
          // Special rendering for risk score
          if (fieldId === 'riskScore') {
            const score = value !== null && value !== undefined ? Math.round(value) : null;
            return (
              <TableBadge 
                variant={getRiskScoreVariant(score)}
              >
                {score !== null ? score : '-'}
              </TableBadge>
            );
          }
          
          // Special rendering for date fields
          if (field.type === 'date') {
            const formattedValue = formatDateTime(value, false);
            return (
              <TextTooltip text={formattedValue}>
                {formattedValue}
              </TextTooltip>
            );
          }
          
          if (fieldId === 'arrival_country') {
            let displayValue = value;
            
            // Convert country codes to full names
            if (value === 'AU' || value === 'au') {
              displayValue = 'AUSTRALIA';
            } else if (value === 'NZ' || value === 'nz') {
              displayValue = 'NEW ZEALAND';
            } else if (displayValue) {
              // Make everything caps for other countries
              displayValue = displayValue.toUpperCase();
            }
            
            return (
              <TextTooltip text={displayValue || '-'}>
                <span>{displayValue || '-'}</span>
              </TextTooltip>
            );
          }  

          // Special rendering for date-time fields
          if (
            fieldId === 'eta' || 
            fieldId === 'etb' || 
            fieldId === 'etd' || 
            fieldId === 'atd' ||
            fieldId === 'psc_last_inspection_date'
          ) {
            const formattedValue = formatDateTime(value, true);
            return (
              <TextTooltip text={formattedValue}>
                {formattedValue}
              </TextTooltip>
            );
          }
  
          if (fieldId === 'checklist_received') {
            const normalizedValue = normalizeChecklistValue(value);
            
            return (
              <DropdownField 
                value={normalizedValue}
                vessel={rowData}
                onUpdate={onUpdateVessel}
                field="checklist_received"
                options={["Pending", "Acknowledged", "Submitted"]}
                className={shouldHideColumnOnMobile(fieldId) ? 'mobile-hide' : ''}
              />
            );
          }
          
          
          // Special rendering for SANZ field
          if (fieldId === 'sanz') {
            return (
              <DropdownField 
                value={value || ""}
                vessel={rowData}
                onUpdate={onUpdateVessel}
                field="sanz"
                options={["Select...", "Rohit Banta", "John Willis", "Prakash Rebala", "Others"]}
                className="sanz-dropdown"
                allowCustomInput={true}
              />
            );
          }
          
          // Special rendering for days to go
          if (fieldId === 'daysToGo' && typeof value === 'number') {
            const formattedValue = value.toFixed(1);
            return (
              <TextTooltip text={formattedValue}>
                {formattedValue}
              </TextTooltip>
            );
          }
          
          // Default rendering for text content
          if (value !== null && value !== undefined && value !== '-') {
            const stringValue = String(value);
            return (
              <TextTooltip text={stringValue}>
                {stringValue}
              </TextTooltip>
            );
          }
          
          // Fallback for null/undefined values
          return '-';
        }
      }));
  };

  // Create expanded content renderer
  const renderExpandedContent = (vessel) => {
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority);
      
    return (
      <div className="expanded-grid">
        {expandedColumns.map(([fieldId, field]) => {
          let value = vessel[field.dbField];
          let displayLabel = field.label;
          if (fieldId === 'departure_port' && field.combineWithCountry) {
            const port = value || '-';
            const country = vessel.departure_country || '';
            
            // Combine them into a single display value
            if (country) {
              // Format country code if needed
              let formattedCountry = country;
              if (country === 'AU' || country === 'au') {
                formattedCountry = 'AUSTRALIA';
              } else if (country === 'NZ' || country === 'nz') {
                formattedCountry = 'NEW ZEALAND';
              } else if (formattedCountry) {
                formattedCountry = formattedCountry.toUpperCase();
              }
              
              // Combine port and country
              value = `${port}, ${formattedCountry}`;
            }
          }  

          // Format date values in expanded panel
          if (field.type === 'date') {
            value = formatDateTime(value, false);
          } else if (
            fieldId === 'etd' || 
            fieldId === 'atd'
          ) {
            value = formatDateTime(value, true);
          }
          
          // If value is a string and not empty, wrap it in a tooltip
          const displayValue = (value !== null && value !== undefined && value !== '-') 
            ? (
                <TextTooltip text={String(value)}>
                  {value}
                </TextTooltip>
              ) 
            : value;
          
          return (
            <ExpandedItem
              key={fieldId}
              label={field.label}
              value={displayValue || '-'}
            />
          );
        })}
      </div>
    );
  };

  // Improved comments column
  const commentsColumn = {
    label: 'Comments',
    width: '180px',
    className: 'comments-column',
    content: (vessel) => {
      const hasComments = vessel.comments && vessel.comments.trim().length > 0;
      
      return (
        <div className="comment-cell">
          <CommentTooltip 
            comment={vessel.comments || ""} 
            onEditClick={() => onOpenRemarks(vessel)}
          >
            <div 
              className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
            >
              <div className="comment-icon">
                <MessageSquare size={16} />
              </div>
              
              {hasComments ? (
                <div className="comment-preview-text">
                  {vessel.comments.length > 28 
                    ? `${vessel.comments.substring(0, 28)}...` 
                    : vessel.comments}
                </div>
              ) : (
                <div className="comment-add-text">Add comment</div>
              )}
            </div>
          </CommentTooltip>
        </div>
      );
    }
  };

  return (
    <div ref={tableRef} className="responsive-table-container">
      <Table
        data={vessels}
        columns={getTableColumns()}
        expandedContent={renderExpandedContent}
        actions={commentsColumn}
        uniqueIdField="uniqueKey" // Use the uniqueKey property instead of imo_no
        defaultSortKey="eta"
        defaultSortDirection="desc"
        className="vessel-data-table"
      />
    </div>
  );
};

export default VesselTable;