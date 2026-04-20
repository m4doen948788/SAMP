/**
 * Simulasi Pengujian Komunikasi Lintas Komponen (Dashboard -> Widget)
 * Sesuai Protokol Ketelitian Antigravity
 */

// 1. Mock listener yang akan dipasang di Widget
const mockWidget = {
    isCollapsed: false,
    width: 400,
    height: 580,
    
    init() {
        console.log('Widget initialized with default size:', this.width, 'x', this.height);
        
        // Listener untuk collapse
        window.addEventListener('nayaxa-collapse', () => {
            this.isCollapsed = true;
            console.log('[Widget] Received collapse signal. isCollapsed:', this.isCollapsed);
        });
        
        // Listener untuk reset
        window.addEventListener('nayaxa-reset', () => {
            this.width = 400;
            this.height = 580;
            console.log('[Widget] Received reset signal. Dimensions reset to default.');
        });
    }
};

// 2. Jalankan simulasi
mockWidget.init();

console.log('--- Memulai Simulasi ---');

// Simulasi Klik Sidebar di Frontend
console.log('Simulasi: User mengklik menu Sidebar...');
window.dispatchEvent(new CustomEvent('nayaxa-collapse'));

// Simulasi Klik Logout di Frontend
console.log('Simulasi: User mengklik Logout...');
window.dispatchEvent(new CustomEvent('nayaxa-reset'));

console.log('--- Simulasi Selesai ---');
