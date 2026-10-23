import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export type DefaultTheme = 'default' | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';
export type Theme = DefaultTheme | 'custom' | string; // string allows for saved custom theme IDs (e.g., 'custom-123')

export interface CustomColors {
    color1: string;       // Warna 1: Biru Langit (#0097fe) - Aksi Utama & Perencanaan
    color2: string;       // Warna 2: Hijau Segar (#009a19) - Pelaksanaan & Sukses
    color3: string;       // Warna 3: Oranye Terang (#fe9600) - Inovasi & Pelaporan
    color4: string;       // Warna 4: Biru Tua (#0069a3) - Kelembagaan & Aksen
    background: string;   // Warna Background: Putih (#ffffff)
    primary?: string;     // Backward compatibility (alias to color1)
    secondary?: string;   // Backward compatibility (alias to color4)
}

export const DEFAULT_BAPPERIDA_COLORS: CustomColors = {
    color1: '#0097fe',
    color2: '#009a19',
    color3: '#fe9600',
    color4: '#0069a3',
    background: '#ffffff',
    primary: '#0097fe',
    secondary: '#0069a3'
};

export const normalizeCustomColors = (raw: any): CustomColors => {
    if (!raw) return DEFAULT_BAPPERIDA_COLORS;
    
    // Cegah warna tombol (color1/primary) terkontaminasi warna putih (#fff / #ffffff) akibat cache lama
    const isWhite = (hex?: string) => {
        if (!hex || typeof hex !== 'string') return true;
        const clean = hex.trim().toLowerCase().replace('#', '');
        return clean === 'fff' || clean === 'ffffff';
    };

    const rawColor1 = raw.color1 || raw.primary;
    const safeColor1 = isWhite(rawColor1) ? DEFAULT_BAPPERIDA_COLORS.color1 : rawColor1;
    const safeColor4 = isWhite(raw.color4 || raw.secondary) ? DEFAULT_BAPPERIDA_COLORS.color4 : (raw.color4 || raw.secondary);

    return {
        color1: safeColor1,
        color2: raw.color2 || '#009a19',
        color3: raw.color3 || '#fe9600',
        color4: safeColor4,
        background: raw.background || '#ffffff',
        primary: safeColor1,
        secondary: safeColor4
    };
};

export interface SavedCustomTheme {
    id: string;
    name: string;
    colors: CustomColors;
}

interface ThemeContextType {
    theme: Theme; // The actively rendering theme (used for previewing during selection)
    currentTheme: Theme; // Backward compatible alias for theme
    appliedTheme: Theme; // The actual saved theme that the user confirmed
    setTheme: (theme: Theme) => void;
    applyTheme: () => Promise<void>; // Confirms the preview theme as the applied theme

    customColors: CustomColors;
    setCustomColors: (colors: CustomColors) => void;

    savedCustomThemes: SavedCustomTheme[];
    saveCustomTheme: (name: string, colors: CustomColors) => Promise<void>;
    deleteCustomTheme: (id: string) => void;

    // Global settings for Superadmin
    themeMode: 'per_user' | 'follow_admin';
    adminTheme: string;
    adminCustomColors: CustomColors;
    updateGlobalSettings: (data: any) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemePalettePreset {
    name: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
    primary: string;
    secondary: string;
}

export const themesConfig: Record<DefaultTheme, ThemePalettePreset> = {
    default: { name: 'Bapperida Signature (Default)', color1: '#0097fe', color2: '#009a19', color3: '#fe9600', color4: '#0069a3', primary: '#0097fe', secondary: '#0069a3' },
    slate: { name: 'Slate Modern', color1: '#334155', color2: '#009a19', color3: '#f59e0b', color4: '#0f172a', primary: '#334155', secondary: '#0f172a' },
    gray: { name: 'Gray Cool', color1: '#4b5563', color2: '#10b981', color3: '#ea580c', color4: '#1f2937', primary: '#4b5563', secondary: '#1f2937' },
    zinc: { name: 'Zinc Steel', color1: '#3f3f46', color2: '#10b981', color3: '#f59e0b', color4: '#18181b', primary: '#3f3f46', secondary: '#18181b' },
    neutral: { name: 'Neutral Clean', color1: '#404040', color2: '#16a34a', color3: '#ea580c', color4: '#171717', primary: '#404040', secondary: '#171717' },
    stone: { name: 'Stone Earth', color1: '#44403c', color2: '#15803d', color3: '#d97706', color4: '#1c1917', primary: '#44403c', secondary: '#1c1917' },
    red: { name: 'Crimson Red', color1: '#dc2626', color2: '#16a34a', color3: '#f97316', color4: '#991b1b', primary: '#dc2626', secondary: '#991b1b' },
    orange: { name: 'Sunset Orange', color1: '#ea580c', color2: '#16a34a', color3: '#d97706', color4: '#9a3412', primary: '#ea580c', secondary: '#9a3412' },
    amber: { name: 'Golden Amber', color1: '#d97706', color2: '#059669', color3: '#ea580c', color4: '#78350f', primary: '#d97706', secondary: '#78350f' },
    yellow: { name: 'Sun Yellow', color1: '#ca8a04', color2: '#16a34a', color3: '#f97316', color4: '#713f12', primary: '#ca8a04', secondary: '#713f12' },
    lime: { name: 'Fresh Lime', color1: '#65a30d', color2: '#0097fe', color3: '#f59e0b', color4: '#365314', primary: '#65a30d', secondary: '#365314' },
    green: { name: 'Vibrant Green', color1: '#16a34a', color2: '#0097fe', color3: '#f59e0b', color4: '#14532d', primary: '#16a34a', secondary: '#14532d' },
    emerald: { name: 'Emerald Jewel', color1: '#059669', color2: '#0284c7', color3: '#f59e0b', color4: '#064e3b', primary: '#059669', secondary: '#064e3b' },
    teal: { name: 'Ocean Teal', color1: '#0d9488', color2: '#16a34a', color3: '#ea580c', color4: '#134e4a', primary: '#0d9488', secondary: '#134e4a' },
    cyan: { name: 'Aqua Cyan', color1: '#0891b2', color2: '#10b981', color3: '#f59e0b', color4: '#164e63', primary: '#0891b2', secondary: '#164e63' },
    sky: { name: 'Sky Azure', color1: '#0284c7', color2: '#10b981', color3: '#fe9600', color4: '#0369a1', primary: '#0284c7', secondary: '#0369a1' },
    blue: { name: 'Royal Blue', color1: '#2563eb', color2: '#10b981', color3: '#f59e0b', color4: '#1e3a8a', primary: '#2563eb', secondary: '#1e3a8a' },
    indigo: { name: 'Deep Indigo', color1: '#4f46e5', color2: '#059669', color3: '#f59e0b', color4: '#312e81', primary: '#4f46e5', secondary: '#312e81' },
    violet: { name: 'Mystic Violet', color1: '#7c3aed', color2: '#10b981', color3: '#f59e0b', color4: '#4c1d95', primary: '#7c3aed', secondary: '#4c1d95' },
    purple: { name: 'Majestic Purple', color1: '#9333ea', color2: '#059669', color3: '#ea580c', color4: '#581c87', primary: '#9333ea', secondary: '#581c87' },
    fuchsia: { name: 'Neon Fuchsia', color1: '#c026d3', color2: '#0097fe', color3: '#f59e0b', color4: '#701a75', primary: '#c026d3', secondary: '#701a75' },
    pink: { name: 'Blush Pink', color1: '#db2777', color2: '#10b981', color3: '#f59e0b', color4: '#831843', primary: '#db2777', secondary: '#831843' },
    rose: { name: 'Ruby Rose', color1: '#e11d48', color2: '#059669', color3: '#f59e0b', color4: '#881337', primary: '#e11d48', secondary: '#881337' },
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, updateUser } = useAuth();

    // Global settings state
    const [themeMode, setThemeMode] = useState<'per_user' | 'follow_admin'>('per_user');
    const [adminTheme, setAdminTheme] = useState<string>('default');
    const [adminCustomColors, setAdminCustomColors] = useState<CustomColors>(DEFAULT_BAPPERIDA_COLORS);

    // appliedTheme is the source of truth from localStorage/Backend.
    // Initialize synchronously from sessionStorage['user'] (set before redirect by AuthContext.login())
    // so that the first React render already uses the correct theme — no glitch.
    const [appliedTheme, setAppliedTheme] = useState<Theme>(() => {
        try {
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                if (userData.appSettings?.theme_mode === 'follow_admin') {
                    return (userData.appSettings.admin_theme as Theme) || 'default';
                }
                if (userData.tema) return userData.tema as Theme;
                // Fallback: If user has no theme of their own, follow admin settings as dynamic default
                if (userData.appSettings?.admin_theme) {
                    return (userData.appSettings.admin_theme as Theme);
                }
            }
        } catch (e) { }
        return (localStorage.getItem('app-theme') as Theme) || 'default';
    });

    // theme is for live-previewing in the settings screen
    const [theme, setTheme] = useState<Theme>(appliedTheme);

    const [savedCustomThemes, setSavedCustomThemes] = useState<SavedCustomTheme[]>([]);
    const [customColors, setCustomColors] = useState<CustomColors>(() => {
        // Also try to read custom colors from sessionStorage user data first
        try {
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                if (userData.appSettings?.theme_mode === 'follow_admin' && userData.appSettings?.admin_custom_colors) {
                    return normalizeCustomColors(userData.appSettings.admin_custom_colors);
                }
                if (userData.tema_custom_colors) return normalizeCustomColors(userData.tema_custom_colors);
                // Fallback: If user has no theme of their own, follow admin custom colors as dynamic default
                if (userData.appSettings?.admin_custom_colors) {
                    return normalizeCustomColors(userData.appSettings.admin_custom_colors);
                }
            }
        } catch (e) { }
        try {
            const lastColors = localStorage.getItem('app-custom-colors-last');
            if (lastColors) {
                return normalizeCustomColors(JSON.parse(lastColors));
            }
        } catch (e) {}
        return DEFAULT_BAPPERIDA_COLORS;
    });


    const isLoaded = useRef(false);

    // Sync with User data on login/refresh
    useEffect(() => {
        if (user) {
            // Load user-specific cached themes/colors immediately when user becomes available
            const savedThemesKey = `app-saved-custom-themes-${user.id}`;
            const savedColorsKey = `app-custom-colors-${user.id}`;

            let loadedCustomThemes: SavedCustomTheme[] = [];
            const cachedThemes = localStorage.getItem(savedThemesKey);
            if (cachedThemes) {
                try { loadedCustomThemes = JSON.parse(cachedThemes); } catch (e) { }
            }

            // CRITICAL: Reconstruct custom theme if user has custom colors saved in DB profile
            // This ensures custom themes are NEVER lost after logout or clearing browser storage!
            const userTheme = user.tema;
            if (userTheme && (userTheme === 'custom' || userTheme.startsWith('custom-')) && user.tema_custom_colors) {
                const normUserColors = normalizeCustomColors(user.tema_custom_colors);
                const themeExists = loadedCustomThemes.some(t => t.id === userTheme);
                if (!themeExists) {
                    loadedCustomThemes.push({
                        id: userTheme,
                        name: 'Warna Kustom Saya',
                        colors: normUserColors
                    });
                    localStorage.setItem(savedThemesKey, JSON.stringify(loadedCustomThemes));
                }
            }
            setSavedCustomThemes(loadedCustomThemes);

            let cachedColors: string | null = localStorage.getItem(savedColorsKey);
            if (cachedColors) {
                try { 
                    setCustomColors(normalizeCustomColors(JSON.parse(cachedColors))); 
                } catch (e) { }
            } else if (user.tema_custom_colors) {
                setCustomColors(normalizeCustomColors(user.tema_custom_colors));
            }

            // Load global settings
            if (user.appSettings) {
                setThemeMode(user.appSettings.theme_mode);
                setAdminTheme(user.appSettings.admin_theme);
                setAdminCustomColors(normalizeCustomColors(user.appSettings.admin_custom_colors));
            }

            // Decide which theme to apply
            if (user.appSettings?.theme_mode === 'follow_admin') {
                const effectiveTheme = user.appSettings.admin_theme;
                setAppliedTheme(effectiveTheme);
                setTheme(effectiveTheme);
                if (effectiveTheme === 'custom' || effectiveTheme.startsWith('custom-')) {
                    setCustomColors(normalizeCustomColors(user.appSettings.admin_custom_colors));
                }
            } else {
                // Per User mode
                if (userTheme) {
                    if (appliedTheme !== userTheme) {
                        setAppliedTheme(userTheme as Theme);
                        setTheme(userTheme as Theme);
                    }
                    if (user.tema_custom_colors) {
                        setCustomColors(normalizeCustomColors(user.tema_custom_colors));
                    }
                } else {
                    // Fallback: User has no custom theme preference, so they follow admin theme & colors as dynamic default
                    const adminTheme = user.appSettings?.admin_theme || 'default';
                    if (appliedTheme !== adminTheme) {
                        setAppliedTheme(adminTheme as Theme);
                        setTheme(adminTheme as Theme);
                    }
                    if (user.appSettings?.admin_custom_colors) {
                        setCustomColors(normalizeCustomColors(user.appSettings.admin_custom_colors));
                    }
                }
            }
            isLoaded.current = true;
        } else {
            // No user - reset to defaults to prevent leakage
            if (appliedTheme !== 'default') {
                setAppliedTheme('default');
                setTheme('default');
            }
            setSavedCustomThemes([]);
            setCustomColors(DEFAULT_BAPPERIDA_COLORS);
            isLoaded.current = false;
        }
    }, [user]); // Removed appliedTheme from deps to avoid infinite reload loop

    // Apply the active 'theme' (preview or applied) to the document
    useEffect(() => {
        let isBuiltIn = Object.keys(themesConfig).includes(theme);
        let colorsToUse: CustomColors = DEFAULT_BAPPERIDA_COLORS;

        if (isBuiltIn) {
            document.documentElement.setAttribute('data-theme', theme);
            if (theme === 'default') {
                colorsToUse = DEFAULT_BAPPERIDA_COLORS;
            } else {
                const cfg = (themesConfig as any)[theme];
                colorsToUse = {
                    color1: cfg.color1 || cfg.primary,
                    color2: cfg.color2 || '#009a19',
                    color3: cfg.color3 || '#fe9600',
                    color4: cfg.color4 || cfg.secondary || '#0069a3',
                    background: '#ffffff',
                    primary: cfg.primary,
                    secondary: cfg.secondary || '#0f172a'
                };
            }
        } else {
            document.documentElement.setAttribute('data-theme', 'custom');
            colorsToUse = normalizeCustomColors(customColors);

            // If it's a saved custom theme, find its colors
            if (theme !== 'custom') {
                const savedTheme = savedCustomThemes.find(t => t.id === theme);
                if (savedTheme) {
                    colorsToUse = normalizeCustomColors(savedTheme.colors);
                }
            }
        }

        const norm = normalizeCustomColors(colorsToUse);
        
        // 5 Variabel Warna Inti Bapperida
        document.documentElement.style.setProperty('--theme-color-1', norm.color1);
        document.documentElement.style.setProperty('--theme-color-2', norm.color2);
        document.documentElement.style.setProperty('--theme-color-3', norm.color3);
        document.documentElement.style.setProperty('--theme-color-4', norm.color4);
        document.documentElement.style.setProperty('--theme-bg-surface', norm.background);

        // Kompatibilitas tombol aksi & layout
        document.documentElement.style.setProperty('--theme-primary', norm.color1);
        document.documentElement.style.setProperty('--theme-secondary', norm.color4);
        document.documentElement.style.setProperty('--theme-accent', norm.color1);
        document.documentElement.style.setProperty('--theme-bg', '#f8fafc');
        document.documentElement.style.setProperty('--theme-mint', '#f1f5f9');
        document.documentElement.style.setProperty('--theme-sage', '#e2e8f0');

        // Calculate contrast for text on any hex color
        const getContrastColor = (colorHex: string) => {
            let hex = (colorHex || '#0f172a').replace('#', '');
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            let r = 0, g = 0, b = 0;
            if (hex.length === 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            }
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return yiq >= 128 ? '#0f172a' : '#ffffff';
        };

        const textColor = getContrastColor(norm.color1);
        const textOnSecondary = getContrastColor(norm.color4);
        document.documentElement.style.setProperty('--theme-text-on-primary', textColor);
        document.documentElement.style.setProperty('--theme-text-on-secondary', textOnSecondary);

    }, [theme, customColors, savedCustomThemes]);

    // Save custom colors to storage when they change
    useEffect(() => {
        if (user && isLoaded.current) {
            localStorage.setItem(`app-custom-colors-${user.id}`, JSON.stringify(customColors));
        }
        // Save to general cache so it can be loaded instantly on initial mount before auth resolves
        localStorage.setItem('app-custom-colors-last', JSON.stringify(customColors));
    }, [customColors, user]);

    // Save saved custom themes to storage when they change
    useEffect(() => {
        if (user && isLoaded.current) {
            localStorage.setItem(`app-saved-custom-themes-${user.id}`, JSON.stringify(savedCustomThemes));
        }
    }, [savedCustomThemes, user]);

    // Confirm preview theme as applied
    const applyTheme = async () => {
        setAppliedTheme(theme);
        localStorage.setItem('app-theme', theme as string);

        if (user) {
            try {
                const tema_custom_colors = (theme === 'custom' || (theme as string).startsWith('custom-')) ? customColors : null;
                await api.theme.updateUserTheme({
                    tema: theme,
                    tema_custom_colors
                });

                // Sync local user data
                updateUser({
                    tema: theme as string,
                    tema_custom_colors
                });
            } catch (err) {
                console.error('Failed to save theme to backend', err);
            }
        }
    };

    const updateGlobalSettings = async (data: any) => {
        try {
            const res = await api.theme.updateGlobalSettings(data);
            if (res.success) {
                if (data.theme_mode) setThemeMode(data.theme_mode);
                if (data.admin_theme) setAdminTheme(data.admin_theme);
                if (data.admin_custom_colors) setAdminCustomColors(data.admin_custom_colors);

                // Sync global settings in local user for instant UI update
                if (user) {
                    const newSettings = {
                        ...user.appSettings,
                        theme_mode: data.theme_mode || user.appSettings?.theme_mode || 'per_user',
                        admin_theme: data.admin_theme || user.appSettings?.admin_theme || 'default',
                        admin_custom_colors: data.admin_custom_colors || user.appSettings?.admin_custom_colors || { primary: '#0f172a', secondary: '#1e293b' }
                    };
                    updateUser({ appSettings: newSettings as any });
                }
            }
        } catch (err) {
            console.error('Failed to update global settings', err);
        }
    };

    const deleteCustomTheme = (id: string) => {
        const updated = savedCustomThemes.filter(t => t.id !== id);
        setSavedCustomThemes(updated);
        if (theme === id) {
            setTheme('default');
        }
        if (appliedTheme === id) {
            setAppliedTheme('default');
            localStorage.setItem('app-theme', 'default');
            applyTheme(); // trigger backend save back to default
        }
    };

    const saveCustomTheme = async (name: string, colors: CustomColors) => {
        const normColors = normalizeCustomColors(colors);
        const newTheme: SavedCustomTheme = {
            id: `custom-${Date.now()}`,
            name,
            colors: normColors
        };
        const updated = [...savedCustomThemes, newTheme];
        setSavedCustomThemes(updated);
        setTheme(newTheme.id); // switch preview to the new saved theme
        setAppliedTheme(newTheme.id); // apply it automatically when saving
        setCustomColors(normColors);

        // Synchronously cache to localStorage so it is instantly available across reloads
        localStorage.setItem('app-theme', newTheme.id);
        localStorage.setItem('app-custom-colors-last', JSON.stringify(normColors));
        if (user) {
            localStorage.setItem(`app-saved-custom-themes-${user.id}`, JSON.stringify(updated));
            localStorage.setItem(`app-custom-colors-${user.id}`, JSON.stringify(normColors));

            // Persist to backend database (profil_pegawai table)
            try {
                await api.theme.updateUserTheme({
                    tema: newTheme.id,
                    tema_custom_colors: normColors
                });
                updateUser({
                    tema: newTheme.id,
                    tema_custom_colors: normColors
                });
            } catch (err) {
                console.error('Failed to persist custom theme to backend', err);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            currentTheme: theme,
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
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
