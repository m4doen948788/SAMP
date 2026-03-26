import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

export type DefaultTheme = 'default' | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';
export type Theme = DefaultTheme | 'custom' | string; // string allows for saved custom theme IDs (e.g., 'custom-123')

export interface CustomColors {
    primary: string;
    secondary: string;
}

export interface SavedCustomTheme {
    id: string;
    name: string;
    colors: CustomColors;
}

interface ThemeContextType {
    theme: Theme; // The actively rendering theme (used for previewing during selection)
    appliedTheme: Theme; // The actual saved theme that the user confirmed
    setTheme: (theme: Theme) => void;
    applyTheme: () => Promise<void>; // Confirms the preview theme as the applied theme

    customColors: CustomColors;
    setCustomColors: (colors: CustomColors) => void;

    savedCustomThemes: SavedCustomTheme[];
    saveCustomTheme: (name: string, colors: CustomColors) => void;
    deleteCustomTheme: (id: string) => void;

    // Global settings for Superadmin
    themeMode: 'per_user' | 'follow_admin';
    adminTheme: string;
    adminCustomColors: CustomColors;
    updateGlobalSettings: (data: any) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themesConfig: Record<DefaultTheme, { name: string; primary: string; secondary: string }> = {
    default: { name: 'PPM Slate (Default)', primary: '#0f172a', secondary: '#1e293b' },
    slate: { name: 'Slate', primary: '#334155', secondary: '#475569' },
    gray: { name: 'Gray', primary: '#4b5563', secondary: '#6b7280' },
    zinc: { name: 'Zinc', primary: '#3f3f46', secondary: '#52525b' },
    neutral: { name: 'Neutral', primary: '#404040', secondary: '#525252' },
    stone: { name: 'Stone', primary: '#44403c', secondary: '#57534e' },
    red: { name: 'Red', primary: '#dc2626', secondary: '#ef4444' },
    orange: { name: 'Orange', primary: '#ea580c', secondary: '#f97316' },
    amber: { name: 'Amber', primary: '#d97706', secondary: '#f59e0b' },
    yellow: { name: 'Yellow', primary: '#ca8a04', secondary: '#eab308' },
    lime: { name: 'Lime', primary: '#65a30d', secondary: '#84cc16' },
    green: { name: 'Green', primary: '#16a34a', secondary: '#22c55e' },
    emerald: { name: 'Emerald', primary: '#059669', secondary: '#10b981' },
    teal: { name: 'Teal', primary: '#0d9488', secondary: '#14b8a6' },
    cyan: { name: 'Cyan', primary: '#0891b2', secondary: '#06b6d4' },
    sky: { name: 'Sky', primary: '#0284c7', secondary: '#0ea5e9' },
    blue: { name: 'Blue', primary: '#2563eb', secondary: '#3b82f6' },
    indigo: { name: 'Indigo', primary: '#4f46e5', secondary: '#6366f1' },
    violet: { name: 'Violet', primary: '#7c3aed', secondary: '#8b5cf6' },
    purple: { name: 'Purple', primary: '#9333ea', secondary: '#a855f7' },
    fuchsia: { name: 'Fuchsia', primary: '#c026d3', secondary: '#d946ef' },
    pink: { name: 'Pink', primary: '#db2777', secondary: '#ec4899' },
    rose: { name: 'Rose', primary: '#e11d48', secondary: '#f43f5e' },
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, updateUser } = useAuth();

    // Global settings state
    const [themeMode, setThemeMode] = useState<'per_user' | 'follow_admin'>('per_user');
    const [adminTheme, setAdminTheme] = useState<string>('default');
    const [adminCustomColors, setAdminCustomColors] = useState<CustomColors>({ primary: '#0f172a', secondary: '#1e293b' });

    // appliedTheme is the source of truth from localStorage/Backend
    const [appliedTheme, setAppliedTheme] = useState<Theme>(() => {
        return (localStorage.getItem('app-theme') as Theme) || 'default';
    });

    // theme is for live-previewing in the settings screen
    const [theme, setTheme] = useState<Theme>(appliedTheme);

    const [savedCustomThemes, setSavedCustomThemes] = useState<SavedCustomTheme[]>([]);
    const [customColors, setCustomColors] = useState<CustomColors>({ primary: '#0f172a', secondary: '#1e293b' });

    const isLoaded = useRef(false);

    // Sync with User data on login/refresh
    useEffect(() => {
        if (user) {
            // Load user-specific cached themes/colors immediately when user becomes available
            let cachedColors: string | null = null;
            if (!isLoaded.current) {
                const savedThemesKey = `app-saved-custom-themes-${user.id}`;
                const savedColorsKey = `app-custom-colors-${user.id}`;

                const cachedThemes = localStorage.getItem(savedThemesKey);
                if (cachedThemes) {
                    try { setSavedCustomThemes(JSON.parse(cachedThemes)); } catch (e) { }
                }

                cachedColors = localStorage.getItem(savedColorsKey);
                if (cachedColors) {
                    try { setCustomColors(JSON.parse(cachedColors)); } catch (e) { }
                }
            }

            // Load global settings
            if (user.appSettings) {
                setThemeMode(user.appSettings.theme_mode);
                setAdminTheme(user.appSettings.admin_theme);
                setAdminCustomColors(user.appSettings.admin_custom_colors || { primary: '#0f172a', secondary: '#1e293b' });
            }

            // Decide which theme to apply
            if (user.appSettings?.theme_mode === 'follow_admin') {
                const effectiveTheme = user.appSettings.admin_theme;
                setAppliedTheme(effectiveTheme);
                setTheme(effectiveTheme);
                if (effectiveTheme === 'custom' || effectiveTheme.startsWith('custom-')) {
                    setCustomColors(user.appSettings.admin_custom_colors);
                }
            } else {
                // Per User mode
                const userTheme = user.tema || 'default';
                if (appliedTheme !== userTheme) {
                    setAppliedTheme(userTheme);
                    setTheme(userTheme);
                }
                if (user.tema_custom_colors) {
                    setCustomColors(prev => {
                        // If we didn't just load it from cache, use DB value
                        if (!cachedColors) return user.tema_custom_colors;
                        return prev;
                    });
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
            setCustomColors({ primary: '#0f172a', secondary: '#1e293b' });
            isLoaded.current = false;
        }
    }, [user]); // Removed appliedTheme from deps to avoid infinite reload loop

    // Apply the active 'theme' (preview or applied) to the document
    useEffect(() => {
        let isBuiltIn = Object.keys(themesConfig).includes(theme);
        let currentPrimary = '#0f172a';

        if (isBuiltIn) {
            document.documentElement.setAttribute('data-theme', theme);
            currentPrimary = (themesConfig as any)[theme].primary;
            // Remove inline custom vars
            document.documentElement.style.removeProperty('--theme-primary');
            document.documentElement.style.removeProperty('--theme-secondary');
            document.documentElement.style.removeProperty('--theme-bg');
            document.documentElement.style.removeProperty('--theme-mint');
            document.documentElement.style.removeProperty('--theme-sage');
        } else {
            document.documentElement.setAttribute('data-theme', 'custom');
            let colorsToUse = customColors;

            // If it's a saved custom theme, find its colors
            if (theme !== 'custom') {
                const savedTheme = savedCustomThemes.find(t => t.id === theme);
                if (savedTheme) {
                    colorsToUse = savedTheme.colors;
                }
            }

            currentPrimary = colorsToUse.primary;

            document.documentElement.style.setProperty('--theme-primary', colorsToUse.primary);
            document.documentElement.style.setProperty('--theme-secondary', colorsToUse.secondary);
            document.documentElement.style.setProperty('--theme-bg', '#f8faf9');
            document.documentElement.style.setProperty('--theme-mint', '#f1f5f9');
            document.documentElement.style.setProperty('--theme-sage', '#e2e8f0');
        }

        // Calculate contrast for text
        let hex = currentPrimary.replace('#', '');
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
        const textColor = yiq >= 128 ? '#0f172a' : '#ffffff';
        document.documentElement.style.setProperty('--theme-text-on-primary', textColor);

    }, [theme, customColors, savedCustomThemes]);

    // Save custom colors to storage when they change
    useEffect(() => {
        if (user && isLoaded.current) {
            localStorage.setItem(`app-custom-colors-${user.id}`, JSON.stringify(customColors));
        }
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

    const saveCustomTheme = (name: string, colors: CustomColors) => {
        const newTheme: SavedCustomTheme = {
            id: `custom-${Date.now()}`,
            name,
            colors: { ...colors }
        };
        const updated = [...savedCustomThemes, newTheme];
        setSavedCustomThemes(updated);
        setTheme(newTheme.id); // switch preview to the new saved theme
        setAppliedTheme(newTheme.id); // apply it automatically when saving
        localStorage.setItem('app-theme', newTheme.id); // cache it
    };

    return (
        <ThemeContext.Provider value={{
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
