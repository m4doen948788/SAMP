export interface KksPeriode {
  id: number;
  tahun: number;
  nama_periode: string;
  status: 'draft' | 'buka_pengisian' | 'masa_verifikasi' | 'selesai' | 'arsip';
  tanggal_mulai_pengisian?: string | null;
  tanggal_selesai_pengisian?: string | null;
  target_predikat?: string;
  keterangan?: string | null;
}

export interface KksStats {
  totalIndikator: number;
  totalDiisi: number;
  totalVerifikasi: number;
  totalBerkas: number;
  persentaseKeterisian: number;
  persentaseVerifikasi: number;
  rataRataSkor: number;
  predikat: string;
}

export interface KksTatanan {
  id: number;
  tahun: number;
  nomor_tatanan: number;
  kode_tatanan: string;
  nama_tatanan: string;
  deskripsi?: string | null;
  bobot: number;
  icon: string;
  warna_tema: string;
  urutan: number;
  total_indikator?: number;
  total_diisi?: number;
  total_disetujui?: number;
  avg_skor?: number;
  persentase?: number;
}

export interface KksKriteria {
  id: number;
  indikator_id: number;
  skor: number;
  kriteria: string;
  urutan: number;
}

export interface KksBuktiDukung {
  id: number;
  penilaian_id: number;
  tipe_sumber: 'file_upload' | 'link_url';
  tahun_dokumen?: number;
  nama_berkas: string;
  file_path?: string | null;
  url_external?: string | null;
  ukuran_file?: number | null;
  ekstensi?: string | null;
  hash?: string | null;
  dokumen_id?: number | null;
  keterangan?: string | null;
  uploaded_by?: number | null;
  created_at: string;
}

export interface KksPustakaItem {
  id: number;
  nama_file: string;
  nama_asli_unggah?: string;
  path: string;
  ukuran?: number;
  hash?: string;
  uploaded_at: string;
  uploader_nama: string;
  is_kks: number | boolean;
  tematik_names?: string;
}

export interface KksIndikator {
  id: number;
  tahun: number;
  tatanan_id: number;
  nama_tatanan?: string;
  nomor_tatanan?: number;
  tatanan_warna?: string;
  nomor_indikator: string;
  nama_indikator: string;
  definisi_operasional?: string | null;
  sumber_data?: string | null;
  bukti_dukung_dibutuhkan?: string | null;
  instansi_pengampu_id?: number | null;
  instansi_pengampu_nama?: string | null;
  crosscutting_instansi_ids?: string | null;
  catatan_khusus?: string | null;
  urutan: number;
  // Relasi pengisian mandiri
  penilaian_id?: number | null;
  skor_mandiri?: number | null;
  catatan_opd?: string | null;
  status_pengisian?: 'belum_diisi' | 'draft' | 'siap_verifikasi';
  submitted_at?: string | null;
  // Relasi verifikasi
  verifikasi_id?: number | null;
  skor_verifikasi?: number | null;
  status_verifikasi?: 'menunggu' | 'disetujui' | 'perlu_perbaikan' | 'ditolak' | null;
  catatan_rekomendasi?: string | null;
  verified_at?: string | null;
  // List sub-data
  kriteria_skala: KksKriteria[];
  bukti_dukung_list: KksBuktiDukung[];
}

export interface KksLeaderboardOpd {
  rank: number;
  instansi_id: number;
  nama_opd: string;
  singkatan_opd: string;
  total_indikator: number;
  total_diisi: number;
  total_bukti: number;
  total_disetujui: number;
  total_revisi: number;
  persentase_upload: number;
  avg_skor: number;
}
