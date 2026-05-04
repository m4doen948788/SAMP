const crypto = require('crypto');

/**
 * Generates a unique random slug for document verification.
 * @returns {string}
 */
const generateSlug = () => {
    return crypto.randomBytes(8).toString('hex') + '-' + Date.now().toString(36);
};

/**
 * Normalizes content string to ensure consistent hashing across different environments/DB states.
 * Removes trailing spaces from lines and standardizes line endings.
 * @param {string} content 
 * @returns {string}
 */
const normalizeContent = (content) => {
    if (!content) return '';
    return content
        .replace(/\r\n/g, '\n') // Standardize line endings
        .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces from lines
        .trim(); // Trim overall content
};

/**
 * Generates a SHA-256 hash of the given content.
 * @param {string} content 
 * @returns {string}
 */
const generateHash = (content) => {
    const normalized = normalizeContent(content);
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

module.exports = {
    generateSlug,
    generateHash,
    normalizeContent
};
