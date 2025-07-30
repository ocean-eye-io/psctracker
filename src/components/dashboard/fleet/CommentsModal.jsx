import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import './FleetStyles.css';

const CommentsModal = ({ 
  isOpen, 
  onClose, 
  vessel, 
  onCommentUpdated,
  isLoading = false
}) => {
  // State for the comment being edited
  const [comment, setComment] = useState('');
  // State for any error messages
  const [error, setError] = useState('');
  // State for loading indicators
  const [isSaving, setIsSaving] = useState(false);

  // Initialize the comment when the vessel changes
  useEffect(() => {
    if (vessel && vessel.comments) {
      setComment(vessel.comments || '');
    } else {
      setComment('');
    }
  }, [vessel]);

  // Reset the form when the modal closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
    }
  }, [isOpen]);

  // Handle saving the comment
  const handleSaveComment = async () => {
    setIsSaving(true);
    setError('');
    console.log("Vessel object:", vessel);
    console.log("Vessel ID type:", typeof vessel.id);
    console.log("Comment to save:", comment);

    try {
      
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'stackblitz.com') {
        console.log('Development mode: Simulating API call');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate successful update
        if (onCommentUpdated) {
          onCommentUpdated({
            ...vessel,
            comments: comment
          });
        }
        
        // Close the modal
        onClose();
        return;
      }

      // Production code path
      const response = await fetch('https://mvowrtmyd4go63badvhkr6rueq0evdzu.lambda-url.ap-south-1.on.aws/api/vessels/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: vessel.id, 
          imo_no: vessel.imo_no,
          comments: comment
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      const updatedVessel = await response.json();
      
      // Notify parent component
      if (onCommentUpdated) {
        onCommentUpdated({
          ...vessel,
          comments: comment
        });
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating comment:', error);
      
      // Check if we're in a development environment or StackBlitz
      if (process.env.NODE_ENV === 'development' || 
          window.location.hostname === 'stackblitz.com' ||
          error.message.includes('Failed to fetch')) {
        // Simulate successful update for testing
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (onCommentUpdated) {
          onCommentUpdated({
            ...vessel,
            comments: comment
          });
        }
        onClose();
      } else {
        setError(error.message || 'Failed to update comment');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !vessel) return null;

  return (
    <div className="comments-modal-overlay">
      <div className="comments-modal">
        <div className="comments-modal-header">
          <div>
            <h3 className="comments-modal-title">
              Comments for {vessel.vessel_name}
            </h3>
            <p className="comments-modal-subtitle">
              IMO: {vessel.imo_no}
            </p>
          </div>
          <button 
            className="comments-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="comments-modal-body">
          {/* Error message */}
          {error && (
            <div className="comments-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          {/* Comment edit form */}
          <div className="comments-form">
            <label htmlFor="vessel-comments" className="comments-label">Edit Comments</label>
            <textarea
              id="vessel-comments"
              className="comments-textarea"
              placeholder="Enter your comments here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSaving || isLoading}
              rows={8}
            />
          </div>
        </div>
        
        <div className="comments-modal-footer">
          <button 
            className="comments-button cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            className="comments-button save"
            onClick={handleSaveComment}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <div className="spinner-sm"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;