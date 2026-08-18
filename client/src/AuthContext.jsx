import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [speaker, setSpeaker] = useState(undefined); // undefined = loading, null = signed out
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    return api
      .me()
      .then((data) => {
        setSpeaker(data.speaker);
        return data.speaker;
      })
      .catch(() => {
        setSpeaker(null);
        return null;
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await api.login(email, password);
      setSpeaker(data.speaker);
      return true;
    } catch (e) {
      setError(e.message);
      throw e; // callers that need e.data (e.g. requiresConfirmation) can inspect it
    }
  }, []);

  // Returns true if registration logged the speaker in immediately, or "confirm" if a
  // confirmation email was sent instead (no session yet).
  const register = useCallback(async (email, password) => {
    setError(null);
    try {
      const data = await api.register(email, password);
      if (data.requiresConfirmation) return "confirm";
      setSpeaker(data.speaker);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setSpeaker(null);
  }, []);

  return (
    <AuthContext.Provider value={{ speaker, error, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
