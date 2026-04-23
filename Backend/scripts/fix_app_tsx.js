const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Frontend/src/App.tsx');
const backupPath = path.join(__dirname, 'Frontend/src/App.tsx.bak');
let content = fs.readFileSync(backupPath, 'utf8');

// Add import
const importOld = "import ManajemenDokumen from './components/ManajemenDokumen';";
const importNew = "import ManajemenDokumen from './components/ManajemenDokumen';\nimport ManajemenKegiatan from './components/ManajemenKegiatan';";

if (content.includes(importOld) && !content.includes('import ManajemenKegiatan')) {
    content = content.replace(importOld, importNew);
}

// Add case
const caseOld = "case 'manajemen-dokumen':\n        return <ManajemenDokumen />;";
const caseNew = "case 'manajemen-dokumen':\n        return <ManajemenDokumen />;\n      case 'isi-kegiatan':\n        return <ManajemenKegiatan />;";

if (content.includes(caseOld) && !content.includes("case 'isi-kegiatan'")) {
    content = content.replace(caseOld, caseNew);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx updated successfully');
