// This file is superseded by /pages/Register.jsx (email+password, no wallet).
// Kept as a redirect shim so any stale link to applicantRegister still works.
import { Navigate } from "react-router-dom";
export default function ApplicantRegisterRedirect() {
  return <Navigate to="/register" replace />;
}