import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Loader2, Layers, Briefcase, Search, ChevronRight, ChevronDown, Check, X, Filter } from 'lucide-react';
import { BaseDataTable } from './common/BaseDataTable';
import { SearchableSelect } from './common/SearchableSelect';

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
        return Array.from(groupedMap.values());
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
                    onChange={(val: any) => handleProgramChange(item.id, val)}

                    options={item.options.programs}
                    label="Semua Program..."
                    keyField="id"
                    displayField="nama_program"
                    entityName="Program"
                    disabled={editingInstansiId !== item.id || item.options.programs.length === 0}
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
                    onChange={(val: any) => handleKegiatanChange(item.id, val)}

                    options={item.options.kegiatans}
                    label="Semua Kegiatan..."
                    keyField="id"
                    displayField="nama_kegiatan"
                    entityName="Kegiatan"
                    disabled={editingInstansiId !== item.id || item.options.kegiatans.length === 0}
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
                    onChange={(val: any) => handleSubKegiatanChange(item.id, val)}

                    options={item.options.subKegiatans}
                    label="Semua Subkegiatan..."
                    keyField="id"
                    displayField="nama_sub_kegiatan"
                    entityName="Subkegiatan"
                    disabled={editingInstansiId !== item.id || item.options.subKegiatans.length === 0}
                />
            )
        },
        {
            header: 'Aksi',
            key: 'aksi',
            className: 'w-24 align-top text-center',
            render: (item: any) => {
                if (editingInstansiId === item.id) {
                    return (
                        <div className="flex justify-center gap-1">
                            <button
                                onClick={() => handleSaveMappingHierarchy(item.id)}
                                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                                title="Simpan Perubahan"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    setEditingInstansiId(null);
                                    setUnsavedMappings(prev => {
                                        const mapped = { ...prev };
                                        delete mapped[item.id];
                                        return mapped;
                                    });
                                }}
                                className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                title="Batal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                }
                return (
                    <button
                        onClick={() => setEditingInstansiId(item.id)}
                        className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl transition-colors mx-auto flex"
                        title="Edit Pemetaan"
                    >
                        <Edit2 size={16} />
                    </button>
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
                    <span className="text-sm font-black text-ppm-slate uppercase tracking-tight">{item.nama_lengkap}</span>
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
        // Filter instances based on user department if not global viewer
        let filteredInstansi = instansiList;
        if (!isGlobalViewer && user?.bidang_id) {
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
                return { id: item.urusan_id, nama_urusan: item.nama_urusan };
            });
            
            // Allowed options based on DB relations. Note: program uses bidang_urusan_id and urusan_id depending on master logic
            const penunjangPrograms = programList.filter(p => p.kode_program === '01' || p.urusan_id === 354);
            const standardPrograms = programList.filter(p => allowedUrusanIds.includes(p.urusan_id) || allowedUrusanIds.includes(p.bidang_urusan_id));
            
            // Function to dynamically format program name based on instance's primary urusan
            const formatProgramName = (p: any) => {
                if (p.kode_program === '01' || p.urusan_id === 354) {
                    // Find first mapped urusan to use its code as prefix
                    const firstUrusanId = mappedUrusanItems[0]?.urusan_id;
                    const urusanObj = urusanList.find(u => u.id === firstUrusanId);
                    const prefix = urusanObj?.kode_urusan || 'X.XX';
                    return `${prefix}.01 - ${p.nama_program}`;
                }
                return p.nama_program;
            };

            const validPrograms = [...new Set([...standardPrograms, ...penunjangPrograms])].map(p => ({
                ...p,
                nama_program: formatProgramName(p)
            }));

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
                    kegiatans: currentValidKegiatans,
                    subKegiatans: currentValidSubKegiatans,
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

    const visibleTabs = useMemo(() => tabs.filter(t => 
        isSuperAdmin || 
        allowedActionPages.includes(t.slug) || 
        allowedActionPages.includes('referensi-urusan-instansi')
    ), [isSuperAdmin, allowedActionPages, tabs]);

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

    if (loading && !isSuperAdmin && allowedActionPages.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-ppm-slate">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

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
            )}
        </div>
    );
};

export default MappingUrusanInstansi;
