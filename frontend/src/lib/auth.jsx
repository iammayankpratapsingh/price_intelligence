import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { clearSession, getStoredUser, getToken, login as loginRequest, saveSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));

  /**
   * Verifies the credentials and stores the token, but deliberately does NOT
   * publish the user yet. The login screen plays its drive-through animation
   * first; publishing here would redirect off /login before it could run.
   */
  const authenticate = useCallback(async (email, password, remember = true) => {
    const { token, user: profile } = await loginRequest(email, password);
    saveSession(token, profile, remember);
    return profile;
  }, []);

  /** Publishes the stored session, which is what actually unlocks the app. */
  const commitSession = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  /** Verify and publish in one step, for callers that want no animation. */
  const signIn = useCallback(
    async (email, password, remember = true) => {
      const profile = await authenticate(email, password, remember);
      setUser(profile);
      return profile;
    },
    [authenticate],
  );

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, authenticate, commitSession, signIn, signOut }),
    [user, authenticate, commitSession, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
