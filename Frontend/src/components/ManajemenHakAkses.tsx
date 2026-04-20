import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RefreshCw, Save, ShieldAlert, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Role {
    id: number;
    name: string;
}

interface MenuItem {
    id: number;
    nama_menu: string;
    tipe: 'menu1' | 'menu2' | 'menu3';
    parent_id: number | null;
    urutan: number;
    is_active: number;
}

const ManajemenHakAkses: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
    const [expandedMenuIds, setExpandedMenuIds] = useState<number[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedRoleId !== null) {
            fetchRoleAccess(selectedRoleId);
        } else {
            setSelectedMenuIds([]);
        }
    }, [selectedRoleId]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [rolesRes, menusRes] = await Promise.all([
                api.rbac.getRoles(),
                api.menu.getAll()
            ]);

            if (rolesRes.success) setRoles(rolesRes.data);
            if (menusRes.success) {
                // Only show active menus
                setMenus(menusRes.data.filter((m: MenuItem) => m.is_active));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoleAccess = async (roleId: number) => {
        try {
            const response = await api.rbac.getRoleAccess(roleId);
            if (response.success) {
                setSelectedMenuIds(response.data);
            }
        } catch (error) {
            console.error('Error fetching role access:', error);
        }
    };

    const handleSave = async () => {
        if (selectedRoleId === null) return;

        setIsSaving(true);
        setSaveMessage({ type: '', text: '' });

        try {
            const response = await api.rbac.updateRoleAccess(selectedRoleId, selectedMenuIds);
            if (response.success) {
                setSaveMessage({ type: 'success', text: 'Hak akses berhasil disimpan.' });
            } else {
                setSaveMessage({ type: 'error', text: response.message || 'Gagal menyimpan hak akses.' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Terjadi kesalahan sistem.' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        }
    };

    const toggleMenu = (menuId: number) => {
        if (selectedRoleId === 1) return;

        setSelectedMenuIds(prev => {
            const isCurrentlySelected = prev.includes(menuId);

            const getDescendants = (parentId: number): number[] => {
                const children = menus.filter(m => m.parent_id === parentId).map(m => m.id);
                let allDescendants = [...children];
                children.forEach(childId => {
                    allDescendants = [...allDescendants, ...getDescendants(childId)];
                });
                return allDescendants;
            };

            const getAncestors = (childId: number): number[] => {
                const item = menus.find(m => m.id === childId);
                if (item && item.parent_id) {
                    return [item.parent_id, ...getAncestors(item.parent_id)];
                }
                return [];
            };

            const descendants = getDescendants(menuId);

            if (isCurrentlySelected) {
                // If deselecting, also deselect all descendants
                return prev.filter(id => id !== menuId && !descendants.includes(id));
            } else {
                // If selecting, also select all descendants AND all ancestors
                const ancestors = getAncestors(menuId);
                const newSelection = [...prev];
                
                // Add menuId if not present
                if (!newSelection.includes(menuId)) newSelection.push(menuId);
                
                // Add ancestors if not present
                ancestors.forEach(aid => {
                    if (!newSelection.includes(aid)) newSelection.push(aid);
                });
                
                // Add descendants if not present
                descendants.forEach(did => {
                    if (!newSelection.includes(did)) newSelection.push(did);
                });
                
                return newSelection;
            }
        });
    };

    const toggleExpand = (menuId: number) => {
        setExpandedMenuIds(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const renderMenuTree = (parentId: number | null, depth = 0) => {
        const children = menus
            .filter(m => m.parent_id === parentId)
            .sort((a, b) => a.urutan - b.urutan);

        if (children.length === 0) return null;

        return (
            <div className={`space-y-2 ${depth > 0 ? 'ml-3 sm:ml-6 mt-2 border-l-2 border-slate-100 pl-3 sm:pl-4 py-1' : ''}`}>
                {children.map(menu => {
                    const isSelected = selectedMenuIds.includes(menu.id);
                    const isSuperAdminSelected = selectedRoleId === 1;
                    const isExpanded = expandedMenuIds.includes(menu.id);
                    const hasChildren = menus.some(m => m.parent_id === menu.id);

                    return (
                        <div key={menu.id} className="flex flex-col py-1">
                            <div className="flex items-center gap-2">
                                {hasChildren ? (
                                    <button
                                        onClick={() => toggleExpand(menu.id)}
                                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                ) : (
                                    <span className="w-6 shrink-0" />
                                )}

                                <label
                                    className={`flex items-start sm:items-center gap-3 cursor-pointer group flex-1 min-w-0 ${isSuperAdminSelected ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={isSelected}
                                            onChange={() => toggleMenu(menu.id)}
                                            disabled={isSuperAdminSelected}
                                        />
                                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border
                        ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}
                                        >
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                                        <span className={`text-sm font-medium truncate ${depth === 0 ? 'text-slate-800 font-bold' : 'text-slate-600'}`}>
                                            {menu.nama_menu}
                                        </span>
                                        {hasChildren && (() => {
                                            const childIds = menus.filter(m => m.parent_id === menu.id).map(m => m.id);
                                            const selectedCount = childIds.filter(id => selectedMenuIds.includes(id)).length;
                                            const totalCount = childIds.length;
                                            return (
                                                <div className="flex items-center shrink-0">
                                                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full ml-1 font-semibold bg-slate-100 text-slate-400">
                                                        {totalCount} Sub
                                                    </span>
                                                    <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-semibold ml-1 ${selectedCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                                                        {selectedCount} Dipilih
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </label>
                            </div>
                            {isExpanded && renderMenuTree(menu.id, depth + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <ShieldAlert size={64} className="text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
                <p className="text-slate-500">Anda tidak memiliki izin untuk melihat halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 -mx-4 -my-6 sm:m-0 sm:bg-transparent min-h-[calc(100vh-64px)]">
            <div className="bg-white px-4 sm:px-6 py-5 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight truncate">Manajemen Hak Akses</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 truncate">
                            Kontrol visibilitas menu berdasarkan peran
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={fetchInitialData}
                            disabled={isLoading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm font-medium text-sm disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <RefreshCw size={32} className="animate-spin text-indigo-500 mb-4" />
                        <p className="text-slate-500 font-medium">Memuat konfigurasi hak akses...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="hidden lg:flex lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-col h-[calc(100vh-200px)] sticky top-[100px]">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="font-bold text-slate-800">Daftar Role</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Pilih role untuk mengatur akses</p>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2">
                                <div className="space-y-1">
                                    {roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => setSelectedRoleId(role.id)}
                                            className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${selectedRoleId === role.id
                                                ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]'
                                                : 'bg-transparent border border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            <span className={`font-semibold text-sm ${selectedRoleId === role.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                {role.name}
                                            </span>
                                            {selectedRoleId === role.id && (
                                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                            {/* Mobile Role Selector - Always visible on small screens */}
                            <div className="lg:hidden p-4 border-b border-slate-100 bg-slate-50/50">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pilih Role Pengguna:</label>
                                <select
                                    value={selectedRoleId || ''}
                                    onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                >
                                    <option value="" disabled>-- Klik untuk Pilih Role --</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>

                            {!selectedRoleId ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <ShieldAlert size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold text-lg text-slate-600">Pilih Role Terlebih Dahulu</p>
                                    <p className="text-sm mt-1 max-w-[280px]">Silakan pilih role dari daftar {window.innerWidth < 1024 ? 'dropdown di atas' : 'di samping kiri'} untuk mengatur hak akses.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 z-10 backdrop-blur-sm gap-4">
                                        <div className="min-w-0 w-full">
                                            <h2 className="font-bold text-slate-800 text-base sm:text-lg truncate">
                                                Akses Menu: <span className="text-indigo-600">{roles.find(r => r.id === selectedRoleId)?.name}</span>
                                            </h2>
                                            {selectedRoleId === 1 && (
                                                <p className="text-[10px] sm:text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1 bg-amber-50 inline-block px-2 py-0.5 rounded border border-amber-200">
                                                    <ShieldAlert size={12} /> Super Admin Akses Penuh
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving || selectedRoleId === 1}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-semibold text-sm shrink-0"
                                        >
                                            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>

                                    {saveMessage.text && (
                                        <div className={`mx-4 sm:mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 text-sm font-medium border ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${saveMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {saveMessage.text}
                                        </div>
                                    )}

                                    <div className="p-4 sm:p-6 overflow-y-auto">
                                        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 shadow-sm">
                                            {renderMenuTree(null)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManajemenHakAkses;
