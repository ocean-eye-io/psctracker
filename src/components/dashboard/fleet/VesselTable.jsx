// src/components/dashboard/fleet/VesselTable.jsx
import React from 'react';
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

const VesselTable = ({ 
  vessels, 
  onOpenRemarks, 
  fieldMappings,
  onUpdateVessel
}) => {

  
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
  // In your VesselTable.jsx where the getVesselStatus function is defined
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
            // detail: monthsDiff <= 3 ? 'Less than 3 months ago' : 
            //        monthsDiff <= 6 ? 'Between 3-6 months ago' : 
            //        'More than 6 months ago'
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
            name: 'AMSA Inspection',
            value: formattedDate,
            status: inspectionStatus
            // detail: monthsDiff <= 3 ? 'Less than 3 months ago' : 
            //        monthsDiff <= 6 ? 'Between 3-6 months ago' : 
            //        'More than 6 months ago'
          });
        }
      } catch (error) {
        console.error('Error checking AMSA inspection date:', error);
      }
    }
    
    // Add checklist status
    if (vessel.checklist_received) {
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
        // detail: status === 'red' ? 'Pending with arrival < 3 days' :
        //         status === 'yellow' ? 'Needs attention' : 'Completed'
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
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <TrafficLightIndicator 
                  status={statusInfo.status} 
                  tooltipData={statusInfo}
                />
                <VesselDetailsTooltip vessel={rowData}>
                  <span>{value || '-'}</span>
                </VesselDetailsTooltip>
              </div>
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

  const commentsColumn = {
    label: 'Comments',
    width: '180px',
    content: (vessel) => {
      const hasComments = vessel.comments && vessel.comments.trim().length > 0;
      
      return (
        <div className="comment-cell">
          <div 
            className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
            onClick={() => onOpenRemarks(vessel)}
          >
            <div className="comment-icon">
              <MessageSquare size={16} />
            </div>
            
            {hasComments ? (
              <div className="comment-preview-text">
                {vessel.comments.length > 38 
                  ? `${vessel.comments.substring(0, 38)}...` 
                  : vessel.comments}
              </div>
            ) : (
              <div className="comment-add-text">Add comment</div>
            )}

            {/* Tooltip moved inside the indicator */}
            {hasComments && (
              <div className="comment-tooltip">
                <div className="comment-tooltip-content">
                  <div className="tooltip-header">
                    <span>Comment</span>
                    <button 
                      className="tooltip-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRemarks(vessel);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="tooltip-body">
                    {vessel.comments}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <Table
      data={vessels}
      columns={getTableColumns()}
      expandedContent={renderExpandedContent}
      actions={commentsColumn}
      uniqueIdField="uniqueKey" // Use the uniqueKey property instead of imo_no
      defaultSortKey="eta"
      defaultSortDirection="desc"
    />
  );
};

export default VesselTable;