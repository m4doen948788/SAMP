import React, { useState, useEffect } from 'react';
import { useTheme, themesConfig, DefaultTheme, Theme, SavedCustomTheme, CustomColors, DEFAULT_BAPPERIDA_COLORS } from '@/src/contexts/ThemeContext';
import { Check, Palette, ChevronDown, ChevronUp, Save, CheckCircle2, Trash2, ShieldCheck, User as UserIcon, Settings2, Info, RotateCcw } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { BapperidaSymbol } from '@/src/components/shared/BapperidaBrand';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    themeName
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void,
    themeName: string
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ppm-slate/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-ppm-mint rounded-full flex items-center justify-center mx-auto mb-4">
                        <Palette size={32} className="text-ppm-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-ppm-slate-light mb-2">Jadikan Tema?</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Anda akan menerapkan skema warna <span className="font-bold text-slate-700">"{themeName}"</span> sebagai tema utama dan mengunci pengaturan sidebar.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Batal
                        </button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition-all duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--theme-color-1, #0097fe)' }}>
                            <CheckCircle2 size={18} />
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PengaturanTema = () => {
    const {
        theme,
        appliedTheme,
        setTheme,
        applyTheme,
        customColors,
        setCustomColors,
        savedCustomThemes,
        saveCustomTheme,
        deleteCustomTheme,
        themeMode,
        adminTheme,
        adminCustomColors,
        updateGlobalSettings
    } = useTheme();

    const { user } = useAuth();
    const isSuperAdmin = user?.tipe_user_id === 1;
    const isOverridden = themeMode === 'follow_admin' && !isSuperAdmin;

    const [isGridOpen, setIsGridOpen] = useState(false);

    // Modal state
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [pendingThemeId, setPendingThemeId] = useState<Theme | null>(null);
    const [pendingThemeName, setPendingThemeName] = useState('');
    const [confirmModeOpen, setConfirmModeOpen] = useState(false);
    const [pendingMode, setPendingMode] = useState<'per_user' | 'follow_admin' | null>(null);

    // If leaving the page without saving, reset preview to applied
    useEffect(() => {
        return () => {
            setTheme(appliedTheme);
        };
    }, [appliedTheme, setTheme]);

    const handleCustomChange = (type: keyof CustomColors, value: string) => {
        const updated = { ...customColors, [type]: value };
        if (type === 'color1') updated.primary = value;
        if (type === 'color4') updated.secondary = value;
        setCustomColors(updated);
        setTheme('custom');
    };

    const handleResetBapperida = () => {
        setCustomColors(DEFAULT_BAPPERIDA_COLORS);
        setTheme('custom');
    };

    const handleThemeClick = (id: Theme, name: string) => {
        if (isOverridden) return;
        setTheme(id); // Temporarily preview it
        setPendingThemeId(id);
        setPendingThemeName(name);
        setConfirmModalOpen(true);
    };

    const handleApplyTheme = async () => {
        await applyTheme();

        // If Super Admin, update the global default settings so users without custom themes follow it
        if (isSuperAdmin) {
            await updateGlobalSettings({
                admin_theme: pendingThemeId || theme,
                admin_custom_colors: (pendingThemeId === 'custom' || (pendingThemeId as string)?.startsWith('custom-')) ? customColors : null
            });
        }

        setConfirmModalOpen(false);
        setPendingThemeId(null);
        setTimeout(() => window.location.reload(), 100);
    };

    const handleCancelTheme = () => {
        setTheme(appliedTheme); // revert preview
        setConfirmModalOpen(false);
        setPendingThemeId(null);
    };

    const handleModeClick = (mode: 'per_user' | 'follow_admin') => {
        if (mode === themeMode) return;
        setPendingMode(mode);
        setConfirmModeOpen(true);
    };

    const handleApplyMode = async () => {
        if (!pendingMode) return;

        const data = {
            theme_mode: pendingMode,
            ...(pendingMode === 'follow_admin' ? { admin_theme: appliedTheme } : {})
        };

        await updateGlobalSettings(data);
        setConfirmModeOpen(false);
        setPendingMode(null);
        // Page reload to ensure all components sync with the new global mode
        setTimeout(() => window.location.reload(), 100);
    };

    const handleSaveCustom = async () => {
        const name = prompt('Berikan nama untuk warna kustom Anda:', `Warna Kustom ${savedCustomThemes.length + 1}`);
        if (name) {
            await saveCustomTheme(name, customColors);
            setTimeout(() => window.location.reload(), 150);
        }
    };

    const renderSwatch = (
        id: Theme,
        name: string,
        colors: { color1: string; color2: string; color3: string; color4: string },
        isActivePreview: boolean,
        isApplied: boolean,
        isCustom: boolean = false
    ) => {
        const c1 = colors.color1 || '#0097fe';
        const c2 = colors.color2 || '#009a19';
        const c3 = colors.color3 || '#fe9600';
        const c4 = colors.color4 || '#0069a3';

        return (
            <div
                key={id}
                onClick={() => handleThemeClick(id, name)}
                className="cursor-pointer group flex flex-col items-center gap-2 relative"
            >
                {isCustom && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Hapus warna kustom "${name}"?`)) {
                                deleteCustomTheme(id as string);
                            }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm hover:bg-red-600 focus:opacity-100"
                        title="Hapus Warna Kustom"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
                <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-sm transition-all duration-300 transform ${!isOverridden ? 'group-hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-50'} flex items-center justify-center overflow-hidden relative ${isApplied ? 'ring-4 ring-offset-4 ring-ppm-slate scale-110' : isActivePreview ? 'ring-2 ring-offset-2 ring-slate-400' : 'ring-1 ring-slate-200 hover:ring-slate-400'}`}
                    style={{
                        background: `conic-gradient(from 45deg, ${c1} 0deg 90deg, ${c2} 90deg 180deg, ${c3} 180deg 270deg, ${c4} 270deg 360deg)`
                    }}
                    title={isOverridden ? "Tema dikunci oleh Administrator" : isApplied ? "Tema Aktif" : "Pratinjau Tema"}
                >
                    {isApplied && (
                        <div className="bg-black/25 absolute inset-0 flex items-center justify-center">
                            <Check size={28} className="text-white drop-shadow-md" strokeWidth={3} />
                        </div>
                    )}
                </div>
                <span className={`text-[10px] sm:text-[11px] font-bold text-center tracking-wide leading-tight mt-1 ${isApplied ? 'text-ppm-slate-light' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {name}
                </span>
            </div>
        );
    };

    return (
        <>
            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={handleCancelTheme}
                onConfirm={handleApplyTheme}
                themeName={pendingThemeName}
            />

            {/* Mode Confirmation Modal */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${confirmModeOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-ppm-slate/50 backdrop-blur-sm" onClick={() => setConfirmModeOpen(false)}></div>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={32} className="text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-ppm-slate-light mb-2">Simpan Perubahan?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Anda akan mengubah mode tema menjadi <span className="font-bold text-indigo-700">"{pendingMode === 'per_user' ? 'Masing-masing Akun' : 'Mengikuti Admin'}"</span>. Perubahan ini akan berdampak pada seluruh pengguna.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModeOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleApplyMode} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                                Ya, Simpan
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-modern p-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-ppm-slate-light uppercase tracking-tight flex items-center gap-2">
                        <Palette size={20} />
                        Pengaturan Tema
                    </h2>
                </div>

                <p className="text-sm text-slate-500 mb-8 border-b border-slate-100 pb-4">
                    Pilih palet warna untuk mengubah antarmuka aplikasi. Warna yang Anda pilih pratinjaunya akan langsung terlihat. Pastikan klik <span className="font-bold">Jadikan Tema</span> untuk mengunci pilihan warna Anda ke sidebar.
                </p>

                {/* Superadmin Mode Toggle */}
                {isSuperAdmin && (
                    <div className="mb-10 p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-left duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Settings2 className="text-indigo-600" size={20} />
                            <h3 className="font-bold text-slate-800">Kontrol Global (Superadmin)</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => handleModeClick('per_user')}
                                className={`flex-1 flex items-center justify-between p-4 rounded-lg border-2 transition-all ${themeMode === 'per_user' ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-200 hover:border-slate-300 grayscale opacity-70'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${themeMode === 'per_user' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                        <UserIcon size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-slate-800">Masing-masing Akun</p>
                                        <p className="text-[10px] text-slate-500">User bebas mengatur tema sendiri</p>
                                    </div>
                                </div>
                                {themeMode === 'per_user' && <ShieldCheck size={20} className="text-indigo-600" />}
                            </button>

                            <button
                                onClick={() => handleModeClick('follow_admin')}
                                className={`flex-1 flex items-center justify-between p-4 rounded-lg border-2 transition-all ${themeMode === 'follow_admin' ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-200 hover:border-slate-300 grayscale opacity-70'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${themeMode === 'follow_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-slate-800">Mengikuti Admin</p>
                                        <p className="text-[10px] text-slate-500">Gunakan satu tema untuk semua user</p>
                                    </div>
                                </div>
                                {themeMode === 'follow_admin' && <ShieldCheck size={20} className="text-indigo-600" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Status Banner for Non-Superadmins when overridden */}
                {isOverridden && (
                    <div className="mb-10 p-5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-4 animate-in zoom-in-95 duration-200">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-700 shrink-0">
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900">Tema Dikelola oleh Administrator</h3>
                            <p className="text-sm text-amber-800 mt-1">
                                Saat ini sistem dikonfigurasi untuk menggunakan tema seragam yang ditetapkan oleh Administrator.
                                Anda tidak dapat mengubah pengaturan warna secara mandiri.
                            </p>
                        </div>
                    </div>
                )}

                {/* Klusterisasi 5 Warna Bapperida */}
                <div className="mb-10">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
                                <BapperidaSymbol size={20} />
                                Klusterisasi Warna Tema Bapperida (5 Warna)
                            </h3>
                            <p className="text-sm text-slate-500">
                                Mengacu pada identitas simbol huruf 'b' Bapperida: 4 warna fungsi institusi dan 1 warna latar belakang.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleResetBapperida}
                            className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto active:scale-95 shadow-xs"
                            title="Kembalikan ke 5 Warna Default Logo Bapperida"
                        >
                            <RotateCcw size={14} />
                            Reset Default Bapperida
                        </button>
                    </div>

                    <div
                        onClick={() => { if (!isOverridden && theme !== 'custom') setTheme('custom'); }}
                        className={`p-6 rounded-2xl border-2 transition-all ${isOverridden ? 'cursor-not-allowed opacity-60 bg-slate-100' : 'cursor-pointer'} ${theme === 'custom' ? 'border-[#0097fe] bg-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                    >
                        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                            {/* Form Input 5 Warna */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                                
                                {/* Warna 1 */}
                                <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs"
                                                    style={{ backgroundColor: customColors.color1 || customColors.primary || '#0097fe' }}
                                                />
                                                Warna 1
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative rounded-xl overflow-hidden w-11 h-11 shadow-xs border border-slate-200">
                                                <input
                                                    type="color"
                                                    value={customColors.color1 || customColors.primary || '#0097fe'}
                                                    onChange={(e) => handleCustomChange('color1', e.target.value)}
                                                    disabled={isOverridden}
                                                    className="absolute -top-2 -left-2 w-16 h-16 border-0 p-0 cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={customColors.color1 || customColors.primary || '#0097fe'}
                                                onChange={(e) => handleCustomChange('color1', e.target.value)}
                                                disabled={isOverridden}
                                                className="input-modern font-mono text-xs uppercase flex-1 max-w-[130px] px-3 py-2 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5 pt-2 border-t border-sky-100/60">
                                        Warna utama: tombol aksi primer, item menu aktif sidebar & WPA, switcher aktif, dan aksen navigasi.
                                    </p>
                                </div>

                                {/* Warna 2 */}
                                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs"
                                                    style={{ backgroundColor: customColors.color2 || '#009a19' }}
                                                />
                                                Warna 2
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative rounded-xl overflow-hidden w-11 h-11 shadow-xs border border-slate-200">
                                                <input
                                                    type="color"
                                                    value={customColors.color2 || '#009a19'}
                                                    onChange={(e) => handleCustomChange('color2', e.target.value)}
                                                    disabled={isOverridden}
                                                    className="absolute -top-2 -left-2 w-16 h-16 border-0 p-0 cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={customColors.color2 || '#009a19'}
                                                onChange={(e) => handleCustomChange('color2', e.target.value)}
                                                disabled={isOverridden}
                                                className="input-modern font-mono text-xs uppercase flex-1 max-w-[130px] px-3 py-2 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5 pt-2 border-t border-emerald-100/60">
                                        Warna aksen kedua: indikator status sukses, badge progresif, aksen visual & highlight data.
                                    </p>
                                </div>

                                {/* Warna 3 */}
                                <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs"
                                                    style={{ backgroundColor: customColors.color3 || '#fe9600' }}
                                                />
                                                Warna 3
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative rounded-xl overflow-hidden w-11 h-11 shadow-xs border border-slate-200">
                                                <input
                                                    type="color"
                                                    value={customColors.color3 || '#fe9600'}
                                                    onChange={(e) => handleCustomChange('color3', e.target.value)}
                                                    disabled={isOverridden}
                                                    className="absolute -top-2 -left-2 w-16 h-16 border-0 p-0 cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={customColors.color3 || '#fe9600'}
                                                onChange={(e) => handleCustomChange('color3', e.target.value)}
                                                disabled={isOverridden}
                                                className="input-modern font-mono text-xs uppercase flex-1 max-w-[130px] px-3 py-2 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5 pt-2 border-t border-amber-100/60">
                                        Warna peringatan: status evaluasi, badge peringatan, icon notifikasi & sorotan sekunder.
                                    </p>
                                </div>

                                {/* Warna 4 */}
                                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-2xs"
                                                    style={{ backgroundColor: customColors.color4 || customColors.secondary || '#0069a3' }}
                                                />
                                                Warna 4
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative rounded-xl overflow-hidden w-11 h-11 shadow-xs border border-slate-200">
                                                <input
                                                    type="color"
                                                    value={customColors.color4 || customColors.secondary || '#0069a3'}
                                                    onChange={(e) => handleCustomChange('color4', e.target.value)}
                                                    disabled={isOverridden}
                                                    className="absolute -top-2 -left-2 w-16 h-16 border-0 p-0 cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={customColors.color4 || customColors.secondary || '#0069a3'}
                                                onChange={(e) => handleCustomChange('color4', e.target.value)}
                                                disabled={isOverridden}
                                                className="input-modern font-mono text-xs uppercase flex-1 max-w-[130px] px-3 py-2 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5 pt-2 border-t border-blue-100/60">
                                        Warna struktur & kontras gelap: latar belakang sidebar, navbar, tombol sekunder, dan elemen kontras.
                                    </p>
                                </div>

                                {/* Warna Background */}
                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 sm:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full border border-slate-400 shadow-2xs"
                                                style={{ backgroundColor: customColors.background || '#ffffff' }}
                                            />
                                            Warna Background
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative rounded-xl overflow-hidden w-11 h-11 shadow-xs border border-slate-300">
                                            <input
                                                type="color"
                                                value={customColors.background || '#ffffff'}
                                                onChange={(e) => handleCustomChange('background', e.target.value)}
                                                disabled={isOverridden}
                                                className="absolute -top-2 -left-2 w-16 h-16 border-0 p-0 cursor-pointer"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={customColors.background || '#ffffff'}
                                            onChange={(e) => handleCustomChange('background', e.target.value)}
                                            disabled={isOverridden}
                                            className="input-modern font-mono text-xs uppercase flex-1 max-w-[130px] px-3 py-2 bg-white"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5 pt-2 border-t border-slate-200/60">
                                        Warna latar belakang permukaan: dasar wadah konten kartu dan latar elemen informasi.
                                    </p>
                                </div>

                                {theme === 'custom' && (
                                    <div className="sm:col-span-2 pt-2 flex flex-wrap gap-3 animate-in fade-in duration-300">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); applyTheme(); setTimeout(() => window.location.reload(), 100); }}
                                            className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                            style={{ backgroundColor: customColors.color1 || '#0097fe' }}
                                        >
                                            <CheckCircle2 size={18} />
                                            Jadikan Tema
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSaveCustom(); }}
                                            className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 shadow-xs hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={18} />
                                            Simpan Warna Kustom
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Pratinjau Komposisi 5 Warna Bapperida */}
                            <div className="flex flex-col items-center justify-center p-6 border-t lg:border-t-0 lg:border-l border-slate-200 pl-0 lg:pl-8 self-center">
                                <div className="text-center mb-3">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Komposisi Warna</span>
                                </div>
                                <div
                                    className={`w-32 h-32 rounded-3xl shadow-lg flex items-center justify-center relative overflow-hidden transition-all border-2 border-slate-200 ${theme === 'custom' ? 'ring-4 ring-offset-4 ring-[#0097fe] scale-105' : 'opacity-85'}`}
                                    style={{ backgroundColor: customColors.background || '#ffffff' }}
                                >
                                    {/* 4 Kuadran Warna Acuan */}
                                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                        <div style={{ backgroundColor: customColors.color1 || '#0097fe' }} />
                                        <div style={{ backgroundColor: customColors.color2 || '#009a19' }} />
                                        <div style={{ backgroundColor: customColors.color3 || '#fe9600' }} />
                                        <div style={{ backgroundColor: customColors.color4 || '#0069a3' }} />
                                    </div>

                                    {/* Lingkaran Putih Tengah dengan Logo Huruf 'b' */}
                                    <div 
                                        className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md border"
                                        style={{ 
                                            backgroundColor: customColors.background || '#ffffff',
                                            borderColor: 'rgba(0,0,0,0.08)' 
                                        }}
                                    >
                                        <BapperidaSymbol size={28} />
                                    </div>

                                    {appliedTheme === 'custom' && (
                                        <div className="bg-black/30 absolute inset-0 z-20 flex items-center justify-center">
                                            <Check size={36} className="text-white drop-shadow-md" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 mt-3 text-center">
                                    Harmoni Simbol 'b'
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Predefined Palettes Section (Collapsible) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                    <button
                        onClick={() => setIsGridOpen(!isGridOpen)}
                        className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-transparent data-[open=true]:border-slate-200"
                        data-open={isGridOpen}
                    >
                        <div className="text-left">
                            <h3 className="font-bold text-ppm-slate-light text-lg">Pilihan Warna Tersedia</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Tampilkan palet bawaan dan warna kustom yang Anda simpan</p>
                        </div>
                        <div className={`p-2 rounded-full transition-colors ${isGridOpen ? 'bg-slate-200 text-slate-700' : 'bg-white text-slate-500 shadow-sm border border-slate-200'}`}>
                            {isGridOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </button>

                    {isGridOpen && (
                        <div className="p-6 bg-white animate-in slide-in-from-top-4 duration-300">

                            {/* Render Saved Custom Themes First */}
                            {savedCustomThemes.length > 0 && (
                                <div className="mb-8 pb-8 border-b border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Tersimpan</h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 justify-items-center">
                                        {savedCustomThemes.map(t => renderSwatch(
                                            t.id,
                                            t.name,
                                            {
                                                color1: t.colors.color1 || t.colors.primary,
                                                color2: t.colors.color2 || '#009a19',
                                                color3: t.colors.color3 || '#fe9600',
                                                color4: t.colors.color4 || t.colors.secondary || '#0069a3'
                                            },
                                            theme === t.id,
                                            appliedTheme === t.id,
                                            true
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Bawaan Sistem</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 justify-items-center">
                                {(Object.entries(themesConfig) as [DefaultTheme, typeof themesConfig[DefaultTheme]][]).map(([key, config]) => {
                                    return renderSwatch(
                                        key,
                                        config.name,
                                        {
                                            color1: config.color1 || config.primary,
                                            color2: config.color2 || '#009a19',
                                            color3: config.color3 || '#fe9600',
                                            color4: config.color4 || config.secondary || '#0069a3'
                                        },
                                        theme === key,
                                        appliedTheme === key
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PengaturanTema;
