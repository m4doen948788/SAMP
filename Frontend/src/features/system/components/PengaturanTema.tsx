import React, { useState, useEffect } from 'react';
import { useTheme, themesConfig, DefaultTheme, Theme, SavedCustomTheme } from '@/src/contexts/ThemeContext';
import { Check, Palette, ChevronDown, ChevronUp, Save, CheckCircle2, Trash2, ShieldCheck, User as UserIcon, Settings2, Info } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

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
                    <h3 className="text-xl font-bold text-ppm-slate mb-2">Jadikan Tema?</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Anda akan menerapkan skema warna <span className="font-bold text-slate-700">"{themeName}"</span> sebagai tema utama dan mengunci pengaturan sidebar.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Batal
                        </button>
                        <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-var-theme-primary transition-all duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-text-on-primary, #ffffff)' }}>
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

    const handleCustomChange = (type: 'primary' | 'secondary', value: string) => {
        setCustomColors({ ...customColors, [type]: value });
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

        // If Super Admin, also update the global admin theme if they want
        if (isSuperAdmin && themeMode === 'follow_admin') {
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

    const handleSaveCustom = () => {
        const name = prompt('Berikan nama untuk warna kustom Anda:', `Warna Kustom ${savedCustomThemes.length + 1}`);
        if (name) {
            saveCustomTheme(name, customColors);
            setTimeout(() => window.location.reload(), 100);
        }
    };

    const renderSwatch = (
        id: Theme,
        name: string,
        primary: string,
        secondary: string,
        isActivePreview: boolean,
        isApplied: boolean,
        isCustom: boolean = false
    ) => {
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
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-sm transition-all duration-300 transform ${!isOverridden ? 'group-hover:scale-110 cursor-pointer' : 'cursor-not-allowed opacity-50'} flex items-center justify-center overflow-hidden ${isApplied ? 'ring-4 ring-offset-4 ring-ppm-slate scale-110' : isActivePreview ? 'ring-2 ring-offset-2 ring-slate-400' : 'ring-1 ring-slate-200 hover:ring-slate-400'}`}
                    style={{ background: `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)` }}
                    title={isOverridden ? "Tema dikunci oleh Administrator" : isApplied ? "Tema Aktif" : "Pratinjau Tema"}
                >
                    "
                    {isApplied && (
                        <div className="bg-black/20 absolute inset-0 flex items-center justify-center">
                            <Check size={28} className="text-white drop-shadow-md" strokeWidth={3} />
                        </div>
                    )}
                </div>
                <span className={`text-[10px] sm:text-[11px] font-bold text-center tracking-wide leading-tight mt-1 ${isApplied ? 'text-ppm-slate' : 'text-slate-700 group-hover:text-slate-900'}`}>
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
                        <h3 className="text-xl font-bold text-ppm-slate mb-2">Simpan Perubahan?</h3>
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
                    <h2 className="text-xl font-black text-ppm-slate uppercase tracking-tight flex items-center gap-2">
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

                {/* Custom Color Section (At Top) */}
                <div className="mb-10">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-ppm-slate mb-1">Warna Kustom (Hex)</h3>
                        <p className="text-sm text-slate-500">Tentukan warna <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">HEX</span> sendiri secara bebas sesuai preferensi aplikasi Anda.</p>
                    </div>

                    <div
                        onClick={() => { if (!isOverridden && theme !== 'custom') setTheme('custom'); }}
                        className={`p-6 rounded-xl border-2 transition-all ${isOverridden ? 'cursor-not-allowed opacity-60 bg-slate-100' : 'cursor-pointer'} ${theme === 'custom' ? 'border-ppm-slate bg-slate-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                    >
                        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                            <div className="flex-1 space-y-5 w-full">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Warna Utama (Primary)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative rounded-lg overflow-hidden w-12 h-12 shadow-sm border border-slate-200 hover:border-slate-400 transition-colors">
                                            <input
                                                type="color"
                                                value={customColors.primary}
                                                onChange={(e) => handleCustomChange('primary', e.target.value)}
                                                disabled={isOverridden}
                                                className={`absolute -top-2 -left-2 w-16 h-16 border-0 p-0 ${isOverridden ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={customColors.primary}
                                            onChange={(e) => handleCustomChange('primary', e.target.value)}
                                            disabled={isOverridden}
                                            className="input-modern font-mono text-base uppercase flex-1 max-w-[140px] px-4 py-2 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Warna Sekunder (Secondary)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative rounded-lg overflow-hidden w-12 h-12 shadow-sm border border-slate-200 hover:border-slate-400 transition-colors">
                                            <input
                                                type="color"
                                                value={customColors.secondary}
                                                onChange={(e) => handleCustomChange('secondary', e.target.value)}
                                                disabled={isOverridden}
                                                className={`absolute -top-2 -left-2 w-16 h-16 border-0 p-0 ${isOverridden ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={customColors.secondary}
                                            onChange={(e) => handleCustomChange('secondary', e.target.value)}
                                            disabled={isOverridden}
                                            className="input-modern font-mono text-base uppercase flex-1 max-w-[140px] px-4 py-2 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {theme === 'custom' && (
                                    <div className="pt-4 flex flex-wrap gap-3 animate-in fade-in zoom-in-95 duration-300">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); applyTheme(); setTimeout(() => window.location.reload(), 100); }}
                                            className="px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                            style={{ backgroundColor: customColors.primary, color: 'var(--theme-text-on-primary, #ffffff)' }}
                                        >
                                            <CheckCircle2 size={18} />
                                            Jadikan Tema
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSaveCustom(); }}
                                            className="px-6 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-300 shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Save size={18} />
                                            Simpan Warna Kustom
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="hidden sm:flex items-center justify-center p-6 border-l border-slate-200 pl-8">
                                <div
                                    className={`w-28 h-28 rounded-full shadow-lg flex items-center justify-center relative overflow-hidden transition-all ${theme === 'custom' ? 'ring-4 ring-offset-4 ring-ppm-slate scale-105' : 'opacity-60 grayscale-[30%]'}`}
                                    style={{ background: `linear-gradient(135deg, ${customColors.primary} 50%, ${customColors.secondary} 50%)` }}
                                >
                                    {appliedTheme === 'custom' && (
                                        <div className="bg-black/20 absolute inset-0 flex items-center justify-center">
                                            <Check size={36} className="text-white drop-shadow-md" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
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
                            <h3 className="font-bold text-ppm-slate text-lg">Pilihan Warna Tersedia</h3>
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
                                            t.colors.primary,
                                            t.colors.secondary,
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
                                        config.primary,
                                        config.secondary,
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
