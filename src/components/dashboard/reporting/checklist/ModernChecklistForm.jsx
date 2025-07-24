// ModernChecklistForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  MapPin,
  User,
  Clock,
  Ship,
  Settings,
  Shield,
  Target,
  Search,
  Eye,
  ChevronRight,
  ChevronDown,
  Save,
  Send,
  AlertCircle,
  FileText,
  Compass,
  Wrench,
  Droplets,
  Zap,
  Filter,
  RefreshCw,
  Camera,
  MoreHorizontal,
  Plus,
  Minus
} from 'lucide-react';

// IMPORT THE REAL CHECKLIST SERVICE
import checklistService from '../../../../services/checklistService';

// 1. Import the DynamicTable component at the top
import DynamicTable from './DynamicTable';
// Assuming DynamicTable.css is already imported globally or handled by your build system
// import './DynamicTable.css'; // Keep this if it's a direct import for DynamicTable

// CRITICAL FIXES for table data handling in ModernChecklistForm.jsx

// 1. FIXED: Enhanced prepareTableDataForSubmission function
const prepareTableDataForSubmission = (tableData) => {
  console.log('🔧 prepareTableDataForSubmission called with:', tableData);

  if (!tableData) {
    console.log('⚠️ No table data provided');
    return null;
  }

  try {
    let processedData = [];

    // Handle different input formats
    if (Array.isArray(tableData)) {
      processedData = tableData;
    } else if (typeof tableData === 'string') {
      try {
        processedData = JSON.parse(tableData);
        if (!Array.isArray(processedData)) {
          processedData = [processedData];
        }
      } catch (e) {
        console.warn('Could not parse table data string:', tableData);
        return null;
      }
    } else if (typeof tableData === 'object') {
      processedData = [tableData];
    } else {
      console.warn('Invalid table data type:', typeof tableData);
      return null;
    }

    // Clean and validate the data
    const cleanedData = processedData.map((row, index) => {
      if (!row || typeof row !== 'object') {
        console.warn(`Invalid row at index ${index}:`, row);
        return null;
      }

      const cleanRow = {};
      let hasValidData = false;

      Object.keys(row).forEach(key => {
        // Skip React internal properties and empty values
        if (key.startsWith('_') || key.startsWith('$')) {
          return;
        }

        const value = row[key];

        // Include non-empty values
        if (value !== null && value !== undefined && value !== '' && value !== false) { // Added false check
          cleanRow[key] = value;
          hasValidData = true;
        }
      });

      if (!hasValidData) {
        console.log(`Filtered out empty row at index ${index}`);
        return null;
      }

      console.log(`✅ Cleaned row ${index}:`, cleanRow);
      return cleanRow;
    }).filter(row => row !== null);

    console.log(`🔧 Final cleaned data: ${cleanedData.length} rows`);
    return cleanedData.length > 0 ? cleanedData : null;

  } catch (error) {
    console.error('Error preparing table data:', error);
    return null;
  }
};

// Assuming this file exists and contains the transformation logic
// For demonstration, I'll include it here.
const transformResponsesToAPIFormat = (responses, items) => {
  const apiResponses = [];
  for (const itemId in responses) {
    const itemResponse = responses[itemId];
    const originalItem = items.find(item => item.item_id === itemId);

    if (originalItem) {
      // Only include responses that have a value or remarks
      // UPDATED: Include table_data check
      if (itemResponse.response !== null || itemResponse.remarks !== '' || (originalItem.response_type === 'table' && itemResponse.table_data && itemResponse.table_data.length > 0)) {
        apiResponses.push({
          item_id: itemId,
          checklist_id: originalItem.checklist_id, // Assuming item has checklist_id
          yes_no_na_value: ['Yes', 'No', 'N/A'].includes(itemResponse.response) ? itemResponse.response : null,
          text_value: !['Yes', 'No', 'N/A'].includes(itemResponse.response) ? itemResponse.response : null,
          remarks: itemResponse.remarks || itemResponse.comments || '', // FIXED: Corrected syntax here
          // ADD TABLE DATA HANDLING - Use the new preparation function here
          table_data: originalItem.response_type === 'table' ? prepareTableDataForSubmission(itemResponse.table_data) : null,
          // Add other fields as necessary, e.g., photo_url, date_value
        });
      }
    }
  }
  return apiResponses;
};

const validateResponsesForSubmission = (apiResponses, items) => {
  const validation = {
    isValid: true,
    mandatoryIncomplete: [],
    errors: []
  };

  const respondedItemIds = new Set(apiResponses.map(r => r.item_id));
  const apiResponsesMap = new Map(apiResponses.map(r => [r.item_id, r]));

  items.forEach(item => {
    if (item.is_mandatory) {
      const response = apiResponsesMap.get(item.item_id);
      let hasResponse = false;

      if (item.response_type === 'table') {
        // For table fields, check if there's at least one row of data
        hasResponse = response?.table_data &&
                     Array.isArray(response.table_data) &&
                     response.table_data.length > 0;
      } else {
        // For other fields, check for standard responses
        hasResponse = response?.yes_no_na_value !== null && response?.yes_no_na_value !== undefined ||
                     response?.text_value?.trim() ||
                     response?.date_value;
      }

      if (!hasResponse) {
        validation.isValid = false;
        validation.mandatoryIncomplete.push({
          item_id: item.item_id,
          description: item.description,
          section: item.section_name // Use actual section name
        });
      }
    }
  });

  // Add more complex validation rules here if needed
  // e.g., if response is 'No', remarks are mandatory

  return validation;
};


const ModernChecklistForm = ({
  vessel = {
    vessel_name: "GENCO BEAR",
    imo_no: "9469259"
  },
  template = {
    name: "Port State Control Inspection",
    processed_items: []
  },
  existingChecklist = null,
  onSave = () => {},
  onSubmit = () => {},
  onCancel = () => {},
  loading = false,
  currentUser = { id: "user123", name: "John Doe" },
  mode = 'edit',
  selectedChecklist = { checklist_id: 'chk123' }
}) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedSections, setExpandedSections] = useState(new Set(['deck']));
  const [responses, setResponses] = useState({});
  const [completedItems, setCompletedItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPIC, setFilterPIC] = useState('all');
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('compact');

  // Add these state variables for error/success display
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Category configuration for different item types
  const categoryConfig = {
    safety: { icon: <Shield size={12} />, color: "#E74C3C", bg: "badge-danger", light: "#fee2e2" },
    security: { icon: <Eye size={12} />, color: "#3498DB", bg: "badge-info", light: "#dbeafe" },
    fire_safety: { icon: <Zap size={12} />, color: "#F39C12", bg: "badge-warning", light: "#fef3c7" },
    navigation: { icon: <Compass size={12} />, color: "#3498DB", bg: "badge-info", light: "#dbeafe" },
    mechanical: { icon: <Wrench size={12} />, color: "#F1C40F", bg: "badge-warning", light: "#fef3c7" },
    hygiene: { icon: <Droplets size={12} />, color: "#2ECC71", bg: "badge-success", light: "#dcfce7" },
    default: { icon: <AlertCircle size={12} />, color: "#95A5A6", bg: "badge-default", light: "#f3f4f6" }
  };

  // 1. UPDATED: Enhanced items processing with duplicate handling
  const items = useMemo(() => {
    console.log('ModernChecklistForm - Processing template for items...');

    if (!template) {
      console.warn('ModernChecklistForm - No template provided');
      return [];
    }

    // IMPORTANT: Use processed_items from the service if available
    if (template.processed_items && Array.isArray(template.processed_items)) {
      console.log('ModernChecklistForm - Using pre-processed items from service:', template.processed_items.length);
      console.log('ModernChecklistForm - Sample processed items:', template.processed_items.slice(0, 3));
      return template.processed_items;
    }

    console.warn('ModernChecklistForm - No processed_items found, template structure:', {
      hasProcessedItems: !!template.processed_items,
      templateKeys: Object.keys(template || {}),
      templateDataKeys: template.template_data ? Object.keys(template.template_data) : []
    });

    // Fallback: Only if no processed_items are available
    if (template.template_data?.sections) {
      console.log('ModernChecklistForm - Falling back to manual processing');
      const manualItems = [];
      let itemCounter = 0;
      const seenItemIds = new Set();

      template.template_data.sections.forEach((section, sectionIndex) => {
        const sectionName = section.section_name || section.name || `Section ${sectionIndex}`;

        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach((field, fieldIndex) => {
            // Skip table fields for now
            if (field.field_type === 'table') {
              console.log(`ModernChecklistForm - Skipping table field: ${field.field_id}`);
              // For table fields, ensure table_structure is passed if available
              const processedItem = {
                item_id: field.field_id,
                section_name: sectionName,
                sub_section_name: null,
                description: field.label || '',
                check_description: field.label || field.description || '',
                pic: field.pic || '',
                guidance: field.guidance || field.placeholder || '',
                response_type: mapFieldTypeToResponseType(field.field_type),
                is_mandatory: field.is_mandatory !== undefined ? field.is_mandatory : true,
                requires_evidence: field.requires_evidence || false,
                order_index: itemCounter++,
                table_structure: field.table_structure || null // Pass table structure
              };
              manualItems.push(processedItem);
              return;
            }

            if (!field.field_id) {
              console.warn('ModernChecklistForm - Field missing field_id:', field);
              return;
            }

            if (seenItemIds.has(field.field_id)) {
              console.warn(`ModernChecklistForm - Duplicate field_id found: ${field.field_id} (skipping)`);
              return;
            }
            seenItemIds.add(field.field_id);

            const processedItem = {
              item_id: field.field_id,
              section_name: sectionName,
              sub_section_name: null,
              description: field.label || '',
              check_description: field.label || field.description || '',
              pic: field.pic || '',
              guidance: field.guidance || field.placeholder || '',
              response_type: mapFieldTypeToResponseType(field.field_type),
              is_mandatory: field.is_mandatory !== undefined ? field.is_mandatory : true,
              requires_evidence: field.requires_evidence || false,
              order_index: itemCounter++
            };

            manualItems.push(processedItem);
          });
        }
      });

      console.log('ModernChecklistForm - Manually processed items:', manualItems.length);
      return manualItems;
    }

    console.warn('ModernChecklistForm - No valid template data found');
    return [];
  }, [template]);

  // Helper function for field type mapping (if you need fallback processing)
  const mapFieldTypeToResponseType = (field_type) => {
    switch (field_type) {
      case 'text':
        return 'text';
      case 'date':
        return 'date';
      case 'yes_no':
        return 'yes_no_na';
      case 'number':
        return 'text';
      case 'table':
        return 'table';
      default:
        console.warn(`ModernChecklistForm - Unknown field_type: ${field_type}, defaulting to text`);
        return 'text';
    }
  };

  // 3. UPDATED: Enhanced sections grouping with duplicate handling
  const sections = useMemo(() => {
    const sectionGroups = {};
    const processedItemIds = new Set();

    items.forEach(item => {
      // Skip duplicate items
      if (processedItemIds.has(item.item_id)) {
        console.warn(`Duplicate item_id found in sections grouping: ${item.item_id} (skipping)`);
        return;
      }
      processedItemIds.add(item.item_id);

      // Normalize section names to avoid duplicates (GALLEY vs Galley)
      const normalizedSectionName = item.section_name?.toUpperCase() || 'GENERAL';

      if (!sectionGroups[normalizedSectionName]) {
        sectionGroups[normalizedSectionName] = {
          section_name: normalizedSectionName,
          section_id: normalizedSectionName.toLowerCase().replace(/\s+/g, '_'),
          icon: getSectionIcon(normalizedSectionName),
          color: getSectionColor(normalizedSectionName),
          items: [],
          subsections: {}
        };
      }

      const subSectionName = item.sub_section_name || 'General Items';
      const subsectionKey = `${normalizedSectionName}_${subSectionName}`;

      if (!sectionGroups[normalizedSectionName].subsections[subsectionKey]) {
        sectionGroups[normalizedSectionName].subsections[subsectionKey] = {
          subsection_name: subSectionName,
          id: subSectionName.toLowerCase().replace(/\s+/g, '_'),
          items: []
        };
      }

      sectionGroups[normalizedSectionName].items.push(item);
      sectionGroups[normalizedSectionName].subsections[subsectionKey].items.push(item);
    });

    const sectionsArray = Object.values(sectionGroups).map(section => ({
      ...section,
      subsections: Object.values(section.subsections)
    }));

    console.log('Sections created:', sectionsArray.length, 'Total items processed:', processedItemIds.size);

    return sectionsArray;
  }, [items]);

  // Update timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper functions
  function determineCategoryFromItem(item) {
    const check = item.description?.toLowerCase() || '';
    const pic = item.pic?.toLowerCase() || '';

    if (check.includes('fire') || check.includes('alarm') || check.includes('smoke')) return 'fire_safety';
    if (check.includes('navigation') || check.includes('radar') || check.includes('gps') || pic.includes('master')) return 'navigation';
    if (check.includes('engine') || check.includes('mechanical') || pic.includes('engineer')) return 'mechanical';
    if (check.includes('food') || check.includes('galley') || check.includes('hygiene') || pic.includes('cook')) return 'hygiene';
    if (check.includes('safety') || check.includes('life') || check.includes('emergency')) return 'safety';
    if (check.includes('security') || check.includes('drill') || check.includes('dpa') || check.includes('cso')) return 'security';
    return 'default';
  }

  function estimateTimeFromItem(item) {
    const check = item.description?.toLowerCase() || '';
    if (check.includes('test') || check.includes('check')) return 10;
    if (check.includes('inspect') || check.includes('verify')) return 15;
    if (check.includes('drill') || check.includes('exercise')) return 30;
    return 5;
  }

  function extractLocationFromItem(item) {
    const guidance = item.guidance?.toLowerCase() || '';
    const sectionName = item.section_name?.toLowerCase() || '';

    if (guidance.includes('bridge') || sectionName.includes('bridge')) return 'Bridge';
    if (guidance.includes('engine room') || sectionName.includes('engine')) return 'Engine Room';
    if (guidance.includes('deck') || sectionName.includes('deck')) return 'Main Deck';
    if (guidance.includes('galley') || sectionName.includes('galley')) return 'Galley';
    if (guidance.includes('accommodation')) return 'Accommodation';
    return item.section_name || 'Various Locations';
  }

  function getSectionIcon(sectionName) {
    const section = sectionName.toLowerCase();
    if (section.includes('deck') || section.includes('bridge')) return <Ship size={16} />;
    if (section.includes('engine') || section.includes('mechanical')) return <Settings size={16} />;
    if (section.includes('galley') || section.includes('catering')) return <Target size={16} />;
    if (section.includes('safety') || section.includes('fire')) return <Shield size={16} />;
    if (section.includes('navigation')) return <Compass size={16} />;
    if (section.includes('accommodation')) return <User size={16} />;
    return <FileText size={16} />;
  }

  function getSectionColor(sectionName) {
    const section = sectionName.toLowerCase();
    if (section.includes('deck') || section.includes('bridge')) return '#3498DB';
    if (section.includes('engine') || section.includes('mechanical')) return '#F39C12';
    if (section.includes('galley') || section.includes('catering')) return '#2ECC71';
    if (section.includes('safety') || section.includes('fire')) return '#E74C3C';
    if (section.includes('navigation')) return '#9B59B6';
    if (section.includes('accommodation')) return '#F1C40F';
    return '#95A5A6';
  }

  // Get unique PICs for filtering
  const uniquePICs = useMemo(() => {
    return [...new Set(items.map(item => item.pic).filter(Boolean))];
  }, [items]);

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.section_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPIC = filterPIC === 'all' || item.pic === filterPIC;
      const matchesMandatory = !showOnlyMandatory || item.is_mandatory;

      return matchesSearch && matchesPIC && matchesMandatory;
    });
  }, [items, searchTerm, filterPIC, showOnlyMandatory]);

  // 2. FIXED: Enhanced handleResponseChange for better table data handling
  const handleResponseChange = useCallback((itemId, field, value) => {
    console.log(`📝 ENHANCED Response change: ${itemId}.${field}`, value);

    setResponses(prev => {
      const templateItem = items.find(item => item.item_id === itemId);

      if (!templateItem) {
        console.warn(`Template item not found for ${itemId}`);
        return prev;
      }

      // CRITICAL FIX: Special handling for table_data
      let processedValue = value;

      if (field === 'table_data') {
        console.log(`📊 Processing table_data for ${itemId}:`, value);

        // Validate and clean table data immediately
        if (Array.isArray(value)) {
          const cleanedTableData = value.map((row, index) => {
            if (!row || typeof row !== 'object') return null;

            const cleanRow = {};
            let hasData = false;

            Object.keys(row).forEach(key => {
              if (!key.startsWith('_') && row[key] !== null && row[key] !== undefined && row[key] !== '' && row[key] !== false) { // Added false check
                cleanRow[key] = row[key];
                hasData = true;
              }
            });

            return hasData ? cleanRow : null;
          }).filter(row => row !== null);

          processedValue = cleanedTableData;
          console.log(`📊 Cleaned table data for ${itemId}:`, processedValue);
        }
      }

      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          item_id: itemId,
          [field]: processedValue,

          // Ensure response metadata is preserved
          response_type: templateItem.response_type || 'yes_no_na',
          section: templateItem.section_name || 'GENERAL',
          subsection: templateItem.sub_section_name || null,
          check_description: templateItem.description || '',
          pic: templateItem.pic || '',
          is_mandatory: templateItem.is_mandatory || false,
          requires_evidence: templateItem.requires_evidence || false,
          guidance: templateItem.guidance || '',
          sr_no: templateItem.sr_no || templateItem.order_index || 1
        }
      };

      // CRITICAL FIX: Better completion tracking for tables
      const currentItemResponse = updated[itemId];
      let hasAnyValue = false;

      if (templateItem.response_type === 'table') {
        hasAnyValue = currentItemResponse.table_data &&
                     Array.isArray(currentItemResponse.table_data) &&
                     currentItemResponse.table_data.length > 0;

        console.log(`📊 Table completion check for ${itemId}: ${hasAnyValue} (${currentItemResponse.table_data?.length || 0} rows)`);
      } else {
        hasAnyValue = (currentItemResponse.yes_no_na_value !== null && currentItemResponse.yes_no_na_value !== undefined) ||
                      (currentItemResponse.text_value && currentItemResponse.text_value.trim() !== '') ||
                      (currentItemResponse.date_value && currentItemResponse.date_value !== '') ||
                      (currentItemResponse.remarks && currentItemResponse.remarks.trim() !== '');
      }

      // Update completion tracking
      setCompletedItems(prevCompleted => {
        const newSet = new Set(prevCompleted);
        if (hasAnyValue) {
          newSet.add(itemId);
          console.log(`✅ Marked ${itemId} as completed`);
        } else {
          newSet.delete(itemId);
          console.log(`❌ Marked ${itemId} as incomplete`);
        }
        return newSet;
      });

      console.log(`✅ Updated response for ${itemId}:`, {
        field,
        hasValue: hasAnyValue,
        responseType: templateItem.response_type,
        tableDataLength: processedValue?.length || 'N/A'
      });

      return updated;
    });

    // Clear any existing errors
    if (errors[itemId]) {
      setErrors(prev => ({ ...prev, [itemId]: null }));
    }
  }, [errors, items]);


  // Progress tracking
  const getProgress = () => {
    const totalItems = items.length;
    // UPDATED: getCompletionPercentage now handles table data
    const completedCount = items.filter(item => {
      const response = responses[item.item_id];

      if (item.response_type === 'table') {
        return response?.table_data &&
               Array.isArray(response.table_data) &&
               response.table_data.length > 0;
      }

      return response?.yes_no_na_value !== null && response?.yes_no_na_value !== undefined ||
             response?.text_value?.trim() ||
             response?.date_value;
    }).length;

    const mandatoryItems = items.filter(item => item.is_mandatory);
    const mandatoryCompleted = mandatoryItems.filter(item => {
      const response = responses[item.item_id];
      if (item.response_type === 'table') {
        return response?.table_data &&
               Array.isArray(response.table_data) &&
               response.table_data.length > 0;
      }
      return response?.yes_no_na_value !== null && response?.yes_no_na_value !== undefined ||
             response?.text_value?.trim() ||
             response?.date_value;
    }).length;

    return {
      total: totalItems,
      completed: completedCount,
      mandatory: mandatoryItems.length,
      mandatoryCompleted,
      percentage: totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
      mandatoryPercentage: mandatoryItems.length > 0 ? Math.round((mandatoryCompleted / mandatoryItems.length) * 100) : 100
    };
  };

  // Real-time progress updates
  useEffect(() => {
    const progress = getProgress();
    console.log('Progress updated:', progress);

    // You can emit this to parent component if needed
    // onProgressUpdate?.(progress);
  }, [completedItems, items, responses]); // Added responses to dependency array

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 1. FIXED: Enhanced table data validation and formatting (This function was misplaced, moved it here)
  const validateAndFormatTableData = (tableData) => {
    if (!tableData || !Array.isArray(tableData)) {
      return [];
    }

    // Clean and validate each row
    return tableData.map(row => {
      const cleanRow = {};

      // Remove React internal properties and validate data
      Object.keys(row).forEach(key => {
        if (!key.startsWith('_') && row[key] !== null && row[key] !== undefined) {
          // Convert values to appropriate types
          let value = row[key];

          // Handle different value types
          if (typeof value === 'string' && value.trim() === '') {
            return; // Skip empty strings
          }

          if (typeof value === 'number' && isNaN(value)) {
            return; // Skip invalid numbers
          }

          cleanRow[key] = value;
        }
      });

      // Only return rows that have at least one meaningful value
      return Object.keys(cleanRow).length > 0 ? cleanRow : null;
    }).filter(row => row !== null);
  };

  // 3. FIXED: Enhanced formatResponseForAPI with better table data handling
  const formatResponseForAPI = useCallback((responsesToFormat) => {
    console.log('🔄 ENHANCED formatResponseForAPI...');
    console.log('📊 Input responses:', responsesToFormat.length);

    return responsesToFormat.map(response => {
      const formattedResponse = {
        item_id: response.item_id,
        sr_no: parseInt(response.sr_no) || 1,
        section: response.section || 'GENERAL',
        subsection: response.subsection || null,
        check_description: response.check_description || response.description || '',
        pic: response.pic || '',
        response_type: response.response_type || 'yes_no_na',
        is_mandatory: Boolean(response.is_mandatory),
        requires_evidence: Boolean(response.requires_evidence),
        guidance: response.guidance || ''
      };

      // Initialize all response fields to null
      formattedResponse.yes_no_na_value = null;
      formattedResponse.text_value = null;
      formattedResponse.date_value = null;
      formattedResponse.table_data = null;

      // CRITICAL FIX: Enhanced table data processing
      if (response.response_type === 'table') {
        console.log(`📊 ENHANCED Processing table data for ${response.item_id}:`, response.table_data);

        const preparedTableData = prepareTableDataForSubmission(response.table_data);

        if (preparedTableData && preparedTableData.length > 0) {
          formattedResponse.table_data = preparedTableData;
          console.log(`✅ ENHANCED Prepared table data for ${response.item_id}:`, preparedTableData);
        } else {
          formattedResponse.table_data = null; // Explicitly set to null if no data
          console.log(`⚠️ ENHANCED No valid table data for ${response.item_id}`);
        }
      } else {
        // Handle other response types
        switch (response.response_type) {
          case 'yes_no_na':
            if (response.yes_no_na_value !== null && response.yes_no_na_value !== undefined) {
              formattedResponse.yes_no_na_value = response.yes_no_na_value;
            }
            break;

          case 'text':
            if (response.text_value && response.text_value.trim() !== '') {
              formattedResponse.text_value = response.text_value.trim();
            }
            break;

          case 'date':
            if (response.date_value && response.date_value !== '') {
              formattedResponse.date_value = response.date_value;
            }
            break;
        }
      }

      // Always include remarks if present
      formattedResponse.remarks = response.remarks && response.remarks.trim() !== '' ? response.remarks.trim() : null;

      console.log(`📝 ENHANCED Formatted ${response.item_id}:`, {
        type: formattedResponse.response_type,
        has_table_data: formattedResponse.table_data ? formattedResponse.table_data.length : 0,
        has_yes_no_na: formattedResponse.yes_no_na_value !== null,
        has_text: formattedResponse.text_value !== null,
        has_date: formattedResponse.date_value !== null,
        has_remarks: formattedResponse.remarks !== null
      });

      return formattedResponse;
    });
  }, []);

  // 3. FIXED: Enhanced handleSave with better error handling for tables
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (mode === 'view') return;

    // Prevent multiple simultaneous saves
    if (saving) {
      console.log('Save already in progress, skipping...');
      return { success: false, reason: 'save_in_progress' };
    }

    setSaving(true);
    setError(null);

    try {
      console.log('=== SAVE OPERATION STARTED (ENHANCED) ===');
      console.log('Auto-save:', isAutoSave);
      console.log('Checklist ID:', selectedChecklist?.checklist_id);
      console.log('User ID:', currentUser?.id);

      // Enhanced state debugging
      console.log('Current responses state:', {
        totalResponseKeys: Object.keys(responses).length,
        sampleResponses: Object.entries(responses).slice(0, 3).map(([itemId, resp]) => ({
          itemId,
          mainResponse: resp.response,
          yes_no_na_value: resp.yes_no_na_value,
          text_value: resp.text_value,
          remarks: resp.remarks, // FIXED: Corrected syntax here
          tableDataLength: resp.table_data?.length || 0
        })),
        completedItemsCount: completedItems.size,
        sampleCompletedItems: Array.from(completedItems).slice(0, 5)
      });

      console.log('Template items:', {
        totalItems: items.length,
        sampleItems: items.slice(0, 3).map(item => ({
          item_id: item.item_id,
          description: item.description?.substring(0, 50),
          is_mandatory: item.is_mandatory,
          response_type: item.response_type
        }))
      });

      // Get only responses with actual values
      const responsesWithValues = Object.entries(responses)
        .filter(([itemId, response]) => {
          // Check if response has any meaningful value
          const hasYesNoNa = response.yes_no_na_value !== null && response.yes_no_na_value !== undefined;
          const hasText = response.text_value && response.text_value.trim() !== '';
          const hasDate = response.date_value && response.date_value !== '';
          const hasRemarks = response.remarks && response.remarks.trim() !== '';

          // CRITICAL: Enhanced table data validation
          const hasTable = response.table_data &&
                           Array.isArray(response.table_data) &&
                           response.table_data.length > 0 &&
                           response.table_data.some(row =>
                             row && typeof row === 'object' &&
                             Object.values(row).some(val =>
                               val !== null && val !== undefined && val !== '' && val !== false // Added false check
                             )
                           );

          const hasValue = hasYesNoNa || hasText || hasDate || hasTable || hasRemarks;

          if (!hasValue) {
            console.log(`⚠️  Filtering out ${itemId} - no meaningful values`);
          } else if (hasTable) {
            console.log(`📊 Including ${itemId} - has table data with ${response.table_data.length} rows`);
          }

          return hasValue;
        })
        .map(([itemId, response]) => {
          // Get the corresponding template item
          const templateItem = items.find(item => item.item_id === itemId);

          return {
            ...response,
            item_id: itemId,
            // Include template metadata
            section: templateItem?.section_name || 'GENERAL',
            subsection: templateItem?.sub_section_name || null,
            check_description: templateItem?.description || response.description || '',
            pic: templateItem?.pic || '',
            response_type: templateItem?.response_type || 'yes_no_na',
            is_mandatory: templateItem?.is_mandatory || false,
            requires_evidence: templateItem?.requires_evidence || false,
            guidance: templateItem?.guidance || '',
            sr_no: templateItem?.sr_no || templateItem?.order_index || 1
          };
        });

      console.log(`📊 Saving ${responsesWithValues.length} responses with values`);

      // Log table responses specifically
      const tableResponses = responsesWithValues.filter(r => r.response_type === 'table');
      if (tableResponses.length > 0) {
        console.log(`📊 Table responses being saved:`, tableResponses.map(r => ({
          item_id: r.item_id,
          rows: r.table_data?.length || 0
        })));
      }

      if (responsesWithValues.length === 0) {
        console.warn('No responses with values to save');
        if (!isAutoSave) {
          setError('No responses to save. Please complete at least one item.');
        }
        return { success: false, reason: 'no_responses' };
      }

      // Format responses properly
      const formattedResponses = formatResponseForAPI(responsesWithValues);

      console.log('📤 Formatted responses sample:', formattedResponses.slice(0, 3));

      // Log any table data in formatted responses
      const formattedTableResponses = formattedResponses.filter(r => r.table_data && r.table_data.length > 0);
      if (formattedTableResponses.length > 0) {
        console.log('📊 Formatted table responses:', formattedTableResponses.map(r => ({
          item_id: r.item_id,
          table_data: r.table_data
        })));
      }

      // Validate required fields
      if (!selectedChecklist?.checklist_id) {
        throw new Error('Checklist ID is required for saving');
      }

      // Enhanced API call with better error handling
      console.log('=== CALLING API (ENHANCED) ===');
      console.log('Endpoint: updateChecklistResponses');
      console.log('Checklist ID:', selectedChecklist.checklist_id);
      console.log('Responses count:', formattedResponses.length);
      console.log('User ID:', currentUser?.id || 'system');

      const result = await checklistService.updateChecklistResponses(
        selectedChecklist.checklist_id,
        formattedResponses,
        currentUser?.id || 'system'
      );

      console.log('=== API CALL SUCCESSFUL (ENHANCED) ===');
      console.log('Save result:', result);

      // Enhanced result validation
      if (result && result.summary) {
        console.log('Save confirmed successful:', {
          created: result.summary.created,
          updated: result.summary.updated,
          total_processed: result.summary.total_processed,
          progress: result.checklist_status?.progress_percentage
        });

        if (!isAutoSave) {
          setSuccessMessage(`Checklist saved successfully (${result.summary.total_processed} responses updated)`);
          setTimeout(() => setSuccessMessage(''), 3000);

          if (onSave) {
            console.log('Calling parent onSave handler...');
            await onSave(responses, isAutoSave);
          }
        } else {
          console.log('Auto-save completed successfully');
        }

        return { success: true, result };
      } else {
        console.warn('Save result missing expected structure:', result);
        return { success: true, result }; // Still consider it successful if we got any result
      }

    } catch (error) {
      console.error('=== SAVE OPERATION FAILED (ENHANCED) ===');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        isAutoSave,
        checklistId: selectedChecklist?.checklist_id,
        userId: currentUser?.id,
        responsesCount: Object.keys(responses).length
      });

      const errorMessage = error.message || 'Failed to save checklist. Please try again.';

      if (!isAutoSave) {
        setError(errorMessage);
      } else {
        console.warn('Auto-save failed:', errorMessage);
      }

      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, [selectedChecklist, currentUser, responses, items, formatResponseForAPI, mode, saving, onSave]);


  

  const handleSubmit = async () => {
    if (mode === 'view') return;

    // Prevent multiple simultaneous submissions
    if (submitting) {
      console.log('Submit already in progress, skipping...');
      return { success: false, reason: 'submit_in_progress' };
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('=== SUBMIT OPERATION STARTED (ENHANCED) ===');
      console.log('Checklist ID:', selectedChecklist?.checklist_id);
      console.log('User ID:', currentUser?.id || 'system'); // FIXED: Fallback to 'system'

      // First save all current responses
      console.log('=== SAVING BEFORE SUBMIT ===');
      const saveResult = await handleSave(false);

      if (!saveResult.success) {
        throw new Error(`Failed to save before submit: ${saveResult.error || saveResult.reason}`);
      }

      console.log('Save successful, proceeding with submission...');

      // Validate that we have the checklist ID
      if (!selectedChecklist?.checklist_id) {
        throw new Error('Checklist ID is required for submission');
      }

      // SIMPLIFIED SUBMISSION - Just like save but for submit endpoint
      console.log('=== CALLING SUBMIT API (SIMPLIFIED) ===');
      console.log('Endpoint: submitChecklist');
      console.log('Checklist ID:', selectedChecklist.checklist_id);
      console.log('User ID:', currentUser?.id || 'system');

      // Use the same pattern as save - just call the submit service
      const submitResult = await checklistService.submitChecklist(
        selectedChecklist.checklist_id,
        currentUser?.id || 'system' // FIXED: Always provide a user ID
      );

      console.log('=== SUBMIT API SUCCESSFUL ===');
      console.log('Submit result:', submitResult);

      // Show success message
      setSuccessMessage('Checklist submitted successfully! 🎉');

      // Call parent handler if provided
      if (onSubmit) {
        console.log('Calling parent onSubmit handler...');
        await onSubmit(responses);
      }

      // Navigate back or close form after short delay
      setTimeout(() => {
        if (onCancel) {
          console.log('Auto-closing form after successful submission');
          onCancel();
        }
      }, 2000);

      return { success: true, result: submitResult };

    } catch (error) {
      console.error('=== SUBMIT OPERATION FAILED (ENHANCED) ===');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        checklistId: selectedChecklist?.checklist_id,
        userId: currentUser?.id || 'system'
      });

      const errorMessage = error.message || 'Failed to submit checklist. Please try again.';
      setError(errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced auto-save setup with better error handling
  const setupAutoSave = () => {
    let autoSaveTimeout;
    let lastAutoSaveAttempt = 0;
    const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
    const MIN_AUTO_SAVE_INTERVAL = 5000; // Minimum 5 seconds between auto-saves

    const performAutoSave = async () => {
      const now = Date.now();

      // Throttle auto-save attempts
      if (now - lastAutoSaveAttempt < MIN_AUTO_SAVE_INTERVAL) {
        console.log('Auto-save throttled, too soon since last attempt');
        return;
      }

      // Check conditions for auto-save
      if (mode !== 'edit') {
        console.log('Skipping auto-save: not in edit mode');
        return;
      }

      if (saving || submitting) {
        console.log('Skipping auto-save: save/submit in progress');
        return;
      }

      if (Object.keys(responses).length === 0) {
        console.log('Skipping auto-save: no responses to save');
        return;
      }

      lastAutoSaveAttempt = now;
      console.log('Performing auto-save...');

      try {
        const result = await handleSave(true);
        if (result.success) {
          console.log('Auto-save successful');
        } else {
          console.warn('Auto-save failed:', result.reason || result.error);
        }
      } catch (error) {
        console.warn('Auto-save error:', error.message);
      }
    };

    const scheduleAutoSave = () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        performAutoSave();
        scheduleAutoSave(); // Schedule next auto-save
      }, AUTO_SAVE_INTERVAL);
    };

    // Start auto-save cycle
    scheduleAutoSave();

    // Return cleanup function
    return () => {
      clearTimeout(autoSaveTimeout);
    };
  };

  // Auto-save functionality (optional)
  useEffect(() => {
    if (mode === 'edit') {
      const cleanup = setupAutoSave();
      return cleanup;
    }
  }, [mode, responses, saving, submitting, handleSave]);


  // Initialize responses state from existing checklist data
  useEffect(() => {
    if (existingChecklist) {
      console.log('=== LOADING EXISTING CHECKLIST ===');
      console.log('Existing checklist:', existingChecklist);
      console.log('Existing responses:', existingChecklist.responses);

      if (existingChecklist.responses && existingChecklist.responses.length > 0) {
        console.log('Sample existing response:', existingChecklist.responses[0]);
        console.log('Response structure:', {
          item_id: existingChecklist.responses[0].item_id,
          yes_no_na_value: existingChecklist.responses[0].yes_no_na_value,
          text_value: existingChecklist.responses[0].text_value,
          remarks: existingChecklist.responses[0].remarks,
          table_data: existingChecklist.responses[0].table_data // Check for table_data
        });
      } else {
        console.log('No existing responses found');
      }
    }
  }, [existingChecklist]);

  // 4. FIXED: Enhanced response loading with better table data handling
  useEffect(() => {
    if (existingChecklist && existingChecklist.responses) {
      console.log('=== ENHANCED LOADING EXISTING RESPONSES ===');
      console.log('Loading existing responses:', existingChecklist.responses.length);

      const existingResponses = {};
      const completedItemsSet = new Set();

      existingChecklist.responses.forEach((response, index) => {
        if (!response.item_id) {
          console.warn(`Response ${index} missing item_id:`, response);
          return;
        }

        // Validate item exists in current template
        const itemExists = items.some(item => item.item_id === response.item_id);
        if (!itemExists) {
          console.warn(`Response for unknown item_id: ${response.item_id} (skipping)`);
          return;
        }

        console.log(`Processing response ${index} for ${response.item_id}:`, {
          yes_no_na_value: response.yes_no_na_value,
          text_value: response.text_value,
          date_value: response.date_value,
          remarks: response.remarks,
          table_data_type: typeof response.table_data,
          table_data_length: Array.isArray(response.table_data) ? response.table_data.length : 'not array'
        });

        let mainResponse = null;
        let hasAnyValue = false;

        // Handle standard response types
        if (response.yes_no_na_value !== null && response.yes_no_na_value !== undefined) {
          mainResponse = response.yes_no_na_value;
          hasAnyValue = true;
        } else if (response.text_value !== null && response.text_value !== undefined && response.text_value.trim() !== '') {
          mainResponse = response.text_value;
          hasAnyValue = true;
        } else if (response.date_value !== null && response.date_value !== undefined) {
          mainResponse = response.date_value;
          hasAnyValue = true;
        }

        // CRITICAL FIX: Enhanced table data loading
        let tableData = [];
        if (response.table_data) {
          try {
            if (Array.isArray(response.table_data)) {
              tableData = response.table_data;
            } else if (typeof response.table_data === 'string') {
              tableData = JSON.parse(response.table_data);
            } else if (typeof response.table_data === 'object') {
              tableData = [response.table_data];
            }

            // Validate and clean table data
            if (Array.isArray(tableData)) {
              tableData = tableData.map(row => {
                if (!row || typeof row !== 'object') return null;

                const cleanRow = {};
                Object.keys(row).forEach(key => {
                  if (!key.startsWith('_') && row[key] !== null && row[key] !== undefined && row[key] !== '' && row[key] !== false) { // Added false check
                    cleanRow[key] = row[key];
                  }
                });

                return Object.keys(cleanRow).length > 0 ? cleanRow : null;
              }).filter(row => row !== null);

              if (tableData.length > 0) {
                hasAnyValue = true;
                console.log(`✅ Loaded table data for ${response.item_id}:`, tableData);
              }
            }
          } catch (e) {
            console.warn(`Invalid table_data for item ${response.item_id}:`, e);
            tableData = [];
          }
        }

        // Check for remarks
        const hasRemarks = response.remarks && response.remarks.trim() !== '';
        if (hasRemarks) {
          hasAnyValue = true;
        }

        // Create comprehensive response object
        existingResponses[response.item_id] = {
          // Legacy compatibility
          response: mainResponse,

          // Specific field values
          yes_no_na_value: response.yes_no_na_value,
          text_value: response.text_value,
          date_value: response.date_value,
          remarks: response.remarks || '',
          comments: response.remarks || '', // Alias

          // CRITICAL FIX: Enhanced table data
          table_data: tableData,

          // Metadata
          timestamp: response.updated_at || response.created_at,
          response_id: response.response_id,
          evidence_provided: Boolean(response.evidence_provided)
        };

        // Mark as completed if has meaningful data
        if (hasAnyValue) {
          completedItemsSet.add(response.item_id);
          console.log(`✅ Marking ${response.item_id} as completed:`, {
            mainResponse,
            hasRemarks,
            tableDataLength: tableData.length,
            evidence: response.evidence_provided
          });
        }
      });

      console.log('=== ENHANCED SETTING STATE ===');
      console.log('Setting responses for', Object.keys(existingResponses).length, 'items');
      console.log('Setting completed items:', Array.from(completedItemsSet));

      setResponses(existingResponses);
      setCompletedItems(completedItemsSet);

      // Debug verification
      setTimeout(() => {
        console.log('=== ENHANCED STATE VERIFICATION ===');
        console.log('Responses state keys:', Object.keys(existingResponses));
        console.log('Completed items state:', Array.from(completedItemsSet));

        // Check table responses specifically
        const tableResponses = Object.entries(existingResponses).filter(([itemId, resp]) =>
          resp.table_data && resp.table_data.length > 0
        );

        if (tableResponses.length > 0) {
          console.log('🎯 ENHANCED Table responses loaded:');
          tableResponses.forEach(([itemId, resp]) => {
            console.log(`   ${itemId}: ${resp.table_data.length} rows`, resp.table_data);
          });
        }
      }, 100);
    }
  }, [existingChecklist, items]);

  // Add this effect to monitor state changes
  useEffect(() => {
    console.log('=== STATE CHANGE ===');
    console.log('Responses updated:', Object.keys(responses).length, 'items');
    console.log('Completed items:', completedItems.size);

    // Log any responses that have values
    const responsesWithValues = Object.entries(responses).filter(([itemId, resp]) => {
      const item = items.find(i => i.item_id === itemId);
      if (item?.response_type === 'table') {
        return resp.table_data && resp.table_data.length > 0;
      }
      return resp.yes_no_na_value || resp.text_value || resp.date_value || (resp.remarks && resp.remarks.trim() !== '');
    });
    console.log('Responses with values:', responsesWithValues.length);

    if (responsesWithValues.length > 0) {
      console.log('Sample responses with values:', responsesWithValues.slice(0, 3));
    }
  }, [responses, completedItems, items]);

  // Also add this debug info to see what's happening with table fields
  useEffect(() => {
    console.log('=== ITEMS DEBUG ===');
    items.forEach((item, index) => {
      console.log(`Item ${index}:`, {
        item_id: item.item_id,
        response_type: item.response_type,
        section_name: item.section_name,
        description: item.description,
        table_structure: item.table_structure ? 'HAS TABLE STRUCTURE' : 'NO TABLE STRUCTURE'
      });
    });
  }, [items]);


  const stats = getProgress(); // Use the new getProgress function

  // FIXED: Enhanced input validation helpers
  const validateInput = {
    number: (value) => {
      if (value === '' || value === null || value === undefined) return '';
      const numStr = String(value);
      // Allow partial numbers during typing
      if (/^-?(\d*\.?\d*)$/.test(numStr)) return numStr;
      return '';
    },

    date: (value) => {
      if (value === '' || value === null || value === undefined) return '';
      const dateStr = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return dateStr;
      }
      return '';
    },

    text: (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    }
  };

  // FIXED: Enhanced date input renderer with validation
  const renderDateInput = (item, value, disabled) => {
    const getFieldError = (itemId) => errors[itemId];
    const validatedValue = validateInput.date(value);

    return (
      <div className="checklist-form-response-field">
        <input
          type="date"
          value={validatedValue}
          onChange={(e) => {
            const dateValue = e.target.value;
            console.log(`Date input change: "${dateValue}"`);

            // Only update if valid or empty
            if (dateValue === '' || validateInput.date(dateValue) === dateValue) {
              handleResponseChange(item.item_id, 'date_value', dateValue);
            } else {
              console.warn(`Invalid date value rejected: "${dateValue}"`);
            }
          }}
          disabled={disabled}
          className={getFieldError(item.item_id) ? 'error' : ''}
          min="1900-01-01"
          max="2099-12-31"
        />
        {getFieldError(item.item_id) && (
          <span className="checklist-form-error-text">{getFieldError(item.item_id)}</span>
        )}
      </div>
    );
  };

  // FIXED: Enhanced text input with validation
  const renderTextInput = (item, value, disabled) => {
    const getFieldError = (itemId) => errors[itemId];
    const validatedValue = validateInput.text(value);

    return (
      <div className="checklist-form-response-field">
        <textarea
          value={validatedValue}
          onChange={(e) => {
            const textValue = e.target.value;
            handleResponseChange(item.item_id, 'text_value', textValue);
          }}
          placeholder="Enter response..."
          rows={3}
          disabled={disabled}
          className={getFieldError(item.item_id) ? 'error' : ''}
        />
        {getFieldError(item.item_id) && (
          <span className="checklist-form-error-text">{getFieldError(item.item_id)}</span>
        )}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="dashboard-container checklist-form-container">
        <div className="checklist-loading-container">
          <div className="checklist-loading-spinner"></div>
          <div className="checklist-loading-text">Loading Maritime Checklist...</div>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Update your yes/no/na rendering in CompactChecklistItem
  // Replace the yes/no rendering section with this:
  const renderYesNoNaField = (item, currentValue, disabled) => {
    console.log(`🎯 Rendering Yes/No/NA for ${item.item_id}, current value:`, currentValue);

    return (
      <div className="yes-no-na-container">
        <div className="yes-no-na-buttons">
          {['Yes', 'No', 'N/A'].map((option) => (
            <label key={option} className={`yes-no-na-option ${currentValue === option ? 'selected' : ''}`}>
              <input
                type="radio"
                name={`${item.item_id}_yes_no_na`}
                value={option}
                checked={currentValue === option}
                onChange={(e) => {
                  console.log(`🔘 Yes/No/NA change: ${item.item_id} = ${e.target.value}`);
                  handleResponseChange(item.item_id, 'yes_no_na_value', e.target.value);
                }}
                disabled={disabled}
                className="yes-no-na-radio"
              />
              <span className={`yes-no-na-label ${option.toLowerCase().replace('/', '-')}`}>
                {option}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  // 5. FIXED: Enhanced table field rendering
  const renderResponseField = (item) => {
    const response = responses[item.item_id] || {};
    const hasError = errors[item.item_id];
    const isReadonly = mode === 'view';

    console.log('ENHANCED Rendering field:', item.item_id, 'Type:', item.response_type, 'Current value:', {
      table_data_length: response.table_data?.length || 0,
      yes_no_na_value: response.yes_no_na_value,
      text_value: response.text_value,
      date_value: response.date_value
    });

    switch (item.response_type) {
      case 'yes_no_na':
        return (
          <div className="checklist-form-response-field">
            {renderYesNoNaField(item, response.yes_no_na_value, isReadonly)}
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      case 'text':
        return renderTextInput(item, response.text_value, isReadonly);

      case 'date':
        return renderDateInput(item, response.date_value, isReadonly);

      case 'table':
        console.log(`🎯 ENHANCED Rendering table for ${item.item_id}:`, {
          currentTableData: response.table_data,
          tableStructure: item.table_structure
        });

        return (
          <div className="checklist-form-response-field">
            <DynamicTable
              item={item}
              value={response.table_data || []}
              onChange={(tableData) => {
                console.log(`📊 ENHANCED Table change for ${item.item_id}:`, tableData);
                handleResponseChange(item.item_id, 'table_data', tableData);
              }}
              disabled={isReadonly}
              hasError={!!hasError}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      default:
        return (
          <div className="checklist-form-response-field">
            <div style={{
              padding: '12px',
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              color: '#856404'
            }}>
              <strong>Unknown field type:</strong> {item.response_type}
              <br/>
              <small>Item ID: {item.item_id}</small>
            </div>
            <input
              type="text"
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );
    }
  };


  return (
    <div className="dashboard-container" style={{ background: 'var(--background-light)', minHeight: '100%' }}>
      {/* Add this CSS for the animation (put in your component or CSS file) */}
      <style jsx>{`
        /* Variables for consistent light theme */
        :root {
          --form-bg-light: var(--background-light, #f8f9fa);
          --form-card-bg: var(--card-bg-light, #ffffff);
          --form-border-light: var(--border-light, #e2e8f0);
          --form-text-dark: var(--text-dark, #1e293b);
          --form-text-muted: var(--text-muted-light, #64748b);
          --form-primary-color: var(--checklist-primary, #3498DB);
          --form-success-color: var(--checklist-success, #10b981);
          --form-danger-color: var(--checklist-danger, #ef4444);
          --form-warning-color: var(--checklist-warning, #F39C12);
          --form-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
          --form-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Global Form Styles */
        .dashboard-container {
          background: var(--form-bg-light);
          color: var(--form-text-dark);
          display: flex;
          flex-direction: column;
          height: 100%; /* Ensure it takes full height of its parent (modal body) */
        }

        /* Header */
        .dashboard-header {
          background: var(--form-card-bg);
          border-bottom: 1px solid var(--form-border-light);
          padding: 12px 20px; /* Slightly more padding */
          box-shadow: var(--form-shadow-sm);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0; /* Prevent shrinking */
        }

        .dashboard-title {
          display: flex;
          align-items: center;
          gap: 16px; /* Increased gap */
        }

        .dashboard-title h1 {
          margin: 0;
          font-size: 18px; /* Slightly larger title */
          font-weight: 700; /* Bolder */
          color: var(--form-text-dark);
        }

        .dashboard-title .vessel-info-compact {
          display: flex;
          align-items: center;
          gap: 16px; /* Increased gap */
          font-size: 13px; /* Slightly larger font */
          color: var(--form-text-muted);
        }

        .dashboard-title .vessel-info-compact span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dashboard-controls {
          display: flex;
          align-items: center;
          gap: 12px; /* Increased gap */
        }

        .dashboard-controls .progress-display {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600; /* Bolder */
          color: var(--form-text-dark);
        }

        .dashboard-controls .progress-circle {
          width: 44px; /* Slightly larger circle */
          height: 44px;
          position: relative;
        }

        .dashboard-controls .progress-circle svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .dashboard-controls .progress-circle path {
          stroke-width: 3; /* Thicker stroke */
        }

        .dashboard-controls .progress-circle .bg-path {
          stroke: var(--form-border-light);
        }

        .dashboard-controls .progress-circle .fill-path {
          stroke: var(--form-primary-color);
        }

        .dashboard-controls button {
          padding: 8px 16px; /* Larger buttons */
          border-radius: 8px; /* More rounded */
          font-size: 13px; /* Slightly larger font */
          font-weight: 600; /* Bolder */
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .dashboard-controls button.save-btn {
          background: var(--form-card-bg);
          border: 1px solid var(--form-border-light);
          color: var(--form-text-dark);
        }

        .dashboard-controls button.save-btn:hover:not(:disabled) {
          background: var(--form-border-light);
          transform: translateY(-1px);
          box-shadow: var(--form-shadow-sm);
        }

        .dashboard-controls button.submit-btn {
          background: var(--form-success-color);
          border: 1px solid var(--form-success-color);
          color: white;
        }

        .dashboard-controls button.submit-btn:hover:not(:disabled) {
          background: #0e9f6e; /* Darker green on hover */
          border-color: #0e9f6e;
          transform: translateY(-1px);
          box-shadow: var(--form-shadow-sm);
        }

        .dashboard-controls button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Filter Bar */
        .filter-bar {
          background: var(--form-card-bg);
          border-bottom: 1px solid var(--form-border-light);
          padding: 10px 20px; /* More padding */
          display: flex;
          align-items: center;
          gap: 12px; /* Increased gap */
          flex-wrap: wrap;
          box-shadow: var(--form-shadow-sm);
          z-index: 5; /* Ensure it's above content when scrolling */
        }

        .filter-bar .search-input-wrapper {
          position: relative;
          flex: 1;
          min-width: 220px; /* Increased min-width */
        }

        .filter-bar .search-input-wrapper input {
          width: 100%;
          padding: 6px 12px 6px 36px; /* Adjusted padding for icon */
          border: 1px solid var(--form-border-light);
          border-radius: 6px; /* More rounded */
          font-size: 13px; /* Slightly larger font */
          height: 32px; /* Consistent height */
          background: var(--form-bg-light); /* Subtle background */
          color: var(--form-text-dark);
          transition: all 0.2s ease;
        }

        .filter-bar .search-input-wrapper input:focus {
          outline: none;
          border-color: var(--form-primary-color);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        .filter-bar .search-input-wrapper svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--form-text-muted);
        }

        .filter-bar select {
          padding: 6px 12px;
          border: 1px solid var(--form-border-light);
          border-radius: 6px;
          font-size: 13px;
          height: 32px;
          background: var(--form-bg-light);
          color: var(--form-text-dark);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-bar select:focus {
          outline: none;
          border-color: var(--form-primary-color);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        .filter-bar .mandatory-toggle-btn {
          padding: 6px 12px;
          border: 1px solid var(--form-border-light);
          border-radius: 6px;
          font-size: 13px;
          height: 32px;
          background: var(--form-card-bg);
          color: var(--form-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-bar .mandatory-toggle-btn.active {
          background: var(--form-danger-color);
          color: white;
          border-color: var(--form-danger-color);
        }

        .filter-bar .mandatory-toggle-btn:hover:not(.active) {
          background: var(--form-border-light);
        }

        .filter-bar .progress-summary {
          display: flex;
          gap: 8px; /* Increased gap */
          font-size: 12px; /* Slightly larger font */
          color: var(--form-text-muted);
          font-weight: 500;
        }

        /* Main Content - Two Column Layout */
        .main-content-layout {
          display: flex;
          flex: 1; /* Takes remaining height */
          overflow: hidden; /* Ensures internal scrolling */
        }

        /* Left Sidebar - Section Navigation */
        .section-sidebar {
          width: 300px; /* Wider sidebar */
          background: var(--form-card-bg);
          border-right: 1px solid var(--form-border-light);
          overflow-y: auto;
          padding: 12px; /* More padding */
          flex-shrink: 0; /* Prevent shrinking */
          box-shadow: var(--form-shadow-sm);
        }

        .section-item {
          margin-bottom: 6px; /* Slightly more space */
        }

        .section-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px; /* More padding */
          cursor: pointer;
          border-radius: 8px; /* More rounded */
          background: transparent;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .section-item-header:hover {
          background: var(--form-bg-light);
          border-color: var(--form-border-light);
        }

        .section-item-header.expanded {
          background: var(--form-bg-light);
          border-color: var(--form-primary-color); /* Highlight expanded section */
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        .section-item-header .icon-wrapper {
          width: 32px; /* Larger icon wrapper */
          height: 32px;
          border-radius: 6px; /* Square-ish rounded */
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .section-item-header .section-info {
          flex: 1;
          margin-left: 12px; /* More space */
        }

        .section-item-header .section-name {
          font-size: 14px; /* Larger font */
          font-weight: 600;
          color: var(--form-text-dark);
        }

        .section-item-header .item-count {
          font-size: 11px;
          color: var(--form-text-muted);
        }

        .section-item-header .progress-percent {
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
        }

        .section-progress-bar {
          height: 3px; /* Thicker progress bar */
          background: var(--form-border-light);
          margin: 4px 10px 6px; /* Adjusted margins */
          border-radius: 2px;
          overflow: hidden;
        }

        .section-progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .subsection-item {
          margin-left: 24px; /* Deeper indentation */
          margin-bottom: 4px;
        }

        .subsection-item-label {
          padding: 6px 10px;
          font-size: 11px;
          color: var(--form-text-muted);
          background: var(--form-bg-light);
          border-radius: 6px;
          border: 1px solid var(--form-border-light);
          font-weight: 500;
        }

        /* Right Content - Checklist Items */
        .checklist-items-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px; /* More padding */
          background: var(--form-bg-light);
        }

        .checklist-section-group {
          margin-bottom: 20px; /* More space between sections */
        }

        .checklist-section-group h3 {
          margin: 0 0 12px 0; /* More space below header */
          font-size: 16px; /* Larger font */
          font-weight: 700; /* Bolder */
          color: var(--form-text-dark);
          padding: 10px 16px; /* More padding */
          background: var(--form-card-bg);
          border-radius: 8px; /* More rounded */
          border: 1px solid var(--form-border-light);
          box-shadow: var(--form-shadow-sm);
        }

        .checklist-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); /* Adjusted min-width for items */
          gap: 10px; /* More gap between items */
        }

        /* CompactChecklistItem Styles */
        .compact-checklist-item {
          background: var(--form-card-bg);
          border: 1px solid var(--form-border-light);
          border-radius: 8px; /* More rounded */
          padding: 12px; /* More padding */
          position: relative;
          transition: all 0.2s ease;
          box-shadow: var(--form-shadow-sm);
        }

        .compact-checklist-item.completed {
          border-color: var(--form-success-color);
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
        }

        .compact-checklist-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--form-shadow-md);
        }

        .compact-checklist-item .mandatory-corner {
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-left: 12px solid transparent; /* Larger corner */
          border-top: 12px solid var(--form-danger-color); /* Red for mandatory */
          border-top-right-radius: 8px; /* Match item border radius */
        }

        .compact-checklist-item .item-header-row {
          display: flex;
          align-items: flex-start;
          gap: 10px; /* More gap */
          margin-bottom: 8px; /* More space below header */
        }

        .compact-checklist-item .item-description {
          flex: 1;
          font-size: 13px; /* Slightly larger font */
          font-weight: 600; /* Bolder */
          color: var(--form-text-dark);
          line-height: 1.5; /* Better line height */
        }

        .compact-checklist-item .item-description div {
          margin-top: 4px; /* Space between lines in formatted description */
        }

        .compact-checklist-item .item-description strong {
          color: var(--form-primary-color); /* Highlight numbering */
        }

        .compact-checklist-item .item-pic {
          font-size: 11px; /* Slightly larger font */
          color: var(--form-text-muted);
          display: flex;
          align-items: center;
          gap: 4px; /* More gap */
          flex-shrink: 0;
          margin-top: 2px;
        }

        .compact-checklist-item .completion-icon {
          color: var(--form-success-color);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checklist-form-response-field {
          margin-top: 10px; /* More space above response field */
        }

        .checklist-form-response-field input,
        .checklist-form-response-field textarea {
          width: 100%;
          background: var(--form-bg-light); /* Light background for inputs */
          border: 1px solid var(--form-border-light);
          border-radius: 6px; /* More rounded */
          padding: 8px 12px;
          color: var(--form-text-dark);
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .checklist-form-response-field input:focus,
        .checklist-form-response-field textarea:focus {
          outline: none;
          border-color: var(--form-primary-color);
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }

        .checklist-form-response-field input.error,
        .checklist-form-response-field textarea.error {
          border-color: var(--form-danger-color);
        }

        .checklist-form-response-field input:disabled,
        .checklist-form-response-field textarea:disabled {
          background: var(--form-border-light); /* Disabled background */
          cursor: not-allowed;
          opacity: 0.8;
        }

        .checklist-form-error-text {
          color: var(--form-danger-color);
          font-size: 11px;
          margin-top: 4px;
          display: block;
        }

        .item-action-buttons {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
          margin-top: 10px; /* More space */
        }

        .item-action-buttons button {
          padding: 4px 8px; /* Slightly larger */
          background: var(--form-bg-light);
          border: 1px solid var(--form-border-light);
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px; /* Slightly larger */
          color: var(--form-text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .item-action-buttons button:hover {
          background: var(--form-border-light);
          color: var(--form-text-dark);
        }

        /* Expandable Details */
        .expandable-details {
          margin-top: 12px; /* More space */
          padding: 10px; /* More padding */
          background: var(--form-bg-light);
          border-radius: 6px;
          border: 1px solid var(--form-border-light);
        }

        .expandable-details .detail-label {
          font-size: 10px; /* Slightly larger */
          color: var(--form-text-muted);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .expandable-details .detail-content {
          font-size: 11px; /* Slightly larger */
          color: var(--form-text-dark);
          line-height: 1.4;
        }

        .expandable-details textarea {
          background: var(--form-card-bg); /* White background for comments */
        }

        .expandable-details .additional-actions {
          display: flex;
          gap: 6px; /* More space */
          justify-content: flex-end;
          margin-top: 10px;
        }

        .expandable-details .additional-actions button {
          padding: 4px 8px;
          background: var(--form-card-bg);
          border: 1px solid var(--form-border-light);
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          color: var(--form-text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }

        .expandable-details .additional-actions button:hover {
          background: var(--form-bg-light);
          color: var(--form-text-dark);
        }

        .response-timestamp {
          font-size: 9px; /* Slightly larger */
          color: var(--form-text-muted);
          margin-top: 6px;
          text-align: right;
        }

        /* Yes/No/NA Buttons */
        .yes-no-na-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .yes-no-na-buttons {
          display: flex;
          gap: 6px; /* More space between buttons */
        }
        .yes-no-na-option {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 13px; /* Larger font */
          color: var(--form-text-dark);
          border: 1px solid var(--form-border-light);
          border-radius: 6px; /* More rounded */
          padding: 6px 12px; /* More padding */
          transition: all 0.2s ease;
          background: var(--form-bg-light); /* Light background */
        }
        .yes-no-na-option.selected {
          background-color: var(--form-primary-color);
          color: white;
          border-color: var(--form-primary-color);
          box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
        }
        .yes-no-na-option:hover:not(.selected) {
          background-color: var(--form-border-light);
        }
        .yes-no-na-radio {
          display: none; /* Hide native radio button */
        }
        .yes-no-na-label {
          font-weight: 600; /* Bolder */
        }
        .yes-no-na-label.yes {
          color: var(--form-success-color); /* Green for Yes */
        }
        .yes-no-na-label.no {
          color: var(--form-danger-color); /* Red for No */
        }
        .yes-no-na-label.n-a {
          color: var(--form-text-muted); /* Gray for N/A */
        }
        .yes-no-na-option.selected .yes-no-na-label {
          color: white; /* White text when selected */
        }

        /* Error/Success Display */
        .error-success-display {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 90%;
          max-width: 600px;
        }

        .error-message-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px; /* More rounded */
          padding: 16px 20px; /* More padding */
          margin-bottom: 12px; /* More margin */
          color: var(--form-danger-color);
          display: flex;
          align-items: flex-start;
          gap: 12px; /* More gap */
          animation: slideDown 0.3s ease-out;
          box-shadow: var(--form-shadow-sm);
        }

        .error-message-box .error-title {
          font-weight: 600;
          margin-bottom: 6px;
        }

        .error-message-box .error-text {
          font-size: 14px;
          white-space: pre-line;
        }

        .error-message-box .close-btn {
          background: none;
          border: none;
          color: var(--form-danger-color);
          cursor: pointer;
          font-size: 20px; /* Larger X */
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .error-message-box .close-btn:hover {
          opacity: 0.7;
        }

        .success-message-box {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          padding: 16px 20px;
          color: var(--form-success-color);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
          box-shadow: var(--form-shadow-sm);
        }

        .success-message-box .success-text {
          font-weight: 600;
        }

        /* Responsive Adjustments */
        @media (max-width: 1024px) {
          .section-sidebar {
            width: 250px; /* Slightly narrower sidebar */
          }
          .checklist-items-grid {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); /* Adjust for smaller screens */
          }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
          }
          .dashboard-controls {
            width: 100%;
            justify-content: flex-end;
          }
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
            padding: 10px 16px;
          }
          .filter-bar .search-input-wrapper {
            min-width: unset;
          }
          .main-content-layout {
            flex-direction: column;
            height: auto; /* Allow content to dictate height */
          }
          .section-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--form-border-light);
            padding: 12px 16px;
            box-shadow: none;
          }
          .checklist-items-content {
            padding: 12px 16px;
          }
          .checklist-items-grid {
            grid-template-columns: 1fr; /* Single column on small screens */
          }
          .compact-checklist-item {
            padding: 10px;
          }
          .yes-no-na-buttons {
            flex-wrap: wrap; /* Allow buttons to wrap */
          }
        }
      `}</style>

      <ErrorSuccessDisplay
        error={error}
        successMessage={successMessage}
        onClearError={() => setError(null)}
      />

      {/* Compact Header */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <button onClick={onCancel} className="control-btn" style={{ padding: '4px' }}>
            <ArrowLeft size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={20} style={{ color: 'var(--form-primary-color)' }} />
            <div>
              <h1>
                {template?.name || 'Maritime Checklist'}
              </h1>
              <div className="vessel-info-compact">
                <span><Ship size={12} /> {vessel?.vessel_name || 'Unknown Vessel'}</span>
                <span>IMO: {vessel?.imo_no || 'Unknown'}</span>
                <span><Clock size={12} /> {currentTime.toLocaleTimeString()}</span>
                <span className={`badge ${mode === 'view' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                  {mode === 'view' ? 'READ ONLY' : 'EDITING'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-controls">
          <div className="progress-display">
            <span>{stats.percentage}%</span>
            <div className="progress-circle">
              <svg viewBox="0 0 36 36">
                <path
                  className="bg-path"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                />
                <path
                  className="fill-path"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeDasharray={`${stats.percentage}, 100`}
                />
              </svg>
            </div>
          </div>

          {mode === 'edit' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="save-btn"
              >
                {saving ? <RefreshCw size={12} className="spinning" /> : <Save size={12} />}
                Save
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="submit-btn"
              >
                {submitting ? <RefreshCw size={12} className="spinning" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Compact Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search checklist items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterPIC}
          onChange={(e) => setFilterPIC(e.target.value)}
        >
          <option value="all">All Personnel</option>
          {uniquePICs.map(pic => (
            <option key={pic} value={pic}>{pic}</option>
          ))}
        </select>

        <button
          onClick={() => setShowOnlyMandatory(!showOnlyMandatory)}
          className={`mandatory-toggle-btn ${showOnlyMandatory ? 'active' : ''}`}
        >
          <Filter size={12} />
          {showOnlyMandatory ? 'Mandatory Only' : 'Show All'}
        </button>

        <div className="progress-summary">
          <span>{stats.completed}/{stats.total} Complete</span>
          <span>•</span>
          <span>{stats.mandatoryCompleted}/{stats.mandatory} Mandatory</span>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="main-content-layout">

        {/* Left Sidebar - Section Navigation */}
        <div className="section-sidebar">
          {sections.map((section, sectionIndex) => {
            const sectionItems = section.items || [];
            const completedCount = sectionItems.filter(item => completedItems.has(item.item_id)).length;
            const progress = sectionItems.length > 0 ? (completedCount / sectionItems.length) * 100 : 0;
            const isExpanded = expandedSections.has(section.section_id);

            return (
              <div key={`sidebar_${section.section_id}_${sectionIndex}`} className="section-item">
                <div
                  onClick={() => toggleSection(section.section_id)}
                  className={`section-item-header ${isExpanded ? 'expanded' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="icon-wrapper" style={{
                      background: section.color + '20',
                      color: section.color
                    }}>
                      {section.icon}
                    </div>
                    <div className="section-info">
                      <div className="section-name">{section.section_name}</div>
                      <div className="item-count">
                        {completedCount}/{sectionItems.length} items
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="progress-percent" style={{ color: section.color }}>
                      {Math.round(progress)}%
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="section-progress-bar">
                  <div
                    className="section-progress-fill"
                    style={{
                      background: section.color,
                      width: `${progress}%`,
                    }}
                  />
                </div>

                {/* Subsections */}
                {isExpanded && section.subsections?.map((subsection, subIndex) => (
                  <div key={`sidebar_sub_${section.section_id}_${subIndex}`} className="subsection-item">
                    <div className="subsection-item-label">
                      {subsection.subsection_name} ({subsection.items?.length || 0})
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right Content - Checklist Items */}
        <div className="checklist-items-content">
          {sections.filter(section => expandedSections.has(section.section_id)).map((section) => (
            <div key={`section_${section.section_id}`} className="checklist-section-group">
              {section.subsections?.map((subsection, subsectionIndex) => (
                <div key={`${section.section_id}_${subsection.id}_${subsectionIndex}`} style={{ marginBottom: '16px' }}>
                  <h3>
                    {subsection.subsection_name}
                  </h3>

                  {/* Grid Layout for Items */}
                  <div className="checklist-items-grid">
                    {(subsection.items || []).map((item, itemIndex) => (
                      <CompactChecklistItem
                        key={`${item.item_id}_${itemIndex}`}
                        item={item}
                        responses={responses}
                        isCompleted={completedItems.has(item.item_id)}
                        onResponse={handleResponseChange} // Keep this for the old button logic
                        onResponseChange={handleResponseChange} // New prop for updated fields
                        categoryConfig={categoryConfig}
                        mode={mode}
                        renderResponseField={renderResponseField} // Pass the new render function
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Ultra Compact Checklist Item Component with formatted description
const CompactChecklistItem = ({ item, responses, isCompleted, onResponse, onResponseChange, categoryConfig, mode, renderResponseField }) => {
  const [showDetails, setShowDetails] = useState(false);
  const response = responses[item.item_id] || {};

  // Format description with proper numbering and line breaks
  const formatDescription = (description) => {
    if (!description) return 'No description available';

    // Replace common patterns like "na)", "nb)", "a)", "b)" etc. with proper formatting
    let formatted = description
      // Replace patterns like "na)", "nb)", "nc)" with "a)", "b)", "c)"
      .replace(/n([a-z])\)/g, '\n$1)')
      // Replace patterns like "ta)", "tb)" with "a)", "b)"
      .replace(/t([a-z])\)/g, '\n$1)')
      // Replace standalone patterns like "a)", "b)", "c)" with line breaks
      .replace(/([a-z])\)/g, '\n$1)')
      // Replace numbered patterns like "1)", "2)", "3)"
      .replace(/(\d+)\)/g, '\n$1)')
      // Clean up multiple line breaks
      .replace(/\n+/g, '\n')
      // Trim whitespace
      .trim();

    // Split into lines and format each
    const lines = formatted.split('\n').filter(line => line.trim());

    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Check if line starts with a letter followed by ) or number followed by )
      if (/^[a-z]\)/.test(trimmedLine) || /^\d+\)/.test(trimmedLine)) {
        return (
          <div key={index} style={{
            marginLeft: '12px',
            marginTop: index > 0 ? '4px' : '0',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: 'var(--form-primary-color)' }}>{trimmedLine.match(/^[a-z0-9]\)/)[0]}</strong>
            <span style={{ marginLeft: '4px' }}>{trimmedLine.replace(/^[a-z0-9]\)\s*/, '')}</span>
          </div>
        );
      }

      return (
        <div key={index} style={{
          marginTop: index > 0 ? '4px' : '0',
          fontSize: '12px',
          lineHeight: '1.4',
          fontWeight: index === 0 ? '500' : '400'
        }}>
          {trimmedLine}
        </div>
      );
    });
  };

  return (
    <div className={`compact-checklist-item ${isCompleted ? 'completed' : ''}`}>

      {/* Mandatory Corner */}
      {item.is_mandatory && (
        <div className="mandatory-corner" />
      )}

      {/* Main Content Row */}
      <div className="item-header-row">

        {/* Check Description - Now takes full width without category badge */}
        <div className="item-description">
          {formatDescription(item.description)}
        </div>

        {/* PIC */}
        <div className="item-pic">
          <User size={10} />
          {item.pic}
        </div>

        {/* Completion Status */}
        {isCompleted && (
          <CheckCircle size={16} className="completion-icon" />
        )}
      </div>

      {/* Render the appropriate response field based on item.response_type */}
      {renderResponseField(item)}

      {/* Action Buttons */}
      <div className="item-action-buttons">
        <button
          onClick={() => setShowDetails(!showDetails)}
        >
          <MoreHorizontal size={10} />
          {showDetails ? 'Less' : 'More'}
        </button>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="expandable-details">

          {/* Guidance */}
          {item.guidance && (
            <div style={{ marginBottom: '6px' }}>
              <div className="detail-label">
                Guidance:
              </div>
              <div className="detail-content">
                {item.guidance}
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ marginBottom: '6px' }}>
            <div className="detail-label">
              Comments:
            </div>
            <textarea
              value={response.remarks || ''}
              onChange={(e) => onResponseChange(item.item_id, 'remarks', e.target.value)}
              disabled={mode === 'view'}
              placeholder="Add comments..."
            />
          </div>

          {/* Additional Actions */}
          <div className="additional-actions">
            <button>
              <Camera size={8} />
              Photo
            </button>

            <button>
              <FileText size={8} />
              Note
            </button>
          </div>

          {/* Response Timestamp */}
          {response.timestamp && (
            <div className="response-timestamp">
              Updated: {new Date(response.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ErrorSuccessDisplay Component
const ErrorSuccessDisplay = ({ error, successMessage, onClearError }) => {
  if (!error && !successMessage) return null;

  return (
    <div className="error-success-display">
      {error && (
        <div className="error-message-box">
          <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="error-title">Error</div>
            <div className="error-text">{error}</div>
          </div>
          <button
            onClick={onClearError}
            className="close-btn"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="success-message-box">
          <CheckCircle size={16} />
          <div className="success-text">{successMessage}</div>
        </div>
      )}
    </div>
  );
};

export default ModernChecklistForm;

// DEBUGGING: Add this function to test response saving
window.debugResponseSaving = function() {
  console.log('🔍 CURRENT RESPONSES STATE:');

  // Try to access the responses from React state
  const checklistElement = document.querySelector('[data-testid="checklist-form"]') ||
                          document.querySelector('.modern-checklist-form');

  if (checklistElement) {
    console.log('✅ Found checklist form element');

    // Check radio buttons
    const radioButtons = checklistElement.querySelectorAll('input[type="radio"]:checked');
    console.log(`🔘 Checked radio buttons: ${radioButtons.length}`);

    radioButtons.forEach((radio, index) => {
      console.log(`  ${index + 1}. ${radio.name} = ${radio.value}`);
    });

    // Check text inputs
    const textInputs = checklistElement.querySelectorAll('input[type="text"], textarea');
    const filledInputs = Array.from(textInputs).filter(input => input.value.trim() !== '');
    console.log(`📝 Filled text inputs: ${filledInputs.length}`);

    filledInputs.forEach((input, index) => {
      console.log(`  ${index + 1}. ${input.name || input.id} = ${input.value}`);
    });
  } else {
    console.log('❌ Could not find checklist form element');
  }

  return {
    radioButtons: document.querySelectorAll('input[type="radio"]:checked').length,
    textInputs: document.querySelectorAll('input[type="text"], textarea').length
  };
};

// DEBUGGING: Add this to test table data specifically
window.debugTableData = function() {
  console.log('🔍 DEBUGGING TABLE DATA...');

  // Check for table inputs in the DOM
  const tables = document.querySelectorAll('.dynamic-table');
  console.log(`📊 Found ${tables.length} dynamic tables`);

  tables.forEach((table, index) => {
    const rows = table.querySelectorAll('tbody tr.data-row');
    console.log(`  Table ${index}: ${rows.length} data rows`);

    rows.forEach((row, rowIndex) => {
      const inputs = row.querySelectorAll('input, select');
      const rowData = {};
      inputs.forEach(input => {
        if (input.value) {
          rowData[input.name || `field_${input.type}`] = input.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        console.log(`    Row ${rowIndex}:`, rowData);
      }
    });
  });

  return { tablesFound: tables.length };
};

// DEBUGGING: Add these window functions for enhanced debugging
window.debugEnhancedTableData = function() {
  console.log('🔍 === ENHANCED TABLE DATA DEBUG ===');

  // Check current React state
  const checklistElement = document.querySelector('.dashboard-container');
  if (checklistElement) {
    const reactFiber = Object.keys(checklistElement).find(key =>
      key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber')
    );

    if (reactFiber) {
      console.log('⚛️ Found React state');
      // Try to extract responses state
      let currentFiber = checklistElement[reactFiber];
      let attempts = 0;

      while (currentFiber && attempts < 10) {
        if (currentFiber.memoizedState) {
          console.log(`🎯 Found state at level ${attempts}:`, currentFiber.memoizedState);
        }
        currentFiber = currentFiber.return;
        attempts++;
      }
    }
  }

  // Check DOM table data
  const tables = document.querySelectorAll('.dynamic-table');
  console.log(`📊 Found ${tables.length} tables in DOM`);

  tables.forEach((table, index) => {
    const container = table.closest('.dynamic-table-container');
    const title = container?.querySelector('.table-title')?.textContent || `Table ${index}`;
    console.log(`\n📋 ${title}:`);

    const rows = table.querySelectorAll('tbody tr.data-row');
    console.log(`   ${rows.length} data rows`);

    rows.forEach((row, rowIndex) => {
      const rowData = {};
      const inputs = row.querySelectorAll('input, select');
      inputs.forEach(input => {
        if (input.value) {
          rowData[input.name || `field_${input.type}`] = input.value;
        }
      });

      if (Object.keys(rowData).length > 0) {
        console.log(`   Row ${rowIndex}:`, rowData);
      }
    });
  });

  console.log('\n🔍 === ENHANCED TABLE DATA DEBUG ENDED ===');
};

console.log('🎯 Enhanced table data handling loaded!');
console.log('📋 New debugging function: window.debugEnhancedTableData()');