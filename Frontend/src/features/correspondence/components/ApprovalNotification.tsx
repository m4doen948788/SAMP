import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { getSkpAlertsForUser } from '@/src/services/skpHelpers';

export default function ApprovalNotification({ onOpenInbox }: { onOpenInbox: () => void }) {
    const { user } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);
    const [skpWarningCount, setSkpWarningCount] = useState(0);

    const fetchData = async () => {
        try {
            const [resApp, resNotif, skpAlerts] = await Promise.all([
                api.suratApprovals.getPending().catch(() => ({ success: false, data: [] })),
                api.notifications.getAll().catch(() => ({ success: false, data: [] })),
                user ? getSkpAlertsForUser(user).catch(() => []) : Promise.resolve([])
            ]);

            if (resApp.success && resApp.data) {
                const pendingOnly = resApp.data.filter((a: any) => a.status === 'PENDING');
                setPendingCount(pendingOnly.length);
            }
            if (resNotif.success && resNotif.data) {
                const unreadOnly = resNotif.data.filter((n: any) => !n.is_read);
                setNotifCount(unreadOnly.length);
            }
            setSkpWarningCount((skpAlerts as any[]).length);
        } catch (error) {
            console.error('Failed to fetch counts', error);
        }
    };


    useEffect(() => {
        if (user) {
            fetchData();
            // Poll every 30 seconds
            const interval = setInterval(fetchData, 30000);

            // Listen for manual updates
            const handleManualUpdate = () => {
                setTimeout(fetchData, 500);
            };
            window.addEventListener('approval-action-success', handleManualUpdate);
            window.addEventListener('notification-update', handleManualUpdate);
            window.addEventListener('skp-update', handleManualUpdate);

            return () => {
                clearInterval(interval);
                window.removeEventListener('approval-action-success', handleManualUpdate);
                window.removeEventListener('notification-update', handleManualUpdate);
                window.removeEventListener('skp-update', handleManualUpdate);
            };
        }
    }, [user]);

    return (
        <button 
            onClick={onOpenInbox}
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            title="Kotak Masuk Persetujuan Surat"
        >
            <Mail size={20} />
            {pendingCount + notifCount + skpWarningCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white leading-none shadow-xs tabular-nums select-none">
                    {pendingCount + notifCount + skpWarningCount > 99 ? '99+' : pendingCount + notifCount + skpWarningCount}
                </span>
            )}
        </button>
    );
}
