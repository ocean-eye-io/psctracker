// src/utils/dateUtils.js

export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0]; // YYYY-MM-DD for input type="date"
    } catch (e) {
      console.error("Error formatting date for input:", e);
      return '';
    }
  };
  
  export const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      console.error("Error formatting date for display:", e);
      return dateString;
    }
  };