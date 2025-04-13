// src/services/mockAuthService.js
const STORAGE_KEY = 'auth_user';

// Mock user database (in real app, this would be in Cognito)
const mockUsers = {};

export const mockAuthService = {
  // Sign up a new user
  signUp: async (username, password, email) => {
    if (mockUsers[username]) {
      throw new Error('User already exists');
    }
    
    mockUsers[username] = {
      username,
      password,
      email,
      confirmed: false,
      attributes: { email }
    };
    
    return { user: { username } };
  },
  
  // Confirm signup with code
  confirmSignUp: async (username, code) => {
    if (!mockUsers[username]) {
      throw new Error('User does not exist');
    }
    
    // In a real app, verify code here
    if (code === '123456' || code === '') {
      mockUsers[username].confirmed = true;
      return { isSignUpComplete: true };
    } else {
      throw new Error('Invalid verification code');
    }
  },
  
  // Sign in existing user
  signIn: async (username, password) => {
    const user = mockUsers[username];
    
    if (!user) {
      throw new Error('User does not exist');
    }
    
    if (!user.confirmed) {
      throw new Error('User is not confirmed');
    }
    
    if (user.password !== password) {
      throw new Error('Incorrect username or password');
    }
    
    // Store user in local storage to maintain session
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      username: user.username,
      attributes: user.attributes
    }));
    
    return { username: user.username, attributes: user.attributes };
  },
  
  // Sign out current user
  signOut: async () => {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  },
  
  // Get current authenticated user
  getCurrentUser: async () => {
    const userData = localStorage.getItem(STORAGE_KEY);
    if (!userData) {
      throw new Error('No current user');
    }
    
    return JSON.parse(userData);
  },
  
  // Forgot password flow
  forgotPassword: async (username) => {
    if (!mockUsers[username]) {
      throw new Error('User does not exist');
    }
    
    return { username };
  },
  
  // Reset password with code
  forgotPasswordSubmit: async (username, code, newPassword) => {
    if (!mockUsers[username]) {
      throw new Error('User does not exist');
    }
    
    // In a real app, verify code here
    if (code === '123456' || code === '') {
      mockUsers[username].password = newPassword;
      return true;
    } else {
      throw new Error('Invalid verification code');
    }
  }
};