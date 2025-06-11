// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

// Your deployed API Gateway URL
const AUTH_API_URL = 'https://c73anpavlg4ezzsye5selr55gm0sagll.lambda-url.ap-south-1.on.aws/prod/auth';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user session from localStorage on startup
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if a user is already authenticated by checking localStorage
  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const sessionData = localStorage.getItem('auth_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);

        // Check if the token is expired
        const expiration = session.expiresAt;
        if (expiration && new Date() < new Date(expiration)) {
          // Ensure userId is set when loading from localStorage
          setCurrentUser({
            ...session.user,
            userId: session.user.userId || JSON.parse(atob(session.idToken.split('.')[1])).sub // Fallback if userId wasn't explicitly saved before
          });

          // If token is about to expire, refresh it
          if (new Date() > new Date(expiration - 5 * 60 * 1000)) {
            refreshTokenSilently(session.refreshToken);
          }
        } else {
          // Token is expired, try to refresh
          await refreshTokenSilently(session.refreshToken);
        }
      }
    } catch (err) {
      console.log('No authenticated user');
      localStorage.removeItem('auth_session');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh the token silently in the background
  const refreshTokenSilently = async (refreshToken) => {
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'refreshToken',
          username: localStorage.getItem('auth_username'),
          refreshToken: refreshToken
        })
      });

      const data = await response.json();

      if (data.AuthenticationResult) {
        const authResult = data.AuthenticationResult;

        // Decode the JWT token payload
        const userPayload = JSON.parse(atob(authResult.IdToken.split('.')[1]));

        // Calculate token expiration (default: 1 hour)
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + authResult.ExpiresIn);

        // Save to state and localStorage
        const session = {
          user: { // Structure the user object as needed
            username: userPayload['cognito:username'] || userPayload.username,
            email: userPayload.email,
            userId: userPayload.sub, // <--- THIS IS THE ADDED LINE
            // Add other claims you might need from userPayload
          },
          idToken: authResult.IdToken,
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken || refreshToken,
          expiresAt: expiresAt.toISOString()
        };

        localStorage.setItem('auth_session', JSON.stringify(session));
        setCurrentUser(session.user); // Set the structured user object
        return session.user;
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      localStorage.removeItem('auth_session');
      setCurrentUser(null);
      throw error;
    }
  };

  // Handle NEW_PASSWORD_REQUIRED challenge
  const handleNewPasswordChallenge = async (username, password, session) => {
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'respondToAuthChallenge',
          username,
          challengeName: 'NEW_PASSWORD_REQUIRED',
          session,
          newPassword: password // Using the same password
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      console.error('New password challenge error:', err);
      throw err;
    }
  };

  // Sign in user
  const handleSignIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      // Initial sign-in attempt
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'signIn',
          username,
          password
        })
      });

      let data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Handle NEW_PASSWORD_REQUIRED challenge
      if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        console.log('Received NEW_PASSWORD_REQUIRED challenge, responding automatically');

        const challengeData = await handleNewPasswordChallenge(username, password, data.Session);

        // Replace with challenge response data
        data = challengeData;
      } else if (data.ChallengeName) {
        // Other challenges we don't automatically handle
        console.log('Unhandled challenge type:', data.ChallengeName);
        throw new Error(`Authentication challenge required: ${data.ChallengeName}`);
      }

      if (data.AuthenticationResult) {
        const authResult = data.AuthenticationResult;

        // Decode the JWT token to get user info
        const userPayload = JSON.parse(atob(authResult.IdToken.split('.')[1]));

        // Calculate token expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + authResult.ExpiresIn);

        // Save username for token refreshes
        localStorage.setItem('auth_username', username);

        // Save to state and localStorage
        const session = {
          user: { // Structure the user object as needed
            username: userPayload['cognito:username'] || userPayload.username,
            email: userPayload.email,
            userId: userPayload.sub, // <--- THIS IS THE ADDED LINE
            // Add other claims you might need from userPayload
          },
          idToken: authResult.IdToken,
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
          expiresAt: expiresAt.toISOString()
        };

        localStorage.setItem('auth_session', JSON.stringify(session));
        setCurrentUser(session.user); // Set the structured user object
        return session.user;
      } else {
        throw new Error('Authentication failed');
      }
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
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'signUp',
          username,
          password,
          email
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Confirm sign up
  const handleConfirmSignUp = async (username, code) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'confirmSignUp',
          username,
          code
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
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
      // For global sign-out, you could add a signOut action to your Lambda
      // For now, we'll just clear local state
      localStorage.removeItem('auth_session');
      localStorage.removeItem('auth_username');
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
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'forgotPassword',
          username
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
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
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'confirmForgotPassword',
          username,
          code,
          newPassword
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get current session tokens
  const getSession = () => {
    const sessionData = localStorage.getItem('auth_session');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    return null;
  };

  // Helper to get access token for API calls
  const getAccessToken = () => {
    const session = getSession();
    return session ? session.accessToken : null;
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
    checkAuthStatus,
    getSession,
    getAccessToken
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