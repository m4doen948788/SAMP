import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { api } from '@/src/services/api';
import { Plus, Edit2, Trash2, Loader2, Layers, Briefcase, Search, ChevronRight, ChevronDown, Check, X, Filter, Settings } from 'lucide-react';
import { BaseDataTable } from '@/src/features/common/components/BaseDataTable';
import { SearchableSelect } from '@/src/features/common/components/SearchableSelect';
import SubKegiatanSkpConfigModal from './SubKegiatanSkpConfigModal';

interface Urusan {
    id: number;
    urusan: string;
}

interface Instansi {
    id: number;
    instansi: string;
    singkatan: string;
}

interface Bidang {
    id: number;
    nama_bidang: string;
    instansi_id: number;
}

interface GroupedMappingUI {
    id: string; // Unique key for BaseDataTable (urusan_id-program_id)
    urusan_id: number;
    nama_urusan: string;
    program_id: number | null;
    nama_program: string | null;
    instansi: {
        id: number;
        nama: string;
        singkatan: string;
        mapping_id: number;
    }[];
}

// Collapsible wrapper for cleaner UI - Moved out of the main component to prevent re-creation on every render
const CollapsibleSelect = ({ value, onChange, options, label, keyField, displayField, disabled, entityName }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = value ? value.length : 0;
    
    // Auto-collapse when disabled (saved or cancelled)
    React.useEffect(() => {
        if (disabled && isExpanded) {
            setIsExpanded(false);
        }
    }, [disabled, isExpanded]);

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                disabled={disabled}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left rounded-lg transition-all border ${disabled ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm text-slate-700'}`}
            >
                <span className="font-medium">
                    {count === 0 ? `0 ${entityName}` : `${count} ${entityName} Terpilih`}
                </span>
                <ChevronDown size={14} className={disabled ? 'text-slate-300' : 'text-slate-500'} />
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-1 bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50 shadow-inner">
            <SearchableSelect
                value={value}
                onChange={onChange}
                options={options}
                label={label}
                keyField={keyField}
                displayField={displayField}
                multiple
                disabled={disabled}
                autoFocus={true} // Open immediately when expanded
            />
            <button 
                onClick={() => setIsExpanded(false)}
                className="self-end px-2 py-1 text-xs font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded"
            >
                Tutup
            </button>
        </div>
    );
};



const MappingUrusanInstansi = ({ initialTab }: { initialTab?: 'urusan' | 'kegiatan' | 'bidang' | 'sektor' }) => {
    const { user } = useAuth();
    const [allowedActionPages, setAllowedActionPages] = useState<string[]>([]);
    const [isSuperAdmin] = useState(user?.tipe_user_id === 1);

    const [activeTab, setActiveTab] = useState<'urusan' | 'kegiatan' | 'bidang' | 'sektor'>(() => {
        if (initialTab) return initialTab;
        return (sessionStorage.getItem('mapping_active_tab') as any) || 'urusan';
    });

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        sessionStorage.setItem('mapping_active_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const fetchAccess = async () => {
            if (isSuperAdmin) {
                setAllowedActionPages(['mapping-urusan', 'mapping-kegiatan', 'mapping-instansi', 'mapping-sektor', 'referensi-urusan-instansi']);
                return;
            }
            if (user) {
                try {
                    const accessRes = await api.rbac.getRoleAccess(user.tipe_user_id);
                    if (accessRes.success) {
                        const menuRes = await api.menu.getAll();
                        if (menuRes.success) {
                            const allowed = menuRes.data
                                .filter((m: any) => accessRes.data.includes(m.id))
                                .map((m: any) => m.action_page);
                            setAllowedActionPages(allowed);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch tab access:', err);
                }
            }
        };
        fetchAccess();
    }, [user, isSuperAdmin]);

    const [loading, setLoading] = useState(true);

    // Data states
    const [urusanList, setUrusanList] = useState<Urusan[]>([]);
    const [programList, setProgramList] = useState<any[]>([]);
    const [instansiList, setInstansiList] = useState<Instansi[]>([]);
    const [bidangList, setBidangList] = useState<Bidang[]>([]);
    const [mappingUIList, setMappingUIList] = useState<any[]>([]);
    const [mappingBidangList, setMappingBidangList] = useState<any[]>([]);
    const [mappingProgramList, setMappingProgramList] = useState<any[]>([]);
    const [mappingKegiatanList, setMappingKegiatanList] = useState<any[]>([]);
    const [mappingSubKegiatanList, setMappingSubKegiatanList] = useState<any[]>([]);
    const [kegiatanList, setKegiatanList] = useState<any[]>([]);
    const [subKegiatanList, setSubKegiatanList] = useState<any[]>([]);
    const [mappingSektorList, setMappingSektorList] = useState<any[]>([]);

    // Pohon Kinerja Modal States
    const [isKinerjaModalOpen, setIsKinerjaModalOpen] = useState(false);
    const [skpConfigModalState, setSkpConfigModalState] = useState<{
        isOpen: boolean;
        subKegiatanId: number | null;
        subKegiatanName: string;
        subKegiatanCode: string;
        instansiId: number | null;
    }>({
        isOpen: false,
        subKegiatanId: null,
        subKegiatanName: '',
        subKegiatanCode: '',
        instansiId: null
    });
    const [selectedInstansi, setSelectedInstansi] = useState<any>(null);
    const [pegawaiList, setPegawaiList] = useState<any[]>([]);
    const [isLoadingPegawai, setIsLoadingPegawai] = useState(false);
    const [isSavingKinerja, setIsSavingKinerja] = useState(false);

    // Selections state for Tree Grid inside Modal
    const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);
    const [selectedKegiatanIds, setSelectedKegiatanIds] = useState<number[]>([]);
    const [selectedSubKegiatanIds, setSelectedSubKegiatanIds] = useState<number[]>([]);

    // Expand/collapse states for Tree Grid inside Modal
    const [expandedProgramIds, setExpandedProgramIds] = useState<number[]>([]);
    const [expandedKegiatanIds, setExpandedKegiatanIds] = useState<number[]>([]);

    // Auto-save expand/collapse preferences to localStorage keyed by SKPD ID
    useEffect(() => {
        if (selectedInstansi && isKinerjaModalOpen) {
            localStorage.setItem(`kinerja_expanded_programs_${selectedInstansi.id}`, JSON.stringify(expandedProgramIds));
        }
    }, [expandedProgramIds, selectedInstansi, isKinerjaModalOpen]);

    useEffect(() => {
        if (selectedInstansi && isKinerjaModalOpen) {
            localStorage.setItem(`kinerja_expanded_kegiatans_${selectedInstansi.id}`, JSON.stringify(expandedKegiatanIds));
        }
    }, [expandedKegiatanIds, selectedInstansi, isKinerjaModalOpen]);

    const toggleExpandProgram = (programId: number) => {
        setExpandedProgramIds(prev => 
            prev.includes(programId) ? prev.filter(id => id !== programId) : [...prev, programId]
        );
    };

    const toggleExpandKegiatan = (kegiatanId: number) => {
        setExpandedKegiatanIds(prev => 
            prev.includes(kegiatanId) ? prev.filter(id => id !== kegiatanId) : [...prev, kegiatanId]
        );
    };

    // Penanggung Jawab mapping maps (id_perencanaan -> pegawai_id)
    const [programPegawaiMap, setProgramPegawaiMap] = useState<Record<number, number | null>>({});
    const [kegiatanPegawaiMap, setKegiatanPegawaiMap] = useState<Record<number, number | null>>({});
    const [subKegiatanPegawaiMap, setSubKegiatanPegawaiMap] = useState<Record<number, number | null>>({});

    const handleStartEditKinerja = async (item: any) => {
        setSelectedInstansi(item);
        setIsKinerjaModalOpen(true);
        setIsLoadingPegawai(true);

        // Map selections
        setSelectedProgramIds(item.selections.programs || []);
        setSelectedKegiatanIds(item.selections.kegiatans || []);
        setSelectedSubKegiatanIds(item.selections.subKegiatans || []);

        // Load expand states from localStorage (keyed by SKPD ID) or fallback to active selections
        const savedPrograms = localStorage.getItem(`kinerja_expanded_programs_${item.id}`);
        if (savedPrograms) {
            try {
                setExpandedProgramIds(JSON.parse(savedPrograms));
            } catch (e) {
                setExpandedProgramIds(item.selections.programs || []);
            }
        } else {
            setExpandedProgramIds(item.selections.programs || []);
        }

        const savedKegiatans = localStorage.getItem(`kinerja_expanded_kegiatans_${item.id}`);
        if (savedKegiatans) {
            try {
                setExpandedKegiatanIds(JSON.parse(savedKegiatans));
            } catch (e) {
                setExpandedKegiatanIds(item.selections.kegiatans || []);
            }
        } else {
            setExpandedKegiatanIds(item.selections.kegiatans || []);
        }

        // Retrieve initial mappings for programs, activities, and sub-activities
        const pMap: Record<number, number | null> = {};
        mappingProgramList.filter(m => m.instansi_id === item.id).forEach(m => {
            pMap[m.program_id] = m.penanggung_jawab_id;
        });
        setProgramPegawaiMap(pMap);

        const kMap: Record<number, number | null> = {};
        mappingKegiatanList.filter(m => m.instansi_id === item.id).forEach(m => {
            kMap[m.kegiatan_id] = m.penanggung_jawab_id;
        });
        setKegiatanPegawaiMap(kMap);

        const skMap: Record<number, number | null> = {};
        mappingSubKegiatanList.filter(m => m.instansi_id === item.id).forEach(m => {
            skMap[m.sub_kegiatan_id] = m.penanggung_jawab_id;
        });
        setSubKegiatanPegawaiMap(skMap);

        try {
            // Retrieve employees for this SKPD/instansi
            const res = await api.profilPegawai.getAll({ instansi_id: item.id });
            if (res.success) {
                setPegawaiList(res.data || []);
            }
        } catch (err) {
            console.error('Gagal mengambil data pegawai:', err);
        } finally {
            setIsLoadingPegawai(false);
        }
    };

    // Toggle Program Selection
    const handleToggleProgram = (programId: number) => {
        const isChecked = selectedProgramIds.includes(programId);
        if (isChecked) {
            // Uncheck program
            setSelectedProgramIds(prev => prev.filter(id => id !== programId));
            setExpandedProgramIds(prev => prev.filter(id => id !== programId)); // Auto collapse on uncheck
            // Automatically uncheck all of its child kegiatan & sub-kegiatans
            const childKegiatanIds = kegiatanList.filter(k => k.program_id === programId).map(k => k.id);
            setSelectedKegiatanIds(prev => prev.filter(id => !childKegiatanIds.includes(id)));
            setExpandedKegiatanIds(prev => prev.filter(id => !childKegiatanIds.includes(id))); // Auto collapse child kegiatans
            const childSubIds = subKegiatanList.filter(sk => childKegiatanIds.includes(sk.kegiatan_id)).map(sk => sk.id);
            setSelectedSubKegiatanIds(prev => prev.filter(id => !childSubIds.includes(id)));
        } else {
            // Check program
            setSelectedProgramIds(prev => [...prev, programId]);
            setExpandedProgramIds(prev => [...new Set([...prev, programId])]); // Auto expand on check
            // Automatically check all of its child kegiatan & sub-kegiatans
            const childKegiatanIds = kegiatanList.filter(k => k.program_id === programId).map(k => k.id);
            setSelectedKegiatanIds(prev => [...new Set([...prev, ...childKegiatanIds])]);
            setExpandedKegiatanIds(prev => [...new Set([...prev, ...childKegiatanIds])]); // Auto expand child kegiatans
            const childSubIds = subKegiatanList.filter(sk => childKegiatanIds.includes(sk.kegiatan_id)).map(sk => sk.id);
            setSelectedSubKegiatanIds(prev => [...new Set([...prev, ...childSubIds])]);
        }
    };

    // Toggle Kegiatan Selection
    const handleToggleKegiatan = (kegiatanId: number, parentProgramId: number) => {
        const isChecked = selectedKegiatanIds.includes(kegiatanId);
        if (isChecked) {
            // Uncheck kegiatan
            setSelectedKegiatanIds(prev => prev.filter(id => id !== kegiatanId));
            setExpandedKegiatanIds(prev => prev.filter(id => id !== kegiatanId)); // Auto collapse on uncheck
            // Uncheck children sub-kegiatan
            const childSubIds = subKegiatanList.filter(sk => sk.kegiatan_id === kegiatanId).map(sk => sk.id);
            setSelectedSubKegiatanIds(prev => prev.filter(id => !childSubIds.includes(id)));
        } else {
            // Check kegiatan
            setSelectedKegiatanIds(prev => [...prev, kegiatanId]);
            setExpandedKegiatanIds(prev => [...new Set([...prev, kegiatanId])]); // Auto expand on check
            // Auto check parent program if not checked
            if (!selectedProgramIds.includes(parentProgramId)) {
                setSelectedProgramIds(prev => [...prev, parentProgramId]);
                setExpandedProgramIds(prev => [...new Set([...prev, parentProgramId])]); // Auto expand parent program
            }
            // Auto check all child sub-kegiatans
            const childSubIds = subKegiatanList.filter(sk => sk.kegiatan_id === kegiatanId).map(sk => sk.id);
            setSelectedSubKegiatanIds(prev => [...new Set([...prev, ...childSubIds])]);
        }
    };

    // Toggle Sub-Kegiatan Selection
    const handleToggleSubKegiatan = (subKegiatanId: number, parentKegiatanId: number, parentProgramId: number) => {
        const isChecked = selectedSubKegiatanIds.includes(subKegiatanId);
        if (isChecked) {
            // Uncheck sub-kegiatan
            setSelectedSubKegiatanIds(prev => prev.filter(id => id !== subKegiatanId));
        } else {
            // Check sub-kegiatan
            setSelectedSubKegiatanIds(prev => [...prev, subKegiatanId]);
            // Auto check parent kegiatan
            if (!selectedKegiatanIds.includes(parentKegiatanId)) {
                setSelectedKegiatanIds(prev => [...prev, parentKegiatanId]);
                setExpandedKegiatanIds(prev => [...new Set([...prev, parentKegiatanId])]); // Auto expand parent kegiatan
            }
            // Auto check parent program
            if (!selectedProgramIds.includes(parentProgramId)) {
                setSelectedProgramIds(prev => [...prev, parentProgramId]);
                setExpandedProgramIds(prev => [...new Set([...prev, parentProgramId])]); // Auto expand parent program
            }
        }
    };

    // Get filtered list of employees based on planning level
    const getFilteredPegawais = (level: 'program_utama' | 'program_penunjang' | 'kegiatan' | 'sub_kegiatan', isPenunjang?: boolean) => {
        if (!pegawaiList) return [];
        return pegawaiList.filter(p => {
            const title = (p.jabatan_nama || '').toLowerCase();
            if (level === 'program_utama' || level === 'program_penunjang') {
                return title.includes('kepala') || title.includes('direktur') || title.includes('kaban') || title.includes('kadis');
            }
            if (level === 'kegiatan') {
                if (isPenunjang) {
                    return title.includes('sekretaris');
                } else {
                    return title.includes('bidang') || title.includes('bagian') || title.includes('kabid') || title.includes('kabag');
                }
            }
            if (level === 'sub_kegiatan') {
                return true; 
            }
            return true;
        });
    };

    const handleSaveKinerjaTree = async () => {
        if (!selectedInstansi) return;
        setIsSavingKinerja(true);

        // Map selections to { id, penanggung_jawab_id }
        const program_ids = selectedProgramIds.length > 0 
            ? selectedProgramIds.map(pid => ({ id: pid, penanggung_jawab_id: programPegawaiMap[pid] || null }))
            : [{ id: -1, penanggung_jawab_id: null }];

        const kegiatan_ids = selectedKegiatanIds.length > 0
            ? selectedKegiatanIds.map(kid => ({ id: kid, penanggung_jawab_id: kegiatanPegawaiMap[kid] || null }))
            : [{ id: -1, penanggung_jawab_id: null }];

        const sub_kegiatan_ids = selectedSubKegiatanIds.length > 0
            ? selectedSubKegiatanIds.map(skid => ({ id: skid, penanggung_jawab_id: subKegiatanPegawaiMap[skid] || null }))
            : [{ id: -1, penanggung_jawab_id: null }];

        try {
            const res = await api.mappingKegiatanInstansi.syncInstansiBulk({
                instansi_id: selectedInstansi.id,
                program_ids: program_ids as any,
                kegiatan_ids: kegiatan_ids as any,
                sub_kegiatan_ids: sub_kegiatan_ids as any
            });

            if (res.success) {
                setIsKinerjaModalOpen(false);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err: any) {
            alert('Gagal menyimpan pohon kinerja cascading: ' + (err.message || err));
        } finally {
            setIsSavingKinerja(false);
        }
    };

    // Unsaved changes per Instansi for Tab 3
    const [unsavedMappings, setUnsavedMappings] = useState<Record<number, { program_ids: number[], kegiatan_ids: number[], sub_kegiatan_ids: number[] }>>({});
    const [unsavedSektorMappings, setUnsavedSektorMappings] = useState<Record<number, number[]>>({});
    const [editingInstansiId, setEditingInstansiId] = useState<number | null>(null);
    const [editingPegawaiId, setEditingPegawaiId] = useState<number | null>(null);
    const [availableInstansiMap, setAvailableInstansiMap] = useState<Record<number, Instansi[]>>({});
    const [loadingAvailable, setLoadingAvailable] = useState<Record<number, boolean>>({});

    // Filter states
    const [sektorBidangFilter, setSektorBidangFilter] = useState<string>(() => user?.bidang_id?.toString() || '');
    const isGlobalViewer = isSuperAdmin || (user?.tipe_user_id === 10 && user?.bidang_id === 5); // Katim Datinfo (Rendalev)
    const canEditSektor = [1, 4, 6, 10].includes(user?.tipe_user_id || 0);

    // Form states (Tab 1)
    const [isAddingUI, setIsAddingUI] = useState(false);
    const [newUIForm, setNewUIForm] = useState({
        urusan_id: null as number | null,
        program_id: null as number | null,
        instansi_ids: [] as number[],
    });
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editUIForm, setEditUIForm] = useState({
        urusan_id: null as number | null,
        program_id: null as number | null,
        instansi_ids: [] as number[],
    });

    // Form states (Tab Kegiatan)
    const [isAddingKegiatan, setIsAddingKegiatan] = useState(false);
    const [newKegiatanForm, setNewKegiatanForm] = useState({
        instansi_id: null as number | null,
        urusan_id: null as number | null,
        program_id: null as number | null,
        kegiatan_id: null as number | null,
        sub_kegiatan_id: null as number | null,
        type: 'kegiatan' as 'kegiatan' | 'sub_kegiatan'
    });

    // Form states (Tab 2)
    const [isAddingBidang, setIsAddingBidang] = useState(false);
    const [newBidangForm, setNewBidangForm] = useState({
        instansi_id: null as number | null,
        bidang_instansi_id: null as number | null,
    });
    const [editingBidangId, setEditingBidangId] = useState<number | null>(null);
    const [editBidangForm, setEditBidangForm] = useState({
        instansi_id: null as number | null,
        bidang_instansi_id: null as number | null,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, pRes, iRes, bRes, muiRes, mbpRes, mkRes, mskRes, mkiRes, msRes] = await Promise.all([
                api.bidangUrusan.getAll(),
                api.masterDataConfig.getDataByTable('master_program'),
                api.instansiDaerah.getAll(),
                api.bidangInstansi.getAll(),
                api.mappingUrusanInstansi.getAll(),
                api.mappingBidangPengampu.getAll(),
                api.masterDataConfig.getDataByTable('master_kegiatan'),
                api.masterDataConfig.getDataByTable('master_sub_kegiatan'),
                api.mappingKegiatanInstansi.getAll(),
                api.mappingPemegangSektor.getAll()
            ]);

            if (uRes.success) setUrusanList(uRes.data);
            if (pRes.success) setProgramList(pRes.data);
            if (iRes.success) setInstansiList(iRes.data);
            if (muiRes.success) setMappingUIList(muiRes.data || []);
            if (mbpRes.success) setMappingBidangList(mbpRes.data || []);
            if (bRes.success) setBidangList(bRes.data || []);
            if (mkRes.success) setKegiatanList(mkRes.data || []);
            if (mskRes.success) setSubKegiatanList(mskRes.data || []);
            if (mkiRes.success) {
                setMappingProgramList(mkiRes.data.program || []);
                setMappingKegiatanList(mkiRes.data.kegiatan || []);
                setMappingSubKegiatanList(mkiRes.data.sub_kegiatan || []);
            }
            if (msRes.success) setMappingSektorList(msRes.data || []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Tab 1 Handlers
    const handleAddUI = async () => {
        if (!newUIForm.urusan_id || newUIForm.instansi_ids.length === 0) return;
        try {
            const res = await api.mappingUrusanInstansi.create(newUIForm);
            if (res.success) {
                setIsAddingUI(false);
                setNewUIForm({ urusan_id: null, program_id: null, instansi_ids: [] });
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal menambah mapping');
        }
    };

    const handleUpdateUI = async () => {
        if (!editingGroupId || !editUIForm.urusan_id) return;
        try {
            const res = await api.mappingUrusanInstansi.update(0, editUIForm);
            if (res.success) {
                sessionStorage.setItem('mapping_urusan_table_lastEditedId', String(editingGroupId));
                setEditingGroupId(null);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal mengubah mapping');
        }
    };

    const handleDeleteUI = async (urusanId: number, programId: number | null) => {
        if (!confirm('Hapus mapping untuk grup ini?')) return;
        try {
            const mappingsToDelete = mappingUIList.filter(m => m.urusan_id === urusanId && (m.program_id === programId || (!m.program_id && !programId)));
            await Promise.all(mappingsToDelete.map(m => api.mappingUrusanInstansi.delete(m.id)));
            fetchData();
        } catch (err) {
            alert('Gagal menghapus mapping');
        }
    };

    // Tab 2 Handlers
    const handleAddBidang = async () => {
        if (!newBidangForm.instansi_id || !newBidangForm.bidang_instansi_id) return;
        try {
            const res = await api.mappingBidangPengampu.create(newBidangForm);
            if (res.success) {
                setIsAddingBidang(false);
                setNewBidangForm({ instansi_id: null, bidang_instansi_id: null });
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal menambah bidang');
        }
    };

    const handleUpdateBidang = async () => {
        if (!editingBidangId || !editBidangForm.instansi_id || !editBidangForm.bidang_instansi_id) return;
        try {
            const res = await api.mappingBidangPengampu.update(editingBidangId, editBidangForm);
            if (res.success) {
                sessionStorage.setItem('mapping_bidang_table_lastEditedId', String(editingBidangId));
                setEditingBidangId(null);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal mengubah bidang');
        }
    };

    const handleDeleteBidang = async (id: number) => {
        if (!confirm('Hapus mapping bidang ini?')) return;
        try {
            const res = await api.mappingBidangPengampu.delete(id);
            if (res.success) fetchData();
        } catch (err) {
            alert('Gagal menghapus bidang');
        }
    };

    // Tab Kegiatan Handlers
    const handleSaveMappingHierarchy = async (instansi_id: number) => {
        if (!unsavedMappings[instansi_id]) return;
        const payload = unsavedMappings[instansi_id];
        
        // Convert empty selections to sentinel [-1] for DB to remember it was intentionally cleared
        const program_ids = payload.program_ids.length > 0 ? payload.program_ids : [-1];
        const kegiatan_ids = payload.kegiatan_ids.length > 0 ? payload.kegiatan_ids : [-1];
        const sub_kegiatan_ids = payload.sub_kegiatan_ids.length > 0 ? payload.sub_kegiatan_ids : [-1];
        
        try {
            const res = await api.mappingKegiatanInstansi.syncInstansiBulk({
                instansi_id,
                program_ids,
                kegiatan_ids,
                sub_kegiatan_ids
            });

            if (res.success) {
                // Remove from unsaved mapping list and exit edit mode
                setUnsavedMappings(prev => {
                    const mapped = { ...prev };
                    delete mapped[instansi_id];
                    return mapped;
                });
                setEditingInstansiId(null);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal menyimpan pemetaan kegiatan');
        }
    };

    // Tab Pemegang Sektor Handlers
    const handleEditSektor = async (pegawaiId: number, currentInstansiIds: number[]) => {
        setEditingPegawaiId(pegawaiId);
        setUnsavedSektorMappings(prev => ({ ...prev, [pegawaiId]: currentInstansiIds }));
        
        // Fetch available instansi for this pegawai if not already cached
        if (!availableInstansiMap[pegawaiId]) {
            setLoadingAvailable(prev => ({ ...prev, [pegawaiId]: true }));
            try {
                const res = await api.mappingPemegangSektor.getAvailableInstansi(pegawaiId);
                if (res.success) {
                    setAvailableInstansiMap(prev => ({ ...prev, [pegawaiId]: res.data }));
                }
            } catch (err) {
                console.error('Failed to fetch available instansi:', err);
            } finally {
                setLoadingAvailable(prev => ({ ...prev, [pegawaiId]: false }));
            }
        }
    };

    const handleSaveSektor = async (pegawaiId: number) => {
        const instansi_ids = unsavedSektorMappings[pegawaiId];
        if (!instansi_ids) return;

        try {
            const res = await api.mappingPemegangSektor.update({ pegawai_id: pegawaiId, instansi_ids });
            if (res.success) {
                setEditingPegawaiId(null);
                fetchData();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Gagal menyimpan pemetaan');
        }
    };

    const handleCancelSektor = (pegawaiId: number) => {
        setEditingPegawaiId(null);
        const newUnsaved = { ...unsavedSektorMappings };
        delete newUnsaved[pegawaiId];
        setUnsavedSektorMappings(newUnsaved);
    };

    const groupedSektorData = useMemo(() => {
        let filteredSektor = mappingSektorList;
        if (sektorBidangFilter) {
            filteredSektor = mappingSektorList.filter(m => m.bidang_id === parseInt(sektorBidangFilter));
        }

        const groupedMap = new Map();
        filteredSektor.forEach(item => {
            if (!groupedMap.has(item.pegawai_id)) {
                groupedMap.set(item.pegawai_id, {
                    id: item.pegawai_id,
                    nama_lengkap: item.nama_lengkap,
                    bidang_id: item.bidang_id,
                    nama_bidang: item.nama_bidang,
                    nama_jabatan: item.nama_jabatan, // From updated backend
                    inst: []
                });
            }
            if (item.instansi_id) {
                groupedMap.get(item.pegawai_id).inst.push({
                    id: item.instansi_id,
                    nama: item.nama_instansi,
                    singkatan: item.singkatan_instansi
                });
            }
        });

        // Hierarchy sorting
        const getWeight = (j: string) => {
            if (!j) return 99;
            const title = j.toLowerCase();
            if (title.includes('kepala badan') || title === 'kepala') return 1;
            if (title.includes('sekretaris')) return 2;
            if (title.includes('kepala bidang')) return 3;
            if (title.includes('kepala sub bagian') || title.includes('ketua tim')) return 4;
            return 5;
        };

        return Array.from(groupedMap.values()).sort((a, b) => {
            const wA = getWeight(a.nama_jabatan);
            const wB = getWeight(b.nama_jabatan);
            if (wA !== wB) return wA - wB;
            return a.nama_lengkap.localeCompare(b.nama_lengkap);
        });
    }, [mappingSektorList, sektorBidangFilter]);

    // Data Filtering & Grouping

    const bapperidaId = React.useMemo(() =>
        instansiList.find(i => i.id === 2 || i.singkatan?.toUpperCase() === 'BAPPERIDA' || i.instansi?.toUpperCase().includes('BAPPERIDA'))?.id || 2
        , [instansiList]);

    const bapperidaBidangOptions = React.useMemo(() =>
        bidangList.filter(b => b.instansi_id === bapperidaId)
        , [bidangList, bapperidaId]);

    const groupedMappingUIList = React.useMemo(() => {
        const groups: { [key: string]: any } = {};
        mappingUIList.forEach(m => {
            const groupKey = `${m.urusan_id}-${m.program_id || 'null'}`;
            // Always initialize the group
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    id: groupKey,
                    urusan_id: m.urusan_id,
                    nama_urusan: m.nama_urusan,
                    program_id: m.program_id,
                    nama_program: m.nama_program,
                    instansi: []
                };
            }

            // Push mapping only if it exists
            if (m.id && m.instansi_id) {
                groups[groupKey].instansi.push({
                    id: m.instansi_id,
                    nama: m.nama_instansi,
                    singkatan: m.singkatan_instansi,
                    mapping_id: m.id
                });
            }
        });
        return Object.values(groups).sort((a: any, b: any) => {
            const urusanComp = (a.nama_urusan || '').localeCompare(b.nama_urusan || '');
            if (urusanComp !== 0) return urusanComp;
            return (a.nama_program || '').localeCompare(b.nama_program || '');
        });
    }, [mappingUIList]);

    // Helpers for selection with auto-selection of children
    const handleProgramChange = (instansiId: number, newVal: number[]) => {
        const item = combinedMappingKegiatan.find(i => i.id === instansiId);
        if (!item) return;

        const current = unsavedMappings[instansiId] || { 
            program_ids: item.selections.programs, 
            kegiatan_ids: item.selections.kegiatans, 
            sub_kegiatan_ids: item.selections.subKegiatans 
        };

        const added = newVal.filter(id => !current.program_ids.includes(id));
        const childrenToAdd = kegiatanList.filter(k => added.includes(k.program_id)).map(k => k.id);
        const subChildrenToAdd = subKegiatanList.filter(sk => childrenToAdd.includes(sk.kegiatan_id)).map(sk => sk.id);

        // Filter out children of removed programs
        const validKegiatanIds = kegiatanList.filter(k => newVal.includes(k.program_id)).map(k => k.id);
        const finalKegiatans = [...new Set([...current.kegiatan_ids.filter(id => validKegiatanIds.includes(id)), ...childrenToAdd])];
        
        const validSubIds = subKegiatanList.filter(sk => finalKegiatans.includes(sk.kegiatan_id)).map(sk => sk.id);
        const finalSubs = [...new Set([...current.sub_kegiatan_ids.filter(id => validSubIds.includes(id)), ...subChildrenToAdd])];

        setUnsavedMappings(prev => ({
            ...prev,
            [instansiId]: {
                ...current,
                program_ids: newVal,
                kegiatan_ids: finalKegiatans,
                sub_kegiatan_ids: finalSubs
            }
        }));
    };

    const handleKegiatanChange = (instansiId: number, newVal: number[]) => {
        const item = combinedMappingKegiatan.find(i => i.id === instansiId);
        if (!item) return;

        const current = unsavedMappings[instansiId] || { 
            program_ids: item.selections.programs, 
            kegiatan_ids: item.selections.kegiatans, 
            sub_kegiatan_ids: item.selections.subKegiatans 
        };

        const added = newVal.filter(id => !current.kegiatan_ids.includes(id));
        const childrenToAdd = subKegiatanList.filter(sk => added.includes(sk.kegiatan_id)).map(sk => sk.id);

        // Filter out children of removed kegiatans
        const validSubIds = subKegiatanList.filter(sk => newVal.includes(sk.kegiatan_id)).map(sk => sk.id);
        const finalSubs = [...new Set([...current.sub_kegiatan_ids.filter(id => validSubIds.includes(id)), ...childrenToAdd])];

        setUnsavedMappings(prev => ({
            ...prev,
            [instansiId]: {
                ...current,
                kegiatan_ids: newVal,
                sub_kegiatan_ids: finalSubs
            }
        }));
    };



    const handleSubKegiatanChange = (instansiId: number, newVal: number[]) => {
        const item = combinedMappingKegiatan.find(i => i.id === instansiId);
        if (!item) return;

        const current = unsavedMappings[instansiId] || { 
            program_ids: item.selections.programs, 
            kegiatan_ids: item.selections.kegiatans, 
            sub_kegiatan_ids: item.selections.subKegiatans 
        };

        setUnsavedMappings(prev => ({
            ...prev,
            [instansiId]: { ...current, sub_kegiatan_ids: newVal }
        }));
    };

    const handleSaveDirectTableMapping = async (instansiId: number) => {
        const unsaved = unsavedMappings[instansiId];
        if (!unsaved) return;
        try {
            const payload = {
                instansi_id: instansiId,
                program_ids: unsaved.program_ids,
                kegiatan_ids: unsaved.kegiatan_ids,
                sub_kegiatan_ids: unsaved.sub_kegiatan_ids
            };
            const res = await (api as any).mappingKegiatanInstansi.save(payload);
            if (res && res.success) {
                setUnsavedMappings(prev => {
                    const next = { ...prev };
                    delete next[instansiId];
                    return next;
                });
                fetchData();
            } else {
                alert(res?.message || 'Gagal menyimpan pemetaan kegiatan');
            }
        } catch (err: any) {
            console.error('Error saving mapping kegiatan:', err);
            alert('Terjadi kesalahan saat menyimpan pemetaan: ' + err.message);
        }
    };

    const handleCancelDirectTableMapping = (instansiId: number) => {
        setUnsavedMappings(prev => {
            const next = { ...prev };
            delete next[instansiId];
            return next;
        });
    };


    const uiColumns = [
        { header: 'Bidang Urusan', key: 'nama_urusan', className: 'font-bold w-1/4' },
        { 
            header: 'Program', 
            key: 'nama_program', 
            className: 'text-slate-600 w-1/4',
            render: (item: any) => item.nama_program || <span className="text-[10px] text-slate-300 italic font-normal">(Semua Program)</span>
        },
        {
            header: 'Instansi Pengampu',
            key: 'instansi',
            render: (item: any) => {
                if (!item.instansi || item.instansi.length === 0) return null;
                const first = item.instansi[0];
                const remaining = item.instansi.length - 1;
                
                return (
                    <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col gap-0.5 min-w-[120px]">
                            <span className="text-xs font-black text-ppm-slate uppercase tracking-wider">{first.nama}</span>
                            {first.singkatan && <span className="text-[10px] text-slate-400 font-mono italic">{first.singkatan}</span>}
                        </div>
                        {remaining > 0 && (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 uppercase tracking-widest whitespace-nowrap">
                                +{remaining} Lainnya
                            </span>
                        )}
                    </div>
                );
            }
        }

    ];

    const bidangColumns = [
        {
            header: 'Instansi Daerah',
            key: 'nama_instansi',
            className: 'font-bold w-1/3',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{item.nama_instansi}</span>
                    {item.singkatan_instansi && <span className="text-[10px] text-slate-400 font-mono italic">{item.singkatan_instansi}</span>}
                </div>
            )
        },
        {
            header: 'Bidang Penanggung Jawab (Bapperida)',
            key: 'nama_bidang_pengampu',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-indigo-600">{item.nama_bidang_pengampu}</span>
                    {item.singkatan_bidang && <span className="text-[10px] text-slate-400 italic">({item.singkatan_bidang})</span>}
                </div>
            )
        }
    ];



    const kegiatanColumns = [
        {
            header: 'Instansi',
            key: 'instansi',
            className: 'font-bold bg-slate-50 w-[15%] align-top',
            render: (item: any) => (
                <div className="flex flex-col whitespace-normal break-words">
                    <span className="text-sm font-black text-ppm-slate uppercase tracking-tight leading-tight">{item.instansi}</span>
                    {item.singkatan && <span className="text-[10px] text-slate-400 font-mono italic">{item.singkatan}</span>}
                </div>
            )
        },
        { 
            header: 'Bidang Urusan', 
            key: 'selections.urusan', 
            className: 'w-[15%] align-top', 
            render: (item: any) => (
                <CollapsibleSelect
                    value={item.selections.urusan}
                    options={item.options.urusan}
                    label="Bidang Urusan"
                    keyField="id"
                    displayField="nama_urusan"
                    entityName="Bidang Urusan"
                    disabled={true} // Read-only in this tab as requested
                />
            )
        },
        { 
            header: 'Program', 
            key: 'selections.programs', 
            className: 'w-[20%] align-top', 
            render: (item: any) => (
                <CollapsibleSelect
                    value={item.selections.programs}
                    options={item.options.programs}
                    label="Semua Program..."
                    keyField="id"
                    displayField="nama_program"
                    entityName="Program"
                    onChange={(val) => handleProgramChange(item.id, val)}
                    disabled={!isSuperAdmin}
                />
            )
        },
        {
            header: 'Kegiatan',
            key: 'selections.kegiatans',
            className: 'w-[20%] align-top',
            render: (item: any) => (
                <CollapsibleSelect
                    value={item.selections.kegiatans}
                    options={item.options.kegiatans}
                    label="Semua Kegiatan..."
                    keyField="id"
                    displayField="nama_kegiatan"
                    entityName="Kegiatan"
                    onChange={(val) => handleKegiatanChange(item.id, val)}
                    disabled={!isSuperAdmin}
                />
            )
        },
        {
            header: 'Subkegiatan',
            key: 'selections.subKegiatans',
            className: 'w-[20%] align-top',
            render: (item: any) => (
                <CollapsibleSelect
                    value={item.selections.subKegiatans}
                    options={item.options.subKegiatans}
                    label="Semua Subkegiatan..."
                    keyField="id"
                    displayField="nama_sub_kegiatan"
                    entityName="Subkegiatan"
                    onChange={(val) => handleSubKegiatanChange(item.id, val)}
                    disabled={!isSuperAdmin}
                />
            )
        },
        {
            header: 'Aksi',
            key: 'aksi',
            className: 'w-32 align-top text-center',
            render: (item: any) => {
                return (
                    <div className="flex items-center justify-center gap-1.5">
                        {item.isModified && (
                            <>
                                <button
                                    onClick={() => handleSaveDirectTableMapping(item.id)}
                                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
                                    title="Simpan Perubahan Tabel"
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    onClick={() => handleCancelDirectTableMapping(item.id)}
                                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                                    title="Batal"
                                >
                                    <X size={14} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleStartEditKinerja(item)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-100 px-2.5 py-1.5 rounded-xl transition-all font-black text-[11px] uppercase flex items-center gap-1 shrink-0"
                            title="Atur Perjanjian Kinerja & Cascading"
                        >
                            <Edit2 size={12} />
                            <span>Atur PK</span>
                        </button>
                    </div>
                );
            }
        }
    ];

    const sektorColumns = [
        {
            header: 'Nama Pemegang Sektor',
            key: 'nama_lengkap',
            className: 'font-bold w-1/3',
            render: (item: any) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-ppm-slate uppercase tracking-tight">{item.nama_lengkap}</span>
                        {item.inst.length > 0 && (
                            <div className="flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50/50 border border-indigo-100 shadow-sm">
                                <span className="text-[10px] font-black bg-gradient-to-br from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                                    {item.inst.length}
                                </span>
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 italic font-medium">{item.nama_bidang || 'Lainnya'}</span>
                </div>
            )
        },
        {
            header: 'Instansi yang Diampu',
            key: 'instansi',
            render: (item: any) => {
                const currentSelection = unsavedSektorMappings[item.id] !== undefined 
                    ? unsavedSektorMappings[item.id] 
                    : item.inst.map((i: any) => i.id);
                
                const availableOptions = availableInstansiMap[item.id] || [];
                const isLoading = loadingAvailable[item.id];

                if (editingPegawaiId === item.id) {
                    return (
                        <SearchableSelect
                            value={currentSelection}
                            onChange={(val: any) => setUnsavedSektorMappings(prev => ({ ...prev, [item.id]: val }))}
                            options={availableOptions}
                            label={isLoading ? "Memuat..." : "Pilih Instansi..."}
                            keyField="id"
                            displayField="instansi"
                            multiple
                            disabled={isLoading}
                            autoFocus
                        />
                    );
                }

                return (
                    <div className="flex flex-wrap gap-1.5">
                        {item.inst && item.inst.length > 0 ? (
                            item.inst.map((inst: any) => (
                                <span 
                                    key={inst.id} 
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 shadow-sm"
                                >
                                    {inst.singkatan || inst.instansi}
                                </span>
                            ))
                        ) : (
                            <span className="text-slate-400 text-xs italic font-medium">Belum ada instansi diampu</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Aksi',
            key: 'aksi',
            className: 'w-24 text-center',
            render: (item: any) => {
                if (editingPegawaiId === item.id) {
                    return (
                        <div className="flex justify-center gap-1">
                            <button
                                onClick={() => handleSaveSektor(item.id)}
                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                                title="Simpan Perubahan"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => handleCancelSektor(item.id)}
                                className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                title="Batal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                }
                return (
                    <div className="flex gap-1">
                        {canEditSektor && (
                            <button
                                onClick={() => {
                                    setEditingPegawaiId(item.id);
                                    // Trigger check if instances are available
                                    if (!availableInstansiMap[item.id]) {
                                        handleEditSektor(item.id, item.inst.map((i: any) => i.id));
                                    } else {
                                        // If already cached, just set unsaved mappings
                                        setUnsavedSektorMappings(prev => ({ ...prev, [item.id]: item.inst.map((i: any) => i.id) }));
                                    }
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl transition-colors mx-auto flex"
                                title="Edit Pemetaan"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    const combinedMappingKegiatan = React.useMemo(() => {
        const isBapperida = isSuperAdmin || user?.instansi_id === 2 || user?.tipe_user_id === 8;
        let filteredInstansi = instansiList;

        if (!isBapperida && user?.instansi_id) {
            filteredInstansi = instansiList.filter(i => i.id === user.instansi_id);
        } else if (!isGlobalViewer && user?.bidang_id) {
            const allowedInstansiIds = mappingBidangList
                .filter(m => m.bidang_instansi_id === user.bidang_id)
                .map(m => m.instansi_id);
            filteredInstansi = instansiList.filter(i => allowedInstansiIds.includes(i.id));
        }

        return filteredInstansi.map(instansi => {
            const mappedUrusanItems = mappingUIList.filter(m => m.instansi_id === instansi.id);
            const allowedUrusanIds = [...new Set(mappedUrusanItems.map(m => m.urusan_id))];
            const allowedUrusanObjects = Array.from(new Set(mappedUrusanItems.map(m => m.urusan_id))).map(id => {
                const item = mappedUrusanItems.find(m => m.urusan_id === id);
                const master = urusanList.find(u => u.id === id);
                const code = master ? (master as any).kode_urusan : 'X.XX';
                return { id: item.urusan_id, nama_urusan: item.nama_urusan, kode_urusan: code };
            }).sort((a, b) => (a.kode_urusan || '').localeCompare(b.kode_urusan || '', undefined, { numeric: true }));
            
            // Allowed options based on DB relations. Note: program uses bidang_urusan_id and urusan_id depending on master logic
            const penunjangPrograms = programList.filter(p => p.kode_program === '01' || p.urusan_id === 354);
            const standardPrograms = programList.filter(p => allowedUrusanIds.includes(p.urusan_id) || allowedUrusanIds.includes(p.bidang_urusan_id));
            
            // Function to dynamically format program name based on instance's primary urusan
            const formatProgramName = (p: any) => {
                const progUrusanId = p.urusan_id || p.bidang_urusan_id;
                let urusanObj = urusanList.find(u => u.id === progUrusanId);
                if (!urusanObj) {
                    // Fallback to first mapped urusan
                    const firstUrusanId = mappedUrusanItems[0]?.urusan_id;
                    urusanObj = urusanList.find(u => u.id === firstUrusanId);
                }
                const prefix = (urusanObj as any)?.kode_urusan || 'X.XX';
                const cleanName = (p.nama_program || '').replace(/\r?\n|\r/g, ' ');
                return `${prefix}.${p.kode_program || 'XX'} - ${cleanName}`;
            };

            const validPrograms = [...new Set([...standardPrograms, ...penunjangPrograms])].map(p => ({
                ...p,
                nama_program: formatProgramName(p)
            })).sort((a, b) => {
                const codeA = a.kode_program || '';
                const codeB = b.kode_program || '';
                return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
            });

            const validKegiatans = kegiatanList.filter(k => validPrograms.some(p => p.id === k.program_id));
            const validSubKegiatans = subKegiatanList.filter(sk => validKegiatans.some(k => k.id === sk.kegiatan_id));

            // DB values
            const dbPrograms = mappingProgramList.filter(m => m.instansi_id === instansi.id).map(m => m.program_id);
            const dbKegiatans = mappingKegiatanList.filter(m => m.instansi_id === instansi.id).map(m => m.kegiatan_id);
            const dbSubKegiatans = mappingSubKegiatanList.filter(m => m.instansi_id === instansi.id).map(m => m.sub_kegiatan_id);

            // Compute current values (DB fallback to ALL if virgin)
            const isVirginProgram = dbPrograms.length === 0;
            const isVirginKegiatan = dbKegiatans.length === 0;
            const isVirginSub = dbSubKegiatans.length === 0;

            const defaultPrograms = isVirginProgram ? validPrograms.map(p=>p.id) : (dbPrograms.includes(-1) ? [] : dbPrograms);
            const defaultKegiatans = isVirginKegiatan ? validKegiatans.map(k=>k.id) : (dbKegiatans.includes(-1) ? [] : dbKegiatans);
            const defaultSubs = isVirginSub ? validSubKegiatans.map(sk=>sk.id) : (dbSubKegiatans.includes(-1) ? [] : dbSubKegiatans);

            const unsaved = unsavedMappings[instansi.id];
            
            const currentPrograms = unsaved ? unsaved.program_ids : defaultPrograms;
            const currentValidKegiatans = kegiatanList.filter(k => currentPrograms.includes(k.program_id));
            const currentValidKegiatanIds = currentValidKegiatans.map(k=>k.id);
            
            const rawCurrentKegiatans = unsaved ? unsaved.kegiatan_ids : defaultKegiatans;
            // Only keep kegiatans that belong to the currently selected programs
            const currentKegiatans = rawCurrentKegiatans.filter(id => currentValidKegiatanIds.includes(id));

            const currentValidSubKegiatans = subKegiatanList.filter(sk => currentKegiatans.includes(sk.kegiatan_id));
            const currentValidSubKegiatanIds = currentValidSubKegiatans.map(sk=>sk.id);
            const rawCurrentSubs = unsaved ? unsaved.sub_kegiatan_ids : defaultSubs;
            const currentSubs = rawCurrentSubs.filter(id => currentValidSubKegiatanIds.includes(id));

            return {
                ...instansi,
                options: {
                    urusan: allowedUrusanObjects,
                    programs: validPrograms,
                    kegiatans: [...currentValidKegiatans].sort((a, b) => {
                        const codeA = a.kode_kegiatan || '';
                        const codeB = b.kode_kegiatan || '';
                        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                    }),
                    subKegiatans: [...currentValidSubKegiatans].sort((a, b) => {
                        const codeA = a.kode_sub_kegiatan || '';
                        const codeB = b.kode_sub_kegiatan || '';
                        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                    }),
                },
                selections: {
                    urusan: allowedUrusanIds,
                    programs: currentPrograms,
                    kegiatans: currentKegiatans,
                    subKegiatans: currentSubs,
                },
                isModified: !!unsaved
            }
        });
    }, [instansiList, mappingUIList, programList, kegiatanList, subKegiatanList, mappingProgramList, mappingKegiatanList, mappingSubKegiatanList, unsavedMappings]);

    const instansiOptionsExcludingBapperida = React.useMemo(() =>
        instansiList.filter(i => i.id !== bapperidaId),
        [instansiList, bapperidaId]);

    const tabs = useMemo(() => [
        { id: 'urusan', label: 'Pemetaan Bidang Urusan', icon: <Layers size={16} />, slug: 'mapping-urusan', color: 'text-ppm-blue' },
        { id: 'kegiatan', label: 'Pemetaan Kegiatan & Subkegiatan', icon: <Search size={16} />, slug: 'mapping-kegiatan', color: 'text-emerald-600' },
        { id: 'bidang', label: 'Pemetaan Instansi (Koordinasi)', icon: <Briefcase size={16} />, slug: 'mapping-instansi', color: 'text-indigo-600' },
        { id: 'sektor', label: 'Pemegang Sektor', icon: <Briefcase size={16} />, slug: 'mapping-sektor', color: 'text-ppm-slate' },
    ], []);

    const visibleTabs = useMemo(() => {
        const isBapperida = isSuperAdmin || user?.instansi_id === 2 || user?.tipe_user_id === 8;
        if (!isBapperida) {
            return tabs.filter(t => t.id === 'kegiatan');
        }
        return tabs.filter(t => 
            isSuperAdmin || 
            allowedActionPages.includes(t.slug) || 
            allowedActionPages.includes('referensi-urusan-instansi')
        );
    }, [isSuperAdmin, user, allowedActionPages, tabs]);

    // Auto-switch to first available tab if current is not allowed
    useEffect(() => {
        if (allowedActionPages.length > 0 && !isSuperAdmin) {
            const currentTabObj = tabs.find(t => t.id === activeTab);
            const hasAccess = allowedActionPages.includes('referensi-urusan-instansi') || (currentTabObj && allowedActionPages.includes(currentTabObj.slug));
            
            if (!hasAccess && visibleTabs.length > 0) {
                setActiveTab(visibleTabs[0].id as any);
            }
        }
    }, [allowedActionPages, isSuperAdmin, activeTab, visibleTabs, tabs]);

    // Helper to resolve clean abbreviations from potentially long names
    const resolveSingkatan = (nama: string, s1?: string, s2?: string) => {
        const s = (s1 || s2 || '').trim();
        // If we have a short abbreviation from DB, use it directly
        if (s && s.length <= 10 && s.length > 0 && !s.includes(' ')) return s.toUpperCase();
        
        const n = nama?.toUpperCase() || '';
        if (n.includes('PENDAYAGUNAAN')) return 'PPM';
        if (n.includes('PEREKONOMIAN')) return 'PE';
        if (n.includes('SOSIAL')) return 'SOSBUD';
        if (n.includes('INFRASTRUKTUR') || n.includes('WILAYAH')) return 'IPW';
        if (n.includes('SEKRETARIAT')) return 'SEKR';
        if (n.includes('PEMERINTAHAN')) return 'PMM';
        
        // Final fallback: Acronym of words > 2 chars
        return n.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 5) || n.substring(0, 3);
    };

    // Coordination Summary Calculation
    const coordinationSummary = useMemo(() => {
        const counts: Record<number, { id: number, nama: string, singkatan: string, count: number }> = {};
        
        // Initialize with all Bapperida bidangs
        bapperidaBidangOptions.forEach(b => {
            // Check multiple possible property names for abbreviations
            // @ts-ignore - b might have either property from different API endpoints
            const dbAbbr = b.singkatan || b.singkatan_bidang;
            counts[b.id] = { 
                id: b.id, 
                nama: b.nama_bidang, 
                singkatan: resolveSingkatan(b.nama_bidang, dbAbbr), 
                count: 0 
                };
            });

        // Count mappings
        mappingBidangList.forEach(m => {
            if (counts[m.bidang_instansi_id]) {
                counts[m.bidang_instansi_id].count++;
            }
        });

        return Object.values(counts).sort((a, b) => b.count - a.count);
    }, [bapperidaBidangOptions, mappingBidangList, resolveSingkatan]);

    if (loading && !isSuperAdmin && allowedActionPages.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-ppm-slate">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    const getBidangColor = (singkatan: string) => {
        const s = singkatan?.toUpperCase() || '';
        if (s === 'PPM') return 'from-blue-500 to-indigo-600';
        if (s === 'PE') return 'from-emerald-500 to-teal-600';
        if (s === 'SOSBUD' || s.includes('SOS')) return 'from-amber-500 to-orange-600';
        if (s === 'SEKR' || s.includes('SEK')) return 'from-slate-500 to-slate-700';
        if (s === 'IPW' || s.includes('INF')) return 'from-violet-500 to-purple-600';
        return 'from-indigo-500 to-blue-600';
    };

    const getBidangIcon = (singkatan: string) => {
        const s = singkatan?.toUpperCase() || '';
        if (s === 'PPM') return <Layers size={20} />;
        if (s === 'PE') return <Briefcase size={20} />;
        if (s === 'SOSBUD' || s.includes('SOS')) return <Plus size={20} />;
        if (s === 'IPW' || s.includes('INF')) return <Layers size={20} />;
        return <Briefcase size={20} />;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">MAPPING BIDANG URUSAN & PENGAMPU</h1>
                <p className="text-slate-500 text-sm">Pemetaan bidang urusan pemerintahan dengan instansi pengampu dan koordinasi internal Bapperida.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? `bg-white ${tab.color} shadow-sm` : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'urusan' ? (
                <BaseDataTable<any>
                    title="Daftar Pemetaan Bidang Urusan"
                    subtitle="Mapping bidang urusan ke instansi pengampu daerah."
                    data={groupedMappingUIList}
                    columns={uiColumns}
                    loading={loading}
                    addButtonLabel="Tambah Mapping"
                    onAddClick={() => setIsAddingUI(true)}
                    editingId={editingGroupId}
                    persistenceKey="mapping_urusan_table"
                    renderAddRow={() => isAddingUI && (
                        <tr className="bg-indigo-50/50">
                            <td className="p-4 text-center text-xs font-bold text-indigo-600">NEW</td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={newUIForm.urusan_id}
                                    onChange={val => setNewUIForm({ ...newUIForm, urusan_id: val, program_id: null })}
                                    options={urusanList}
                                    label="Pilih Bidang Urusan"
                                    keyField="id"
                                    displayField="urusan"
                                />
                            </td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={newUIForm.program_id}
                                    onChange={val => setNewUIForm({ ...newUIForm, program_id: val })}
                                    options={programList.filter(p => !newUIForm.urusan_id || p.bidang_urusan_id === newUIForm.urusan_id)}
                                    label="Pilih Program (Opsional)"
                                    keyField="id"
                                    displayField="nama_program"
                                    disabled={!newUIForm.urusan_id}
                                />
                            </td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={newUIForm.instansi_ids}
                                    onChange={val => setNewUIForm({ ...newUIForm, instansi_ids: val })}
                                    options={instansiList}
                                    label="Daftar Instansi"
                                    keyField="id"
                                    displayField="instansi"
                                    multiple
                                />
                            </td>
                            <td className="p-2">
                                <div className="flex justify-center gap-2">
                                    <button onClick={handleAddUI} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={16} /></button>
                                    <button onClick={() => setIsAddingUI(false)} className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"><X size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    )}
                    renderEditRow={(item) => (
                        <tr className="bg-amber-50/50 border-y border-amber-200">
                            <td className="p-4 text-center text-xs font-bold text-amber-600">EDIT</td>
                            <td className="p-2 text-sm font-bold text-slate-700">{item.nama_urusan}</td>
                            <td className="p-2 text-sm text-slate-600">{item.nama_program || '(Semua Program)'}</td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={editUIForm.instansi_ids}
                                    onChange={val => setEditUIForm({ ...editUIForm, instansi_ids: val })}
                                    options={instansiList}
                                    label="Daftar Instansi"
                                    keyField="id"
                                    displayField="instansi"
                                    multiple
                                    autoFocus
                                />
                            </td>
                            <td className="p-2">
                                <div className="flex justify-center gap-2">
                                    <button onClick={handleUpdateUI} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"><Check size={16} /></button>
                                    <button onClick={() => setEditingGroupId(null)} className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"><X size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    )}
                    renderActions={(item) => (
                        <div className="flex gap-1">
                            <button
                                onClick={() => {
                                    setEditingGroupId(item.id);
                                    setEditUIForm({
                                        urusan_id: item.urusan_id,
                                        program_id: item.program_id,
                                        instansi_ids: item.instansi.map((i: any) => i.id)
                                    });
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteUI(item.urusan_id, item.program_id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />
            ) : activeTab === 'kegiatan' ? (
                <BaseDataTable<any>
                    title="Daftar Pemetaan Kegiatan & Subkegiatan"
                    subtitle="Pemetaan hierarkis Program, Kegiatan, dan Subkegiatan yang diampu oleh instansi daerah."
                    data={combinedMappingKegiatan}
                    columns={kegiatanColumns}
                    loading={loading}
                    persistenceKey="mapping_kegiatan_hierarchy_table"
                />
            ) : activeTab === 'sektor' ? (
                <div className="flex flex-col gap-4">
                    <div className="flex justify-end items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-2">
                            <Filter size={14} /> Filter Bidang:
                        </span>
                        <select
                            value={sektorBidangFilter}
                            onChange={(e) => setSektorBidangFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium min-w-[200px]"
                        >
                            <option value="">Semua Bidang</option>
                            {bidangList.map(b => (
                                <option key={b.id} value={b.id}>{b.nama_bidang}</option>
                            ))}
                        </select>
                    </div>
                    <BaseDataTable<any>
                        title="Daftar Pemegang Sektor"
                        subtitle="Pemetaan pegawai Bapperida ke instansi daerah yang diampu."
                        data={groupedSektorData}
                        columns={sektorColumns}
                        loading={loading}
                        persistenceKey="mapping_sektor_table"
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Coordination Summary Cards */}
                    {!loading && mappingBidangList.length > 0 && (
                        <div className="flex items-center flex-nowrap gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {coordinationSummary.map((item) => (
                                <div 
                                    key={item.id}
                                    className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 whitespace-nowrap group"
                                >
                                    <div className={`p-1.5 rounded-full bg-gradient-to-br ${getBidangColor(item.singkatan)} text-white shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        {React.cloneElement(getBidangIcon(item.singkatan) as any, { size: 12 })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-tight" title={item.nama}>{item.singkatan}</span>
                                        <div className="h-3 w-px bg-slate-200" />
                                        <span className={`text-base font-black bg-gradient-to-br ${getBidangColor(item.singkatan)} bg-clip-text text-transparent tracking-tighter`}>
                                            {item.count}
                                        </span>
                                        <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">Instansi</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <BaseDataTable<any>
                        title="Daftar Koordinasi Instansi"
                    subtitle="Pemetaan Instansi Daerah ke Bidang Penanggung Jawab di Bapperida."
                    data={mappingBidangList}
                    columns={bidangColumns}
                    loading={loading}
                    addButtonLabel="Tambah Pemetaan Instansi"
                    onAddClick={() => setIsAddingBidang(true)}
                    editingId={editingBidangId}
                    persistenceKey="mapping_bidang_table"
                    renderAddRow={() => isAddingBidang && (
                        <tr className="bg-indigo-50/50">
                            <td className="p-4 text-center text-xs font-bold text-indigo-600">NEW</td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={newBidangForm.instansi_id}
                                    onChange={val => setNewBidangForm({ ...newBidangForm, instansi_id: val })}
                                    options={instansiOptionsExcludingBapperida}
                                    label="Pilih Instansi Daerah"
                                    keyField="id"
                                    displayField="instansi"
                                />
                            </td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={newBidangForm.bidang_instansi_id}
                                    onChange={val => setNewBidangForm({ ...newBidangForm, bidang_instansi_id: val })}
                                    options={bapperidaBidangOptions}
                                    label="Pilih Bidang Bapperida"
                                    keyField="id"
                                    displayField="nama_bidang"
                                />
                            </td>
                            <td className="p-2">
                                <div className="flex justify-center gap-2">
                                    <button onClick={handleAddBidang} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={16} /></button>
                                    <button onClick={() => setIsAddingBidang(false)} className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"><X size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    )}
                    renderEditRow={(item) => (
                        <tr className="bg-amber-50/50 border-y border-amber-200">
                            <td className="p-4 text-center text-xs font-bold text-amber-600">EDIT</td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={editBidangForm.instansi_id}
                                    onChange={val => setEditBidangForm({ ...editBidangForm, instansi_id: val })}
                                    options={instansiList}
                                    label="Pilih Instansi"
                                    keyField="id"
                                    displayField="instansi"
                                    disabled
                                />
                            </td>
                            <td className="p-2">
                                <SearchableSelect
                                    value={editBidangForm.bidang_instansi_id}
                                    onChange={val => setEditBidangForm({ ...editBidangForm, bidang_instansi_id: val })}
                                    options={bapperidaBidangOptions}
                                    label="Pilih Bidang Bapperida"
                                    keyField="id"
                                    displayField="nama_bidang"
                                    autoFocus
                                />
                            </td>
                            <td className="p-2">
                                <div className="flex justify-center gap-2">
                                    <button onClick={handleUpdateBidang} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"><Check size={16} /></button>
                                    <button onClick={() => setEditingBidangId(null)} className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"><X size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    )}
                    renderActions={(item) => (
                        <div className="flex gap-1">
                            <button
                                onClick={() => {
                                    setEditingBidangId(item.id);
                                    setEditBidangForm({
                                        instansi_id: item.instansi_id,
                                        bidang_instansi_id: item.bidang_instansi_id
                                    });
                                }}
                                className="text-slate-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-xl transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteBidang(item.id)} className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />
            </div>
            )}

            {/* Pohon Kinerja / Perjanjian Kinerja Cascading Modal */}
            {isKinerjaModalOpen && selectedInstansi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col w-full max-w-[92vw] h-[90vh] max-h-[920px] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-blue-50/20 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-sm">
                                    <Layers size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Pohon Cascading Perjanjian Kinerja</h2>
                                    <span className="text-xs text-slate-500 font-medium">
                                        Instansi: <strong className="text-indigo-600 font-bold uppercase">{selectedInstansi.instansi}</strong> ({selectedInstansi.singkatan})
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsKinerjaModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-50/50">
                            
                            

                            {isLoadingPegawai ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-indigo-500">
                                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                                    <span className="text-sm font-semibold">Memuat personil SKPD & instrumen cascading...</span>
                                </div>
                            ) : selectedInstansi.options.programs.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                                    <Layers className="w-12 h-12 mb-3 text-slate-300" />
                                    <h3 className="text-sm font-bold text-slate-600 uppercase">Belum ada Bidang Urusan</h3>
                                    <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">SKPD ini belum dipetakan ke bidang urusan apapun. Silakan petakan urusan pada tab **Pemetaan Bidang Urusan** terlebih dahulu.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    
                                    {/* Stats Counters Grid */}
                                    {(() => {
                                        // Programs calculation
                                        const countSelectedProgUtama = selectedInstansi.options.programs.filter((p: any) => {
                                            const isPenunjang = p.kode_program === '01' || p.urusan_id === 354;
                                            return !isPenunjang && selectedProgramIds.includes(p.id);
                                        }).length;

                                        const countSelectedProgPenunjang = selectedInstansi.options.programs.filter((p: any) => {
                                            const isPenunjang = p.kode_program === '01' || p.urusan_id === 354;
                                            return isPenunjang && selectedProgramIds.includes(p.id);
                                        }).length;

                                        const countTotalProgUtama = selectedInstansi.options.programs.filter((p: any) => {
                                            const isPenunjang = p.kode_program === '01' || p.urusan_id === 354;
                                            return !isPenunjang;
                                        }).length;

                                        const countTotalProgPenunjang = selectedInstansi.options.programs.filter((p: any) => {
                                            const isPenunjang = p.kode_program === '01' || p.urusan_id === 354;
                                            return isPenunjang;
                                        }).length;

                                        // Kegiatan calculation
                                        const countSelectedKegUtama = kegiatanList.filter((k: any) => {
                                            const parentProg = selectedInstansi.options.programs.find((p: any) => p.id === k.program_id);
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return !isPenunjang && selectedKegiatanIds.includes(k.id);
                                        }).length;

                                        const countSelectedKegPenunjang = kegiatanList.filter((k: any) => {
                                            const parentProg = selectedInstansi.options.programs.find((p: any) => p.id === k.program_id);
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return isPenunjang && selectedKegiatanIds.includes(k.id);
                                        }).length;

                                        const countTotalKegUtama = kegiatanList.filter((k: any) => {
                                            const parentProg = selectedInstansi.options.programs.find((p: any) => p.id === k.program_id);
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return !isPenunjang;
                                        }).length;

                                        const countTotalKegPenunjang = kegiatanList.filter((k: any) => {
                                            const parentProg = selectedInstansi.options.programs.find((p: any) => p.id === k.program_id);
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return isPenunjang;
                                        }).length;

                                        // Subkegiatan calculation
                                        const countSelectedSubUtama = subKegiatanList.filter((sk: any) => {
                                            const parentKeg = kegiatanList.find((k: any) => k.id === sk.kegiatan_id);
                                            const parentProg = parentKeg ? selectedInstansi.options.programs.find((p: any) => p.id === parentKeg.program_id) : null;
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return !isPenunjang && selectedSubKegiatanIds.includes(sk.id);
                                        }).length;

                                        const countSelectedSubPenunjang = subKegiatanList.filter((sk: any) => {
                                            const parentKeg = kegiatanList.find((k: any) => k.id === sk.kegiatan_id);
                                            const parentProg = parentKeg ? selectedInstansi.options.programs.find((p: any) => p.id === parentKeg.program_id) : null;
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return isPenunjang && selectedSubKegiatanIds.includes(sk.id);
                                        }).length;

                                        const countTotalSubUtama = subKegiatanList.filter((sk: any) => {
                                            const parentKeg = kegiatanList.find((k: any) => k.id === sk.kegiatan_id);
                                            const parentProg = parentKeg ? selectedInstansi.options.programs.find((p: any) => p.id === parentKeg.program_id) : null;
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return !isPenunjang;
                                        }).length;

                                        const countTotalSubPenunjang = subKegiatanList.filter((sk: any) => {
                                            const parentKeg = kegiatanList.find((k: any) => k.id === sk.kegiatan_id);
                                            const parentProg = parentKeg ? selectedInstansi.options.programs.find((p: any) => p.id === parentKeg.program_id) : null;
                                            const isPenunjang = parentProg ? (parentProg.kode_program === '01' || parentProg.urusan_id === 354) : false;
                                            return isPenunjang;
                                        }).length;

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Column 1: Programs Counter */}
                                                <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/30 border border-indigo-100/60 rounded-2xl flex flex-col gap-3 shadow-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                            <Layers size={16} />
                                                        </div>
                                                        <h5 className="text-xs font-black text-slate-800 tracking-wider uppercase">PROGRAM</h5>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-500">Utama</span>
                                                            <span className="font-black text-slate-800">{countSelectedProgUtama} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-400">Penunjang</span>
                                                            <span className="font-black text-slate-600">{countSelectedProgPenunjang} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="border-t border-dashed border-slate-200/60 my-0.5"></div>
                                                        <div className="flex items-center justify-between text-xs bg-indigo-50/40 border border-indigo-100/30 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-black text-indigo-600">Total Program</span>
                                                            <span className="font-black text-indigo-700">{countSelectedProgUtama + countSelectedProgPenunjang} <span className="text-indigo-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Column 2: Kegiatan Counter */}
                                                <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 border border-emerald-100/60 rounded-2xl flex flex-col gap-3 shadow-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                                            <Briefcase size={16} />
                                                        </div>
                                                        <h5 className="text-xs font-black text-slate-800 tracking-wider uppercase">KEGIATAN</h5>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-500">Utama</span>
                                                            <span className="font-black text-slate-800">{countSelectedKegUtama} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-400">Penunjang</span>
                                                            <span className="font-black text-slate-600">{countSelectedKegPenunjang} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="border-t border-dashed border-slate-200/60 my-0.5"></div>
                                                        <div className="flex items-center justify-between text-xs bg-emerald-50/40 border border-emerald-100/30 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-black text-emerald-600">Total Kegiatan</span>
                                                            <span className="font-black text-emerald-700">{countSelectedKegUtama + countSelectedKegPenunjang} <span className="text-emerald-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Column 3: Subkegiatan Counter */}
                                                <div className="p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/30 border border-amber-100/60 rounded-2xl flex flex-col gap-3 shadow-sm">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                            <Filter size={16} />
                                                        </div>
                                                        <h5 className="text-xs font-black text-slate-800 tracking-wider uppercase">SUBKEGIATAN</h5>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-500">Utama</span>
                                                            <span className="font-black text-slate-800">{countSelectedSubUtama} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs bg-white border border-slate-100/70 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-bold text-slate-400">Penunjang</span>
                                                            <span className="font-black text-slate-600">{countSelectedSubPenunjang} <span className="text-slate-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                        <div className="border-t border-dashed border-slate-200/60 my-0.5"></div>
                                                        <div className="flex items-center justify-between text-xs bg-amber-50/40 border border-amber-100/30 px-2.5 py-1.5 rounded-xl shadow-sm">
                                                            <span className="font-black text-amber-600">Total Subkeg</span>
                                                            <span className="font-black text-amber-700">{countSelectedSubUtama + countSelectedSubPenunjang} <span className="text-amber-400 text-[10px] font-normal">terpilih</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Tree Container: Grouped by Urusan */}
                                    <div className="flex flex-col gap-6">
                                        {selectedInstansi.options.urusan.map((ur: any) => {
                                            const groupedProgs = selectedInstansi.options.programs.filter((prog: any) => {
                                                const progUrusanId = prog.urusan_id || prog.bidang_urusan_id;
                                                const isPenunjang = prog.kode_program === '01' || prog.urusan_id === 354;
                                                if (isPenunjang) {
                                                    // Penunjang belongs to the first urusan of the SKPD
                                                    return ur.id === selectedInstansi.options.urusan[0]?.id;
                                                }
                                                return progUrusanId === ur.id;
                                            });

                                            if (groupedProgs.length === 0) return null;

                                            return (
                                                <div key={ur.id} className="mb-4 flex flex-col gap-3">
                                                    {/* Group Header Badge */}
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/25 rounded-xl border border-indigo-100/30">
                                                        <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest font-mono">Urusan {ur.kode_urusan || 'X.XX'}</span>
                                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide leading-tight">{ur.nama_urusan}</h4>
                                                        </div>
                                                        <span className="ml-auto text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100/50">
                                                            {groupedProgs.length} Program
                                                        </span>
                                                    </div>

                                                    {/* Group Body: List of programs inside this urusan */}
                                                    <div className="flex flex-col gap-4 pl-3.5 border-l border-indigo-100/40">
                                                        {groupedProgs.map((prog: any) => {
                                                            const isPenunjang = prog.kode_program === '01' || prog.urusan_id === 354;
                                                            const isProgSelected = selectedProgramIds.includes(prog.id);
                                                            const childKegiatans = kegiatanList.filter((k: any) => k.program_id === prog.id);

                                                            return (
                                                                <div 
                                                                    key={prog.id} 
                                                                    className={`bg-white border rounded-2xl shadow-sm transition-all duration-300 overflow-hidden ${isProgSelected ? 'border-indigo-100 shadow-indigo-100/10 shadow-lg' : 'border-slate-200/60 bg-slate-50/20'}`}
                                                                >
                                                                    {/* LEVEL 1: PROGRAM CARD HEADER */}
                                                                    <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${isProgSelected ? 'bg-indigo-50/30 border-indigo-100/50' : 'bg-slate-50/80 border-slate-200/50'}`}>
                                                                        <div className="flex items-start gap-3 flex-1">
                                                                            {isProgSelected && (
                                                                                <button 
                                                                                    onClick={() => toggleExpandProgram(prog.id)}
                                                                                    className="mt-1 p-1 hover:bg-white/60 rounded-lg text-indigo-500 hover:text-indigo-700 transition-colors shrink-0 flex items-center justify-center"
                                                                                    title={expandedProgramIds.includes(prog.id) ? "Sembunyikan Kegiatan" : "Tampilkan Kegiatan"}
                                                                                >
                                                                                    {expandedProgramIds.includes(prog.id) ? (
                                                                                        <ChevronDown size={18} />
                                                                                    ) : (
                                                                                        <ChevronRight size={18} />
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                            <input 
                                                                                type="checkbox"
                                                                                checked={isProgSelected}
                                                                                onChange={() => handleToggleProgram(prog.id)}
                                                                                className="mt-1.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                            />
                                                                            <div className="flex flex-col">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-xs font-mono text-indigo-600 font-black px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                                                                                        {prog.kode_program || 'XX'}
                                                                                    </span>
                                                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${isPenunjang ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                                                        {isPenunjang ? 'Program Penunjang' : 'Program Utama'}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 shadow-sm">
                                                                                        {childKegiatans.length} Kegiatan
                                                                                    </span>
                                                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 shadow-sm">
                                                                                        {(() => {
                                                                                            const progKegIds = childKegiatans.map((k: any) => k.id);
                                                                                            return subKegiatanList.filter((sk: any) => progKegIds.includes(sk.kegiatan_id)).length;
                                                                                        })()} Subkegiatan
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-sm font-black text-slate-700 leading-snug mt-1.5">{prog.nama_program}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Program Penanggung Jawab Dropdown */}
                                                                        {isProgSelected && (
                                                                            <div className="flex flex-col gap-1 min-w-[240px]">
                                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                                                    Penanggung Jawab (Kepala / Kaban)
                                                                                </span>
                                                                                <select
                                                                                    value={programPegawaiMap[prog.id] || ''}
                                                                                    onChange={(e) => setProgramPegawaiMap(prev => ({ ...prev, [prog.id]: parseInt(e.target.value) || null }))}
                                                                                    className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                                                                                >
                                                                                    <option value="">-- Pilih Kepala / Kaban --</option>
                                                                                    {getFilteredPegawais(isPenunjang ? 'program_penunjang' : 'program_utama').map((p: any) => (
                                                                                        <option key={p.id} value={p.id}>{p.nama_lengkap} - {p.jabatan_nama}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Card Body: Show Child Activities (Kegiatan) */}
                                                                    {isProgSelected && expandedProgramIds.includes(prog.id) && childKegiatans.length > 0 && (
                                                                        <div className="divide-y divide-slate-100 bg-white">
                                                                            {childKegiatans.map((keg: any) => {
                                                                                const isKegSelected = selectedKegiatanIds.includes(keg.id);
                                                                                const childSubs = subKegiatanList.filter((sk: any) => sk.kegiatan_id === keg.id);

                                                                                return (
                                                                                    <div key={keg.id} className={`p-4 flex flex-col gap-3 ${isKegSelected ? 'bg-white' : 'bg-slate-50/20'}`}>
                                                                                        
                                                                                        {/* LEVEL 2: KEGIATAN ROW */}
                                                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-6 border-l-2 border-indigo-100">
                                                                                            <div className="flex items-start gap-2.5 flex-1">
                                                                                                {isKegSelected && (
                                                                                                    <button 
                                                                                                        onClick={() => toggleExpandKegiatan(keg.id)}
                                                                                                        className="mt-0.5 p-1 hover:bg-slate-100 rounded-lg text-emerald-600 hover:text-emerald-800 transition-colors shrink-0 flex items-center justify-center"
                                                                                                        title={expandedKegiatanIds.includes(keg.id) ? "Sembunyikan Subkegiatan" : "Tampilkan Subkegiatan"}
                                                                                                    >
                                                                                                        {expandedKegiatanIds.includes(keg.id) ? (
                                                                                                            <ChevronDown size={16} />
                                                                                                        ) : (
                                                                                                            <ChevronRight size={16} />
                                                                                                        )}
                                                                                                    </button>
                                                                                                )}
                                                                                                <input 
                                                                                                    type="checkbox"
                                                                                                    checked={isKegSelected}
                                                                                                    onChange={() => handleToggleKegiatan(keg.id, prog.id)}
                                                                                                    className="mt-1 w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                                                />
                                                                                                <div className="flex flex-col">
                                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-md">
                                                                                                            {keg.kode_kegiatan || 'XX'}
                                                                                                        </span>
                                                                                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md tracking-wider">
                                                                                                            Kegiatan
                                                                                                        </span>
                                                                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200/40">
                                                                                                            {childSubs.length} Subkegiatan
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <span className="text-xs font-black text-slate-700 leading-snug mt-1">{keg.nama_kegiatan}</span>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Kegiatan Penanggung Jawab (Kabid / Sekretaris) */}
                                                                                            {isKegSelected && (
                                                                                                <div className="flex flex-col gap-1 min-w-[220px]">
                                                                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                                                        Penanggung Jawab ({isPenunjang ? 'Sekretaris' : 'Kabid'})
                                                                                                    </span>
                                                                                                    <select
                                                                                                        value={kegiatanPegawaiMap[keg.id] || ''}
                                                                                                        onChange={(e) => setKegiatanPegawaiMap(prev => ({ ...prev, [keg.id]: parseInt(e.target.value) || null }))}
                                                                                                        className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                                                                                                    >
                                                                                                        <option value="">{isPenunjang ? '-- Pilih Sekretaris --' : '-- Pilih Kabid --'}</option>
                                                                                                        {getFilteredPegawais('kegiatan', isPenunjang).map((p: any) => (
                                                                                                            <option key={p.id} value={p.id}>{p.nama_lengkap} - {p.jabatan_nama}</option>
                                                                                                        ))}
                                                                                                    </select>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* LEVEL 3: SUBKEGIATAN ROW(S) */}
                                                                                        {isKegSelected && expandedKegiatanIds.includes(keg.id) && childSubs.length > 0 && (
                                                                                            <div className="flex flex-col gap-3 pl-12 mt-1">
                                                                                                {childSubs.map((subKeg: any) => {
                                                                                                    const isSubSelected = selectedSubKegiatanIds.includes(subKeg.id);

                                                                                                    return (
                                                                                                        <div 
                                                                                                            key={subKeg.id} 
                                                                                                            className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isSubSelected ? 'bg-indigo-50/10 border-slate-200/80 shadow-inner' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}
                                                                                                        >
                                                                                                            <div className="flex items-start gap-2 flex-1">
                                                                                                                <input 
                                                                                                                    type="checkbox"
                                                                                                                    checked={isSubSelected}
                                                                                                                    onChange={() => handleToggleSubKegiatan(subKeg.id, keg.id, prog.id)}
                                                                                                                    className="mt-1 w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                                                                />
                                                                                                                <div className="flex flex-col">
                                                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
															<span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md border ${isSubSelected ? 'bg-amber-100 text-amber-700 border-amber-200/50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
																{subKeg.kode_sub_kegiatan || 'XX'}
															</span>
															<span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${isSubSelected ? 'bg-slate-200 text-slate-600 border border-slate-300' : 'bg-slate-50 text-slate-400 border border-slate-200/50'}`}>
																Subkegiatan
															</span>
														</div>
                                                                                                                    <span className="text-xs font-bold text-slate-700 leading-snug mt-0.5">{subKeg.nama_sub_kegiatan}</span>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                             {/* Subkegiatan Penanggung Jawab (Katim) & SKP Setting */}
                                                                                                            {isSubSelected && (
                                                                                                                <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
                                                                                                                    <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                                                                                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                                                                            Penanggung Jawab (Katim / Staff)
                                                                                                                        </span>
                                                                                                                        <select
                                                                                                                            value={subKegiatanPegawaiMap[subKeg.id] || ''}
                                                                                                                            onChange={(e) => setSubKegiatanPegawaiMap(prev => ({ ...prev, [subKeg.id]: parseInt(e.target.value) || null }))}
                                                                                                                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                                                                                                                        >
                                                                                                                            <option value="">-- Pilih Katim --</option>
                                                                                                                            {getFilteredPegawais('sub_kegiatan').map((p: any) => (
                                                                                                                                <option key={p.id} value={p.id}>{p.nama_lengkap} - {p.jabatan_nama}</option>
                                                                                                                            ))}
                                                                                                                        </select>
                                                                                                                    </div>

                                                                                                                    {/* Subkegiatan SKP Setting Button */}
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => setSkpConfigModalState({
                                                                                                                            isOpen: true,
                                                                                                                            subKegiatanId: subKeg.id,
                                                                                                                            subKegiatanName: subKeg.nama_sub_kegiatan,
                                                                                                                            subKegiatanCode: subKeg.kode_sub_kegiatan,
                                                                                                                            instansiId: selectedInstansi.id
                                                                                                                        })}
                                                                                                                        className="mt-3 sm:mt-0 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs active:scale-95"
                                                                                                                        title="Atur Bulan Aktif & Tipe Target (Progress / Output) SKP"
                                                                                                                    >
                                                                                                                        <Settings size={14} className="text-indigo-600 animate-spin-slow" />
                                                                                                                        <span>Setting SKP</span>
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shadow-inner flex-shrink-0">
                            <span className="text-xs text-slate-400 font-medium italic">Pastikan seluruh level program, kegiatan, dan subkegiatan memiliki Penanggung Jawab yang sesuai dengan Cascading Kinerja SAKIP.</span>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setIsKinerjaModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleSaveKinerjaTree}
                                    disabled={isSavingKinerja || isLoadingPegawai}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-indigo-500/10"
                                >
                                    {isSavingKinerja ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={14} />
                                            <span>Simpan Perjanjian Kinerja</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
            {/* SubKegiatan SKP Config Modal */}
            {skpConfigModalState.isOpen && skpConfigModalState.subKegiatanId && (
                <SubKegiatanSkpConfigModal
                    isOpen={skpConfigModalState.isOpen}
                    onClose={() => setSkpConfigModalState(prev => ({ ...prev, isOpen: false }))}
                    subKegiatanId={skpConfigModalState.subKegiatanId}
                    subKegiatanName={skpConfigModalState.subKegiatanName}
                    subKegiatanCode={skpConfigModalState.subKegiatanCode}
                    instansiId={skpConfigModalState.instansiId}
                />
            )}
        </div>
    );
};

export default MappingUrusanInstansi;
