// Fixed response transformer that handles your data structure correctly
// Key fixes: Better deduplication, improved logging, and proper null handling

const transformResponsesToAPIFormat = (formResponses, templateItems) => {
    console.log('=== TRANSFORMING RESPONSES TO API FORMAT ===');
    console.log('Form responses object keys:', Object.keys(formResponses));
    console.log('Form responses sample:', Object.entries(formResponses).slice(0, 3));
    console.log('Template items count:', templateItems.length);
    console.log('Template items sample:', templateItems.slice(0, 3).map(item => ({
      item_id: item.item_id,
      description: item.description?.substring(0, 50),
      is_mandatory: item.is_mandatory
    })));
    
    const apiResponses = [];
    const processedItemIds = new Set(); // Track processed items to avoid duplicates
  
    templateItems.forEach((item, index) => {
      // Skip if we've already processed this item_id
      if (processedItemIds.has(item.item_id)) {
        console.warn(`Duplicate item_id found: ${item.item_id}, skipping...`);
        return;
      }
      processedItemIds.add(item.item_id);

      const itemResponse = formResponses[item.item_id] || {};
      
      console.log(`Processing item ${index + 1}/${templateItems.length}: ${item.item_id}`, {
        hasResponseInForm: !!itemResponse.response,
        responseValue: itemResponse.response,
        hasRemarks: !!itemResponse.remarks,
        remarksValue: itemResponse.remarks
      });
      
      // Determine response values based on the response given
      let yes_no_na_value = null;
      let text_value = null;
      let date_value = null;
  
      // Handle different response types
      if (itemResponse.response !== undefined && itemResponse.response !== null && itemResponse.response !== '') {
        if (['Yes', 'No', 'N/A'].includes(itemResponse.response)) {
          yes_no_na_value = itemResponse.response;
          console.log(`  → Set yes_no_na_value: ${yes_no_na_value}`);
        } else if (itemResponse.response instanceof Date || (typeof itemResponse.response === 'string' && /^\d{4}-\d{2}-\d{2}/.test(itemResponse.response))) {
          date_value = itemResponse.response instanceof Date ? itemResponse.response.toISOString().split('T')[0] : itemResponse.response;
          console.log(`  → Set date_value: ${date_value}`);
        } else {
          // For everything else, treat as text
          text_value = String(itemResponse.response);
          console.log(`  → Set text_value: ${text_value}`);
        }
      }

      // Clean up remarks - handle both 'remarks' and 'comments' fields
      let finalRemarks = itemResponse.remarks || itemResponse.comments || null;
      if (finalRemarks === '') finalRemarks = null; // Convert empty string to null
  
      // Create the API response object - Include ALL items for complete checklist state
      const apiResponse = {
        item_id: item.item_id,
        sr_no: index + 1,
        section: item.section_name || 'GENERAL',
        subsection: item.sub_section_name || null,
        check_description: item.check_description || item.description || '',
        pic: item.pic || '',
        response_type: item.response_type || 'yes_no_na',
        yes_no_na_value,
        text_value,
        date_value,
        remarks: finalRemarks,
        guidance: item.guidance || '',
        is_mandatory: item.is_mandatory || false,
        requires_evidence: item.requires_evidence || false
      };
  
      apiResponses.push(apiResponse);
      
      // Log items with actual responses for debugging
      const hasResponse = yes_no_na_value || text_value || date_value || finalRemarks;
      if (hasResponse) {
        console.log(`✓ Item ${item.item_id} has response:`, {
          yes_no_na_value,
          text_value,
          date_value,
          remarks: finalRemarks,
          is_mandatory: item.is_mandatory
        });
      } else {
        console.log(`○ Item ${item.item_id} has no response (${item.is_mandatory ? 'MANDATORY' : 'optional'})`);
      }
    });
  
    console.log('=== TRANSFORMATION COMPLETE ===');
    console.log('Total API responses created:', apiResponses.length);
    console.log('Unique item IDs processed:', processedItemIds.size);
    
    // Count responses with actual values
    const responsesWithValues = apiResponses.filter(r => 
      r.yes_no_na_value !== null || 
      r.text_value !== null || 
      r.date_value !== null ||
      (r.remarks !== null && r.remarks !== '')
    );
    
    const mandatoryResponsesWithValues = responsesWithValues.filter(r => r.is_mandatory);
    
    console.log('Summary:');
    console.log(`  - Total responses: ${apiResponses.length}`);
    console.log(`  - Responses with values: ${responsesWithValues.length}`);
    console.log(`  - Mandatory responses with values: ${mandatoryResponsesWithValues.length}`);
    console.log(`  - Items in form state: ${Object.keys(formResponses).length}`);
    
    // Log first few responses with values for debugging
    if (responsesWithValues.length > 0) {
      console.log('Sample responses with values:', responsesWithValues.slice(0, 5).map(r => ({
        item_id: r.item_id,
        yes_no_na_value: r.yes_no_na_value,
        text_value: r.text_value,
        remarks: r.remarks,
        is_mandatory: r.is_mandatory
      })));
    }

    // Validation check
    if (responsesWithValues.length === 0 && Object.keys(formResponses).length > 0) {
      console.warn('⚠️ WARNING: Form has responses but no API responses were created with values!');
      console.log('Form responses debug:', formResponses);
    }
  
    return apiResponses;
};

// Enhanced progress calculation with better logging
const calculateProgress = (responses, items) => {
    console.log('=== CALCULATING PROGRESS ===');
    console.log('Form responses keys:', Object.keys(responses));
    console.log('Items count:', items.length);
    
    const completedItems = items.filter(item => {
      const response = responses[item.item_id];
      const isCompleted = response && (
        response.response === 'Yes' || 
        response.response === 'No' || 
        response.response === 'N/A' ||
        (response.response && String(response.response).trim() !== '')
      );
      
      if (isCompleted) {
        console.log(`✓ Completed: ${item.item_id} = ${response.response}`);
      }
      
      return isCompleted;
    });
    
    const mandatoryItems = items.filter(item => item.is_mandatory);
    const mandatoryCompleted = mandatoryItems.filter(item => {
      const response = responses[item.item_id];
      const isCompleted = response && (
        response.response === 'Yes' || 
        response.response === 'No' || 
        response.response === 'N/A' ||
        (response.response && String(response.response).trim() !== '')
      );
      
      return isCompleted;
    });
    
    const progress = {
      total: items.length,
      completed: completedItems.length,
      mandatory: mandatoryItems.length,
      mandatoryCompleted: mandatoryCompleted.length,
      percentage: items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0,
      mandatoryPercentage: mandatoryItems.length > 0 ? Math.round((mandatoryCompleted.length / mandatoryItems.length) * 100) : 100
    };
    
    console.log('Progress calculated:', progress);
    return progress;
};

// Enhanced validation function
const validateResponsesForSubmission = (apiResponses, templateItems) => {
    console.log('=== VALIDATING RESPONSES FOR SUBMISSION ===');
    
    const validation = {
      isValid: true,
      mandatoryIncomplete: [],
      errors: [],
      summary: {
        totalItems: templateItems.length,
        totalMandatory: 0,
        completedMandatory: 0,
        totalOptional: 0,
        completedOptional: 0
      }
    };

    // Create a map of responses for quick lookup
    const responseMap = new Map();
    apiResponses.forEach(response => {
      responseMap.set(response.item_id, response);
    });

    templateItems.forEach(item => {
      const response = responseMap.get(item.item_id);
      const hasResponse = response && (
        response.yes_no_na_value !== null ||
        response.text_value !== null ||
        response.date_value !== null ||
        (response.remarks !== null && response.remarks !== '')
      );

      if (item.is_mandatory) {
        validation.summary.totalMandatory++;
        if (hasResponse) {
          validation.summary.completedMandatory++;
        } else {
          validation.isValid = false;
          validation.mandatoryIncomplete.push({
            item_id: item.item_id,
            description: item.description || item.check_description || 'No description',
            section: item.section_name || 'Unknown section'
          });
        }
      } else {
        validation.summary.totalOptional++;
        if (hasResponse) {
          validation.summary.completedOptional++;
        }
      }
    });

    console.log('Validation result:', {
      isValid: validation.isValid,
      mandatoryIncomplete: validation.mandatoryIncomplete.length,
      summary: validation.summary
    });

    if (validation.mandatoryIncomplete.length > 0) {
      console.log('Missing mandatory items:', validation.mandatoryIncomplete.slice(0, 5));
    }

    return validation;
};

export { 
  transformResponsesToAPIFormat, 
  calculateProgress, 
  validateResponsesForSubmission 
};