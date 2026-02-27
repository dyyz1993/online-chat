/**
 * Authentication Hook
 * Manages authentication state and provides login/logout functions
 */

import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'staff_token';
const TOKEN_EXPIRES_KEY = 'staff_token_expires';

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  requireAuth: boolean;
  error: string | null;
  remainingAttempts: number | null;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    requireAuth: true,
    error: null,
    remainingAttempts: null,
  });

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
    if (!expiresAt) return true;
    return Date.now() / 1000 > parseInt(expiresAt, 10);
  }, []);

  // Get stored token
  const getStoredToken = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isTokenExpired()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_KEY);
      return null;
    }
    return token;
  }, [isTokenExpired]);

  // Store token
  const storeToken = useCallback((token: string, expiresAt: number) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
  }, []);

  // Clear token
  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  }, []);

  // Check if authentication is required
  const checkAuthRequired = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      return data.requireAuth === true;
    } catch {
      return true; // Default to requiring auth on error
    }
  }, []);

  // Verify token with server
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }, []);

  // Login with password
  const login = useCallback(async (password: string): Promise<LoginResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        storeToken(data.token, data.expiresAt);
        setState({
          isLoading: false,
          isAuthenticated: true,
          requireAuth: true,
          error: null,
          remainingAttempts: null,
        });
        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error || '登录失败',
          remainingAttempts: data.remainingAttempts ?? null,
        }));
        return {
          success: false,
          error: data.error,
          remainingAttempts: data.remainingAttempts,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败，请重试';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [storeToken]);

  // Logout
  const logout = useCallback(() => {
    clearToken();
    setState({
      isLoading: false,
      isAuthenticated: false,
      requireAuth: true,
      error: null,
      remainingAttempts: null,
    });
  }, [clearToken]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // Check URL for token (from push notification)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');

      if (urlToken) {
        // Store token from URL
        storeToken(urlToken, Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
        // Clean URL
        urlParams.delete('token');
        const newUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // Get stored token
      const token = getStoredToken();

      if (token) {
        // Verify token with server
        const valid = await verifyToken(token);
        if (mounted) {
          if (valid) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              requireAuth: true,
              error: null,
              remainingAttempts: null,
            });
          } else {
            // Token invalid, clear and check if auth required
            clearToken();
            const requireAuth = await checkAuthRequired();
            setState({
              isLoading: false,
              isAuthenticated: !requireAuth,
              requireAuth,
              error: null,
              remainingAttempts: null,
            });
          }
        }
      } else {
        // No token, check if auth required
        const requireAuth = await checkAuthRequired();
        if (mounted) {
          setState({
            isLoading: false,
            isAuthenticated: !requireAuth,
            requireAuth,
            error: null,
            remainingAttempts: null,
          });
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [getStoredToken, verifyToken, checkAuthRequired, clearToken, storeToken]);

  return {
    ...state,
    login,
    logout,
  };
}
