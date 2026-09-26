import { useAuth } from "../../context/AuthContext";

/**
 * Renders children only if the current user's role is in the allowed roles list.
 * Otherwise renders fallback (null by default).
 *
 * Usage:
 *   <RoleGuard roles={["ORGANISATION", "ADMIN"]}>
 *     <AdminOnlyButton />
 *   </RoleGuard>
 */
const RoleGuard = ({ roles = [], children, fallback = null }) => {
  const { role } = useAuth();
  if (!roles.includes(role)) return fallback;
  return children;
};

export default RoleGuard;
