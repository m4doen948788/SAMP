import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUnsubmittedSkpsForUser } from '@/src/services/skpHelpers';

export default function ApprovalNotification({ onOpenInbox }: { onOpenInbox: () => void }) {
    const { user } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);
    const [skpWarningCount, setSkpWarningCount] = useState(0);

    const fetchData = async () => {
        try {
            // Fetch Pending Approvals
            const resApp = await api.suratApprovals.getPending();
            if (resApp.success && resApp.data) {
                const pendingOnly = resApp.data.filter((a: any) => a.status === 'PENDING');
                setPendingCount(pendingOnly.length);
            }

            // Fetch Unread Notifications
            const resNotif = await api.notifications.getAll();
            if (resNotif.success && resNotif.data) {
                const unreadOnly = resNotif.data.filter((n: any) => !n.is_read);
                setNotifCount(unreadOnly.length);
            }

            // Fetch SKP status (if date is >= 22 or debug mode enabled)
            let skpCount = 0;
            const isAfter22 = new Date().getDate() >= 22;
            const isDebug = window.location.search.includes('debug_skp_notif');
            if ((isAfter22 || isDebug) && user) {
                try {
                    const unsubmitted = await getUnsubmittedSkpsForUser(user);
                    if (unsubmitted && unsubmitted.length > 0) {
                        skpCount = 1;
                    }
                } catch (err) {
                    console.error('Failed to fetch SKP count', err);
                }
            }
            setSkpWarningCount(skpCount);
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
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {pendingCount + notifCount + skpWarningCount > 9 ? '9+' : pendingCount + notifCount + skpWarningCount}
                </span>
            )}
        </button>
    );
}
