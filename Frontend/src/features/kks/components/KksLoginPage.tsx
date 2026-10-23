import React, { useState, useEffect } from 'react';
import { HeartPulse, Lock, User, ArrowRight, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_URL } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export const KksLoginPage: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      const token = data.data?.token || data.token;
      const userObj = data.data?.user || data.user;

      if (res.ok && data.success && token && userObj) {
        login(token, userObj);
        onSuccess();
      } else {
        setErrorMsg(data.message || 'Username atau password tidak sesuai');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server autentikasi. Silakan periksa koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[550px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-100 shadow-2xl p-8 space-y-6 relative overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <HeartPulse className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Portal Penilaian KKS
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Masuk dengan akun Perangkat Daerah / Tim Pembina Kabupaten
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700 relative z-10">
          <div>
            <label className="block mb-1.5">Username / NIP / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau email OPD..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5">Kata Sandi (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? 'Memvalidasi Akun...' : 'Masuk ke Portal KKS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 hover:text-slate-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </button>

          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <Shield className="w-3.5 h-3.5" /> SSO Bapperida
          </span>
        </div>

      </div>
    </div>
  );
};
