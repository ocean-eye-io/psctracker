// src/components/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ship, Lock, User, AlertCircle } from 'lucide-react'; 
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import './AuthStyles.css';
import LoginBackgroundSVG from './LoginBackgroundSVG'; // <--- ADDED IMPORT

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, loading, currentUser } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      await signIn(username, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  return (
    <div className="auth-container">
      <LoginBackgroundSVG /> {/* <--- ADDED SVG COMPONENT HERE */}
      <div className="auth-card">
        <div className="auth-header">
          <Logo width="180" height="180" className="brand-icon" id="login-logo" /> 
          {/* NEW: Wrapper div for FleetWatch text and its wave */}
          <div className="fleetwatch-text-wrapper"> 
            <h1>FleetWatch</h1>
            {/* MOVED: The animated wave is now inside this wrapper, directly under h1 */}
            <div className="animated-wave auth-wave"></div> 
          </div>
        </div>

        {/* The separator line remains here, below the entire auth-header block */}
        <div className="header-separator"></div> 
        
        <h2>Sign In</h2>
        
        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
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
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} /> 
              <span>Password</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'} 
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/signup">Don't have an account? Sign Up</Link> 
        </div>
      </div>
    </div>
  );
};

export default Login;