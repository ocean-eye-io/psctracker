// src/components/auth/ConfirmSignUp.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Ship, CheckCircle, AlertCircle, KeySquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

const ConfirmSignUp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirmSignUp, loading, currentUser } = useAuth();
  
  // Get username from navigation state or empty string
  const [username, setUsername] = useState(location.state?.username || '');
  const [code, setCode] = useState('');
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
    
    if (!username || !code) {
      setError('Please enter both username and verification code');
      return;
    }
    
    try {
      await confirmSignUp(username, code);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Confirmation error:', err);
      setError(err.message || 'Failed to confirm account');
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
        
        <h2>Confirm Your Account</h2>
        
        {success ? (
          <div className="auth-success">
            <CheckCircle size={18} />
            <div>
              <p>Your account has been confirmed successfully!</p>
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
            <p className="auth-instruction">Please enter the verification code sent to your email.</p>
            
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
              
              <button 
                type="submit" 
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Account'}
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

export default ConfirmSignUp;