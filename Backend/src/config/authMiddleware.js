const jwt = require('jsonwebtoken');

const authMiddleware = {
    // Middleware to verify JWT token
    verifyToken: (req, res, next) => {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123');

            // Add user payload to request object
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
        }
    },

    // Middleware to verify role/permissions (Dynamic RBAC)
    // Accept array of allowed role IDs (tipe_user_id) or check dynamic permissions here
    requireRole: (allowedRoleIds) => {
        return (req, res, next) => {
            if (!req.user || !req.user.tipe_user_id) {
                return res.status(403).json({ success: false, message: 'User role not found, access denied' });
            }

            // Super Admin (ID: 1) usually has access to everything
            if (req.user.tipe_user_id === 1) {
                return next();
            }

            // Check if current user's role is in the allowed list
            if (allowedRoleIds && allowedRoleIds.includes(req.user.tipe_user_id)) {
                return next();
            }

            return res.status(403).json({ success: false, message: 'Insufficient permissions to access this resource' });
        };
    }
};

module.exports = authMiddleware;
