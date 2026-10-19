import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Calendar, 
    CalendarPlus, 
    Plus, 
    Trash2, 
    Edit2, 
    Check, 
    AlertCircle, 
    Clock, 
    Users, 
    MapPin, 
    Search, 
    Filter, 
    Loader2, 
    ArrowRight, 
    FileText, 
    Sparkles, 
    X,
    Building2,
    CalendarCheck,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    UserCheck,
    UserX,
    Layers,
    Send,
    Table,
    LayoutGrid,
    Maximize2,
    Minimize2,
    ExternalLink,
    ArrowLeft,
    Save,
    Printer,
    GitMerge,
    CornerRightDown,
    FileSpreadsheet,
    Download,
    UploadCloud,
    FileCheck,
    AlertTriangle,
    History,
    User,
    RotateCcw,
    Lock,
    Unlock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';

// Types
interface TeamOfficer {
    id: number;
    nama_lengkap: string;
    nip?: string;
    bidang_id?: number;
    nama_bidang?: string;
    bidang_nama?: string;
    bidang_singkatan?: string;
}

interface DraftTeamItem {
    id: number;
    draft_id: number;
    nama_tim: string;
    tanggal_mulai: string | null;
    tanggal_akhir: string | null;
    kota_kabupaten_id: string | null;
    kecamatan_id: string | null;
    lokasi_detail: string | null;
    petugas_ids: string | null;
    keterangan: string | null;
    status: 'draft' | 'terintegrasi';
    kegiatan_manajemen_id: number | null;
    created_at?: string;
    updated_at?: string;
    kecamatan_nama?: string;
    kabupaten_nama?: string;
    officers?: TeamOfficer[];
    total_petugas?: number;
    is_complete?: boolean;
}

export interface DraftEditHistoryItem {
    id: number;
    draft_id: number;
    user_id: number | null;
    aksi: string;
    keterangan: string;
    created_at: string;
    user_nama: string;
}

export interface DraftItem {
    id: number;
    nama_kegiatan: string;
    jenis_kegiatan_id: number;
    status: 'draft' | 'menunggu_persetujuan' | 'dikembalikan' | 'sebagian' | 'terintegrasi';
    created_by: number;
    created_at: string;
    updated_at: string;
    ketua_tim_id?: number | null;
    catatan_katim?: string | null;
    approved_by?: number | null;
    approved_at?: string | null;
    ketua_tim_nama?: string | null;
    jenis_kegiatan_nama?: string;
    jenis_kegiatan_kode?: string;
    jenis_kegiatan_warna?: string;
    jenis_kegiatan_warna_teks?: string;
    pembuat_nama?: string;
    teams: DraftTeamItem[];
    edit_history?: DraftEditHistoryItem[];
    total_teams: number;
    total_team_schedules?: number;
    total_days?: number;
    integrated_teams: number;
    ready_teams: number;
    total_unique_officers: number;
    is_deleted?: number;
    deleted_at?: string | null;
    deleted_by?: number | null;
    penghapus_nama?: string | null;
    pembuat_bidang_id?: number | null;
    pembuat_bidang_nama?: string | null;
    pembuat_bidang_singkatan?: string | null;
    bidang_ids?: string | null;
}

interface BidangItem {
    id: number;
    instansi_id: number;
    nama_bidang: string;
    singkatan?: string;
}

interface KecamatanItem {
    id: string;
    nama: string;
    kota_kabupaten_id: string;
}

interface TipeKegiatanItem {
    id: number;
    kode: string;
    nama: string;
    deskripsi?: string;
    warna?: string;
    warna_teks?: string;
    parent_id?: number | null;
}

interface PegawaiItem {
    id: number;
    nama_lengkap: string;
    nip?: string;
    bidang_id?: number;
    bidang_nama?: string;
    nama_bidang?: string;
    bidang_singkatan?: string;
    jabatan_nama?: string;
}

interface ConflictInfo {
    tanggal: string;
    nama_kegiatan: string;
    tipe_kegiatan: string;
    tipe_nama: string;
    sesi: string;
}

interface DraftJadwalProps {
    onNavigateToDaftar?: (kegiatanId?: number) => void;
    onNavigateToLogbook?: (profilId?: number, date?: string) => void;
    activeDraftDetail?: DraftItem | null;
    onSelectDraftDetail?: (draft: DraftItem | null) => void;
    closeDetailTrigger?: number;
}

// 40 Kecamatan di Kabupaten Bogor as safe initial fallback
const BOGOR_KECAMATAN_FALLBACK: KecamatanItem[] = [
    { id: '3201140', nama: 'BABAKAN MADANG', kota_kabupaten_id: '3201' },
    { id: '3201220', nama: 'BOJONG GEDE', kota_kabupaten_id: '3201' },
    { id: '3201090', nama: 'CARINGIN', kota_kabupaten_id: '3201' },
    { id: '3201160', nama: 'CARIU', kota_kabupaten_id: '3201' },
    { id: '3201050', nama: 'CIAMPEA', kota_kabupaten_id: '3201' },
    { id: '3201100', nama: 'CIAWI', kota_kabupaten_id: '3201' },
    { id: '3201210', nama: 'CIBINONG', kota_kabupaten_id: '3201' },
    { id: '3201040', nama: 'CIBUNGBULANG', kota_kabupaten_id: '3201' },
    { id: '3201081', nama: 'CIGOMBONG', kota_kabupaten_id: '3201' },
    { id: '3201290', nama: 'CIGUDEG', kota_kabupaten_id: '3201' },
    { id: '3201080', nama: 'CIJERUK', kota_kabupaten_id: '3201' },
    { id: '3201180', nama: 'CILEUNGSI', kota_kabupaten_id: '3201' },
    { id: '3201070', nama: 'CIOMAS', kota_kabupaten_id: '3201' },
    { id: '3201120', nama: 'CISARUA', kota_kabupaten_id: '3201' },
    { id: '3201260', nama: 'CISEENG', kota_kabupaten_id: '3201' },
    { id: '3201200', nama: 'CITEUREUP', kota_kabupaten_id: '3201' },
    { id: '3201060', nama: 'DRAMAGA', kota_kabupaten_id: '3201' },
    { id: '3201190', nama: 'GUNUNG PUTRI', kota_kabupaten_id: '3201' },
    { id: '3201270', nama: 'GUNUNG SINDUR', kota_kabupaten_id: '3201' },
    { id: '3201310', nama: 'JASINGA', kota_kabupaten_id: '3201' },
    { id: '3201170', nama: 'JONGGOL', kota_kabupaten_id: '3201' },
    { id: '3201240', nama: 'KEMANG', kota_kabupaten_id: '3201' },
    { id: '3201181', nama: 'KLAPANUNGGAL', kota_kabupaten_id: '3201' },
    { id: '3201020', nama: 'LEUWILIANG', kota_kabupaten_id: '3201' },
    { id: '3201021', nama: 'LEUWISADENG', kota_kabupaten_id: '3201' },
    { id: '3201130', nama: 'MEGAMENDUNG', kota_kabupaten_id: '3201' },
    { id: '3201010', nama: 'NANGGUNG', kota_kabupaten_id: '3201' },
    { id: '3201030', nama: 'PAMIJAHAN', kota_kabupaten_id: '3201' },
    { id: '3201250', nama: 'PARUNG', kota_kabupaten_id: '3201' },
    { id: '3201330', nama: 'PARUNG PANJANG', kota_kabupaten_id: '3201' },
    { id: '3201241', nama: 'RANCABUNGUR', kota_kabupaten_id: '3201' },
    { id: '3201280', nama: 'RUMPIN', kota_kabupaten_id: '3201' },
    { id: '3201300', nama: 'SUKAJAYA', kota_kabupaten_id: '3201' },
    { id: '3201150', nama: 'SUKAMAKMUR', kota_kabupaten_id: '3201' },
    { id: '3201131', nama: 'SUKARAJA', kota_kabupaten_id: '3201' },
    { id: '3201230', nama: 'TAJURHALANG', kota_kabupaten_id: '3201' },
    { id: '3201071', nama: 'TAMANSARI', kota_kabupaten_id: '3201' },
    { id: '3201161', nama: 'TANJUNGSARI', kota_kabupaten_id: '3201' },
    { id: '3201320', nama: 'TENJO', kota_kabupaten_id: '3201' },
];

const getBadgeColorStyle = (kode?: string, nama?: string) => {
    const k = (kode || '').toUpperCase();
    const n = (nama || '').toLowerCase();

    // DL / Dinas Luar
    if (k.includes('DL') || n.includes('dinas luar') || n.includes('luar bidang')) {
        return {
            bg: 'bg-amber-100',
            text: 'text-amber-900',
            border: 'border-amber-300',
            style: { color: '#78350f', backgroundColor: '#fef3c7', borderColor: '#fcd34d' }
        };
    }
    // RM / Rapat Mamin
    if (k.includes('RM') || n.includes('mamin')) {
        return {
            bg: 'bg-purple-100',
            text: 'text-purple-900',
            border: 'border-purple-300',
            style: { color: '#581c87', backgroundColor: '#f3e8ff', borderColor: '#d8b4fe' }
        };
    }
    // RLB / Rapat Luar Bidang
    if (k.includes('RLB') || n.includes('luar bidang')) {
        return {
            bg: 'bg-fuchsia-100',
            text: 'text-fuchsia-900',
            border: 'border-fuchsia-300',
            style: { color: '#701a75', backgroundColor: '#fae8ff', borderColor: '#f0abfc' }
        };
    }
    // Default fallback
    return {
        bg: 'bg-blue-100',
        text: 'text-blue-900',
        border: 'border-blue-300',
        style: { color: '#1e3a8a', backgroundColor: '#dbeafe', borderColor: '#93c5fd' }
    };
};

// Helper Format Tanggal Indonesia
const formatTanggalIndo = (dateStr?: string | null) => {
    if (!dateStr) return 'Belum Ditentukan';
    try {
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day} ${months[month - 1]} ${year}`;
    } catch {
        return dateStr;
    }
};

const formatDateTimeIndo = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
    } catch {
        return dateStr;
    }
};

// Helper: Hak Akses Buka Kunci Jadwal Terbit (Ketua Tim, Admin Bidang, Staff Pembuat)
const checkUserCanUnlockDraft = (draft: DraftItem | null, currentUser: any): boolean => {
    if (!currentUser || !draft) return false;
    const userId = Number(currentUser.id);
    const userRoleId = Number(currentUser.tipe_user_id || 0);

    // 1. Superadmin (Akses Penuh Seluruh Bidang)
    if (userRoleId === 1) return true;

    // 2. Staff yang membuat draft
    if (draft.created_by && Number(draft.created_by) === userId) return true;

    // 3. Ketua Tim yang ditugaskan pada draft
    if (draft.ketua_tim_id && Number(draft.ketua_tim_id) === userId) return true;

    const userJabatan = (currentUser.jabatan_nama || '').toLowerCase();
    const userRoleName = (currentUser.tipe_user_nama || '').toLowerCase();
    const isKatimRole = userJabatan.includes('ketua tim') || userJabatan.includes('katim') || userRoleName.includes('ketua tim');
    const isAdminBidang = userRoleId === 2 || userRoleName.includes('admin');

    const userBidangId = currentUser.bidang_id ? Number(currentUser.bidang_id) : null;
    const draftBidangId = draft.pembuat_bidang_id ? Number(draft.pembuat_bidang_id) : null;
    const isSameBidang = !userBidangId || !draftBidangId || userBidangId === draftBidangId;

    // 4. Ketua Tim pada bidang yang sama
    if (isKatimRole && isSameBidang) return true;

    // 5. Admin Bidang pada bidang yang sama
    if (isAdminBidang && isSameBidang) return true;

    return false;
};

const DraftJadwal: React.FC<DraftJadwalProps> = ({ 
    onNavigateToDaftar,
    onNavigateToLogbook,
    activeDraftDetail,
    onSelectDraftDetail,
    closeDetailTrigger
}) => {
    const { user } = useAuth();

    // Full Screen / Dedicated Tab Workspace States
    const [selectedDraftDetail, setSelectedDraftDetail] = useState<DraftItem | null>(null);
    const [isFullScreenView, setIsFullScreenView] = useState(() => {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return params.get('fullscreen') === 'true' || params.get('fullscreen') === '1';
    });
    const [savingDraftSchedule, setSavingDraftSchedule] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);

    // Data States
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [kecamatanList, setKecamatanList] = useState<KecamatanItem[]>(BOGOR_KECAMATAN_FALLBACK);
    const [kabupatenInfo, setKabupatenInfo] = useState<{ id: string; nama: string }>({ id: '3201', nama: 'KABUPATEN BOGOR' });
    const [tipeKegiatanList, setTipeKegiatanList] = useState<TipeKegiatanItem[]>([]);
    const [pegawaiList, setPegawaiList] = useState<PegawaiItem[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'draft' | 'menunggu_persetujuan' | 'dikembalikan' | 'terintegrasi' | 'all'>('draft');
    const [selectedJenisFilter, setSelectedJenisFilter] = useState<string>('all');
    const [selectedTahunFilter, setSelectedTahunFilter] = useState<string>(() => String(new Date().getFullYear()));
    const [selectedBulanFilter, setSelectedBulanFilter] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));
    const [viewTrash, setViewTrash] = useState(false);
    const [trashCount, setTrashCount] = useState(0);
    const [bidangList, setBidangList] = useState<BidangItem[]>([]);
    const [bidangFilterInitialized, setBidangFilterInitialized] = useState(false);
    const [selectedBidangQueryFilter, setSelectedBidangQueryFilter] = useState<string>(() => {
        return user?.bidang_id ? String(user.bidang_id) : 'all';
    });

    useEffect(() => {
        if (user?.bidang_id && !bidangFilterInitialized) {
            setSelectedBidangQueryFilter(String(user.bidang_id));
            setBidangFilterInitialized(true);
        }
    }, [user?.bidang_id, bidangFilterInitialized]);

    const isGlobalOrInstansiUser = useMemo(() => {
        if (!user) return false;
        const roleId = Number(user.tipe_user_id);
        const jab = (user.jabatan_nama || '').toLowerCase();
        return roleId === 1 || roleId === 2 || roleId === 5 || roleId === 7 || roleId === 8 || jab.includes('sekretaris') || jab.includes('kepala badan') || jab.includes('kepala dinas');
    }, [user]);

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    // Ketua Tim Selection States for Approval Workflow
    const [katimList, setKatimList] = useState<any[]>([]);
    const [selectedKatimId, setSelectedKatimId] = useState<number | null>(null);
    const [loadingKatimList, setLoadingKatimList] = useState(false);
    const [showAllKatimBidang, setShowAllKatimBidang] = useState(false);

    const displayedKatimList = useMemo(() => {
        if (showAllKatimBidang || !user?.bidang_id) {
            return katimList;
        }
        const userBidangId = Number(user.bidang_id);
        const filtered = katimList.filter(k => Number(k.bidang_id) === userBidangId);
        return filtered.length > 0 ? filtered : katimList;
    }, [katimList, showAllKatimBidang, user?.bidang_id]);

    useEffect(() => {
        const checkPortal = () => {
            const el = document.getElementById('manajemen-kegiatan-actions');
            if (el) {
                setPortalTarget(el);
                return true;
            }
            return false;
        };

        if (!checkPortal()) {
            const timer = setTimeout(checkPortal, 100);
            return () => clearTimeout(timer);
        }
    }, []);

    // ================= MODAL 1: BUAT DRAFT (Nama, Jenis, Pembuatan Tim) =================
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createNamaKegiatan, setCreateNamaKegiatan] = useState('');
    const [createJenisKegiatanId, setCreateJenisKegiatanId] = useState<number | ''>('');
    const [createTeamNames, setCreateTeamNames] = useState<string[]>(['Tim 1']);
    const [submittingDraft, setSubmittingDraft] = useState(false);

    // ================= MODAL 2: EDIT NAMA / JENIS KEGIATAN =================
    const [isEditDraftModalOpen, setIsEditDraftModalOpen] = useState(false);
    const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
    const [editNamaKegiatan, setEditNamaKegiatan] = useState('');
    const [editJenisKegiatanId, setEditJenisKegiatanId] = useState<number | ''>('');
    const [savingDraftEdit, setSavingDraftEdit] = useState(false);

    // ================= MODAL 3: ATUR JADWAL & PETUGAS TIM =================
    const [isTeamScheduleModalOpen, setIsTeamScheduleModalOpen] = useState(false);
    const [activeDraftForTeam, setActiveDraftForTeam] = useState<DraftItem | null>(null);
    const [activeTeam, setActiveTeam] = useState<DraftTeamItem | null>(null);

    // Team Schedule Form
    const [teamFormNama, setTeamFormNama] = useState('');
    const [teamFormTanggalMulai, setTeamFormTanggalMulai] = useState('');
    const [teamFormTanggalAkhir, setTeamFormTanggalAkhir] = useState('');
    const [teamFormKecamatanIds, setTeamFormKecamatanIds] = useState<string[]>([]);
    const [teamFormLokasiDetail, setTeamFormLokasiDetail] = useState('');
    const [teamFormPetugasIds, setTeamFormPetugasIds] = useState<number[]>([]);
    const [teamFormKeterangan, setTeamFormKeterangan] = useState('');
    const [savingTeamSchedule, setSavingTeamSchedule] = useState(false);
    const [isTeamKecamatanDropdownOpen, setIsTeamKecamatanDropdownOpen] = useState(false);
    const [teamKecamatanSearch, setTeamKecamatanSearch] = useState('');
    const teamKecamatanSearchInputRef = useRef<HTMLInputElement>(null);

    // Officer Filter in Team Modal
    const [showAllPegawai, setShowAllPegawai] = useState(false);
    const [searchOfficer, setSearchOfficer] = useState('');
    const [selectedBidangFilter, setSelectedBidangFilter] = useState<string>('all');
    const [checkingDl, setCheckingDl] = useState(false);
    const [officerDlMap, setOfficerDlMap] = useState<Record<number, { profil_pegawai_id: number; nama_lengkap: string; conflicts: ConflictInfo[] }>>({});

    // Integration States
    const [integratingTeam, setIntegratingTeam] = useState<DraftTeamItem | null>(null);
    const [integratingDraft, setIntegratingDraft] = useState<DraftItem | null>(null);
    const [isIntegratingAction, setIsIntegratingAction] = useState(false);

    // View Mode per Draft (default 'matrix')
    const [draftViewMode, setDraftViewMode] = useState<Record<number, 'matrix' | 'cards'>>({});

    // Opsi 1: Lock-by-default with Controlled Unlock for Published Drafts
    const [unlockedDraftIds, setUnlockedDraftIds] = useState<Record<number, boolean>>({});
    const [unlockModalDraft, setUnlockModalDraft] = useState<DraftItem | null>(null);
    const [unlockReason, setUnlockReason] = useState<string>('');

    // Submit to Katim Confirmation Modal
    const [submitKatimDraft, setSubmitKatimDraft] = useState<DraftItem | null>(null);
    const [submittingToKatim, setSubmittingToKatim] = useState(false);
    const [viewingHistoryDraft, setViewingHistoryDraft] = useState<DraftItem | null>(null);

    // Modal: Tambah Hari / Tanggal Pelaksanaan
    const [isAddDateModalOpen, setIsAddDateModalOpen] = useState(false);
    const [activeDraftForAddDate, setActiveDraftForAddDate] = useState<DraftItem | null>(null);
    const [newScheduleDate, setNewScheduleDate] = useState('');
    const [submittingAddDate, setSubmittingAddDate] = useState(false);

    // Modal: Edit Tanggal Pelaksanaan Baris
    const [isEditDateRowModalOpen, setIsEditDateRowModalOpen] = useState(false);
    const [editingDateRow, setEditingDateRow] = useState<{
        draft: DraftItem;
        oldDateStr: string | null;
        allTeamsInRow: DraftTeamItem[];
    } | null>(null);
    const [newDateValue, setNewDateValue] = useState('');
    const [savingDateRow, setSavingDateRow] = useState(false);

    // Modal: Edit Lokasi (Hanya Kecamatan & Lokasi Detail)
    const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState(false);
    const [editingLocationTeam, setEditingLocationTeam] = useState<{
        draft: DraftItem;
        team: DraftTeamItem;
    } | null>(null);
    const [locationKecamatanIds, setLocationKecamatanIds] = useState<string[]>([]);
    const [locationDetail, setLocationDetail] = useState('');
    const [savingLocation, setSavingLocation] = useState(false);
    const [isKecamatanDropdownOpen, setIsKecamatanDropdownOpen] = useState(false);
    const [kecamatanSearch, setKecamatanSearch] = useState('');
    const kecamatanSearchInputRef = useRef<HTMLInputElement>(null);

    // Modal: Edit Petugas (Hanya Dropdown Petugas Saja)
    const [isEditOfficersModalOpen, setIsEditOfficersModalOpen] = useState(false);
    const [editingOfficersTeam, setEditingOfficersTeam] = useState<{
        draft: DraftItem;
        team: DraftTeamItem;
    } | null>(null);
    const [officerDropdownPetugasIds, setOfficerDropdownPetugasIds] = useState<number[]>([]);
    const [savingOfficersOnly, setSavingOfficersOnly] = useState(false);
    const [officerDropdownSearch, setOfficerDropdownSearch] = useState('');
    const [isOfficerDropdownExpanded, setIsOfficerDropdownExpanded] = useState(true);
    const [officerAvailabilityMap, setOfficerAvailabilityMap] = useState<Record<number, any[]>>({});
    const [loadingOfficerAvailability, setLoadingOfficerAvailability] = useState(false);
    const [copyingOfficerTeamId, setCopyingOfficerTeamId] = useState<number | null>(null);
    const [copyConflictModalData, setCopyConflictModalData] = useState<{
        targetTeamName: string;
        targetDate: string;
        conflictedOfficers: {
            id: number;
            nama_lengkap: string;
            bidang_singkatan?: string;
            activities: { tipe: string; tipe_nama?: string; nama: string; sesi?: string }[];
        }[];
        pulledOfficers: {
            id: number;
            nama_lengkap: string;
            bidang_singkatan?: string;
        }[];
    } | null>(null);

    // ================= MODAL REKAPITULASI JADWAL =================
    const [isRekapModalOpen, setIsRekapModalOpen] = useState(false);
    const [rekapActiveTab, setRekapActiveTab] = useState<'per_orang' | 'per_kegiatan'>('per_orang');
    const [rekapBulan, setRekapBulan] = useState<number>(() => new Date().getMonth() + 1);
    const [rekapTahun, setRekapTahun] = useState<number>(() => new Date().getFullYear());
    const [rekapStatusFilter, setRekapStatusFilter] = useState<'all' | 'has_activity' | 'no_activity'>('all');
    const [rekapBidangFilter, setRekapBidangFilter] = useState<string>('all');
    const [rekapSearch, setRekapSearch] = useState<string>('');
    const [rekapLoading, setRekapLoading] = useState(false);
    const [rekapMonthlyPegawai, setRekapMonthlyPegawai] = useState<any[]>([]);
    const [rekapOfficialActivities, setRekapOfficialActivities] = useState<any[]>([]);

    // Expandable cards
    const [expandedDraftIds, setExpandedDraftIds] = useState<Record<number, boolean>>({});

    // ================= MODAL IMPOR DRAFT JADWAL DARI EXCEL =================
    const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false);
    const [importExcelFile, setImportExcelFile] = useState<File | null>(null);
    const [importExcelFileName, setImportExcelFileName] = useState('');
    const [importExcelLoading, setImportExcelLoading] = useState(false);
    const [importExcelPreview, setImportExcelPreview] = useState<{
        drafts: {
            nama_kegiatan: string;
            jenis_kegiatan_id: number;
            jenis_kegiatan_nama: string;
            teams: {
                nama_tim: string;
                tanggal_mulai: string | null;
                tanggal_akhir: string | null;
                kecamatan_id: string | null;
                kecamatan_nama: string;
                lokasi_detail: string | null;
                petugas_ids: number[];
                officer_names: string[];
                unresolved_officers: string[];
                keterangan: string | null;
            }[];
        }[];
        totalRows: number;
        warningCount: number;
    } | null>(null);
    const [importExcelError, setImportExcelError] = useState<string | null>(null);
    const [savingImportExcel, setSavingImportExcel] = useState(false);
    const importExcelFileInputRef = useRef<HTMLInputElement>(null);

    // Toast
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showToast = (type: 'success' | 'error', text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 4500);
    };

    // Load initial reference data
    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        loadDrafts(false, viewTrash, selectedBidangQueryFilter);
    }, [viewTrash, selectedBidangQueryFilter]);

    const loadReferenceData = async () => {
        try {
            // 1. Master Jenis Kegiatan (Lengkap: DL, DLB, RM off, RM ol, RLB off, RLB ol; Hilangkan Cuti & Sakit)
            const resTipe = await api.tipeKegiatan.getAll();
            const rawList: TipeKegiatanItem[] = resTipe.raw || (Array.isArray(resTipe.data) ? resTipe.data : (Array.isArray(resTipe) ? resTipe : []));
            
            // Filter: Hilangkan Sakit dan Cuti, serta entri duplikat tidak valid
            const validTypes = rawList.filter(t => {
                const name = (t.nama || '').toLowerCase().trim();
                const code = (t.kode || '').toLowerCase().trim();
                if (name === 'cuti' || name === 'sakit' || code === 'c' || code === 's') return false;
                if (t.id === 11) return false; // duplikat 'Offline'
                return true;
            });
            setTipeKegiatanList(validTypes);

            // 2. Kecamatan
            try {
                const resKec = await api.draftJadwal.getKecamatan();
                if (resKec && resKec.data && resKec.data.length > 0) {
                    setKecamatanList(resKec.data);
                    if (resKec.kabupaten) setKabupatenInfo(resKec.kabupaten);
                }
            } catch (err) {
                console.warn('Fallback to local bogor kecamatan', err);
            }

            // 3. Pegawai
            const resPegawai = await api.profilPegawai.getAll();
            if (resPegawai && (resPegawai.data || Array.isArray(resPegawai))) {
                setPegawaiList(resPegawai.data || resPegawai);
            }

            // 4. Master Bidang Instansi
            try {
                const resBidang = await api.bidangInstansi.getAll();
                const bList = resBidang?.data || (Array.isArray(resBidang) ? resBidang : []);
                setBidangList(bList);
            } catch (err) {
                console.warn('Fallback loading bidang instansi', err);
            }
        } catch (err: any) {
            console.error('Error loading reference data:', err);
        }
    };

    const loadDrafts = async (silent = false, isTrash = viewTrash, bidangId = selectedBidangQueryFilter) => {
        if (!silent) setLoading(true);
        try {
            const queryParams: any = { is_trash: isTrash ? 1 : 0 };
            if (bidangId && bidangId !== 'all') {
                queryParams.bidang_id = bidangId;
            }
            const res = await api.draftJadwal.getAll(queryParams);
            if (res && res.data) {
                setDrafts(res.data);
                if (res.trash_count !== undefined) {
                    setTrashCount(res.trash_count);
                }
                // Synchronously resolve active draft from URL in the same batch to prevent paint flash
                if (typeof window !== 'undefined') {
                    const params = new URLSearchParams(window.location.search);
                    const draftIdParam = params.get('draft_id');
                    if (draftIdParam) {
                        const found = res.data.find((d: DraftItem) => String(d.id) === draftIdParam);
                        if (found) {
                            setSelectedDraftDetail(found);
                            onSelectDraftDetail?.(found);
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Error loading drafts:', err);
            showToast('error', 'Gagal memuat daftar draft jadwal: ' + err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Sync active draft detail with live drafts array
    const currentActiveDraft = useMemo(() => {
        if (!selectedDraftDetail) return null;
        return drafts.find(d => d.id === selectedDraftDetail.id) || selectedDraftDetail;
    }, [drafts, selectedDraftDetail]);

    // Sync with external activeDraftDetail prop if provided
    useEffect(() => {
        if (activeDraftDetail !== undefined) {
            setSelectedDraftDetail(activeDraftDetail);
        }
    }, [activeDraftDetail]);

    // Handle close trigger from parent tab bar
    useEffect(() => {
        if (closeDetailTrigger) {
            setSelectedDraftDetail(null);
            setIsFullScreenView(false);
        }
    }, [closeDetailTrigger]);

    // Read draft_id and fullscreen from URL or sessionStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        let draftIdParam = params.get('draft_id');
        const sessionDraftId = sessionStorage.getItem('draft_auto_open_id');
        if (!draftIdParam && sessionDraftId) {
            draftIdParam = sessionDraftId;
            sessionStorage.removeItem('draft_auto_open_id');
        }
        const fsParam = params.get('fullscreen') === 'true' || params.get('fullscreen') === '1' || !!sessionDraftId;
        if (draftIdParam && drafts.length > 0) {
            const found = drafts.find(d => String(d.id) === draftIdParam);
            if (found) {
                setSelectedDraftDetail(found);
                onSelectDraftDetail?.(found);
                if (fsParam) setIsFullScreenView(true);
            }
        }
    }, [drafts]);

    // Listen to beforeunload if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Listen to Escape key to prompt or exit
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isFullScreenView) {
                    handleBackButtonClick();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreenView, hasUnsavedChanges]);

    const handleOpenDraftDetail = (draft: DraftItem) => {
        setSelectedDraftDetail(draft);
        setHasUnsavedChanges(false);
        onSelectDraftDetail?.(draft);
    };

    const handleCloseDraftDetail = () => {
        setSelectedDraftDetail(null);
        setIsFullScreenView(false);
        setHasUnsavedChanges(false);
        onSelectDraftDetail?.(null);
        try {
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('fullscreen');
                url.searchParams.delete('draft_id');
                window.history.replaceState({}, '', url);
                window.dispatchEvent(new CustomEvent('samp-exit-fullscreen-draft'));
            }
        } catch (e) {
            console.warn('Failed to clean fullscreen url params', e);
        }
    };

    const closeTabOrWorkspace = () => {
        try {
            window.close();
        } catch (e) {
            console.warn('window.close() prevented:', e);
        }
        handleCloseDraftDetail();
    };

    const handleBackButtonClick = () => {
        if (hasUnsavedChanges) {
            setIsUnsavedChangesModalOpen(true);
        } else {
            closeTabOrWorkspace();
        }
    };

    const handleDiscardAndClose = () => {
        setIsUnsavedChangesModalOpen(false);
        setHasUnsavedChanges(false);
        closeTabOrWorkspace();
    };

    const handleSaveAndClose = async () => {
        setIsUnsavedChangesModalOpen(false);
        await handleSaveDraftSchedule();
        setHasUnsavedChanges(false);
        closeTabOrWorkspace();
    };

    const handleOpenInNewBrowserTab = (draftId: number) => {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('page', 'draft-jadwal');
        url.searchParams.set('tab', 'draft');
        url.searchParams.set('draft_id', String(draftId));
        url.searchParams.set('fullscreen', 'true');
        window.open(url.toString(), '_blank');
    };

    const handleSaveDraftSchedule = async () => {
        setSavingDraftSchedule(true);
        try {
            await loadDrafts(true);
            setHasUnsavedChanges(false);
            showToast('success', `Draft jadwal "${currentActiveDraft?.nama_kegiatan || 'kegiatan'}" berhasil disimpan!`);
        } catch (err: any) {
            showToast('error', 'Gagal menyimpan draft: ' + err.message);
        } finally {
            setSavingDraftSchedule(false);
        }
    };

    // Fungsi Cetak Jadwal Kegiatan (Printable HTML Window)
    const handlePrintDraft = (draft: DraftItem) => {
        const printWindow = window.open('', '_blank', 'width=950,height=750');
        if (!printWindow) {
            showToast('error', 'Gagal membuka jendela cetak. Pastikan izin pop-up browser aktif.');
            return;
        }

        const teamNames = Array.from(new Set(draft.teams.map(t => t.nama_tim || 'Tim 1'))).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );
        if (teamNames.length === 0) teamNames.push('Tim 1');

        // Group teams by date
        const dateMap: Record<string, DraftTeamItem[]> = {};
        const noDateTeams: DraftTeamItem[] = [];

        draft.teams.forEach(t => {
            if (t.tanggal_mulai) {
                if (!dateMap[t.tanggal_mulai]) dateMap[t.tanggal_mulai] = [];
                dateMap[t.tanggal_mulai].push(t);
            } else {
                noDateTeams.push(t);
            }
        });

        const rows: Array<{
            dateStr: string | null;
            formattedDate: string;
            teamsByCol: Record<string, DraftTeamItem>;
        }> = [];

        Object.keys(dateMap).sort().forEach(d => {
            const teamsByCol: Record<string, DraftTeamItem> = {};
            dateMap[d].forEach(item => {
                teamsByCol[item.nama_tim] = item;
            });
            rows.push({
                dateStr: d,
                formattedDate: formatTanggalIndo(d),
                teamsByCol
            });
        });

        if (noDateTeams.length > 0) {
            const teamsByCol: Record<string, DraftTeamItem> = {};
            noDateTeams.forEach(item => {
                teamsByCol[item.nama_tim] = item;
            });
            rows.push({
                dateStr: null,
                formattedDate: 'Belum Ditentukan Tanggal',
                teamsByCol
            });
        }

        const todayIndo = formatTanggalIndo(new Date().toISOString().split('T')[0]);

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Jadwal Kegiatan - ${draft.nama_kegiatan}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111827; margin: 15mm 12mm; line-height: 1.35; }
        .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
        .kop h2 { margin: 0; font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
        .kop h3 { margin: 2px 0 0 0; font-size: 10.5pt; font-weight: normal; }
        .title { text-align: center; margin: 12px 0 16px 0; }
        .title h1 { margin: 0; font-size: 13pt; font-weight: 800; text-transform: uppercase; }
        .title p { margin: 3px 0 0 0; font-size: 9.5pt; color: #4b5563; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
        th, td { border: 1px solid #374151; padding: 5px 6px; vertical-align: top; }
        th { background-color: #f3f4f6; text-align: center; font-weight: 700; text-transform: uppercase; font-size: 8.5pt; }
        .no-col { width: 30px; text-align: center; }
        .date-col { width: 120px; font-weight: 600; }
        .officers-list { margin: 0; padding-left: 14px; }
        .officers-list li { margin-bottom: 1px; }
        .location-info { font-weight: 600; margin-bottom: 2px; color: #1f2937; }
        .sub-loc { font-weight: normal; font-size: 8.5pt; color: #4b5563; }
        .ttd-container { margin-top: 30px; float: right; width: 230px; text-align: center; font-size: 9.5pt; page-break-inside: avoid; }
        .ttd-space { height: 50px; }
        @media print {
            body { margin: 8mm 8mm; }
            @page { size: landscape; margin: 8mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="kop">
        <h2>PEMERINTAH DAERAH KABUPATEN BOGOR</h2>
        <h3>${user?.instansi_nama || 'BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH'}</h3>
    </div>

    <div class="title">
        <h1>JADWAL PENUGASAN KEGIATAN</h1>
        <p>${draft.nama_kegiatan} &bull; ${draft.jenis_kegiatan_nama || 'Dinas Luar'}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th rowspan="2" class="no-col">No</th>
                <th rowspan="2" class="date-col">Hari / Tanggal</th>
                ${teamNames.map(tName => `<th colspan="2">${tName}</th>`).join('')}
            </tr>
            <tr>
                ${teamNames.map(() => `<th>Lokasi</th><th>Petugas</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.length === 0 ? `<tr><td colspan="${2 + teamNames.length * 2}" style="text-align:center; padding: 20px;">Belum ada jadwal yang diatur</td></tr>` : 
            rows.map((row, idx) => `
                <tr>
                    <td class="no-col">${idx + 1}</td>
                    <td class="date-col">${row.formattedDate}</td>
                    ${teamNames.map(tName => {
                        const tItem = row.teamsByCol[tName];
                        if (!tItem) return `<td>-</td><td>-</td>`;
                        const locText = tItem.kecamatan_nama ? `Kec. ${tItem.kecamatan_nama}` : (tItem.lokasi_detail || '-');
                        const detailLoc = tItem.kecamatan_nama && tItem.lokasi_detail ? `<div class="sub-loc">${tItem.lokasi_detail}</div>` : '';
                        const officersHtml = tItem.officers && tItem.officers.length > 0
                            ? `<ul class="officers-list">${tItem.officers.map(o => `<li>${o.nama_lengkap}</li>`).join('')}</ul>`
                            : '<em>Belum ditugaskan</em>';
                        return `
                            <td><div class="location-info">${locText}</div>${detailLoc}</td>
                            <td>${officersHtml}</td>
                        `;
                    }).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="ttd-container">
        <div>Cibinong, ${todayIndo}</div>
        <div style="font-weight: 600; margin-top: 4px;">Penanggung Jawab Kegiatan,</div>
        <div class="ttd-space"></div>
        <div style="font-weight: bold; text-decoration: underline;">${draft.pembuat_nama || user?.nama_lengkap || 'Sammy Lugina, S.E., M. Tr. A.P.'}</div>
        <div style="font-size: 8.5pt; color: #4b5563;">NIP. ${user?.nip || '-'}</div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // Struktur hierarki/grup jenis kegiatan yang lengkap: DL, RM (RM off & RM ol), RLB (RLB off & RLB ol)
    const groupedTipeKegiatan = useMemo(() => {
        const groups: { label: string; items: TipeKegiatanItem[] }[] = [
            {
                label: 'Dinas Luar (DL)',
                items: tipeKegiatanList.filter(t => {
                    const code = (t.kode || '').toUpperCase();
                    return code === 'DL' || code === 'DLB' || t.nama.toLowerCase().includes('dinas luar');
                })
            },
            {
                label: 'Rapat Mamin (RM)',
                items: tipeKegiatanList.filter(t => {
                    const code = (t.kode || '').toUpperCase();
                    return code.startsWith('RM') || t.parent_id === 5;
                })
            },
            {
                label: 'Rapat Luar Bidang (RLB)',
                items: tipeKegiatanList.filter(t => {
                    const code = (t.kode || '').toUpperCase();
                    return code.startsWith('RLB') || t.parent_id === 6;
                })
            }
        ];

        const knownIds = new Set(groups.flatMap(g => g.items.map(i => i.id)));
        const others = tipeKegiatanList.filter(t => !knownIds.has(t.id));
        if (others.length > 0) {
            groups.push({ label: 'Jenis Lainnya', items: others });
        }

        return groups.filter(g => g.items.length > 0);
    }, [tipeKegiatanList]);

    // ================= HANDLERS: MODAL 1 (BUAT DRAFT) =================
    const handleOpenCreateModal = () => {
        setCreateNamaKegiatan('');
        const defaultJenis = tipeKegiatanList.length > 0 ? tipeKegiatanList[0].id : '';
        setCreateJenisKegiatanId(defaultJenis);
        setCreateTeamNames(['Tim 1']);
        setIsCreateModalOpen(true);
    };

    const handleAddTeamInput = () => {
        setCreateTeamNames(prev => [...prev, `Tim ${prev.length + 1}`]);
    };

    const handleRemoveTeamInput = (index: number) => {
        if (createTeamNames.length <= 1) return;
        setCreateTeamNames(prev => prev.filter((_, i) => i !== index));
    };

    const handleTeamNameChange = (index: number, val: string) => {
        setCreateTeamNames(prev => {
            const updated = [...prev];
            updated[index] = val;
            return updated;
        });
    };

    const handleSubmitCreateDraft = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createNamaKegiatan.trim()) {
            showToast('error', 'Nama kegiatan wajib diisi');
            return;
        }
        if (!createJenisKegiatanId) {
            showToast('error', 'Jenis kegiatan wajib dipilih');
            return;
        }

        const validTeams = createTeamNames.map(t => t.trim()).filter(Boolean);
        if (validTeams.length === 0) {
            showToast('error', 'Minimal harus ada 1 tim');
            return;
        }

        setSubmittingDraft(true);
        try {
            const res = await api.draftJadwal.create({
                nama_kegiatan: createNamaKegiatan.trim(),
                jenis_kegiatan_id: Number(createJenisKegiatanId),
                teams: validTeams
            });

            if (res && res.success) {
                showToast('success', `Draft "${createNamaKegiatan}" berhasil dibuat dengan ${validTeams.length} tim! Silakan atur jadwal dan petugas masing-masing tim.`);
                setIsCreateModalOpen(false);
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal membuat draft');
            }
        } catch (err: any) {
            console.error('Error creating draft:', err);
            showToast('error', err.message || 'Gagal membuat draft');
        } finally {
            setSubmittingDraft(false);
        }
    };

    // ================= HANDLERS: MODAL 2 (EDIT INFO DRAFT) =================
    const handleOpenEditDraft = (draft: DraftItem) => {
        setEditingDraftId(draft.id);
        setEditNamaKegiatan(draft.nama_kegiatan);
        setEditJenisKegiatanId(draft.jenis_kegiatan_id);
        setIsEditDraftModalOpen(true);
    };

    const handleSaveDraftEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDraftId) return;

        setSavingDraftEdit(true);
        try {
            const res = await api.draftJadwal.update(editingDraftId, {
                nama_kegiatan: editNamaKegiatan.trim(),
                jenis_kegiatan_id: Number(editJenisKegiatanId)
            });

            if (res && res.success) {
                showToast('success', 'Informasi kegiatan berhasil diperbarui');
                setIsEditDraftModalOpen(false);
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal memperbarui draft');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal memperbarui draft');
        } finally {
            setSavingDraftEdit(false);
        }
    };

    const handleDeleteDraft = async (draftId: number) => {
        if (!window.confirm('Apakah Anda yakin ingin memindahkan draft kegiatan ini ke tempat sampah?')) {
            return;
        }

        try {
            const res = await api.draftJadwal.delete(draftId);
            if (res && res.success) {
                showToast('success', 'Draft kegiatan berhasil dipindahkan ke tempat sampah');
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal menghapus draft');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menghapus draft');
        }
    };

    const handleRestoreDraft = async (draftId: number) => {
        if (!window.confirm('Pulihkan draft kegiatan ini ke daftar aktif?')) {
            return;
        }

        try {
            const res = await api.draftJadwal.restore(draftId);
            if (res && res.success) {
                showToast('success', 'Draft kegiatan berhasil dipulihkan');
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal memulihkan draft');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal memulihkan draft');
        }
    };

    const handlePermanentDeleteDraft = async (draftId: number) => {
        if (!window.confirm('PERINGATAN: Draft kegiatan dan seluruh riwayatnya akan dihapus secara PERMANEN dari database dan tidak dapat dipulihkan lagi. Lanjutkan?')) {
            return;
        }

        try {
            const res = await api.draftJadwal.permanentDelete(draftId);
            if (res && res.success) {
                showToast('success', 'Draft kegiatan berhasil dihapus permanen');
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal menghapus draft secara permanen');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menghapus draft secara permanen');
        }
    };

    // ================= HANDLERS: ADD / DELETE TEAM IN EXISTING DRAFT =================
    const handleAddTeamToDraft = async (draft: DraftItem) => {
        const nextNum = draft.teams.length + 1;
        const defaultName = `Tim ${nextNum}`;
        const inputName = window.prompt(`Masukkan nama tim baru:`, defaultName);
        if (!inputName || !inputName.trim()) return;

        try {
            const res = await api.draftJadwal.addTeam(draft.id, { nama_tim: inputName.trim() });
            if (res && res.success) {
                showToast('success', `Tim "${inputName}" berhasil ditambahkan ke draft.`);
                setHasUnsavedChanges(true);
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal menambahkan tim');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menambahkan tim');
        }
    };

    const handleDeleteTeam = async (team: DraftTeamItem) => {
        if (!window.confirm(`Hapus ${team.nama_tim} dari draft ini?`)) return;

        try {
            const res = await api.draftJadwal.deleteTeam(team.id);
            if (res && res.success) {
                showToast('success', `${team.nama_tim} berhasil dihapus`);
                setHasUnsavedChanges(true);
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal menghapus tim');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menghapus tim');
        }
    };

    // ================= HANDLERS: MODAL 3 (ATUR JADWAL & PETUGAS TIM) =================
    const handleOpenTeamScheduleModal = (draft: DraftItem, team: DraftTeamItem) => {
        setActiveDraftForTeam(draft);
        setActiveTeam(team);

        setTeamFormNama(team.nama_tim);
        setTeamFormTanggalMulai(team.tanggal_mulai || '');
        setTeamFormTanggalAkhir(team.tanggal_akhir || team.tanggal_mulai || '');
        const rawKecIds = team.kecamatan_id 
            ? String(team.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean)
            : [];
        setTeamFormKecamatanIds(rawKecIds);
        setTeamKecamatanSearch('');
        setIsTeamKecamatanDropdownOpen(false);
        setTeamFormLokasiDetail(team.lokasi_detail || '');
        setTeamFormKeterangan(team.keterangan || '');

        // Set initial selected officers
        const pIds = team.petugas_ids ? team.petugas_ids.split(',').map(Number).filter(Boolean) : [];
        setTeamFormPetugasIds(pIds);

        // Reset filter
        setShowAllPegawai(false);
        setSearchOfficer('');
        setSelectedBidangFilter('all');
        setOfficerDlMap({});

        setIsTeamScheduleModalOpen(true);
    };

    // Check DL availability whenever dates change in the team modal
    useEffect(() => {
        if (!isTeamScheduleModalOpen || !teamFormTanggalMulai) {
            setOfficerDlMap({});
            return;
        }

        const checkAvailability = async () => {
            setCheckingDl(true);
            try {
                const res = await api.draftJadwal.checkAvailability(
                    teamFormTanggalMulai,
                    teamFormTanggalAkhir || teamFormTanggalMulai,
                    activeTeam?.kegiatan_manajemen_id || undefined
                );
                if (res && res.data) {
                    setOfficerDlMap(res.data);
                }
                await fetchOfficerAvailabilityForDate(teamFormTanggalMulai, activeTeam?.id);
            } catch (err) {
                console.error('Error checking DL availability:', err);
            } finally {
                setCheckingDl(false);
            }
        };

        const timer = setTimeout(checkAvailability, 300);
        return () => clearTimeout(timer);
    }, [teamFormTanggalMulai, teamFormTanggalAkhir, isTeamScheduleModalOpen]);

    // Check if the edited date range overlaps with any other schedule of this team in this draft
    const teamScheduleDateConflict = useMemo(() => {
        if (!activeDraftForTeam || !activeTeam || !teamFormTanggalMulai) return null;
        const start = teamFormTanggalMulai;
        const end = teamFormTanggalAkhir || start;
        const tName = (teamFormNama || activeTeam.nama_tim || '').trim().toLowerCase();

        const clashingTeam = activeDraftForTeam.teams.find(t => {
            if (t.id === activeTeam.id) return false;
            if ((t.nama_tim || '').trim().toLowerCase() !== tName) return false;
            if (!t.tanggal_mulai) return false;
            const exStart = t.tanggal_mulai;
            const exEnd = t.tanggal_akhir || exStart;
            return (start <= exEnd && end >= exStart);
        });

        if (!clashingTeam) return null;

        const exStart = clashingTeam.tanggal_mulai!;
        const exEnd = clashingTeam.tanggal_akhir || exStart;
        const exStr = exStart === exEnd ? formatTanggalIndo(exStart) : `${formatTanggalIndo(exStart)} s.d. ${formatTanggalIndo(exEnd)}`;
        const targetStr = start === end ? formatTanggalIndo(start) : `${formatTanggalIndo(start)} s.d. ${formatTanggalIndo(end)}`;
        return {
            clashingTeam,
            exStr,
            targetStr
        };
    }, [activeDraftForTeam, activeTeam, teamFormTanggalMulai, teamFormTanggalAkhir, teamFormNama]);

    // Available bidangs from loaded officer list
    const availableBidangs = useMemo(() => {
        const set = new Set<string>();
        pegawaiList.forEach(p => {
            const bName = p.nama_bidang || p.bidang_nama;
            if (bName) set.add(bName);
        });
        return Array.from(set);
    }, [pegawaiList]);

    // Officer filtering: DEFAULT to user's bidang only, with "Semua Pegawai" toggle
    const filteredPegawaiInModal = useMemo(() => {
        if (!pegawaiList) return [];

        let list = pegawaiList;
        const userBidangId = Number(user?.bidang_id);

        // If NOT showAllPegawai and user has a valid bidang_id, restrict to user's bidang!
        if (!showAllPegawai && userBidangId) {
            list = pegawaiList.filter(p => Number(p.bidang_id) === userBidangId);
        }

        // Keep any already selected officers visible so they don't disappear if user unchecks showAllPegawai
        if (teamFormPetugasIds.length > 0) {
            const selectedIds = new Set(teamFormPetugasIds.map(Number));
            const existingIds = new Set(list.map(p => Number(p.id)));
            const missingSelected = pegawaiList.filter(p => selectedIds.has(Number(p.id)) && !existingIds.has(Number(p.id)));
            list = [...list, ...missingSelected];
        }

        // Search officer filter
        if (searchOfficer.trim()) {
            const q = searchOfficer.toLowerCase().trim();
            list = list.filter(p => 
                (p.nama_lengkap || '').toLowerCase().includes(q) ||
                (p.nip && p.nip.includes(q))
            );
        }

        // Selected specific bidang filter
        if (selectedBidangFilter !== 'all') {
            list = list.filter(p => (p.nama_bidang || p.bidang_nama) === selectedBidangFilter);
        }

        return list;
    }, [pegawaiList, showAllPegawai, user?.bidang_id, teamFormPetugasIds, searchOfficer, selectedBidangFilter]);

    // Toggle Officer Selection
    const toggleOfficer = (id: number) => {
        setTeamFormPetugasIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Select all non-conflicted visible officers
    const handleSelectAllFiltered = () => {
        const availableInView = filteredPegawaiInModal
            .filter(p => !officerDlMap[p.id])
            .map(p => p.id);

        setTeamFormPetugasIds(prev => {
            const combined = new Set([...prev, ...availableInView]);
            return Array.from(combined);
        });
    };

    // Deselect all visible officers
    const handleDeselectAllFiltered = () => {
        const idsInView = new Set(filteredPegawaiInModal.map(p => p.id));
        setTeamFormPetugasIds(prev => prev.filter(id => !idsInView.has(id)));
    };

    // Save Team Schedule & Officers
    const handleSaveTeamSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTeam) return;

        if (!teamFormNama.trim()) {
            showToast('error', 'Nama tim wajib diisi');
            return;
        }

        // Check if any selected officer has a DL conflict
        const conflictedSelected = teamFormPetugasIds.filter(id => officerDlMap[id]);
        if (conflictedSelected.length > 0) {
            const names = conflictedSelected.map(id => officerDlMap[id]?.nama_lengkap || `ID ${id}`).join(', ');
            showToast('error', `Petugas (${names}) memiliki bentrok kegiatan Dinas Luar pada tanggal yang dipilih! Hapus dari pilihan sebelum menyimpan.`);
            return;
        }

        // Check date overlap with another schedule of this team
        if (teamScheduleDateConflict) {
            showToast('error', `Rentang tanggal (${teamScheduleDateConflict.targetStr}) menimpa jadwal lain untuk tim ini yang sudah terdaftar pada tanggal (${teamScheduleDateConflict.exStr}). Mohon periksa kembali.`);
            return;
        }

        setSavingTeamSchedule(true);
        try {
            const res = await api.draftJadwal.updateTeam(activeTeam.id, {
                nama_tim: teamFormNama.trim(),
                tanggal_mulai: teamFormTanggalMulai || null,
                tanggal_akhir: teamFormTanggalAkhir || teamFormTanggalMulai || null,
                kecamatan_id: teamFormKecamatanIds.join(',') || null,
                lokasi_detail: teamFormLokasiDetail ? teamFormLokasiDetail.trim() : null,
                petugas_ids: teamFormPetugasIds,
                keterangan: teamFormKeterangan ? teamFormKeterangan.trim() : null
            });

            if (res && res.success) {
                showToast('success', `Jadwal & penugasan untuk "${teamFormNama}" berhasil disimpan!`);
                setIsTeamScheduleModalOpen(false);
                setHasUnsavedChanges(true);
                await loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal menyimpan pengaturan tim');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menyimpan jadwal tim');
        } finally {
            setSavingTeamSchedule(false);
        }
    };

    // ================= INTEGRATION ACTIONS =================
    // 1. Integrate Single Team
    const handleIntegrateTeam = async (team: DraftTeamItem) => {
        if (!team.tanggal_mulai) {
            showToast('error', 'Tanggal tim belum diatur. Klik "Atur Jadwal & Petugas" terlebih dahulu.');
            return;
        }
        if (!team.kecamatan_id) {
            showToast('error', 'Kecamatan tujuan tim belum dipilih. Klik "Atur Jadwal & Petugas" terlebih dahulu.');
            return;
        }
        if (!team.petugas_ids) {
            showToast('error', 'Tim belum memiliki pegawai yang ditugaskan. Klik "Atur Jadwal & Petugas" terlebih dahulu.');
            return;
        }

        setIntegratingTeam(team);
    };

    const confirmIntegrateTeam = async () => {
        if (!integratingTeam) return;

        setIsIntegratingAction(true);
        try {
            const res = await api.draftJadwal.integrateTeam(integratingTeam.id);
            if (res && res.success) {
                showToast('success', res.message || `${integratingTeam.nama_tim} berhasil diintegrasikan ke kegiatan resmi dan logbook pegawai!`);
                setIntegratingTeam(null);
                await loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal mengintegrasikan tim');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal integrasi tim');
        } finally {
            setIsIntegratingAction(false);
        }
    };

    // 2. Integrate All Ready Teams in Draft
    const handleIntegrateDraft = async (draft: DraftItem) => {
        if (draft.ready_teams === 0) {
            showToast('error', 'Tidak ada tim yang siap diintegrasikan. Pastikan tanggal, lokasi, dan petugas setiap tim sudah lengkap.');
            return;
        }
        setIntegratingDraft(draft);
    };

    const confirmIntegrateDraft = async () => {
        if (!integratingDraft) return;

        setIsIntegratingAction(true);
        try {
            const res = await api.draftJadwal.integrate(integratingDraft.id);
            if (res && res.success) {
                showToast('success', res.message || 'Seluruh tim siap berhasil diintegrasikan ke kegiatan resmi dan logbook pegawai!');
                setIntegratingDraft(null);
                await loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal integrasi draft');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal integrasi draft');
        } finally {
            setIsIntegratingAction(false);
        }
    };

    // ================= TABLE MATRIX & KATIM SUBMISSION HANDLERS =================
    // 1. Open submit to Katim modal
    const handleOpenSubmitKatimModal = async (draft: DraftItem) => {
        setSubmitKatimDraft(draft);
        setShowAllKatimBidang(false);
        let list = katimList;
        if (list.length === 0) {
            setLoadingKatimList(true);
            try {
                const res = await api.draftJadwal.getKatimList();
                if (res && res.success && Array.isArray(res.data)) {
                    list = res.data;
                    setKatimList(res.data);
                }
            } catch (err) {
                console.error('Failed to load Katim list:', err);
            } finally {
                setLoadingKatimList(false);
            }
        }

        const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;
        const availableInBidang = (userBidangId && list.length > 0)
            ? list.filter((k: any) => Number(k.bidang_id) === userBidangId)
            : list;
        const targetList = availableInBidang.length > 0 ? availableInBidang : list;

        const draftKatimId = draft.ketua_tim_id ? Number(draft.ketua_tim_id) : null;
        const foundInTarget = draftKatimId && targetList.some((k: any) => Number(k.id || k.user_id) === draftKatimId);

        if (foundInTarget) {
            setSelectedKatimId(draftKatimId);
        } else if (targetList.length > 0) {
            setSelectedKatimId(Number(targetList[0].id || targetList[0].user_id));
        } else {
            setSelectedKatimId(null);
        }
    };

    const handleToggleShowAllKatim = (checked: boolean) => {
        setShowAllKatimBidang(checked);
        const userBidangId = user?.bidang_id ? Number(user.bidang_id) : null;
        const nextList = (!checked && userBidangId)
            ? katimList.filter((k: any) => Number(k.bidang_id) === userBidangId)
            : katimList;
        const targetList = nextList.length > 0 ? nextList : katimList;
        if (targetList.length > 0) {
            const stillPresent = targetList.some((k: any) => Number(k.id || k.user_id) === Number(selectedKatimId));
            if (!stillPresent) {
                setSelectedKatimId(Number(targetList[0].id || targetList[0].user_id));
            }
        }
    };

    // 2. Submit whole draft to Katim for Approval
    const handleConfirmSubmitKatim = async () => {
        if (!submitKatimDraft) return;

        if (submitKatimDraft.ready_teams === 0) {
            showToast('error', 'Belum ada tim yang siap diajukan. Pastikan tanggal, lokasi, dan petugas setiap tim sudah lengkap.');
            return;
        }

        setSubmittingToKatim(true);
        try {
            const res = await api.draftJadwal.submitApproval(submitKatimDraft.id, {
                ketua_tim_id: selectedKatimId || undefined
            });
            if (res && res.success) {
                showToast('success', res.message || 'Jadwal kegiatan berhasil diajukan ke Ketua Tim untuk persetujuan!');
                setSubmitKatimDraft(null);
                await loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal mengajukan jadwal ke Ketua Tim');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal mengajukan ke Ketua Tim');
        } finally {
            setSubmittingToKatim(false);
        }
    };

    // ================= HANDLERS: OPSI 1 (LOCK-BY-DEFAULT & UNLOCK UNTUK JADWAL TERBIT) =================
    const handleConfirmUnlockDraft = () => {
        if (!unlockModalDraft) return;

        if (!checkUserCanUnlockDraft(unlockModalDraft, user)) {
            showToast('error', 'Akses ditolak: Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat membuka proteksi pengeditan.');
            setUnlockModalDraft(null);
            setUnlockReason('');
            return;
        }

        const dId = unlockModalDraft.id;
        setUnlockedDraftIds(prev => ({ ...prev, [dId]: true }));
        setUnlockModalDraft(null);
        setUnlockReason('');
        showToast('success', 'Mode pengeditan diaktifkan. Anda sekarang dapat menyesuaikan jadwal dan petugas.');
    };

    const handleRelockDraft = (draftId: number) => {
        setUnlockedDraftIds(prev => ({ ...prev, [draftId]: false }));
        showToast('success', 'Jadwal berhasil dikunci kembali.');
    };

    // 2. Add New Date Row to Draft
    const handleOpenAddDateModal = (draft: DraftItem) => {
        setActiveDraftForAddDate(draft);
        setNewScheduleDate('');
        setIsAddDateModalOpen(true);
    };

    const handleAddDateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDraftForAddDate || !newScheduleDate) {
            showToast('error', 'Tanggal pelaksanaan wajib diisi');
            return;
        }

        // Check if date already exists in draft
        const isDateAlreadyExists = activeDraftForAddDate.teams.some(t => t.tanggal_mulai === newScheduleDate);
        if (isDateAlreadyExists) {
            showToast('error', `Tanggal ${formatTanggalIndo(newScheduleDate)} sudah terdaftar pada jadwal kegiatan ini. Tidak dapat menambahkan tanggal yang sama dua kali.`);
            return;
        }

        const teamNames = Array.from(new Set(activeDraftForAddDate.teams.map(t => t.nama_tim || 'Tim 1'))).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
        );
        if (teamNames.length === 0) teamNames.push('Tim 1');

        setSubmittingAddDate(true);
        try {
            for (const tName of teamNames) {
                await api.draftJadwal.addTeam(activeDraftForAddDate.id, {
                    nama_tim: tName,
                    tanggal_mulai: newScheduleDate,
                    tanggal_akhir: newScheduleDate
                });
            }
            showToast('success', `Tanggal ${formatTanggalIndo(newScheduleDate)} berhasil ditambahkan untuk ${teamNames.length} tim! Silakan atur lokasi dan petugas.`);
            setIsAddDateModalOpen(false);
            setNewScheduleDate('');
            setActiveDraftForAddDate(null);
            setHasUnsavedChanges(true);
            await loadDrafts(true);
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menambahkan tanggal kegiatan');
        } finally {
            setSubmittingAddDate(false);
        }
    };

    // 3. Delete Date Row from Draft
    const handleDeleteDateRow = async (draft: DraftItem, row: { formattedDate: string; allTeamsInRow: DraftTeamItem[] }) => {
        if (row.allTeamsInRow.length >= draft.teams.length) {
            showToast('error', 'Tidak dapat menghapus seluruh baris karena draft minimal harus memiliki 1 tim. Anda dapat mengedit tanggal atau menghapus seluruh draft.');
            return;
        }

        if (!window.confirm(`Hapus baris tanggal "${row.formattedDate}"? Seluruh tim pada tanggal ini (${row.allTeamsInRow.length} tim) akan dihapus dari draft.`)) {
            return;
        }

        try {
            for (const t of row.allTeamsInRow) {
                await api.draftJadwal.deleteTeam(t.id);
            }
            showToast('success', `Baris tanggal ${row.formattedDate} berhasil dihapus.`);
            setHasUnsavedChanges(true);
            await loadDrafts(true);
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menghapus baris tanggal');
            await loadDrafts(true);
        }
    };

    // 4. Create missing team for a date and immediately open configure modal
    const handleCreateTeamForDate = async (draft: DraftItem, teamName: string, dateStr: string | null) => {
        try {
            const res = await api.draftJadwal.addTeam(draft.id, {
                nama_tim: teamName,
                tanggal_mulai: dateStr || null,
                tanggal_akhir: dateStr || null
            });
            if (res && res.success && res.data) {
                setHasUnsavedChanges(true);
                await loadDrafts(true);
                const newTeamItem: DraftTeamItem = {
                    id: res.data.id,
                    draft_id: draft.id,
                    nama_tim: teamName,
                    tanggal_mulai: dateStr,
                    tanggal_akhir: dateStr,
                    kota_kabupaten_id: '3201',
                    kecamatan_id: null,
                    lokasi_detail: null,
                    petugas_ids: null,
                    keterangan: null,
                    status: 'draft',
                    kegiatan_manajemen_id: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    total_petugas: 0,
                    is_complete: false
                };
                handleOpenEditLocationModal(draft, newTeamItem);
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menambahkan tim untuk tanggal ini');
        }
    };

    // ================= HANDLERS: MODAL EDIT TANGGAL PELAKSANAAN BARIS =================
    const handleOpenEditDateModal = (draft: DraftItem, row: { dateStr: string | null; allTeamsInRow: DraftTeamItem[] }) => {
        setEditingDateRow({
            draft,
            oldDateStr: row.dateStr,
            allTeamsInRow: row.allTeamsInRow
        });
        setNewDateValue(row.dateStr || '');
        setIsEditDateRowModalOpen(true);
    };

    const handleSaveEditDateRow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDateRow || !newDateValue) {
            showToast('error', 'Tanggal pelaksanaan wajib diisi');
            return;
        }

        // Check if newDateValue already exists in other rows of this draft
        const isDateAlreadyTaken = editingDateRow.draft.teams.some(t => 
            t.tanggal_mulai === newDateValue && 
            !editingDateRow.allTeamsInRow.some(editingTeam => editingTeam.id === t.id)
        );
        if (isDateAlreadyTaken) {
            showToast('error', `Tanggal ${formatTanggalIndo(newDateValue)} sudah terdaftar pada baris jadwal lain di draft ini. Untuk menghindari tumpang tindih jadwal, silakan pilih tanggal yang belum ada atau hapus baris yang bertabrakan terlebih dahulu.`);
            return;
        }

        setSavingDateRow(true);
        try {
            for (const team of editingDateRow.allTeamsInRow) {
                const res = await api.draftJadwal.updateTeam(team.id, {
                    tanggal_mulai: newDateValue,
                    tanggal_akhir: newDateValue
                });
                if (!res || !res.success) {
                    throw new Error(res?.message || 'Gagal mengubah tanggal tim');
                }
            }
            showToast('success', `Tanggal pelaksanaan berhasil diubah ke ${formatTanggalIndo(newDateValue)}`);
            setIsEditDateRowModalOpen(false);
            setHasUnsavedChanges(true);

            // Optimistic local update (instant response, no unmounting)
            const teamIdsInRow = new Set(editingDateRow.allTeamsInRow.map(t => t.id));
            setDrafts(prev => prev.map(d => ({
                ...d,
                teams: d.teams.map(t => teamIdsInRow.has(t.id) ? {
                    ...t,
                    tanggal_mulai: newDateValue,
                    tanggal_akhir: newDateValue
                } : t)
            })));

            // Silent background sync without setting loading=true
            loadDrafts(true);
        } catch (err: any) {
            showToast('error', err.message || 'Gagal mengubah tanggal pelaksanaan');
        } finally {
            setSavingDateRow(false);
        }
    };

    // ================= HANDLERS: MODAL EDIT LOKASI (HANYA KECAMATAN & LOKASI DETAIL) =================
    const handleOpenEditLocationModal = (draft: DraftItem, team: DraftTeamItem) => {
        setEditingLocationTeam({ draft, team });
        const rawIds = team.kecamatan_id 
            ? String(team.kecamatan_id).split(',').map(s => s.trim()).filter(Boolean)
            : [];
        setLocationKecamatanIds(rawIds);
        setLocationDetail(team.lokasi_detail || '');
        setKecamatanSearch('');
        setIsKecamatanDropdownOpen(false);
        setIsEditLocationModalOpen(true);
    };

    const filteredKecamatanList = useMemo(() => {
        if (!kecamatanList) return [];
        if (!kecamatanSearch.trim()) return kecamatanList;
        const q = kecamatanSearch.toLowerCase().trim();
        return kecamatanList.filter(k => k.nama.toLowerCase().includes(q));
    }, [kecamatanList, kecamatanSearch]);

    const filteredTeamKecamatanList = useMemo(() => {
        if (!kecamatanList) return [];
        if (!teamKecamatanSearch.trim()) return kecamatanList;
        const q = teamKecamatanSearch.toLowerCase().trim();
        return kecamatanList.filter(k => k.nama.toLowerCase().includes(q));
    }, [kecamatanList, teamKecamatanSearch]);

    const handleSaveEditLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLocationTeam) return;

        setSavingLocation(true);
        try {
            const joinedKecIds = locationKecamatanIds.join(',');
            const res = await api.draftJadwal.updateTeam(editingLocationTeam.team.id, {
                kecamatan_id: joinedKecIds || null,
                lokasi_detail: locationDetail ? locationDetail.trim() : null
            });
            if (res && res.success) {
                showToast('success', `Lokasi untuk "${editingLocationTeam.team.nama_tim}" berhasil disimpan`);
                setIsEditLocationModalOpen(false);
                setHasUnsavedChanges(true);

                // Optimistic local update (instant response, no unmounting)
                const selectedNames = locationKecamatanIds
                    .map(id => kecamatanList.find(k => String(k.id) === String(id))?.nama)
                    .filter(Boolean)
                    .join(', ');

                setDrafts(prev => prev.map(d => {
                    if (d.id === editingLocationTeam.draft.id) {
                        return {
                            ...d,
                            teams: d.teams.map(t => t.id === editingLocationTeam.team.id ? {
                                ...t,
                                kecamatan_id: joinedKecIds || null,
                                kecamatan_nama: selectedNames || (joinedKecIds ? t.kecamatan_nama : null),
                                lokasi_detail: locationDetail ? locationDetail.trim() : null,
                                is_complete: Boolean(t.tanggal_mulai && joinedKecIds && (t.officers && t.officers.length > 0))
                            } : t)
                        };
                    }
                    return d;
                }));

                // Silent background sync without setting loading=true
                loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal menyimpan lokasi');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menyimpan lokasi');
        } finally {
            setSavingLocation(false);
        }
    };

    const fetchOfficerAvailabilityForDate = async (targetDate?: string | null, currentTeamId?: number) => {
        if (!targetDate) {
            setOfficerAvailabilityMap({});
            return;
        }
        setLoadingOfficerAvailability(true);
        try {
            const res = await api.kegiatanManajemen.checkAvailability(targetDate, 'Full Day');
            let availMap: Record<number, any[]> = {};
            if (res && res.success && res.data) {
                availMap = { ...res.data };
            }

            // Also check other teams in the current draft or other drafts on the same date
            drafts.forEach(d => {
                d.teams.forEach(t => {
                    if (t.id !== currentTeamId && t.tanggal_mulai === targetDate && t.petugas_ids) {
                        const ids = t.petugas_ids.split(',').map(Number).filter(Boolean);
                        ids.forEach(pid => {
                            if (!availMap[pid]) availMap[pid] = [];
                            const draftEntry = {
                                tipe: d.jenis_kegiatan_kode || 'DL',
                                tipe_nama: d.jenis_kegiatan_nama || 'Draft Jadwal',
                                nama: `${d.nama_kegiatan} (${t.nama_tim})`,
                                sesi: 'Full Day'
                            };
                            if (!availMap[pid].some(x => x.nama === draftEntry.nama)) {
                                availMap[pid].push(draftEntry);
                            }
                        });
                    }
                });
            });

            setOfficerAvailabilityMap(availMap);
        } catch (err) {
            console.error('Error fetching officer availability:', err);
        } finally {
            setLoadingOfficerAvailability(false);
        }
    };

    // ================= HANDLERS: MODAL EDIT PETUGAS (HANYA DROPDOWN PETUGAS) =================
    const handleOpenEditOfficersModal = (draft: DraftItem, team: DraftTeamItem) => {
        setEditingOfficersTeam({ draft, team });
        const pIds = team.petugas_ids ? team.petugas_ids.split(',').map(Number).filter(Boolean) : [];
        setOfficerDropdownPetugasIds(pIds);
        setOfficerDropdownSearch('');
        setShowAllPegawai(false); // Default: difilter dulu sesuai bidang user
        setIsOfficerDropdownExpanded(true);
        setIsEditOfficersModalOpen(true);
        fetchOfficerAvailabilityForDate(team.tanggal_mulai, team.id);
    };

    const handleSaveEditOfficers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOfficersTeam) return;

        setSavingOfficersOnly(true);
        try {
            const res = await api.draftJadwal.updateTeam(editingOfficersTeam.team.id, {
                petugas_ids: officerDropdownPetugasIds
            });
            if (res && res.success) {
                showToast('success', `Petugas untuk "${editingOfficersTeam.team.nama_tim}" berhasil disimpan`);
                setIsEditOfficersModalOpen(false);
                setHasUnsavedChanges(true);

                // Optimistic local update (instant response, no unmounting)
                const selectedOfficers = pegawaiList.filter(p => officerDropdownPetugasIds.map(Number).includes(Number(p.id)));
                const officerNames = selectedOfficers.map(p => p.nama_lengkap).join(', ');
                setDrafts(prev => prev.map(d => {
                    if (d.id === editingOfficersTeam.draft.id) {
                        return {
                            ...d,
                            teams: d.teams.map(t => t.id === editingOfficersTeam.team.id ? {
                                ...t,
                                petugas_ids: officerDropdownPetugasIds.join(','),
                                petugas_nama: officerNames
                            } : t)
                        };
                    }
                    return d;
                }));

                // Silent background sync without setting loading=true
                loadDrafts(true);
            } else {
                throw new Error(res?.message || 'Gagal menyimpan petugas');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menyimpan petugas');
        } finally {
            setSavingOfficersOnly(false);
        }
    };

    const handleCopyOfficersFromPreviousDay = async (
        draft: DraftItem, 
        currentTeam: DraftTeamItem, 
        prevTeam: DraftTeamItem
    ) => {
        if (!currentTeam.tanggal_mulai) {
            showToast('error', 'Tanggal pelaksanaan tim saat ini belum ditentukan.');
            return;
        }

        let sourceOfficers: any[] = [];
        if (prevTeam.officers && prevTeam.officers.length > 0) {
            sourceOfficers = prevTeam.officers;
        } else if (prevTeam.petugas_ids) {
            const pIds = prevTeam.petugas_ids.split(',').map(Number).filter(Boolean);
            sourceOfficers = pegawaiList.filter(p => pIds.includes(Number(p.id))).map(p => ({
                id: p.id,
                nama_lengkap: p.nama_lengkap,
                nip: (p as any).nip || '',
                bidang_nama: (p as any).bidang_nama || '',
                bidang_singkatan: (p as any).bidang_singkatan || ''
            }));
        }

        if (sourceOfficers.length === 0) {
            showToast('error', `Tim "${prevTeam.nama_tim}" pada hari sebelumnya belum memiliki petugas.`);
            return;
        }

        setCopyingOfficerTeamId(currentTeam.id);

        try {
            // 1. Cek ketersediaan dan bentrok kegiatan petugas pada tanggal pelaksanaan tim tujuan
            let availMap: Record<number, any[]> = {};
            try {
                const res = await api.kegiatanManajemen.checkAvailability(currentTeam.tanggal_mulai, 'Full Day');
                if (res && res.success && res.data) {
                    availMap = { ...res.data };
                }
            } catch (err) {
                console.warn('Failed to check remote officer availability:', err);
            }

            // Cross-check dengan tim lain di draft pada tanggal yang sama (kecuali tim saat ini)
            drafts.forEach(d => {
                d.teams.forEach(t => {
                    if (t.id !== currentTeam.id && t.tanggal_mulai === currentTeam.tanggal_mulai && t.petugas_ids) {
                        const ids = t.petugas_ids.split(',').map(Number).filter(Boolean);
                        ids.forEach(pid => {
                            if (!availMap[pid]) availMap[pid] = [];
                            const draftEntry = {
                                tipe: d.jenis_kegiatan_kode || 'DL',
                                tipe_nama: d.jenis_kegiatan_nama || 'Draft Jadwal',
                                nama: `${d.nama_kegiatan} (${t.nama_tim})`,
                                sesi: 'Full Day'
                            };
                            if (!availMap[pid].some((x: any) => x.nama === draftEntry.nama)) {
                                availMap[pid].push(draftEntry);
                            }
                        });
                    }
                });
            });

            // 2. Pisahkan petugas yang bentrok dan petugas yang bebas/belum ada kegiatan
            const conflictedOfficers: {
                id: number;
                nama_lengkap: string;
                bidang_singkatan?: string;
                activities: { tipe: string; tipe_nama?: string; nama: string; sesi?: string }[];
            }[] = [];

            const availableOfficers: typeof sourceOfficers = [];

            sourceOfficers.forEach(officer => {
                const conflicts = availMap[officer.id] || [];
                if (conflicts.length > 0) {
                    conflictedOfficers.push({
                        id: officer.id,
                        nama_lengkap: officer.nama_lengkap,
                        bidang_singkatan: (officer as any).bidang_singkatan || '',
                        activities: conflicts
                    });
                } else {
                    availableOfficers.push(officer);
                }
            });

            // 3. Tarik HANYA petugas yang belum memiliki kegiatan pada hari itu
            if (availableOfficers.length > 0) {
                const availableIds = availableOfficers.map(p => p.id);
                const officerNames = availableOfficers.map(p => p.nama_lengkap).join(', ');

                // Update UI secara instan (Optimistic UI)
                setDrafts(prev => prev.map(d => {
                    if (d.id === draft.id) {
                        return {
                            ...d,
                            teams: d.teams.map(t => t.id === currentTeam.id ? {
                                ...t,
                                petugas_ids: availableIds.join(','),
                                petugas_nama: officerNames,
                                officers: availableOfficers,
                                total_petugas: availableOfficers.length,
                                is_complete: Boolean(t.kecamatan_id && availableOfficers.length > 0)
                            } : t)
                        };
                    }
                    return d;
                }));

                setHasUnsavedChanges(true);

                // Simpan ke database di latar belakang
                api.draftJadwal.updateTeam(currentTeam.id, {
                    petugas_ids: availableIds
                }).catch(err => {
                    console.error('Failed to update team officers in background:', err);
                });
            }

            // 4. Jika ada petugas yang bentrok, tampilkan POP UP pemberitahuan
            if (conflictedOfficers.length > 0) {
                setCopyConflictModalData({
                    targetTeamName: currentTeam.nama_tim,
                    targetDate: currentTeam.tanggal_mulai,
                    conflictedOfficers,
                    pulledOfficers: availableOfficers.map(p => ({
                        id: p.id,
                        nama_lengkap: p.nama_lengkap,
                        bidang_singkatan: (p as any).bidang_singkatan || ''
                    }))
                });
            } else {
                showToast('success', `Berhasil menyalin seluruh ${availableOfficers.length} petugas dari hari sebelumnya (${prevTeam.nama_tim})`);
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal memeriksa dan menyalin petugas');
        } finally {
            setCopyingOfficerTeamId(null);
        }
    };

    // Filtered officers for the officer dropdown: difilter dulu sesuai bidang user, tapi ada opsi semua bidang
    const filteredOfficersForDropdown = useMemo(() => {
        if (!pegawaiList) return [];

        let list = pegawaiList;
        const userBidangId = Number(user?.bidang_id);

        // Filter default sesuai bidang user jika showAllPegawai false
        if (!showAllPegawai && userBidangId) {
            list = pegawaiList.filter(p => Number(p.bidang_id) === userBidangId);
        }

        // Pastikan petugas yang sudah terpilih tetap tampil agar tidak hilang jika di luar bidang
        if (officerDropdownPetugasIds.length > 0) {
            const selectedIds = new Set(officerDropdownPetugasIds.map(Number));
            const existingIds = new Set(list.map(p => Number(p.id)));
            const missingSelected = pegawaiList.filter(p => selectedIds.has(Number(p.id)) && !existingIds.has(Number(p.id)));
            list = [...list, ...missingSelected];
        }

        if (officerDropdownSearch.trim()) {
            const q = officerDropdownSearch.toLowerCase().trim();
            list = list.filter(p => 
                (p.nama_lengkap || '').toLowerCase().includes(q) ||
                (p.nip && p.nip.includes(q)) ||
                (p.nama_bidang && p.nama_bidang.toLowerCase().includes(q)) ||
                (p.bidang_singkatan && p.bidang_singkatan.toLowerCase().includes(q))
            );
        }

        return list;
    }, [pegawaiList, showAllPegawai, user?.bidang_id, officerDropdownPetugasIds, officerDropdownSearch]);

    // Dynamic available years based on drafts
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>();
        const currentYear = new Date().getFullYear();
        yearsSet.add(currentYear);
        yearsSet.add(currentYear - 1);
        drafts.forEach(d => {
            if (d.created_at) {
                const dStr = String(d.created_at);
                const yearMatch = dStr.match(/^(\d{4})/);
                const yr = yearMatch ? parseInt(yearMatch[1], 10) : new Date(d.created_at).getFullYear();
                if (!isNaN(yr)) yearsSet.add(yr);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [drafts]);

    // ================= REKAPITULASI JADWAL LOGIC & MEMOS =================
    // Pilihan Bulan untuk Rekapitulasi
    const BULAN_OPTIONS = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' }
    ];

    // Load Data Rekapitulasi (Monthly Kegiatan Pegawai & Kegiatan Resmi)
    const loadRekapData = async (targetMonth: number, targetYear: number) => {
        setRekapLoading(true);
        try {
            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
            const startStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const endStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

            const [resPegawaiMonthly, resOfficial] = await Promise.all([
                api.kegiatanPegawai.getMonthly({
                    instansi_id: Number(user?.instansi_id || 2),
                    month: targetMonth,
                    year: targetYear
                }).catch(e => {
                    console.warn('Failed to load kegiatanPegawai.getMonthly:', e);
                    return { success: false, data: [] };
                }),
                api.kegiatanManajemen.getAll({
                    startDate: startStr,
                    endDate: endStr
                }).catch(e => {
                    console.warn('Failed to load kegiatanManajemen.getAll:', e);
                    return { success: false, data: [] };
                })
            ]);

            if (resPegawaiMonthly && resPegawaiMonthly.success && Array.isArray(resPegawaiMonthly.data)) {
                setRekapMonthlyPegawai(resPegawaiMonthly.data);
            } else {
                setRekapMonthlyPegawai([]);
            }

            if (resOfficial && resOfficial.success && Array.isArray(resOfficial.data)) {
                setRekapOfficialActivities(resOfficial.data);
            } else if (Array.isArray(resOfficial)) {
                setRekapOfficialActivities(resOfficial);
            } else {
                setRekapOfficialActivities([]);
            }
        } catch (err) {
            console.error('Error loading rekap data:', err);
        } finally {
            setRekapLoading(false);
        }
    };

    useEffect(() => {
        if (isRekapModalOpen) {
            loadRekapData(rekapBulan, rekapTahun);
        }
    }, [isRekapModalOpen, rekapBulan, rekapTahun]);

    const handleOpenRekapModal = () => {
        setIsRekapModalOpen(true);
        const userBidang = user?.bidang_singkatan || user?.bidang_nama || 'all';
        setRekapBidangFilter(userBidang !== 'all' ? userBidang : 'all');
        setRekapStatusFilter('all');
        setRekapSearch('');
    };

    // Rekapitulasi Jadwal Per Orang
    const rekapPerOrangData = useMemo(() => {
        const daysInMonth = new Date(rekapTahun, rekapBulan, 0).getDate();
        const monthPad = String(rekapBulan).padStart(2, '0');

        // Menghitung hari kerja Senin - Jumat
        const workingDays: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(rekapTahun, rekapBulan - 1, d);
            const dayOfWeek = dt.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays.push(d);
            }
        }

        // Map aktivitas dari rekapMonthlyPegawai
        const pegawaiActivityMap: Record<number, Record<number, { nama: string; tipe: string; sesi?: string }[]>> = {};
        rekapMonthlyPegawai.forEach(p => {
            const pId = Number(p.profil_id || p.id);
            if (!pegawaiActivityMap[pId]) pegawaiActivityMap[pId] = {};
            if (p.activities) {
                Object.keys(p.activities).forEach(dayKey => {
                    const dNum = Number(dayKey);
                    if (!pegawaiActivityMap[pId][dNum]) pegawaiActivityMap[pId][dNum] = [];
                    const sessionsObj = p.activities[dayKey];
                    Object.keys(sessionsObj).forEach(sesi => {
                        const items = sessionsObj[sesi] || [];
                        items.forEach((item: any) => {
                            pegawaiActivityMap[pId][dNum].push({
                                nama: item.nama || item.nama_kegiatan || item.tipe || 'Kegiatan',
                                tipe: item.tipe || 'DL',
                                sesi: sesi
                            });
                        });
                    });
                });
            }
        });

        // Gabungkan juga kegiatan dari Draft Jadwal untuk bulan/tahun yang dipilih
        drafts.forEach(d => {
            d.teams.forEach(t => {
                if (t.tanggal_mulai) {
                    const [yStr, mStr, dStr] = t.tanggal_mulai.split('-');
                    if (Number(yStr) === rekapTahun && Number(mStr) === rekapBulan) {
                        const dNum = Number(dStr);
                        const assignedIds = t.petugas_ids ? t.petugas_ids.split(',').map(Number).filter(Boolean) : [];
                        assignedIds.forEach(pId => {
                            if (!pegawaiActivityMap[pId]) pegawaiActivityMap[pId] = {};
                            if (!pegawaiActivityMap[pId][dNum]) pegawaiActivityMap[pId][dNum] = [];
                            const draftActName = `${d.nama_kegiatan} (${t.nama_tim})`;
                            if (!pegawaiActivityMap[pId][dNum].some(x => x.nama === draftActName)) {
                                pegawaiActivityMap[pId][dNum].push({
                                    nama: draftActName,
                                    tipe: d.jenis_kegiatan_kode || 'Draft',
                                    sesi: 'Full Day'
                                });
                            }
                        });
                    }
                }
            });
        });

        // Susun data per pegawai
        return pegawaiList.map(p => {
            const pId = Number(p.id);
            const actByDay = pegawaiActivityMap[pId] || {};
            const activeDays = Object.keys(actByDay).map(Number).sort((a, b) => a - b);
            
            const monthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][rekapBulan - 1];

            const activeSchedule = activeDays.map(day => {
                const acts = actByDay[day] || [];
                const uniqueActNames = Array.from(new Set(acts.map(a => a.nama))).filter(Boolean);
                const dtStr = `${rekapTahun}-${monthPad}-${String(day).padStart(2, '0')}`;
                return {
                    day,
                    dateStr: dtStr,
                    formattedDay: `${day} ${monthShort}`,
                    activities: uniqueActNames
                };
            });

            const activeDaySet = new Set(activeDays);
            const emptyDays = workingDays.filter(d => !activeDaySet.has(d));

            const bidangName = p.nama_bidang || p.bidang_nama || p.bidang_singkatan || '-';
            const bidangCode = p.bidang_singkatan || p.nama_bidang || '-';

            return {
                id: p.id,
                nama_lengkap: p.nama_lengkap,
                nip: p.nip || '-',
                bidang_id: p.bidang_id,
                bidang_nama: bidangName,
                bidang_singkatan: bidangCode,
                hasActivity: activeSchedule.length > 0,
                activeDaysCount: activeSchedule.length,
                activeSchedule,
                emptyDaysCount: emptyDays.length,
                emptyDays,
                totalWorkingDays: workingDays.length
            };
        });
    }, [pegawaiList, rekapMonthlyPegawai, drafts, rekapBulan, rekapTahun]);

    const filteredRekapPerOrang = useMemo(() => {
        return rekapPerOrangData.filter(item => {
            if (rekapStatusFilter === 'has_activity' && !item.hasActivity) return false;
            if (rekapStatusFilter === 'no_activity' && item.hasActivity) return false;

            if (rekapBidangFilter !== 'all') {
                if (item.bidang_singkatan !== rekapBidangFilter && item.bidang_nama !== rekapBidangFilter) {
                    return false;
                }
            }

            if (rekapSearch.trim()) {
                const q = rekapSearch.toLowerCase().trim();
                const matchName = (item.nama_lengkap || '').toLowerCase().includes(q);
                const matchNip = (item.nip || '').includes(q);
                const matchBidang = (item.bidang_nama || '').toLowerCase().includes(q);
                if (!matchName && !matchNip && !matchBidang) return false;
            }

            return true;
        });
    }, [rekapPerOrangData, rekapStatusFilter, rekapBidangFilter, rekapSearch]);

    const kpiPerOrang = useMemo(() => {
        const baseList = rekapBidangFilter === 'all' 
            ? rekapPerOrangData 
            : rekapPerOrangData.filter(i => i.bidang_singkatan === rekapBidangFilter || i.bidang_nama === rekapBidangFilter);

        const total = baseList.length;
        const withAct = baseList.filter(i => i.hasActivity).length;
        const withoutAct = baseList.filter(i => !i.hasActivity).length;

        return {
            total,
            withAct,
            withoutAct,
            pctWithAct: total > 0 ? Math.round((withAct / total) * 100) : 0,
            pctWithoutAct: total > 0 ? Math.round((withoutAct / total) * 100) : 0
        };
    }, [rekapPerOrangData, rekapBidangFilter]);

    // Rekapitulasi Jadwal Per Kegiatan
    const rekapPerKegiatanData = useMemo(() => {
        const list: {
            id: string;
            nama_kegiatan: string;
            jenis_nama: string;
            nama_tim?: string;
            tanggal_mulai: string;
            tanggal_akhir?: string | null;
            lokasi: string;
            lokasi_detail?: string;
            officers: { id: number; nama_lengkap: string; bidang_singkatan?: string }[];
            status: 'draft' | 'terintegrasi' | 'resmi';
        }[] = [];

        // 1. Dari Draft Jadwal
        drafts.forEach(d => {
            d.teams.forEach(t => {
                if (t.tanggal_mulai) {
                    const [y, m] = t.tanggal_mulai.split('-');
                    if (Number(y) === rekapTahun && Number(m) === rekapBulan) {
                        const assignedIds = t.petugas_ids ? t.petugas_ids.split(',').map(Number).filter(Boolean) : [];
                        const teamOfficers = assignedIds.map(pid => {
                            const p = pegawaiList.find(x => x.id === pid);
                            return {
                                id: pid,
                                nama_lengkap: p ? p.nama_lengkap : `Pegawai #${pid}`,
                                bidang_singkatan: p ? (p.bidang_singkatan || p.nama_bidang) : ''
                            };
                        });

                        list.push({
                            id: `draft-${d.id}-team-${t.id}`,
                            nama_kegiatan: d.nama_kegiatan,
                            jenis_nama: d.jenis_kegiatan_nama || 'Dinas Luar',
                            nama_tim: t.nama_tim,
                            tanggal_mulai: t.tanggal_mulai,
                            tanggal_akhir: t.tanggal_akhir,
                            lokasi: t.kecamatan_nama ? `Kec. ${t.kecamatan_nama}` : (t.lokasi_detail || '-'),
                            lokasi_detail: t.kecamatan_nama && t.lokasi_detail ? t.lokasi_detail : undefined,
                            officers: teamOfficers,
                            status: t.status === 'terintegrasi' ? 'terintegrasi' : 'draft'
                        });
                    }
                }
            });
        });

        // 2. Dari Kegiatan Resmi
        rekapOfficialActivities.forEach(act => {
            if (act.tanggal) {
                const [y, m] = act.tanggal.split('-');
                if (Number(y) === rekapTahun && Number(m) === rekapBulan) {
                    const assignedIds = act.petugas_ids ? String(act.petugas_ids).split(',').map(Number).filter(Boolean) : [];
                    const actOfficers = assignedIds.map(pid => {
                        const p = pegawaiList.find(x => x.id === pid);
                        return {
                            id: pid,
                            nama_lengkap: p ? p.nama_lengkap : `Pegawai #${pid}`,
                            bidang_singkatan: p ? (p.bidang_singkatan || p.nama_bidang) : ''
                        };
                    });

                    list.push({
                        id: `resmi-${act.id}`,
                        nama_kegiatan: act.nama_kegiatan,
                        jenis_nama: act.jenis_nama || act.tipe_nama || 'Kegiatan',
                        nama_tim: undefined,
                        tanggal_mulai: act.tanggal,
                        tanggal_akhir: act.tanggal_akhir,
                        lokasi: act.kecamatan_nama ? `Kec. ${act.kecamatan_nama}` : (act.tempat || act.lokasi || '-'),
                        lokasi_detail: act.lokasi_detail || act.deskripsi_lokasi,
                        officers: actOfficers,
                        status: 'resmi'
                    });
                }
            }
        });

        return list.sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai));
    }, [drafts, rekapOfficialActivities, pegawaiList, rekapBulan, rekapTahun]);

    const filteredRekapPerKegiatan = useMemo(() => {
        if (!rekapSearch.trim()) return rekapPerKegiatanData;
        const q = rekapSearch.toLowerCase().trim();
        return rekapPerKegiatanData.filter(item => {
            const matchName = item.nama_kegiatan.toLowerCase().includes(q);
            const matchJenis = item.jenis_nama.toLowerCase().includes(q);
            const matchLokasi = item.lokasi.toLowerCase().includes(q);
            const matchOfficer = item.officers.some(o => o.nama_lengkap.toLowerCase().includes(q));
            return matchName || matchJenis || matchLokasi || matchOfficer;
        });
    }, [rekapPerKegiatanData, rekapSearch]);

    const kpiPerKegiatan = useMemo(() => {
        const total = rekapPerKegiatanData.length;
        const totalPetugas = rekapPerKegiatanData.reduce((acc, curr) => acc + curr.officers.length, 0);
        const draftCount = rekapPerKegiatanData.filter(k => k.status === 'draft').length;
        const resmiCount = rekapPerKegiatanData.filter(k => k.status === 'resmi' || k.status === 'terintegrasi').length;
        return {
            total,
            totalPetugas,
            draftCount,
            resmiCount
        };
    }, [rekapPerKegiatanData]);

    // Fungsi Cetak Rekapitulasi Jadwal
    const handlePrintRekap = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            showToast('error', 'Gagal membuka jendela cetak. Pastikan izin pop-up browser aktif.');
            return;
        }

        const bulanName = BULAN_OPTIONS.find(b => b.value === rekapBulan)?.label || 'Bulan';
        const todayIndo = formatTanggalIndo(new Date().toISOString().split('T')[0]);

        let titleStr = '';
        let tableHeaderHtml = '';
        let tableBodyHtml = '';

        if (rekapActiveTab === 'per_orang') {
            titleStr = `REKAPITULASI JADWAL PENUGASAN PEGAWAI<br><span style="font-size: 11pt; font-weight: normal; color: #475569;">Periode: ${bulanName} ${rekapTahun} ${rekapBidangFilter !== 'all' ? `&bull; Bidang: ${rekapBidangFilter}` : ''}</span>`;
            tableHeaderHtml = `
                <tr>
                    <th style="width: 35px; text-align: center;">No</th>
                    <th>Nama Pegawai / NIP</th>
                    <th>Bidang</th>
                    <th>Status Penugasan</th>
                    <th>Tanggal & Kegiatan yang Diikuti</th>
                    <th>Tanggal Kosong (Hari Kerja)</th>
                </tr>
            `;
            tableBodyHtml = filteredRekapPerOrang.map((item, idx) => {
                const schedHtml = item.activeSchedule.length > 0
                    ? item.activeSchedule.map(s => `<div><strong>${s.formattedDay}:</strong> ${s.activities.join(' • ')}</div>`).join('')
                    : '<em>- Tidak ada jadwal kegiatan -</em>';
                const emptyHtml = item.hasActivity
                    ? `${item.emptyDaysCount} hari kosong: ${item.emptyDays.join(', ')}`
                    : `<strong>Kosong Seluruh Bulan</strong> (${item.totalWorkingDays} hari kerja)`;
                const statusBadge = item.hasActivity
                    ? `<span style="color: #047857; font-weight: bold;">Sudah Bertugas (${item.activeDaysCount} hari)</span>`
                    : `<span style="color: #b45309; font-weight: bold;">Belum Ada Kegiatan</span>`;

                return `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><strong>${item.nama_lengkap}</strong><br><small style="color: #64748b;">NIP: ${item.nip}</small></td>
                        <td>${item.bidang_singkatan}</td>
                        <td>${statusBadge}</td>
                        <td>${schedHtml}</td>
                        <td>${emptyHtml}</td>
                    </tr>
                `;
            }).join('');
        } else {
            titleStr = `REKAPITULASI JADWAL KEGIATAN & PENUGASAN TIM<br><span style="font-size: 11pt; font-weight: normal; color: #475569;">Periode: ${bulanName} ${rekapTahun}</span>`;
            tableHeaderHtml = `
                <tr>
                    <th style="width: 35px; text-align: center;">No</th>
                    <th>Nama Kegiatan & Jenis</th>
                    <th>Tanggal Pelaksanaan</th>
                    <th>Lokasi</th>
                    <th>Tim & Petugas yang Ditugaskan</th>
                    <th>Status</th>
                </tr>
            `;
            tableBodyHtml = filteredRekapPerKegiatan.map((item, idx) => {
                const dateText = item.tanggal_mulai ? formatTanggalIndo(item.tanggal_mulai) : '-';
                const locText = item.lokasi + (item.lokasi_detail ? ` (${item.lokasi_detail})` : '');
                const officersText = item.officers.length > 0
                    ? item.officers.map(o => o.nama_lengkap).join(', ')
                    : '<em>Belum ditugaskan</em>';

                return `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td><strong>${item.nama_kegiatan}</strong><br><small style="color: #64748b;">${item.jenis_nama}</small></td>
                        <td>${dateText}</td>
                        <td>${locText}</td>
                        <td>${item.nama_tim ? `<strong>${item.nama_tim}:</strong> ` : ''}${officersText} (${item.officers.length} org)</td>
                        <td><span style="font-weight: bold;">${item.status === 'resmi' ? 'Resmi (Terbit)' : item.status === 'terintegrasi' ? 'Terintegrasi' : 'Draft Jadwal'}</span></td>
                    </tr>
                `;
            }).join('');
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cetak Rekap Jadwal</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.5pt; color: #1e293b; padding: 15px; line-height: 1.35; }
        .kop { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
        .kop h2 { margin: 0; font-size: 11.5pt; text-transform: uppercase; font-weight: bold; }
        .kop h3 { margin: 2px 0 0 0; font-size: 9.5pt; text-transform: uppercase; font-weight: normal; }
        .title { text-align: center; margin-bottom: 14px; }
        .title h1 { margin: 0; font-size: 11pt; text-transform: uppercase; line-height: 1.35; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 8pt; vertical-align: top; word-break: break-word; }
        th { background-color: #f1f5f9; text-align: left; font-weight: bold; }
        tr { page-break-inside: avoid; }
        .ttd { margin-top: 24px; float: right; text-align: left; min-width: 190px; page-break-inside: avoid; }
        @media print {
            body { padding: 0; margin: 0; }
            @page { size: A4 portrait; margin: 10mm 8mm; }
        }
    </style>
</head>
<body>
    <div class="kop">
        <h2>PEMERINTAH DAERAH KABUPATEN BOGOR</h2>
        <h3>${user?.instansi_nama || 'BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH'}</h3>
    </div>
    <div class="title">
        <h1>${titleStr}</h1>
    </div>
    <table>
        <thead>${tableHeaderHtml}</thead>
        <tbody>${tableBodyHtml}</tbody>
    </table>
    <div class="ttd">
        <div>Cibinong, ${todayIndo}</div>
        <div style="font-weight: 600; margin-top: 4px;">Penanggung Jawab,</div>
        <div style="height: 50px;"></div>
        <div style="font-weight: bold; text-decoration: underline;">${user?.nama_lengkap || 'Sammy Lugina, S.E., M. Tr. A.P.'}</div>
        <div style="font-size: 8pt; color: #64748b;">NIP. ${user?.nip || '-'}</div>
    </div>
    <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 300); };
    </script>
</body>
</html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // ================= HANDLERS: EXCEL IMPORT & TEMPLATE DOWNLOAD =================
    const handleDownloadTemplate = () => {
        try {
            // Sheet 1: Format Impor Jadwal
            const headers = [
                'No',
                'Nama Kegiatan',
                'Jenis Kegiatan',
                'Nama Tim',
                'Tanggal Mulai (YYYY-MM-DD)',
                'Tanggal Selesai (YYYY-MM-DD)',
                'Kecamatan (Bisa koma jika multi)',
                'Lokasi Detail / Desa',
                'Petugas (Nama / NIP dipisah koma)',
                'Keterangan'
            ];

            const sampleRows = [
                [
                    1,
                    'Monitoring Evaluasi Fasilitas Pelayanan Kesehatan',
                    'Dinas Luar',
                    'Tim 1',
                    '2026-10-15',
                    '2026-10-15',
                    'Cibinong, Sukaraja',
                    'Puskesmas Cibinong, Puskesmas Sukaraja',
                    pegawaiList.slice(0, 2).map(p => p.nama_lengkap).join(', ') || 'Budi Santoso, Siti Rahma',
                    'Pemeriksaan kepatuhan standar pelayanan'
                ],
                [
                    2,
                    'Monitoring Evaluasi Fasilitas Pelayanan Kesehatan',
                    'Dinas Luar',
                    'Tim 2',
                    '2026-10-15',
                    '2026-10-15',
                    'Babakan Madang',
                    'Puskesmas Babakan Madang',
                    pegawaiList.slice(2, 3).map(p => p.nama_lengkap).join(', ') || 'Ahmad Fauzi',
                    'Pemeriksaan fasilitas dan wawancara'
                ],
                [
                    3,
                    'Bimbingan Teknis Standar Pelayanan Minimal (SPM)',
                    'Bimbingan Teknis',
                    'Tim A',
                    '2026-10-16',
                    '2026-10-17',
                    'Ciawi',
                    'Aula Serbaguna Kantor Kecamatan',
                    pegawaiList.slice(3, 5).map(p => p.nama_lengkap).join(', ') || 'Rina Wijaya, Hendro',
                    'Bimtek teknis capaian SPM triwulan IV'
                ]
            ];

            const sheet1Data = [headers, ...sampleRows];
            const ws1 = XLSXStyle.utils.aoa_to_sheet(sheet1Data);

            const borderStyle = {
                top: { style: "thin", color: { rgb: "CBD5E1" } },
                bottom: { style: "thin", color: { rgb: "CBD5E1" } },
                left: { style: "thin", color: { rgb: "CBD5E1" } },
                right: { style: "thin", color: { rgb: "CBD5E1" } }
            };

            const headerStyle = {
                fill: { fgColor: { rgb: "1E3A8A" } },
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
                alignment: { vertical: "center", horizontal: "center", wrapText: true },
                border: borderStyle
            };

            const cellStyle = {
                alignment: { vertical: "center" },
                font: { sz: 9.5, color: { rgb: "1E293B" } },
                border: borderStyle
            };

            const range1 = XLSXStyle.utils.decode_range(ws1['!ref'] || 'A1:J4');
            for (let R = range1.s.r; R <= range1.e.r; ++R) {
                for (let C = range1.s.c; C <= range1.e.c; ++C) {
                    const cell_address = XLSXStyle.utils.encode_cell({ c: C, r: R });
                    if (!ws1[cell_address]) ws1[cell_address] = { t: 's', v: '' };
                    ws1[cell_address].s = R === 0 ? headerStyle : cellStyle;
                }
            }

            ws1['!cols'] = [
                { wch: 6 },
                { wch: 48 },
                { wch: 22 },
                { wch: 15 },
                { wch: 25 },
                { wch: 25 },
                { wch: 32 },
                { wch: 36 },
                { wch: 42 },
                { wch: 38 }
            ];
            ws1['!rows'] = [{ hpt: 32 }, { hpt: 24 }, { hpt: 24 }, { hpt: 24 }];

            // Sheet 2: Referensi Data
            const maxRefRows = Math.max(
                kecamatanList.length,
                tipeKegiatanList.length,
                pegawaiList.length
            );

            const refHeaders = ['Daftar Kecamatan Resmi', 'Daftar Jenis Kegiatan', 'Nama Pegawai', 'NIP Pegawai'];
            const refRows = [];
            for (let i = 0; i < maxRefRows; i++) {
                refRows.push([
                    kecamatanList[i]?.nama ? `Kec. ${kecamatanList[i].nama}` : '',
                    tipeKegiatanList[i]?.nama || '',
                    pegawaiList[i]?.nama_lengkap || '',
                    pegawaiList[i]?.nip || ''
                ]);
            }

            const ws2 = XLSXStyle.utils.aoa_to_sheet([refHeaders, ...refRows]);
            const refHeaderStyle = {
                fill: { fgColor: { rgb: "0F766E" } },
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
                alignment: { vertical: "center", horizontal: "center" },
                border: borderStyle
            };
            const range2 = XLSXStyle.utils.decode_range(ws2['!ref'] || 'A1:D10');
            for (let R = range2.s.r; R <= range2.e.r; ++R) {
                for (let C = range2.s.c; C <= range2.e.c; ++C) {
                    const cell_address = XLSXStyle.utils.encode_cell({ c: C, r: R });
                    if (!ws2[cell_address]) ws2[cell_address] = { t: 's', v: '' };
                    ws2[cell_address].s = R === 0 ? refHeaderStyle : cellStyle;
                }
            }
            ws2['!cols'] = [
                { wch: 28 },
                { wch: 28 },
                { wch: 38 },
                { wch: 26 }
            ];

            const wb = XLSXStyle.utils.book_new();
            XLSXStyle.utils.book_append_sheet(wb, ws1, "Format Impor Jadwal");
            XLSXStyle.utils.book_append_sheet(wb, ws2, "Referensi Data");
            XLSXStyle.writeFile(wb, "Format_Impor_Draft_Jadwal.xlsx");
            showToast('success', 'Format template Excel berhasil diunduh!');
        } catch (err: any) {
            console.error('Error generating template:', err);
            showToast('error', 'Gagal mengunduh template Excel');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportExcelFile(file);
        setImportExcelFileName(file.name);
        setImportExcelError(null);
        setImportExcelLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('impor') || n.toLowerCase().includes('jadwal')) || wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (rawRows.length === 0) {
                    throw new Error('Berkas Excel kosong atau tidak memiliki data pada sheet utama.');
                }

                // Helper to find value from row case-insensitively
                const getVal = (row: any, keys: string[]) => {
                    const foundKey = Object.keys(row).find(k => {
                        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return keys.some(target => target.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
                    });
                    return foundKey !== undefined ? String(row[foundKey]).trim() : '';
                };

                // Date normalizer
                const normalizeDate = (val: any): string | null => {
                    if (!val) return null;
                    if (val instanceof Date) {
                        const yr = val.getFullYear();
                        const mo = String(val.getMonth() + 1).padStart(2, '0');
                        const da = String(val.getDate()).padStart(2, '0');
                        return `${yr}-${mo}-${da}`;
                    }
                    const str = String(val).trim();
                    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                    if (isoMatch) {
                        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
                    }
                    const idMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                    if (idMatch) {
                        return `${idMatch[3]}-${idMatch[2].padStart(2, '0')}-${idMatch[1].padStart(2, '0')}`;
                    }
                    return null;
                };

                const draftGroups = new Map<string, any>();
                let currentKegiatanName = '';
                let totalWarnings = 0;

                rawRows.forEach((row) => {
                    let kegName = getVal(row, ['namakegiatan', 'kegiatan', 'namadraft']);
                    if (!kegName && currentKegiatanName) {
                        kegName = currentKegiatanName;
                    } else if (kegName) {
                        currentKegiatanName = kegName;
                    } else {
                        kegName = 'Kegiatan Tanpa Nama';
                    }

                    const jenisKegStr = getVal(row, ['jeniskegiatan', 'jenis', 'tipekegiatan']);
                    const teamName = getVal(row, ['namatim', 'tim']) || `Tim ${draftGroups.get(kegName)?.teams.length ? draftGroups.get(kegName).teams.length + 1 : 1}`;
                    const tglMulai = normalizeDate(getVal(row, ['tanggalmulai', 'tglmulai', 'tanggal']));
                    const tglSelesai = normalizeDate(getVal(row, ['tanggalselesai', 'tglselesai', 'tanggalakhir', 'tglakhir'])) || tglMulai;
                    const kecStr = getVal(row, ['kecamatan', 'kecamatantujuan', 'lokasi']);
                    const lokasiDetail = getVal(row, ['lokasidetail', 'lokasidetaildesa', 'desa', 'tempat']);
                    const petugasStr = getVal(row, ['petugas', 'pegawai', 'petugasnamanipdipisahkoma', 'namapetugas']);
                    const keterangan = getVal(row, ['keterangan', 'catatan']);

                    // Resolve Jenis Kegiatan
                    let jenisId = 1;
                    let jenisNama = 'Dinas Luar';
                    if (tipeKegiatanList.length > 0) {
                        const matchedType = tipeKegiatanList.find(t => 
                            t.nama.toLowerCase().includes(jenisKegStr.toLowerCase()) || 
                            t.kode.toLowerCase() === jenisKegStr.toLowerCase()
                        );
                        if (matchedType) {
                            jenisId = matchedType.id;
                            jenisNama = matchedType.nama;
                        } else {
                            jenisId = tipeKegiatanList[0].id;
                            jenisNama = tipeKegiatanList[0].nama;
                        }
                    }

                    // Resolve Kecamatan (multi-kecamatan support)
                    const kecParts = kecStr.split(',').map(s => s.replace(/^kec\.?/i, '').trim()).filter(Boolean);
                    const matchedKecIds: string[] = [];
                    const matchedKecNames: string[] = [];
                    kecParts.forEach(kp => {
                        const cleanKp = kp.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const foundKec = kecamatanList.find(k => 
                            k.nama.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKp ||
                            String(k.id) === kp
                        );
                        if (foundKec) {
                            matchedKecIds.push(String(foundKec.id));
                            matchedKecNames.push(foundKec.nama);
                        }
                    });

                    // Resolve Officers
                    const pTokens = petugasStr.split(',').map(s => s.trim()).filter(Boolean);
                    const matchedOfficerIds: number[] = [];
                    const matchedOfficerNames: string[] = [];
                    const unresolvedOfficers: string[] = [];

                    pTokens.forEach(token => {
                        const cleanToken = token.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const foundPegawai = pegawaiList.find(p => {
                            if (p.nip && p.nip.replace(/[^0-9]/g, '') === token.replace(/[^0-9]/g, '')) return true;
                            const cleanName = (p.nama_lengkap || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            return cleanName.includes(cleanToken) || cleanToken.includes(cleanName);
                        });

                        if (foundPegawai) {
                            if (!matchedOfficerIds.includes(foundPegawai.id)) {
                                matchedOfficerIds.push(foundPegawai.id);
                                matchedOfficerNames.push(foundPegawai.nama_lengkap);
                            }
                        } else {
                            unresolvedOfficers.push(token);
                            totalWarnings++;
                        }
                    });

                    if (!draftGroups.has(kegName)) {
                        draftGroups.set(kegName, {
                            nama_kegiatan: kegName,
                            jenis_kegiatan_id: jenisId,
                            jenis_kegiatan_nama: jenisNama,
                            teams: []
                        });
                    }

                    draftGroups.get(kegName).teams.push({
                        nama_tim: teamName,
                        tanggal_mulai: tglMulai,
                        tanggal_akhir: tglSelesai,
                        kecamatan_id: matchedKecIds.length > 0 ? matchedKecIds.join(',') : null,
                        kecamatan_nama: matchedKecNames.join(', '),
                        lokasi_detail: lokasiDetail || null,
                        petugas_ids: matchedOfficerIds,
                        officer_names: matchedOfficerNames,
                        unresolved_officers: unresolvedOfficers,
                        keterangan: keterangan || null
                    });
                });

                const parsedDrafts = Array.from(draftGroups.values());
                setImportExcelPreview({
                    drafts: parsedDrafts,
                    totalRows: rawRows.length,
                    warningCount: totalWarnings
                });
            } catch (err: any) {
                console.error('Error parsing excel:', err);
                setImportExcelError(err.message || 'Gagal membaca berkas Excel. Pastikan format berkas valid.');
            } finally {
                setImportExcelLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        if (!importExcelPreview || importExcelPreview.drafts.length === 0) return;

        setSavingImportExcel(true);
        try {
            const res = await api.draftJadwal.importExcel({ drafts: importExcelPreview.drafts });
            if (res && res.success) {
                showToast('success', res.message || 'Data jadwal dari Excel berhasil diimpor!');
                setIsImportExcelModalOpen(false);
                setImportExcelPreview(null);
                setImportExcelFile(null);
                setImportExcelFileName('');
                setHasUnsavedChanges(true);
                await loadDrafts();
            } else {
                throw new Error(res?.message || 'Gagal mengimpor data jadwal');
            }
        } catch (err: any) {
            showToast('error', err.message || 'Gagal menyimpan impor jadwal');
        } finally {
            setSavingImportExcel(false);
        }
    };

    // ================= FILTER DRAFTS =================
    const filteredDrafts = useMemo(() => {
        return drafts.filter(d => {
            // Search
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchName = d.nama_kegiatan.toLowerCase().includes(q);
                const matchTeam = d.teams.some(t => t.nama_tim.toLowerCase().includes(q) || (t.lokasi_detail || '').toLowerCase().includes(q));
                if (!matchName && !matchTeam) return false;
            }

            // Status Filter (draft, menunggu_persetujuan, dikembalikan, terintegrasi, all) - Hanya jika bukan mode tempat sampah
            if (!viewTrash && statusFilter !== 'all') {
                if (statusFilter === 'draft' && d.status !== 'draft') return false;
                if (statusFilter === 'menunggu_persetujuan' && d.status !== 'menunggu_persetujuan') return false;
                if (statusFilter === 'dikembalikan' && d.status !== 'dikembalikan') return false;
                if (statusFilter === 'terintegrasi' && d.status !== 'terintegrasi') return false;
            }

            // Jenis Kegiatan Filter
            if (selectedJenisFilter !== 'all') {
                if (String(d.jenis_kegiatan_id) !== selectedJenisFilter) return false;
            }

            // Tahun Pembuatan & Pelaksanaan Filter
            if (selectedTahunFilter !== 'all') {
                const dStr = String(d.created_at || '');
                const yearMatch = dStr.match(/^(\d{4})/);
                const yr = yearMatch ? yearMatch[1] : (d.created_at ? new Date(d.created_at).getFullYear().toString() : '');
                const matchesTeamYear = d.teams?.some(t => {
                    const startYr = t.tanggal_mulai ? t.tanggal_mulai.substring(0, 4) : '';
                    const endYr = t.tanggal_akhir ? t.tanggal_akhir.substring(0, 4) : '';
                    return startYr === selectedTahunFilter || endYr === selectedTahunFilter;
                });
                if (yr !== selectedTahunFilter && !matchesTeamYear) return false;
            }

            // Bulan Pembuatan & Pelaksanaan Filter
            if (selectedBulanFilter !== 'all') {
                const dStr = String(d.created_at || '');
                const monthMatch = dStr.match(/^\d{4}-(\d{2})/);
                const m = monthMatch ? monthMatch[1] : (d.created_at ? (new Date(d.created_at).getMonth() + 1).toString().padStart(2, '0') : '');
                const matchesTeamMonth = d.teams?.some(t => {
                    const startM = t.tanggal_mulai ? t.tanggal_mulai.substring(5, 7) : '';
                    const endM = t.tanggal_akhir ? t.tanggal_akhir.substring(5, 7) : '';
                    return startM === selectedBulanFilter || endM === selectedBulanFilter;
                });
                if (m !== selectedBulanFilter && !matchesTeamMonth) return false;
            }

            // Filter Bidang (jika filter bidang dipilih)
            if (selectedBidangQueryFilter !== 'all') {
                const bIdStr = String(selectedBidangQueryFilter);
                const matchesPembuat = String(d.pembuat_bidang_id) === bIdStr;
                const matchesBidangIds = String(d.bidang_ids || '').split(',').map(s => s.trim()).includes(bIdStr);
                const matchesOfficerBidang = d.teams?.some(t => 
                    t.officers?.some(o => String(o.bidang_id) === bIdStr)
                );
                if (!matchesPembuat && !matchesBidangIds && !matchesOfficerBidang) return false;
            }

            return true;
        });
    }, [drafts, searchTerm, statusFilter, selectedJenisFilter, selectedTahunFilter, selectedBulanFilter, viewTrash, selectedBidangQueryFilter]);

    // Summary counts
    const summaryStats = useMemo(() => {
        let total = drafts.length;
        let waitingCount = 0;
        let readyCount = 0;
        let integratedCount = 0;

        drafts.forEach(d => {
            d.teams.forEach(t => {
                if (t.status === 'terintegrasi') {
                    integratedCount++;
                } else if (t.is_complete) {
                    readyCount++;
                } else {
                    waitingCount++;
                }
            });
        });

        return { total, waitingCount, readyCount, integratedCount };
    }, [drafts]);

    if (isFullScreenView && !currentActiveDraft) {
        if (loading) {
            return (
                <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="animate-spin text-ppm-blue" />
                    <span className="text-xs font-bold text-slate-500">Mempersiapkan rincian jadwal kegiatan...</span>
                </div>
            );
        }
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
                <AlertCircle size={40} className="text-amber-500" />
                <div className="text-center">
                    <h3 className="text-base font-bold text-slate-800">Draft Jadwal Tidak Ditemukan</h3>
                    <p className="text-xs text-slate-500 mt-1">Draft jadwal yang Anda cari mungkin telah dihapus atau tidak tersedia.</p>
                </div>
                <button
                    onClick={handleCloseDraftDetail}
                    className="px-4 py-2 bg-ppm-blue text-white rounded-xl text-xs font-bold hover:bg-ppm-blue/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                    <ArrowLeft size={14} />
                    <span>Kembali ke Daftar Jadwal</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2 animate-in fade-in duration-300 pb-12 mt-0 pt-0">

            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
                    toastMessage.type === 'success' 
                        ? 'bg-emerald-900/90 text-white border-emerald-500/40' 
                        : 'bg-rose-900/90 text-white border-rose-500/40'
                }`}>
                    {toastMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertCircle size={18} className="text-rose-400 shrink-0" />}
                    <span className="text-xs font-semibold">{toastMessage.text}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75 text-white/80">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Counter Stats: Sejajar dengan tab daftar kegiatan di paling kanan via Portal */}
            {portalTarget && !currentActiveDraft && typeof document !== 'undefined' && createPortal(
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-200">
                    {/* Tombol Impor Excel (di sebelah kiri counter total draft) */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsImportExcelModalOpen(true);
                            setImportExcelFile(null);
                            setImportExcelFileName('');
                            setImportExcelPreview(null);
                            setImportExcelError(null);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/90 hover:border-emerald-300 font-bold text-[11px] rounded-lg shadow-2xs active:scale-95 transition-all cursor-pointer mr-0.5"
                        title="Impor Draft Jadwal Kegiatan dari Berkas Excel (.xlsx)"
                    >
                        <FileSpreadsheet size={13} className="text-emerald-600 shrink-0" />
                        <span>Impor Excel</span>
                    </button>

                    {/* Total Draft */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 transition-colors shadow-2xs cursor-default"
                        title={`Total Draft: ${summaryStats.total} Draft`}
                    >
                        <Layers size={12} className="text-ppm-blue shrink-0" />
                        <span className="text-[11px] font-black text-slate-800 leading-none">{summaryStats.total}</span>
                    </div>

                    {/* Menunggu Jadwal */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 transition-colors shadow-2xs cursor-default"
                        title={`Menunggu Jadwal: ${summaryStats.waitingCount} Tim`}
                    >
                        <Clock size={12} className="text-amber-500 shrink-0" />
                        <span className="text-[11px] font-black text-amber-600 leading-none">{summaryStats.waitingCount}</span>
                    </div>

                    {/* Siap Integrasi - GitMerge */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 transition-colors shadow-2xs cursor-default"
                        title={`Siap Integrasi: ${summaryStats.readyCount} Tim`}
                    >
                        <GitMerge size={12} className="text-sky-500 shrink-0" />
                        <span className="text-[11px] font-black text-sky-600 leading-none">{summaryStats.readyCount}</span>
                    </div>

                    {/* Sudah Aktif */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg text-slate-700 transition-colors shadow-2xs cursor-default"
                        title={`Sudah Aktif: ${summaryStats.integratedCount} Tim`}
                    >
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[11px] font-black text-emerald-600 leading-none">{summaryStats.integratedCount}</span>
                    </div>
                </div>,
                portalTarget
            )}

            {/* Filter & Search Bar: Hanya ditampilkan pada mode list draft */}
            {!currentActiveDraft && (
                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                    {/* Filter & Pencarian (Kiri) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Search Input */}
                        <div className="relative w-44 sm:w-52 lg:w-56">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari draft kegiatan..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-ppm-blue transition-colors font-medium placeholder:text-slate-400"
                                style={{ color: '#1e293b' }}
                            />
                        </div>

                        {/* Filter Bidang (Pimpinan / Superadmin / Sekretaris) */}
                        {isGlobalOrInstansiUser && bidangList.length > 0 && (
                            <select
                                value={selectedBidangQueryFilter}
                                onChange={e => setSelectedBidangQueryFilter(e.target.value)}
                                className="w-32 lg:w-36 px-2.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold shrink-0 truncate cursor-pointer"
                                style={{ color: '#1e293b' }}
                                title="Filter Bidang Kegiatan"
                            >
                                <option value="all">Semua Bidang</option>
                                {bidangList.map(b => (
                                    <option key={b.id} value={String(b.id)} className="text-slate-800 bg-white font-medium" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                                        {b.singkatan ? `Bidang ${b.singkatan}` : b.nama_bidang}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Indikator Bidang untuk User Bidang */}
                        {!isGlobalOrInstansiUser && (user?.bidang_singkatan || user?.bidang_nama) && (
                            <div 
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl shrink-0"
                                title="Draft kegiatan difilter otomatis khusus bidang Anda"
                            >
                                <Building2 size={13} className="text-indigo-500 shrink-0" />
                                <span>Bidang {user.bidang_singkatan || user.bidang_nama}</span>
                            </div>
                        )}

                        {/* Dropdown Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="w-28 px-2.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold shrink-0 cursor-pointer"
                            style={{ color: '#1e293b' }}
                            title="Filter Status Draft Kegiatan"
                        >
                            <option value="all">Semua Status</option>
                            <option value="draft">Draft</option>
                            <option value="menunggu_persetujuan">Menunggu</option>
                            <option value="dikembalikan">Perlu Revisi</option>
                            <option value="terintegrasi">Terbit</option>
                        </select>

                        {/* Jenis Kegiatan Filter */}
                        <select
                            value={selectedJenisFilter}
                            onChange={e => setSelectedJenisFilter(e.target.value)}
                            className="w-36 max-w-[145px] px-2.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold shrink-0 truncate cursor-pointer"
                            style={{ color: '#1e293b' }}
                            title="Filter Jenis Kegiatan"
                        >
                            <option value="all">Semua Jenis</option>
                            {groupedTipeKegiatan.map(group => (
                                <optgroup key={group.label} label={group.label} className="font-bold text-slate-700 bg-slate-100">
                                    {group.items.map(t => (
                                        <option key={t.id} value={String(t.id)} className="text-slate-800 bg-white font-medium" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                                            {t.nama} ({t.kode})
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>

                        {/* Filter Bulan Pembuatan / Pelaksanaan */}
                        <select
                            value={selectedBulanFilter}
                            onChange={e => setSelectedBulanFilter(e.target.value)}
                            className="w-28 px-2.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold shrink-0 cursor-pointer"
                            style={{ color: '#1e293b' }}
                            title="Filter Bulan Pelaksanaan / Pembuatan Draft"
                        >
                            <option value="all">Semua Bulan</option>
                            <option value="01">Januari</option>
                            <option value="02">Februari</option>
                            <option value="03">Maret</option>
                            <option value="04">April</option>
                            <option value="05">Mei</option>
                            <option value="06">Juni</option>
                            <option value="07">Juli</option>
                            <option value="08">Agustus</option>
                            <option value="09">September</option>
                            <option value="10">Oktober</option>
                            <option value="11">November</option>
                            <option value="12">Desember</option>
                        </select>

                        {/* Filter Tahun Pembuatan / Pelaksanaan */}
                        <select
                            value={selectedTahunFilter}
                            onChange={e => setSelectedTahunFilter(e.target.value)}
                            className="w-20 px-2 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold shrink-0 cursor-pointer"
                            style={{ color: '#1e293b' }}
                            title="Filter Tahun Pelaksanaan / Pembuatan Draft"
                        >
                            <option value="all">Semua Thn</option>
                            {availableYears.map(yr => (
                                <option key={yr} value={String(yr)}>
                                    {yr}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tombol Aksi (Kanan) */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Tombol Rekap Jadwal */}
                        <button
                            type="button"
                            onClick={handleOpenRekapModal}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-ppm-blue border border-slate-200 hover:border-ppm-blue/40 font-bold text-xs rounded-xl shadow-2xs active:scale-95 transition-all shrink-0"
                            title="Rekapan Jadwal Penugasan Pegawai & Kegiatan"
                        >
                            <Table size={14} className="text-ppm-blue" />
                            <span>Rekap Jadwal</span>
                        </button>

                        {/* Tombol Tempat Sampah */}
                        <button
                            type="button"
                            onClick={() => setViewTrash(!viewTrash)}
                            className={`flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl border shadow-2xs active:scale-95 transition-all shrink-0 ${
                                viewTrash
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                                    : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200 hover:border-rose-300'
                            }`}
                            title={viewTrash ? 'Kembali ke Daftar Aktif' : 'Buka Tempat Sampah Draft Jadwal'}
                        >
                            <Trash2 size={14} className={viewTrash ? 'text-white' : 'text-slate-400 group-hover:text-rose-600'} />
                            <span>Tempat Sampah</span>
                            {trashCount > 0 && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                                    viewTrash ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'
                                }`}>
                                    {trashCount}
                                </span>
                            )}
                        </button>

                        {/* Tombol Buat Draft */}
                        {!viewTrash && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-ppm-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all shrink-0"
                            >
                                <Plus size={14} className="stroke-[3]" />
                                <span>Buat Draft</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Banner Mode Tempat Sampah */}
            {viewTrash && !currentActiveDraft && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                            <Trash2 size={18} />
                        </div>
                        <div>
                            <div className="text-xs font-black tracking-tight text-rose-950 flex items-center gap-2">
                                <span>Mode Tempat Sampah Draft Jadwal</span>
                                <span className="px-2 py-0.5 bg-rose-200/70 text-rose-800 text-[10px] rounded-full font-bold">
                                    {filteredDrafts.length} item
                                </span>
                            </div>
                            <p className="text-[11px] text-rose-700 font-medium">
                                Menampilkan draft kegiatan yang telah dihapus. Anda dapat memulihkannya ke daftar aktif atau menghapusnya secara permanen.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setViewTrash(false)}
                        className="px-3.5 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all shrink-0 self-start sm:self-auto shadow-2xs cursor-pointer"
                    >
                        ← Kembali ke Daftar Aktif
                    </button>
                </div>
            )}

            {/* Active Draft Workspace OR Draft Cards List */}
            {currentActiveDraft ? (
                /* ================= FULL SCREEN WORKSPACE / DEDICATED TAB DETAIL ================= */
                (() => {
                    const viewMode = draftViewMode[currentActiveDraft.id] || 'matrix';

                    // Unique team names in this draft
                    const teamNames = Array.from(new Set(currentActiveDraft.teams.map(t => t.nama_tim || 'Tim 1'))).sort((a, b) =>
                        a.localeCompare(b, undefined, { numeric: true })
                    );
                    if (teamNames.length === 0) teamNames.push('Tim 1');

                    // Group teams by date
                    const dateMap: Record<string, DraftTeamItem[]> = {};
                    const noDateTeams: DraftTeamItem[] = [];

                    currentActiveDraft.teams.forEach(t => {
                        if (t.tanggal_mulai) {
                            if (!dateMap[t.tanggal_mulai]) {
                                dateMap[t.tanggal_mulai] = [];
                            }
                            dateMap[t.tanggal_mulai].push(t);
                        } else {
                            noDateTeams.push(t);
                        }
                    });

                    const matrixRows: {
                        key: string;
                        dateStr: string | null;
                        formattedDate: string;
                        teamsByCol: Record<string, DraftTeamItem>;
                        allTeamsInRow: DraftTeamItem[];
                    }[] = [];

                    const sortedDates = Object.keys(dateMap).sort();
                    sortedDates.forEach(d => {
                        const teamsByCol: Record<string, DraftTeamItem> = {};
                        dateMap[d].forEach(item => {
                            teamsByCol[item.nama_tim] = item;
                        });

                        matrixRows.push({
                            key: d,
                            dateStr: d,
                            formattedDate: formatTanggalIndo(d),
                            teamsByCol,
                            allTeamsInRow: dateMap[d]
                        });
                    });

                    if (noDateTeams.length > 0) {
                        const teamsByCol: Record<string, DraftTeamItem> = {};
                        noDateTeams.forEach(item => {
                            teamsByCol[item.nama_tim] = item;
                        });
                        matrixRows.push({
                            key: '__no_date__',
                            dateStr: null,
                            formattedDate: 'Belum Ditentukan Tanggal',
                            teamsByCol,
                            allTeamsInRow: noDateTeams
                        });
                    }

                    const isCurrentDraftLocked = Boolean(currentActiveDraft.status === 'terintegrasi' && !unlockedDraftIds[currentActiveDraft.id]);
                    const canUnlockCurrentDraft = checkUserCanUnlockDraft(currentActiveDraft, user);

                    return (
                        <div className={isFullScreenView 
                            ? "fixed inset-0 z-[9999] bg-slate-50 flex flex-col overflow-y-auto p-4 md:p-6 animate-in fade-in duration-200" 
                            : "space-y-4 animate-in fade-in duration-200"
                        }>
                            {/* Workspace Sticky Top Bar */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-2 z-20">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    {/* Baris Atas: Tombol Kembali & Nama Kegiatan */}
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            onClick={handleBackButtonClick}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs shrink-0"
                                            title="Kembali dan tutup jadwal kegiatan"
                                        >
                                            <ArrowLeft size={13} className="stroke-[2.5]" />
                                            <span>Kembali</span>
                                        </button>

                                        <h1 className="text-base md:text-xl font-black text-slate-800 tracking-tight leading-snug truncate">
                                            {currentActiveDraft.nama_kegiatan}
                                        </h1>
                                    </div>

                                    {/* Baris Bawah: Badges (Ukuran Font Kecil Sama Seperti Counter) */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Badge Jenis Kegiatan */}
                                        {(() => {
                                            const badge = getBadgeColorStyle(currentActiveDraft.jenis_kegiatan_kode, currentActiveDraft.jenis_kegiatan_nama);
                                            return (
                                                <span 
                                                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold border shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                                                    style={badge.style}
                                                >
                                                    {currentActiveDraft.jenis_kegiatan_kode || 'DL'} • {currentActiveDraft.jenis_kegiatan_nama || 'Dinas Luar'}
                                                </span>
                                            );
                                        })()}

                                        {/* Status Badge */}
                                        {(() => {
                                            const uniqueTeamsCount = Array.from(new Set(currentActiveDraft.teams.map(t => (t.nama_tim || '').trim()).filter(Boolean))).length || currentActiveDraft.total_teams;
                                            const uniqueDaysCount = Array.from(new Set(currentActiveDraft.teams.map(t => t.tanggal_mulai).filter(Boolean))).length || (currentActiveDraft.total_days || 0);
                                            const totalSchedules = currentActiveDraft.teams.length;

                                            if (currentActiveDraft.status === 'terintegrasi') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                        <Check size={12} />
                                                        Jadwal Terbit ({currentActiveDraft.integrated_teams}/{totalSchedules} Jadwal)
                                                    </span>
                                                );
                                            }
                                            if (currentActiveDraft.status === 'menunggu_persetujuan') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                        <Clock size={12} className="animate-pulse" />
                                                        Menunggu Persetujuan Katim
                                                    </span>
                                                );
                                            }
                                            if (currentActiveDraft.status === 'dikembalikan') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                        <AlertTriangle size={12} />
                                                        Perlu Revisi
                                                    </span>
                                                );
                                            }
                                            if (currentActiveDraft.status === 'sebagian') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Sebagian Terbit ({currentActiveDraft.integrated_teams}/{totalSchedules} Jadwal)
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Tahap Draft ({uniqueTeamsCount} Tim{uniqueDaysCount > 1 ? ` • ${uniqueDaysCount} Hari` : ''})
                                                </span>
                                            );
                                        })()}

                                        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                            Dibuat oleh <strong className="text-slate-600 font-semibold">{currentActiveDraft.pembuat_nama || 'User'}</strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Actions on Top Bar */}
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                    {/* Tombol Cetak */}
                                    <button
                                        onClick={() => handlePrintDraft(currentActiveDraft)}
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                        title="Cetak Jadwal Kegiatan ini"
                                    >
                                        <Printer size={14} className="text-slate-600" />
                                        <span>Cetak</span>
                                    </button>

                                    {/* Tombol Riwayat (Jam) */}
                                    <button
                                        onClick={() => setViewingHistoryDraft(currentActiveDraft)}
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                        title="Riwayat Draft & Status Persetujuan"
                                    >
                                        <History size={14} className="text-slate-600" />
                                        <span>Riwayat</span>
                                    </button>

                                    {/* Tambah Tanggal */}
                                    <button
                                        onClick={() => handleOpenAddDateModal(currentActiveDraft)}
                                        disabled={isCurrentDraftLocked}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs ${
                                            isCurrentDraftLocked 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                                                : 'bg-blue-50 hover:bg-blue-100 text-ppm-blue cursor-pointer'
                                        }`}
                                        title={isCurrentDraftLocked ? 'Jadwal terkunci. Buka kunci terlebih dahulu untuk menambah tanggal' : 'Tambah baris tanggal kegiatan'}
                                    >
                                        <CalendarPlus size={14} className="stroke-[2.5]" />
                                        <span>Tambah Tanggal</span>
                                    </button>

                                    {/* Tambah Tim */}
                                    <button
                                        onClick={() => handleAddTeamToDraft(currentActiveDraft)}
                                        disabled={isCurrentDraftLocked}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                            isCurrentDraftLocked 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                                        }`}
                                        title={isCurrentDraftLocked ? 'Jadwal terkunci. Buka kunci terlebih dahulu untuk menambah kolom tim' : 'Tambah kolom tim baru'}
                                    >
                                        <Users size={14} className="text-slate-500" />
                                        <span>Tambah Tim</span>
                                    </button>

                                    {/* Tombol Ajukan ke Ketua Tim / Status Approval / Lock Controls */}
                                    {currentActiveDraft.status === 'menunggu_persetujuan' ? (
                                        <span className="px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                                            <Clock size={14} className="stroke-[2.5] text-amber-600 animate-pulse" />
                                            <span>Menunggu Katim</span>
                                        </span>
                                    ) : currentActiveDraft.status === 'dikembalikan' ? (
                                        <button
                                            onClick={() => handleOpenSubmitKatimModal(currentActiveDraft)}
                                            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
                                            title="Jadwal telah dikembalikan oleh Ketua Tim. Lakukan perbaikan dan ajukan ulang."
                                        >
                                            <Send size={13} className="stroke-[2.5]" />
                                            <span>Ajukan Ulang ke Katim</span>
                                        </button>
                                    ) : currentActiveDraft.status !== 'terintegrasi' ? (
                                        <button
                                            onClick={() => handleOpenSubmitKatimModal(currentActiveDraft)}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95"
                                            title="Ajukan jadwal ke Ketua Tim untuk persetujuan"
                                        >
                                            <Send size={13} className="stroke-[2.5]" />
                                            <span>Ajukan ke Ketua Tim</span>
                                            {currentActiveDraft.ready_teams > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/25 text-white font-black">
                                                    {currentActiveDraft.ready_teams} Siap
                                                </span>
                                            )}
                                        </button>
                                    ) : isCurrentDraftLocked ? (
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                                <Check size={13} className="stroke-[3]" />
                                                <span>Terbit</span>
                                            </span>
                                            {canUnlockCurrentDraft ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setUnlockModalDraft(currentActiveDraft)}
                                                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                                                    title="Buka proteksi kunci untuk mengedit jadwal yang sudah terbit"
                                                >
                                                    <Unlock size={14} className="stroke-[2.5]" />
                                                    <span>Buka Kunci Perubahan</span>
                                                </button>
                                            ) : (
                                                <span 
                                                    className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                                                    title="Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft ini yang dapat membuka proteksi pengeditan"
                                                >
                                                    <Lock size={13} className="text-slate-400" />
                                                    <span>Terkunci (Akses Khusus)</span>
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 animate-pulse">
                                                <Unlock size={13} className="stroke-[2.5] text-amber-600" />
                                                <span>Mode Edit Aktif</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRelockDraft(currentActiveDraft.id)}
                                                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                                                title="Kunci kembali jadwal ini untuk melindungi dari perubahan tidak disengaja"
                                            >
                                                <Lock size={14} className="stroke-[2.5]" />
                                                <span>Kunci Kembali</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Alert Banner: Jadwal Terbit Terkunci vs Mode Edit Aktif */}
                            {currentActiveDraft.status === 'terintegrasi' && (
                                isCurrentDraftLocked ? (
                                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-slate-700 text-xs animate-in fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-200/80 flex items-center justify-center shrink-0">
                                                <Lock size={16} className="text-slate-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">Jadwal ini telah terbit dan terkunci aman (Read-Only)</div>
                                                <div className="text-slate-500 text-[11px]">
                                                    {canUnlockCurrentDraft 
                                                        ? 'Data sudah terintegrasi ke Daftar Kegiatan & Rekap Logbook Pegawai. Klik Buka Kunci Perubahan jika ada revisi jadwal atau personil.'
                                                        : 'Data sudah terintegrasi ke Daftar Kegiatan & Rekap Logbook Pegawai. Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft yang dapat membuka proteksi pengeditan.'}
                                                </div>
                                            </div>
                                        </div>
                                        {canUnlockCurrentDraft && (
                                            <button
                                                type="button"
                                                onClick={() => setUnlockModalDraft(currentActiveDraft)}
                                                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs"
                                            >
                                                <Unlock size={13} />
                                                <span>Buka Kunci</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-amber-900 text-xs animate-in fade-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
                                                <Unlock size={16} className="text-amber-800 animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-amber-900">Perhatian: Mode Pengeditan Jadwal Terbit Aktif (Live Auto-Sync)</div>
                                                <div className="text-amber-700 text-[11px]">Setiap perubahan tanggal, lokasi, atau petugas yang Anda simpan akan langsung memperbarui Daftar Kegiatan dan Logbook Pegawai terkait.</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRelockDraft(currentActiveDraft.id)}
                                            className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-2xs cursor-pointer"
                                        >
                                            <Lock size={13} />
                                            <span>Selesai Edit & Kunci</span>
                                        </button>
                                    </div>
                                )
                            )}

                            {/* Alert Banner: Catatan Pengembalian Katim */}
                            {currentActiveDraft.status === 'dikembalikan' && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 animate-in fade-in">
                                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5 text-xs flex-1">
                                        <div className="font-bold flex items-center gap-2 text-rose-800">
                                            <span>Jadwal Dikembalikan oleh Ketua Tim {currentActiveDraft.ketua_tim_nama ? `(${currentActiveDraft.ketua_tim_nama})` : ''} untuk Revisi</span>
                                        </div>
                                        {currentActiveDraft.catatan_katim ? (
                                            <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200 font-medium text-rose-800">
                                                <strong>Catatan Katim:</strong> "{currentActiveDraft.catatan_katim}"
                                            </div>
                                        ) : (
                                            <p className="text-rose-700">Silakan sesuaikan kembali susunan tim, tanggal, atau petugas lalu ajukan ulang ke Ketua Tim.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Banner: Menunggu Verifikasi Katim */}
                            {currentActiveDraft.status === 'menunggu_persetujuan' && (
                                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs animate-in fade-in">
                                    <Clock size={16} className="text-amber-600 shrink-0" />
                                    <span>
                                        Jadwal ini sedang menunggu persetujuan dari Ketua Tim <strong>{currentActiveDraft.ketua_tim_nama ? `(${currentActiveDraft.ketua_tim_nama})` : ''}</strong>. Kegiatan resmi dan logbook akan terbit otomatis setelah Katim menyetujui.
                                    </span>
                                </div>
                            )}

                            {/* Workspace Body: Full-Width Card */}
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
                                {viewMode === 'matrix' ? (
                                    /* ================= VIEW 1: TABEL MATRIKS JADWAL ================= */
                                    <div className="space-y-4">
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                                            <table className="w-full text-left border-collapse bg-white">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                                                        <th rowSpan={2} className="py-3 px-3 border-r border-slate-200 text-center w-12 text-slate-600 bg-slate-100/90">No</th>
                                                        <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 min-w-[160px] text-slate-800 bg-slate-100/90">Tanggal Pelaksanaan</th>
                                                        {teamNames.map(tName => (
                                                            <th key={tName} colSpan={2} className="py-2.5 px-4 border-r border-slate-200 text-center text-slate-800 bg-slate-200/70 font-black">
                                                                {tName}
                                                            </th>
                                                        ))}
                                                        <th rowSpan={2} className="py-3 px-3 text-center w-20 text-slate-600 bg-slate-100/90">Aksi</th>
                                                    </tr>
                                                    <tr className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                                                        {teamNames.map(tName => (
                                                            <React.Fragment key={tName}>
                                                                <th className="py-2 px-3 border-r border-slate-200 min-w-[150px] text-slate-700">Lokasi</th>
                                                                <th className="py-2 px-3 border-r border-slate-200 min-w-[190px] text-slate-700">Petugas</th>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 text-xs">
                                                    {matrixRows.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={2 + teamNames.length * 2 + 1} className="py-8 text-center text-slate-400 italic">
                                                                Belum ada baris jadwal. Klik "+ Tambah Tanggal" di atas untuk menambahkan tanggal kegiatan.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        matrixRows.map((row, rowIdx) => (
                                                            <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                                                                {/* No */}
                                                                <td className="py-3.5 px-3 border-r border-slate-200 text-center font-bold text-slate-600 align-top">
                                                                    {rowIdx + 1}
                                                                </td>

                                                                {/* Tanggal Pelaksanaan */}
                                                                <td 
                                                                    className={`py-3.5 px-4 border-r border-slate-200 font-bold text-slate-800 align-top transition-colors group ${
                                                                        isCurrentDraftLocked ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50/40'
                                                                    }`}
                                                                    onClick={isCurrentDraftLocked ? undefined : () => handleOpenEditDateModal(currentActiveDraft, row)}
                                                                    title={isCurrentDraftLocked ? 'Jadwal terkunci. Buka kunci untuk mengubah tanggal pelaksanaan' : 'Klik untuk mengubah tanggal pelaksanaan'}
                                                                >
                                                                    <div className="flex items-center justify-between gap-1.5">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Calendar size={13} className="text-slate-400 group-hover:text-ppm-blue transition-colors shrink-0" />
                                                                            <span className={row.dateStr ? 'text-slate-800 font-bold' : 'text-amber-600 italic font-semibold'}>
                                                                                {row.formattedDate}
                                                                            </span>
                                                                        </div>
                                                                        {!isCurrentDraftLocked && (
                                                                            <Edit2 size={11} className="text-slate-300 group-hover:text-ppm-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Team Columns */}
                                                                {teamNames.map(tName => {
                                                                    const teamItem = row.teamsByCol[tName];

                                                                    if (!teamItem) {
                                                                        return (
                                                                            <React.Fragment key={tName}>
                                                                                <td className="py-3.5 px-3 border-r border-slate-200 align-middle text-center" colSpan={2}>
                                                                                    {isCurrentDraftLocked ? (
                                                                                        <span className="text-[11px] text-slate-300 font-semibold italic">-</span>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => handleCreateTeamForDate(currentActiveDraft, tName, row.dateStr)}
                                                                                            className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-200 hover:border-ppm-blue hover:bg-blue-50 text-[11px] font-bold text-slate-500 hover:text-ppm-blue inline-flex items-center gap-1 transition-all"
                                                                                        >
                                                                                            <Plus size={11} />
                                                                                            <span>Atur {tName}</span>
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </React.Fragment>
                                                                        );
                                                                    }

                                                                    const hasLocation = Boolean(teamItem.kecamatan_nama || teamItem.lokasi_detail);
                                                                    const hasOfficers = Boolean(teamItem.officers && teamItem.officers.length > 0);
                                                                    const prevRow = rowIdx > 0 ? matrixRows[rowIdx - 1] : null;
                                                                    const prevTeamItem = prevRow ? prevRow.teamsByCol[tName] : null;
                                                                    const hasPrevOfficers = Boolean(
                                                                        prevTeamItem && (
                                                                            (prevTeamItem.officers && prevTeamItem.officers.length > 0) ||
                                                                            (prevTeamItem.petugas_ids && prevTeamItem.petugas_ids.trim().length > 0)
                                                                        )
                                                                    );
                                                                    const prevOfficerCount = prevTeamItem?.officers?.length || 
                                                                        (prevTeamItem?.petugas_ids ? prevTeamItem.petugas_ids.split(',').filter(Boolean).length : 0);

                                                                    return (
                                                                        <React.Fragment key={tName}>
                                                                            {/* Lokasi (Tim X) */}
                                                                            <td 
                                                                                className={`py-2.5 px-3 border-r border-slate-200 align-top transition-colors group relative ${
                                                                                    isCurrentDraftLocked ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50/30'
                                                                                }`}
                                                                                onClick={isCurrentDraftLocked ? undefined : () => handleOpenEditLocationModal(currentActiveDraft, teamItem)}
                                                                                title={isCurrentDraftLocked ? 'Jadwal terkunci. Buka kunci untuk mengatur kecamatan & lokasi' : 'Klik untuk mengatur kecamatan dan lokasi detail'}
                                                                            >
                                                                                <div className="flex flex-col justify-between min-h-[58px] h-full">
                                                                                    <div className="flex-1">
                                                                                        {hasLocation ? (
                                                                                            <div>
                                                                                                <div className="font-bold text-slate-800 leading-snug">
                                                                                                    {teamItem.kecamatan_nama ? `Kec. ${teamItem.kecamatan_nama}` : ''}
                                                                                                </div>
                                                                                                {teamItem.lokasi_detail && (
                                                                                                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal leading-tight">
                                                                                                        {teamItem.lokasi_detail}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                                                                                                <MapPin size={10} />
                                                                                                Belum Diatur
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Tombol Edit Lokasi di Kanan Bawah */}
                                                                                    {!isCurrentDraftLocked && (
                                                                                        <div className="flex items-center justify-end mt-1.5 pt-0.5">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleOpenEditLocationModal(currentActiveDraft, teamItem);
                                                                                                }}
                                                                                                className="p-1 rounded-md text-slate-400 hover:text-ppm-blue hover:bg-blue-50 hover:shadow-2xs border border-transparent hover:border-slate-200 transition-all opacity-40 group-hover:opacity-100 cursor-pointer"
                                                                                                title="Edit Lokasi"
                                                                                            >
                                                                                                <Edit2 size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </td>

                                                                            {/* Petugas (Tim X) */}
                                                                            <td 
                                                                                className={`py-2.5 px-3 border-r border-slate-200 align-top transition-colors group relative ${
                                                                                    isCurrentDraftLocked ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50/30'
                                                                                }`}
                                                                                onClick={isCurrentDraftLocked ? undefined : () => handleOpenEditOfficersModal(currentActiveDraft, teamItem)}
                                                                                title={isCurrentDraftLocked ? 'Jadwal terkunci. Buka kunci untuk memilih petugas' : 'Klik untuk memilih petugas'}
                                                                            >
                                                                                <div className="flex flex-col justify-between min-h-[58px] h-full">
                                                                                    <div className="flex-1">
                                                                                        {hasOfficers ? (
                                                                                            <ul className="space-y-0.5">
                                                                                                {teamItem.officers!.map(off => (
                                                                                                    <li key={off.id} className="text-slate-800 font-medium flex items-center gap-1.5 leading-snug">
                                                                                                        <span className="text-slate-400 font-bold">•</span>
                                                                                                        <span>{off.nama_lengkap}</span>
                                                                                                        {off.bidang_singkatan && (
                                                                                                            <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded font-bold border border-slate-200">
                                                                                                                {off.bidang_singkatan}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        ) : (
                                                                                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1">
                                                                                                <Users size={10} />
                                                                                                Belum Ditugaskan
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Tombol Aksi di Ujung Kanan Bawah: Ambil dari Hari Sebelumnya & Edit Petugas */}
                                                                                    {!isCurrentDraftLocked && (
                                                                                        <div className="flex items-center justify-end gap-1 mt-1.5 pt-0.5">
                                                                                            {/* Tombol Ambil dari Hari Sebelumnya */}
                                                                                            <button
                                                                                                type="button"
                                                                                                disabled={rowIdx === 0 || !hasPrevOfficers || copyingOfficerTeamId === teamItem.id}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    if (prevTeamItem) {
                                                                                                        handleCopyOfficersFromPreviousDay(currentActiveDraft, teamItem, prevTeamItem);
                                                                                                    }
                                                                                                }}
                                                                                                className={`p-1 rounded-md transition-all ${
                                                                                                    rowIdx > 0 && hasPrevOfficers
                                                                                                        ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-2xs border border-transparent hover:border-emerald-200 opacity-40 group-hover:opacity-100 cursor-pointer'
                                                                                                        : 'text-slate-300 opacity-20 cursor-not-allowed'
                                                                                                }`}
                                                                                                title={
                                                                                                    rowIdx === 0
                                                                                                        ? 'Tidak ada hari pelaksanaan sebelumnya'
                                                                                                        : hasPrevOfficers
                                                                                                        ? `Ambil ${prevOfficerCount} petugas dari hari sebelumnya (${prevRow?.formattedDate})`
                                                                                                        : `Hari sebelumnya (${prevRow?.formattedDate}) belum memiliki petugas`
                                                                                                }
                                                                                            >
                                                                                                {copyingOfficerTeamId === teamItem.id ? (
                                                                                                    <Loader2 size={12} className="animate-spin text-emerald-600" />
                                                                                                ) : (
                                                                                                    <CornerRightDown size={13} className="stroke-[2.5]" />
                                                                                                )}
                                                                                            </button>

                                                                                            {/* Tombol Edit Petugas (Hanya Icon, tulisan Edit Petugas dihilangkan) */}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleOpenEditOfficersModal(currentActiveDraft, teamItem);
                                                                                                }}
                                                                                                className="p-1 rounded-md text-slate-400 hover:text-ppm-blue hover:bg-blue-50 hover:shadow-2xs border border-transparent hover:border-slate-200 transition-all opacity-40 group-hover:opacity-100 cursor-pointer"
                                                                                                title="Edit Petugas"
                                                                                            >
                                                                                                <Edit2 size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </React.Fragment>
                                                                    );
                                                                })}

                                                                {/* Aksi */}
                                                                <td className="py-3.5 px-3 text-center align-middle">
                                                                    {!isCurrentDraftLocked ? (
                                                                        <button
                                                                            onClick={() => handleDeleteDateRow(currentActiveDraft, row)}
                                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                            title="Hapus baris tanggal ini"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="p-1.5 text-slate-300 inline-block" title="Terkunci (Read-Only)">
                                                                            <Lock size={13} />
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Table Footer Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenAddDateModal(currentActiveDraft)}
                                                    disabled={isCurrentDraftLocked}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs ${
                                                        isCurrentDraftLocked
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-ppm-blue cursor-pointer'
                                                    }`}
                                                >
                                                    <CalendarPlus size={14} className="stroke-[2.5]" />
                                                    <span>Tambah Hari / Tanggal</span>
                                                </button>
                                                <button
                                                    onClick={() => handleAddTeamToDraft(currentActiveDraft)}
                                                    disabled={isCurrentDraftLocked}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                                        isCurrentDraftLocked
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                                                    }`}
                                                >
                                                    <Users size={14} className="text-slate-500" />
                                                    <span>Tambah Kolom Tim</span>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!isCurrentDraftLocked ? (
                                                    <button
                                                        onClick={handleSaveDraftSchedule}
                                                        disabled={savingDraftSchedule}
                                                        className="px-5 py-2.5 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Simpan jadwal kegiatan"
                                                    >
                                                        {savingDraftSchedule ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Save size={14} className="stroke-[2.5]" />
                                                        )}
                                                        <span>Simpan Perubahan</span>
                                                    </button>
                                                ) : (
                                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                                                        <Lock size={12} />
                                                        <span>Mode Terkunci (Read-Only)</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ================= VIEW 2: KARTU TIM ================= */
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                        {currentActiveDraft.teams.map((team, idx) => {
                                            const isTeamIntegrated = team.status === 'terintegrasi';

                                            return (
                                                <div 
                                                    key={team.id}
                                                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                                                        isTeamIntegrated 
                                                            ? 'bg-emerald-50/30 border-emerald-200' 
                                                            : team.is_complete
                                                            ? 'bg-sky-50/20 border-sky-200 hover:border-sky-300'
                                                            : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                                                                    isTeamIntegrated 
                                                                        ? 'bg-emerald-600 text-white' 
                                                                        : 'bg-ppm-blue text-white'
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="font-black text-sm text-slate-800 tracking-tight" style={{ color: '#1e293b' }}>
                                                                    {team.nama_tim}
                                                                </span>
                                                            </div>

                                                            {isTeamIntegrated ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                                                    <Check size={10} />
                                                                    Aktif
                                                                </span>
                                                            ) : team.is_complete ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-800">
                                                                    Siap Integrasi
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800">
                                                                    Perlu Diatur
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 text-xs mb-4">
                                                            <div className="flex items-start gap-2">
                                                                <Calendar size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                                {team.tanggal_mulai ? (
                                                                    <span className="font-semibold text-slate-700" style={{ color: '#334155' }}>
                                                                        {formatTanggalIndo(team.tanggal_mulai)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-600 font-semibold italic text-[11px]">
                                                                        Tanggal belum ditentukan
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-start gap-2">
                                                                <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                                {team.kecamatan_nama ? (
                                                                    <span className="font-semibold text-slate-700" style={{ color: '#334155' }}>
                                                                        Kec. {team.kecamatan_nama}
                                                                        {team.lokasi_detail && (
                                                                            <span className="text-slate-500 font-normal"> - {team.lokasi_detail}</span>
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-amber-600 font-semibold italic text-[11px]">
                                                                        Lokasi belum ditentukan
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-start gap-2">
                                                                <Users size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                                <div className="flex-1">
                                                                    {team.officers && team.officers.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                                            {team.officers.map(off => (
                                                                                <span
                                                                                    key={off.id}
                                                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200"
                                                                                    style={{ color: '#334155' }}
                                                                                >
                                                                                    <span className="truncate max-w-[100px]">{off.nama_lengkap}</span>
                                                                                    {off.bidang_singkatan && (
                                                                                        <span className="text-[8px] px-1 bg-white text-slate-500 rounded font-black border border-slate-200">
                                                                                            {off.bidang_singkatan}
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-amber-600 font-semibold italic text-[11px]">
                                                                            Belum ada pegawai ditugaskan
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {team.keterangan && (
                                                                <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                                                                    <FileText size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                                    <span className="text-slate-500 text-[11px] line-clamp-2">
                                                                        {team.keterangan}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 mt-2">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {isCurrentDraftLocked ? (
                                                                canUnlockCurrentDraft ? (
                                                                    <button
                                                                        onClick={() => setUnlockModalDraft(currentActiveDraft)}
                                                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                                                                        title="Jadwal terbit terkunci. Klik untuk membuka proteksi pengeditan"
                                                                    >
                                                                        <Lock size={12} className="text-amber-600" />
                                                                        <span>Terkunci (Buka Kunci)</span>
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        className="px-2.5 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border border-slate-200 select-none cursor-not-allowed"
                                                                        title="Hanya Ketua Tim, Admin Bidang, atau Pembuat Draft yang dapat membuka proteksi pengeditan"
                                                                    >
                                                                        <Lock size={12} className="text-slate-400" />
                                                                        <span>Terkunci (Akses Khusus)</span>
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenTeamScheduleModal(currentActiveDraft, team)}
                                                                    className="px-2.5 py-1.5 bg-ppm-blue/10 hover:bg-ppm-blue/20 text-ppm-blue rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                                                    title="Atur Tanggal, Lokasi, Petugas, dan Keterangan"
                                                                >
                                                                    <Edit2 size={12} />
                                                                    <span>{isTeamIntegrated ? 'Edit Jadwal & Petugas' : 'Atur Jadwal & Petugas'}</span>
                                                                </button>
                                                            )}

                                                            {!isCurrentDraftLocked && currentActiveDraft.teams.length > 1 && (
                                                                <button
                                                                    onClick={() => handleDeleteTeam(team)}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="Hapus Tim Ini"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                            {isTeamIntegrated ? (
                                                                onNavigateToDaftar && (
                                                                    <button
                                                                        onClick={() => onNavigateToDaftar(team.kegiatan_manajemen_id || undefined)}
                                                                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border border-emerald-200"
                                                                        title="Buka rincian di Daftar Kegiatan"
                                                                    >
                                                                        <span>Buka di Daftar</span>
                                                                        <ArrowRight size={11} />
                                                                    </button>
                                                                )
                                                            ) : team.is_complete ? (
                                                                <button
                                                                    onClick={() => handleIntegrateTeam(team)}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1 shadow-xs transition-all active:scale-95"
                                                                    title="Integrasikan Tim Ini ke Daftar Kegiatan & Logbook"
                                                                >
                                                                    <Send size={11} />
                                                                    <span>Integrasikan</span>
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        </div>

                                        {/* Cards View Footer Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleOpenAddDateModal(currentActiveDraft)}
                                                    disabled={isCurrentDraftLocked}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs ${
                                                        isCurrentDraftLocked
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-ppm-blue cursor-pointer'
                                                    }`}
                                                >
                                                    <CalendarPlus size={14} className="stroke-[2.5]" />
                                                    <span>Tambah Hari / Tanggal</span>
                                                </button>
                                                <button
                                                    onClick={() => handleAddTeamToDraft(currentActiveDraft)}
                                                    disabled={isCurrentDraftLocked}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                                        isCurrentDraftLocked
                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                                                    }`}
                                                >
                                                    <Users size={14} className="text-slate-500" />
                                                    <span>Tambah Kolom Tim</span>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!isCurrentDraftLocked ? (
                                                    <button
                                                        onClick={handleSaveDraftSchedule}
                                                        disabled={savingDraftSchedule}
                                                        className="px-5 py-2.5 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                        title="Simpan jadwal kegiatan"
                                                    >
                                                        {savingDraftSchedule ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Save size={14} className="stroke-[2.5]" />
                                                        )}
                                                        <span>Simpan Perubahan</span>
                                                    </button>
                                                ) : (
                                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                                                        <Lock size={12} />
                                                        <span>Mode Terkunci (Read-Only)</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()
            ) : loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 size={32} className="animate-spin text-ppm-blue" />
                    <span className="text-xs font-semibold">Memuat daftar draft kegiatan & susunan tim...</span>
                </div>
            ) : filteredDrafts.length === 0 ? (
                <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center p-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${viewTrash ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-ppm-blue'}`}>
                        {viewTrash ? <Trash2 size={26} /> : <CalendarPlus size={26} />}
                    </div>
                    <h3 className="text-sm font-black text-slate-800 mb-1">
                        {viewTrash ? 'Tempat Sampah Kosong' : 'Belum Ada Draft Jadwal'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-4">
                        {viewTrash
                            ? 'Tidak ada draft kegiatan yang dihapus atau berada di tempat sampah.'
                            : 'Buat draft kegiatan terlebih dahulu dengan menentukan nama, jenis kegiatan, dan jumlah tim bertugas.'}
                    </p>
                    {viewTrash ? (
                        <button
                            onClick={() => setViewTrash(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                            ← Kembali ke Daftar Aktif
                        </button>
                    ) : (
                        <button
                            onClick={handleOpenCreateModal}
                            className="px-4 py-2 bg-ppm-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                        >
                            + Buat Draft Jadwal Sekarang
                        </button>
                    )}
                </div>
            ) : (
                /* ================= LIST OF DRAFTS VIEW (WITHOUT EXPAND/COLLAPSE) ================= */
                <div className="space-y-4">
                    {filteredDrafts.map((draft, idx) => {
                        const badge = getBadgeColorStyle(draft.jenis_kegiatan_kode, draft.jenis_kegiatan_nama);

                        return (
                            <div 
                                key={draft.id} 
                                className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                            >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    {/* Nama Kegiatan Paling Atas */}
                                    <h2 className="text-base font-black text-slate-800 tracking-tight leading-snug flex items-baseline gap-1.5">
                                        <span className="text-slate-400 font-extrabold text-sm shrink-0">{idx + 1}.</span>
                                        <span>{draft.nama_kegiatan}</span>
                                    </h2>

                                    {/* Badges Row - Font Kecil Sama Seperti Counter */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Badge Bidang */}
                                        {draft.pembuat_bidang_singkatan && (
                                            <span 
                                                className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                                                title={`Bidang Pembuat: ${draft.pembuat_bidang_nama || draft.pembuat_bidang_singkatan}`}
                                            >
                                                {draft.pembuat_bidang_singkatan}
                                            </span>
                                        )}

                                        {/* Badge Jenis Kegiatan */}
                                        <span 
                                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold border shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                                            style={badge.style}
                                        >
                                            {draft.jenis_kegiatan_nama || 'Kegiatan'}
                                        </span>

                                        {/* Status Badge */}
                                        {(() => {
                                            const uniqueTeamsCount = Array.from(new Set(draft.teams.map(t => (t.nama_tim || '').trim()).filter(Boolean))).length || draft.total_teams;
                                            const uniqueDaysCount = Array.from(new Set(draft.teams.map(t => t.tanggal_mulai).filter(Boolean))).length || (draft.total_days || 0);
                                            const totalSchedules = draft.teams.length;

                                            if (draft.status === 'terintegrasi') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                        <Check size={12} />
                                                        Semua Jadwal Aktif ({draft.integrated_teams}/{totalSchedules})
                                                    </span>
                                                );
                                            }
                                            if (draft.status === 'menunggu_persetujuan') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                        <Clock size={12} className="animate-pulse" />
                                                        Menunggu Persetujuan Katim
                                                    </span>
                                                );
                                            }
                                            if (draft.status === 'dikembalikan') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                        <AlertTriangle size={12} />
                                                        Perlu Revisi
                                                    </span>
                                                );
                                            }
                                            if (draft.status === 'sebagian') {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        Sebagian Aktif ({draft.integrated_teams}/{totalSchedules})
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Tahap Draft ({uniqueTeamsCount} Tim{uniqueDaysCount > 1 ? ` • ${uniqueDaysCount} Hari` : ''})
                                                </span>
                                            );
                                        })()}

                                        <span className="text-xs text-slate-400 font-medium">
                                            Dibuat oleh <strong className="text-slate-600 font-semibold">{draft.pembuat_nama || 'User'}</strong>
                                        </span>

                                        {viewTrash && (
                                            <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                <Trash2 size={11} className="text-rose-500" />
                                                <span>Dihapus {draft.deleted_at ? formatDateTimeIndo(String(draft.deleted_at)) : ''} oleh <strong className="font-bold text-rose-900">{draft.penghapus_nama || 'Pengguna'}</strong></span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Summary Pill Bar */}
                                    {(() => {
                                        const uniqueTeamsCount = Array.from(new Set(draft.teams.map(t => (t.nama_tim || '').trim()).filter(Boolean))).length || draft.total_teams;
                                        const uniqueDaysCount = Array.from(new Set(draft.teams.map(t => t.tanggal_mulai).filter(Boolean))).length || (draft.total_days || 0);
                                        const totalSchedules = draft.teams.length;

                                        return (
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                                                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                                    <Users size={13} className="text-slate-400" />
                                                    {uniqueTeamsCount} Tim Bertugas
                                                </span>
                                                {uniqueDaysCount > 1 && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                                            <Calendar size={13} className="text-slate-400" />
                                                            {uniqueDaysCount} Hari Pelaksanaan
                                                        </span>
                                                    </>
                                                )}
                                                <span className="text-slate-300">•</span>
                                                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                                                    <UserCheck size={13} className="text-slate-400" />
                                                    {draft.total_unique_officers} Petugas Terlibat
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                                                    <Check size={13} />
                                                    {draft.ready_teams} dari {totalSchedules} Jadwal Siap
                                                </span>
                                            </div>
                                        );
                                    })()}

                                    {/* Revision Note Pill if returned */}
                                    {draft.status === 'dikembalikan' && draft.catatan_katim && (
                                        <div className="text-[11px] text-rose-700 bg-rose-50/90 px-2.5 py-1 rounded-xl border border-rose-200/70 inline-flex items-center gap-1.5 max-w-fit">
                                            <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                                            <span><strong>Revisi ({draft.ketua_tim_nama || 'Katim'}):</strong> "{draft.catatan_katim}"</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {viewTrash ? (
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        {/* Tombol Pulihkan */}
                                        <button
                                            onClick={() => handleRestoreDraft(draft.id)}
                                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                            title="Pulihkan draft ini ke daftar aktif"
                                        >
                                            <RotateCcw size={13} className="stroke-[2.5]" />
                                            <span>Pulihkan</span>
                                        </button>

                                        {/* Tombol Riwayat (Jam) */}
                                        <button
                                            onClick={() => setViewingHistoryDraft(draft)}
                                            className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-ppm-blue rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                                            title="Riwayat Draft & Modifikasi"
                                        >
                                            <Clock size={14} />
                                        </button>

                                        {/* Tombol Hapus Permanen */}
                                        <button
                                            onClick={() => handlePermanentDeleteDraft(draft.id)}
                                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                            title="Hapus draft secara PERMANEN dari database"
                                        >
                                            <Trash2 size={13} />
                                            <span>Hapus Permanen</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                        {/* Tombol Utama: Kelola Jadwal */}
                                        <button
                                            onClick={() => handleOpenInNewBrowserTab(draft.id)}
                                            className="px-3 py-2 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                                            title="Buka rincian tabel jadwal di tab peramban baru"
                                        >
                                            <ExternalLink size={13} />
                                            <span>Kelola Jadwal</span>
                                        </button>

                                        {/* Tombol Ajukan ke Ketua Tim / Status Approval */}
                                        {draft.status === 'menunggu_persetujuan' ? (
                                            <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1">
                                                <Clock size={12} className="stroke-[2.5] text-amber-600 animate-pulse" />
                                                <span>Menunggu Katim</span>
                                            </span>
                                        ) : draft.status === 'dikembalikan' ? (
                                            <button
                                                onClick={() => handleOpenSubmitKatimModal(draft)}
                                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                                                title="Jadwal dikembalikan untuk revisi. Klik untuk ajukan ulang ke Ketua Tim"
                                            >
                                                <Send size={13} />
                                                <span>Ajukan Ulang</span>
                                            </button>
                                        ) : draft.status !== 'terintegrasi' ? (
                                            <button
                                                onClick={() => handleOpenSubmitKatimModal(draft)}
                                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                                                title="Ajukan jadwal ke Ketua Tim untuk persetujuan"
                                            >
                                                <Send size={13} />
                                                <span>Ajukan</span>
                                            </button>
                                        ) : (
                                            <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                                                <Check size={12} className="stroke-[3]" />
                                                <span>Terbit</span>
                                            </span>
                                        )}

                                        {/* Garis Pembatas */}
                                        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

                                        {/* Tombol Cetak (Icon Saja) */}
                                        <button
                                            onClick={() => handlePrintDraft(draft)}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0"
                                            title="Cetak Jadwal Kegiatan"
                                        >
                                            <Printer size={14} />
                                        </button>

                                        {/* Tombol Edit (Icon Saja) */}
                                        <button
                                            onClick={() => handleOpenEditDraft(draft)}
                                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0"
                                            title="Edit Nama / Jenis Kegiatan"
                                        >
                                            <Edit2 size={14} />
                                        </button>

                                        {/* Tombol Riwayat (Jam) */}
                                        <button
                                            onClick={() => setViewingHistoryDraft(draft)}
                                            className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-ppm-blue rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0"
                                            title="Riwayat Draft & Status Persetujuan"
                                        >
                                            <Clock size={14} />
                                        </button>

                                        {/* Tombol Hapus (Icon Saja) */}
                                        <button
                                            onClick={() => handleDeleteDraft(draft.id)}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center justify-center shrink-0"
                                            title="Hapus Draft Kegiatan"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ================= MODAL 1: BUAT DRAFT JADWAL (Nama, Jenis, & Pembuatan Tim) ================= */}
            {isCreateModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <CalendarPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-base">Buat Draft Jadwal Baru</h3>
                                    <p className="text-[11px] text-slate-400 font-semibold">
                                        Tahap 1: Pengaturan Nama Kegiatan, Jenis Kegiatan, & Susunan Tim
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmitCreateDraft} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                                <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 font-medium">
                                    <Sparkles size={16} className="text-ppm-blue shrink-0 mt-0.5" />
                                    <span>
                                        Tentukan nama kegiatan, jenis kegiatan, dan susunan tim Anda. <strong>Tanggal, lokasi detail, dan penugasan pegawai dapat diatur per tim setelah draft dibuat</strong>.
                                    </span>
                                </div>

                                {/* 1. Nama Kegiatan */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                        Nama Kegiatan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={createNamaKegiatan}
                                        onChange={e => setCreateNamaKegiatan(e.target.value)}
                                        placeholder="Contoh: Monev Terpadu Sarana Fasyankes Semester 2..."
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-ppm-blue transition-colors font-medium placeholder:text-slate-400"
                                        style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                    />
                                </div>

                                {/* 2. Jenis Kegiatan */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                        Jenis Kegiatan <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={createJenisKegiatanId}
                                        onChange={e => setCreateJenisKegiatanId(Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold"
                                        style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                    >
                                        <option value="" disabled className="text-slate-800 bg-white" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>Pilih jenis kegiatan...</option>
                                        {groupedTipeKegiatan.map(group => (
                                            <optgroup key={group.label} label={`-- ${group.label} --`} className="font-bold text-slate-700 bg-slate-100">
                                                {group.items.map(t => (
                                                    <option 
                                                        key={t.id} 
                                                        value={t.id}
                                                        className="text-slate-800 bg-white font-medium"
                                                        style={{ color: '#1e293b', backgroundColor: '#ffffff' }}
                                                    >
                                                        {t.nama} ({t.kode})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Pembuatan Tim */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                                Pembuatan Tim Bertugas <span className="text-rose-500">*</span>
                                            </label>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                Tentukan tim yang akan bertugas. Anda dapat menambah atau mengubah nama tim.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddTeamInput}
                                            className="px-2.5 py-1 bg-ppm-blue/10 hover:bg-ppm-blue/20 text-ppm-blue rounded-xl text-xs font-black flex items-center gap-1 transition-colors"
                                        >
                                            <Plus size={13} className="stroke-[3]" />
                                            <span>Tambah Tim</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 max-h-52 overflow-y-auto custom-scrollbar">
                                        {createTeamNames.map((teamName, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-blue-100 text-ppm-blue flex items-center justify-center text-xs font-black shrink-0">
                                                    {index + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    value={teamName}
                                                    onChange={e => handleTeamNameChange(index, e.target.value)}
                                                    placeholder={`Nama Tim ${index + 1} (misal: Tim Wilayah Barat)...`}
                                                    className="flex-1 px-3 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-ppm-blue font-medium placeholder:text-slate-400"
                                                    style={{ color: '#1e293b', backgroundColor: '#ffffff' }}
                                                />
                                                {createTeamNames.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTeamInput(index)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                                        title="Hapus tim ini"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingDraft}
                                    className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                >
                                    {submittingDraft && <Loader2 size={13} className="animate-spin" />}
                                    <span>Simpan Draft Kegiatan</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL 2: EDIT NAMA & JENIS KEGIATAN DRAFT ================= */}
            {isEditDraftModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 text-sm">Edit Informasi Kegiatan</h3>
                            <button
                                onClick={() => setIsEditDraftModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDraftEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Nama Kegiatan
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editNamaKegiatan}
                                    onChange={e => setEditNamaKegiatan(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-medium"
                                    style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                    Jenis Kegiatan
                                </label>
                                <select
                                    required
                                    value={editJenisKegiatanId}
                                    onChange={e => setEditJenisKegiatanId(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold"
                                    style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                >
                                    {groupedTipeKegiatan.map(group => (
                                        <optgroup key={group.label} label={`-- ${group.label} --`} className="font-bold text-slate-700 bg-slate-100">
                                            {group.items.map(t => (
                                                <option key={t.id} value={t.id} className="text-slate-800 bg-white font-medium" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                                                    {t.nama} ({t.kode})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditDraftModalOpen(false)}
                                    className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingDraftEdit}
                                    className="px-4 py-1.5 bg-ppm-blue text-white text-xs font-bold rounded-xl flex items-center gap-1"
                                >
                                    {savingDraftEdit && <Loader2 size={12} className="animate-spin" />}
                                    <span>Simpan Perubahan</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL 3: ATUR JADWAL & PETUGAS TIM ================= */}
            {isTeamScheduleModalOpen && activeTeam && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-base">
                                        Atur Jadwal & Petugas: {teamFormNama}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-semibold truncate max-w-md">
                                        Kegiatan: {activeDraftForTeam?.nama_kegiatan}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTeamScheduleModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveTeamSchedule} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                                {/* Nama Tim */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        Nama Tim Bertugas
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={teamFormNama}
                                        onChange={e => setTeamFormNama(e.target.value)}
                                        placeholder="Contoh: Tim 1 - Wilayah Barat"
                                        className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-ppm-blue font-semibold"
                                        style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                    />
                                </div>

                                {/* Tanggal Mulai & Tanggal Akhir */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                            Tanggal Mulai <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={teamFormTanggalMulai}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTeamFormTanggalMulai(val);
                                                if (!teamFormTanggalAkhir || teamFormTanggalAkhir < val) {
                                                    setTeamFormTanggalAkhir(val);
                                                }
                                            }}
                                            className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                            Tanggal Selesai
                                        </label>
                                        <input
                                            type="date"
                                            value={teamFormTanggalAkhir}
                                            min={teamFormTanggalMulai}
                                            onChange={e => setTeamFormTanggalAkhir(e.target.value)}
                                            className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-semibold"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        />
                                    </div>
                                </div>

                                {/* Banner Peringatan Bentrok Tanggal Tim */}
                                {teamScheduleDateConflict && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 animate-in fade-in">
                                        <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                        <div className="text-xs">
                                            <p className="font-bold">Rentang Tanggal Tumpang Tindih / Bentrok!</p>
                                            <p className="text-[11px] text-rose-600 mt-0.5">
                                                Rentang tanggal ({teamScheduleDateConflict.targetStr}) menimpa jadwal lain untuk tim ini yang sudah terdaftar pada tanggal <strong>{teamScheduleDateConflict.exStr}</strong>. Mohon gunakan tanggal lain atau hapus jadwal yang bertabrakan terlebih dahulu.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                 {/* Lokasi (Kecamatan + Lokasi Spesifik) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                                Kecamatan Tujuan ({kabupatenInfo.nama}) <span className="text-rose-500">*</span>
                                            </label>
                                            <span className="text-[10px] text-ppm-blue font-bold">
                                                {teamFormKecamatanIds.length > 0 ? `${teamFormKecamatanIds.length} Dipilih` : `${kecamatanList.length} Kecamatan`}
                                            </span>
                                        </div>
                                        
                                        <div className="relative">
                                            <div
                                                onClick={() => {
                                                    const nextState = !isTeamKecamatanDropdownOpen;
                                                    setIsTeamKecamatanDropdownOpen(nextState);
                                                    if (nextState) {
                                                        setTimeout(() => {
                                                            teamKecamatanSearchInputRef.current?.focus();
                                                        }, 50);
                                                    }
                                                }}
                                                className="min-h-[42px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-ppm-blue focus-within:border-ppm-blue transition-all flex items-center justify-between gap-2"
                                            >
                                                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                                    <MapPin size={15} className="text-ppm-blue shrink-0" />
                                                    {teamFormKecamatanIds.length > 0 ? (
                                                        teamFormKecamatanIds.map(kId => {
                                                            const kec = kecamatanList.find(k => String(k.id) === String(kId));
                                                            const name = kec ? kec.nama : kId;
                                                            return (
                                                                <span
                                                                    key={kId}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100/90 text-ppm-blue border border-blue-200 text-[11px] font-bold rounded-md"
                                                                >
                                                                    <span>Kec. {name}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTeamFormKecamatanIds(prev => prev.filter(id => id !== kId));
                                                                        }}
                                                                        className="p-0.5 hover:bg-blue-200 rounded text-blue-600 hover:text-rose-600 transition-colors"
                                                                        title={`Hapus Kec. ${name}`}
                                                                    >
                                                                        <X size={11} />
                                                                    </button>
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            -- Pilih Satu atau Lebih Kecamatan --
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {teamFormKecamatanIds.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTeamFormKecamatanIds([]);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            title="Hapus semua pilihan"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                    <ChevronDown 
                                                        size={16} 
                                                        className={`text-slate-400 transition-transform ${isTeamKecamatanDropdownOpen ? 'rotate-180 text-ppm-blue' : ''}`} 
                                                    />
                                                </div>
                                            </div>

                                            {isTeamKecamatanDropdownOpen && (
                                                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                                                    <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                                                        <Search size={14} className="text-slate-400 shrink-0" />
                                                        <input
                                                            ref={teamKecamatanSearchInputRef}
                                                            type="text"
                                                            placeholder="Cari kecamatan..."
                                                            value={teamKecamatanSearch}
                                                            onChange={e => setTeamKecamatanSearch(e.target.value)}
                                                            className="w-full text-xs bg-transparent border-none outline-none font-medium placeholder:text-slate-400 text-slate-800"
                                                            style={{ color: '#1e293b' }}
                                                        />
                                                        {teamKecamatanSearch && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setTeamKecamatanSearch('')}
                                                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                                        <span>{filteredTeamKecamatanList.length} Kecamatan ({teamFormKecamatanIds.length} dipilih)</span>
                                                        {teamFormKecamatanIds.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setTeamFormKecamatanIds([])}
                                                                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                                            >
                                                                Reset Pilihan
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                                        {filteredTeamKecamatanList.length === 0 ? (
                                                            <div className="py-4 text-center text-xs text-slate-400 italic">
                                                                Kecamatan "{teamKecamatanSearch}" tidak ditemukan
                                                            </div>
                                                        ) : (
                                                            filteredTeamKecamatanList.map(k => {
                                                                const isSelected = teamFormKecamatanIds.includes(k.id);
                                                                return (
                                                                    <div
                                                                        key={k.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setTeamFormKecamatanIds(prev =>
                                                                                prev.includes(k.id)
                                                                                    ? prev.filter(id => id !== k.id)
                                                                                    : [...prev, k.id]
                                                                            );
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                                                            isSelected ? 'bg-blue-50 text-ppm-blue font-bold border border-blue-100' : 'hover:bg-slate-50 text-slate-700 font-medium'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                                                                isSelected ? 'bg-ppm-blue border-ppm-blue text-white' : 'border-slate-300 bg-white'
                                                                            }`}>
                                                                                {isSelected && <Check size={10} className="stroke-[3]" />}
                                                                            </div>
                                                                            <span className="truncate">Kec. {k.nama}</span>
                                                                        </div>
                                                                        {isSelected && <span className="text-[10px] font-bold text-ppm-blue bg-blue-100/60 px-1.5 py-0.5 rounded">Terpilih</span>}
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>

                                                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsTeamKecamatanDropdownOpen(false);
                                                                setTeamKecamatanSearch('');
                                                            }}
                                                            className="px-3 py-1 bg-ppm-blue text-white text-xs font-bold rounded-lg hover:bg-ppm-blue/90"
                                                        >
                                                            Selesai ({teamFormKecamatanIds.length} Dipilih)
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                            Lokasi Spesifik / Desa (Opsional)
                                        </label>
                                        <input
                                            type="text"
                                            value={teamFormLokasiDetail}
                                            onChange={e => setTeamFormLokasiDetail(e.target.value)}
                                            placeholder="Contoh: Desa Sukamaju, Gedung Serbaguna..."
                                            className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-medium placeholder:text-slate-400"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        />
                                    </div>
                                </div>

                                {/* Penugasan Pegawai */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                                Pegawai yang Ditugaskan ({teamFormPetugasIds.length} Dipilih)
                                            </label>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                {showAllPegawai 
                                                    ? 'Menampilkan seluruh pegawai instansi. Peringatan bentrok akan ditampilkan jika pegawai sudah memiliki kegiatan.' 
                                                    : `Menampilkan pegawai di ${user?.bidang_singkatan || user?.bidang_nama || 'bidang Anda'}. Peringatan bentrok akan ditampilkan jika pegawai sudah memiliki kegiatan.`
                                                }
                                            </p>
                                        </div>

                                        {/* Toggle Semua Pegawai (Matching ActivityFormModal) */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                    Semua Pegawai
                                                </span>
                                                <button 
                                                    type="button"
                                                    onClick={() => setShowAllPegawai(!showAllPegawai)}
                                                    className={`w-8 h-4 rounded-full transition-all relative flex items-center ${showAllPegawai ? 'bg-ppm-blue' : 'bg-slate-300'}`}
                                                    title={showAllPegawai ? 'Tampilkan hanya pegawai bidang saya' : 'Tampilkan semua pegawai instansi'}
                                                >
                                                    <div className={`w-3 h-3 rounded-full bg-white shadow-xs transition-all ${showAllPegawai ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleSelectAllFiltered}
                                                className="text-[11px] font-black text-ppm-blue hover:text-blue-700 px-2.5 py-1 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors shrink-0"
                                            >
                                                Pilih Semua
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllFiltered}
                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>

                                    {/* Alert Banner jika ada petugas terpilih yang sudah memiliki kegiatan */}
                                    {teamFormPetugasIds.some(id => (officerAvailabilityMap[id]?.length > 0 || officerDlMap[id])) && (
                                        <div className="p-2.5 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                                            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                                            <div className="space-y-0.5 min-w-0">
                                                <span className="font-bold text-rose-900 block">Pemberitahuan Jadwal Pegawai:</span>
                                                <p className="text-[11px] text-rose-700 leading-relaxed">
                                                    Terdapat petugas terpilih yang sudah memiliki kegiatan lain pada tanggal pelaksanaan ini{teamFormTanggalMulai ? ` (${formatTanggalIndo(teamFormTanggalMulai)})` : ''}.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Search & Bidang Filter for Officers */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari nama pegawai / NIP..."
                                                value={searchOfficer}
                                                onChange={e => setSearchOfficer(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-ppm-blue placeholder:text-slate-400 font-medium"
                                                style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                            />
                                        </div>
                                        <select
                                            value={selectedBidangFilter}
                                            onChange={e => setSelectedBidangFilter(e.target.value)}
                                            className="px-2.5 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-ppm-blue font-medium max-w-[160px] truncate"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        >
                                            <option value="all" className="text-slate-800 bg-white" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>Semua Bidang</option>
                                            {availableBidangs.map(b => (
                                                <option key={b} value={b} className="text-slate-800 bg-white" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>{b}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Officer List Checkbox with Availability Conflict Notification */}
                                    <div className="border border-slate-200 rounded-2xl p-2 max-h-56 overflow-y-auto custom-scrollbar space-y-1 bg-slate-50/50">
                                        {checkingDl || loadingOfficerAvailability ? (
                                            <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                                                <Loader2 size={18} className="animate-spin mb-1 text-ppm-blue" />
                                                <span className="text-[11px] font-bold">Mengecek jadwal ketersediaan pegawai...</span>
                                            </div>
                                        ) : filteredPegawaiInModal.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                                                {showAllPegawai 
                                                    ? 'Tidak ditemukan pegawai sesuai pencarian' 
                                                    : 'Tidak ada pegawai di bidang Anda (aktifkan tombol "Semua Pegawai" di atas untuk melihat bidang lain)'
                                                }
                                            </div>
                                        ) : (
                                            filteredPegawaiInModal.map(p => {
                                                const busyActivities = officerAvailabilityMap[p.id] || (officerDlMap[p.id] ? [{
                                                    tipe: 'DL',
                                                    tipe_nama: 'Dinas Luar',
                                                    nama: officerDlMap[p.id].conflicts[0]?.nama_kegiatan || 'Dinas Luar',
                                                    sesi: 'Full Day'
                                                }] : null);
                                                const isBusy = Boolean(busyActivities && busyActivities.length > 0);
                                                const isSelected = teamFormPetugasIds.includes(p.id);

                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => toggleOfficer(p.id)}
                                                        className={`p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all text-xs cursor-pointer ${
                                                            isSelected
                                                                ? isBusy
                                                                    ? 'bg-rose-50/90 border border-rose-300 shadow-2xs'
                                                                    : 'bg-blue-50/90 border border-ppm-blue shadow-2xs'
                                                                : isBusy
                                                                ? 'bg-rose-50/30 hover:bg-rose-50/60 border border-rose-200/60'
                                                                : 'bg-white hover:bg-slate-100/80 border border-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {}}
                                                                className={`rounded-md cursor-pointer ${
                                                                    isBusy
                                                                        ? 'border-rose-300 text-rose-600 focus:ring-rose-500/20'
                                                                        : 'border-slate-300 text-ppm-blue focus:ring-ppm-blue/20'
                                                                }`}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-slate-800 truncate" style={{ color: '#1e293b' }}>
                                                                        {p.nama_lengkap}
                                                                    </span>
                                                                    {(p.bidang_singkatan || p.nama_bidang) && (
                                                                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-black border border-slate-200">
                                                                            {p.bidang_singkatan || p.nama_bidang}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {p.nip && (
                                                                    <span className="text-[10px] text-slate-400 block">NIP: {p.nip}</span>
                                                                )}
                                                                {isBusy && (
                                                                    <div 
                                                                        className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 mt-0.5"
                                                                        title={busyActivities.map(a => `• ${a.nama || a.tipe_nama || a.tipe}`).join('\n')}
                                                                    >
                                                                        <AlertCircle size={10} className="text-rose-500 shrink-0" />
                                                                        <span className="truncate">
                                                                            {[...new Set(busyActivities.map(a => a.nama || a.nama_kegiatan || a.tipe_nama || 'Kegiatan'))].join(', ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isBusy && (
                                                            <div className="shrink-0 ml-2">
                                                                <span 
                                                                    title={busyActivities.map(a => `• ${a.tipe_nama || a.tipe}: ${a.nama} (${a.sesi})`).join('\n')}
                                                                    className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200 flex items-center gap-1"
                                                                >
                                                                    <AlertCircle size={10} className="text-rose-500 shrink-0" />
                                                                    {busyActivities[0]?.tipe_nama || 'Bentrok'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Keterangan / Catatan Tambahan */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        Keterangan / Catatan Tim (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={teamFormKeterangan}
                                        onChange={e => setTeamFormKeterangan(e.target.value)}
                                        placeholder="Catatan koordinasi, berkas yang perlu dibawa, dll..."
                                        className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-medium placeholder:text-slate-400"
                                        style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400 font-semibold">
                                    {teamFormPetugasIds.length > 0 ? `${teamFormPetugasIds.length} pegawai terpilih` : 'Belum ada pegawai'}
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTeamScheduleModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingTeamSchedule || !!teamScheduleDateConflict}
                                        className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                    >
                                        {savingTeamSchedule && <Loader2 size={13} className="animate-spin" />}
                                        <span>Simpan Pengaturan Tim</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL KONFIRMASI INTEGRASI SINGLE TEAM ================= */}
            {integratingTeam && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>

                        <div>
                            <h3 className="font-black text-slate-800 text-base">Integrasikan {integratingTeam.nama_tim}?</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Jadwal ini akan diterbitkan secara resmi ke <strong>Daftar Kegiatan</strong>, <strong>Rekap Kegiatan</strong>, serta otomatis mengisi <strong>Logbook Pegawai (Pagi & Siang)</strong> untuk seluruh petugas yang ditugaskan.
                            </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Tanggal:</span>
                                <span className="font-bold text-slate-700">{integratingTeam.tanggal_mulai}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Tujuan:</span>
                                <span className="font-bold text-slate-700">Kec. {integratingTeam.kecamatan_nama || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Petugas:</span>
                                <span className="font-bold text-slate-700">{integratingTeam.total_petugas} Pegawai</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIntegratingTeam(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmIntegrateTeam}
                                disabled={isIntegratingAction}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {isIntegratingAction && <Loader2 size={13} className="animate-spin" />}
                                <span>Ya, Terbitkan Kegiatan</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL KONFIRMASI AJUKAN KE KETUA TIM ================= */}
            {submitKatimDraft && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                submitKatimDraft.status === 'dikembalikan' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                                <Send size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-base">
                                    {submitKatimDraft.status === 'dikembalikan' ? 'Ajukan Ulang Jadwal ke Ketua Tim?' : 'Ajukan Jadwal ke Ketua Tim?'}
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold">
                                    Verifikasi & persetujuan jadwal di Kotak Masuk Terpadu
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Apakah Anda yakin ingin mengajukan jadwal kegiatan{' '}
                                <strong className="text-slate-900 font-black">"{submitKatimDraft.nama_kegiatan}"</strong>{' '}
                                ke Ketua Tim untuk diverifikasi dan disetujui?
                            </p>
                        </div>

                        {/* Pilihan Ketua Tim */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="block text-xs font-bold text-slate-700">
                                    Pilih Ketua Tim Penanggung Jawab / Verifikator:
                                </label>
                                {user?.bidang_id && (
                                    <button
                                        type="button"
                                        onClick={() => handleToggleShowAllKatim(!showAllKatimBidang)}
                                        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                            showAllKatimBidang 
                                                ? 'bg-blue-50 text-ppm-blue border-ppm-blue/50 shadow-2xs' 
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                        }`}
                                        title={showAllKatimBidang ? 'Sedang menampilkan semua bidang. Klik untuk kembali khusus bidang Anda.' : 'Klik untuk menampilkan Ketua Tim dari semua bidang'}
                                    >
                                        <span>Semua Bidang</span>
                                        <div className={`w-7 h-3.5 rounded-full transition-colors relative flex items-center ${
                                            showAllKatimBidang ? 'bg-ppm-blue justify-end pr-0.5' : 'bg-slate-300 justify-start pl-0.5'
                                        }`}>
                                            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                                        </div>
                                    </button>
                                )}
                            </div>

                            {loadingKatimList ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400 py-3 bg-slate-50 rounded-xl px-3 border border-slate-200">
                                    <Loader2 size={14} className="animate-spin text-ppm-blue" />
                                    <span>Memuat daftar Ketua Tim...</span>
                                </div>
                            ) : displayedKatimList.length === 0 ? (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Belum ada Ketua Tim terdaftar khusus di bidang Anda.</p>
                                        <p className="text-[11px] text-amber-700 mt-0.5">
                                            Aktifkan tombol <strong>"Semua Bidang"</strong> di atas untuk memilih Ketua Tim dari bidang lain.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                                    {displayedKatimList.map(k => {
                                        const kId = Number(k.id || k.user_id);
                                        const isSelected = selectedKatimId === kId;
                                        return (
                                            <div
                                                key={kId}
                                                onClick={() => setSelectedKatimId(kId)}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                                                    isSelected
                                                        ? 'bg-blue-50/80 border-ppm-blue shadow-2xs ring-1 ring-ppm-blue/50'
                                                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected ? 'border-ppm-blue bg-ppm-blue' : 'border-slate-300 bg-white'
                                                    }`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-slate-800 truncate">
                                                            {k.nama_lengkap}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                                                            <span>{k.nama_sub_bidang || k.sub_bidang_nama || k.nama_jabatan || k.jabatan}</span>
                                                            {(k.bidang_singkatan || k.nama_bidang) && (
                                                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                                                                    {k.bidang_singkatan ? `Bidang ${k.bidang_singkatan}` : k.nama_bidang}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span className="text-[10px] font-black text-ppm-blue bg-ppm-blue/10 px-2 py-0.5 rounded-md shrink-0 border border-ppm-blue/20">
                                                        Dipilih
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Catatan Revisi Sebelumnya jika ada */}
                        {submitKatimDraft.status === 'dikembalikan' && submitKatimDraft.catatan_katim && (
                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                                    <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                    <span>Catatan Revisi Sebelumnya dari Katim:</span>
                                </div>
                                <p className="italic text-rose-800 font-medium">"{submitKatimDraft.catatan_katim}"</p>
                            </div>
                        )}

                        {/* Rincian Kesiapan Draft */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Jenis Kegiatan:</span>
                                <span className="font-black text-slate-800">
                                    {submitKatimDraft.jenis_kegiatan_nama || 'Dinas Luar'}
                                </span>
                            </div>
                            {(() => {
                                const uniqueTeamsCount = Array.from(new Set(submitKatimDraft.teams.map(t => (t.nama_tim || '').trim()).filter(Boolean))).length || submitKatimDraft.total_teams;
                                const uniqueDaysCount = Array.from(new Set(submitKatimDraft.teams.map(t => t.tanggal_mulai).filter(Boolean))).length || (submitKatimDraft.total_days || 0);
                                const totalSchedules = submitKatimDraft.teams.length;

                                return (
                                    <>
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Susunan Tim:</span>
                                            <span className="font-black text-slate-800">
                                                {uniqueTeamsCount} Tim Bertugas {uniqueDaysCount > 1 ? `(${uniqueDaysCount} Hari Pelaksanaan)` : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600">
                                            <span>Kesiapan Jadwal:</span>
                                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                {submitKatimDraft.ready_teams} dari {totalSchedules} Jadwal Siap Diajukan
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Banner Pemberitahuan Kotak Masuk */}
                        <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-blue-800">
                                <Sparkles size={13} className="text-blue-600 shrink-0" />
                                <span>Alur Persetujuan di Kotak Masuk Terpadu</span>
                            </div>
                            <p>
                                Jadwal ini akan dikirimkan ke <strong>Kotak Masuk Terpadu Ketua Tim</strong>. Setelah disetujui oleh Ketua Tim, jadwal akan otomatis diterbitkan ke <strong>Daftar Kegiatan Resmi</strong> dan tercatat pada <strong>Logbook Seluruh Petugas yang Ditugaskan</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setSubmitKatimDraft(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmSubmitKatim}
                                disabled={submittingToKatim || !selectedKatimId || submitKatimDraft.ready_teams === 0}
                                className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 ${
                                    submitKatimDraft.status === 'dikembalikan'
                                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 shadow-rose-500/20'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                                }`}
                            >
                                {submittingToKatim ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                                <span>
                                    {submitKatimDraft.status === 'dikembalikan' ? 'Ya, Ajukan Ulang ke Ketua Tim' : 'Ya, Ajukan ke Ketua Tim'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL BUKA KUNCI PERUBAHAN JADWAL TERBIT (OPSI 1) ================= */}
            {unlockModalDraft && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                                <Unlock size={24} className="stroke-[2.5]" />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-base">
                                    Buka Kunci Perubahan Jadwal Terbit?
                                </h3>
                                <p className="text-xs text-slate-400 font-semibold">
                                    Proteksi Keamanan Jadwal Terintegrasi & Logbook Pegawai
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200/90 text-xs text-amber-900 space-y-2">
                            <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                <span>Dampak Perubahan (Live Auto-Sync):</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-amber-950 font-medium leading-relaxed">
                                <li>
                                    Jadwal kegiatan <strong className="font-black">"{unlockModalDraft.nama_kegiatan}"</strong> berstatus <strong>Terbit</strong> dan telah terhubung ke <em>Daftar Kegiatan Resmi</em> serta <em>Logbook Harian Pegawai</em>.
                                </li>
                                <li>
                                    Membuka proteksi kunci akan mengizinkan Anda mengubah tanggal pelaksanaan, kecamatan tujuan, dan susunan personil yang ditugaskan.
                                </li>
                                <li>
                                    Setiap perubahan yang Anda simpan akan <strong>langsung disinkronkan secara otomatis</strong> ke logbook dan agenda seluruh pegawai terkait.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                Alasan Perubahan / Catatan Revisi (Opsional)
                            </label>
                            <input
                                type="text"
                                value={unlockReason}
                                onChange={e => setUnlockReason(e.target.value)}
                                placeholder="Contoh: Pergeseran tanggal atas arahan pimpinan, penggantian personil, dsb..."
                                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-amber-500 font-medium placeholder:text-slate-400"
                                style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setUnlockModalDraft(null);
                                    setUnlockReason('');
                                }}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnlockDraft}
                                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <Unlock size={14} className="stroke-[2.5]" />
                                <span>Ya, Buka Kunci Pengeditan</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL RIWAYAT DRAFT JADWAL ================= */}
            {viewingHistoryDraft && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-7 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800 overflow-hidden"
                        style={{ color: '#1e293b' }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-ppm-blue flex items-center justify-center shrink-0 shadow-sm border border-blue-100/60">
                                    <History size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-800 text-base md:text-lg">Riwayat Perubahan & Aktivitas</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                            Draft #{viewingHistoryDraft.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-semibold line-clamp-1 mt-0.5">
                                        {viewingHistoryDraft.nama_kegiatan}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingHistoryDraft(null)}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {/* Status Box */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-bold">Status Saat Ini:</span>
                                    {(() => {
                                        if (viewingHistoryDraft.status === 'terintegrasi') {
                                            return (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                                                    <Check size={13} className="stroke-[3]" />
                                                    Jadwal Terbit & Terintegrasi
                                                </span>
                                            );
                                        }
                                        if (viewingHistoryDraft.status === 'menunggu_persetujuan') {
                                            return (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 shadow-xs">
                                                    <Clock size={13} className="stroke-[2.5] text-amber-600 animate-pulse" />
                                                    Menunggu Persetujuan Katim
                                                </span>
                                            );
                                        }
                                        if (viewingHistoryDraft.status === 'dikembalikan') {
                                            return (
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 shadow-xs">
                                                    <AlertTriangle size={13} className="text-rose-600" />
                                                    Dikembalikan untuk Revisi
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200/80 text-slate-700 border border-slate-300 flex items-center gap-1.5 shadow-xs">
                                                <Clock size={13} />
                                                Tahap Penyusunan Draft
                                            </span>
                                        );
                                    })()}
                                </div>
                                {viewingHistoryDraft.ketua_tim_nama && (
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                        <span className="text-slate-400 font-medium">Ketua Tim:</span>
                                        <span className="font-bold text-slate-700">{viewingHistoryDraft.ketua_tim_nama}</span>
                                    </div>
                                )}
                            </div>

                            {/* Catatan Katim Alert jika ada catatan */}
                            {viewingHistoryDraft.catatan_katim && (
                                <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/90 text-xs text-rose-800 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                                        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                                        <span>Catatan dari Ketua Tim ({viewingHistoryDraft.ketua_tim_nama || 'Katim'}):</span>
                                    </div>
                                    <p className="italic pl-5 font-medium leading-relaxed">
                                        "{viewingHistoryDraft.catatan_katim}"
                                    </p>
                                </div>
                            )}

                            {/* Timeline Riwayat Lengkap */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={13} className="text-ppm-blue" />
                                    Log Perjalanan & Modifikasi Draft
                                </h4>

                                {viewingHistoryDraft.edit_history && viewingHistoryDraft.edit_history.length > 0 ? (
                                    <div className="relative pl-7 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                                        {viewingHistoryDraft.edit_history.map((h, idx) => {
                                            const isLatest = idx === 0;
                                            let dotColor = 'bg-slate-400 ring-slate-100';
                                            let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                                            let labelAksi = 'Aktivitas';

                                            switch (h.aksi) {
                                                case 'edit':
                                                    dotColor = 'bg-amber-500 ring-amber-100';
                                                    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                                                    labelAksi = 'Modifikasi Tim / Jadwal';
                                                    break;
                                                case 'create':
                                                    dotColor = 'bg-blue-600 ring-blue-100';
                                                    badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
                                                    labelAksi = 'Pembuatan Draft';
                                                    break;
                                                case 'tambah_tim':
                                                    dotColor = 'bg-indigo-600 ring-indigo-100';
                                                    badgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                                                    labelAksi = 'Penambahan Tim';
                                                    break;
                                                case 'hapus_tim':
                                                    dotColor = 'bg-rose-500 ring-rose-100';
                                                    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                                                    labelAksi = 'Penghapusan Tim';
                                                    break;
                                                case 'pengajuan':
                                                    dotColor = 'bg-orange-500 ring-orange-100';
                                                    badgeClass = 'bg-orange-50 text-orange-800 border-orange-200';
                                                    labelAksi = 'Pengajuan ke Katim';
                                                    break;
                                                case 'disetujui':
                                                    dotColor = 'bg-emerald-600 ring-emerald-100';
                                                    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                                                    labelAksi = 'Disetujui Katim';
                                                    break;
                                                case 'dikembalikan':
                                                    dotColor = 'bg-rose-600 ring-rose-100';
                                                    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                                                    labelAksi = 'Dikembalikan Katim';
                                                    break;
                                                case 'import':
                                                    dotColor = 'bg-purple-600 ring-purple-100';
                                                    badgeClass = 'bg-purple-50 text-purple-800 border-purple-200';
                                                    labelAksi = 'Impor Excel';
                                                    break;
                                                case 'hapus':
                                                    dotColor = 'bg-rose-600 ring-rose-100';
                                                    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                                                    labelAksi = 'Dihapus ke Tempat Sampah';
                                                    break;
                                                case 'pulihkan':
                                                    dotColor = 'bg-teal-600 ring-teal-100';
                                                    badgeClass = 'bg-teal-50 text-teal-800 border-teal-200';
                                                    labelAksi = 'Dipulihkan dari Sampah';
                                                    break;
                                            }

                                            return (
                                                <div key={h.id || idx} className="relative">
                                                    <div className={`absolute -left-7 top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white shadow-sm ring-4 ${isLatest ? 'animate-pulse' : ''}`} />
                                                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs hover:border-slate-300 transition-all space-y-1.5">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black border uppercase tracking-wider ${badgeClass}`}>
                                                                    {labelAksi}
                                                                </span>
                                                                {isLatest && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                                                                        Terbaru
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-slate-400 font-semibold">
                                                                {formatDateTimeIndo(h.created_at)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                                                            <User size={13} className="text-slate-400 shrink-0" />
                                                            <span className="text-slate-900">{h.user_nama || 'Pengguna'}</span>
                                                        </div>

                                                        <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                                                            {h.keterangan}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                                        {/* Fallback Titik 1: Pembuatan Draft */}
                                        <div className="relative">
                                            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm ring-4 ring-blue-100" />
                                            <div className="space-y-0.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-800">Draft Dibuat</span>
                                                    <span className="text-[11px] text-slate-400 font-semibold">
                                                        {viewingHistoryDraft.created_at ? formatDateTimeIndo(String(viewingHistoryDraft.created_at)) : '-'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Dibuat oleh <strong className="text-slate-700 font-semibold">{viewingHistoryDraft.pembuat_nama || 'User'}</strong> sebagai draft kegiatan {viewingHistoryDraft.jenis_kegiatan_nama || 'Dinas Luar'}.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Ringkasan Tim & Petugas */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Susunan Tim</span>
                                    <span className="font-black text-slate-800 text-sm">{viewingHistoryDraft.teams.length} Jadwal</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Petugas</span>
                                    <span className="font-black text-slate-800 text-sm">{viewingHistoryDraft.total_unique_officers} Orang</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Kesiapan</span>
                                    <span className="font-black text-emerald-600 text-sm">{viewingHistoryDraft.ready_teams} Siap</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setViewingHistoryDraft(null)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                            >
                                Tutup Riwayat
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL TAMBAH HARI / TANGGAL PELAKSANAAN ================= */}
            {isAddDateModalOpen && activeDraftForAddDate && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <CalendarPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm">Tambah Hari / Tanggal Pelaksanaan</h3>
                                    <p className="text-[11px] text-slate-400 font-semibold truncate max-w-[240px]">
                                        {activeDraftForAddDate.nama_kegiatan}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddDateModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {(() => {
                            const isAddDateConflict = Boolean(
                                activeDraftForAddDate && 
                                newScheduleDate && 
                                activeDraftForAddDate.teams.some(t => t.tanggal_mulai === newScheduleDate)
                            );

                            return (
                                <form onSubmit={handleAddDateSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                            Pilih Tanggal Pelaksanaan Baru <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={newScheduleDate}
                                            onChange={e => setNewScheduleDate(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-ppm-blue font-bold shadow-2xs"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        />
                                        {newScheduleDate && !isAddDateConflict && (
                                            <p className="text-[11px] text-ppm-blue font-bold mt-1">
                                                📅 {formatTanggalIndo(newScheduleDate)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Warning jika tanggal sudah terdaftar */}
                                    {isAddDateConflict && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 animate-in fade-in">
                                            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-bold">Tanggal Sudah Terdaftar!</p>
                                                <p className="text-[11px] text-rose-600 mt-0.5">
                                                    Tanggal {formatTanggalIndo(newScheduleDate)} sudah ada pada jadwal kegiatan ini. Tidak dapat menambahkan tanggal yang sama dua kali.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] text-slate-600 leading-relaxed">
                                        💡 Sistem akan otomatis menambahkan baris tanggal baru ini untuk seluruh tim bertugas pada kegiatan. Setelah ditambahkan, Anda dapat menentukan lokasi dan memilih petugas masing-masing tim.
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddDateModalOpen(false)}
                                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submittingAddDate || !newScheduleDate || isAddDateConflict}
                                            className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                        >
                                            {submittingAddDate && <Loader2 size={13} className="animate-spin" />}
                                            <span>Tambahkan Tanggal</span>
                                        </button>
                                    </div>
                                </form>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL KONFIRMASI INTEGRASI ALL READY TEAMS (LEGACY) ================= */}
            {integratingDraft && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Sparkles size={24} />
                        </div>

                        <div>
                            <h3 className="font-black text-slate-800 text-base">Ajukan {integratingDraft.ready_teams} Tim ke Ketua Tim?</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Seluruh tim yang sudah memiliki tanggal, kecamatan, dan petugas pada kegiatan <strong>"{integratingDraft.nama_kegiatan}"</strong> akan langsung diterbitkan ke <strong>Daftar Kegiatan</strong>, <strong>Logbook Pegawai</strong>, dan kotak masuk Ketua Tim.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIntegratingDraft(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmIntegrateDraft}
                                disabled={isIntegratingAction}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                            >
                                {isIntegratingAction && <Loader2 size={13} className="animate-spin" />}
                                <span>Ya, Ajukan & Terbitkan</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL EDIT TANGGAL PELAKSANAAN ================= */}
            {isEditDateRowModalOpen && editingDateRow && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm">
                                        Edit Tanggal Pelaksanaan
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-semibold truncate max-w-xs">
                                        Kegiatan: {editingDateRow.draft.nama_kegiatan}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditDateRowModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {(() => {
                            const isEditDateRowConflict = Boolean(
                                editingDateRow && 
                                newDateValue && 
                                newDateValue !== editingDateRow.oldDateStr &&
                                editingDateRow.draft.teams.some(t => 
                                    t.tanggal_mulai === newDateValue && 
                                    !editingDateRow.allTeamsInRow.some(editingTeam => editingTeam.id === t.id)
                                )
                            );

                            return (
                                <form onSubmit={handleSaveEditDateRow} className="p-6 space-y-4">
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        Ubah tanggal pelaksanaan untuk baris ini ({editingDateRow.allTeamsInRow.length} tim bertugas).
                                    </p>

                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                            Tanggal Pelaksanaan Baru <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={newDateValue}
                                            onChange={e => setNewDateValue(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-ppm-blue font-semibold"
                                            style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                        />
                                    </div>

                                    {/* Warning jika tanggal bentrok dengan baris lain */}
                                    {isEditDateRowConflict && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 animate-in fade-in">
                                            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <p className="font-bold">Tanggal Bentrok / Sudah Terdaftar!</p>
                                                <p className="text-[11px] text-rose-600 mt-0.5">
                                                    Tanggal {formatTanggalIndo(newDateValue)} sudah digunakan pada baris jadwal lain di draft ini. Mengubah ke tanggal ini akan menyebabkan jadwal bertumpuk / dobel.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditDateRowModalOpen(false)}
                                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingDateRow || !newDateValue || isEditDateRowConflict}
                                            className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                        >
                                            {savingDateRow && <Loader2 size={13} className="animate-spin" />}
                                            <span>Simpan Tanggal</span>
                                        </button>
                                    </div>
                                </form>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL EDIT LOKASI (HANYA KECAMATAN & LOKASI DETAIL) ================= */}
            {isEditLocationModalOpen && editingLocationTeam && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-base">
                                        Edit Lokasi: {editingLocationTeam.team.nama_tim}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold truncate max-w-sm mt-0.5">
                                        Kegiatan: {editingLocationTeam.draft.nama_kegiatan}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditLocationModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditLocation} className="p-6 space-y-5">
                            {/* 1. Kecamatan Tujuan dengan Pencarian (Multi-Select) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                        Kecamatan Tujuan ({kabupatenInfo.nama})
                                    </label>
                                    <span className="text-[10px] text-ppm-blue font-bold">
                                        {locationKecamatanIds.length > 0 ? `${locationKecamatanIds.length} Dipilih` : `${kecamatanList.length} Kecamatan`}
                                    </span>
                                </div>
                                
                                <div className="relative">
                                    {/* Trigger Box */}
                                    <div 
                                        onClick={() => {
                                            const nextState = !isKecamatanDropdownOpen;
                                            setIsKecamatanDropdownOpen(nextState);
                                            if (nextState) {
                                                setTimeout(() => {
                                                    kecamatanSearchInputRef.current?.focus();
                                                }, 50);
                                            }
                                        }}
                                        className="min-h-[46px] px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-ppm-blue focus-within:border-ppm-blue transition-all flex items-center justify-between gap-2"
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                            <MapPin size={16} className="text-ppm-blue shrink-0" />
                                            {locationKecamatanIds.length > 0 ? (
                                                locationKecamatanIds.map(kId => {
                                                    const kec = kecamatanList.find(k => String(k.id) === String(kId));
                                                    const name = kec ? kec.nama : kId;
                                                    return (
                                                        <span
                                                            key={kId}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100/90 text-ppm-blue border border-blue-200 text-xs font-bold rounded-lg shadow-2xs animate-in fade-in zoom-in duration-100"
                                                        >
                                                            <span>Kec. {name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLocationKecamatanIds(prev => prev.filter(id => id !== kId));
                                                                }}
                                                                className="p-0.5 hover:bg-blue-200/90 rounded text-blue-600 hover:text-rose-600 transition-colors"
                                                                title={`Hapus Kec. ${name}`}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium">
                                                    -- Pilih Satu atau Lebih Kecamatan ({kecamatanList.length} Kecamatan) --
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {locationKecamatanIds.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLocationKecamatanIds([]);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                    title="Hapus semua pilihan kecamatan"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                            <ChevronDown 
                                                size={18} 
                                                className={`text-slate-400 transition-transform ${isKecamatanDropdownOpen ? 'rotate-180 text-ppm-blue' : ''}`} 
                                            />
                                        </div>
                                    </div>

                                    {/* Dropdown Menu with Search */}
                                    {isKecamatanDropdownOpen && (
                                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                                            {/* Search Input with Auto Focus */}
                                            <div className="p-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                                                <Search size={15} className="text-slate-400 shrink-0" />
                                                <input
                                                    ref={kecamatanSearchInputRef}
                                                    type="text"
                                                    placeholder="Cari kecamatan..."
                                                    value={kecamatanSearch}
                                                    onChange={e => setKecamatanSearch(e.target.value)}
                                                    className="w-full text-xs bg-transparent border-none outline-none font-medium placeholder:text-slate-400 text-slate-800"
                                                    style={{ color: '#1e293b' }}
                                                />
                                                {kecamatanSearch && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setKecamatanSearch('')}
                                                        className="text-slate-400 hover:text-slate-600 p-0.5"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Toolbar */}
                                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>{filteredKecamatanList.length} Kecamatan ({locationKecamatanIds.length} dipilih)</span>
                                                {locationKecamatanIds.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLocationKecamatanIds([])}
                                                        className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                                    >
                                                        Reset Pilihan
                                                    </button>
                                                )}
                                            </div>

                                            {/* List of Kecamatan */}
                                            <div className="max-h-52 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                                {filteredKecamatanList.length === 0 ? (
                                                    <div className="py-5 text-center text-xs text-slate-400 italic">
                                                        Kecamatan "{kecamatanSearch}" tidak ditemukan
                                                    </div>
                                                ) : (
                                                    filteredKecamatanList.map(k => {
                                                        const isSelected = locationKecamatanIds.includes(k.id);
                                                        return (
                                                            <div
                                                                key={k.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLocationKecamatanIds(prev => 
                                                                        prev.includes(k.id) 
                                                                            ? prev.filter(id => id !== k.id) 
                                                                            : [...prev, k.id]
                                                                    );
                                                                }}
                                                                className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                                                    isSelected ? 'bg-blue-50 text-ppm-blue font-bold border border-blue-100' : 'hover:bg-slate-50 text-slate-700 font-medium'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 truncate">
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                                                        isSelected ? 'bg-ppm-blue border-ppm-blue text-white' : 'border-slate-300 bg-white'
                                                                    }`}>
                                                                        {isSelected && <Check size={12} className="stroke-[3]" />}
                                                                    </div>
                                                                    <span className="truncate">Kec. {k.nama}</span>
                                                                </div>
                                                                {isSelected && <span className="text-[10px] font-bold text-ppm-blue bg-blue-100/60 px-1.5 py-0.5 rounded">Terpilih</span>}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Footer Toolbar */}
                                            <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsKecamatanDropdownOpen(false);
                                                        setKecamatanSearch('');
                                                    }}
                                                    className="px-3 py-1 bg-ppm-blue text-white text-xs font-bold rounded-lg hover:bg-ppm-blue/90"
                                                >
                                                    Selesai ({locationKecamatanIds.length} Dipilih)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Lokasi Detail (Lebar & Multi-line dengan Resizable Textarea) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                        Lokasi Detail / Desa (Opsional)
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                        Dapat diperlebar (multi-line)
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={locationDetail}
                                    onChange={e => setLocationDetail(e.target.value)}
                                    placeholder="Contoh: Puskesmas Cibinong, Kantor Desa Sukamaju, Aula Serbaguna RT 02/05, RSUD Leuwiliang..."
                                    className="w-full px-3.5 py-3 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-ppm-blue font-medium placeholder:text-slate-400 resize-y min-h-[95px] leading-relaxed transition-colors shadow-2xs"
                                    style={{ color: '#1e293b', backgroundColor: '#f8fafc' }}
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsEditLocationModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingLocation}
                                    className="px-5 py-2.5 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                >
                                    {savingLocation && <Loader2 size={13} className="animate-spin" />}
                                    <span>Simpan Lokasi</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL EDIT PETUGAS (HANYA DROPDOWN PETUGAS) ================= */}
            {isEditOfficersModalOpen && editingOfficersTeam && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-ppm-blue/10 text-ppm-blue rounded-xl">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm">
                                        Pilih Petugas: {editingOfficersTeam.team.nama_tim}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-semibold truncate max-w-xs flex items-center gap-1.5 mt-0.5">
                                        <span>Kegiatan: {editingOfficersTeam.draft.nama_kegiatan}</span>
                                        {editingOfficersTeam.team.tanggal_mulai && (
                                            <>
                                                <span className="text-slate-300">•</span>
                                                <span className="text-ppm-blue font-bold">
                                                    {formatTanggalIndo(editingOfficersTeam.team.tanggal_mulai)}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsEditOfficersModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditOfficers} className="flex flex-col flex-1">
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <span>Petugas yang Ditugaskan</span>
                                                {loadingOfficerAvailability && (
                                                    <span className="text-[10px] text-ppm-blue font-bold flex items-center gap-1 normal-case tracking-normal">
                                                        <Loader2 size={10} className="animate-spin" />
                                                        <span>Mengecek jadwal...</span>
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                {showAllPegawai 
                                                    ? 'Menampilkan seluruh bidang pegawai' 
                                                    : `Menampilkan bidang ${user?.bidang_singkatan || user?.bidang_nama || 'Anda'}`
                                                }
                                            </p>
                                        </div>

                                        {/* Toggle Semua Bidang (seperti di daftar kegiatan) */}
                                        <div className="flex items-center gap-2 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                Semua Bidang
                                            </span>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowAllPegawai(!showAllPegawai)}
                                                className={`w-8 h-4 rounded-full transition-all relative ${showAllPegawai ? 'bg-ppm-blue' : 'bg-slate-300'}`}
                                                title={showAllPegawai ? 'Tampilkan hanya pegawai bidang saya' : 'Tampilkan semua bidang'}
                                            >
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showAllPegawai ? 'left-4' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Alert Banner jika ada petugas terpilih yang sudah memiliki kegiatan */}
                                    {officerDropdownPetugasIds.some(id => officerAvailabilityMap[id]?.length > 0) && (
                                        <div className="p-2.5 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
                                            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                                            <div className="space-y-0.5 min-w-0">
                                                <span className="font-bold text-rose-900 block">Pemberitahuan Jadwal Pegawai:</span>
                                                <p className="text-[11px] text-rose-700 leading-relaxed">
                                                    Terdapat petugas terpilih yang sudah memiliki kegiatan lain pada tanggal pelaksanaan ini{editingOfficersTeam.team.tanggal_mulai ? ` (${formatTanggalIndo(editingOfficersTeam.team.tanggal_mulai)})` : ''}.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Dropdown Container */}
                                    <div className="relative">
                                        {/* Dropdown Trigger Box */}
                                        <div 
                                            onClick={() => setIsOfficerDropdownExpanded(!isOfficerDropdownExpanded)}
                                            className="min-h-[46px] p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-ppm-blue focus-within:border-ppm-blue transition-all flex items-center justify-between gap-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                                                {officerDropdownPetugasIds.length === 0 ? (
                                                    <span className="text-xs text-slate-400 font-medium pl-1">
                                                        -- Klik untuk memilih petugas... --
                                                    </span>
                                                ) : (
                                                    officerDropdownPetugasIds.map(id => {
                                                        const p = pegawaiList.find(item => item.id === id);
                                                        if (!p) return null;
                                                        const busyActivities = officerAvailabilityMap[id];
                                                        const isBusy = Boolean(busyActivities && busyActivities.length > 0);

                                                        return (
                                                            <span 
                                                                key={id}
                                                                title={isBusy ? `Peringatan: Jadwal bentrok - ${[...new Set(busyActivities.map(a => a.nama || a.nama_kegiatan || a.tipe_nama))].join(', ')}` : ''}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                                                    isBusy 
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100 shadow-2xs' 
                                                                        : 'bg-blue-100 text-blue-900 border-blue-200'
                                                                }`}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setOfficerDropdownPetugasIds(prev => prev.filter(x => x !== id));
                                                                }}
                                                            >
                                                                {isBusy ? (
                                                                    <AlertCircle size={12} className="text-rose-500 animate-pulse shrink-0" />
                                                                ) : (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                                                )}
                                                                <span>{p.nama_lengkap}</span>
                                                                {isBusy && (
                                                                    <span 
                                                                        className="text-[10px] text-rose-600 font-bold bg-white/80 px-1.5 py-0.2 rounded border border-rose-200/80 truncate max-w-[160px]"
                                                                        title={[...new Set(busyActivities.map(a => a.nama || a.nama_kegiatan || a.tipe_nama))].join(', ')}
                                                                    >
                                                                        {[...new Set(busyActivities.map(a => a.nama || a.nama_kegiatan || a.tipe_nama || 'Ada Kegiatan'))].join(', ')}
                                                                    </span>
                                                                )}
                                                                <X size={12} className={`${isBusy ? 'text-rose-400 hover:text-rose-600' : 'text-blue-400 hover:text-rose-600'} transition-colors cursor-pointer shrink-0 ml-0.5`} />
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <ChevronDown 
                                                size={18} 
                                                className={`text-slate-400 shrink-0 transition-transform ${isOfficerDropdownExpanded ? 'rotate-180 text-ppm-blue' : ''}`} 
                                            />
                                        </div>

                                        {/* Dropdown Menu */}
                                        {isOfficerDropdownExpanded && (
                                            <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                                                {/* Search Input */}
                                                <div className="p-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                                                    <Search size={14} className="text-slate-400 shrink-0" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="Cari nama pegawai / NIP..."
                                                        value={officerDropdownSearch}
                                                        onChange={e => setOfficerDropdownSearch(e.target.value)}
                                                        className="w-full text-xs bg-transparent border-none outline-none font-medium placeholder:text-slate-400 text-slate-800"
                                                        style={{ color: '#1e293b' }}
                                                    />
                                                    {officerDropdownSearch && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setOfficerDropdownSearch('')}
                                                            className="text-slate-400 hover:text-slate-600 p-0.5"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Officers List with Checkboxes */}
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                                    {filteredOfficersForDropdown.length === 0 ? (
                                                        <div className="py-6 text-center text-xs text-slate-400 italic">
                                                            Tidak ditemukan pegawai yang cocok
                                                        </div>
                                                    ) : (
                                                        filteredOfficersForDropdown.map(p => {
                                                            const isChecked = officerDropdownPetugasIds.includes(p.id);
                                                            const busyActivities = officerAvailabilityMap[p.id];
                                                            const isBusy = Boolean(busyActivities && busyActivities.length > 0);

                                                            return (
                                                                <div
                                                                    key={p.id}
                                                                    onClick={() => {
                                                                        setOfficerDropdownPetugasIds(prev => 
                                                                            isChecked ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                                                        );
                                                                    }}
                                                                    className={`px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                                                        isChecked 
                                                                            ? isBusy
                                                                                ? 'bg-rose-50/90 text-rose-900 font-bold border border-rose-200'
                                                                                : 'bg-blue-50 text-ppm-blue font-bold border border-blue-100'
                                                                            : isBusy
                                                                            ? 'hover:bg-rose-50/50 text-slate-700 bg-rose-50/20'
                                                                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                                                            isChecked 
                                                                                ? isBusy ? 'bg-rose-600 border-rose-600 text-white' : 'bg-ppm-blue border-ppm-blue text-white' 
                                                                                : isBusy ? 'border-rose-300 bg-white' : 'border-slate-300 bg-white'
                                                                        }`}>
                                                                            {isChecked && <Check size={11} className="stroke-[3]" />}
                                                                        </div>

                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="truncate">{p.nama_lengkap}</span>
                                                                                {(p.nama_bidang || p.bidang_singkatan) && (
                                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold shrink-0 border border-slate-200/60">
                                                                                        {p.bidang_singkatan || p.nama_bidang}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Pemberitahuan jika petugas sudah memiliki kegiatan */}
                                                                            {isBusy && (
                                                                                <div 
                                                                                    className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 mt-0.5"
                                                                                    title={busyActivities.map(a => `• ${a.nama || a.tipe_nama || a.tipe}`).join('\n')}
                                                                                >
                                                                                    <AlertCircle size={10} className="text-rose-500 shrink-0" />
                                                                                    <span className="truncate">
                                                                                        {[...new Set(busyActivities.map(a => a.nama || a.nama_kegiatan || a.tipe_nama || 'Kegiatan'))].join(', ')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {isBusy && (
                                                                        <div className="shrink-0 ml-2">
                                                                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200">
                                                                                {busyActivities[0]?.tipe_nama || 'Bentrok'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* Dropdown Footer Actions */}
                                                <div className="p-2 px-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500 font-bold">
                                                        {officerDropdownPetugasIds.length} Petugas Dipilih
                                                    </span>
                                                    {officerDropdownPetugasIds.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOfficerDropdownPetugasIds([])}
                                                            className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
                                                        >
                                                            Kosongkan Pilihan
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsEditOfficersModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingOfficersOnly}
                                    className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                                >
                                    {savingOfficersOnly && <Loader2 size={13} className="animate-spin" />}
                                    <span>Simpan Petugas</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL PERUBAHAN BELUM DISIMPAN ================= */}
            {isUnsavedChangesModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                                <AlertCircle size={26} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-base">Perubahan Belum Disimpan</h3>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                    Konfirmasi penutupan jadwal kegiatan
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Perubahan Anda belum disimpan, apakah Anda akan simpan?
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleDiscardAndClose}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                                Tidak
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAndClose}
                                className="px-5 py-2 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                <Save size={14} className="stroke-[2.5]" />
                                <span>Simpan</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL REKAPAN JADWAL PER ORANG & PER KEGIATAN ================= */}
            {isRekapModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-[98vw] max-w-[1560px] rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col h-[94vh] max-h-[96vh] overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
                        style={{ color: '#1e293b' }}
                    >
                        {/* Modal Header (Clean & Minimalist matching Fullscreen View) */}
                        <div className="p-4 sm:p-5 px-6 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                                    <Table size={18} className="text-slate-700" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-800 text-base sm:text-lg tracking-tight leading-tight truncate">
                                        Rekapitulasi Jadwal & Penugasan
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                                        Monitoring penugasan pegawai (hari bertugas vs hari kosong) dan agenda kegiatan
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handlePrintRekap}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 border border-slate-200/80"
                                    title="Cetak Laporan Rekapitulasi"
                                >
                                    <Printer size={13} className="text-slate-600" />
                                    <span className="hidden sm:inline">Cetak Rekap</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsRekapModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                                    title="Tutup Modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Controls & Filter Bar (Clean Pill Tabs & Filters) */}
                        <div className="p-3.5 px-6 border-b border-slate-200/80 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                            {/* Mode Tab Switcher */}
                            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200/60 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setRekapActiveTab('per_orang')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                        rekapActiveTab === 'per_orang'
                                            ? 'bg-white text-slate-800 shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <Users size={13} />
                                    <span>Jadwal Per Orang ({kpiPerOrang.total})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRekapActiveTab('per_kegiatan')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                        rekapActiveTab === 'per_kegiatan'
                                            ? 'bg-white text-slate-800 shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <CalendarCheck size={13} />
                                    <span>Jadwal Per Kegiatan ({kpiPerKegiatan.total})</span>
                                </button>
                            </div>

                            {/* Filters: Bulan, Tahun, Bidang, Search */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Bulan */}
                                <select
                                    value={rekapBulan}
                                    onChange={e => setRekapBulan(Number(e.target.value))}
                                    className="px-2.5 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-bold shadow-2xs"
                                    style={{ color: '#1e293b' }}
                                >
                                    {BULAN_OPTIONS.map(b => (
                                        <option key={b.value} value={b.value}>{b.label}</option>
                                    ))}
                                </select>

                                {/* Tahun */}
                                <select
                                    value={rekapTahun}
                                    onChange={e => setRekapTahun(Number(e.target.value))}
                                    className="px-2.5 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-bold shadow-2xs"
                                    style={{ color: '#1e293b' }}
                                >
                                    {availableYears.map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>

                                {/* Bidang (khusus tab per orang) */}
                                {rekapActiveTab === 'per_orang' && (
                                    <select
                                        value={rekapBidangFilter}
                                        onChange={e => setRekapBidangFilter(e.target.value)}
                                        className="px-2.5 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-bold shadow-2xs max-w-[150px] truncate"
                                        style={{ color: '#1e293b' }}
                                    >
                                        <option value="all">Semua Bidang</option>
                                        {availableBidangs.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Search Input */}
                                <div className="relative min-w-[170px]">
                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={rekapSearch}
                                        onChange={e => setRekapSearch(e.target.value)}
                                        placeholder={rekapActiveTab === 'per_orang' ? 'Cari pegawai / NIP...' : 'Cari kegiatan / lokasi...'}
                                        className="w-full pl-7 pr-7 py-1.5 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-ppm-blue font-medium placeholder:text-slate-400 shadow-2xs"
                                        style={{ color: '#1e293b' }}
                                    />
                                    {rekapSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setRekapSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Compact Counter Bar (Slim Badges matching Fullscreen Style - Space Saving) */}
                        <div className="px-6 py-2.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {rekapActiveTab === 'per_orang' ? (
                                    <>
                                        {/* Filter: Total Pegawai */}
                                        <button 
                                            type="button"
                                            onClick={() => setRekapStatusFilter('all')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                                rekapStatusFilter === 'all' 
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' 
                                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                            }`}
                                            title="Tampilkan semua pegawai"
                                        >
                                            <Users size={12} className={rekapStatusFilter === 'all' ? 'text-white' : 'text-slate-500'} />
                                            <span>Total Pegawai: <strong className="font-bold">{kpiPerOrang.total}</strong></span>
                                        </button>

                                        {/* Filter: Sudah Ada Kegiatan */}
                                        <button 
                                            type="button"
                                            onClick={() => setRekapStatusFilter('has_activity')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                                rekapStatusFilter === 'has_activity' 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                                                    : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200'
                                            }`}
                                            title="Filter hanya yang sudah ada kegiatan"
                                        >
                                            <CheckCircle2 size={12} className={rekapStatusFilter === 'has_activity' ? 'text-white' : 'text-emerald-600'} />
                                            <span>Sudah Ada Kegiatan: <strong className="font-bold">{kpiPerOrang.withAct}</strong> ({kpiPerOrang.pctWithAct}%)</span>
                                        </button>

                                        {/* Filter: Belum Ada Kegiatan */}
                                        <button 
                                            type="button"
                                            onClick={() => setRekapStatusFilter('no_activity')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                                rekapStatusFilter === 'no_activity' 
                                                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                                                    : 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 border-amber-200'
                                            }`}
                                            title="Filter hanya yang belum ada kegiatan (kosong)"
                                        >
                                            <AlertCircle size={12} className={rekapStatusFilter === 'no_activity' ? 'text-white' : 'text-amber-600'} />
                                            <span>Belum Ada Kegiatan: <strong className="font-bold">{kpiPerOrang.withoutAct}</strong> ({kpiPerOrang.pctWithoutAct}%)</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                                            <span>Total Kegiatan: <strong className="font-bold text-slate-900">{kpiPerKegiatan.total}</strong></span>
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                                            <span>Draft: <strong className="font-bold">{kpiPerKegiatan.draftCount}</strong></span>
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                            <span>Resmi: <strong className="font-bold">{kpiPerKegiatan.resmiCount}</strong></span>
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5">
                                            <span>Penugasan: <strong className="font-bold">{kpiPerKegiatan.totalPetugas}</strong> Orang</span>
                                        </span>
                                    </>
                                )}
                            </div>

                            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                                {rekapActiveTab === 'per_orang' ? (
                                    <span>Klik badge counter untuk menyaring daftar</span>
                                ) : (
                                    <span>Daftar seluruh agenda kegiatan pada periode ini</span>
                                )}
                            </div>
                        </div>

                        {/* Table Content Area (Padded viewport with inner scrollable table container & sticky header) */}
                        <div className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col min-h-0 bg-slate-50/30">
                            {rekapLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                                    <Loader2 size={28} className="animate-spin mb-2 text-ppm-blue" />
                                    <span className="text-xs font-bold">Memuat rekapitulasi jadwal pegawai & kegiatan...</span>
                                </div>
                            ) : rekapActiveTab === 'per_orang' ? (
                                /* ================= TABEL 1: PER ORANG ================= */
                                filteredRekapPerOrang.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold text-xs border border-slate-200 rounded-2xl bg-white shadow-2xs">
                                        Tidak ditemukan pegawai sesuai filter yang dipilih
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 rounded-2xl shadow-2xs bg-white">
                                        <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1050px]">
                                            <thead className="sticky top-0 z-20 shadow-2xs">
                                                <tr className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 text-center w-12 text-slate-600 bg-slate-100 border-b border-slate-200">No</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-4 min-w-[200px] text-slate-700 bg-slate-100 border-b border-slate-200">Nama Pegawai</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 text-center min-w-[150px] text-slate-700 bg-slate-100 border-b border-slate-200">Status Penugasan</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-4 min-w-[320px] text-slate-700 bg-slate-100 border-b border-slate-200">Tanggal & Kegiatan yang Diikuti</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-4 min-w-[300px] text-slate-700 bg-slate-100 border-b border-slate-200">Tanggal Kosong (Hari Kerja)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredRekapPerOrang.map((item, idx) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-3 text-center font-bold text-slate-400 border-b border-slate-100">{idx + 1}</td>
                                                        <td className="py-3.5 px-4 border-b border-slate-100">
                                                            <div className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>
                                                                {item.nama_lengkap}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[10px] text-slate-400 font-medium">NIP: {item.nip}</span>
                                                                {item.bidang_singkatan && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-black border border-slate-200">
                                                                        {item.bidang_singkatan}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-center border-b border-slate-100">
                                                            {item.hasActivity ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
                                                                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                                                    <span>Sudah Bertugas ({item.activeDaysCount} Hari)</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs whitespace-nowrap">
                                                                    <AlertCircle size={12} className="text-amber-600 shrink-0" />
                                                                    <span>Belum Ada Kegiatan</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 border-b border-slate-100">
                                                            {item.hasActivity ? (
                                                                <div className="space-y-1.5">
                                                                    {item.activeSchedule.map(sched => (
                                                                        <div key={sched.day} className="flex items-start gap-1.5 text-xs text-slate-700 leading-snug">
                                                                            <span className="font-bold text-slate-900 shrink-0 min-w-[50px]">{sched.formattedDay}:</span>
                                                                            <span className="font-medium text-slate-800">{sched.activities.join(' • ')}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 italic text-xs font-medium">- Tidak ada jadwal kegiatan -</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 border-b border-slate-100">
                                                            {item.hasActivity ? (
                                                                <div className="space-y-1">
                                                                    <div className="text-[11px] font-medium text-slate-500">
                                                                        <strong className="text-slate-700 font-bold">{item.emptyDaysCount} hari kerja</strong> kosong:
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {item.emptyDays.map(d => (
                                                                            <span 
                                                                                key={d} 
                                                                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold border border-slate-200/80"
                                                                                title={`Tanggal ${d} tidak ada penugasan`}
                                                                            >
                                                                                {d}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
                                                                    <CheckCircle2 size={12} />
                                                                    Kosong Seluruh Bulan ({item.totalWorkingDays} Hari Kerja)
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                /* ================= TABEL 2: PER KEGIATAN ================= */
                                filteredRekapPerKegiatan.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold text-xs border border-slate-200 rounded-2xl bg-white shadow-2xs">
                                        Tidak ditemukan agenda kegiatan pada bulan dan tahun ini
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 rounded-2xl shadow-2xs bg-white">
                                        <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[1050px]">
                                            <thead className="sticky top-0 z-20 shadow-2xs">
                                                <tr className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 text-center w-12 text-slate-600 bg-slate-100 border-b border-slate-200">No</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-4 min-w-[220px] text-slate-700 bg-slate-100 border-b border-slate-200">Nama Kegiatan & Jenis</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 min-w-[140px] text-slate-700 bg-slate-100 border-b border-slate-200">Tanggal Pelaksanaan</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 min-w-[160px] text-slate-700 bg-slate-100 border-b border-slate-200">Lokasi</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-4 min-w-[280px] text-slate-700 bg-slate-100 border-b border-slate-200">Tim & Petugas yang Ditugaskan</th>
                                                    <th className="sticky top-0 z-20 py-3.5 px-3 text-center w-28 text-slate-700 bg-slate-100 border-b border-slate-200">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredRekapPerKegiatan.map((item, idx) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-3 text-center font-bold text-slate-400 border-b border-slate-100">{idx + 1}</td>
                                                        <td className="py-3.5 px-4 border-b border-slate-100">
                                                            <div className="font-bold text-slate-800 text-xs" style={{ color: '#1e293b' }}>
                                                                {item.nama_kegiatan}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                                    {item.jenis_nama}
                                                                </span>
                                                                {item.nama_tim && (
                                                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                                        {item.nama_tim}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-3 border-b border-slate-100">
                                                            <div className="font-bold text-slate-800">
                                                                {formatTanggalIndo(item.tanggal_mulai)}
                                                            </div>
                                                            {item.tanggal_akhir && item.tanggal_akhir !== item.tanggal_mulai && (
                                                                <div className="text-[10px] text-slate-500 font-medium">
                                                                    s/d {formatTanggalIndo(item.tanggal_akhir)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3 border-b border-slate-100">
                                                            <div className="font-bold text-slate-700 flex items-center gap-1">
                                                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                                                <span>{item.lokasi}</span>
                                                            </div>
                                                            {item.lokasi_detail && (
                                                                <div className="text-[10px] text-slate-400 font-medium pl-4">
                                                                    {item.lokasi_detail}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 border-b border-slate-100">
                                                            {item.officers.length > 0 ? (
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {item.officers.map(off => (
                                                                        <span 
                                                                            key={off.id}
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80"
                                                                        >
                                                                            <span>{off.nama_lengkap}</span>
                                                                            {off.bidang_singkatan && (
                                                                                <span className="text-[9px] text-slate-400 font-black">({off.bidang_singkatan})</span>
                                                                            )}
                                                                        </span>
                                                                    ))}
                                                                    <span className="text-[10px] text-slate-400 font-bold ml-1">
                                                                        ({item.officers.length} Petugas)
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-amber-600 font-semibold italic text-xs">
                                                                    Belum ada petugas ditugaskan
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-center border-b border-slate-100">
                                                            <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                                                                item.status === 'resmi' 
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                    : item.status === 'terintegrasi'
                                                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {item.status === 'resmi' ? 'Resmi' : item.status === 'terintegrasi' ? 'Terbit' : 'Draft'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 px-6 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
                            <div>
                                Periode: <strong className="text-slate-800 font-bold">{BULAN_OPTIONS.find(b => b.value === rekapBulan)?.label} {rekapTahun}</strong>
                                {rekapActiveTab === 'per_orang' ? ` • ${filteredRekapPerOrang.length} Pegawai Ditampilkan` : ` • ${filteredRekapPerKegiatan.length} Kegiatan Ditampilkan`}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRekapModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 transition-all active:scale-95 shadow-2xs"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL PERINGATAN BENTROK AMBIL PETUGAS ================= */}
            {copyConflictModalData && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
                        style={{ color: '#1e293b' }}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 shadow-2xs">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm">
                                        Pemberitahuan Penugasan Petugas
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        {copyConflictModalData.targetTeamName} • {formatTanggalIndo(copyConflictModalData.targetDate)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCopyConflictModalData(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* 1. Petugas yang TIDAK DAPAT ditarik karena bentrok */}
                            {copyConflictModalData.conflictedOfficers.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>Petugas Tidak Dapat Ditarik ({copyConflictModalData.conflictedOfficers.length} Orang):</span>
                                    </div>
                                    <div className="space-y-2">
                                        {copyConflictModalData.conflictedOfficers.map(off => (
                                            <div key={off.id} className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                        <span>{off.nama_lengkap}</span>
                                                        {off.bidang_singkatan && (
                                                            <span className="text-[9px] px-1.5 py-0.2 bg-white text-slate-600 rounded font-bold border border-rose-200">
                                                                {off.bidang_singkatan}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-slate-600 space-y-1">
                                                    {off.activities.map((act, actIdx) => (
                                                        <div key={actIdx} className="flex items-start gap-1.5 bg-white/80 p-1.5 rounded-lg border border-rose-100">
                                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${
                                                                (act.tipe || '').includes('DLB')
                                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                                    : (act.tipe || '').includes('DL')
                                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            }`}>
                                                                {act.tipe || act.tipe_nama || 'DL'}
                                                            </span>
                                                            <span className="leading-tight text-slate-700">
                                                                Sudah memiliki kegiatan: <span className="font-bold text-slate-800">{act.nama}</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. Petugas yang BERHASIL ditarik */}
                            {copyConflictModalData.pulledOfficers.length > 0 ? (
                                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                        <span>Berhasil Ditarik ke {copyConflictModalData.targetTeamName} ({copyConflictModalData.pulledOfficers.length} Orang):</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {copyConflictModalData.pulledOfficers.map(p => (
                                            <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                                                <span>{p.nama_lengkap}</span>
                                                {p.bidang_singkatan && (
                                                    <span className="text-[9px] px-1 py-0.2 bg-emerald-100/70 text-emerald-800 rounded font-semibold">
                                                        {p.bidang_singkatan}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-emerald-700 font-medium">
                                        *Hanya petugas di atas yang belum memiliki kegiatan yang ditarik dan disimpan ke tim ini.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                                    <p className="text-xs font-bold text-slate-700">Tidak ada petugas yang ditarik</p>
                                    <p className="text-[11px] text-slate-500">Seluruh petugas dari hari sebelumnya telah memiliki kegiatan pada tanggal ini.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end shrink-0">
                            <button
                                onClick={() => setCopyConflictModalData(null)}
                                className="px-5 py-2.5 bg-ppm-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ================= MODAL IMPOR DRAFT JADWAL DARI EXCEL ================= */}
            {isImportExcelModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div 
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 leading-tight">
                                        Impor Draft Jadwal dari Excel
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                        Unggah data draft kegiatan dan penugasan tim secara massal dari berkas .xlsx
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsImportExcelModalOpen(false);
                                    setImportExcelFile(null);
                                    setImportExcelFileName('');
                                    setImportExcelPreview(null);
                                    setImportExcelError(null);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                            {/* Step 1: Download Template Banner */}
                            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
                                        <Download size={14} className="text-emerald-600" />
                                        <span>Langkah 1: Unduh Format Template Excel</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800/80 font-medium leading-relaxed max-w-xl">
                                        Format ini sudah memiliki struktur kolom baku, contoh baris data, serta lembar <em>Referensi Data</em> (daftar kecamatan resmi dan nama/NIP pegawai) untuk mempermudah pengisian.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                                >
                                    <Download size={14} />
                                    <span>Unduh Template (.xlsx)</span>
                                </button>
                            </div>

                            {/* Step 2: Upload Dropzone */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Langkah 2: Unggah Berkas Excel (.xlsx / .xls)
                                </label>

                                <input
                                    ref={importExcelFileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {!importExcelFileName ? (
                                    <div
                                        onClick={() => importExcelFileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all group text-center"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors shadow-2xs">
                                            <UploadCloud size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                                                Klik untuk memilih berkas Excel atau tarik berkas ke sini
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Mendukung berkas format .xlsx dan .xls (Maks. 10MB)
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                                                <FileCheck size={20} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {importExcelFileName}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                    {importExcelFile ? `${(importExcelFile.size / 1024).toFixed(1)} KB` : ''} • Berkas siap diproses
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => importExcelFileInputRef.current?.click()}
                                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                                            >
                                                Ganti Berkas
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImportExcelFile(null);
                                                    setImportExcelFileName('');
                                                    setImportExcelPreview(null);
                                                    setImportExcelError(null);
                                                    if (importExcelFileInputRef.current) importExcelFileInputRef.current.value = '';
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                                                title="Hapus berkas"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Loading State */}
                            {importExcelLoading && (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                                    <p className="text-xs font-semibold">Sedang membaca dan memvalidasi isi berkas Excel...</p>
                                </div>
                            )}

                            {/* Error State */}
                            {importExcelError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
                                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div className="text-xs leading-relaxed">
                                        <p className="font-bold">Gagal memproses berkas Excel</p>
                                        <p className="mt-0.5 text-rose-700">{importExcelError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Preview Data (When parsed) */}
                            {importExcelPreview && (
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                            Langkah 3: Pratinjau Data yang Terbaca
                                        </label>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-ppm-blue border border-blue-200 rounded-lg">
                                                {importExcelPreview.drafts.length} Kegiatan
                                            </span>
                                            <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                                                {importExcelPreview.drafts.reduce((acc, d) => acc + d.teams.length, 0)} Tim / Jadwal
                                            </span>
                                            {importExcelPreview.warningCount > 0 && (
                                                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg inline-flex items-center gap-1">
                                                    <AlertTriangle size={11} />
                                                    {importExcelPreview.warningCount} Petugas Tidak Cocok
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Preview List by Draft */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
                                        {importExcelPreview.drafts.map((d, dIdx) => (
                                            <div key={dIdx} className="p-3.5 bg-white space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                                                            {dIdx + 1}
                                                        </span>
                                                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                                                            {d.nama_kegiatan}
                                                        </h4>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md shrink-0">
                                                        {d.jenis_kegiatan_nama}
                                                    </span>
                                                </div>

                                                {/* Teams table */}
                                                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                                                    <table className="w-full text-left text-[11px]">
                                                        <thead>
                                                            <tr className="border-b border-slate-200/80 text-slate-500 font-bold bg-slate-100/60">
                                                                <th className="py-1.5 px-2.5">Nama Tim</th>
                                                                <th className="py-1.5 px-2.5">Tanggal</th>
                                                                <th className="py-1.5 px-2.5">Lokasi / Kecamatan</th>
                                                                <th className="py-1.5 px-2.5">Petugas Ditugaskan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {d.teams.map((t, tIdx) => (
                                                                <tr key={tIdx} className="hover:bg-white transition-colors">
                                                                    <td className="py-1.5 px-2.5 font-bold text-slate-700 align-top">
                                                                        {t.nama_tim}
                                                                    </td>
                                                                    <td className="py-1.5 px-2.5 text-slate-600 align-top whitespace-nowrap">
                                                                        {t.tanggal_mulai ? (
                                                                            t.tanggal_mulai === t.tanggal_akhir || !t.tanggal_akhir 
                                                                                ? t.tanggal_mulai 
                                                                                : `${t.tanggal_mulai} s/d ${t.tanggal_akhir}`
                                                                        ) : (
                                                                            <span className="text-amber-600 italic">Belum diisi</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2.5 text-slate-600 align-top">
                                                                        {t.kecamatan_nama ? (
                                                                            <div>
                                                                                <span className="font-semibold text-slate-800">Kec. {t.kecamatan_nama}</span>
                                                                                {t.lokasi_detail && <div className="text-[10px] text-slate-400">{t.lokasi_detail}</div>}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-amber-600 italic">Belum diisi</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2.5 align-top">
                                                                        {t.officer_names.length > 0 ? (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {t.officer_names.map((name, nIdx) => (
                                                                                    <span key={nIdx} className="px-1.5 py-0.5 bg-blue-50 text-ppm-blue rounded text-[10px] font-semibold border border-blue-100">
                                                                                        {name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">Belum ada</span>
                                                                        )}
                                                                        {t.unresolved_officers.length > 0 && (
                                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                                {t.unresolved_officers.map((uName, uIdx) => (
                                                                                    <span key={uIdx} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-medium border border-amber-200" title="Nama ini tidak ditemukan di Master Pegawai">
                                                                                        ⚠️ {uName}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium">
                                *Data yang diimpor akan masuk ke tab <strong>Draft</strong> untuk dapat ditinjau kembali sebelum integrasi.
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsImportExcelModalOpen(false);
                                        setImportExcelFile(null);
                                        setImportExcelFileName('');
                                        setImportExcelPreview(null);
                                        setImportExcelError(null);
                                    }}
                                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmImport}
                                    disabled={!importExcelPreview || importExcelPreview.drafts.length === 0 || savingImportExcel}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                    {savingImportExcel ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet size={14} />
                                            <span>Simpan ke Draft Jadwal</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DraftJadwal;
