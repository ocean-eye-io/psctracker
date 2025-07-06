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
import checklistService from '../../../../services/checklistService'; // <--- THIS IS THE CRITICAL CHANGE

// 1. Import the DynamicTable component at the top
import DynamicTable from './DynamicTable';
import './DynamicTable.css';

// Make sure you have these imports in ModernChecklistForm.jsx
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
          remarks: itemResponse.remarks || itemResponse.comments || '',
          // ADD TABLE DATA HANDLING
          table_data: originalItem.response_type === 'table' ? (itemResponse.table_data || []) : null,
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
  currentUser = { id: "user123", name: "John Doe" }, // Added id for currentUser
  mode = 'edit',
  selectedChecklist = { checklist_id: 'chk123' } // Added selectedChecklist for handlers
}) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [expandedSections, setExpandedSections] = useState(new Set(['deck']));
  const [responses, setResponses] = useState({});
  const [completedItems, setCompletedItems] = new useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPIC, setFilterPIC] = useState('all');
  const [showOnlyMandatory, setShowOnlyMandatory] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = new Set(); // Changed to new Set() directly
  const [viewMode, setViewMode] = useState('compact'); // compact, detailed

  // Add these state variables for error/success display
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({}); // State for field-specific errors

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

  // FIXED: Enhanced handleResponseChange with better validation
  const handleResponseChange = useCallback((itemId, field, value) => {
    console.log(`📝 Response change: ${itemId} ${field}`, value, typeof value);

    // CRITICAL FIX: Validate and sanitize input values based on field type
    const sanitizeValue = (fieldType, rawValue) => {
      if (rawValue === null || rawValue === undefined) {
        return null;
      }

      switch (fieldType) {
        case 'yes_no_na_value':
          // Only allow valid yes/no/na values
          const validYesNoNa = ['Yes', 'No', 'N/A', null];
          return validYesNoNa.includes(rawValue) ? rawValue : null;

        case 'text_value':
          // Convert to string, allow empty
          return rawValue === '' ? '' : String(rawValue);

        case 'date_value':
          // Validate date format (YYYY-MM-DD) or empty
          if (rawValue === '' || rawValue === null) return null;
          const dateStr = String(rawValue);
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // Validate it's a real date
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return dateStr;
            }
          }
          console.warn(`Invalid date format for ${itemId}:`, rawValue);
          return null;

        case 'table_data':
          // Validate table data structure
          if (!rawValue) return [];
          if (Array.isArray(rawValue)) {
            // Clean the table data
            return rawValue.filter(row => {
              if (!row || typeof row !== 'object') return false;
              // Check if row has at least one meaningful value
              return Object.values(row).some(val =>
                val !== null && val !== undefined && val !== '' &&
                !String(val).startsWith('_') // Remove React keys
              );
            }).map(row => {
              // Clean each row
              const cleanRow = {};
              Object.keys(row).forEach(key => {
                if (!key.startsWith('_') && row[key] !== null && row[key] !== undefined) {
                  cleanRow[key] = row[key];
                }
              });
              return cleanRow;
            });
          }
          console.warn(`Invalid table_data format for ${itemId}:`, rawValue);
          return [];

        case 'remarks':
        case 'comments':
          // Allow any string value
          return rawValue === null ? '' : String(rawValue);

        default:
          console.warn(`Unknown field type: ${fieldType}`);
          return rawValue;
      }
    };

    setResponses(prev => {
      // Get the template item to determine response type and validation rules
      const templateItem = items.find(item => item.item_id === itemId);

      if (!templateItem) {
        console.warn(`Template item not found for ${itemId}`);
        return prev;
      }

      // Sanitize the value based on field type
      const sanitizedValue = sanitizeValue(field, value);

      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          item_id: itemId,
          [field]: sanitizedValue,
          // Include template metadata for API compatibility
          response_type: templateItem?.response_type || 'yes_no_na',
          section: templateItem?.section_name || 'GENERAL',
          subsection: templateItem?.sub_section_name || null,
          check_description: templateItem?.description || '',
          pic: templateItem?.pic || '',
          is_mandatory: templateItem?.is_mandatory || false,
          requires_evidence: templateItem?.requires_evidence || false,
          guidance: templateItem?.guidance || '',
          sr_no: templateItem?.sr_no || templateItem?.order_index || 1
        }
      };

      // Validate the updated response for completion
      const currentItemResponse = updated[itemId];
      let hasAnyValue = false;

      if (templateItem?.response_type === 'table') {
        hasAnyValue = currentItemResponse.table_data &&
                     Array.isArray(currentItemResponse.table_data) &&
                     currentItemResponse.table_data.length > 0;
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
        } else {
          newSet.delete(itemId);
        }
        return newSet;
      });

      console.log(`✅ Updated ${itemId} ${field}:`, {
        originalValue: value,
        sanitizedValue: sanitizedValue,
        hasValue: hasAnyValue,
        responseType: templateItem?.response_type
      });

      return updated;
    });

    // Clear any existing errors for this field
    if (errors[itemId]) {
      setErrors(prev => ({
        ...prev,
        [itemId]: null
      }));
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

  // 1. FIXED: Enhanced table data validation and formatting
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

  // 2. FIXED: Enhanced formatResponseForAPI specifically for table handling
  const formatResponseForAPI = useCallback((responsesToFormat) => {
    console.log('🔄 Formatting responses for API...');
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

      // Clear all response values first
      formattedResponse.yes_no_na_value = null;
      formattedResponse.text_value = null;
      formattedResponse.date_value = null;
      formattedResponse.table_data = null;

      // CRITICAL FIX: Special handling for table data
      if (response.response_type === 'table' || response.field_type === 'table') {
        console.log(`📊 Processing table data for ${response.item_id}:`, response.table_data);

        if (response.table_data && Array.isArray(response.table_data)) {
          const cleanedTableData = validateAndFormatTableData(response.table_data);

          if (cleanedTableData.length > 0) {
            // CRITICAL: Ensure table_data is properly formatted as JSON string for API
            formattedResponse.table_data = cleanedTableData;
            console.log(`✅ Cleaned table data for ${response.item_id}:`, cleanedTableData);
          } else {
            formattedResponse.table_data = [];
            console.log(`⚠️  Empty table data for ${response.item_id}`);
          }
        } else {
          formattedResponse.table_data = [];
          console.log(`⚠️  No valid table data for ${response.item_id}`);
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

      console.log(`📝 Formatted ${response.item_id}:`, {
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
          remarks: resp.remarks,
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
                               val !== null && val !== undefined && val !== ''
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
      console.log('=== SUBMIT OPERATION STARTED ===');
      console.log('Checklist ID:', selectedChecklist?.checklist_id);
      console.log('User ID:', currentUser?.id);

      // Transform responses to API format for validation
      const apiResponses = transformResponsesToAPIFormat(responses, items);

      // Enhanced validation before submission
      const validation = validateResponsesForSubmission(apiResponses, items);

      console.log('=== SUBMISSION VALIDATION ===');
      console.log('Validation result:', validation);

      if (!validation.isValid) {
        let errorMessage = 'Cannot submit checklist:\n\n';

        if (validation.mandatoryIncomplete.length > 0) {
          errorMessage += `Missing ${validation.mandatoryIncomplete.length} mandatory items:\n\n`;

          // Group by section for better readability
          const bySectionMap = {};
          validation.mandatoryIncomplete.forEach(item => {
            const section = item.section || 'Other';
            if (!bySectionMap[section]) bySectionMap[section] = [];
            bySectionMap[section].push(item);
          });

          Object.entries(bySectionMap).forEach(([section, sectionItems]) => {
            errorMessage += `${section}:\n`;
            sectionItems.slice(0, 5).forEach(item => { // Limit to first 5 per section
              const desc = item.description.length > 60
                ? item.description.substring(0, 60) + '...'
                : item.description;
              errorMessage += `  • ${desc}\n`;
            });
            if (sectionItems.length > 5) {
              errorMessage += `  • ... and ${sectionItems.length - 5} more\n`;
            }
            errorMessage += '\n';
          });
        }

        if (validation.errors.length > 0) {
          errorMessage += 'Other issues:\n';
          validation.errors.forEach(error => {
            errorMessage += `• ${error}\n`;
          });
        }

        console.log('Validation failed, showing error to user');
        setError(errorMessage);
        return { success: false, reason: 'validation_failed', validation };
      }

      // First save the current responses (include all responses, not just ones with values)
      console.log('=== SAVING BEFORE SUBMIT ===');
      const saveResult = await handleSave(false);

      if (!saveResult.success) {
        throw new Error(`Failed to save before submit: ${saveResult.error || saveResult.reason}`);
      }

      // Then submit the checklist
      console.log('=== SUBMITTING CHECKLIST ===');
      const submitResult = await checklistService.submitChecklist(
        selectedChecklist.checklist_id,
        currentUser?.id || 'system'
      );

      console.log('=== SUBMIT SUCCESSFUL ===');
      console.log('Submit result:', submitResult);

      // Show success message
      setSuccessMessage('Checklist submitted successfully! 🎉');

      // Call parent handler
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
      console.error('=== SUBMIT OPERATION FAILED ===');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        checklistId: selectedChecklist?.checklist_id,
        userId: currentUser?.id
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

  // FIXED: Enhanced response loading with proper duplicate handling and validation
  useEffect(() => {
    if (existingChecklist && existingChecklist.responses) {
      console.log('=== LOADING EXISTING RESPONSES (ENHANCED) ===');
      console.log('Loading existing responses:', existingChecklist.responses.length);

      const existingResponses = {};
      const completedItemsSet = new Set();
      const processedResponseIds = new Set();

      existingChecklist.responses.forEach((response, index) => {
        // FIXED: Better duplicate detection
        const responseKey = response.response_id || `${response.item_id}_${index}`;
        if (processedResponseIds.has(responseKey)) {
          console.warn(`Duplicate response found: ${responseKey} (skipping)`);
          return;
        }
        processedResponseIds.add(responseKey);

        console.log(`Processing response ${index}:`, {
          item_id: response.item_id,
          yes_no_na_value: response.yes_no_na_value,
          text_value: response.text_value,
          date_value: response.date_value,
          remarks: response.remarks,
          table_data_length: response.table_data ? (Array.isArray(response.table_data) ? response.table_data.length : 'invalid') : 0
        });

        if (response.item_id) {
          // FIXED: Validate item_id exists in current template
          const itemExists = items.some(item => item.item_id === response.item_id);
          if (!itemExists) {
            console.warn(`Response for unknown item_id: ${response.item_id} (skipping)`);
            return;
          }

          // FIXED: Enhanced response value determination
          let mainResponse = null;
          let hasAnyValue = false;

          // Handle different response types properly
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

          // FIXED: Enhanced table data handling
          let tableData = [];
          if (response.table_data) {
            try {
              if (Array.isArray(response.table_data)) {
                tableData = response.table_data;
              } else if (typeof response.table_data === 'string') {
                tableData = JSON.parse(response.table_data);
              } else if (typeof response.table_data === 'object') {
                tableData = [response.table_data]; // Single object, wrap in array
              }

              if (Array.isArray(tableData) && tableData.length > 0) {
                hasAnyValue = true;
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

          // FIXED: Create comprehensive response object
          existingResponses[response.item_id] = {
            // Legacy compatibility
            response: mainResponse,

            // Specific field values
            yes_no_na_value: response.yes_no_na_value,
            text_value: response.text_value,
            date_value: response.date_value,
            remarks: response.remarks || '',
            comments: response.remarks || '', // Alias for compatibility

            // FIXED: Enhanced table data handling
            table_data: tableData,

            // Metadata
            timestamp: response.updated_at || response.created_at,
            response_id: response.response_id,
            evidence_provided: Boolean(response.evidence_provided)
          };

          // FIXED: Mark as completed based on actual content
          if (hasAnyValue) {
            completedItemsSet.add(response.item_id);
            console.log(`Marking item ${response.item_id} as completed:`, {
              mainResponse,
              remarks: hasRemarks,
              tableDataLength: tableData.length,
              evidence: response.evidence_provided
            });
          }
        }
      });

      console.log('=== SETTING STATE (ENHANCED) ===');
      console.log('Setting responses for', Object.keys(existingResponses).length, 'items');
      console.log('Setting completed items:', Array.from(completedItemsSet));

      // FIXED: Validate against current items before setting state
      const validResponses = {};
      const validCompletedItems = new Set();

      Object.entries(existingResponses).forEach(([itemId, response]) => {
        const itemExists = items.some(item => item.item_id === itemId);
        if (itemExists) {
          validResponses[itemId] = response;
          if (completedItemsSet.has(itemId)) {
            validCompletedItems.add(itemId);
          }
        } else {
          console.warn(`Removing response for non-existent item: ${itemId}`);
        }
      });

      console.log('Final valid responses:', Object.keys(validResponses).length);
      console.log('Final valid completed items:', validCompletedItems.size);

      setResponses(validResponses);
      setCompletedItems(validCompletedItems);

      // Debug the state after setting
      setTimeout(() => {
        console.log('=== STATE VERIFICATION AFTER LOADING ===');
        console.log('Responses state keys:', Object.keys(validResponses));
        console.log('Completed items state:', Array.from(validCompletedItems));

        // Check specific items for debugging
        Object.entries(validResponses).slice(0, 3).forEach(([itemId, resp]) => {
          console.log(`Sample response ${itemId}:`, {
            mainResponse: resp.response,
            yes_no_na_value: resp.yes_no_na_value,
            text_value: resp.text_value,
            remarks: resp.remarks,
            tableDataLength: resp.table_data?.length || 0
          });
        });
      }, 100);
    }
  }, [existingChecklist, items]); // FIXED: Added items dependency for validation

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

  // 5. Update your renderResponseField function to include the table case
  const renderResponseField = (item) => {
    const response = responses[item.item_id] || {};
    const hasError = errors[item.item_id];
    const isReadonly = mode === 'view';

    console.log('Rendering field:', item.item_id, 'Type:', item.response_type, 'Item:', item);

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

      // REPLACE THE PLACEHOLDER TABLE CASE WITH THIS FUNCTIONAL ONE
      case 'table':
        return (
          <div className="checklist-form-response-field">
            <DynamicTable
              item={item}
              value={response.table_data || []}
              onChange={(tableData) => handleResponseChange(item.item_id, 'table_data', tableData)}
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
    <div className="dashboard-container" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Add this CSS for the animation (put in your component or CSS file) */}
      <style>{`
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
        /* Styles for Yes/No/NA buttons */
        .yes-no-na-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .yes-no-na-buttons {
          display: flex;
          gap: 4px;
        }
        .yes-no-na-option {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 12px;
          color: #4a5568;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px 8px;
          transition: all 0.2s ease;
        }
        .yes-no-na-option.selected {
          background-color: #3498db;
          color: white;
          border-color: #3498db;
        }
        .yes-no-na-option:hover:not(.selected) {
          background-color: #f0f4f8;
        }
        .yes-no-na-radio {
          display: none; /* Hide native radio button */
        }
        .yes-no-na-label {
          font-weight: 500;
        }
        .yes-no-na-label.yes {
          color: #28a745; /* Green for Yes */
        }
        .yes-no-na-label.no {
          color: #dc3545; /* Red for No */
        }
        .yes-no-na-label.n-a {
          color: #6c757d; /* Gray for N/A */
        }
        .yes-no-na-option.selected .yes-no-na-label {
          color: white; /* White text when selected */
        }
      `}</style>

      <ErrorSuccessDisplay
        error={error}
        successMessage={successMessage}
        onClearError={() => setError(null)}
      />

      {/* Compact Header */}
      <header className="dashboard-header" style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onCancel} className="control-btn" style={{ padding: '4px' }}>
            <ArrowLeft size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ship size={20} style={{ color: '#3498DB' }} />
            <div>
              <h1 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                {template?.name || 'Maritime Checklist'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                <span>{vessel?.vessel_name}</span>
                <span>IMO: {vessel?.imo_no}</span>
                <span>{currentTime.toLocaleTimeString()}</span>
                <span className={`badge ${mode === 'view' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                  {mode === 'view' ? 'READ ONLY' : 'EDITING'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
            <span>{stats.percentage}%</span>
            <div style={{ width: '40px', height: '40px', position: 'relative' }}>
              <svg style={{ width: '40px', height: '40px', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#3498DB"
                  strokeWidth="2"
                  strokeDasharray={`${stats.percentage}, 100`}
                />
              </svg>
            </div>
          </div>

          {mode === 'edit' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                style={{
                  padding: '6px 12px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {saving ? <RefreshCw size={12} className="spinning" /> : <Save size={12} />}
                Save
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {submitting ? <RefreshCw size={12} className="spinning" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Compact Filter Bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search checklist items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px 4px 28px',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '12px',
              height: '24px'
            }}
          />
        </div>

        <select
          value={filterPIC}
          onChange={(e) => setFilterPIC(e.target.value)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
            height: '24px'
          }}
        >
          <option value="all">All Personnel</option>
          {uniquePICs.map(pic => (
            <option key={pic} value={pic}>{pic}</option>
          ))}
        </select>

        <button
          onClick={() => setShowOnlyMandatory(!showOnlyMandatory)}
          style={{
            padding: '4px 8px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            fontSize: '12px',
            height: '24px',
            background: showOnlyMandatory ? '#ef4444' : 'white',
            color: showOnlyMandatory ? 'white' : '#64748b',
            cursor: 'pointer'
          }}
        >
          {showOnlyMandatory ? 'Mandatory Only' : 'Show All'}
        </button>

        <div style={{ display: 'flex', gap: '4px', fontSize: '11px', color: '#64748b' }}>
          <span>{stats.completed}/{stats.total} Complete</span>
          <span>•</span>
          <span>{stats.mandatoryCompleted}/{stats.mandatory} Mandatory</span>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>

        {/* Left Sidebar - Section Navigation */}
        <div style={{
          width: '280px',
          background: 'white',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {sections.map((section, sectionIndex) => {
            const sectionItems = section.items || [];
            const completedCount = sectionItems.filter(item => completedItems.has(item.item_id)).length;
            const progress = sectionItems.length > 0 ? (completedCount / sectionItems.length) * 100 : 0;
            const isExpanded = expandedSections.has(section.section_id);

            return (
              <div key={`sidebar_${section.section_id}_${sectionIndex}`} style={{ marginBottom: '4px' }}>
                <div
                  onClick={() => toggleSection(section.section_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: isExpanded ? '#f1f5f9' : 'transparent',
                    border: isExpanded ? '1px solid #e2e8f0' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      background: section.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: section.color
                    }}>
                      {section.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{section.section_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {completedCount}/{sectionItems.length} items
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', color: section.color }}>
                      {Math.round(progress)}%
                    </div>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  height: '2px',
                  background: '#f1f5f9',
                  margin: '2px 8px 4px',
                  borderRadius: '1px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      height: '100%',
                      background: section.color,
                      width: `${progress}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {/* Subsections */}
                {isExpanded && section.subsections?.map((subsection, subIndex) => (
                  <div key={`sidebar_sub_${section.section_id}_${subIndex}`} style={{ marginLeft: '16px', marginBottom: '2px' }}>
                    <div style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #f1f5f9'
                    }}>
                      {subsection.subsection_name} ({subsection.items?.length || 0})
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right Content - Checklist Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          background: '#f8fafc'
        }}>
          {sections.filter(section => expandedSections.has(section.section_id)).map((section) => (
            <div key={`section_${section.section_id}`} style={{ marginBottom: '16px' }}>
              {section.subsections?.map((subsection, subsectionIndex) => (
                <div key={`${section.section_id}_${subsection.id}_${subsectionIndex}`} style={{ marginBottom: '12px' }}>
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e293b',
                    padding: '6px 12px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {subsection.subsection_name}
                  </h3>

                  {/* Grid Layout for Items */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '6px'
                  }}>
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
            <strong style={{ color: '#3498DB' }}>{trimmedLine.match(/^[a-z0-9]\)/)[0]}</strong>
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
    <div style={{
      background: 'white',
      border: `1px solid ${isCompleted ? '#10b981' : '#e2e8f0'}`,
      borderRadius: '6px',
      padding: '8px',
      position: 'relative',
      transition: 'all 0.2s ease',
      boxShadow: isCompleted ? '0 2px 4px rgba(16, 185, 129, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>

      {/* Mandatory Corner */}
      {item.is_mandatory && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          width: '0',
          height: '0',
          borderLeft: '10px solid transparent',
          borderTop: '10px solid #ef4444'
        }} />
      )}

      {/* Main Content Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>

        {/* Check Description - Now takes full width without category badge */}
        <div style={{
          flex: 1,
          fontSize: '12px',
          fontWeight: '500',
          color: '#1e293b',
          lineHeight: '1.4'
        }}>
          {formatDescription(item.description)}
        </div>

        {/* PIC */}
        <div style={{
          fontSize: '10px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <User size={10} />
          {item.pic}
        </div>

        {/* Completion Status */}
        {isCompleted && (
          <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
        )}
      </div>

      {/* Render the appropriate response field based on item.response_type */}
      {renderResponseField(item)}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '2px 4px',
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '9px',
            color: '#64748b'
          }}
        >
          <MoreHorizontal size={10} />
        </button>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div style={{
          marginTop: '8px',
          padding: '6px',
          background: '#f8fafc',
          borderRadius: '4px',
          border: '1px solid #f1f5f9'
        }}>

          {/* Guidance */}
          {item.guidance && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
                Guidance:
              </div>
              <div style={{ fontSize: '10px', color: '#374151', lineHeight: '1.3' }}>
                {item.guidance}
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
              Comments:
            </div>
            <textarea
              value={response.remarks || ''}
              onChange={(e) => onResponseChange(item.item_id, 'remarks', e.target.value)}
              disabled={mode === 'view'}
              placeholder="Add comments..."
              style={{
                width: '100%',
                height: '40px',
                padding: '4px',
                border: '1px solid #e2e8f0',
                borderRadius: '3px',
                fontSize: '10px',
                resize: 'none',
                background: mode === 'view' ? '#f9fafb' : 'white'
              }}
            />
          </div>

          {/* Additional Actions */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
            <button
              style={{
                padding: '2px 6px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '9px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <Camera size={8} />
              Photo
            </button>

            <button
              style={{
                padding: '2px 6px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '9px',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <FileText size={8} />
              Note
            </button>
          </div>

          {/* Response Timestamp */}
          {response.timestamp && (
            <div style={{
              fontSize: '8px',
              color: '#9ca3af',
              marginTop: '4px',
              textAlign: 'right'
            }}>
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
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      width: '90%',
      maxWidth: '600px'
    }}>
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '8px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>Error</div>
            <div style={{ fontSize: '14px', whiteSpace: 'pre-line' }}>{error}</div>
          </div>
          <button
            onClick={onClearError}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '6px',
          padding: '12px 16px',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <CheckCircle size={16} />
          <div style={{ fontWeight: '500' }}>{successMessage}</div>
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

// 4. DEBUGGING: Add this to test table data specifically
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