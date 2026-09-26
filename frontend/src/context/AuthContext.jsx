import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setAuth, clearAuth, getToken, getUser } from "../utils/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = getToken();
    const savedUser = getUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback((jwtToken, user) => {
    setAuth(jwtToken, user);
    setToken(jwtToken);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        isAuthenticated: !!token,
        role: currentUser?.role || null,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

export default AuthContext;
