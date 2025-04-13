// src/components/auth/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ship, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

const ForgotPassword = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const { forgotPassword, loading, currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username) {
      setError('Please enter your username');
      return;
    }
    
    try {
      await forgotPassword(username);
      setCodeSent(true);
      // Navigate to reset password page
      setTimeout(() => {
        navigate('/reset-password', { state: { username } });
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset code');
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
        
        <h2>Forgot Password</h2>
        
        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {codeSent && (
          <div className="auth-success">
            <CheckCircle size={18} />
            <span>Reset code sent! Check your email. Redirecting...</span>
          </div>
        )}
        
        <p className="auth-instruction">
          Enter your username and we'll send you a code to reset your password.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              <User size={18} />
              <span>Username</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading || codeSent}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading || codeSent}
          >
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;