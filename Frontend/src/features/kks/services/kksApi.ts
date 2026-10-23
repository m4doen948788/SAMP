import { API_URL } from '../../../services/api';
import { KksPeriode, KksStats, KksTatanan, KksIndikator, KksLeaderboardOpd } from '../types';

const getAuthHeaders = (isFormData = false): HeadersInit => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const kksApi = {
  // 1. Summary
  getSummary: async (tahun = 2026): Promise<{ success: boolean; data: { periode: KksPeriode; stats: KksStats; tatananSummary: KksTatanan[] } }> => {
    const res = await fetch(`${API_URL}/kks/dashboard/summary?tahun=${tahun}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 2. Leaderboard OPD
  getLeaderboardOpd: async (tahun = 2026): Promise<{ success: boolean; data: KksLeaderboardOpd[] }> => {
    const res = await fetch(`${API_URL}/kks/dashboard/leaderboard-opd?tahun=${tahun}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 3. Tatanan List
  getTatananList: async (tahun = 2026): Promise<{ success: boolean; data: KksTatanan[] }> => {
    const res = await fetch(`${API_URL}/kks/tatanan?tahun=${tahun}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 4. Indikator List
  getIndikatorList: async (params: { tahun?: number; tatanan_id?: number; opd_id?: number; search?: string }): Promise<{ success: boolean; data: KksIndikator[] }> => {
    const query = new URLSearchParams();
    if (params.tahun) query.append('tahun', String(params.tahun));
    if (params.tatanan_id) query.append('tatanan_id', String(params.tatanan_id));
    if (params.opd_id) query.append('opd_id', String(params.opd_id));
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_URL}/kks/indikator?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 5. Simpan Self Assessment
  savePenilaian: async (data: {
    tahun: number;
    indikator_id: number;
    skor_mandiri: number;
    catatan_opd?: string;
    status_pengisian?: string;
    instansi_id?: number;
  }): Promise<{ success: boolean; message: string; data?: { penilaian_id: number } }> => {
    const res = await fetch(`${API_URL}/kks/penilaian/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 6. Upload Bukti Dukung
  uploadBuktiDukung: async (formData: FormData): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await fetch(`${API_URL}/kks/bukti-dukung/upload`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: formData,
    });
    return res.json();
  },

  // 6b. Ambil Dokumen Perpustakaan SAMP (Filter KKS atau Semua)
  getPustakaKks: async (params?: { search?: string; filter?: 'kks' | 'all'; page?: number; limit?: number }): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      nama_file: string;
      nama_asli_unggah?: string;
      path: string;
      ukuran?: number;
      hash?: string;
      uploaded_at: string;
      uploader_nama: string;
      is_kks: number;
      tematik_names?: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.filter) query.append('filter', params.filter);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`${API_URL}/kks/perpustakaan?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 6c. Tautkan Dokumen Perpustakaan ke Bukti Dukung
  linkLibraryDoc: async (data: {
    penilaian_id: number;
    dokumen_id: number;
    tahun_dokumen: number;
    keterangan?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await fetch(`${API_URL}/kks/bukti-dukung/link-library`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 7. Hapus Bukti Dukung
  deleteBuktiDukung: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/bukti-dukung/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 8. Simpan Verifikasi
  saveVerifikasi: async (data: {
    penilaian_id: number;
    skor_verifikasi: number;
    status_verifikasi: string;
    catatan_rekomendasi?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/verifikasi/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 9. Periode List
  getPeriodeList: async (): Promise<{ success: boolean; data: KksPeriode[] }> => {
    const res = await fetch(`${API_URL}/kks/periode`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 10. Salin dari Tahun Sebelumnya (Clone Year)
  cloneYear: async (data: {
    tahun_asal: number;
    tahun_tujuan: number;
    nama_periode?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await fetch(`${API_URL}/kks/master/clone-year`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 11. Update Indikator (Superadmin)
  updateIndikator: async (id: number, data: any): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/master/indikator/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 12. Tambah Indikator Baru (Superadmin)
  createIndikator: async (data: any): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await fetch(`${API_URL}/kks/master/indikator`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 13. Hapus Indikator (Superadmin)
  deleteIndikator: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/master/indikator/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // 14. Tambah Tatanan Baru (Superadmin)
  createTatanan: async (data: any): Promise<{ success: boolean; message: string; data?: any }> => {
    const res = await fetch(`${API_URL}/kks/master/tatanan`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 15. Update Tatanan (Superadmin)
  updateTatanan: async (id: number, data: any): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/master/tatanan/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 16. Hapus Tatanan (Superadmin)
  deleteTatanan: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/kks/master/tatanan/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  }
};
