import React, { useState } from 'react';
import { Button } from '../../../ui/button';
import { CheckSquare, AlertTriangle, AlertCircle, Loader2, X, CheckCircle } from 'lucide-react';

const ChecklistForm = ({ vessel, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    documentation: true,
    safety: true,
    cargo: true,
    crew: true,
    hasConcerns: false,
    concerns: '',
    verifiedBy: '',
    verifiedDate: new Date().toISOString().split('T')[0]
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'hasConcerns' && !checked) {
      // If unchecking "has concerns", clear the concerns text
      setFormData({
        ...formData,
        [name]: checked,
        concerns: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
    
    // Clear validation error when field is changed
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (formData.hasConcerns && !formData.concerns.trim()) {
      errors.concerns = 'Please describe the concerns';
    }
    
    if (!formData.verifiedBy.trim()) {
      errors.verifiedBy = 'Verifier name is required';
    }
    
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Show submitting state
    setIsSubmitting(true);
    
    // Simulate network delay
    setTimeout(() => {
      onSubmit(formData);
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vessel Summary */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">Vessel Name:</span>
          <span className="text-sm font-medium">{vessel.vessel_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">IMO Number:</span>
          <span className="text-sm font-medium">{vessel.imo_no}</span>
        </div>
      </div>
      
      {/* Checklist Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Safety & Compliance Checklist</h3>
        
        <ChecklistItem
          name="documentation"
          label="Required documentation is complete and verified"
          checked={formData.documentation}
          onChange={handleInputChange}
        />
        
        <ChecklistItem
          name="safety"
          label="All safety requirements and procedures are in place"
          checked={formData.safety}
          onChange={handleInputChange}
        />
        
        <ChecklistItem
          name="cargo"
          label="Cargo operations requirements are met"
          checked={formData.cargo}
          onChange={handleInputChange}
        />
        
        <ChecklistItem
          name="crew"
          label="Crew certifications and manning requirements verified"
          checked={formData.crew}
          onChange={handleInputChange}
        />
      </div>
      
      {/* Concerns Section */}
      <div className="pt-4 pb-2">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors">
          <input
            type="checkbox"
            name="hasConcerns"
            checked={formData.hasConcerns}
            onChange={handleInputChange}
            className="w-4 h-4 rounded text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"
          />
          <span className="flex items-center gap-1">
            <AlertTriangle size={16} className="text-red-500" />
            Flag concerns requiring attention
          </span>
        </label>
        
        {formData.hasConcerns && (
          <div className="mt-3 pl-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Describe concerns
            </label>
            <textarea
              name="concerns"
              value={formData.concerns}
              onChange={handleInputChange}
              rows={3}
              className={`w-full p-2 bg-gray-800 border ${validationErrors.concerns ? 'border-red-500' : 'border-gray-600'} rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all`}
              placeholder="Describe the concerns that need attention..."
            ></textarea>
            {validationErrors.concerns && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.concerns}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Verification Information */}
      <div className="pt-4 border-t border-gray-700 space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Verification Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Verified By
          </label>
          <input
            type="text"
            name="verifiedBy"
            value={formData.verifiedBy}
            onChange={handleInputChange}
            className={`w-full p-2 bg-gray-800 border ${validationErrors.verifiedBy ? 'border-red-500' : 'border-gray-600'} rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all`}
            placeholder="Your name"
          />
          {validationErrors.verifiedBy && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {validationErrors.verifiedBy}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Verification Date
          </label>
          <input
            type="date"
            name="verifiedDate"
            value={formData.verifiedDate}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="hover:bg-gray-800 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className={`${formData.hasConcerns ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} transition-colors flex items-center gap-2`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {formData.hasConcerns ? (
                <>
                  <AlertTriangle size={16} />
                  Submit with Concerns
                </>
              ) : (
                <>
                  <CheckSquare size={16} />
                  Submit Checklist
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// ChecklistItem Component
const ChecklistItem = ({ name, label, checked, onChange }) => {
  return (
    <div className="flex items-start p-2 border border-gray-800 rounded-md transition-all hover:border-gray-700 bg-gray-900/50">
      <div className="flex h-5 items-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
        />
      </div>
      <div className="ml-3 flex items-center justify-between w-full">
        <label htmlFor={name} className="text-sm text-gray-300">
          {label}
        </label>
        {checked ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : (
          <X size={16} className="text-red-500" />
        )}
      </div>
    </div>
  );
};

export default ChecklistForm;