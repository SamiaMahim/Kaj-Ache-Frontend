import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AUTH_EXPIRED_EVENT, getCurrentAccount } from '../services/api';
import { readStoredJson } from '../utils/storage';
import { resolveAccountRole } from '../utils/accountRole';

const AuthContext = createContext(null);

// "Remember me" off: the session lives in localStorage like any other, but is
// marked session-only. sessionStorage is empty in a new browser session, so a
// marked token found without the marker belongs to a closed browser: drop it.
const SESSION_ONLY_KEY = 'sessionOnly';
const SESSION_ALIVE_KEY = 'sessionAlive';

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('kajacheAuth');
  localStorage.removeItem('user');
  localStorage.removeItem(SESSION_ONLY_KEY);
};

try {
  if (localStorage.getItem(SESSION_ONLY_KEY) && !sessionStorage.getItem(SESSION_ALIVE_KEY)) {
    clearStoredSession();
  }
} catch {
  // Storage blocked: nothing stored to drop
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const cached = readStoredJson('kajacheAuth', null);
    return cached;
  });
  // Nothing to load without a stored token
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const isRefreshingRef = useRef(false);
  // Latest user without making refreshAccount depend on it (a [user] dep re-created the
  // callback on every refresh, re-running the heartbeat effect → endless /profile/me calls)
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Detect role reliably
  const role = user?.role || (user?.roleModelName === 'CustomerProfile' ? 'customer' : user?.roleModelName === 'TechnicianProfile' ? 'technician' : 'customer');
  const walletBalance = user?.profileDetail?.walletBalance ?? user?.walletBalance ?? 0;
  const verificationStatus = user?.verificationStatus || 'approved';

  const refreshAccount = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    if (isRefreshingRef.current) return userRef.current;
    isRefreshingRef.current = true;

    try {
      const currentAccount = await getCurrentAccount();
      if (!currentAccount) {
        setLoading(false);
        return null;
      }

      const detectedRole = resolveAccountRole(currentAccount);
      if (!detectedRole) {
        // Unsupported role (e.g. an admin token): drop the session instead of guessing a role
        clearStoredSession();
        setToken('');
        setUser(null);
        return null;
      }

      const updatedUser = {
        ...currentAccount,
        role: detectedRole,
        name: currentAccount.profileDetail?.fullName || currentAccount.username || 'User',
        email: currentAccount.email,
        walletBalance: currentAccount.profileDetail?.walletBalance ?? 0,
        verificationStatus: currentAccount.verificationStatus || 'approved',
        verificationReason: currentAccount.verificationReason || '',
      };

      localStorage.setItem('kajacheAuth', JSON.stringify({
        role: updatedUser.role,
        name: updatedUser.name,
        email: updatedUser.email,
        verificationStatus: updatedUser.verificationStatus,
      }));

      setUser(updatedUser);
      return updatedUser;
    } catch {
      // Network blip: keep current user. A 401 is handled by the
      // AUTH_EXPIRED_EVENT listener below, which logs out.
      return userRef.current;
    } finally {
      isRefreshingRef.current = false;
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (newToken, userPayload, roleHint, rememberMe = false) => {
    localStorage.setItem('token', newToken);
    if (rememberMe) {
      localStorage.removeItem(SESSION_ONLY_KEY);
    } else {
      localStorage.setItem(SESSION_ONLY_KEY, '1');
      sessionStorage.setItem(SESSION_ALIVE_KEY, '1');
    }
    setToken(newToken);

    const detectedRole = roleHint || resolveAccountRole(userPayload) || 'customer';

    const basicUser = {
      ...userPayload,
      role: detectedRole,
      name: userPayload?.profileDetail?.fullName || userPayload?.username || userPayload?.email,
      email: userPayload?.email,
      walletBalance: userPayload?.profileDetail?.walletBalance ?? 0,
      verificationStatus: userPayload?.verificationStatus || 'approved',
    };

    localStorage.setItem('kajacheAuth', JSON.stringify({
      role: basicUser.role,
      name: basicUser.name,
      email: basicUser.email,
      verificationStatus: basicUser.verificationStatus,
    }));

    setUser(basicUser);

    // Refresh in background to get full populated profile
    setTimeout(() => {
      refreshAccount();
    }, 100);
  }, [refreshAccount]);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken('');
    setUser(null);
  }, []);

  // api.js clears storage on a 401 and fires this event; drop in-memory state
  useEffect(() => {
    const onExpired = () => {
      setToken('');
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  // Single centralized sync heartbeat (12s) only when tab is visible
  useEffect(() => {
    if (localStorage.getItem('token')) refreshAccount();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        refreshAccount();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        refreshAccount();
      }
    }, 12000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAccount]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        walletBalance,
        verificationStatus,
        loading,
        refreshAccount,
        login,
        logout,
        isAuthenticated: Boolean(token && user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
