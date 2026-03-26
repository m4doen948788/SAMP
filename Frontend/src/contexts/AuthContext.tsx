import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define user type based on payload
interface User {
    id: number;
    username?: string;
    nip?: string;
    email?: string;
    no_hp?: string;
    nama_lengkap: string;
    tipe_user_id: number;
    tipe_user_nama: string;
    instansi_id?: number;
    instansi_nama?: string;
    instansi_singkatan?: string;
    jabatan_id?: number;
    jabatan_nama?: string;
    sub_bidang_id?: number;
    sub_bidang_nama?: string;
    bidang_singkatan?: string;
    foto_profil?: string;
    tema?: string;
    tema_custom_colors?: any;
    appSettings?: {
        theme_mode: 'per_user' | 'follow_admin';
        admin_theme: string;
        admin_custom_colors: any;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (newData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
    updateUser: () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                console.error('Failed to parse stored user', e);
                return null;
            }
        }
        return null;
    });

    const login = (newToken: string, newUser: User) => {
        sessionStorage.setItem('token', newToken);
        sessionStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('app-theme');
        sessionStorage.removeItem('app-custom-colors');
        setToken(null);
        setUser(null);
    };

    const updateUser = (newData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...newData };
            setUser(updatedUser);
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    useEffect(() => {
        const syncUser = async () => {
            if (!token) return;
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const freshUser = data.data;
                    setUser((prev) => {
                        const updatedUser = { ...prev, ...freshUser };
                        sessionStorage.setItem('user', JSON.stringify(updatedUser));
                        return updatedUser;
                    });
                } else if (res.status === 401) {
                    logout();
                }
            } catch (err) {
                console.error('Failed to sync user session', err);
            }
        };
        syncUser();
    }, [token]);

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
