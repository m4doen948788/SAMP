const nayaxaGemini = require('../services/nayaxaGeminiService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a secure 32-byte key from any environment seed using SHA-256
const SECRET_SEED = process.env.SECRET_CHAT_KEY || 'nayaxa_secret_key_safe_room_default_seed_8888_9999';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest();
const IV_LENGTH = 16; // AES IV block size is always 16 bytes

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    try {
        if (!text || !text.includes(':')) {
            return text; // Graceful fallback for legacy plaintext messages
        }
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        if (iv.length !== IV_LENGTH) {
            return text; // Safe fallback
        }
        const encryptedText = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('[Decryption Error] Failed to decrypt message, falling back to plaintext:', e.message);
        return text; // Fail-safe fallback to raw string
    }
}


/**
 * Nayaxa Controller (v4.5.5 Lite)
 * Minimal implementation for copy-dashboard to support PPTX and Workstation.
 */
const nayaxaController = {
    /**
     * Core Chat Endpoint
     */
    chat: async (req, res) => {
        const { 
            message,
            user_id, user_name, instansi_nama,
            session_id, base_url: provided_base_url
        } = req.body;

        try {
            // Enterprise-grade baseUrl resolution
            const protocol = req.get('x-forwarded-proto') || req.protocol;
            const host = req.get('x-forwarded-host') || req.get('host');
            const baseUrl = provided_base_url || process.env.NAYAXA_PUBLIC_URL || `${protocol}://${host}`;

            // In Lite version, we don't strictly require session history for the first few turns to work
            const history = []; // Simplified for now

            const response = await nayaxaGemini.chat(message, history, {
                user_name: user_name || 'User',
                instansi_nama: instansi_nama || 'Bapperida',
                base_url: baseUrl
            });

            res.json({
                success: true,
                text: response.text,
                session_id: session_id || `sess_${Date.now()}`
            });
        } catch (error) {
            console.error('Nayaxa Chat Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Download Endpoint for Exports
     */
    downloadExport: (req, res) => {
        try {
            const { filename } = req.params;
            const exportDir = path.join(__dirname, '../../../../uploads/exports');
            const filePath = path.join(exportDir, filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('File not found.');
            }

            res.download(filePath, filename);
        } catch (error) {
            console.error('Download Export Error:', error);
            res.status(500).send('Internal Server Error.');
        }
    },

    /**
     * Secret Chat Table creation and Migration Schema
     */
    ensureSecretTable: async () => {
        const pool = require('../../../config/db');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS nayaxa_secret_chat (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createTableQuery);

        // Dynamically append columns and modify column types if missing
        try {
            const [columns] = await pool.query(`SHOW COLUMNS FROM nayaxa_secret_chat`);
            const hasIsRead = columns.some(col => col.Field === 'is_read');
            const hasReplyToId = columns.some(col => col.Field === 'reply_to_id');
            const hasFileData = columns.some(col => col.Field === 'file_data');
            const messageCol = columns.find(col => col.Field === 'message');

            // Upgrade message column to LONGTEXT to support Base64 file payloads
            if (messageCol && messageCol.Type.toLowerCase() !== 'longtext') {
                await pool.query(`ALTER TABLE nayaxa_secret_chat MODIFY COLUMN message LONGTEXT NOT NULL`);
                console.log('[Schema Migrations] Upgraded message column to LONGTEXT');
            }

            if (!hasIsRead) {
                await pool.query(`ALTER TABLE nayaxa_secret_chat ADD COLUMN is_read TINYINT(1) DEFAULT 0`);
                console.log('[Schema Migrations] Added is_read column to nayaxa_secret_chat');
            }
            if (!hasReplyToId) {
                await pool.query(`ALTER TABLE nayaxa_secret_chat ADD COLUMN reply_to_id INT DEFAULT NULL`);
                console.log('[Schema Migrations] Added reply_to_id column to nayaxa_secret_chat');
            }
            if (!hasFileData) {
                await pool.query(`ALTER TABLE nayaxa_secret_chat ADD COLUMN file_data LONGTEXT DEFAULT NULL`);
                console.log('[Schema Migrations] Added file_data column to nayaxa_secret_chat');
            }

            // Dynamically add index on created_at if missing to optimize pruning DELETE queries & ORDER BY sorts
            const [indexes] = await pool.query(`SHOW INDEX FROM nayaxa_secret_chat WHERE Key_name = 'idx_created_at'`);
            if (indexes.length === 0) {
                await pool.query(`ALTER TABLE nayaxa_secret_chat ADD INDEX idx_created_at (created_at)`);
                console.log('[Schema Migrations] Added index idx_created_at to nayaxa_secret_chat');
            }
        } catch (err) {
            console.error('[Schema Migrations Error] Failed to update table schema:', err.message);
        }
    },

    /**
     * Get Secret Chat history (auto-pruned to last 3 hours)
     * Highly optimized: DO NOT retrieve file_data column to avoid heavy DB/network transfer and AES decryption loops
     */
    getSecretHistory: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        try {
            const pool = require('../../../config/db');

            // Mark opponent's messages as read before fetching
            await pool.query(
                `UPDATE nayaxa_secret_chat SET is_read = 1 WHERE sender != ? AND is_read = 0`,
                [username]
            );

            // Retrieve non-expired messages with metadata (NEVER select file_data here!)
            const [rows] = await pool.query(
                `SELECT id, sender, message, is_read, reply_to_id, created_at FROM nayaxa_secret_chat ORDER BY created_at ASC`
            );

            // Decrypt the secret messages on-the-fly and strip huge base64 binary attachment strings if present in legacy rows
            const decryptedMessages = rows.map(row => {
                const decrypted = decrypt(row.message);
                let finalizedMessage = decrypted;

                try {
                    // Check if message is a JSON file payload
                    if (decrypted && decrypted.trim().startsWith('{')) {
                        const parsed = JSON.parse(decrypted);
                        if (parsed && parsed.file) {
                            // Strip heavy data string if legacy row has it, keep lightweight metadata
                            finalizedMessage = JSON.stringify({
                                text: parsed.text || '',
                                file: {
                                    name: parsed.file.name,
                                    type: parsed.file.type,
                                    size: parsed.file.size,
                                    hasData: true // Flag indicating attachment exists
                                }
                            });
                        }
                    }
                } catch (jsonErr) {
                    // Regular text message, skip parsing
                }

                return {
                    ...row,
                    message: finalizedMessage
                };
            });

            // Map and enrich reply reference in memory to avoid complex SQL decryption joins
            const messageMap = new Map(decryptedMessages.map(m => [m.id, m]));
            const enrichedMessages = decryptedMessages.map(m => {
                if (m.reply_to_id && messageMap.has(m.reply_to_id)) {
                    const parent = messageMap.get(m.reply_to_id);
                    return {
                        ...m,
                        reply_to: {
                            sender: parent.sender,
                            message: parent.message
                        }
                    };
                }
                return m;
            });

            res.json({
                success: true,
                messages: enrichedMessages
            });
        } catch (error) {
            console.error('Secret Chat History Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Get single file data on-demand (avoids overloading history polling)
     * Supports high-speed segregated file_data column and legacy inline message JSON parsing fallback
     */
    getSecretFile: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id } = req.params;

        try {
            const pool = require('../../../config/db');
            
            // Retrieve both message and file_data columns to handle legacy fallbacks gracefully
            const [rows] = await pool.query(
                `SELECT message, file_data FROM nayaxa_secret_chat WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            // 1. New Segregated Format: Decrypt and return file_data column
            if (rows[0].file_data) {
                const decryptedData = decrypt(rows[0].file_data);
                return res.json({
                    success: true,
                    fileData: decryptedData
                });
            }

            // 2. Legacy Inline Format: Parse and retrieve data from decrypted message JSON
            const decryptedMessage = decrypt(rows[0].message);
            try {
                const parsed = JSON.parse(decryptedMessage);
                if (parsed && parsed.file && parsed.file.data) {
                    return res.json({
                        success: true,
                        fileData: parsed.file.data
                    });
                }
            } catch (e) {
                // Not JSON or missing file structure
            }

            res.status(400).json({ success: false, message: 'No file attachment on this message' });
        } catch (error) {
            console.error('Secret Chat File Fetch Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Send Secret Chat Message
     * Highly optimized: extracts heavy file Base64 attachments and stores them in separate file_data column
     */
    sendSecretMessage: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { message, reply_to_id } = req.body;
        if (!message || (typeof message === 'string' && message.trim() === '')) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Guard against oversized payloads (file Base64) that can crash MySQL INSERT
        const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024;
        const payloadBytes = Buffer.byteLength(message, 'utf8');
        if (payloadBytes > MAX_PAYLOAD_BYTES) {
            console.warn(`[Secret Chat] Rejected oversized payload from '${username}': ${(payloadBytes / 1024 / 1024).toFixed(2)}MB`);
            return res.status(413).json({ success: false, message: 'File terlalu besar. Maksimum ukuran lampiran adalah 10MB.' });
        }

        try {
            const pool = require('../../../config/db');

            // Prune expired messages during new data insertion
            await pool.query(`DELETE FROM nayaxa_secret_chat WHERE created_at < NOW() - INTERVAL 3 HOUR`);

            let messageToStore = message.trim();
            let fileDataToStore = null;

            // Analyze if message contains a file attachment JSON
            try {
                if (messageToStore.startsWith('{')) {
                    const parsed = JSON.parse(messageToStore);
                    if (parsed && parsed.file && parsed.file.data) {
                        // Extract and encrypt the large Base64 binary string separately
                        fileDataToStore = encrypt(parsed.file.data);

                        // Strip data string from standard message column to keep queries and standard decryption lightweight
                        messageToStore = JSON.stringify({
                            text: parsed.text || '',
                            file: {
                                name: parsed.file.name,
                                type: parsed.file.type,
                                size: parsed.file.size
                            }
                        });
                    }
                }
            } catch (e) {
                // Regular text message
            }

            // Insert new encrypted message with separated file data column
            const [result] = await pool.query(
                `INSERT INTO nayaxa_secret_chat (sender, message, file_data, reply_to_id) VALUES (?, ?, ?, ?)`,
                [username, encrypt(messageToStore), fileDataToStore, reply_to_id || null]
            );

            res.json({
                success: true,
                insertId: result.insertId
            });
        } catch (error) {
            console.error('[Secret Chat Send Error]', error.code || '', error.message);
            // Detect MySQL packet size errors specifically
            if (error.code === 'ER_NET_PACKET_TOO_LARGE' || error.message?.includes('max_allowed_packet')) {
                return res.status(413).json({ success: false, message: 'File terlalu besar untuk disimpan. Coba kompres file atau kirim teks saja.' });
            }
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Edit Secret Chat Message (Only if unread and sent by the same user)
     */
    editSecretMessage: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id } = req.params;
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        try {
            const pool = require('../../../config/db');
            await pool.query(`DELETE FROM nayaxa_secret_chat WHERE created_at < NOW() - INTERVAL 3 HOUR`);

            // Verify if the message is unread, sent by current user and exists
            const [rows] = await pool.query(
                `SELECT id, sender, is_read FROM nayaxa_secret_chat WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            const msg = rows[0];
            if (msg.sender !== username) {
                return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
            }

            if (msg.is_read) {
                return res.status(400).json({ success: false, message: 'Cannot edit read messages' });
            }

            // Update the message
            await pool.query(
                `UPDATE nayaxa_secret_chat SET message = ? WHERE id = ?`,
                [encrypt(message.trim()), id]
            );

            res.json({
                success: true,
                message: 'Message updated successfully'
            });
        } catch (error) {
            console.error('Secret Chat Edit Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Clear Secret Chat (Delete all secret messages)
     */
    clearSecretChat: async (req, res) => {
        const username = req.user.username;
        if (username !== 'sammyl' && username !== 'levina') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        try {
            const pool = require('../../../config/db');

            // Clear all messages
            await pool.query(`DELETE FROM nayaxa_secret_chat`);

            res.json({
                success: true,
                message: 'Secret chat cleared successfully'
            });
        } catch (error) {
            console.error('Secret Chat Clear Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};

// Execute schema migrations exactly once asynchronously upon module initialization
nayaxaController.ensureSecretTable().catch(err => {
    console.error('[Startup Schema Migration Error] Failed to ensure secret chat database schema:', err.message);
});

module.exports = nayaxaController;

