import { api } from './api';

export const getUnsubmittedSkpsForUser = async (user: any): Promise<{ name: string; code?: string }[]> => {
  if (!user || !user.bidang_id) return [];
  
  try {
    const currentPegawaiId = Number(user.profil_pegawai_id || user.pegawai_id || user.id || 0);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const bidangId = Number(user.bidang_id);
    
    const [recordsRes, mappingRes, customAssignRes, pegawaiRes, customItemsRes] = await Promise.all([
      api.skp.getPegawaiRecords(currentYear, bidangId),
      api.mappingKegiatanInstansi.getAll(),
      api.skp.getCustomAssignments(bidangId),
      api.profilPegawai.getAll(),
      api.skp.getCustomItems(currentYear, bidangId)
    ]);
    
    if (!recordsRes.success || !mappingRes.success || !customAssignRes.success || !pegawaiRes.success) {
      throw new Error('One of the required SKP helper API requests failed');
    }
    
    const dbPendukung = Array.isArray(recordsRes.data) ? [] : (recordsRes.data.pendukung || []);
    
    const dbPegawaiList = (pegawaiRes.data || []).filter((p: any) =>
      p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
    );
    
    const loggedInUser = dbPegawaiList.find((p: any) => Number(p.id) === currentPegawaiId);
    if (!loggedInUser) return [];
    
    const mappingSubKegiatans = mappingRes.data?.sub_kegiatan || [];
    const customAssignments = customAssignRes.data || [];
    const customItems = customItemsRes.success ? (customItemsRes.data || []) : [];
    
    const divisionPegawaiIds = dbPegawaiList
      .filter((p: any) => Number(p.bidang_id) === bidangId)
      .map((p: any) => p.id);

    const dbSubKegs = mappingSubKegiatans.filter((sk: any) => divisionPegawaiIds.includes(sk.penanggung_jawab_id));
    
    const seen = new Set<string>();
    const uniqueSubKegs: { name: string; code?: string }[] = [];
    
    dbSubKegs.forEach((sk: any) => {
      if (!seen.has(sk.nama_sub_kegiatan)) {
        seen.add(sk.nama_sub_kegiatan);
        uniqueSubKegs.push({
          name: sk.nama_sub_kegiatan,
          code: sk.kode_sub_kegiatan
        });
      }
    });
    
    customItems.forEach((ci: any) => {
      if (!seen.has(ci.butir_skp)) {
        seen.add(ci.butir_skp);
        uniqueSubKegs.push({
          name: ci.butir_skp,
          code: ci.kode_sub_kegiatan || undefined
        });
      }
    });
    
    const normalizeStr = (s: string | null | undefined): string => {
      return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    };
    
    const matchPendukungDoc = (p: any, targetBulan: number, targetButirSkp: string): boolean => {
      if (!p) return false;
      if (Number(p.bulan) !== Number(targetBulan)) return false;
      const pButir = normalizeStr(p.butirSkp || p.butir_skp);
      const targetButir = normalizeStr(targetButirSkp);
      return pButir === targetButir;
    };
    
    const unsubmittedItems: { name: string; code?: string }[] = [];
    
    uniqueSubKegs.forEach((item: any) => {
      const butirSkp = item.name;
      const normButirSkp = normalizeStr(butirSkp);
      const customAssign = customAssignments.find(
        (ca: any) => normalizeStr(ca.butir_skp) === normButirSkp
      );

      let targetSubBidangId: number | null = null;
      if (!customAssign && mappingSubKegiatans.length > 0) {
        const match = mappingSubKegiatans.find((sk: any) => normalizeStr(sk.nama_sub_kegiatan) === normButirSkp);
        if (match && match.penanggung_jawab_id) {
          const pj = dbPegawaiList.find((p: any) => Number(p.id) === Number(match.penanggung_jawab_id));
          if (pj && pj.sub_bidang_id) {
            targetSubBidangId = Number(pj.sub_bidang_id);
          }
        }
      }

      let isAssigned = false;
      const p = loggedInUser;
      const jab = (p.jabatan_nama || (p as any).jabatan || '').toLowerCase();
      const isKabid = jab.includes('kepala bidang') || jab.includes('kabid');
      
      if (isKabid) {
        isAssigned = true;
      } else if (customAssign) {
        if (customAssign.target_scope === 'individu') {
          const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids)
            ? customAssign.assigned_pegawai_ids.map(Number)
            : [];
          isAssigned = assignedIds.includes(currentPegawaiId);
        } else if (customAssign.target_scope === 'tim' && customAssign.target_id) {
          const extraIds = Array.isArray(customAssign.assigned_pegawai_ids)
            ? customAssign.assigned_pegawai_ids.map(Number)
            : [];
          const isExtraMember = extraIds.includes(currentPegawaiId);
          const pSubBidangId = Number(p.sub_bidang_id);
          const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
            ? (p as any).sub_bidang_ids.map(Number)
            : (pSubBidangId ? [pSubBidangId] : []);
          const isTeamMember = pSubBidangIds.includes(Number(customAssign.target_id));
          isAssigned = isTeamMember || isExtraMember;
        } else if (customAssign.target_scope === 'peran') {
          const isLead = [8, 5, 9, 6, 7, 10, 11, 12, 13, 14, 15, 16].includes(Number(p.jabatan_id)) ||
                 (p.jabatan_nama && /kepala|kabid|katim|sekretaris|direktur/i.test(p.jabatan_nama));
          isAssigned = isLead;
        }
      } else if (targetSubBidangId) {
        const pSubBidangId = Number(p.sub_bidang_id);
        const pSubBidangIds = Array.isArray((p as any).sub_bidang_ids)
          ? (p as any).sub_bidang_ids.map(Number)
          : (pSubBidangId ? [pSubBidangId] : []);
        isAssigned = pSubBidangIds.includes(targetSubBidangId);
      }

      if (isAssigned) {
        const empDocs = dbPendukung.filter((doc: any) => Number(doc.pegawaiId) === currentPegawaiId);
        const hasDoc = empDocs.some((doc: any) =>
          matchPendukungDoc(doc, currentMonth, butirSkp) && doc.docName !== null && doc.docName !== undefined
        );
        if (!hasDoc) {
          unsubmittedItems.push(item);
        }
      }
    });
    
    return unsubmittedItems;
  } catch (e) {
    console.error('Error fetching unsubmitted SKPs:', e);
    return [];
  }
};
