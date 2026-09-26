import api from "../api/api";
import { clearAuth } from "../utils/auth";

/**
 * Register a new student.
 * Backend hashes password, creates User + blockchain ID internally.
 */
export const registerStudent = async (data) => {
  const response = await api.post("/auth/register", {
    ...data,
    role: "STUDENT",
  });
  return response.data;
};

/**
 * Generic login — works for STUDENT, ORGANISATION, ADMIN.
 * Sends email + password + role to /api/auth/login.
 * Returns { token, user }.
 */
export const login = async ({ email, password, role }) => {
  const response = await api.post("/auth/login", { email, password, role });
  return response.data; // { token, user }
};

/**
 * Organisation login (same endpoint, different role).
 */
export const organisationLogin = async ({ email, password }) => {
  return login({ email, password, role: "ORGANISATION" });
};

/**
 * Admin login.
 */
export const adminLogin = async ({ email, password }) => {
  return login({ email, password, role: "ADMIN" });
};

/** Clear local session. */
export const logout = () => {
  clearAuth();
};
