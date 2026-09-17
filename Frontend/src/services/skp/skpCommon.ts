import { api } from '../api';

export interface SkpAlert {
  type: 'own_unsubmitted' | 'staff_unsubmitted';
  year: number;
  month: number;
  monthName: string;
  name?: string; // For own_unsubmitted: name of subactivity
  code?: string; // For own_unsubmitted: code of subactivity
  count?: number; // For staff_unsubmitted: number of staff missing SKP
  scope?: 'bidang' | 'sub_bidang'; // For staff_unsubmitted: scope of supervision
}

export interface StaffTunggakan {
  employeeId: number;
  namaLengkap: string;
  subBidangId: number;
  subBidangNama: string;
  noHp: string | null;
  year: number;
  month: number;
  monthName: string;
  butirSkp: string;
  code?: string;
}

export const monthNamesId = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

export const normalizeStr = (s: string | null | undefined): string => {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
};

export const matchPendukungDoc = (p: any, targetBulan: number, targetButirSkp: string): boolean => {
  if (!p) return false;
  if (Number(p.bulan) !== Number(targetBulan)) return false;
  const pButir = normalizeStr(p.butirSkp || p.butir_skp);
  const targetButir = normalizeStr(targetButirSkp);
  return pButir === targetButir;
};
