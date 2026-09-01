const jwt = require('jsonwebtoken');

const authMiddleware = {
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.authorization;
        let token = authHeader && authHeader.split(' ')[1];

        // Fallback to query string for download routes
        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123');
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
        }
    },

    requireRole: (allowedRoleIds) => {
        return (req, res, next) => {
            if (!req.user || !req.user.tipe_user_id) {
                return res.status(403).json({ success: false, message: 'User role not found, access denied' });
            }

            if (req.user.tipe_user_id === 1) {
                return next();
            }

            if (allowedRoleIds && allowedRoleIds.includes(req.user.tipe_user_id)) {
                return next();
            }

            return res.status(403).json({ success: false, message: 'Insufficient permissions to access this resource' });
        };
    }
};

module.exports = authMiddleware;
