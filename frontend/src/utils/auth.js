export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const getCurrentUser = getUser; // backward compat alias

export const setAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Remove any legacy wallet-related keys
  localStorage.removeItem("walletAddress");
};

export const isAuthenticated = () => !!getToken();

export const getUserRole = () => getUser()?.role || null;

export const isRole = (role) => getUserRole() === role;

/** @deprecated use clearAuth */
export const logout = clearAuth;