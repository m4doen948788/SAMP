import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { KeyRound, Mail, ArrowRight, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const { login } = useAuth();
    const { currentTheme } = useTheme();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                setTimeout(() => {
                    // Force redirect to dashboard to discard any previous url param
                    window.history.replaceState({}, '', '/?page=dashboard');
                    login(data.data.token, data.data.user);
                    // We also ensure a full refresh to reset App state cleanly
                    window.location.href = '/?page=dashboard';
                }, 600);
            } else {
                setError(data.message || 'Login failed');
                setIsLoading(false);
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900 font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/30 blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-600/20 blur-[130px] mix-blend-screen pointer-events-none transition-all duration-1000 ease-in-out"></div>
            <div className="absolute top-[20%] right-[10%] w-[25vw] h-[35vw] rounded-full bg-indigo-600/20 blur-[100px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
            <div className="absolute inset-0 bg-slate-900/60 pointer-events-none"></div>

            {/* Main Glass Card */}
            <div className="relative z-10 w-full max-w-[420px] px-6">
                <div className="backdrop-blur-2xl bg-white/10 border border-white/20 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_12px_50px_rgba(0,0,0,0.6)]">

                    <div className="mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-gradient-to-tr from-blue-500 to-indigo-500 mb-6 shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                            <span className="text-2xl font-black text-white px-2 tracking-tighter">PPM</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome back</h1>
                        <p className="text-slate-300 text-sm font-medium px-4">Streamline your daily operations on our secure dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/40 text-red-100 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 shadow-inner shadow-red-500/10 transition-all duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Username Input */}
                            <div className="relative group">
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === 'username' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={() => setFocusedInput('username')}
                                    onBlur={() => setFocusedInput(null)}
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-slate-800/40 border rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/80 transition-all duration-300 sm:text-sm shadow-inner ${focusedInput === 'username' ? 'border-blue-500/60 bg-slate-800/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-white/10 hover:border-white/25'}`}
                                    placeholder="Username or Email"
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative group">
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${focusedInput === 'password' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                    <KeyRound size={18} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-slate-800/40 border rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/80 transition-all duration-300 sm:text-sm shadow-inner ${focusedInput === 'password' ? 'border-blue-500/60 bg-slate-800/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-white/10 hover:border-white/25'}`}
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] overflow-hidden"
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 w-full h-full transform translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shine"></div>

                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-white/80" />
                                        <span>AUTHENTICATING...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="tracking-wide">SIGN IN</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>

                {/* Footer Text */}
                <p className="mt-8 text-center text-xs text-slate-500 font-medium tracking-wide">
                    &copy; {new Date().getFullYear()} Dashboard Internal PPM. All rights reserved.
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @tailwind utilities;
        @layer utilities {
          .animate-shine {
            animation: shine 1.5s infinite;
          }
          @keyframes shine {
            100% {
              transform: translateX(100%);
            }
          }
        }
      `}} />
        </div>
    );
};
