/**
 * Privacy & Security Utility for Nayaxa AI
 * Handles data masking (redaction) of sensitive information.
 */

const privacyUtil = {
    /**
     * Redact sensitive information from a string or object
     * @param {string|object} data 
     * @returns {string|object}
     */
    maskSensitiveData: (data) => {
        if (typeof data !== 'string') {
            const jsonString = JSON.stringify(data);
            const masked = privacyUtil.redactString(jsonString);
            return JSON.parse(masked);
        }
        return privacyUtil.redactString(data);
    },

    /**
     * Regex-based redaction for common PII
     */
    redactString: (text) => {
        if (!text) return text;

        let redacted = text;

        // 1. Redact Emails
        redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_TERPROTEKSI]');

        // 2. Redact Phone Numbers (Basic pattern for Indonesian/International)
        // Matches +62, 08, etc with 9-13 digits
        redacted = redacted.replace(/(\+62|08)[0-9]{8,11}/g, '[NOMOR_HP_TERPROTEKSI]');

        // 3. Redact potential NIK / KTP (16 digits)
        redacted = redacted.replace(/\b[0-9]{16}\b/g, '[ID_SENSITIF_TERPROTEKSI]');

        // 4. Redact potential Credit Card Numbers (13-16 digits)
        redacted = redacted.replace(/\b[0-9]{13,16}\b/g, '[DATA_FINANSIAL_TERPROTEKSI]');

        return redacted;
    }
};

module.exports = privacyUtil;
