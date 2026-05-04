const pool = require('../config/db');

/**
 * Audit Logging Service
 * Records user actions and data changes for security and compliance.
 */
const auditService = {
    /**
     * Log an action to the audit_logs table
     * @param {Object} params
     * @param {number} params.user_id - ID of the user performing the action
     * @param {string} params.action - Name of the action (e.g. 'UPDATE_USER')
     * @param {string} [params.table_name] - Name of the affected table
     * @param {string|number} [params.record_id] - ID of the affected record
     * @param {Object} [params.old_values] - Data before change
     * @param {Object} [params.new_values] - Data after change
     * @param {Object} [params.req] - Express request object to extract IP and User Agent
     */
    log: async ({ user_id, action, table_name, record_id, old_values, new_values, req }) => {
        try {
            const ip_address = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
            const user_agent = req ? req.headers['user-agent'] : null;

            const query = `
                INSERT INTO audit_logs 
                (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await pool.query(query, [
                user_id || null,
                action,
                table_name || null,
                record_id ? String(record_id) : null,
                old_values ? JSON.stringify(old_values) : null,
                new_values ? JSON.stringify(new_values) : null,
                ip_address,
                user_agent
            ]);

            return true;
        } catch (err) {
            // We console.error but don't throw to avoid crashing the main process
            // if logging fails for some reason
            console.error('[AuditService] Failed to record log:', err.message);
            return false;
        }
    }
};

module.exports = auditService;
