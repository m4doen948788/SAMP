const getDynamicUrl = (envUrl: string) => {
  // If no env URL or it's already a relative path /api, just use /api
  if (!envUrl || envUrl === '/api' || envUrl.startsWith('/')) {
    return '/api';
  }

  // Smart resolution for LAN access (HP/Mobile)
  // If we are accessing via an IP but the API points to localhost, fix it.
  const host = window.location.hostname;
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
  
  if (isIP && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
    return envUrl.replace(/localhost|127\.0\.0\.1/, host);
  }

  return envUrl;
};

export const rawApiUrl = getDynamicUrl(import.meta.env.VITE_API_URL || '');
export const API_URL = rawApiUrl === '/api' ? '/api' : (rawApiUrl.endsWith('/api') ? rawApiUrl : (rawApiUrl.endsWith('/') ? `${rawApiUrl}api` : `${rawApiUrl}/api`));

// Auto-resolve Nayaxa URL: jika env tidak diset, arahkan langsung ke port 6001 di localhost
// (bukan ke /api yang akan kena middleware JWT dashboard backend)
const _rawNayaxaEnvUrl = import.meta.env.VITE_NAYAXA_API_URL || '';
export const NAYAXA_API_URL = (() => {
  if (_rawNayaxaEnvUrl && !_rawNayaxaEnvUrl.startsWith('/')) {
    // Env sudah diset ke URL absolut (misalnya di production)
    return getDynamicUrl(_rawNayaxaEnvUrl);
  }
  // Tidak ada env → auto-detect berdasarkan hostname
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:6001';
  }
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host)) {
    // Akses via IP (LAN/HP) → arahkan ke IP yang sama port 6001
    return `http://${host}:6001`;
  }
  // Production/domain → wajib set VITE_NAYAXA_API_URL di .env
  return _rawNayaxaEnvUrl || 'https://api-nayaxa.bapperida-ppm.my.id';
})();


const NAYAXA_API_KEY = import.meta.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';

const request = async (path: string, method = 'GET', body?: any, timeoutMs: number = 60000) => {
  const token = sessionStorage.getItem('token');
  const headers: HeadersInit = {};

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };
  if (body) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_URL}${path}`, options);

    // Handle unauthorized/expired token globally
    if (res.status === 401) {
      if (sessionStorage.getItem('token')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }
      // Return early — don't continue parsing response after redirect
      return { success: false, error: 'Unauthorized' };
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await res.json();
      return json;
    } else {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - Pastikan backend service aktif`);
      }
      throw new Error('Respons server bukan format JSON');
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`Request to ${path} timed out after ${timeoutMs / 1000}s`);
      return { success: false, error: 'Request timed out' };
    }
    console.error(`Request to ${path} failed:`, err);
    return { success: false, error: err.message || 'Network error' };
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestNoRedirect = async (path: string, method = 'GET', body?: any) => {
  const token = sessionStorage.getItem('token');
  const headers: HeadersInit = {};
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });
    if (res.status === 401) {
      return { success: false, error: 'Unauthorized' };
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const requestWithProgress = (
  path: string, 
  method = 'POST', 
  body: any, 
  onProgress: (percent: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = sessionStorage.getItem('token');
    
    xhr.open(method, `${API_URL}${path}`, true);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 401) {
        if (sessionStorage.getItem('token')) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
        }
        resolve({ success: false, error: 'Unauthorized' });
        return;
      }
      
      try {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } catch (e) {
        resolve({ success: false, message: 'Gagal memproses respon server.' });
      }
    };
    
    xhr.onerror = () => {
      resolve({ success: false, error: 'Koneksi internet terputus atau server mati.' });
    };
    
    xhr.send(body);
  });
};


const nayaxaRequest = async (path: string, method = 'GET', body?: any, timeoutMs: number = 300000) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': NAYAXA_API_KEY
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${NAYAXA_API_URL}${path}`, options);
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    } else {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - Nayaxa API tidak aktif`);
      }
      throw new Error('Nayaxa API memberikan respons tidak valid (bukan JSON)');
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`Nayaxa Request to ${path} timed out after ${timeoutMs / 1000}s`);
      return { success: false, error: 'Request timeout — Nayaxa butuh waktu terlalu lama untuk memproses file.' };
    }
    console.error(`Nayaxa Request to ${path} failed:`, err);
    return { success: false, error: 'Nayaxa Service Unavailable' };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const api = {
  tahun: {
    getAll: () => request('/tahun'),
    getById: (id: number) => request(`/tahun/${id}`),
    create: (nama: string) => request('/tahun', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/tahun/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/tahun/${id}`, 'DELETE'),
  },
  tematik: {
    getAll: () => request('/tematik'),
    getById: (id: number) => request(`/tematik/${id}`),
    create: (nama: string) => request('/tematik', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/tematik/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/tematik/${id}`, 'DELETE'),
  },
  satuan: {
    getAll: () => request('/satuan'),
    getById: (id: number) => request(`/satuan/${id}`),
    create: (satuan: string) => request('/satuan', 'POST', { satuan }),
    update: (id: number, satuan: string) => request(`/satuan/${id}`, 'PUT', { satuan }),
    delete: (id: number) => request(`/satuan/${id}`, 'DELETE'),
  },
  dataMakro: {
    getAll: () => request('/data-makro'),
    getWithNilai: (tahun_start: number, tahun_end: number) => request(`/data-makro/with-nilai?tahun_start=${tahun_start}&tahun_end=${tahun_end}`),
    create: (data: any) => request('/data-makro', 'POST', data),
    update: (id: number, data: any) => request(`/data-makro/${id}`, 'PUT', data),
    delete: (id: number) => request(`/data-makro/${id}`, 'DELETE'),
    upsertNilai: (data: { data_makro_id: number, tahun: number, tipe: string, nilai: string }) => request('/data-makro/nilai', 'POST', data),
    getPegawai: (id: number) => request(`/data-makro/${id}/pegawai`),
    setPegawai: (id: number, profilIds: number[]) => request(`/data-makro/${id}/pegawai`, 'POST', { profil_ids: profilIds }),
    getOtoritas: () => request('/data-makro/otoritas/list'),
    setOtoritas: (profilIds: number[]) => request('/data-makro/otoritas/list', 'POST', { profil_ids: profilIds }),
  },
  aplikasiExternal: {
    getAll: () => request('/aplikasi-external'),
    getById: (id: number) => request(`/aplikasi-external/${id}`),
    create: (data: any) => request('/aplikasi-external', 'POST', data),
    update: (id: number, data: any) => request(`/aplikasi-external/${id}`, 'PUT', data),
    delete: (id: number) => request(`/aplikasi-external/${id}`, 'DELETE'),
  },
  tipeLink: {
    getAll: () => request('/tipe-link'),
    getById: (id: number) => request(`/tipe-link/${id}`),
    create: (nama: string) => request('/tipe-link', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/tipe-link/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/tipe-link/${id}`, 'DELETE'),
  },
  bidangUrusan: {
    getAll: () => request('/bidang-urusan'),
    getById: (id: number) => request(`/bidang-urusan/${id}`),
    create: (urusan: string, kode_urusan: string, parent_id?: number | null) => request('/bidang-urusan', 'POST', { urusan, kode_urusan, parent_id }),
    update: (id: number, urusan: string, kode_urusan: string, parent_id?: number | null) => request(`/bidang-urusan/${id}`, 'PUT', { urusan, kode_urusan, parent_id }),
    delete: (id: number) => request(`/bidang-urusan/${id}`, 'DELETE'),
  },
  instansiDaerah: {
    getAll: () => request('/instansi-daerah'),
    getById: (id: number) => request(`/instansi-daerah/${id}`),
    create: (data: any) => request('/instansi-daerah', 'POST', data),
    update: (id: number, data: any) => request(`/instansi-daerah/${id}`, 'PUT', data),
    delete: (id: number) => request(`/instansi-daerah/${id}`, 'DELETE'),
  },
  bidang: {
    getAll: () => request('/bidang'),
    getById: (id: number) => request(`/bidang/${id}`),
    create: (data: any) => request('/bidang', 'POST', data),
    update: (id: number, data: any) => request(`/bidang/${id}`, 'PUT', data),
    delete: (id: number) => request(`/bidang/${id}`, 'DELETE'),
  },
  bidangInstansi: {
    getAll: () => request('/bidang-instansi'),
    getById: (id: number) => request(`/bidang-instansi/${id}`),
    create: (data: any) => request('/bidang-instansi', 'POST', data),
    update: (id: number, data: any) => request(`/bidang-instansi/${id}`, 'PUT', data),
    delete: (id: number) => request(`/bidang-instansi/${id}`, 'DELETE'),
  },
  subBidangInstansi: {
    getAll: () => request('/sub-bidang-instansi'),
    getById: (id: number) => request(`/sub-bidang-instansi/${id}`),
    create: (data: any) => request('/sub-bidang-instansi', 'POST', data),
    update: (id: number, data: any) => request(`/sub-bidang-instansi/${id}`, 'PUT', data),
    delete: (id: number) => request(`/sub-bidang-instansi/${id}`, 'DELETE'),
  },
  menu: {
    getAll: () => request('/menu'),
    getById: (id: number) => request(`/menu/${id}`),
    create: (data: any) => request('/menu', 'POST', data),
    update: (id: number, data: any) => request(`/menu/${id}`, 'PUT', data),
    delete: (id: number) => request(`/menu/${id}`, 'DELETE'),
    reorder: (items: any[]) => request('/menu/reorder', 'POST', { items }),
  },
  masterDataConfig: {
    getAll: () => request('/master-data-config'),
    getById: (id: number) => request(`/master-data-config/${id}`),
    create: (data: any) => request('/master-data-config', 'POST', data),
    update: (id: number, data: any) => request(`/master-data-config/${id}`, 'PUT', data),
    delete: (id: number) => request(`/master-data-config/${id}`, 'DELETE'),
    getData: (configId: number) => request(`/master-data-config/${configId}/data`),
    getDataByTable: (tableName: string) => request(`/master-data-config/table/${tableName}/data`),
    createDataByTable: (tableName: string, data: any) => request(`/master-data-config/table/${tableName}/data`, 'POST', data),
    updateDataByTable: (tableName: string, dataId: number, data: any) => request(`/master-data-config/table/${tableName}/data/${dataId}`, 'PUT', data),
    deleteDataByTable: (tableName: string, dataId: number) => request(`/master-data-config/table/${tableName}/data/${dataId}`, 'DELETE'),
    createData: (id: number, data: any) => request(`/master-data-config/${id}/data`, 'POST', data),
    updateData: (id: number, dataId: number, data: any) => request(`/master-data-config/${id}/data/${dataId}`, 'PUT', data),
    deleteData: (id: number, dataId: number) => request(`/master-data-config/${id}/data/${dataId}`, 'DELETE'),
  },
  jenisDokumen: {
    getAll: () => request('/jenis-dokumen'),
    getById: (id: number) => request(`/jenis-dokumen/${id}`),
    create: (nama: string) => request('/jenis-dokumen', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/jenis-dokumen/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/jenis-dokumen/${id}`, 'DELETE'),
  },
  masterDokumen: {
    getAll: () => request('/master-data-config/table/master_dokumen/data'),
  },
  masterInstansiDaerah: {
    getAll: () => request('/instansi-daerah'),
  },
  jenisKegiatan: {
    getAll: () => request('/jenis-kegiatan'),
    getById: (id: number) => request(`/jenis-kegiatan/${id}`),
    create: (nama: string) => request('/jenis-kegiatan', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/jenis-kegiatan/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/jenis-kegiatan/${id}`, 'DELETE'),
  },
  jenisPegawai: {
    getAll: () => request('/jenis-pegawai'),
    getById: (id: number) => request(`/jenis-pegawai/${id}`),
    create: (nama: string, status_administrasi_id?: number | null) => request('/jenis-pegawai', 'POST', { nama, status_administrasi_id }),
    update: (id: number, nama: string, status_administrasi_id?: number | null) => request(`/jenis-pegawai/${id}`, 'PUT', { nama, status_administrasi_id }),
    delete: (id: number) => request(`/jenis-pegawai/${id}`, 'DELETE'),
  },
  statusAdministrasiPegawai: {
    getAll: () => request('/status-administrasi-pegawai'),
  },
  tableLabels: {
    getAll: () => request('/table-labels'),
    getAvailableTables: () => request('/table-labels/available-tables'),
    getByTable: (tableName: string) => request(`/table-labels/${tableName}`),
    upsert: (data: any) => request('/table-labels', 'POST', data),
  },
  generatedPages: {
    getAll: () => request('/generated-pages'),
    create: (data: any) => request('/generated-pages', 'POST', data),
    update: (id: number, data: any) => request(`/generated-pages/${id}`, 'PUT', data),
    delete: (id: number) => request(`/generated-pages/${id}`, 'DELETE'),
  },
  referensi: {
    getAll: () => request('/referensi'),
    create: (data: any) => request('/referensi', 'POST', data),
    update: (id: number, data: any) => request(`/referensi/${id}`, 'PUT', data),
    delete: (id: number) => request(`/referensi/${id}`, 'DELETE'),
  },
  users: {
    getAll: () => request('/users'),
    getSimpleList: () => request('/users/list'),
    getUnlinkedProfiles: () => request('/users/unlinked-profiles'),
    getById: (id: number) => request(`/users/${id}`),
    create: (data: any) => request('/users', 'POST', data),
    update: (id: number, data: any) => request(`/users/${id}`, 'PUT', data),
    delete: (id: number) => request(`/users/${id}`, 'DELETE'),
  },
  profilPegawai: {
    getAll: (params?: any) => request('/profil-pegawai' + (params ? '?' + new URLSearchParams(params).toString() : '')),
    getById: (id: number) => request(`/profil-pegawai/id/${id}`),
    create: (data: any) => request('/profil-pegawai', 'POST', data),
    update: (id: number, data: any) => request(`/profil-pegawai/id/${id}`, 'PUT', data),
    delete: (id: number) => request(`/profil-pegawai/id/${id}`, 'DELETE'),
    bulkCreate: (data: any[]) => request('/profil-pegawai/bulk', 'POST', data),
    getByUserId: (userId: number) => request(`/profil-pegawai/${userId}`),
    getFullProfile: (userId: number) => request(`/profil-pegawai/${userId}/full`),
    upsertByUserId: (userId: number, data: any) => request(`/profil-pegawai/${userId}`, 'POST', data),
    updateAccount: (userId: number, data: any) => request(`/profil-pegawai/${userId}/account`, 'PUT', data),
    changePassword: (userId: number, password: string) => request(`/profil-pegawai/${userId}/password`, 'PUT', { password }),
    uploadSignature: (userId: number, formData: FormData) => request(`/profil-pegawai/${userId}/signature`, 'POST', formData),
    uploadParaf: (userId: number, formData: FormData) => request(`/profil-pegawai/${userId}/paraf`, 'POST', formData),
    bulkCreateAccounts: () => request('/profil-pegawai/bulk-create-accounts', 'POST'),
  },
  rbac: {
    getRoles: () => request('/rbac/roles'),
    getRoleAccess: (roleId: number) => request(`/rbac/menu-access/${roleId}`),
    updateRoleAccess: (roleId: number, menuIds: number[]) => request(`/rbac/menu-access/${roleId}`, 'POST', { menuIds }),
    getKegiatanScopes: () => request('/rbac/kegiatan-scopes'),
    updateKegiatanScope: (roleId: number, scope: number) => request(`/rbac/kegiatan-scopes/${roleId}`, 'POST', { scope }),
  },

  theme: {
    getSettings: () => request('/theme/settings'),
    updateGlobalSettings: (data: any) => request('/theme/settings', 'POST', data),
    updateUserTheme: (data: any) => request('/theme/user', 'POST', data),
  },
  dokumen: {
    getAll: () => request('/dokumen'),
    getTrash: (search?: string) => request(`/dokumen/trash${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    upload: (formData: FormData) => request('/dokumen/upload', 'POST', formData),
    uploadWithProgress: (formData: FormData, onProgress: (percent: number) => void) => 
      requestWithProgress('/dokumen/upload', 'POST', formData, onProgress),
    update: (id: number, data: any) => request(`/dokumen/${id}`, 'PUT', data),
    restore: (id: number) => request(`/dokumen/restore/${id}`, 'PUT'),
    bulkRestore: (ids: number[]) => request('/dokumen/bulk-restore', 'POST', { ids }),
    checkDependencies: (id: number) => request(`/dokumen/${id}/dependencies`),
    delete: (id: number) => request(`/dokumen/${id}`, 'DELETE'),
    permanentDelete: (id: number) => request(`/dokumen/permanent/${id}`, 'DELETE'),
    bulkDelete: (ids: number[]) => request('/dokumen/bulk-delete', 'POST', { ids }),
    emptyTrash: () => request('/dokumen/empty-trash', 'POST'),
  },
  linkExternal: {
    getAll: () => request('/link-external'),
    getById: (id: number) => request(`/link-external/${id}`),
    create: (label: string, uri: string) => request('/link-external', 'POST', { label, uri }),
    update: (id: number, label: string, uri: string) => request(`/link-external/${id}`, 'PUT', { label, uri }),
    delete: (id: number) => request(`/link-external/${id}`, 'DELETE'),
  },
  pangkatGolongan: {
    getAll: () => request('/pangkat-golongan'),
    getById: (id: number) => request(`/pangkat-golongan/${id}`),
    create: (pangkat_golongan: string) => request('/pangkat-golongan', 'POST', { pangkat_golongan }),
    update: (id: number, pangkat_golongan: string) => request(`/pangkat-golongan/${id}`, 'PUT', { pangkat_golongan }),
    delete: (id: number) => request(`/pangkat-golongan/${id}`, 'DELETE'),
    sync: () => request('/pangkat-golongan/sync', 'POST'),
  },
  wilayah: {
    getProvinsi: () => request('/wilayah/provinsi'),
    getAllKota: () => request('/wilayah/kota-kabupaten'),
    getKotaByProvinsi: (provinsiId: string) => request(`/wilayah/kota-kabupaten/${provinsiId}`),
    getKecamatanByKota: (kotaId: string) => request(`/wilayah/kecamatan/${kotaId}`),
    getKelurahanByKecamatan: (kecamatanId: string) => request(`/wilayah/kelurahan/${kecamatanId}`),
  },
  internalInstansi: {
    get: (instansiId: number) => request(`/internal-instansi/${instansiId}`),
    getByInstansiId: (instansiId: number) => request(`/internal-instansi/${instansiId}`),
    updateProfil: (instansiId: number, data: any) => request(`/internal-instansi/${instansiId}/profil`, 'PUT', data),
    uploadLogo: (instansiId: number, formData: FormData) => request(`/internal-instansi/${instansiId}/logo`, 'POST', formData),
  },
  mappingUrusanInstansi: {
    getAll: () => request('/mapping-urusan-instansi'),
    create: (data: any) => request('/mapping-urusan-instansi', 'POST', data),
    update: (id: number, data: any) => request(`/mapping-urusan-instansi/${id}`, 'PUT', data),
    delete: (id: number) => request(`/mapping-urusan-instansi/${id}`, 'DELETE'),
  },
  mappingPemegangSektor: {
    getAll: () => request('/mapping-pemegang-sektor'),
    update: (data: { pegawai_id: number, instansi_ids: number[] }) => request('/mapping-pemegang-sektor', 'POST', data),
    getAvailableInstansi: (pegawai_id: number) => request(`/mapping-pemegang-sektor/available-instansi/${pegawai_id}`),
  },
  mappingBidangPengampu: {
    getAll: () => request('/mapping-bidang-pengampu'),
    create: (data: any) => request('/mapping-bidang-pengampu', 'POST', data),
    update: (id: number, data: any) => request(`/mapping-bidang-pengampu/${id}`, 'PUT', data),
    delete: (id: number) => request(`/mapping-bidang-pengampu/${id}`, 'DELETE'),
  },
  mappingKegiatanInstansi: {
    getAll: () => request('/mapping-kegiatan-instansi'),
    syncInstansiBulk: (data: { instansi_id: number; program_ids: number[]; kegiatan_ids: number[]; sub_kegiatan_ids: number[] }) => request('/mapping-kegiatan-instansi/sync', 'POST', data),
    updateKegiatan: (kegiatan_id: number, instansi_ids: number[]) => request('/mapping-kegiatan-instansi/kegiatan', 'POST', { kegiatan_id, instansi_ids }),
    updateSubKegiatan: (sub_kegiatan_id: number, instansi_ids: number[]) => request('/mapping-kegiatan-instansi/sub-kegiatan', 'POST', { sub_kegiatan_id, instansi_ids }),
    getSubKegiatanSkpConfig: (sub_kegiatan_id: number, instansi_id?: number | null, tahun = 2026) => request(`/mapping-kegiatan-instansi/sub-kegiatan/${sub_kegiatan_id}/skp-config?tahun=${tahun}${instansi_id ? `&instansi_id=${instansi_id}` : ''}`),
    saveSubKegiatanSkpConfig: (sub_kegiatan_id: number, data: { instansi_id?: number | null, tahun?: number, months: any[] }) => request(`/mapping-kegiatan-instansi/sub-kegiatan/${sub_kegiatan_id}/skp-config`, 'POST', data),
  },
  kegiatanPegawai: {
    getMonthly: (params: { instansi_id: number, bidang_id?: string, month: number, year: number }) => {
      const query = new URLSearchParams(params as any).toString();
      return request(`/kegiatan-pegawai/monthly?${query}`);
    },
    upsert: (data: { profil_pegawai_id: number, tanggal: string, sesi?: string, tipe_kegiatan: string | null, id_kegiatan_eksternal?: string, nama_kegiatan?: string, lampiran_kegiatan?: string, keterangan?: string }) =>
      request('/kegiatan-pegawai/upsert', 'POST', data),
    getYearly: (params: { instansi_id: number, bidang_id?: string, year: number }) => {
      const query = new URLSearchParams(params as any).toString();
      return request(`/kegiatan-pegawai/yearly?${query}`);
    }
  },
  kegiatanManajemen: {
    getAll: (params?: { search?: string, startDate?: string, endDate?: string, bidang?: string, tematik?: string, instansi?: string }) => {
      const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      return request(`/kegiatan-manajemen${query}`);
    },
    getTrash: () => request('/kegiatan-manajemen/trash'),
    getById: (id: number) => request(`/kegiatan-manajemen/${id}`),
    checkAvailability: (tanggal: string, sesi: string, excludeId?: number) =>
      request(`/kegiatan-manajemen/ketersediaan-petugas?tanggal=${tanggal}&sesi=${sesi}${excludeId ? `&exclude_id=${excludeId}` : ''}`),
    create: (formData: FormData) => request('/kegiatan-manajemen', 'POST', formData),
    update: (id: number, formData: FormData) => request(`/kegiatan-manajemen/${id}`, 'PUT', formData),
    restore: (id: number) => request(`/kegiatan-manajemen/restore/${id}`, 'POST'),
    delete: (id: number) => request(`/kegiatan-manajemen/${id}`, 'DELETE'),
    permanentDelete: (id: number) => request(`/kegiatan-manajemen/permanent/${id}`, 'DELETE'),
    emptyTrash: () => request('/kegiatan-manajemen/trash/empty', 'DELETE'),
  },
  holidays: {
    getMonthly: (year: number, month: number) =>
      request(`/holidays/monthly?year=${year}&month=${month}`),
    toggle: (data: { tanggal: string, keterangan?: string }) =>
      request('/holidays/toggle', 'POST', data),
    bulkUpsert: (data: { start_tanggal: string, duration: number, keterangan: string }) =>
      request('/holidays/bulk-upsert', 'POST', data),
    bulkDelete: (data: { tanggal: string | string[] }) =>
      request('/holidays/bulk-delete', 'POST', data)
  },
  tipeKegiatan: {
    getAll: () => request('/tipe-kegiatan'),
    getById: (id: number) => request(`/tipe-kegiatan/${id}`),
    create: (data: any) => request('/tipe-kegiatan', 'POST', data),
    update: (id: number, data: any) => request(`/tipe-kegiatan/${id}`, 'PUT', data),
    delete: (id: number) => request(`/tipe-kegiatan/${id}`, 'DELETE'),
  },
  import: {
    perencanaan: (formData: FormData) => request('/import/perencanaan', 'POST', formData),
  },
  nayaxa: {
    getDashboardInsights: (params: { instansi_id?: number, profil_id?: number }) =>
      nayaxaRequest(`/dashboard-insights?instansi_id=${params.instansi_id}&profil_id=${params.profil_id}`),
    getSessions: (user_id: number) => nayaxaRequest(`/sessions?user_id=${user_id}`),
    getHistoryBySession: (sessionId: string) => nayaxaRequest(`/history/${sessionId}`),
    getProactiveInsight: (params: { current_page: string, instansi_id?: number }) =>
      nayaxaRequest(`/proactive-insight?current_page=${encodeURIComponent(params.current_page)}&instansi_id=${params.instansi_id || ''}`),
    deleteSession: (sessionId: string) => nayaxaRequest(`/session/${sessionId}`, 'DELETE'),
    deleteSessionsBatch: (sessionIds: string[]) => nayaxaRequest('/sessions/delete-batch', 'POST', { session_ids: sessionIds }),
    togglePinSession: (sessionId: string, userId: number, pin: boolean) =>
      nayaxaRequest(`/session/${sessionId}/pin`, 'POST', { user_id: userId, pin }),
    chat: (data: {
      message: string,
      files?: { base64: string, mimeType: string, name: string }[],
      current_page?: string,
      page_title?: string,
      session_id?: string | null,
      user_id: number,
      user_name: string,
      profil_id?: number,
      instansi_id?: number
    }) => nayaxaRequest('/chat', 'POST', data),
    chatStream: (data: any, onEvent: (event: string, data: any) => void) => {
      const controller = new AbortController();
      fetch(`${NAYAXA_API_URL}/chatStream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': NAYAXA_API_KEY
        },
        body: JSON.stringify(data),
        signal: controller.signal
      }).then(response => {
        if (!response.ok) {
          onEvent('error', { message: `HTTP ${response.status}: Gagal terhubung ke Nayaxa` });
          return;
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let isDoneReceived = false;

        function read() {
          reader?.read().then(({ done, value }) => {
            if (done) {
              if (!isDoneReceived) {
                onEvent('done', { text: '', brain_used: 'DeepSeek', session_id: data.session_id || '' });
              }
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('event:')) {
                currentEvent = trimmed.slice(6).trim();
              } else if (trimmed.startsWith('data:')) {
                try {
                  const payload = JSON.parse(trimmed.slice(5).trim());
                  if (currentEvent === 'done') {
                    isDoneReceived = true;
                  }
                  onEvent(currentEvent || 'message', payload);
                  currentEvent = '';
                } catch (e) { }
              }
            }
            read();
          }).catch(err => {
            if (err.name !== 'AbortError') {
              onEvent('error', { message: err.message });
            }
          });
        }
        read();
      }).catch(err => {
        if (err.name !== 'AbortError') {
          onEvent('error', { message: 'Gagal terhubung ke Nayaxa Engine.' });
        }
      });
      return () => controller.abort();
    },
    exportSelected: (messages: string[], filename?: string) => nayaxaRequest('/export-selected', 'POST', { messages, filename }),
    knowledge: {
      getAll: () => nayaxaRequest('/knowledge'),
      create: (data: any) => nayaxaRequest('/knowledge', 'POST', data),
      update: (id: number, data: any) => nayaxaRequest(`/knowledge/${id}`, 'PUT', data),
      delete: (id: number) => nayaxaRequest(`/knowledge/${id}`, 'DELETE'),
    },
    syncBuffer: {
      getHistory: () => request('/nayaxa/internal-sync/logs'),
      getFile: (id: number) => request(`/nayaxa/internal-sync/blob/${id}`),
      send: (message: string, replyToId?: number | null) => request('/nayaxa/internal-sync/push', 'POST', { message, reply_to_id: replyToId }),
      edit: (id: number, message: string) => request(`/nayaxa/internal-sync/patch/${id}`, 'PUT', { message }),
      clear: () => request('/nayaxa/internal-sync/purge', 'DELETE'),
    },
    getThemeAssets: () => request('/nayaxa/theme-assets'),
    getWidgetPrompts: () => nayaxaRequest('/widget-prompts')
  },
  pengaturan: {
    getGemini: () => request('/pengaturan/gemini'),
    updateGemini: (key: string) => request('/pengaturan/gemini', 'POST', { gemini_api_key: key }),
    // Multi-key support
    getGeminiKeys: () => request('/pengaturan/gemini-keys'),
    addGeminiKey: (data: { label: string, api_key: string, is_active: boolean }) => request('/pengaturan/gemini-keys', 'POST', data),
    updateGeminiKey: (id: number, data: { label: string, api_key?: string, is_active: boolean }) => request(`/pengaturan/gemini-keys/${id}`, 'PUT', data),
    deleteGeminiKey: (id: number) => request(`/pengaturan/gemini-keys/${id}`, 'DELETE'),
    activateGeminiKey: (id: number) => request(`/pengaturan/gemini-keys/${id}/activate`, 'PATCH'),
    // AI Monitor
    getAiUsageStats: () => request('/pengaturan/ai-usage/stats'),
    getAiUsageHistory: () => request('/pengaturan/ai-usage/history'),
    // Widget Prompts
    getWidgetPrompts: () => request('/pengaturan/widget-prompts'),
    addWidgetPrompt: (data: { label: string, prompt: string, urutan: number }) => request('/pengaturan/widget-prompts', 'POST', data),
    reorderWidgetPrompts: (items: { id: number, urutan: number }[]) => request('/pengaturan/widget-prompts/reorder', 'POST', { items }),
    updateWidgetPrompt: (id: number, data: { label: string, prompt: string, urutan: number, is_active?: boolean }) => request(`/pengaturan/widget-prompts/${id}`, 'PUT', data),
    deleteWidgetPrompt: (id: number) => request(`/pengaturan/widget-prompts/${id}`, 'DELETE'),
  },
  appSettings: {
    getAll: () => request('/app-settings'),
    getByKey: (key: string) => request(`/app-settings/${key}`),
    update: (key: string, value: string) => request(`/app-settings/${key}`, 'PUT', { value }),
  },
  surat: {
    getNextNumber: (bidang_id: number) => request(`/surat/next-number?bidang_id=${bidang_id}`),
    getAll: (params: { type?: string, bidang_id?: number, instansi_id?: number | 'all' }) => {
      const query = new URLSearchParams(params as any).toString();
      return request(`/surat?${query}`);
    },
    getById: (id: number) => request(`/surat/${id}`),
    saveMasuk: (data: any) => request('/surat/masuk', 'POST', data),
    generateKeluar: (data: any) => request('/surat/keluar', 'POST', data),
    generateDocx: (data: any) => request('/surat/generate-docx', 'POST', data),
    getKlasifikasi: (search?: string) => request(`/surat/klasifikasi${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    takeNumber: (data: any) => request('/surat/take-number', 'POST', data),
    getNumberLogs: (month: number, year: number) => request(`/surat/number-logs?month=${month}&year=${year}`),
    updateNumberLog: (id: number, data: any) => request(`/surat/update-number-log/${id}`, 'PUT', data),
    update: (id: number, data: any) => request(`/surat/${id}`, 'PUT', data),
    delete: (id: number) => request(`/surat/${id}`, 'DELETE'),
  },
  suratTemplate: {
    getAll: () => request('/surat-templates'),
    getGlobal: () => request('/surat-templates/global'),
    updateGlobal: (data: any) => request('/surat-templates/global', 'POST', data),
    getById: (id: number) => request(`/surat-templates/${id}`),
    create: (data: any) => request('/surat-templates', 'POST', data),
    update: (id: number, data: any) => request(`/surat-templates/${id}`, 'PUT', data),
    delete: (id: number) => request(`/surat-templates/${id}`, 'DELETE'),
  },
  suratApprovals: {
    submitDraft: (data: any) => request('/surat-approvals/submit', 'POST', data),
    getPending: () => request('/surat-approvals/pending'),
    processAction: (id: number, data: { action: string, reason?: string, sign_type?: string }) => request(`/surat-approvals/process/${id}`, 'PUT', data),
    uploadFinal: (id: number, dokumen_id: number) => request(`/surat-approvals/upload-final/${id}`, 'PUT', { dokumen_id }),
    getHistory: (surat_id: number) => request(`/surat-approvals/history/${surat_id}`),
    verify: (slug: string) => request(`/surat-approvals/verify/${slug}`),
    bypass: (id: number, reason: string) => request(`/surat-approvals/bypass/${id}`, 'PUT', { reason })
  },
  audit: {
    getAll: (params: any) => {
      const query = new URLSearchParams(params).toString();
      return request(`/audit?${query}`);
    },
    getActions: () => request('/audit/actions'),
    getTables: () => request('/audit/tables'),
  },
  notifications: {
    getAll: () => request('/notifications'),
    markRead: (id: number) => request(`/notifications/${id}/read`, 'PUT'),
    markAllRead: () => request('/notifications/read-all', 'PUT'),
  },
  notulen: {
    getAll: (params?: { kegiatan_id?: number, bidang_id?: number | string }) => {
      const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      return request(`/notulen${query}`);
    },
    getById: (id: number) => request(`/notulen/${id}`),
    create: (data: any) => request('/notulen', 'POST', data),
  },
  notulenTemplate: {
    getAll: () => request('/notulen-templates'),
    getGlobal: () => request('/notulen-templates/global'),
    updateGlobal: (data: any) => request('/notulen-templates/global', 'PUT', data),
    getById: (id: number) => request(`/notulen-templates/${id}`),
    create: (data: any) => request('/notulen-templates', 'POST', data),
    update: (id: number, data: any) => request(`/notulen-templates/${id}`, 'PUT', data),
    delete: (id: number) => request(`/notulen-templates/${id}`, 'DELETE'),
  },
  skp: {
    getPublicDocuments: (year: number, bidangId: number, month: number, butirSkp: string) => 
      request(`/public/skp/public-documents?year=${year}&bidang_id=${bidangId}&month=${month}&butir_skp=${encodeURIComponent(butirSkp)}`),
    getPublicPegawai: () => request('/public/skp/pegawai'),
    getPublicBidang: () => request('/public/skp/bidang'),
    getPublicMapping: () => request('/public/skp/mapping'),
    getPegawaiRecords: (year: number, bidangId: number) => request(`/skp/records?year=${year}&bidang_id=${bidangId}`),
    getSummary: (bidangId: number) => request(`/skp/summary?bidang_id=${bidangId}`),
    getHistory: (year: number, bidangId: number) => request(`/skp/history?tahun=${year}&bidang_id=${bidangId}`),
    savePegawaiRecord: (payload: any) => request('/skp/records', 'POST', payload),
    getPublicMonthlyLinks: (bidangId: number) => request(`/public/skp/monthly-links?bidang_id=${bidangId}`),
    getMonthlyLinks: (bidangId: number) => request(`/skp/monthly-links?bidang_id=${bidangId}`),
    saveMonthlyLink: (payload: any) => request('/skp/monthly-links', 'POST', payload),
    renameMonthlyButir: (payload: any) => request('/skp/monthly-links/rename-butir', 'POST', payload),
    getParirimbonLinks: (bidangId: number) => request(`/skp/paririmbon-links?bidang_id=${bidangId}`),
    saveParirimbonLink: (payload: any) => request('/skp/paririmbon-links', 'POST', payload),
    getCustomItems: (year: number, bidangId: number) => request(`/skp/custom-items?year=${year}&bidang_id=${bidangId}`),
    addCustomItem: (payload: { tahun: number; bidang_id: number; butir_skp: string }) => request('/skp/custom-items', 'POST', payload),
    deleteCustomItem: (payload: { tahun: number; bidang_id: number; butir_skp: string }) => request('/skp/custom-items/delete', 'POST', payload),
    getCustomAssignments: (bidangId: number) => request(`/skp/custom-assignments?bidang_id=${bidangId}`),
    saveCustomAssignment: (payload: { bidang_id: number; butir_skp: string; target_scope?: string; target_id?: number | null; assigned_pegawai_ids?: number[] }) => request('/skp/custom-assignments', 'POST', payload),
    getSkpMonthlyConfigByButir: (butir_skp: string, bidang_id?: number, tahun = 2026) => request(`/skp/sub-kegiatan/by-butir/config?tahun=${tahun}&butir_skp=${encodeURIComponent(butir_skp)}${bidang_id ? `&bidang_id=${bidang_id}` : ''}`),
    saveSkpMonthlyConfigByButir: (data: { butir_skp: string; bidang_id?: number; tahun?: number; months: any[] }) => request('/skp/sub-kegiatan/by-butir/config', 'POST', data),
    getBidangSkpMonthlyConfigs: (bidangId?: number, instansiId?: number, tahun = 2026) => request(`/skp/monthly-configs?tahun=${tahun}${bidangId ? `&bidang_id=${bidangId}` : ''}${instansiId ? `&instansi_id=${instansiId}` : ''}`),
  },
  rpjpd: {
    getVisi: () => request('/rpjpd/visi'),
    saveVisi: (data: any) => request('/rpjpd/visi', 'POST', data),
    getMisi: () => request('/rpjpd/misi'),
    saveMisi: (data: any) => request('/rpjpd/misi', 'POST', data),
    deleteMisi: (id: number) => request(`/rpjpd/misi/${id}`, 'DELETE'),
    getSasaran: () => request('/rpjpd/sasaran'),
    saveSasaran: (data: any) => request('/rpjpd/sasaran', 'POST', data),
    deleteSasaran: (id: number) => request(`/rpjpd/sasaran/${id}`, 'DELETE'),
    getArahKebijakan: () => request('/rpjpd/arah-kebijakan'),
    saveArahKebijakan: (data: any) => request('/rpjpd/arah-kebijakan', 'POST', data),
    deleteArahKebijakan: (id: number) => request(`/rpjpd/arah-kebijakan/${id}`, 'DELETE'),
    getIndikator: () => request('/rpjpd/indikator'),
    saveIndikator: (data: any) => request('/rpjpd/indikator', 'POST', data),
    deleteIndikator: (id: number) => request(`/rpjpd/indikator/${id}`, 'DELETE'),
    uploadPerdaFile: (id: number, formData: FormData) => request(`/rpjpd/visi/${id}/upload-perda`, 'POST', formData),
    linkPerdaFile: (id: number, file_path: string, file_name: string) => request(`/rpjpd/visi/${id}/link-perda`, 'POST', { file_path, file_name }),
    unlinkPerdaFile: (id: number) => request(`/rpjpd/visi/${id}/unlink-perda`, 'POST'),
    getPerdaHistory: (id: number) => request(`/rpjpd/visi/${id}/history`),
  },
};
