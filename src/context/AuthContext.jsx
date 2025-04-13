import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import crypto from 'crypto-js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate SECRET_HASH for Cognito authentication
  const calculateSecretHash = (username) => {
    const clientId = '6rae2nmj34vkglmnd2tu380rrm';
    const clientSecret = 'iort5ud2034ufqrav9ejodb9baa89blt21dqtsmmdtje5p560oo';
    
    const message = username + clientId;
    const hashHmac = crypto.HmacSHA256(message, clientSecret);
    return crypto.enc.Base64.stringify(hashHmac);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if a user is already authenticated
  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const user = await Auth.currentAuthenticatedUser();
      setCurrentUser(user);
    } catch (err) {
      console.log('No authenticated user');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Sign in user
  const handleSignIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const user = await Auth.signIn(username, password);
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up user
  const handleSignUp = async (username, password, email) => {
    setLoading(true);
    setError(null);
    try {
      const secretHash = calculateSecretHash(username);
      
      const { user } = await Auth.signUp({
        username,
        password,
        attributes: {
          email
        },
        clientMetadata: {
          SECRET_HASH: secretHash
        }
      });
      
      return user;
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Confirm sign up with verification code
  const handleConfirmSignUp = async (username, code) => {
    setLoading(true);
    setError(null);
    try {
      const secretHash = calculateSecretHash(username);
      
      await Auth.confirmSignUp(username, code, {
        clientMetadata: {
          SECRET_HASH: secretHash
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to confirm sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await Auth.signOut();
      setCurrentUser(null);
    } catch (err) {
      setError(err.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async (username) => {
    setLoading(true);
    setError(null);
    try {
      const secretHash = calculateSecretHash(username);
      
      await Auth.forgotPassword(username, {
        clientMetadata: {
          SECRET_HASH: secretHash
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password with confirmation code
  const handleResetPassword = async (username, code, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const secretHash = calculateSecretHash(username);
      
      await Auth.forgotPasswordSubmit(
        username, 
        code, 
        newPassword, 
        {
          clientMetadata: {
            SECRET_HASH: secretHash
          }
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signOut: handleSignOut,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};