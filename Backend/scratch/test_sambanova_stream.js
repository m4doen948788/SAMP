const axios = require('axios');

const API_KEY = 'df3b696b-7214-4dce-bfd1-3181b5fedc93';

async function testStream() {
    console.log('=== MENGUJI STREAMING SAMBANOVA CLOUD ===\n');
    try {
        const response = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
            model: 'Meta-Llama-3.3-70B-Instruct',
            messages: [
                { role: 'user', content: 'Ceritakan dongeng singkat tentang robot cerdas di masa depan (minimal 3 paragraf).' }
            ],
            temperature: 0.3,
            max_tokens: 1024,
            stream: true
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        let fullText = "";
        let buffer = "";

        response.data.on('data', chunk => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep last partial line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const parsed = JSON.parse(trimmed.substring(6));
                        const content = parsed.choices[0]?.delta?.content || "";
                        fullText += content;
                        process.stdout.write(content);
                    } catch (e) {
                        console.error('\nParse Error on line:', trimmed);
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n\n✅ STREAMING SELESAI!');
            console.log(`Total Panjang Teks : ${fullText.length} karakter.`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

testStream();
