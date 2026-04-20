require('dotenv').config();
const nayaxaGeminiService = require('../src/services/nayaxaGeminiService');

async function testKnowledgeSearch() {
    console.log("Testing Nayaxa Knowledge Integration...");
    
    // User query that should trigger search_knowledge_base
    const userMessage = "Apa aturan tentang tata naskah di perpustakaan?";
    const userData = {
        user_name: "Super Administrator",
        instansi_nama: "Pemerintah Kabupaten Bogor"
    };

    try {
        console.log(`Sending query: "${userMessage}"`);
        const result = await nayaxaGeminiService.chat(userMessage, [], userData);
        
        console.log("\n--- AI RESPONSE ---");
        if (result.success) {
            console.log(result.text);
            console.log("\nBrain Used:", result.brain_used);
        } else {
            console.error("Chat Failed:", result.message);
        }
    } catch (error) {
        console.error("Test Error:", error);
    }
}

testKnowledgeSearch();
