/**
 * One-time Migration: Convert plaintext sender values to HMAC-SHA256 pseudonyms
 * Run once on VPS after deploying the new backend code.
 * Usage: node Backend/scripts/migrate_sender_hash.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const pool = require('../src/config/db');

const SECRET_SEED = process.env.SECRET_CHAT_KEY || 'nayaxa_secret_key_safe_room_default_seed_8888_9999';
const SENDER_HMAC_SECRET = process.env.SENDER_HMAC_SECRET || (SECRET_SEED + '_sender_mask_v2');

function hashSender(username) {
    if (!username) return 'unknown';
    return crypto.createHmac('sha256', SENDER_HMAC_SECRET)
        .update(username.trim().toLowerCase())
        .digest('hex')
        .substring(0, 24);
}

// Detect if a value is already a 24-char hex hash (already migrated)
function isAlreadyHash(value) {
    return /^[0-9a-f]{24}$/.test(value);
}

async function migrate() {
    console.log('[Migration] Starting sender column hash migration...');
    try {
        const [rows] = await pool.query('SELECT id, sender FROM internal_sync_buffer');
        console.log(`[Migration] Found ${rows.length} rows to process.`);

        let migrated = 0;
        let skipped = 0;

        for (const row of rows) {
            if (isAlreadyHash(row.sender)) {
                skipped++;
                continue;
            }
            const hashedSender = hashSender(row.sender);
            await pool.query('UPDATE internal_sync_buffer SET sender = ? WHERE id = ?', [hashedSender, row.id]);
            console.log(`  [Row ${row.id}] "${row.sender}" → "${hashedSender}"`);
            migrated++;
        }

        console.log(`\n[Migration] Done! Migrated: ${migrated}, Already hashed (skipped): ${skipped}`);
        console.log('[Migration] Safe Room sender column is now fully anonymized.');
    } catch (err) {
        console.error('[Migration] FAILED:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
