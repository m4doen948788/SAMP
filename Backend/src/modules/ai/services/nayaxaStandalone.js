const pool = require('../../../config/db');
const knowledgeTool = require('./knowledgeTool');

/**
 * Nayaxa Standalone Service
 * Provides smart tools for AI, including Text-to-SQL and Database Schema Extraction
 */
const nayaxaStandalone = {
    /**
     * Extracts database schema for AI injection
     * Returns a list of tables and their columns to build AI context
     */
    getDatabaseSchema: async () => {
        try {
            const [tables] = await pool.query(`
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE()
                AND table_name NOT IN ('sessions', 'chat_history', 'users', 'nayaxa_chat_history')
                ORDER BY table_name, ordinal_position
            `);

            // Group by table
            const schema = tables.reduce((acc, curr) => {
                if (!acc[curr.TABLE_NAME]) acc[curr.TABLE_NAME] = [];
                acc[curr.TABLE_NAME].push(`${curr.COLUMN_NAME} (${curr.DATA_TYPE})`);
                return acc;
            }, {});

            let schemaString = "DAFTAR TABEL & KOLOM DATABASE:\n";
            for (const table in schema) {
                schemaString += `- ${table}: ${schema[table].join(', ')}\n`;
            }
            return schemaString;
        } catch (err) {
            console.error('Error extracting schema:', err);
            return "Gagal mengekstrak skema database.";
        }
    },

    /**
     * Executes SQL query with security firewall
     * ONLY allows SELECT queries
     */
    executeSQL: async (query) => {
        // Security Firewall: Regex check for SELECT only
        const forbiddenPatterns = [/DROP/i, /DELETE/i, /UPDATE/i, /INSERT/i, /ALTER/i, /TRUNCATE/i, /CREATE/i];
        const isForbidden = forbiddenPatterns.some(pattern => pattern.test(query));
        
        if (isForbidden || !query.trim().toUpperCase().startsWith('SELECT')) {
            return { success: false, message: "Security Exception: Hanya perintah SELECT yang diperbolehkan oleh Nayaxa." };
        }

        try {
            const [rows] = await pool.query(query);
            return { success: true, data: rows };
        } catch (err) {
            return { success: false, message: `SQL Error: ${err.message}` };
        }
    },

    /**
     * Fallback to internet search (Resilience System)
     * This is a placeholder for Serper/Bing/Wikipedia search logic
     */
    searchInternet: async (query) => {
        // Implementation for multiple API rotation (Serper, Wikipedia, etc.)
        // For now, return a placeholder or integrate search logic if keys provided
        return { message: "Fitur pencarian internet sedang dioptimalkan." };
    },

    /**
     * Search Knowledge Base (RAG)
     */
    searchKnowledge: async (query) => {
        const text = await knowledgeTool.searchKnowledge(query);
        return { success: !!text, content: text || "Tidak ditemukan informasi relevan di pangkalan data pengetahuan." };
    },

    /**
     * Index Library Documents (Bulk)
     */
    indexLibrary: async () => {
        const result = await knowledgeTool.syncLibraryToKnowledge();
        if (result.success) {
            return { success: true, message: `Berhasil mensinkronkan ${result.count} dokumen baru ke pangkalan data pengetahuan.` };
        } else {
            return { success: false, message: `Gagal sinkronisasi: ${result.message}` };
        }
    }
};

module.exports = nayaxaStandalone;
