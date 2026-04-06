try {
    require('./src/controllers/kegiatanManajemenController.js');
    console.log('No syntax errors found.');
} catch (err) {
    console.error('Syntax/Load Error found:');
    console.error(err);
}
