import { api } from '../api';
import { SkpAlert, monthNamesId, normalizeStr, matchPendukungDoc } from './skpCommon';

export const getSkpAlertsForUser = async (user: any): Promise<SkpAlert[]> => {
  if (!user || !user.bidang_id) return [];

  const cacheKey = `skp-alerts-user-${user.id || user.profil_pegawai_id || 0}`;
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(`${cacheKey}-time`);
    const now = Date.now();
    if (cachedData && cachedTime && (now - Number(cachedTime) < 120000)) { // 2 minutes cache
      return JSON.parse(cachedData);
    }
  } catch (e) {}

  try {
    const currentPegawaiId = Number(user.profil_pegawai_id || user.pegawai_id || user.id || 0);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentDay = new Date().getDate();
    const bidangId = Number(user.bidang_id);

    // Determine the years to check (2026 up to currentYear)
    const yearsToCheck: number[] = [];
    for (let y = 2026; y <= currentYear; y++) {
      yearsToCheck.push(y);
    }

    const instansiId = Number(user.instansi_id || 0);

    // Fetch non-year-bound data once
    const [mappingRes, customAssignRes, pegawaiRes] = await Promise.all([
      api.mappingKegiatanInstansi.getAll(instansiId ? { instansi_id: instansiId } : undefined),
      api.skp.getCustomAssignments(bidangId),
      api.profilPegawai.getAll()
    ]);

    if (!mappingRes.success || !customAssignRes.success || !pegawaiRes.success) {
      throw new Error('Required common SKP helper API requests failed');
    }

    // Fetch records, custom items, and monthly configs for each year
    const recordsMap: Record<number, any> = {};
    const customItemsMap: Record<number, any> = {};
    const configsMap: Record<number, any[]> = {};

    for (const year of yearsToCheck) {
      const [recordsRes, customItemsRes, configsRes] = await Promise.all([
        api.skp.getPegawaiRecords(year, bidangId),
        api.skp.getCustomItems(year, bidangId),
        api.skp.getBidangSkpMonthlyConfigs(bidangId, undefined, year)
      ]);
      if (!recordsRes.success || !customItemsRes.success) {
        throw new Error(`SKP helper API requests failed for year ${year}`);
      }
      recordsMap[year] = recordsRes.data;
      customItemsMap[year] = customItemsRes.data;
      configsMap[year] = (configsRes && configsRes.success && Array.isArray(configsRes.data)) ? configsRes.data : [];
    }

    const dbPegawaiList = (pegawaiRes.data || []).filter((p: any) =>
      p.jenis_pegawai_nama === 'PNS' || p.jenis_pegawai_nama === 'PPPK Penuh Waktu'
    );

    const loggedInUser = dbPegawaiList.find((p: any) => Number(p.id) === currentPegawaiId);
    if (!loggedInUser) return [];

    const mappingSubKegiatans = mappingRes.data?.sub_kegiatan || [];
    const customAssignments = customAssignRes.data || [];

    const isMonthActiveForSubKeg = (subKegName: string, monthVal: number, yearVal: number): boolean => {
      const configs = configsMap[yearVal] || [];
      const normName = normalizeStr(subKegName);

      const matchedSubKeg = mappingSubKegiatans.find((sk: any) => 
        normalizeStr(sk.nama_sub_kegiatan) === normName || 
        normalizeStr(`${sk.kode_sub_kegiatan || ''} ${sk.nama_sub_kegiatan || ''}`) === normName ||
        (sk.kode_sub_kegiatan && normName.includes(sk.kode_sub_kegiatan))
      );

      const found = configs.find((c: any) => {
        if (Number(c.bulan) !== Number(monthVal)) return false;
        if (matchedSubKeg && Number(c.sub_kegiatan_id) === Number(matchedSubKeg.sub_kegiatan_id)) return true;
        if (c.butir_skp && normalizeStr(c.butir_skp) === normName) return true;
        if (c.sub_kegiatan_id) {
          const sk = mappingSubKegiatans.find((s: any) => Number(s.sub_kegiatan_id) === Number(c.sub_kegiatan_id));
          if (sk && (normalizeStr(sk.nama_sub_kegiatan) === normName || (sk.kode_sub_kegiatan && normName.includes(sk.kode_sub_kegiatan)))) {
            return true;
          }
        }
        return false;
      });

      if (found) {
        return found.is_active === 1 || found.is_active === true || found.is_active === '1';
      }
      return true; // Default active if not configured
    };

    // Helper to get assigned sub-kegiatans for a specific employee
    const getAssignedSubKegsForEmployee = (
      emp: any,
      uniqueSubKegs: { name: string; code?: string }[]
    ) => {
      const assigned: { name: string; code?: string }[] = [];
      const empPegawaiId = Number(emp.id);

      uniqueSubKegs.forEach((item) => {
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
        const jab = (emp.jabatan_nama || emp.jabatan || '').toLowerCase();
        const isEmpKabid = jab.includes('kepala bidang') || jab.includes('kabid');

        if (isEmpKabid) {
          isAssigned = true;
        } else if (customAssign) {
          if (customAssign.target_scope === 'individu') {
            const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids)
              ? customAssign.assigned_pegawai_ids.map(Number)
              : [];
            isAssigned = assignedIds.includes(empPegawaiId);
          } else if (customAssign.target_scope === 'tim' && customAssign.target_id) {
            const assignedIds = Array.isArray(customAssign.assigned_pegawai_ids) && customAssign.assigned_pegawai_ids.length > 0
              ? customAssign.assigned_pegawai_ids.map(Number)
              : null;
            if (assignedIds !== null) {
              isAssigned = assignedIds.includes(empPegawaiId);
            } else {
              const pSubBidangId = Number(emp.sub_bidang_id);
              const pSubBidangIds = Array.isArray(emp.sub_bidang_ids)
                ? emp.sub_bidang_ids.map(Number)
                : (pSubBidangId ? [pSubBidangId] : []);
              const isTeamMember = pSubBidangIds.includes(Number(customAssign.target_id));
              isAssigned = isTeamMember;
            }
          } else if (customAssign.target_scope === 'peran') {
            const isLead = [8, 5, 9, 6, 7, 10, 11, 12, 13, 14, 15, 16].includes(Number(emp.jabatan_id)) ||
                   (emp.jabatan_nama && /kepala|kabid|katim|sekretaris|direktur/i.test(emp.jabatan_nama));
            isAssigned = isLead;
          }
        } else if (targetSubBidangId) {
          const pSubBidangId = Number(emp.sub_bidang_id);
          const pSubBidangIds = Array.isArray(emp.sub_bidang_ids)
            ? emp.sub_bidang_ids.map(Number)
            : (pSubBidangId ? [pSubBidangId] : []);
          isAssigned = pSubBidangIds.includes(targetSubBidangId);
        }

        if (isAssigned) {
          assigned.push(item);
        }
      });

      return assigned;
    };

    const alerts: SkpAlert[] = [];

    // Check role details for supervision scope
    const jab = (loggedInUser.jabatan_nama || loggedInUser.jabatan || '').toLowerCase();
    const isKabid = jab.includes('kepala bidang') || jab.includes('kabid');
    const isKatim = jab.includes('ketua tim') || jab.includes('katim') || jab.includes('kasubag') || jab.includes('kasi');

    for (const year of yearsToCheck) {
      const records = recordsMap[year];
      const customItems = customItemsMap[year] || [];
      const dbPendukung = Array.isArray(records) ? [] : (records?.pendukung || []);

      // Build unique sub-kegiatans list for this year in the bidang
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

      // Determine months to check for this year
      const startMonth = year === 2026 ? 7 : 1;
      const endMonth = year === currentYear ? currentMonth : 12;

      for (let month = startMonth; month <= endMonth; month++) {
        // Skip current month of current year if currentDay < 22
        if (year === currentYear && month === currentMonth && currentDay < 22) {
          continue;
        }

        // 1. Check own unsubmitted SKPs
        const ownAssigned = getAssignedSubKegsForEmployee(loggedInUser, uniqueSubKegs);
        const ownDocs = dbPendukung.filter((doc: any) => Number(doc.pegawaiId) === currentPegawaiId);

        ownAssigned.forEach((item) => {
          // SKIP if month is inactive!
          if (!isMonthActiveForSubKeg(item.name, month, year)) return;

          const hasDoc = ownDocs.some((doc: any) =>
            matchPendukungDoc(doc, month, item.name) && doc.docName !== null && doc.docName !== undefined
          );
          if (!hasDoc) {
            alerts.push({
              type: 'own_unsubmitted',
              year,
              month,
              monthName: monthNamesId[month - 1],
              name: item.name,
              code: item.code
            });
          }
        });

        // 2. Check staff unsubmitted SKPs (if user is supervisor)
        if (isKabid || isKatim) {
          const staffList = dbPegawaiList.filter((emp: any) => {
            const isSelf = Number(emp.id) === currentPegawaiId;
            if (isSelf) return false;
            
            if (isKabid) {
              return Number(emp.bidang_id) === bidangId;
            } else {
              // Katim: share sub_bidang_id
              const pSubBidangId = Number(loggedInUser.sub_bidang_id);
              const pSubBidangIds = Array.isArray(loggedInUser.sub_bidang_ids)
                ? loggedInUser.sub_bidang_ids.map(Number)
                : (pSubBidangId ? [pSubBidangId] : []);
              
              const empSubBidangId = Number(emp.sub_bidang_id);
              const empSubBidangIds = Array.isArray(emp.sub_bidang_ids)
                ? emp.sub_bidang_ids.map(Number)
                : (empSubBidangId ? [empSubBidangId] : []);

              return pSubBidangIds.some((id) => empSubBidangIds.includes(id));
            }
          });

          let unsubmittedStaffCount = 0;

          staffList.forEach((emp: any) => {
            const empAssigned = getAssignedSubKegsForEmployee(emp, uniqueSubKegs);
            if (empAssigned.length === 0) return;

            const empDocs = dbPendukung.filter((doc: any) => Number(doc.pegawaiId) === Number(emp.id));
            const hasUnsubmitted = empAssigned.some((item) => {
              // SKIP if month is inactive!
              if (!isMonthActiveForSubKeg(item.name, month, year)) return false;

              const hasDoc = empDocs.some((doc: any) =>
                matchPendukungDoc(doc, month, item.name) && doc.docName !== null && doc.docName !== undefined
              );
              return !hasDoc;
            });

            if (hasUnsubmitted) {
              unsubmittedStaffCount++;
            }
          });

          if (unsubmittedStaffCount > 0) {
            alerts.push({
              type: 'staff_unsubmitted',
              year,
              month,
              monthName: monthNamesId[month - 1],
              count: unsubmittedStaffCount,
              scope: isKabid ? 'bidang' : 'sub_bidang'
            });
          }
        }
      }
    }

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(alerts));
      sessionStorage.setItem(`${cacheKey}-time`, String(Date.now()));
    } catch (e) {}

    return alerts;
  } catch (e) {
    console.error('Error fetching SKP alerts for user:', e);
    return [];
  }
};

export const getUnsubmittedSkpsForUser = async (user: any): Promise<{ name: string; code?: string }[]> => {
  try {
    const alerts = await getSkpAlertsForUser(user);
    const own = alerts.filter(a => a.type === 'own_unsubmitted');
    return own.map(o => ({ name: o.name || '', code: o.code }));
  } catch {
    return [];
  }
};
