const axios = require('axios');

async function testChat() {
    try {
        const response = await axios.post('http://localhost:5001/api/nayaxa/chat', {
            message: 'tes'
        });
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error('Error status:', e.response?.status);
        console.error('Error body:', e.response?.data);
        console.error('Error message:', e.message);
    }
}

testChat();
