const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/db');
const nayaxaStandalone = require('./nayaxaStandalone');
const exportService = require('./exportService');
const pptxService = require('./pptxService');

/**
 * Nayaxa Gemini Service (Brain v4.5.5 - Parallel Turbo)
 * Fixed: Supports PowerPoint in Editor Mode.
 */

const nayaxaTools = [{
    functionDeclarations: [
        {
            name: "execute_sql_query",
            description: "Menjalankan kueri SQL SELECT ke database dashboard untuk mengambil data statistik riil atau mencari metadata dokumen.",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: { type: "string", description: "Kueri SQL SELECT." }
                },
                required: ["query"]
            }
        },
        {
            name: "generate_document",
            description: "Membuat dokumen teks (PDF atau Word). DILARANG KERAS menggunakan tool ini untuk membuat presentasi/paparan/slides.",
            parameters: {
                type: "OBJECT",
                properties: {
                    format: { type: "string", description: "pdf atau word" },
                    content: { type: "string", description: "Konten file" },
                    filename: { type: "string", description: "Nama file" }
                },
                required: ["format", "content", "filename"]
            }
        },
        {
            name: "pembangkit_paparan_pptx",
            description: "Tool SATU-SATUNYA untuk membuat file presentasi (.pptx) dengan desain modern Bapperida 2026.",
            parameters: {
                type: "OBJECT",
                properties: {
                    judul: { type: "string", description: "Judul besar presentasi" },
                    konteks: { type: "string", description: "Keterangan singkat" },
                    slides: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "string" },
                                points: { type: "ARRAY", items: { type: "string" } },
                                layout_type: { type: "string", enum: ["BULLETS", "TWO_COLUMN"] }
                            },
                            required: ["title", "points"]
                        }
                    }
                },
                required: ["judul", "slides"]
            }
        }
    ]
}];

class NayaxaGeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.modelName = "gemini-1.5-flash";
    }

    getSystemPrompt(userName, instansiName, baseUrl) {
        return `
            ANDA ADALAH NAYAXA v4.5.5 (Parallel Turbo).
            IDENTITAS: Asisten AI Bapperida Kabupaten Bogor.
            GAYA: Ramah, profesional, tanpa emoji. Gunakan Markdown premium.
            
            PROTOKOL EDITOR WORKSTATION:
            - Jika pesan diawali [NAYAXA_EDITOR_FEEDBACK], Anda sedang memperbaiki dokumen di Workstation.
            - ANALISIS format dokumen yang sedang diedit. 
            - Jika sedang mengedit PowerPoint, Anda WAJIB memanggil 'pembangkit_paparan_pptx'.
            - Jika sedang mengedit Word/PDF, Anda WAJIB memanggil 'generate_document'.
            - JANGAN PERNAH membuat file Word jika user sedang meminta perbaikan pada file presentasi/PowerPoint.
            
            PROTOKOL PPTX:
            - Gunakan 'pembangkit_paparan_pptx' untuk: paparan, slide, presentasi.
            - Desain: Fokus pada whitespace, poin-poin padat, dan storytelling.
            
            URL BASE: ${baseUrl || ''}
        `;
    }

    async chat(message, history = [], userData = {}) {
        try {
            const schema = await nayaxaStandalone.getDatabaseSchema();
            const model = this.genAI.getGenerativeModel({ 
                model: this.modelName,
                systemInstruction: this.getSystemPrompt(userData.user_name, userData.instansi_nama, userData.base_url) + "\n\n" + schema,
                tools: nayaxaTools 
            });

            const chat = model.startChat({
                history: history.map(h => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                }))
            });

            let result = await chat.sendMessage(message);
            let response = await result.response;
            
            let iterations = 0;
            while (response.functionCalls()?.length > 0 && iterations < 5) {
                iterations++;
                const functionResponses = await Promise.all(response.functionCalls().map(async (call) => {
                    let toolResult;
                    try {
                        if (call.name === 'execute_sql_query') {
                            toolResult = await nayaxaStandalone.executeSQL(call.args.query);
                        } else if (call.name === 'generate_document') {
                            const url = await exportService.generateWord(call.args.content, call.args.filename);
                            toolResult = { success: true, url: `${userData.base_url}${url}`, message: "File Word berhasil dibuat." };
                        } else if (call.name === 'pembangkit_paparan_pptx') {
                            const res = await pptxService.generatePresentation(call.args);
                            toolResult = { success: true, url: `${userData.base_url}${res.url}`, message: "Paparan PPTX berhasil dibuat." };
                        }
                    } catch (err) { toolResult = { success: false, error: err.message }; }

                    return { functionResponse: { name: call.name, response: { content: JSON.stringify(toolResult) } } };
                }));

                result = await chat.sendMessage(functionResponses);
                response = await result.response;
            }

            return { success: true, text: response.text(), brain_used: this.modelName };
        } catch (err) {
            console.error('Chat Error:', err);
            return { success: false, message: "Nayaxa Encountered an error." };
        }
    }
}

module.exports = new NayaxaGeminiService();

