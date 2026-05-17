const axios = require('axios');

const API_KEY = 'df3b696b-7214-4dce-bfd1-3181b5fedc93';
const BASE_URL = 'https://api.sambanova.ai/v1';

async function testSambaNova() {
    console.log('=== MENGUJI API SAMBANOVA CLOUD ===\n');
    try {
        // 1. Cek Model List (jika didukung) atau langsung Chat Completion
        console.log('Menguji koneksi Chat Completion ke model Meta-Llama-3.3-70B-Instruct...');
        const response = await axios.post(`${BASE_URL}/chat/completions`, {
            model: 'Meta-Llama-3.3-70B-Instruct',
            messages: [
                { role: 'system', content: 'Anda adalah AI Nayaxa.' },
                { role: 'user', content: 'Halo, siapa Anda dan sebutkan 1 fakta menarik tentang teknologi AI saat ini.' }
            ],
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ STATUS: KONEKSI BERHASIL!');
        console.log(`Model Used : ${response.data.model}`);
        console.log(`Total Tokens : ${response.data.usage?.total_tokens} (Prompt: ${response.data.usage?.prompt_tokens}, Output: ${response.data.usage?.completion_tokens})`);
        console.log(`\nJawaban AI:\n${response.data.choices[0].message.content}\n`);

    } catch (error) {
        console.error('\n❌ GAGAL MENGHUBUNGI SAMBANOVA:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testSambaNova();
