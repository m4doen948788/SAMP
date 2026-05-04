const { composeLeaveLetterHtml } = require('./Frontend/src/features/correspondence/utils/letterComposers');
// Mocking getEmployeeLevel as it is imported but we are running in Node
// Need to handle the import and TS issues.

// Actually, it's easier to just read the file and check the string.
const fs = require('fs');
const content = fs.readFileSync('./Frontend/src/features/correspondence/utils/letterComposers.ts', 'utf8');
console.log('Has pengusul div:', content.includes('data-signature-role="pengusul"'));
console.log('Has ketua_tim div:', content.includes('data-signature-role="ketua_tim"'));
