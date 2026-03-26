import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface TableLabel {
    table_name: string;
    column_key: string;
    label: string;
}

interface LabelContextType {
    getLabel: (tableName: string, columnKey: string, defaultLabel: string) => string;
    refreshLabels: () => Promise<void>;
    loading: boolean;
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export function LabelProvider({ children }: { children: ReactNode }) {
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchLabels = async () => {
        try {
            const res = await api.tableLabels.getAll();
            if (res.success) {
                const labelMap: Record<string, string> = {};
                res.data.forEach((l: TableLabel) => {
                    labelMap[`${l.table_name}:${l.column_key}`] = l.label;
                });
                setLabels(labelMap);
            }
        } catch (err) {
            console.error('Failed to fetch table labels:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLabels();
    }, []);

    const getLabel = (tableName: string, columnKey: string, defaultLabel: string): string => {
        return labels[`${tableName}:${columnKey}`] || defaultLabel;
    };

    return (
        <LabelContext.Provider value={{ getLabel, refreshLabels: fetchLabels, loading }}>
            {children}
        </LabelContext.Provider>
    );
}

export function useLabels() {
    const context = useContext(LabelContext);
    if (context === undefined) {
        throw new Error('useLabels must be used within a LabelProvider');
    }
    return context;
}
