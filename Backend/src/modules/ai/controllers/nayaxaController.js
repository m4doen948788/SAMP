const nayaxaGemini = require('../services/nayaxaGeminiService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a secure 32-byte key from any environment seed using SHA-256
const SECRET_SEED = process.env.SECRET_CHAT_KEY || 'nayaxa_secret_key_safe_room_default_seed_8888_9999';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest();
const IV_LENGTH = 16; // AES IV block size is always 16 bytes

// One-way pseudonym hash for sender column — username never stored plaintext
const SENDER_HMAC_SECRET = process.env.SENDER_HMAC_SECRET || (SECRET_SEED + '_sender_mask_v2');
function hashSender(username) {
    if (!username) return 'unknown';
    return crypto.createHmac('sha256', SENDER_HMAC_SECRET)
        .update(username.trim().toLowerCase())
        .digest('hex')
        .substring(0, 24); // 24-char hex is unguessable but compact
}

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

const isSyncAuthorized = (username) => {
    if (!username) return false;
    const hash = crypto.createHash('sha256').update(username.trim().toLowerCase()).digest('hex');
    const whitelistedHashes = [
        '796a4000663a0f30c20247425760c28d405d4a9bc1abd32760e0a960a3246e8e',
        'ca427d21d76c50cc7b326068051da0508dd7abed97e923d16124ccf57d31e084',
        'b11a2b82692fc40f4cfb193d3796a95adc8d49849bb81b786fe1f2ef41ff53a7',
        'eb7067f40ccba9661221969d857603ea1e34448f1f6366fa7c90ea87efd7006b',
        'd109eabde7ea2c5561cb812fd03296016cb141f4c94381141371ae19bc1a968e',
        '812d8ad9ee510300ab2e79e1ea2a26672abe76aa3a31cc09d45e76976850b5d4',
        'cf050e64d9dbc7265774f792690bf63b4cc2ad5bd8f874742117a780d8b50641'
    ];
    return whitelistedHashes.includes(hash);
};

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
            CREATE TABLE IF NOT EXISTS internal_sync_buffer (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(createTableQuery);

        // Dynamically append columns and modify column types if missing
        try {
            const [columns] = await pool.query(`SHOW COLUMNS FROM internal_sync_buffer`);
            const hasIsRead = columns.some(col => col.Field === 'is_read');
            const hasReplyToId = columns.some(col => col.Field === 'reply_to_id');
            const hasFileData = columns.some(col => col.Field === 'file_data');
            const messageCol = columns.find(col => col.Field === 'message');

            // Upgrade message column to LONGTEXT to support Base64 file payloads
            if (messageCol && messageCol.Type.toLowerCase() !== 'longtext') {
                await pool.query(`ALTER TABLE internal_sync_buffer MODIFY COLUMN message LONGTEXT NOT NULL`);
                console.log('[Schema Migrations] Upgraded message column to LONGTEXT');
            }

            if (!hasIsRead) {
                await pool.query(`ALTER TABLE internal_sync_buffer ADD COLUMN is_read TINYINT(1) DEFAULT 0`);
            }
            if (!hasReplyToId) {
                await pool.query(`ALTER TABLE internal_sync_buffer ADD COLUMN reply_to_id INT DEFAULT NULL`);
            }
            if (!hasFileData) {
                await pool.query(`ALTER TABLE internal_sync_buffer ADD COLUMN file_data LONGTEXT DEFAULT NULL`);
            }

            // Dynamically add index on created_at if missing
            const [indexes] = await pool.query(`SHOW INDEX FROM internal_sync_buffer WHERE Key_name = 'idx_created_at'`);
            if (indexes.length === 0) {
                await pool.query(`ALTER TABLE internal_sync_buffer ADD INDEX idx_created_at (created_at)`);
            }
        } catch (err) {
            console.error('[System Config Error] Failed to verify buffer schema:', err.message);
        }
    },

    /**
     * Get Internal Sync Buffer logs (auto-pruned)
     * Highly optimized: DO NOT retrieve blob column to avoid heavy transfer
     */
    getBufferLogs: async (req, res) => {
        const u = req.user.username ? req.user.username.trim().toLowerCase() : '';
        
        if (!isSyncAuthorized(u)) {
            console.warn(`[Security Trace] Unauthorized access attempt to sync-buffer by user: ${u}`);
            return res.status(403).json({ success: false, message: 'Access denied: System restricted area' });
        }

        try {
            const pool = require('../../../config/db');
            const myHash = hashSender(u);

            // Mark opponent's messages as read before fetching (compare by hash)
            await pool.query(
                `UPDATE internal_sync_buffer SET is_read = 1 WHERE sender != ? AND is_read = 0`,
                [myHash]
            );

            // Retrieve non-expired messages with metadata
            const [rows] = await pool.query(
                `SELECT id, sender, message, is_read, reply_to_id, UNIX_TIMESTAMP(created_at) * 1000 AS created_at FROM internal_sync_buffer ORDER BY created_at ASC`
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
                    // sender is already a pseudonym hash — just add is_mine flag for the client
                    is_mine: row.sender === myHash,
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
                            id: parent.id,
                            // Include is_mine for the parent so frontend can label it correctly
                            is_mine: parent.is_mine,
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
     * Get single blob data on-demand
     */
    getBufferBlob: async (req, res) => {
        const u = req.user.username ? req.user.username.trim().toLowerCase() : '';
        
        if (!isSyncAuthorized(u)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { id } = req.params;

        try {
            const pool = require('../../../config/db');
            
            const [rows] = await pool.query(
                `SELECT message, file_data FROM internal_sync_buffer WHERE id = ?`,
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
     * Push data to Sync Buffer
     */
    pushBufferData: async (req, res) => {
        const u = req.user.username ? req.user.username.trim().toLowerCase() : '';
        
        if (!isSyncAuthorized(u)) {
            return res.status(403).json({ success: false, message: 'Denied' });
        }

        const { message, reply_to_id } = req.body;
        if (!message || (typeof message === 'string' && message.trim() === '')) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // Guard against oversized payloads (file Base64) that can crash MySQL INSERT
        const MAX_PAYLOAD_BYTES = 15 * 1024 * 1024;
        const payloadBytes = Buffer.byteLength(message, 'utf8');
        if (payloadBytes > MAX_PAYLOAD_BYTES) {
            console.warn(`[Internal Sync] Rejected oversized payload from '${u}': ${(payloadBytes / 1024 / 1024).toFixed(2)}MB`);
            return res.status(413).json({ success: false, message: 'File terlalu besar. Maksimum ukuran lampiran adalah 10MB.' });
        }

        try {
            const pool = require('../../../config/db');

            // Prune expired logs during new data insertion
            await pool.query(`DELETE FROM internal_sync_buffer WHERE created_at < NOW() - INTERVAL 3 HOUR`);

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
            // sender is stored as HMAC pseudonym — never as plaintext username
            const [result] = await pool.query(
                `INSERT INTO internal_sync_buffer (sender, message, file_data, reply_to_id) VALUES (?, ?, ?, ?)`,
                [hashSender(u), encrypt(messageToStore), fileDataToStore, reply_to_id || null]
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
     * Patch Buffer Data
     */
    patchBufferData: async (req, res) => {
        const u = req.user.username ? req.user.username.trim().toLowerCase() : '';
        
        if (!isSyncAuthorized(u)) {
            return res.status(403).json({ success: false, message: 'Restricted' });
        }

        const { id } = req.params;
        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        try {
            const pool = require('../../../config/db');
            await pool.query(`DELETE FROM internal_sync_buffer WHERE created_at < NOW() - INTERVAL 3 HOUR`);

            // Verify if the message is unread, sent by current user and exists
            const [rows] = await pool.query(
                `SELECT id, sender, is_read FROM internal_sync_buffer WHERE id = ?`,
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Message not found' });
            }

            const msg = rows[0];
            // Compare by sender hash, not plaintext username
            if (msg.sender !== hashSender(u)) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            if (msg.is_read) {
                return res.status(400).json({ success: false, message: 'Committed' });
            }

            // Update the message
            await pool.query(
                `UPDATE internal_sync_buffer SET message = ? WHERE id = ?`,
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
     * Purge Sync Buffer
     */
    purgeBuffer: async (req, res) => {
        const u = req.user.username ? req.user.username.trim().toLowerCase() : '';
        
        if (!isSyncAuthorized(u)) {
            return res.status(403).json({ success: false, message: 'Restricted' });
        }

        try {
            const pool = require('../../../config/db');

            // Clear all logs
            await pool.query(`DELETE FROM internal_sync_buffer`);

            res.json({
                success: true,
                message: 'Secret chat cleared successfully'
            });
        } catch (error) {
            console.error('Secret Chat Clear Error:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    },

    /**
     * Obfuscated Endpoint for TURN Server Credentials (WebRTC)
     * Named 'theme-assets' to blend in with normal dashboard traffic.
     */
    getThemeAssets: async (req, res) => {
        const u = req.user?.username;
        if (!isSyncAuthorized(u)) {
            return res.status(403).json({ success: false, message: 'Restricted' });
        }
        
        try {
            // Secret configuration (can be moved to .env in production)
            const turnSecret = process.env.COTURN_SECRET || 'nayaxa_secure_coturn_secret_2026';
            const turnDomain = process.env.COTURN_DOMAIN || 'bapperida-ppm.my.id';
            
            // Dynamic time-limited authentication (valid for 12 hours)
            const unixTimeStamp = Math.floor(Date.now() / 1000) + (12 * 3600);
            const username = `${unixTimeStamp}:${u}`;
            
            // HMAC-SHA1 for TURN credential
            const credential = crypto.createHmac('sha1', turnSecret).update(username).digest('base64');
            
            res.json({
                success: true,
                payload: { // Obfuscated structure
                    assets: [
                        { type: 'primary', endpoint: 'stun:stun.l.google.com:19302' },
                        { type: 'secondary', endpoint: 'stun:stun1.l.google.com:19302' },
                        { 
                            type: 'relay', 
                            endpoint: `turn:${turnDomain}:3478`, // Standard TURN
                            auth: username,
                            key: credential
                        },
                        { 
                            type: 'relay_secure', 
                            endpoint: `turns:${turnDomain}:5349`, // Secure TLS TURN
                            auth: username,
                            key: credential
                        }
                    ]
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load theme assets' });
        }
    },

    getWaStatus: async (req, res) => {
        try {
            const whatsappService = require('../../../services/whatsappService');
            const status = await whatsappService.getStatus();
            res.json({ success: true, ...status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    logoutWa: async (req, res) => {
        try {
            const whatsappService = require('../../../services/whatsappService');
            const status = await whatsappService.logoutSession();
            res.json({ success: true, ...status });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    sendWaMessage: async (req, res) => {
        try {
            const { to, text } = req.body;
            const whatsappService = require('../../../services/whatsappService');
            const result = await whatsappService.sendMessage(to, text);
            res.json({ success: true, result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};

// Execute schema migrations exactly once asynchronously upon module initialization
nayaxaController.ensureSecretTable().catch(err => {
    console.error('[Startup Schema Migration Error] Failed to ensure secret chat database schema:', err.message);
});

module.exports = nayaxaController;

