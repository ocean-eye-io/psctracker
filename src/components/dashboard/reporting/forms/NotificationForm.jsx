import React, { useState } from 'react';
import { Button } from '../../../ui/button';
import { Calendar, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const NotificationForm = ({ vessel, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    etaConfirmed: true,
    cargoReady: true,
    comments: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
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
    if (formData.contactPerson && !formData.contactEmail) {
      errors.contactEmail = 'Contact email is required when contact person is specified';
    }
    
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address';
    }
    
    if (formData.contactPhone && !/^[+\d\s()-]{7,20}$/.test(formData.contactPhone)) {
      errors.contactPhone = 'Please enter a valid phone number';
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
    }, 600);
  };

  // Format ETA date and show remaining days
  const formatEta = () => {
    if (!vessel.eta) return 'Not specified';
    
    const etaDate = new Date(vessel.eta);
    const now = new Date();
    const diffTime = etaDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return (
      <div>
        <div>{etaDate.toLocaleDateString()} at {etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        {diffDays > 0 && (
          <div className="text-blue-400 text-xs mt-1">
            {diffDays} {diffDays === 1 ? 'day' : 'days'} from now
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vessel Summary */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">Vessel Name:</span>
          <span className="text-sm font-medium">{vessel.vessel_name}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">IMO Number:</span>
          <span className="text-sm font-medium">{vessel.imo_no}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Expected Arrival:</span>
          <span className="text-sm font-medium text-right">{formatEta()}</span>
        </div>
      </div>
      
      {/* Form Fields */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors">
            <input
              type="checkbox"
              name="etaConfirmed"
              checked={formData.etaConfirmed}
              onChange={handleInputChange}
              className="w-4 h-4 rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
            />
            <span>ETA is confirmed and accurate</span>
          </label>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors">
            <input
              type="checkbox"
              name="cargoReady"
              checked={formData.cargoReady}
              onChange={handleInputChange}
              className="w-4 h-4 rounded text-blue-500 bg-gray-800 border-gray-600 focus:ring-blue-500"
            />
            <span>Cargo is ready for loading/unloading</span>
          </label>
        </div>
        
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Comments
          </label>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            rows={3}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="Add any additional information or comments..."
          ></textarea>
        </div>
        
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
            placeholder="Name of contact person (optional)"
          />
        </div>
        
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contact Email
          </label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleInputChange}
            className={`w-full p-2 bg-gray-800 border ${validationErrors.contactEmail ? 'border-red-500' : 'border-gray-600'} rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all`}
            placeholder="Email address (optional)"
          />
          {validationErrors.contactEmail && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {validationErrors.contactEmail}
            </p>
          )}
        </div>
        
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contact Phone
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleInputChange}
            className={`w-full p-2 bg-gray-800 border ${validationErrors.contactPhone ? 'border-red-500' : 'border-gray-600'} rounded-md text-gray-100 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all`}
            placeholder="Phone number (optional)"
          />
          {validationErrors.contactPhone && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {validationErrors.contactPhone}
            </p>
          )}
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
          className="bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
              Submitting...
            </>
          ) : (
            <>
              <Calendar size={16} />
              Submit Notification
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default NotificationForm;