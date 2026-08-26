import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        console.log("========== AUTHENTICATION ==========");
        console.log("Authorization Header:", authHeader);

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const parts = authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        const token = parts[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const normalizedUser = {
            ...decoded,
            _id: decoded?._id || decoded?.userId,
            userId: decoded?.userId || decoded?._id,
            role: decoded?.role ? String(decoded.role).toUpperCase() : decoded?.role,
        };

        console.log("Decoded JWT:", decoded);
        req.user = normalizedUser;

        console.log("Authenticated User:", req.user);
        console.log("User Role:", req.user.role);

        next();

    } catch (error) {

        console.error("JWT ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};