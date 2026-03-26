const API_URL = '/api';

const request = async (path: string, method = 'GET', body?: any) => {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, options);
  const json = await res.json();

  if (json.success && (method === 'POST' || method === 'PUT')) {
    window.dispatchEvent(new CustomEvent('sidebar:expand'));
  }
  return json;
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
  aplikasiExternal: {
    getAll: () => request('/aplikasi-external'),
    getById: (id: number) => request(`/aplikasi-external/${id}`),
    create: (data: any) => request('/aplikasi-external', 'POST', data),
    update: (id: number, data: any) => request(`/aplikasi-external/${id}`, 'PUT', data),
    delete: (id: number) => request(`/aplikasi-external/${id}`, 'DELETE'),
  },
  urusan: {
    getAll: () => request('/urusan'),
    getById: (id: number) => request(`/urusan/${id}`),
    create: (urusan: string) => request('/urusan', 'POST', { urusan }),
    update: (id: number, urusan: string) => request(`/urusan/${id}`, 'PUT', { urusan }),
    delete: (id: number) => request(`/urusan/${id}`, 'DELETE'),
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
    create: (nama: string) => request('/jenis-pegawai', 'POST', { nama }),
    update: (id: number, nama: string) => request(`/jenis-pegawai/${id}`, 'PUT', { nama }),
    delete: (id: number) => request(`/jenis-pegawai/${id}`, 'DELETE'),
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
};
