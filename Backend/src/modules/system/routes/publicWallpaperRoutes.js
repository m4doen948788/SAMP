const express = require('express');
const router = express.Router();
const { getTodayWallpaper, getActiveWallpapers } = require('../services/wallpaperService');

/**
 * @route GET /api/public/wallpapers/today
 * @desc Mengambil wallpaper aktif hari ini (Terkurasi khusus Kabupaten Bogor)
 */
router.get('/today', async (req, res) => {
  try {
    const wallpaper = await getTodayWallpaper();
    res.json({
      success: true,
      data: wallpaper,
    });
  } catch (error) {
    console.error('[PublicWallpaperRoutes] Error getting today wallpaper:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil wallpaper hari ini',
    });
  }
});

/**
 * @route GET /api/public/wallpapers
 * @desc Mengambil seluruh batch 30 foto aktif bulan ini
 */
router.get('/', async (req, res) => {
  try {
    const wallpapers = await getActiveWallpapers();
    res.json({
      success: true,
      data: wallpapers,
    });
  } catch (error) {
    console.error('[PublicWallpaperRoutes] Error getting wallpapers:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar wallpaper',
    });
  }
});

module.exports = router;
