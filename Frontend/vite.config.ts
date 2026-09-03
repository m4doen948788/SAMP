import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': {},
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'stream': path.resolve(__dirname, 'src/shims/stream.js'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // 5001: Auth & Core Master Data
        '/api/auth': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/users': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/profil-pegawai': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/rbac': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/pangkat-golongan': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/jenis-pegawai': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/status-administrasi-pegawai': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/tahun': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/instansi-daerah': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/internal-instansi': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/bidang-instansi': { target: 'http://localhost:5001', changeOrigin: true },
        '/api/wilayah': { target: 'http://localhost:5001', changeOrigin: true },

        // 5002: Smart Office (Surat & Dokumen)
        '/api/surat': { target: 'http://localhost:5002', changeOrigin: true },
        '/api/surat-numbering': { target: 'http://localhost:5002', changeOrigin: true },
        '/api/surat-templates': { target: 'http://localhost:5002', changeOrigin: true },
        '/api/surat-approvals': { target: 'http://localhost:5002', changeOrigin: true },
        '/api/jenis-dokumen': { target: 'http://localhost:5002', changeOrigin: true },
        '/api/dokumen': { target: 'http://localhost:5002', changeOrigin: true },
        '/uploads': { target: 'http://localhost:5002', changeOrigin: true },

        // 5003: Performance (Kegiatan & Logbook)
        '/api/kegiatan-pegawai': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/kegiatan-manajemen': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/jenis-kegiatan': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/tipe-kegiatan': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/holidays': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/notulen': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/notulen-templates': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/skp': { target: 'http://localhost:5003', changeOrigin: true },
        '/api/public/skp': { target: 'http://localhost:5003', changeOrigin: true },

        // 5004: Planning
        '/api/rpjpd': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/planning': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/rpjmd-renstra': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/tematik': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/bidang-urusan': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/bidang': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/table-labels': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/sub-bidang-instansi': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/mapping-urusan-instansi': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/mapping-bidang-pengampu': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/mapping-kegiatan-instansi': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/mapping-pemegang-sektor': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/satuan': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/data-makro': { target: 'http://localhost:5004', changeOrigin: true },
        '/api/olah-data': { target: 'http://localhost:5004', changeOrigin: true },

        // 5005: System & AI (menu, notifications, generated-pages, nayaxa)
        '/api/aplikasi-external': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/menu': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/master-data-config': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/generated-pages': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/referensi': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/theme': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/import': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/pengaturan': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/audit': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/app-settings': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/notifications': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/nayaxa/internal-sync': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/nayaxa': { target: 'http://localhost:6001', changeOrigin: true },
        '/api/public/qr': { target: 'http://localhost:5005', changeOrigin: true },
        '/api/convert': { target: 'http://localhost:5005', changeOrigin: true }
      }
    },
  };
});
