// ModernChecklistForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
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

  // NEW: State for DebugPanel visibility, lifted up to parent
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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

  // 2. Update your handleResponseChange function to handle table data
  const handleResponseChange = (itemId, field, value) => {
    if (mode === 'view') return;

    console.log('ModernChecklistForm - Response change:', itemId, field, value);

    setResponses(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: value,
          timestamp: new Date().toISOString()
        }
      };

      // Logic to update completedItems based on any response field having a value
      const currentItemResponse = updated[itemId];
      const item = items.find(i => i.item_id === itemId);

      let hasAnyValue = false;
      if (item?.response_type === 'table') {
        hasAnyValue = currentItemResponse.table_data && currentItemResponse.table_data.length > 0;
      } else {
        hasAnyValue = Object.values(currentItemResponse).some(val =>
          val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)
        );
      }

      setCompletedItems(prevCompleted => {
        const newSet = new Set(prevCompleted);
        if (hasAnyValue) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        return newSet;
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
  };

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

  // 6. DEBUGGING: Enhanced debug functions
  const debugResponsesState = () => {
    console.log('=== ENHANCED DEBUGGING RESPONSES STATE ===');
    console.log('Responses object:', responses);
    console.log('Responses keys:', Object.keys(responses));
    console.log('Items count:', items.length);
    console.log('Unique item IDs:', new Set(items.map(item => item.item_id)).size);

    // Check for mismatched item IDs
    const responseItemIds = Object.keys(responses);
    const templateItemIds = items.map(item => item.item_id);

    const orphanedResponses = responseItemIds.filter(id => !templateItemIds.includes(id));
    const missingResponses = templateItemIds.filter(id => !responseItemIds.includes(id));

    if (orphanedResponses.length > 0) {
      console.warn('Orphaned responses (not in template):', orphanedResponses);
    }

    if (missingResponses.length > 0) {
      console.log('Items without responses:', missingResponses.length);
    }

    console.log('Completed items:', Array.from(completedItems));
    console.log('Completed items count:', completedItems.size);

    // Sample what the first few responses look like
    Object.keys(responses).slice(0, 3).forEach(itemId => {
      console.log(`Response for ${itemId}:`, responses[itemId]);
    });

    console.log('Items sample:', items.slice(0, 3).map(item => ({
      item_id: item.item_id,
      description: item.description?.substring(0, 50),
      is_mandatory: item.is_mandatory
    })));
  };

  // Enhanced save and submit handlers for ModernChecklistForm
  // These should replace the existing handlers in your component

  // FIXED: Enhanced save handler with better error handling and state management
  const handleSave = async (isAutoSave = false) => {
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

      // FIXED: Enhanced state debugging
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

      // FIXED: Enhanced response transformation with validation
      const apiResponses = transformResponsesToAPIFormat(responses, items);
      console.log('=== API TRANSFORMATION RESULT (ENHANCED) ===');
      console.log('Total API responses:', apiResponses.length);

      // FIXED: Better filtering logic for responses with values
      const responsesWithValues = apiResponses.filter(r => {
        const originalItem = items.find(item => item.item_id === r.item_id);
        
        if (originalItem?.response_type === 'table') {
          const hasTableData = r.table_data && Array.isArray(r.table_data) && r.table_data.length > 0;
          if (hasTableData) return true;
        }
        
        const hasStandardResponse = r.yes_no_na_value !== null && r.yes_no_na_value !== undefined ||
                                   (r.text_value !== null && r.text_value !== undefined && r.text_value.trim() !== '') ||
                                   r.date_value !== null && r.date_value !== undefined;
        
        const hasRemarks = r.remarks !== null && r.remarks !== undefined && r.remarks.trim() !== '';
        
        return hasStandardResponse || hasRemarks;
      });

      console.log('Responses with values for API:', responsesWithValues.length);
      console.log('Sample responses for API:', responsesWithValues.slice(0, 3));

      if (responsesWithValues.length === 0) {
        console.warn('No responses with values to save');
        if (!isAutoSave) {
          setError('No responses to save. Please complete at least one item.');
        }
        return { success: false, reason: 'no_responses' };
      }

      // Validate required fields
      if (!selectedChecklist?.checklist_id) {
        throw new Error('Checklist ID is required for saving');
      }

      // FIXED: Enhanced API call with better error handling
      console.log('=== CALLING API (ENHANCED) ===');
      console.log('Endpoint: updateChecklistResponses');
      console.log('Checklist ID:', selectedChecklist.checklist_id);
      console.log('Responses count:', responsesWithValues.length);
      console.log('User ID:', currentUser?.id || 'system');

      const result = await checklistService.updateChecklistResponses(
        selectedChecklist.checklist_id,
        responsesWithValues,
        currentUser?.id || 'system'
      );

      console.log('=== API CALL SUCCESSFUL (ENHANCED) ===');
      console.log('Save result:', result);

      // FIXED: Enhanced result validation
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
  };

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
  }, [mode, responses, saving, submitting]);


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
  }, [responses, completedItems]);

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

  // Debug button component
  // Now accepts showDebug and setShowDebug from parent
  const DebugPanel = ({ showDebug, setShowDebug, items, responses, completedItems, mode, selectedChecklist, currentUser }) => {
    // Existing debug functions (keep these)
    const debugTemplateItems = () => {
      console.log('=== DEBUGGING TEMPLATE ITEMS ===');
      console.log('Total items:', items.length);
      console.log('Sample items:', items.slice(0, 5).map(item => ({
        item_id: item.item_id,
        description: item.description?.substring(0, 50),
        is_mandatory: item.is_mandatory,
        section: item.section_name,
        subsection: item.sub_section_name,
        pic: item.pic,
        response_type: item.response_type,
        table_structure: item.table_structure ? 'HAS TABLE STRUCTURE' : 'NO TABLE STRUCTURE'
      })));
    };

    const debugCurrentResponses = () => {
      console.log('=== DEBUGGING CURRENT RESPONSES ===');
      console.log('Responses object:', responses);
      console.log('Completed items set:', Array.from(completedItems));
      const currentResponsesWithValues = Object.entries(responses).filter(([itemId, resp]) => {
        const item = items.find(i => i.item_id === itemId);
        if (item?.response_type === 'table') {
          return resp.table_data && resp.table_data.length > 0;
        }
        return resp.yes_no_na_value !== null || resp.text_value !== null || resp.date_value !== null || (resp.remarks && resp.remarks.trim() !== '');
      });
      console.log('Responses with values (current state):', currentResponsesWithValues.length);
      currentResponsesWithValues.slice(0, 5).forEach(([itemId, resp]) => {
        console.log(`Item ${itemId}:`, resp);
      });
    };

    // NEW: Test functions for real API operations
    const testSaveWithExistingResponses = async () => {
      console.log('=== TESTING REAL SAVE WITH EXISTING RESPONSES ===');

      try {
        // Get your current responses (the 5 that are loaded)
        const currentResponses = responses;
        console.log('Current responses to save:', currentResponses);

        // Transform them using your transformer
        const apiResponses = transformResponsesToAPIFormat(currentResponses, items);
        console.log('Transformed API responses:', apiResponses.length);

        // Filter to only ones with values
        const responsesWithValues = apiResponses.filter(r => {
          const originalItem = items.find(item => item.item_id === r.item_id);
          if (originalItem?.response_type === 'table') {
            return r.table_data && r.table_data.length > 0;
          }
          return r.yes_no_na_value !== null ||
                 r.text_value !== null ||
                 r.date_value !== null ||
                 (r.remarks !== null && r.remarks !== '');
        });

        console.log('Responses with values for API:', responsesWithValues.length);
        console.log('Sample API responses:', responsesWithValues.slice(0, 3));

        // Now call the real API
        const result = await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id,
          responsesWithValues,
          currentUser?.id || 'system'
        );

        console.log('✅ REAL SAVE SUCCESSFUL:', result);
        alert('✅ Real save successful! Check console for details.');
        return result;

      } catch (error) {
        console.error('❌ REAL SAVE FAILED:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        alert(`❌ Real save failed: ${error.message}`);
        throw error;
      }
    };

    const testNewResponseAndSave = async () => {
      console.log('=== TESTING NEW RESPONSE AND SAVE ===');

      try {
        // Find an item that doesn't have a response yet
        const uncompletedItem = items.find(item => !completedItems.has(item.item_id));

        if (!uncompletedItem) {
          console.log('All items are already completed, skipping new response test');
          alert('All items are already completed!');
          return;
        }

        console.log('Testing with uncompleted item:', uncompletedItem.item_id, uncompletedItem.description?.substring(0, 50));

        // Simulate adding a response (this should trigger your handleResponse)
        if (uncompletedItem.response_type === 'yes_no_na') {
          handleResponseChange(uncompletedItem.item_id, 'yes_no_na_value', 'Yes');
        } else if (uncompletedItem.response_type === 'text') {
          handleResponseChange(uncompletedItem.item_id, 'text_value', 'Test response added for testing');
        } else if (uncompletedItem.response_type === 'table' && uncompletedItem.table_structure) {
          const mockRow = {};
          uncompletedItem.table_structure.columns.forEach(col => {
            if (col.type === 'text') mockRow[col.field_id] = 'Test Data';
            if (col.type === 'number') mockRow[col.field_id] = 123;
            if (col.type === 'yes_no') mockRow[col.field_id] = 'Yes';
          });
          handleResponseChange(uncompletedItem.item_id, 'table_data', [mockRow]);
        } else {
          console.warn('Skipping new response test for unsupported type:', uncompletedItem.response_type);
          alert('Skipping new response test for unsupported item type.');
          return;
        }

        handleResponseChange(uncompletedItem.item_id, 'remarks', 'Test remarks added for testing');


        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('New response added, current responses count:', Object.keys(responses).length);

        // Now try to save
        const result = await handleSave(false);
        console.log('✅ SAVE WITH NEW RESPONSE SUCCESSFUL:', result);
        alert('✅ Save with new response successful!');

        return result;

      } catch (error) {
        console.error('❌ SAVE WITH NEW RESPONSE FAILED:', error);
        alert(`❌ Save with new response failed: ${error.message}`);
        throw error;
      }
    };

    const testSubmitChecklist = async () => {
      console.log('=== TESTING REAL SUBMIT ===');

      try {
        // First save any pending changes
        await testSaveWithExistingResponses();

        // Then try to submit
        const result = await handleSubmit();
        console.log('✅ REAL SUBMIT SUCCESSFUL:', result);
        alert('✅ Real submit successful!');

        return result;

      } catch (error) {
        console.error('❌ REAL SUBMIT FAILED:', error);
        console.error('Error details:', {
          message: error.message,
          validation: error.validation || 'No validation info'
        });
        alert(`❌ Real submit failed: ${error.message}`);
        throw error;
      }
    };

    const testAPIDirectly = async () => {
      console.log('=== TESTING API DIRECTLY ===');
      try {
        const mockResponses = [{ item_id: 'test_item', yes_no_na_value: 'Yes', remarks: 'Direct test' }];
        console.log('Attempting direct update with mock responses:', mockResponses);
        const updateResult = await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id,
          mockResponses,
          currentUser?.id || 'system'
        );
        console.log('Direct API Update Result:', updateResult);

        console.log('Attempting direct submit...');
        const submitResult = await checklistService.submitChecklist(
          selectedChecklist.checklist_id,
          currentUser?.id || 'system'
        );
        console.log('Direct API Submit Result:', submitResult);
        alert('✅ Direct API test successful!');
      } catch (err) {
        console.error('Direct API Test Failed:', err);
        alert(`❌ Direct API test failed: ${err.message}`);
      }
    };

    // Add these debug functions to your DebugPanel to investigate the API response issue
    const debugAPIResponseIssue = async () => {
      console.log('=== DEBUGGING API RESPONSE ISSUE ===');

      try {
        // 1. Check what we're sending to save
        console.log('1. Checking current form state before save...');
        console.log('Current responses count:', Object.keys(responses).length);
        console.log('Current completed items:', Array.from(completedItems));

        // 2. Transform and check what we send to API
        const apiResponses = transformResponsesToAPIFormat(responses, items);
        const responsesWithValues = apiResponses.filter(r => {
          const originalItem = items.find(item => item.item_id === r.item_id);
          if (originalItem?.response_type === 'table') {
            return r.table_data && r.table_data.length > 0;
          }
          return r.yes_no_na_value !== null ||
                 r.text_value !== null ||
                 r.date_value !== null ||
                 (r.remarks !== null && r.remarks !== '');
        });

        console.log('2. What we SEND to save API:');
        console.log('Total API responses:', apiResponses.length);
        console.log('Responses with values:', responsesWithValues.length);
        console.log('Sample API request data:', responsesWithValues.slice(0, 3));

        // 3. Test the save API call
        console.log('3. Testing save API call...');
        const saveResult = await checklistService.updateChecklistResponses(
          selectedChecklist.checklist_id,
          responsesWithValues,
          currentUser?.id || 'system'
        );
        console.log('Save API result:', saveResult);

        // 4. Immediately fetch the checklist to see what's returned
        console.log('4. Immediately fetching checklist after save...');
        const fetchedChecklist = await checklistService.getChecklistById(selectedChecklist.checklist_id);
        console.log('Fetched checklist after save:', {
          checklist_id: fetchedChecklist.checklist_id,
          responses_count: fetchedChecklist.responses?.length || 0,
          responses_sample: fetchedChecklist.responses?.slice(0, 3) || [],
          status: fetchedChecklist.status,
          progress_percentage: fetchedChecklist.progress_percentage
        });

        // 5. Check if responses are in the right format
        if (fetchedChecklist.responses && fetchedChecklist.responses.length > 0) {
          console.log('5. Analyzing fetched responses structure...');
          const sampleResponse = fetchedChecklist.responses[0];
          console.log('Sample response structure:', {
            has_item_id: !!sampleResponse.item_id,
            has_yes_no_na_value: sampleResponse.yes_no_na_value !== undefined,
            has_text_value: sampleResponse.text_value !== undefined,
            has_date_value: sampleResponse.date_value !== undefined,
            has_remarks: !!sampleResponse.remarks,
            has_table_data: sampleResponse.table_data !== undefined, // Check for table_data
            actual_structure: Object.keys(sampleResponse)
          });
        } else {
          console.error('5. ❌ NO RESPONSES RETURNED FROM API!');
          console.error('This is why your progress resets to 0%');
        }

        alert('Debug complete - check console for detailed analysis');

      } catch (error) {
        console.error('Debug failed:', error);
        alert(`Debug failed: ${error.message}`);
      }
    };

    const checkLambdaEndpoints = async () => {
      console.log('=== CHECKING LAMBDA ENDPOINTS ===');

      try {
        const checklistId = selectedChecklist.checklist_id;

        // 1. Check if the save endpoint exists and works
        console.log('1. Testing save endpoint...');
        const testSaveData = [{
          item_id: 'test_item',
          yes_no_na_value: 'Yes',
          remarks: 'Test save endpoint'
        }];

        const saveResponse = await fetch(`https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws/api/checklist/${checklistId}/responses`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responses: testSaveData,
            user_id: 'system'
          })
        });

        console.log('Save endpoint response status:', saveResponse.status);
        const saveResult = await saveResponse.json();
        console.log('Save endpoint response:', saveResult);

        // 2. Check if the get endpoint exists and returns data
        console.log('2. Testing get checklist endpoint...');
        const getResponse = await fetch(`https://qescpqp626isx43ab5mnlyvayi0zvvsg.lambda-url.ap-south-1.on.aws/api/checklist/${checklistId}`);
        console.log('Get endpoint response status:', getResponse.status);
        const getResult = await getResponse.json();
        console.log('Get endpoint response:', {
          checklist_id: getResult.checklist_id,
          responses_count: getResult.responses?.length || 0,
          responses_sample: getResult.responses?.slice(0, 2) || [],
          full_response_structure: Object.keys(getResult)
        });

        // 3. Check what's actually in the Lambda database
        console.log('3. Checking database state...');
        if (getResult.responses && getResult.responses.length > 0) {
          console.log('✅ Database has responses');
          console.log('Response structure check:', getResult.responses[0]);
        } else {
          console.error('❌ No responses in database - Lambda save endpoint may not be working');
        }

        alert('Lambda endpoint check complete - see console');

      } catch (error) {
        console.error('Lambda endpoint check failed:', error);
        alert(`Lambda check failed: ${error.message}`);
      }
    };

    const compareApiFormats = () => {
      console.log('=== COMPARING API REQUEST/RESPONSE FORMATS ===');

      // 1. Show what we send to the API
      const currentResponses = responses;
      const apiResponses = transformResponsesToAPIFormat(currentResponses, items);
      const responsesWithValues = apiResponses.filter(r => {
        const originalItem = items.find(item => item.item_id === r.item_id);
        if (originalItem?.response_type === 'table') {
          return r.table_data && r.table_data.length > 0;
        }
        return r.yes_no_na_value !== null ||
               r.text_value !== null ||
               r.date_value !== null ||
               (r.remarks !== null && r.remarks !== '');
      });

      console.log('1. What we SEND to Lambda (PUT request format):');
      console.log('Sample request item:', responsesWithValues[0]);

      // 2. Show what we expect to get back
      console.log('2. What we EXPECT to get back from Lambda (GET response format):');
      console.log('Expected response format:', {
        response_id: 'some-uuid',
        item_id: 'psc_001',
        yes_no_na_value: 'Yes',
        text_value: null,
        date_value: null,
        remarks: 'Some remarks',
        table_data: [], // Expected table_data
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      });

      // 3. Check what the template expects
      console.log('3. Template item IDs we have in form:');
      console.log('Sample template item IDs:', items.slice(0, 5).map(item => item.item_id));

      console.log('4. Current form responses we want to save:');
      Object.entries(currentResponses).slice(0, 3).forEach(([itemId, response]) => {
        console.log(`  ${itemId}:`, response);
      });

      alert('API format comparison complete - check console');
    };

    // Add these buttons to your enhanced DebugPanel
    const APIDebugButtons = () => (
      <div style={{ marginTop: '10px' }}>
        <div><strong>🔍 API Debug Tools:</strong></div>

        <button
          onClick={debugAPIResponseIssue}
          style={{
            margin: '2px 0',
            display: 'block',
            width: '100%',
            padding: '8px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔍 Debug Save→Fetch Issue
        </button>

        <button
          onClick={checkLambdaEndpoints}
          style={{
            margin: '2px 0',
            display: 'block',
            width: '100%',
            padding: '8px',
            background: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔍 Check Lambda Endpoints
        </button>

        <button
          onClick={compareApiFormats}
          style={{
            margin: '2px 0',
            display: 'block',
            width: '100%',
            padding: '8px',
            background: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔍 Compare API Formats
        </button>
      </div>
    );


    return (
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 9999 }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            background: '#3498db',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>

        {/* Conditionally render the debug content based on showDebug */}
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          marginTop: '5px',
          minWidth: '250px',
          maxHeight: '500px',
          overflow: 'auto',
          fontSize: '12px',
          // Use display: 'none' to hide it without unmounting
          display: showDebug ? 'block' : 'none'
        }}>
          <div><strong>Debug Info:</strong></div>
          <div>Items: {items.length}</div>
          <div>Responses: {Object.keys(responses).length}</div>
          <div>Completed: {completedItems.size}</div>
          <div>Mode: {mode}</div>
          <div>Checklist ID: {selectedChecklist?.checklist_id}</div>

          {/* Original Debug Buttons */}
          <hr style={{ margin: '10px 0' }} />
          <div><strong>🔍 Debug Functions:</strong></div>
          <button onClick={debugTemplateItems} style={{ margin: '2px 0', display: 'block', width: '100%', padding: '5px', fontSize: '11px' }}>
            Debug Template Items
          </button>
          <button onClick={debugCurrentResponses} style={{ margin: '2px 0', display: 'block', width: '100%', padding: '5px', fontSize: '11px' }}>
            Debug Current Responses
          </button>
          <button onClick={testAPIDirectly} style={{ margin: '2px 0', display: 'block', width: '100%', padding: '5px', fontSize: '11px' }}>
            Test API Directly (Mock)
          </button>
          <button onClick={() => console.log('Current state:', { responses, completedItems: Array.from(completedItems) })} style={{ margin: '2px 0', display: 'block', width: '100%', padding: '5px', fontSize: '11px' }}>
            Log Current State
          </button>

          {/* NEW: Real Test Buttons */}
          <hr style={{ margin: '10px 0' }} />
          <div><strong>🧪 Real API Tests:</strong></div>

          <button
            onClick={testSaveWithExistingResponses}
            style={{
              margin: '2px 0',
              display: 'block',
              width: '100%',
              padding: '8px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🧪 Test Real Save (Existing)
          </button>

          <button
            onClick={testNewResponseAndSave}
            style={{
              margin: '2px 0',
              display: 'block',
              width: '100%',
              padding: '8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🧪 Test New Response + Save
          </button>

          <button
            onClick={testSubmitChecklist}
            style={{
              margin: '2px 0',
              display: 'block',
              width: '100%',
              padding: '8px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            🧪 Test Real Submit
          </button>

          {/* Warning Notice */}
          <div style={{
            marginTop: '10px',
            padding: '5px',
            background: '#fef3cd',
            border: '1px solid #f6e05e',
            borderRadius: '3px',
            fontSize: '10px',
            color: '#744210'
          }}>
            ⚠️ Real API tests will make actual calls to your backend
          </div>

          {/* NEW: API Debug Buttons */}
          <APIDebugButtons />
        </div>
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
            <div className="checklist-form-radio-group">
              {['Yes', 'No', 'N/A'].map(option => (
                <label key={option} className="checklist-form-radio-option">
                  <input
                    type="radio"
                    name={`response_${item.item_id}`}
                    value={option}
                    checked={response.yes_no_na_value === option}
                    onChange={(e) => handleResponseChange(item.item_id, 'yes_no_na_value', e.target.value)}
                    disabled={isReadonly}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      case 'text':
        return (
          <div className="checklist-form-response-field">
            <textarea
              value={response.text_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'text_value', e.target.value)}
              placeholder="Enter response..."
              rows={3}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

      case 'date':
        return (
          <div className="checklist-form-response-field">
            <input
              type="date"
              value={response.date_value || ''}
              onChange={(e) => handleResponseChange(item.item_id, 'date_value', e.target.value)}
              disabled={isReadonly}
              className={hasError ? 'error' : ''}
            />
            {hasError && <span className="checklist-form-error-text">{hasError}</span>}
          </div>
        );

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
      `}</style>

      <ErrorSuccessDisplay
        error={error}
        successMessage={successMessage}
        onClearError={() => setError(null)}
      />

      {/* Pass showDebugPanel and setShowDebugPanel as props */}
      <DebugPanel
        showDebug={showDebugPanel}
        setShowDebug={setShowDebugPanel}
        items={items}
        responses={responses}
        completedItems={completedItems}
        mode={mode}
        selectedChecklist={selectedChecklist}
        currentUser={currentUser}
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