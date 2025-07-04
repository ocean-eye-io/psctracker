import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare
} from 'lucide-react';
import TrafficLightIndicator from '../../common/Table/TrafficLightIndicator';
import {
  Table,
  StatusIndicator,
  TableBadge,
  ExpandedItem
} from '../../common/Table';
import { TextTooltip, VesselDetailsTooltip } from '../../common/Table/Tooltip';
import CommentTooltip from '../../common/Table/CommentTooltip';
import EditableField from '../../common/EditableField/EditableField';
import PortDocumentIcon from '../../common/Table/PortDocumentIcon';
import DocumentModal from '../../common/DocumentModal/DocumentModal';
import ChecklistStatusBadge from './ChecklistStatusBadge'; // Import the simplified component
import portMappingService from '../../../services/PortMappingService';
import PropTypes from 'prop-types';

const VesselReportingTable = ({ 
  vessels, 
  fieldMappings, 
  loading, 
  onOpenChecklist,
  onUpdateVessel,
  onUpdateOverride,
  onOpenRemarks,
  savingStates = {},
  currentUser
}) => {
  const tableRef = useRef(null);
  
  // State for document modal
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedPortId, setSelectedPortId] = useState(null);
  const [selectedPortName, setSelectedPortName] = useState('');
  const [selectedPortDocumentCount, setSelectedPortDocumentCount] = useState(0);
  
  // State for enriched vessel data with port information
  const [enrichedVessels, setEnrichedVessels] = useState([]);
  const [vesselEnrichmentLoading, setVesselEnrichmentLoading] = useState(true);
  
  // State to track window size for responsive design
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Helper function to check if a date is in the past
  const isDateInPast = useCallback((dateString) => {
    if (!dateString) return false;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      return date < today;
    } catch (error) {
      return false;
    }
  }, []);

  // Helper function to get days overdue
  const getDaysOverdue = useCallback((dateString) => {
    if (!dateString) return 0;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      const diffTime = today - date;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      return 0;
    }
  }, []);

  // Document modal handlers
  const handleOpenDocuments = useCallback((portId, portName, documentCount) => {
    setSelectedPortId(portId);
    setSelectedPortName(portName);
    setSelectedPortDocumentCount(documentCount);
    setDocumentModalOpen(true);
  }, []);

  const handleCloseDocuments = useCallback(() => {
    setDocumentModalOpen(false);
    setSelectedPortId(null);
    setSelectedPortName('');
    setSelectedPortDocumentCount(0);
  }, []);

  // Monitor window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      if (tableRef.current) {
        const tableContainer = tableRef.current.querySelector('.data-table-container');
        if (tableContainer) {
          if (width < 768) {
            tableContainer.classList.add('mobile-view');
          } else {
            tableContainer.classList.remove('mobile-view');
          }
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enrich vessel data with port information
  useEffect(() => {
    const enrichVesselData = async () => {
      try {
        setVesselEnrichmentLoading(true);
        const enriched = await portMappingService.enrichVesselData(vessels);
        setEnrichedVessels(enriched);
      } catch (error) {
        console.error('Error enriching vessel data:', error);
        setEnrichedVessels(vessels);
      } finally {
        setVesselEnrichmentLoading(false);
      }
    };

    if (vessels.length > 0) {
      enrichVesselData();
    } else {
      setEnrichedVessels([]);
      setVesselEnrichmentLoading(false);
    }
  }, [vessels]);

  // Use enriched vessels for display
  const vesselsToDisplay = enrichedVessels.length > 0 ? enrichedVessels : vessels;

  // Helper functions for formatting and status
  const formatDateTime = (dateString, includeTime = false) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      if (includeTime) {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return '#f4f4f4';

    if (status === "At Sea") {
      return '#3498DB';
    } else if (status === "At Port") {
      return '#2ECC71';
    } else if (status === "At Anchor") {
      return '#F1C40F';
    } else {
      return '#f4f4f4';
    }
  };

  const normalizeChecklistValue = (value) => {
    if (value === null || value === undefined) {
      return "Pending";
    }

    if (typeof value === 'boolean') {
      return value ? 'Submitted' : 'Pending';
    }

    if (typeof value === 'string') {
      const validValues = ["Pending", "Acknowledged", "Submitted"];
      if (validValues.includes(value)) {
        return value;
      }

      if (value.toLowerCase() === 'true') {
        return 'Submitted';
      }
      if (value.toLowerCase() === 'false') {
        return 'Pending';
      }
    }

    return "Pending";
  };

  const getChecklistStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle size={16} />,
          label: 'Completed',
          variant: 'success',
          color: '#2ECC71'
        };
      case 'in_progress':
        return {
          icon: <Clock size={16} />,
          label: 'In Progress',
          variant: 'warning',
          color: '#F39C12'
        };
      case 'pending':
        return {
          icon: <AlertTriangle size={16} />,
          label: 'Pending',
          variant: 'warning',
          color: '#F1C40F'
        };
      case 'not_started':
        return {
          icon: <XCircle size={16} />,
          label: 'Not Started',
          variant: 'danger',
          color: '#E74C3C'
        };
      default:
        return {
          icon: <XCircle size={16} />,
          label: 'Unknown',
          variant: 'info',
          color: '#95A5A6'
        };
    }
  };

  // Get vessel status - SAME AS VESSELTABLE
  const getVesselStatus = useCallback((vessel) => {
    const factors = [];
    let worstStatus = 'green';

    const updateWorstStatus = (status) => {
      if (status === 'red' || worstStatus === 'red') {
        worstStatus = 'red';
      } else if (status === 'yellow' || worstStatus === 'yellow') {
        worstStatus = 'yellow';
      }
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

      if (checklistStatus === 'Acknowledged') {
        status = 'green';
      } else if (checklistStatus === 'Submitted') {
        status = 'yellow';
      } else { // 'Pending'
        status = 'red';
      }

      updateWorstStatus(status);
      factors.push({
        name: 'Checklist',
        value: checklistStatus,
        status: status
      });
    }

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
  }, [formatDateTime, normalizeChecklistValue]);

  // Function to determine which columns should be hidden on different screen sizes
  const shouldHideColumn = (fieldId) => {
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    const isSmallDesktop = windowWidth >= 1024 && windowWidth < 1280;

    if (isMobile) {
      return ['riskScore', 'amsa_last_inspection_date', 'psc_last_inspection_date', 'dwt', 'arrival_country'].includes(fieldId);
    }

    if (isTablet) {
      return ['amsa_last_inspection_date', 'psc_last_inspection_date'].includes(fieldId);
    }

    if (isSmallDesktop) {
      return ['psc_last_inspection_date'].includes(fieldId);
    }

    return false;
  };

  // Convert field mappings to table columns
  const getTableColumns = useCallback(() => {
    // Filter out action columns, PIC column, comments column, AND checklistStatus
    const columnsData = Object.entries(fieldMappings.TABLE)
      .filter(([fieldId, field]) => 
        !field.isAction && 
        fieldId !== 'comments' && 
        fieldId !== 'pic' &&
        fieldId !== 'imo' && 
        fieldId !== 'owner' &&
        fieldId !== 'checklistStatus' // REMOVE THE OLD CHECKLIST COLUMN
      )
      .sort((a, b) => a[1].priority - b[1].priority);

    // Create the base columns
    const baseColumns = columnsData.map(([fieldId, field]) => {
      // Responsive column widths
      let columnWidth = field.width;

      if (windowWidth < 768) {
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '140px';
            break;
          case 'event_type':
            columnWidth = '80px';
            break;
          case 'arrival_port':
          case 'eta':
          case 'etb':
            columnWidth = '100px';
            break;
          default:
            break;
        }
      } else if (windowWidth >= 768 && windowWidth < 1024) {
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '160px';
            break;
          case 'event_type':
            columnWidth = '110px';
            break;
          case 'arrival_port':
            columnWidth = '120px';
            break;
          case 'arrival_country':
            columnWidth = '100px';
            break;
          case 'eta':
          case 'etb':
            columnWidth = '110px';
            break;
          default:
            break;
        }
      } else if (windowWidth >= 1024 && windowWidth < 1280) {
        switch (fieldId) {
          case 'vessel_name':
            columnWidth = '180px';
            break;
          default:
            break;
        }
      }

      const column = {
        field: field.dbField,
        label: field.label,
        width: columnWidth,
        minWidth: field.minWidth || (windowWidth < 768 ? '60px' : '80px'),
        cellClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
        headerClassName: shouldHideColumn(fieldId) ? 'hidden-column' : '',
        sortable: true
      };

      // Define cell renderer based on field type
      column.render = (value, rowData) => {
        const originalValue = rowData[field.dbField];
        let displayValue = originalValue;
        let hasOverride = false;
        let isInvalidDate = false;
        let validationMessage = '';

        // Check for user overrides for ETA, ETB, ETD
        if (fieldId === 'eta') {
          if (rowData.user_eta !== null && rowData.user_eta !== undefined) {
            displayValue = rowData.user_eta;
            hasOverride = true;
          }
        } else if (fieldId === 'etb') {
          if (rowData.user_etb !== null && rowData.user_etb !== undefined) {
            displayValue = rowData.user_etb;
            hasOverride = true;
          }
        } else if (fieldId === 'etd') {
          if (rowData.user_etd !== null && rowData.user_etd !== undefined) {
            displayValue = rowData.user_etd;
            hasOverride = true;
          }
        }

        // Editable date fields
        if (['eta', 'etb', 'etd'].includes(fieldId)) {
          // Validation for ETB vs ETA
          if (fieldId === 'etb') {
            const etbDate = displayValue ? new Date(displayValue) : null;
            const etaValueForComparison = rowData.user_eta !== null && rowData.user_eta !== undefined ? rowData.user_eta : rowData.eta;
            const etaDate = etaValueForComparison ? new Date(etaValueForComparison) : null;

            if (etbDate && etaDate && etbDate.getTime() < etaDate.getTime()) {
              isInvalidDate = true;
              validationMessage = `ETB cannot be before ETA. ETA is ${formatDateTime(etaValueForComparison, true)}`;
            }
          }

          // Check if ETA is in the past
          if (fieldId === 'eta') {
            const isPastEta = isDateInPast(displayValue);
            if (isPastEta && !isInvalidDate) {
              const daysOverdue = getDaysOverdue(displayValue);
              isInvalidDate = true;
              validationMessage = `ETA is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
            }
          }

          return (
            <EditableField
              value={displayValue}
              originalValue={originalValue}
              onSave={(newValue) => onUpdateOverride && onUpdateOverride(rowData.id, field.dbField, newValue)}
              onResetToOriginal={() => onUpdateOverride && onUpdateOverride(rowData.id, field.dbField, null)}
              type="datetime-local"
              placeholder="N/A"
              isSaving={savingStates[`${rowData.id}-${field.dbField}`]}
              hasOverride={hasOverride}
              isInvalidDate={isInvalidDate}
              validationMessage={validationMessage}
            />
          );
        }

        // Vessel name with traffic light
        if (fieldId === 'vessel_name') {
          const statusInfo = getVesselStatus(rowData);

          const vesselDetails = {
            ...rowData,
            tooltipDetails: [
              { label: 'IMO', value: rowData.imo_no || '-' },
              { label: 'Owner', value: rowData.owner || '-' },
              { label: 'Built', value: rowData.BUILT_DATE ? formatDateTime(rowData.BUILT_DATE, false) : '-' },
              { label: 'Flag', value: rowData.flag || '-' }
            ]
          };

          return (
            <div className="vessel-name-cell">
              <TrafficLightIndicator
                status={statusInfo.status}
                tooltipData={statusInfo}
              />
              <VesselDetailsTooltip vessel={vesselDetails}>
                <span className="vessel-name">{(value || '-').toUpperCase()}</span>
              </VesselDetailsTooltip>
            </div>
          );
        }

        // Status column
        if (fieldId === 'event_type') {
          return (
            <div className="status-cell">
              <StatusIndicator
                status={value}
                color={getStatusColor(value)}
              />
              <TextTooltip text={value || '-'}>
                <span className="status-text">{value || '-'}</span>
              </TextTooltip>
            </div>
          );
        }

        // Arrival port
        if (fieldId === 'arrival_port') {
          const upperCaseValue = (value || '-').toUpperCase();

          return (
            <div className="arrival-port-cell">
              <TextTooltip text={upperCaseValue}>
                <span className="arrival-port">{upperCaseValue}</span>
              </TextTooltip>

              {/* Add document icon if port has documents */}
              {value && (
                <PortDocumentIcon
                  portName={value}
                  onOpenDocuments={handleOpenDocuments}
                  size={16}
                  className="port-doc-icon"
                />
              )}
            </div>
          );
        }

        // Arrival country
        if (fieldId === 'arrival_country') {
          let displayValue = value;

          if (value === 'AU' || value === 'au') {
            displayValue = 'AUSTRALIA';
          } else if (value === 'NZ' || value === 'nz') {
            displayValue = 'NEW ZEALAND';
          } else if (displayValue) {
            displayValue = displayValue.toUpperCase();
          }

          return (
            <TextTooltip text={displayValue || '-'}>
              <span>{displayValue || '-'}</span>
            </TextTooltip>
          );
        }

        // REMOVED: checklistStatus rendering - now handled by actions column with ChecklistStatusBadge

        // Date fields (non-editable)
        if (field.type === 'date' && !['eta', 'etb', 'etd'].includes(fieldId)) {
          const formattedValue = formatDateTime(value, false);
          return (
            <TextTooltip text={formattedValue}>
              <span className="date-cell">{formattedValue}</span>
            </TextTooltip>
          );
        }

        // Date-time fields
        if ((fieldId === 'atd' || fieldId === 'psc_last_inspection_date') && !['eta', 'etb', 'etd'].includes(fieldId)) {
          const formattedValue = formatDateTime(value, true);
          return (
            <TextTooltip text={formattedValue}>
              <span className="datetime-cell">{formattedValue}</span>
            </TextTooltip>
          );
        }

        // Default text rendering
        if (value !== null && value !== undefined && value !== '-') {
          const stringValue = String(value);
          return (
            <TextTooltip text={stringValue}>
              <span className="text-cell">{stringValue}</span>
            </TextTooltip>
          );
        }

        return <span className="empty-cell">-</span>;
      };

      return column;
    });

    // Add Pre-Arrival column if onOpenChecklist is provided
    if (onOpenChecklist) {
      baseColumns.push({
        field: 'preArrival',
        label: 'Pre-Arrival',
        width: windowWidth < 768 ? '100px' : '140px',
        minWidth: windowWidth < 768 ? '80px' : '100px',
        sortable: false,
        render: (value, rowData) => (
          <ChecklistStatusBadge
            vessel={rowData}
            onOpenChecklist={onOpenChecklist}
            className="table-checklist-badge"
          />
        )
      });
    }

    // Add Comments column if onOpenRemarks is provided
    if (onOpenRemarks) {
      baseColumns.push({
        field: 'comments',
        label: 'Comments',
        width: windowWidth < 768 ? '80px' : '160px',
        minWidth: windowWidth < 768 ? '60px' : '120px',
        sortable: false,
        render: (value, rowData) => {
          const hasComments = rowData.comments && rowData.comments.trim().length > 0;

          return (
            <div className="comment-cell">
              <CommentTooltip
                comment={rowData.comments || ""}
                onEditClick={() => onOpenRemarks && onOpenRemarks(rowData)}
              >
                <div
                  className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
                >
                  <div className="comment-icon">
                    <MessageSquare size={16} />
                  </div>

                  {hasComments && windowWidth >= 768 ? (
                    <div className="comment-preview-text">
                      {rowData.comments.length > 28
                        ? `${rowData.comments.substring(0, 28)}...`
                        : rowData.comments}
                    </div>
                  ) : windowWidth >= 768 ? (
                    <div className="comment-add-text">Add comment</div>
                  ) : null}
                </div>
              </CommentTooltip>
            </div>
          );
        }
      });
    }

    return baseColumns;
  }, [windowWidth, fieldMappings, shouldHideColumn, isDateInPast, getDaysOverdue, onUpdateOverride, savingStates, getVesselStatus, formatDateTime, getStatusColor, handleOpenDocuments, onOpenChecklist, onOpenRemarks]);

  // Create expanded content renderer
  const renderExpandedContent = useCallback((vessel) => {
    const expandedColumns = Object.entries(fieldMappings.EXPANDED)
      .sort((a, b) => a[1].priority - b[1].priority);

    // Add IMO and Owner to expanded content if on mobile
    if (windowWidth < 768) {
      if (vessel.imo_no) {
        expandedColumns.unshift(['imo', {
          dbField: 'imo_no',
          label: 'IMO No',
          priority: -2
        }]);
      }

      if (vessel.owner) {
        expandedColumns.unshift(['owner', {
          dbField: 'owner',
          label: 'Owner',
          priority: -1
        }]);
      }
    }

    return (
      <div className={`expanded-grid reporting-expanded ${windowWidth < 768 ? 'mobile-grid' : ''}`}>
        {expandedColumns.map(([fieldId, field]) => {
          let value = vessel[field.dbField];

          // Check for user overrides in expanded content
          if (fieldId === 'eta' && vessel.user_eta !== null && vessel.user_eta !== undefined) {
            value = vessel.user_eta;
          } else if (fieldId === 'etb' && vessel.user_etb !== null && vessel.user_etb !== undefined) {
            value = vessel.user_etb;
          } else if (fieldId === 'etd' && vessel.user_etd !== null && vessel.user_etd !== undefined) {
            value = vessel.user_etd;
          }

          // Handle departure port with country combination
          if (fieldId === 'departure_port' && field.combineWithCountry) {
            const port = value || '-';
            const country = vessel.departure_country || '';

            if (country) {
              let formattedCountry = country;
              if (country === 'AU' || country === 'au') {
                formattedCountry = 'AUSTRALIA';
              } else if (country === 'NZ' || country === 'nz') {
                formattedCountry = 'NEW ZEALAND';
              } else if (formattedCountry) {
                formattedCountry = formattedCountry.toUpperCase();
              }

              value = `${port}, ${formattedCountry}`;
            }
          }

          // Format date values
          if (field.type === 'date') {
            value = formatDateTime(value, false);
          } else if (['etd', 'atd', 'eta', 'etb'].includes(fieldId)) {
            value = formatDateTime(value, true);
          }

          // Special handling for vessel status in expanded view
          if (fieldId === 'event_type') {
            return (
              <ExpandedItem
                key={fieldId}
                label={field.label}
                value={
                  <div className="expanded-vessel-status">
                    <StatusIndicator status={value} color={getStatusColor(value)} />
                    <span className="expanded-status-indicator">{value || '-'}</span>
                  </div>
                }
                className={windowWidth < 768 ? 'mobile-expanded-item' : ''}
              />
            );
          }

          let expandedItemProps = {
            key: fieldId,
            label: field.label,
            value: value || '-',
            className: windowWidth < 768 ? 'mobile-expanded-item' : ''
          };

          // Check if ETA is in the past and style accordingly
          if (fieldId === 'eta') {
            const etaValue = vessel.user_eta !== null && vessel.user_eta !== undefined ? vessel.user_eta : vessel.eta;
            const isPastEta = isDateInPast(etaValue);

            if (isPastEta) {
              const daysOverdue = getDaysOverdue(etaValue);
              expandedItemProps.className += ' past-eta-expanded';

              const displayValue = (
                <TextTooltip text={`ETA is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`}>
                  <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>
                    {value || '-'}
                  </span>
                </TextTooltip>
              );
              expandedItemProps.value = displayValue;
            } else if (value !== null && value !== undefined && value !== '-') {
              const displayValue = (
                <TextTooltip text={String(value)}>
                  {value}
                </TextTooltip>
              );
              expandedItemProps.value = displayValue;
            }
          } else if (value !== null && value !== undefined && value !== '-') {
            const displayValue = (
              <TextTooltip text={String(value)}>
                {value}
              </TextTooltip>
            );
            expandedItemProps.value = displayValue;
          }

          return <ExpandedItem {...expandedItemProps} />;
        })}
      </div>
    );
  }, [windowWidth, fieldMappings, formatDateTime, getStatusColor, isDateInPast, getDaysOverdue]);

  // Comments column - exactly like VesselTable
  const commentsColumn = useMemo(() => ({
    label: 'Comments',
    width: windowWidth < 768 ? '80px' : '160px',
    className: 'comments-column',
    content: (vessel) => {
      const hasComments = vessel.comments && vessel.comments.trim().length > 0;

      return (
        <div className="comment-cell">
          <CommentTooltip
            comment={vessel.comments || ""}
            onEditClick={() => onOpenRemarks && onOpenRemarks(vessel)}
          >
            <div
              className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
            >
              <div className="comment-icon">
                <MessageSquare size={16} />
              </div>

              {hasComments && windowWidth >= 768 ? (
                <div className="comment-preview-text">
                  {vessel.comments.length > 28
                    ? `${vessel.comments.substring(0, 28)}...`
                    : vessel.comments}
                </div>
              ) : windowWidth >= 768 ? (
                <div className="comment-add-text">Add comment</div>
              ) : null}
            </div>
          </CommentTooltip>
        </div>
      );
    }
  }), [windowWidth, onOpenRemarks]);

  // Actions column for checklist functionality - USING SIMPLIFIED BADGE
  const checklistActions = useMemo(() => ({
    label: 'Pre-Arrival',
    width: windowWidth < 768 ? '100px' : '140px',
    content: (vessel) => (
      <ChecklistStatusBadge
        vessel={vessel}
        onOpenChecklist={onOpenChecklist}
        className="table-checklist-badge"
      />
    )
  }), [onOpenChecklist, windowWidth]);

  // Combined actions - show both comments and checklist badges
  const combinedActions = useMemo(() => {
    if (onOpenRemarks && onOpenChecklist) {
      // For multiple columns, we need to return a single action object that renders both
      return {
        label: 'Actions',
        width: windowWidth < 768 ? '180px' : '300px',
        content: (vessel) => (
          <div className="multiple-actions-container">
            <div className="checklist-action">
              <ChecklistStatusBadge
                vessel={vessel}
                onOpenChecklist={onOpenChecklist}
                className="table-checklist-badge"
              />
            </div>
            <div className="comment-action">
              {(() => {
                const hasComments = vessel.comments && vessel.comments.trim().length > 0;
                return (
                  <CommentTooltip
                    comment={vessel.comments || ""}
                    onEditClick={() => onOpenRemarks && onOpenRemarks(vessel)}
                  >
                    <div
                      className={`comment-indicator ${hasComments ? 'has-comment' : 'no-comment'}`}
                    >
                      <div className="comment-icon">
                        <MessageSquare size={16} />
                      </div>

                      {hasComments && windowWidth >= 768 ? (
                        <div className="comment-preview-text">
                          {vessel.comments.length > 28
                            ? `${vessel.comments.substring(0, 28)}...`
                            : vessel.comments}
                        </div>
                      ) : windowWidth >= 768 ? (
                        <div className="comment-add-text">Add comment</div>
                      ) : null}
                    </div>
                  </CommentTooltip>
                );
              })()}
            </div>
          </div>
        )
      };
    } else if (onOpenRemarks) {
      // Show only comments column
      return commentsColumn;
    } else if (onOpenChecklist) {
      // Show only checklist column
      return {
        label: 'Pre-Arrival',
        width: windowWidth < 768 ? '100px' : '140px',
        content: (vessel) => (
          <ChecklistStatusBadge
            vessel={vessel}
            onOpenChecklist={onOpenChecklist}
            className="table-checklist-badge"
          />
        )
      };
    }
    
    // Show nothing if neither is provided
    return null;
  }, [onOpenRemarks, onOpenChecklist, windowWidth, commentsColumn]);

  // Sort vessels by priority
  const sortedVessels = useMemo(() => {
    return [...vesselsToDisplay].sort((a, b) => {
      const aEta = a.user_eta || a.eta;
      const bEta = b.user_eta || b.eta;

      if (!aEta && !bEta) return 0;
      if (!aEta) return 1;
      if (!bEta) return -1;

      const aDate = new Date(aEta);
      const bDate = new Date(bEta);
      const now = new Date();

      // Check if dates are overdue
      const aOverdue = aDate < now;
      const bOverdue = bDate < now;

      // Overdue vessels first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Within same overdue status, sort by date
      return aDate - bDate;
    });
  }, [vesselsToDisplay]);

  return (
    <div ref={tableRef} className="vessel-reporting-table">
      <style jsx>{`
        /* Vessel Table CSS */
        .vessel-reporting-table {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        /* Vessel Name Cell */
        .vessel-name-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }

        /* MODIFIED: Use the vessel-name class from tableStyles.css */
        .vessel-name {
          font-weight: 500; /* From tableStyles.css */
          white-space: nowrap; /* From tableStyles.css */
          overflow: hidden; /* From tableStyles.css */
          text-overflow: ellipsis; /* From tableStyles.css */
          color: var(--table-text-color); /* From tableStyles.css */
          font-family: 'Nunito', sans-serif; /* From tableStyles.css */
          cursor: pointer; /* Added back for clickability */
        }

        /* Status Cell */
        .status-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-text {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
        }

        /* Enhanced Status Badge */
        .enhanced-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .enhanced-status-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        /* Arrival Port Cell */
        .arrival-port-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .arrival-port {
          font-weight: 500;
        }

        .port-doc-icon {
          cursor: pointer;
          color: #3498DB;
          transition: color 0.2s ease-in-out;
          flex-shrink: 0;
        }

        .port-doc-icon:hover {
          color: #2980B9;
        }

        /* Text Cells */
        .date-cell, .datetime-cell, .text-cell {
          color: var(--text-light, #f4f4f4);
        }

        .empty-cell {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
          font-style: italic;
        }

        /* Comments */
        .comment-cell {
          width: 100%;
        }

        .comment-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 32px;
        }

        .comment-indicator.has-comment {
          background-color: rgba(59, 173, 229, 0.1);
          border: 1px solid rgba(59, 173, 229, 0.2);
        }

        .comment-indicator.no-comment {
          background-color: rgba(244, 244, 244, 0.05);
          border: 1px solid rgba(244, 244, 244, 0.1);
        }

        .comment-indicator:hover {
          background-color: rgba(59, 173, 229, 0.15);
          border-color: rgba(59, 173, 229, 0.3);
        }

        .comment-icon {
          color: var(--blue-accent, #3BADE5);
          flex-shrink: 0;
        }

        .comment-preview-text {
          color: var(--text-light, #f4f4f4);
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .comment-add-text {
          color: var(--text-muted, rgba(244, 244, 244, 0.6));
          font-size: 12px;
          font-style: italic;
        }

        /* Expanded Content */
        .expanded-vessel-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .expanded-status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .past-eta-expanded .expanded-value {
          color: #E74C3C !important;
          font-weight: bold !important;
        }

        /* Table checklist badge positioning */
        .table-checklist-badge {
          width: 100%;
          justify-content: center;
        }

        /* Multiple actions container */
        .multiple-actions-container {
          display: flex;
          gap: 8px;
          align-items: center;
          width: 100%;
        }

        .checklist-action {
          flex: 1;
          min-width: 100px;
        }

        .comment-action {
          flex: 1;
          min-width: 80px;
        }

        .comment-action .comment-cell {
          width: 100%;
        }

        /* Enhanced checklist status cell for fallback */
        .checklist-status-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .checklist-status-cell .enhanced-status-badge {
          min-width: 100px;
          justify-content: center;
        }

        /* Responsive Design */
        @media (max-width: 767px) {
          .hidden-column {
            display: none !important;
          }

          .vessel-name-cell {
            max-width: 120px;
          }

          .vessel-name {
            max-width: 80px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: inline-block;
          }

          .comment-indicator {
            width: 24px;
            height: 24px;
            padding: 0;
            justify-content: center;
          }

          .comment-preview-text, .comment-add-text {
            display: none;
          }

          .mobile-grid {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
          }

          .mobile-expanded-item {
            padding: 8px !important;
          }

          .arrival-port-cell {
            gap: 4px;
          }

          .table-checklist-badge {
            font-size: 11px;
          }

          .multiple-actions-container {
            flex-direction: column;
            gap: 4px;
          }

          .checklist-action,
          .comment-action {
            width: 100%;
            min-width: auto;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .hidden-column {
            display: none !important;
          }

          .vessel-name {
            max-width: 120px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: inline-block;
          }

          .arrival-port-cell {
            gap: 6px;
          }
        }

        @media (min-width: 1024px) and (max-width: 1279px) {
          .hidden-column {
            display: none !important;
          }

          .arrival-port-cell {
            gap: 6px;
          }
        }

        /* Ensure consistent table cell height */
        .vessel-reporting-table :global(.data-row td) {
          padding-top: 8px;
          padding-bottom: 8px;
          min-height: 48px;
          vertical-align: middle;
        }

        /* Text tooltip styling */
        .text-tooltip-trigger {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      <Table
        data={sortedVessels}
        columns={getTableColumns()}
        expandedContent={renderExpandedContent}
        actions={null}
        uniqueIdField="uniqueKey"
        defaultSortKey="eta"
        defaultSortDirection="asc"
        className="vessel-data-table enhanced"
      />

      {/* Document Modal */}
      <DocumentModal
        isOpen={documentModalOpen}
        onClose={handleCloseDocuments}
        portId={selectedPortId}
        portName={selectedPortName}
        initialDocumentCount={selectedPortDocumentCount}
      />
    </div>
  );
};

VesselReportingTable.propTypes = {
  vessels: PropTypes.arrayOf(PropTypes.object).isRequired,
  fieldMappings: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  onOpenChecklist: PropTypes.func,
  onUpdateVessel: PropTypes.func,
  onUpdateOverride: PropTypes.func,
  onOpenRemarks: PropTypes.func,
  savingStates: PropTypes.object,
  currentUser: PropTypes.object
};

VesselReportingTable.defaultProps = {
  loading: false,
  onOpenChecklist: null,
  onUpdateVessel: null,
  onUpdateOverride: null,
  onOpenRemarks: null,
  savingStates: {},
  currentUser: null
};

export default VesselReportingTable;