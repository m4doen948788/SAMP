const http = require('http');

const url = 'http://localhost:5000/api/skp/records?year=2026&bidang_id=2';
http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.success && json.data) {
        const pendukung = json.data.pendukung || [];
        const rianiDocs = pendukung.filter(p => Number(p.pegawaiId) === 42);
        console.log('--- API RESPONSE FOR RIANI (PORT 5000) ---');
        console.log(rianiDocs);
      } else {
        console.log('API returned error:', json);
      }
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('HTTP Error:', err.message);
});
