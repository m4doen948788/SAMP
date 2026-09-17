const n=t=>{const a=["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];return t<12?a[t]:t<20?n(t-10)+" belas":t<100?n(Math.floor(t/10))+" puluh "+n(t%10):t<200?"seratus "+n(t-100):t<1e3?n(Math.floor(t/100))+" ratus "+n(t%100):t.toString()},Z=t=>{switch(t==null?void 0:t.toUpperCase()){case"F4":return{width:"215mm",height:"330mm"};case"LETTER":return{width:"215.9mm",height:"279.4mm"};default:return{width:"210mm",height:"297mm"}}},Q=(t="")=>{const a=(t||"").toLowerCase();return a.includes("kepala badan")||a.includes("direktur")||a==="kepala"?2:a.includes("sekretaris")||a.includes("kepala bidang")||a.includes("kepala bagian")||a.includes("wakil direktur")?3:a.includes("kepala sub bagian")||a.includes("kepala seksi")||a.includes("ketua tim")?4:5},z=t=>`
        #letter-content p, .document-content p { 
            margin-top: ${t.paragraph_spacing_before||0}pt;
            margin-bottom: ${t.paragraph_spacing_after||0}pt;
            text-indent: ${t.first_line_indent||0}mm;
        }
    `,F=t=>{if(!t)return"...";try{return new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}catch{return"..."}},V=(t,a)=>{if(!t||!a)return 0;const i=new Date(t),r=new Date(a);if(isNaN(i.getTime())||isNaN(r.getTime()))return 0;i.setHours(0,0,0,0),r.setHours(0,0,0,0);const e=Math.abs(r.getTime()-i.getTime());return Math.ceil(e/(1e3*60*60*24))+1},tt=(t,a)=>{var p,o,g,b,u,c,x,m,h,k,v,f,_,y,$,w,A,N,T,j,C,D,E,P,I,B,L,M,H,S,K,U,G,R,J,Y;const i=V((p=t.isi)==null?void 0:p.tgl_mulai,(o=t.isi)==null?void 0:o.tgl_selesai),r=n(i),e=F((g=t.isi)==null?void 0:g.tgl_mulai),l=F((b=t.isi)==null?void 0:b.tgl_selesai),d=Q(a==null?void 0:a.jabatan_nama),s=d>=5?"25px":d===4?"50px":"85px",W=`
        ${`
        <div style="margin-bottom: 15px;">
            <p style="margin: 0;">Yth.</p>
            <p style="margin: 0; padding-left: 0;">${((u=t.tujuan)==null?void 0:u.jabatan)||"Kepala Badan..."}</p>
            <p style="margin: 0;">Di</p>
            <p style="margin: 0; padding-left: 20px;">${((c=t.tujuan)==null?void 0:c.lokasi)||"Tempat"}</p>
        </div>
    `}
        <p style="margin-bottom: 10px;">${t.pembuka||"Saya yang bertandatangan di bawah ini:"}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; line-height: 1.2;">
            <tr>
                <td style="width: 28%;">Nama</td>
                <td style="width: 2%;">:</td>
                <td style="font-weight: bold;">${(a==null?void 0:a.nama_lengkap)||"..."}</td>
            </tr>
            <tr>
                <td>NIP.</td>
                <td>:</td>
                <td>${(a==null?void 0:a.nip)||"..."}</td>
            </tr>
            <tr>
                <td>Pangkat/Gol. Ruang</td>
                <td>:</td>
                <td>${(a==null?void 0:a.pangkat_golongan_nama)||"..."}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>${(a==null?void 0:a.jabatan_nama)||"..."}</td>
            </tr>
            <tr>
                <td>Unit Organisasi</td>
                <td>:</td>
                <td>${(a==null?void 0:a.instansi_nama)||"..."}</td>
            </tr>
        </table>

        <p>
            ${((x=t.isi)==null?void 0:x.kalimat_pengantar)||"Dengan ini mengajukan permintaan Cuti Tahunan untuk Tahun "+(((m=t.isi)==null?void 0:m.tahun)||new Date().getFullYear())} 
            ${i>0?`selama ${i} (${r}) hari kerja, `:""}
            terhitung mulai tanggal ${e} sampai dengan ${l} 
            dikarenakan ${((h=t.isi)==null?void 0:h.alasan)||"..."}.
        </p>

        <p style="margin-top: 10px;">
            Selama menjalankan cuti Alamat saya adalah di ${t.alamat_cuti||"..."}.
        </p>

        <p style="margin-top: 10px; margin-bottom: 5px;">
            ${t.penutup||"Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya."}
        </p>
    `,O=`
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 8pt; margin-top: 5px;">
            <tr>
                <td style="width: 50%; border: 1px solid black; padding: 0; vertical-align: top;">
                    <div style="font-weight: bold; text-align: center; padding: 4px; border-bottom: 1px solid black;">
                        CATATAN PEJABAT KEPEGAWAIAN
                    </div>
                    <div style="padding: 4px;">
                        Cuti yang telah diambil dalam tahun yang bersangkutan :
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 5%; border: 1px solid black; border-left: none; padding: 2px 4px;">1.</td>
                            <td style="width: 55%; border: 1px solid black; padding: 2px 4px;">Cuti Tahunan</td>
                            <td style="width: 40%; border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">2.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Besar</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">3.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Sakit</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">4.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Bersalin</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">5.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Karena Alasan Penting</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px 4px;">6.</td>
                            <td style="border: none; padding: 2px 4px;">Keterangan lain-lain</td>
                            <td style="border: none; padding: 2px 4px;">: ........</td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; border: 1px solid black; padding: 0; vertical-align: top;">
                    ${d>=5?`
                    <div style="border-bottom: 1px solid black; padding: 4px;">
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.95em;">CATATAN/PERTIMBANGAN ATASAN LANGSUNG:</div>
                        <p style="margin: 0; line-height: 1;">...........................................................................................</p>
                        <div style="text-align: center; margin-top: 4px;">
                            <p style="margin: 0;">${((v=(k=t.approvers)==null?void 0:k.ketua_tim)==null?void 0:v.jabatan_nama)||"Ketua Tim / Atasan Langsung"}</p>
                            <div style="height: ${s}; display: flex; align-items: center; justify-content: center;" data-signature-role="ketua_tim" data-approver-id="${((_=(f=t.approvers)==null?void 0:f.ketua_tim)==null?void 0:_.user_id)||""}"></div>
                            <p style="margin: 0; font-weight: bold;"><u>${(($=(y=t.approvers)==null?void 0:y.ketua_tim)==null?void 0:$.nama_lengkap)||"......................................................."}</u></p>
                            <p style="margin: 0;">NIP. ${((A=(w=t.approvers)==null?void 0:w.ketua_tim)==null?void 0:A.nip)||"..........................................."}</p>
                        </div>
                    </div>
                    `:""}
                    
                    ${d>=4?`
                    <div style="border-bottom: 1px solid black; padding: 4px; text-align: center;">
                        <p style="margin: 0;">Mengetahui/Menyetujui,</p>
                        <p style="margin: 0;">${((T=(N=t.approvers)==null?void 0:N.kepala_bidang)==null?void 0:T.jabatan_nama)||"Kepala Bidang/Bagian"}</p>
                        <div style="height: ${s}; display: flex; align-items: center; justify-content: center;" data-signature-role="kabid" data-approver-id="${((C=(j=t.approvers)==null?void 0:j.kepala_bidang)==null?void 0:C.user_id)||""}"></div>
                        <p style="margin: 0; font-weight: bold;"><u>${((E=(D=t.approvers)==null?void 0:D.kepala_bidang)==null?void 0:E.nama_lengkap)||"......................................................."}</u></p>
                        <p style="margin: 0;">NIP. ${((I=(P=t.approvers)==null?void 0:P.kepala_bidang)==null?void 0:I.nip)||"..........................................."}</p>
                    </div>
                    `:""}

                    <div style="padding: 4px;">
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.95em;">KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI:</div>
                        <p style="margin: 0; line-height: 1;">...........................................................................................</p>
                        <div style="text-align: center; margin-top: 4px;">
                            <p style="margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span>${(L=(B=t.approvers)==null?void 0:B.kepala_badan)!=null&&L.jabatan_nama?t.approvers.kepala_badan.jabatan_nama+",":"Kepala Badan/Instansi,"}</span>
                                <span style="display: inline-flex; align-items: center;" data-signature-role="sekretaris" data-approver-id="${((H=(M=t.approvers)==null?void 0:M.sekretaris)==null?void 0:H.user_id)||""}"></span>
                            </p>
                            <div style="height: ${s}; display: flex; align-items: center; justify-content: center;" data-signature-role="kaban" data-approver-id="${((K=(S=t.approvers)==null?void 0:S.kepala_badan)==null?void 0:K.user_id)||""}"></div>
                            <p style="margin: 0; font-weight: bold;"><u>${((G=(U=t.approvers)==null?void 0:U.kepala_badan)==null?void 0:G.nama_lengkap)||"......................................................."}</u></p>
                            <p style="margin: 0;">NIP. ${((J=(R=t.approvers)==null?void 0:R.kepala_badan)==null?void 0:J.nip)||"..........................................."}</p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    `,q=`
        <div style="width: 100%; margin-top: 5px; margin-bottom: 5px;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%;"></td>
                    <td style="width: 50%; text-align: center;">
                        <div style="display: inline-block; text-align: left;">
                            Hormat saya,<br/>
                            <div style="height: 40px; display: flex; align-items: center; justify-content: center;" data-signature-role="pengusul" data-approver-id="${(a==null?void 0:a.user_id)||(a==null?void 0:a.id)||""}"></div>
                            <u><strong>${((Y=a==null?void 0:a.nama_lengkap)==null?void 0:Y.toUpperCase())||"NAMA PENGUSUL"}</strong></u><br/>
                            ${a!=null&&a.nip?"NIP. "+a.nip:""}
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    `;return W+q+O};export{z as a,Q as b,V as c,tt as d,Z as g};
