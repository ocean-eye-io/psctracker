// src/components/auth/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Ship, Lock, AlertCircle, CheckCircle, KeySquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPassword, loading, currentUser } = useAuth();
  
  // Get username from navigation state or empty string
  const [username, setUsername] = useState(location.state?.username || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!username || !code || !newPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      await resetPassword(username, code, newPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Ship size={40} className="brand-icon" />
          <h1>FleetWatch</h1>
          <div className="animated-wave auth-wave"></div>
        </div>
        
        <h2>Reset Password</h2>
        
        {success ? (
          <div className="auth-success">
            <CheckCircle size={18} />
            <div>
              <p>Your password has been reset successfully!</p>
              <p>Redirecting to login page...</p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            <p className="auth-instruction">
              Enter the verification code sent to your email and create a new password.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">
                  <KeySquare size={18} />
                  <span>Username</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="code">
                  <KeySquare size={18} />
                  <span>Verification Code</span>
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter verification code"
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">
                  <Lock size={18} />
                  <span>New Password</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  <Lock size={18} />
                  <span>Confirm Password</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
            
            <div className="auth-links">
              <Link to="/login">Back to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;