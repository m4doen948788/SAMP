const pool = require('../../../config/db');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Nayaxa Knowledge Tool (The Mind)
 * Handles document parsing and RAG (Retrieval-Augmented Generation)
 */
const knowledgeTool = {
    /**
     * Search relevant knowledge from the database (RAG)
     */
    searchKnowledge: async (query) => {
        try {
            // Simple keyword-based search for now
            // In a full RAG system, this would use vector embeddings
            const [rows] = await pool.query(`
                SELECT content, source_name 
                FROM nayaxa_knowledge 
                WHERE MATCH(content) AGAINST(?) 
                OR content LIKE ?
                LIMIT 5
            `, [query, `%${query}%`]);

            if (rows.length === 0) return null;

            return rows.map(r => `[SUMBER: ${r.source_name}]\n${r.content}`).join('\n\n');
        } catch (err) {
            console.error('Knowledge Search Error:', err);
            return null;
        }
    },

    /**
     * Parse Excel/Spreadsheet content
     */
    parseExcel: (filePath) => {
        try {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);
            
            return `ISI FILE EXCEL (${sheetName}):\n` + JSON.stringify(data, null, 2);
        } catch (err) {
            console.error('Excel Parsing Error:', err);
            return "Gagal membaca isi file Excel.";
        }
    },

    /**
     * Parse Text/Markdown content
     */
    parseText: (filePath) => {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.error('Text Parsing Error:', err);
            return "Gagal membaca isi file teks.";
        }
    },

    /**
     * Sync documents from library (dokumen_upload) to knowledge base
     */
    syncLibraryToKnowledge: async () => {
        try {
            // Find unindexed documents (only support txt/excel for now as per library constraints)
            const [docs] = await pool.query(`
                SELECT id, nama_file, path 
                FROM dokumen_upload 
                WHERE is_indexed = 0 AND is_deleted = 0
                AND (path LIKE '%.txt' OR path LIKE '%.xlsx')
            `);

            for (const doc of docs) {
                const absolutePath = path.join(__dirname, '../../', doc.path);
                if (!fs.existsSync(absolutePath)) continue;

                let content = "";
                if (doc.path.endsWith('.xlsx')) {
                    content = knowledgeTool.parseExcel(absolutePath);
                } else if (doc.path.endsWith('.txt')) {
                    content = knowledgeTool.parseText(absolutePath);
                }

                if (content) {
                    await pool.query(`
                        INSERT INTO nayaxa_knowledge (content, source_name)
                        VALUES (?, ?)
                    `, [content, doc.nama_file]);

                    await pool.query(`
                        UPDATE dokumen_upload SET is_indexed = 1 WHERE id = ?
                    `, [doc.id]);
                }
            }
            return { success: true, count: docs.length };
        } catch (err) {
            console.error('Sync Knowledge Error:', err);
            return { success: false, message: err.message };
        }
    }
};

module.exports = knowledgeTool;
