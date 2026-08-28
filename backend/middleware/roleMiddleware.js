export const authorizeRoles = (...allowedRoles) => {
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toUpperCase());

    return (req, res, next) => {
        console.log("========== ROLE CHECK ==========");
        console.log("User role:", req.user?.role);
        console.log("Allowed roles:", normalizedAllowedRoles);
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const userRole = String(req.user.role || "").toUpperCase();

        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }
        next();
    };

};