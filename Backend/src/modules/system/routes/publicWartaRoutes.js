const express = require('express');
const router = express.Router();
const { getDynamicNewsFeed } = require('../services/wartaService');

/**
 * @route GET /api/public/warta
 * @desc Mengambil warta berita dinamis (Daerah, Provinsi, Nasional) untuk halaman login & PWA
 * @access Public (tanpa token)
 */
router.get('/', async (req, res) => {
  try {
    const district = req.query.district || 'Kabupaten Bogor';
    const province = req.query.province || 'Jawa Barat';

    const news = await getDynamicNewsFeed(district, province);

    res.status(200).json({
      success: true,
      count: news.length,
      data: news,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memuat feed warta terkini',
      error: error.message,
    });
  }
});

module.exports = router;
