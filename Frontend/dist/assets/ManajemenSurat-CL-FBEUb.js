import{r as d,h as ga,c as _,j as e,aN as fa,d as nt,U as Le,a1 as K,aD as ba,aE as va,D as wa,a as q,S as ya,aH as lt,aF as ja,e as Ue,av as ka,_ as _a,C as Na,ad as me,a4 as $a,a5 as ot,aB as Sa,au as dt,o as ct,p as Re,aW as Aa,P as pt,aX as Da,aK as za,aL as Ca,X as Oe,aC as Ea,z as Ia,aR as pe,b as Pa}from"./index-DFAVT2zF.js";import{r as ut}from"./index-hUWNUg2k.js";import{S as mt}from"./SearchableSelect-BtzrmMD8.js";import{D as Ta}from"./DocumentViewerModal-C-c9qvmd.js";import{S as La}from"./SuratRegistrationModal-Bkcp_C9m.js";import{g as Z,a as Te}from"./letterComposers-BaBvTYrY.js";import"./_commonjs-dynamic-modules-DuLLe_y7.js";let Ra={data:""},Ma=s=>{if(typeof window=="object"){let a=(s?s.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return a.nonce=window.__nonce__,a.parentNode||(s||document.head).appendChild(a),a.firstChild}return s||Ra},Ba=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Fa=/\/\*[^]*?\*\/|  +/g,xt=/\n+/g,H=(s,a)=>{let o="",m="",h="";for(let x in s){let p=s[x];x[0]=="@"?x[1]=="i"?o=x+" "+p+";":m+=x[1]=="f"?H(p,x):x+"{"+H(p,x[1]=="k"?"":a)+"}":typeof p=="object"?m+=H(p,a?a.replace(/([^,])+/g,g=>x.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,b=>/&/.test(b)?b.replace(/&/g,g):g?g+" "+b:b)):x):p!=null&&(x=/^--/.test(x)?x:x.replace(/[A-Z]/g,"-$&").toLowerCase(),h+=H.p?H.p(x,p):x+":"+p+";")}return o+(a&&h?a+"{"+h+"}":h)+m},B={},ht=s=>{if(typeof s=="object"){let a="";for(let o in s)a+=o+ht(s[o]);return a}return s},Ua=(s,a,o,m,h)=>{let x=ht(s),p=B[x]||(B[x]=(b=>{let f=0,$=11;for(;f<b.length;)$=101*$+b.charCodeAt(f++)>>>0;return"go"+$})(x));if(!B[p]){let b=x!==s?s:(f=>{let $,A,j=[{}];for(;$=Ba.exec(f.replace(Fa,""));)$[4]?j.shift():$[3]?(A=$[3].replace(xt," ").trim(),j.unshift(j[0][A]=j[0][A]||{})):j[0][$[1]]=$[2].replace(xt," ").trim();return j[0]})(s);B[p]=H(h?{["@keyframes "+p]:b}:b,o?"":"."+p)}let g=o&&B.g?B.g:null;return o&&(B.g=B[p]),((b,f,$,A)=>{A?f.data=f.data.replace(A,b):f.data.indexOf(b)===-1&&(f.data=$?b+f.data:f.data+b)})(B[p],a,m,g),p},Oa=(s,a,o)=>s.reduce((m,h,x)=>{let p=a[x];if(p&&p.call){let g=p(o),b=g&&g.props&&g.props.className||/^go/.test(g)&&g;p=b?"."+b:g&&typeof g=="object"?g.props?"":H(g,""):g===!1?"":g}return m+h+(p??"")},"");function xe(s){let a=this||{},o=s.call?s(a.p):s;return Ua(o.unshift?o.raw?Oa(o,[].slice.call(arguments,1),a.p):o.reduce((m,h)=>Object.assign(m,h&&h.call?h(a.p):h),{}):o,Ma(a.target),a.g,a.o,a.k)}let gt,Me,Be;xe.bind({g:1});let F=xe.bind({k:1});function Ha(s,a,o,m){H.p=a,gt=s,Me=o,Be=m}function G(s,a){let o=this||{};return function(){let m=arguments;function h(x,p){let g=Object.assign({},x),b=g.className||h.className;o.p=Object.assign({theme:Me&&Me()},g),o.o=/ *go\d+/.test(b),g.className=xe.apply(o,m)+(b?" "+b:"");let f=s;return s[0]&&(f=g.as||s,delete g.as),Be&&f[0]&&Be(g),gt(f,g)}return h}}var Ga=s=>typeof s=="function",Fe=(s,a)=>Ga(s)?s(a):s,Va=(()=>{let s=0;return()=>(++s).toString()})(),Wa=(()=>{let s;return()=>{if(s===void 0&&typeof window<"u"){let a=matchMedia("(prefers-reduced-motion: reduce)");s=!a||a.matches}return s}})(),Ka=20,ft="default",bt=(s,a)=>{let{toastLimit:o}=s.settings;switch(a.type){case 0:return{...s,toasts:[a.toast,...s.toasts].slice(0,o)};case 1:return{...s,toasts:s.toasts.map(p=>p.id===a.toast.id?{...p,...a.toast}:p)};case 2:let{toast:m}=a;return bt(s,{type:s.toasts.find(p=>p.id===m.id)?1:0,toast:m});case 3:let{toastId:h}=a;return{...s,toasts:s.toasts.map(p=>p.id===h||h===void 0?{...p,dismissed:!0,visible:!1}:p)};case 4:return a.toastId===void 0?{...s,toasts:[]}:{...s,toasts:s.toasts.filter(p=>p.id!==a.toastId)};case 5:return{...s,pausedAt:a.time};case 6:let x=a.time-(s.pausedAt||0);return{...s,pausedAt:void 0,toasts:s.toasts.map(p=>({...p,pauseDuration:p.pauseDuration+x}))}}},qa=[],Ya={toasts:[],pausedAt:void 0,settings:{toastLimit:Ka}},X={},vt=(s,a=ft)=>{X[a]=bt(X[a]||Ya,s),qa.forEach(([o,m])=>{o===a&&m(X[a])})},wt=s=>Object.keys(X).forEach(a=>vt(s,a)),Ja=s=>Object.keys(X).find(a=>X[a].toasts.some(o=>o.id===s)),He=(s=ft)=>a=>{vt(a,s)},Qa=(s,a="blank",o)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:a,ariaProps:{role:"status","aria-live":"polite"},message:s,pauseDuration:0,...o,id:(o==null?void 0:o.id)||Va()}),re=s=>(a,o)=>{let m=Qa(a,s,o);return He(m.toasterId||Ja(m.id))({type:2,toast:m}),m.id},u=(s,a)=>re("blank")(s,a);u.error=re("error");u.success=re("success");u.loading=re("loading");u.custom=re("custom");u.dismiss=(s,a)=>{let o={type:3,toastId:s};a?He(a)(o):wt(o)};u.dismissAll=s=>u.dismiss(void 0,s);u.remove=(s,a)=>{let o={type:4,toastId:s};a?He(a)(o):wt(o)};u.removeAll=s=>u.remove(void 0,s);u.promise=(s,a,o)=>{let m=u.loading(a.loading,{...o,...o==null?void 0:o.loading});return typeof s=="function"&&(s=s()),s.then(h=>{let x=a.success?Fe(a.success,h):void 0;return x?u.success(x,{id:m,...o,...o==null?void 0:o.success}):u.dismiss(m),h}).catch(h=>{let x=a.error?Fe(a.error,h):void 0;x?u.error(x,{id:m,...o,...o==null?void 0:o.error}):u.dismiss(m)}),s};var Za=F`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Xa=F`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,es=F`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,ts=G("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${s=>s.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Za} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Xa} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${s=>s.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${es} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,as=F`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ss=G("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${s=>s.secondary||"#e0e0e0"};
  border-right-color: ${s=>s.primary||"#616161"};
  animation: ${as} 1s linear infinite;
`,is=F`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,rs=F`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ns=G("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${s=>s.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${is} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${rs} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${s=>s.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,ls=G("div")`
  position: absolute;
`,os=G("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ds=F`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,cs=G("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ds} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ps=({toast:s})=>{let{icon:a,type:o,iconTheme:m}=s;return a!==void 0?typeof a=="string"?d.createElement(cs,null,a):a:o==="blank"?null:d.createElement(os,null,d.createElement(ss,{...m}),o!=="loading"&&d.createElement(ls,null,o==="error"?d.createElement(ts,{...m}):d.createElement(ns,{...m})))},ms=s=>`
0% {transform: translate3d(0,${s*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,xs=s=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${s*-150}%,-1px) scale(.6); opacity:0;}
`,us="0%{opacity:0;} 100%{opacity:1;}",hs="0%{opacity:1;} 100%{opacity:0;}",gs=G("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,fs=G("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,bs=(s,a)=>{let o=s.includes("top")?1:-1,[m,h]=Wa()?[us,hs]:[ms(o),xs(o)];return{animation:a?`${F(m)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${F(h)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};d.memo(({toast:s,position:a,style:o,children:m})=>{let h=s.height?bs(s.position||a||"top-center",s.visible):{opacity:0},x=d.createElement(ps,{toast:s}),p=d.createElement(fs,{...s.ariaProps},Fe(s.message,s));return d.createElement(gs,{className:s.className,style:{...h,...o,...s.style}},typeof m=="function"?m({icon:x,message:p}):d.createElement(d.Fragment,null,x,p))});Ha(d.createElement);xe`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;const vs=({isOpen:s,onClose:a,onRestore:o})=>{const[m,h]=d.useState([]),[x,p]=d.useState(!1),[g,b]=d.useState(null),f=async()=>{p(!0),b(null);try{const j=await _.dokumen.getTrash("surat");j.success?h(j.data):b(j.message)}catch(j){b(j.message)}finally{p(!1)}};d.useEffect(()=>{s&&f()},[s]);const $=async j=>{try{const D=await _.dokumen.restore(j);D.success?(f(),o()):u.error(D.message)}catch(D){u.error(D.message)}},A=async j=>{if(window.confirm("Hapus dokumen ini secara permanen? Aksi ini tidak dapat dibatalkan."))try{const D=await _.dokumen.permanentDelete(j);D.success?(f(),u.success("Dokumen berhasil dihapus permanen")):u.error(D.message)}catch(D){u.error(D.message)}};return s?ut.createPortal(e.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center p-4",children:[e.jsx("div",{className:"absolute inset-0 bg-slate-900/60 backdrop-blur-sm",onClick:a}),e.jsxs("div",{className:"relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",children:[e.jsxs("div",{className:"p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm",children:e.jsx(q,{size:24})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-black text-slate-800 tracking-tight",children:"Tempat Sampah Surat"}),e.jsx("p",{className:"text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5",children:"Dokumen terhapus (Kategori: Surat)"})]})]}),e.jsx("button",{onClick:a,className:"w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95",children:e.jsx(Oe,{size:20})})]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent",children:x?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 gap-4",children:[e.jsx(Ue,{className:"animate-spin text-rose-500",size:40}),e.jsx("p",{className:"text-sm font-black text-slate-400 uppercase tracking-widest",children:"Memuat Data Sampah..."})]}):g?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 text-rose-500 bg-rose-50 rounded-3xl border border-rose-100 italic gap-2",children:[e.jsx(Re,{size:32}),e.jsx("p",{className:"font-bold",children:g})]}):m.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 text-slate-300 gap-4",children:[e.jsx("div",{className:"w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner",children:e.jsx(q,{size:40})}),e.jsx("p",{className:"text-sm font-black uppercase tracking-widest text-slate-400",children:"Tempat sampah kosong"})]}):e.jsx("div",{className:"grid gap-3",children:m.map(j=>e.jsxs("div",{className:"flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group",children:[e.jsx("div",{className:"w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-indigo-500 transition-colors",children:e.jsx(K,{size:20})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("h4",{className:"font-bold text-slate-700 truncate",children:j.nama_file}),e.jsxs("div",{className:"flex items-center gap-3 mt-1",children:[e.jsx("span",{className:"text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tight",children:j.jenis_dokumen_nama}),e.jsxs("span",{className:"text-[10px] font-bold text-slate-400 flex items-center gap-1",children:[e.jsx(me,{size:10}),"Dihapus: ",new Date(j.deleted_at).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})]})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:()=>$(j.id),className:"px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-xs border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm",children:"Pulihkan"}),e.jsx("button",{onClick:()=>A(j.id),className:"p-2 bg-white text-rose-500 rounded-xl font-bold text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm",children:e.jsx(q,{size:16})})]})]},j.id))})})]})]}),document.body):null},ws=({isOpen:s,onClose:a,onConfirm:o,file:m,fileName:h,setFileName:x,isSubmitting:p})=>{if(!s||!m)return null;const g=m.name.split(".").pop();return e.jsx("div",{className:"fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300",children:e.jsxs("div",{className:"bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300",children:[e.jsxs("div",{className:"px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-emerald-50 text-emerald-600 rounded-xl",children:e.jsx(Le,{size:20})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-black text-slate-800 tracking-tight",children:"Unggah Dokumen Final"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1",children:"Konfirmasi nama file sistem"})]})]}),e.jsx("button",{onClick:a,className:"p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all",children:e.jsx(Oe,{size:20})})]}),e.jsxs("div",{className:"p-6 space-y-4",children:[e.jsxs("div",{className:"p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 bg-white rounded-2xl shadow-sm text-slate-400",children:e.jsx(K,{size:24})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-black text-slate-700 truncate",children:m.name}),e.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest",children:"File Terpilih"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1",children:"Nama File di Sistem"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"text",className:"w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-black text-slate-700 text-sm",value:h,onChange:b=>x(b.target.value),placeholder:"Masukkan nama file..."}),e.jsxs("div",{className:"h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400",children:[".",g]})]}),e.jsx("p",{className:"text-[9px] font-bold text-slate-400 ml-1 italic",children:"* Ekstensi file dikunci demi integritas data"})]})]}),e.jsxs("div",{className:"p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3",children:[e.jsx("button",{onClick:a,className:"px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-white transition-all",children:"Batal"}),e.jsx("button",{onClick:o,disabled:p||!h.trim(),className:"px-6 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50",children:p?e.jsxs(e.Fragment,{children:[e.jsx(Ue,{size:14,className:"animate-spin"})," Mengunggah..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Pa,{size:14,strokeWidth:3})," Unggah Sekarang"]})})]})]})})};function As({onNavigate:s}){const{user:a}=ga(),o=(a==null?void 0:a.tipe_user_id)===1,m=(a==null?void 0:a.tipe_user_id)===2||((a==null?void 0:a.tipe_user_nama)||"").toLowerCase().includes("admin instansi");((a==null?void 0:a.jabatan_nama)||"").toLowerCase().includes("sekretaris");const h=((a==null?void 0:a.jabatan_nama)||"").toLowerCase().includes("arsiparis")||((a==null?void 0:a.tipe_user_nama)||"").toLowerCase().includes("arsiparis"),x=o||h,p=window.location.origin,g=(t,r)=>{const n=encodeURIComponent(t);let l=r||"";l.startsWith(window.location.origin)&&(l=l.replace(window.location.origin,"")),l&&!l.startsWith("/")&&!l.startsWith("http")&&(l="/"+l);const i=l?encodeURIComponent(l):"";return`${pe.endsWith("/api")?pe.substring(0,pe.length-4):pe}/api/public/qr/generate?text=${n}${i?`&logo=${i}`:""}&size=300`},b=(t,r)=>t&&t.replace(/https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=150x150&data=([^"'\s&]+)/g,(n,l)=>{try{const w=decodeURIComponent(l).match(/[?&]v=([^&]+)/);if(w){const c=w[1],N=`${p}${p.endsWith("/")?"":"/"}?v=${c}`;return g(N,r)}}catch{}return n}),[f,$]=d.useState("internal"),[A,j]=d.useState("all"),[D,Ge]=d.useState((a==null?void 0:a.bidang_id)||"all"),[U,yt]=d.useState([]),[jt,Ve]=d.useState(!0),[ne,kt]=d.useState(""),[We,Ke]=d.useState("list"),[ee,qe]=d.useState("active"),[_t,ue]=d.useState(!1),[Nt,$t]=d.useState("masuk"),[St,At]=d.useState(null),[Dt,zt]=d.useState(!1),[Ct,Ye]=d.useState(!1),[Et,It]=d.useState(null),[Je,Qe]=d.useState(null),[he,ge]=d.useState(.7),[Pt,fe]=d.useState(!1),[Tt,Lt]=d.useState(""),[z,Rt]=d.useState({marginTop:20,marginBottom:20,marginLeft:30,marginRight:20,paperSize:"A4",fontSize:12,lineHeight:1.5,textAlign:"justify",fontFamily:"Arial, sans-serif",paragraphSpacingBefore:0,paragraphSpacingAfter:0,firstLineIndent:0}),[V,P]=d.useState(null),[Y,Mt]=d.useState(null),be=d.useRef(null),[R,te]=d.useState(null),[T,ve]=d.useState(null),[Bt,Ze]=d.useState({visibility:"hidden"}),[Ft,we]=d.useState({visibility:"hidden"}),ae=d.useRef(null),ye=d.useRef(null),M=d.useRef(null);d.useLayoutEffect(()=>{if(R&&ae.current){const t=ae.current.getBoundingClientRect();let r=R.x,n=R.y-15,l="-50%",i="-100%";r-t.width/2<20?(r=20,l="0%"):r+t.width/2>window.innerWidth-20&&(r=window.innerWidth-t.width-20,l="0%"),n-t.height<20&&(n=R.y+15,i="0%"),Ze({left:`${r}px`,top:`${n}px`,transform:`translateX(${l}) translateY(${i})`,visibility:"visible"})}else Ze({visibility:"hidden"});if(T&&ye.current){const t=ye.current.getBoundingClientRect();let r=T.x,n=T.y-15,l="-50%",i="-100%";r-t.width/2<20?(r=20,l="0%"):r+t.width/2>window.innerWidth-20&&(r=window.innerWidth-t.width-20,l="0%"),n-t.height<20&&(n=T.y+15,i="0%"),we({left:`${r}px`,top:`${n}px`,transform:`translateX(${l}) translateY(${i})`,visibility:"visible",opacity:1})}else we(T?{visibility:"visible",opacity:0}:{visibility:"hidden",opacity:0})},[R,T]);const Ut=(t,r)=>{M.current&&clearTimeout(M.current),ve(null);const n=t.currentTarget.getBoundingClientRect();let l=[];try{l=typeof r.approval_chain=="string"?JSON.parse(r.approval_chain):r.approval_chain}catch{l=[]}!l||l.length===0||te({x:n.left+n.width/2,y:n.top,chain:l.filter(i=>i&&i.role),subject:r.perihal,bidang_id:r.bidang_id})},Ot=()=>{je()},Ht=(t,r)=>{M.current&&clearTimeout(M.current),te(null);const n=t.currentTarget.getBoundingClientRect();let l=r.edit_history||[];l.length===0&&(l=[{aksi:"create",keterangan:"Surat dicatat di sistem",created_at:r.created_at||new Date().toISOString(),user_nama:r.creator_nama||"System",user_bidang:r.singkatan_bidang||"-"}]),ve({x:n.left+n.width/2,y:n.top,history:l,subject:r.perihal})},Gt=()=>{je()},Xe=()=>{M.current&&clearTimeout(M.current)},et=()=>{je()},je=()=>{M.current&&clearTimeout(M.current),M.current=setTimeout(()=>{te(null),ve(null)},300)},Vt=async(t,r)=>{const n=window.prompt(`Lompati tahap persetujuan untuk ${r}? Masukkan alasan (opsional):`,"Pejabat berhalangan (Sakit/Cuti)");if(n!==null)try{const l=await _.suratApprovals.bypass(t,n);l.success?(u.success("Tahap persetujuan berhasil dilompati"),O(),te(null)):u.error(l.message||"Gagal melewati tahap persetujuan")}catch(l){console.error("Error bypassing approval:",l),u.error("Terjadi kesalahan koneksi")}};d.useEffect(()=>{const t=r=>{const n=r.target;ae.current&&!ae.current.contains(n)&&te(null)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const[Wt,Kt]=d.useState([]),[qt,Yt]=d.useState([]),[ke,Jt]=d.useState([]),J=d.useRef(null),[le,_e]=d.useState(null),[se,Ne]=d.useState(null),[$e,tt]=d.useState(""),[Qt,at]=d.useState(!1),Zt=t=>{var n;const r=(n=t.target.files)==null?void 0:n[0];!r||!le||(Ne(r),tt(r.name.split(".").slice(0,-1).join(".")))},Xt=async()=>{if(!se||!le||!$e.trim())return;const t=U.find(i=>i.id===le),r=ke.length>0?ke[0].id:1,n=ke.find(i=>i.dokumen===(t==null?void 0:t.jenis_surat_nama)),l=(t==null?void 0:t.master_dokumen_id)||(n==null?void 0:n.id)||r;try{at(!0);const i=new FormData;i.append("file",se);const w=se.name.split(".").pop(),c=`${$e}.${w}`;i.append("nama_file",c),i.append("jenis_dokumen_id",String(l));const N=await _.dokumen.upload(i);if(N.success){const L=N.data.id;await _.suratApprovals.uploadFinal(le,L),u.success("Dokumen final berhasil diunggah!"),Ne(null),_e(null),O()}else u.error(N.message||"Gagal mengunggah dokumen")}catch{u.error("Gagal mengunggah dokumen final")}finally{at(!1),J.current&&(J.current.value="")}};d.useEffect(()=>{O(),ea()},[f,A,D]);const O=async()=>{try{Ve(!0);const t={};A!=="all"&&(t.instansi_id=A),D!=="all"&&(t.bidang_id=D);const r=await _.surat.getAll(t);r.success&&yt(r.data)}catch(t){console.error("Failed to fetch surat:",t)}finally{Ve(!1)}},ea=async()=>{try{const[t,r,n,l]=await Promise.all([_.bidangInstansi.getAll(),_.instansiDaerah.getAll(),_.jenisDokumen.getAll(),_.masterDataConfig.getDataByTable("master_dokumen")]);if(t.success){let i=t.data;(a==null?void 0:a.tipe_user_id)===1?A!=="all"&&(i=i.filter(c=>c.instansi_id===A)):i=i.filter(c=>c.instansi_id===(a==null?void 0:a.instansi_id)),Kt(i)}if(r.success&&Yt(r.data),n.success&&l.success){const i=n.data.find(w=>w.nama==="Surat");if(i){const w=l.data.filter(c=>c.jenis_dokumen_id===i.id);Jt(w)}}}catch(t){console.error("Failed to fetch master data:",t)}},Se=(t,r)=>{$t(t),At(r||null),ue(!0),P(null)},ta=async t=>{const r=U.find(i=>i.id===t),n=(r==null?void 0:r.approval_status)==="APPROVED",l=n?'PERHATIAN: Surat ini sudah FINAL dan memiliki QR Code verifikasi. Menghapus surat ini akan membubuhkan status "DIBATALKAN" secara permanen pada sistem verifikasi. Apakah Anda yakin ingin membatalkan dokumen resmi ini?':"Apakah Anda yakin ingin menghapus catatan surat ini?";if(window.confirm(l))try{const i=await _.surat.delete(t);i.success?(u.success(n?"Dokumen resmi telah dibatalkan.":"Surat berhasil dihapus."),O()):u.error("Gagal menghapus: "+i.message)}catch(i){console.error("Delete error:",i)}},aa=async t=>{if(window.confirm("Apakah Anda yakin ingin memulihkan kembali surat ini?"))try{const r=await _.dokumen.restore(-t);r.success?(u.success("Surat berhasil dipulihkan."),O()):u.error("Gagal memulihkan: "+r.message)}catch(r){console.error("Restore error:",r),u.error("Terjadi kesalahan saat memulihkan surat.")}},sa=async t=>{if(window.confirm("PERHATIAN: Menghapus surat ini secara permanen akan menghilangkan seluruh data surat dan dokumen fisiknya dari server secara permanen. Tindakan ini tidak dapat dibatalkan. Apakah Anda benar-benar yakin?"))try{const r=await _.dokumen.permanentDelete(-t);r.success?(u.success("Surat telah dihapus secara permanen."),O()):u.error("Gagal menghapus: "+r.message)}catch(r){console.error("Permanent delete error:",r),u.error("Terjadi kesalahan saat menghapus surat.")}},[v,ia]=d.useState(null);d.useEffect(()=>{(async()=>{const r=await _.suratTemplate.getGlobal();r.success&&ia(r.data)})()},[]);const ra=async t=>{var W;let r=null;if(t.jenis_surat_id){const k=await _.suratTemplate.getById(t.jenis_surat_id);k.success&&(r=k.data)}const n=!!(r!=null&&r.use_global_settings),l=n&&v?v:r||t,i=l.font_size??12,w=l.line_height??1.5,c=l.text_align??"justify",N=(r==null?void 0:r.paragraph_spacing_before)||(n?v==null?void 0:v.paragraph_spacing_before:0)||0,L=(r==null?void 0:r.paragraph_spacing_after)||(n?v==null?void 0:v.paragraph_spacing_after:0)||0,oe=(r==null?void 0:r.first_line_indent)||(n?v==null?void 0:v.first_line_indent:0)||0;if(Rt({marginTop:l.margin_top??20,marginBottom:l.margin_bottom??20,marginLeft:l.margin_left??30,marginRight:l.margin_right??20,paperSize:l.paper_size??"A4",fontSize:i,lineHeight:w,textAlign:c,fontFamily:l.font_family||n&&(v==null?void 0:v.font_family)||"Arial, sans-serif",paragraphSpacingBefore:N,paragraphSpacingAfter:L,firstLineIndent:oe}),t.file_path)It(t.file_path),Qe(t.nama_file),Ye(!0);else if(t.isi_surat){let k=t.isi_surat;try{const E=await _.internalInstansi.get(a.instansi_id),Q=(t.perihal||"").toLowerCase().includes("cuti")||(t.jenis_surat_nama||"").toLowerCase().includes("cuti")||(r==null?void 0:r.has_detail_cuti);let y={};const de=r?r.is_kop_surat_required:!0,ce=Q||(r==null?void 0:r.logo_path)==="none";E.success&&E.data&&E.data.instansiDetail&&(y=E.data.instansiDetail);let ie="";if(de&&y.nama_instansi_kop){if(ce)ie=`
                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                <span style="text-decoration: underline;">${String((y==null?void 0:y.nama_instansi_kop)||(y==null?void 0:y.instansi)||"")}</span>
                            </div>
                        `;else{const C=(r==null?void 0:r.kop_line_style)||"double";let S="";C==="single"?S='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>':C==="thick"?S='<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>':C==="double"?S=`
                                <div style="border-bottom: 2.25pt solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: 0.75pt solid #000; margin-top: 2pt;"></div>
                            `:C==="heavy-light"||C==="light-heavy"?S=`
                                <div style="border-bottom: ${C==="heavy-light"?"2.25pt":"0.75pt"} solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: ${C==="heavy-light"?"0.75pt":"2.25pt"} solid #000; margin-top: 2pt;"></div>
                            `:C!=="none"&&(S='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>'),ie=`
                            <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                    <tr>
                                        <td style="width: 80px; text-align: left; vertical-align: middle; padding-right: 15px;">
                                            ${y.logo_kop_path?`<img src="${y.logo_kop_path}" style="width: 75px; height: auto; display: block;" />`:""}
                                        </td>
                                        <td style="text-align: center; vertical-align: middle; padding-right: 40px;">
                                            <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                            <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                ${(y.nama_instansi_kop||y.instansi||"").toUpperCase().replace(" RISET","<br/>RISET")}
                                            </div>
                                            <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                ${y.alamat||""} Kode Pos ${y.kode_pos||""} Telp: ${y.telepon_kop||""} Faks: ${y.faks_kop||""}<br/>
                                                Laman: ${y.website_kop||"-"} | Pos-el: ${y.email_kop||"-"}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                ${S}
                            </div>
                        `}const Ae=new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),De=(y.kecamatan||"Cibinong").charAt(0).toUpperCase()+(y.kecamatan||"Cibinong").slice(1).toLowerCase(),ze=Q?"":`
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: ${l.font_family||"Arial, sans-serif"}; font-size: 12pt;">
                            <tr style="vertical-align: top;">
                                <td style="width: 15%;">Nomor</td>
                                <td style="width: 2%;">:</td>
                                <td style="width: 48%;">${t.nomor_surat||"..."}</td>
                                <td style="width: 35%;">Kepada</td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Sifat</td>
                                <td>:</td>
                                <td>${t.sifat||"Biasa"}</td>
                                <td rowspan="3" style="padding-top: 0;">
                                    Yth. ${t.tujuan_surat||"..."}<br/>
                                    di<br/>
                                    <span style="display: inline-block; margin-left: 1.5rem;">${y.lokasi||"Tempat"}</span>
                                </td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Lampiran</td>
                                <td>:</td>
                                <td>${t.lampiran||"-"}</td>
                            </tr>
                            <tr style="vertical-align: top;">
                                <td>Hal</td>
                                <td>:</td>
                                <td><strong>${t.perihal||"..."}</strong></td>
                            </tr>
                        </table>
                    `,Ce=`${String(window.location.origin)}?v=${t.verification_slug||""}`,Ee=typeof(y==null?void 0:y.logo_kop_path)=="string"?y.logo_kop_path:"",Ie=t.verification_slug?Ce:"PREVIEW_ONLY",Pe=`
                        <div style="position: absolute; bottom: 5mm; left: 5mm; z-index: 50;">
                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                <img src="${g(Ie,Ee)}" style="width: 60px; height: 60px; display: block;" />
                            </div>
                        </div>
                    `;k=`
                        ${ie}
                        <div style="text-align: right; margin-bottom: 20px; font-family: ${l.font_family||"Arial, sans-serif"}; font-size: ${i}pt;">
                            ${De}, ${Ae}
                        </div>
                        ${ze}
                        <div id="letter-content" style="font-family: ${n&&v?v.font_family:(r==null?void 0:r.font_family)||"Arial, sans-serif"}; font-size: ${i}pt; line-height: ${w}; text-align: ${c};">
                            <style>
                                ${Te({paragraph_spacing_before:N,paragraph_spacing_after:L,first_line_indent:oe})}
                            </style>
                            ${t.isi_surat||""}
                        </div>
                        ${Pe}
                        ${(()=>{let C=null;try{C=typeof t.metadata=="string"?JSON.parse(t.metadata):t.metadata}catch{}if(C&&C.eventData){const S=C.eventData;return`
                                    <div style="margin-top: 20px; font-family: Arial, sans-serif; font-size: 12pt;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr style="vertical-align: top;">
                                                <td style="width: 18%;">Hari/Tanggal</td>
                                                <td style="width: 2%;">:</td>
                                                <td style="width: 80%; font-weight: bold;">${S.hari_tanggal||"..."}</td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Waktu</td>
                                                <td>:</td>
                                                <td>${S.waktu||"..."}</td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Tempat</td>
                                                <td>:</td>
                                                <td>
                                                    ${S.tempat||"..."}
                                                    ${S.tipe==="Online"&&S.link?`<br/>Link: <span style="color: blue; text-decoration: underline;">${S.link}</span>`:""}
                                                </td>
                                            </tr>
                                            <tr style="vertical-align: top;">
                                                <td>Agenda</td>
                                                <td>:</td>
                                                <td>${S.agenda||"..."}</td>
                                            </tr>
                                        </table>
                                    </div>
                                `}return""})()}
                    `}}catch(E){console.error("Error fetching instance for preview:",E)}let I;try{const E=await _.internalInstansi.get(a.instansi_id);E.success&&(I=(W=E.data.instansiDetail)==null?void 0:W.logo_kop_path)}catch{}Lt(b(k,I)),Qe(t.perihal||"Draft Surat"),fe(!0)}else u.error("File fisik atau draft surat tidak tersedia.");P(null)},na=(t,r)=>{if(t.stopPropagation(),V===r.id){P(null);return}const n=t.currentTarget.getBoundingClientRect(),l=window.innerHeight-n.bottom,i=n.top,c=l<120&&i>l?"up":"down";Mt({x:n.right,y:c==="down"?n.bottom+8:n.top-8,width:150,direction:c}),P(r.id)};d.useEffect(()=>{const t=n=>{V&&be.current&&!be.current.contains(n.target)&&P(null)},r=()=>P(null);return V&&(document.addEventListener("mousedown",t),window.addEventListener("scroll",r,!0)),()=>{document.removeEventListener("mousedown",t),window.removeEventListener("scroll",r,!0)}},[V]);const la=({item:t})=>{const r=(i,w=!0,c)=>{switch(i){case"WAITING_APPROVAL":const N=c?c.replace("_"," ").replace(/\b\w/g,L=>L.toUpperCase()):w?"Persetujuan":"MENUNGGU";return{label:w?`Menunggu ${N}`:`MENUNGGU ${N.toUpperCase()}`,bg:"bg-amber-50",text:"text-amber-600",border:"border-amber-200"};case"APPROVED":return{label:w?"Disetujui":"DISETUJUI",bg:"bg-emerald-50",text:"text-emerald-600",border:"border-emerald-200"};case"REJECTED":return{label:w?"Ditolak":"DITOLAK",bg:"bg-rose-50",text:"text-rose-600",border:"border-rose-200"};case"RETURNED":return{label:w?"Dikembalikan":"DIKEMBALIKAN",bg:"bg-orange-50",text:"text-orange-600",border:"border-orange-200"};case"CANCELLED":return{label:w?"Batal":"BATAL",bg:"bg-slate-100",text:"text-slate-500",border:"border-slate-200"};default:return{label:i,bg:"bg-slate-50",text:"text-slate-600",border:"border-slate-200"}}};let n="";if(t.approval_status==="WAITING_APPROVAL")try{const i=typeof t.approval_chain=="string"?JSON.parse(t.approval_chain):t.approval_chain;if(Array.isArray(i)){const c=[...i].sort((N,L)=>N.urutan-L.urutan).find(N=>N.status!=="APPROVED");c&&(n=c.role)}}catch(i){console.error("Error parsing approval chain:",i)}const l=r(t.approval_status||"WAITING_APPROVAL",!0,n);return e.jsxs("div",{className:"flex items-center gap-2",children:[l&&e.jsx("div",{className:"group relative flex items-center",onMouseEnter:i=>Ut(i,t),onMouseLeave:Ot,children:e.jsxs("span",{className:`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${l.bg} ${l.text} ${l.border} flex items-center gap-1 cursor-help transition-all hover:scale-105 active:scale-95 shadow-sm`,children:[t.approval_status==="WAITING_APPROVAL"&&e.jsx(me,{size:8}),t.approval_status==="APPROVED"&&e.jsx(ct,{size:8}),(t.approval_status==="REJECTED"||t.approval_status==="RETURNED")&&e.jsx(Re,{size:8}),l.label]})}),t.jenis_surat_nama&&e.jsx("span",{className:"text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase cursor-help transition-all hover:scale-105",onMouseEnter:i=>Ht(i,t),onMouseLeave:Gt,children:t.jenis_surat_nama})]})},st=U.filter(t=>{var w,c;const r=!ne||((w=t.nomor_surat)==null?void 0:w.toLowerCase().includes(ne.toLowerCase()))||((c=t.perihal)==null?void 0:c.toLowerCase().includes(ne.toLowerCase())),n=t.tipe_surat===f,l=t.is_deleted===1;return n&&r&&(ee==="trash"?l:!l)}),oa=U.length,da=U.filter(t=>t.tipe_surat==="masuk").length,ca=U.filter(t=>t.tipe_surat==="keluar").length;return e.jsxs("div",{className:"space-y-2.5 p-4 pt-2",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-7 h-7 bg-ppm-slate rounded-lg flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20 shrink-0",children:e.jsx(fa,{size:14})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base font-black text-slate-800 tracking-tight leading-none uppercase",children:"Manajemen Surat"}),e.jsx("p",{className:"text-slate-400 text-[9px] font-bold mt-0.5",children:"Arsip surat masuk & pembuatan surat otomatis."})]})]}),e.jsxs("div",{className:"flex flex-col md:flex-row items-start md:items-stretch gap-4",children:[e.jsxs("div",{className:"flex bg-slate-100/80 p-0.5 rounded-xl w-fit border border-slate-200/50 shadow-inner",children:[e.jsx("button",{onClick:()=>$("masuk"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${f==="masuk"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Masuk"}),e.jsx("button",{onClick:()=>$("keluar"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${f==="keluar"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Keluar"}),e.jsx("button",{onClick:()=>$("internal"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${f==="internal"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Internal"})]}),ee==="active"&&e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0 relative z-10",children:[e.jsxs("button",{onClick:()=>{(f==="keluar"||f==="internal")&&s?s("surat-maker"):Se(f)},className:"flex items-center gap-1 px-3 h-8 bg-ppm-slate text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-ppm-slate/30 transition-all active:scale-95",children:[e.jsx(nt,{size:12,strokeWidth:3}),f==="masuk"?"Registrasi Surat":f==="keluar"?"Buat Surat Keluar":"Buat Surat Internal"]}),(f==="internal"||f==="keluar")&&e.jsxs("button",{onClick:()=>Se(f),className:"flex items-center gap-1 px-3 h-8 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-indigo-600/30 transition-all active:scale-95",children:[e.jsx(Le,{size:12,strokeWidth:3}),"Upload Surat"]})]})]})]}),e.jsx("div",{className:"bg-white p-1 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40",children:e.jsxs("div",{className:"flex flex-col lg:flex-row lg:items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-0.5 rounded-xl border border-slate-200/50 shadow-inner",children:[e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-white text-ppm-slate rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-100",children:e.jsx(K,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Total"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:oa})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(ba,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Masuk"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:da})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(va,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Keluar"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:ca})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(K,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Internal"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:U.filter(t=>t.tipe_surat==="internal").length})]})]})]}),e.jsxs("div",{className:"flex flex-col md:flex-row items-center gap-3 flex-1 lg:justify-end pr-2",children:[(a==null?void 0:a.tipe_user_id)===1&&e.jsx("div",{className:"w-full md:w-56",children:e.jsx(mt,{label:"Instansi",placeholder:"Filter Instansi",value:A==="all"?null:A,options:[{id:"all",instansi:"Semua Instansi"},...qt],displayField:"instansi",onChange:t=>{j(t==="all"?"all":Number(t)),Ge("all")},customClassName:"!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"})}),e.jsxs("div",{className:"flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner h-8 shrink-0",children:[e.jsxs("button",{onClick:()=>qe("active"),className:`px-3.5 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${ee==="active"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:[e.jsx(wa,{size:11}),"Aktif"]}),e.jsxs("button",{onClick:()=>qe("trash"),className:`px-3.5 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${ee==="trash"?"bg-white text-rose-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:[e.jsx(q,{size:11}),"Sampah"]})]}),e.jsx("div",{className:"w-full md:w-56",children:e.jsx(mt,{label:"Bidang",placeholder:"Semua Bidang",value:D==="all"?null:D,options:[{id:"all",nama_bidang:"Semua Bidang"},...Wt],displayField:"nama_bidang",secondaryField:"singkatan",onChange:t=>Ge(t==="all"?"all":Number(t)),customClassName:"!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"})}),e.jsxs("div",{className:"flex items-center gap-2 w-full md:w-auto",children:[e.jsxs("div",{className:"relative flex-1 md:w-64 group",children:[e.jsx(ya,{className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors",size:14}),e.jsx("input",{type:"text",placeholder:"Cari surat / perihal...",className:"w-full h-8 pl-10 pr-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 text-[10px] shadow-inner",value:ne,onChange:t=>kt(t.target.value)})]}),e.jsxs("div",{className:"flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner",children:[e.jsx("button",{onClick:()=>Ke("list"),className:`p-1 rounded-lg transition-all ${We==="list"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}`,title:"List View",children:e.jsx(lt,{size:14})}),e.jsx("button",{onClick:()=>Ke("grid"),className:`p-1 rounded-lg transition-all ${We==="grid"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}`,title:"Grid View",children:e.jsx(ja,{size:14})})]})]})]})]})}),jt?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl",children:[e.jsx(Ue,{className:"animate-spin text-ppm-slate mb-4",size:40}),e.jsx("p",{className:"text-slate-500 font-extrabold text-sm uppercase tracking-widest",children:"Memuat Data Surat..."})]}):st.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center px-6",children:[e.jsx("div",{className:"w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border-4 border-white shadow-inner",children:e.jsx(K,{size:40})}),e.jsx("h3",{className:"text-xl font-black text-slate-800 mb-2",children:"Belum ada surat terdaftar"}),e.jsx("p",{className:"text-slate-500 max-w-xs font-medium",children:"Klik tombol di atas untuk mulai mencatat surat masuk atau membuat surat baru."})]}):e.jsx("div",{className:"bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-50/50 border-b border-slate-100 text-left",children:[e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Detail Surat"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Tagging/Tematik"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Dokumen"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center",children:"Status"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Waktu"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right",children:"Opsi"})]})}),e.jsx("tbody",{className:"divide-y divide-slate-50",children:st.map(t=>{var r;return e.jsxs("tr",{className:`group/row transition-all ${t.is_deleted?"bg-slate-50/40 opacity-60 grayscale-[0.5]":"hover:bg-slate-50/80"}`,children:[e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.tipe_surat==="masuk"?"bg-blue-50 text-blue-500":t.tipe_surat==="keluar"?"bg-emerald-50 text-emerald-500":"bg-amber-50 text-amber-500"}`,children:e.jsx(ka,{size:18})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1",children:t.nomor_surat||"--"}),e.jsx("p",{className:"text-xs font-black text-slate-700 leading-tight group-hover/row:text-ppm-blue transition-colors capitalize",children:t.perihal.toLowerCase()}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-2 opacity-60 group-hover/row:opacity-100 transition-opacity",children:[e.jsx(_a,{size:12,className:"text-slate-400"}),e.jsx("span",{className:"text-[10px] font-bold text-slate-500 truncate max-w-[200px]",children:t.tipe_surat==="internal"?t.nama_pengusul||"Internal":t.tipe_surat==="masuk"?t.asal_surat:t.tujuan_surat||t.asal_surat||"Internal"}),(t.singkatan_bidang||t.nama_bidang)&&e.jsx("span",{className:"text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter leading-none shrink-0",children:t.singkatan_bidang||t.nama_bidang})]})]})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsxs("div",{className:"flex items-center gap-2 text-slate-600",children:[e.jsx("div",{className:"p-1.5 bg-indigo-50 text-indigo-500 rounded-lg shrink-0",children:e.jsx(lt,{size:11,strokeWidth:3})}),e.jsx("span",{className:`text-[11px] font-black leading-tight max-w-[140px] truncate ${t.nama_kegiatan_terkait?"text-slate-900":"text-slate-400 italic font-medium"}`,children:t.nama_kegiatan_terkait||"Bebas"})]}),t.tematik_terkait&&e.jsx("div",{className:"flex flex-wrap gap-1",children:t.tematik_terkait.split(",").map((n,l)=>e.jsx("span",{className:"text-[8px] font-black uppercase tracking-tighter bg-indigo-100/50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-200/50 leading-none",children:n.trim()},l))})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{onClick:()=>ra(t),className:"flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-xl transition-all group/file",title:"Klik untuk Pratinjau",children:[e.jsx("div",{className:"p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/file:bg-ppm-slate group-hover/file:text-white transition-all shadow-sm",children:e.jsx(K,{size:16})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[11px] font-bold text-slate-600 break-all max-w-[180px] group-hover/file:text-ppm-blue transition-colors leading-tight",title:t.nama_file||"Dokumen",children:t.nama_file||(t.approval_status==="APPROVED"?"Surat Final":"Draf Surat")}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1",children:[e.jsx("p",{className:"text-[9px] font-black text-slate-400 uppercase tracking-tighter",children:(((r=t.nama_file)==null?void 0:r.split(".").pop())||(t.isi_surat?"":"PDF")).toUpperCase()}),t.is_deleted?e.jsx("span",{className:"text-[8px] font-black bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tighter leading-none",children:"Dibatalkan"}):e.jsx("span",{className:"text-[8px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter leading-none",children:"Digunakan"})]})]})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsx("div",{className:"flex justify-center",children:e.jsx(la,{item:t})})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex items-center gap-2 text-slate-600",children:[e.jsx(Na,{size:14,className:"text-slate-400"}),e.jsx("span",{className:"text-[11px] font-bold",children:new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})})]}),t.tanggal_acara&&e.jsxs("div",{className:"flex items-center gap-2 text-ppm-slate font-bold",children:[e.jsx(me,{size:14}),e.jsxs("span",{className:"text-[10px] uppercase",children:["Acara: ",new Date(t.tanggal_acara).toLocaleDateString("id-ID",{day:"numeric",month:"short"})]})]})]})}),e.jsx("td",{className:"px-4 py-3 text-right",children:e.jsx("div",{className:"flex items-center justify-end gap-2 transition-opacity",children:ee==="trash"?e.jsxs(e.Fragment,{children:[e.jsx("button",{onClick:()=>aa(t.id),className:"p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm",title:"Pulihkan (Restore)",children:e.jsx($a,{size:15})}),x&&e.jsx("button",{onClick:()=>sa(t.id),className:"p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm",title:"Hapus Permanen",children:e.jsx(q,{size:15})})]}):e.jsxs(e.Fragment,{children:[!t.file_path&&e.jsx("button",{onClick:()=>{var n;_e(t.id),(n=J.current)==null||n.click()},className:"p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all",title:"Unggah Final (Fisik)",children:e.jsx(Le,{size:18})}),!t.file_path&&t.tipe_surat==="keluar"&&t.approval_status!=="APPROVED"?e.jsx("button",{className:"p-2 bg-slate-50 text-slate-300 rounded-xl cursor-not-allowed",title:"Belum dapat diunduh (Menunggu Persetujuan)",disabled:!0,children:e.jsx(ot,{size:18})}):e.jsx("a",{href:t.file_path||"#",download:t.nama_file||"dokumen",onClick:n=>{t.file_path||(n.preventDefault(),u.error("File fisik belum tersedia. Silakan cetak melalui menu opsi atau tunggu hingga disetujui."))},className:"p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all",title:"Unduh",children:e.jsx(ot,{size:18})}),e.jsx("div",{className:"relative",children:e.jsx("button",{onClick:n=>na(n,t),className:`p-2 rounded-xl transition-all ${V===t.id?"bg-ppm-slate text-white":"bg-slate-100 text-slate-400 hover:bg-slate-200"}`,children:e.jsx(Sa,{size:18})})})]})})})]},t.id)})})]})})}),e.jsx(La,{isOpen:_t,onClose:()=>ue(!1),onSuccess:()=>{ue(!1),O()},initialData:St,defaultType:Nt,user:a}),R&&e.jsxs("div",{ref:ae,style:Bt,className:"fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] max-w-[320px] overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200",onMouseEnter:Xe,onMouseLeave:et,children:[e.jsx("div",{className:"absolute top-0 left-0 w-1.5 h-full bg-blue-500"}),e.jsxs("div",{className:"flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 px-1",children:[e.jsx("div",{className:"p-1.5 bg-blue-50 text-blue-600 rounded-lg",children:e.jsx(dt,{size:16})}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-[11px] font-black text-slate-800 uppercase tracking-wider",children:"Riwayat Persetujuan"}),e.jsx("p",{className:"text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]",children:R.subject})]})]}),e.jsxs("div",{className:"space-y-4 relative",children:[e.jsx("div",{className:"absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100"}),R.chain.sort((t,r)=>t.urutan-r.urutan).map((t,r)=>{const n=t.status==="APPROVED",l=t.status==="PENDING"||t.status==="WAITING_APPROVAL",i=t.status==="REJECTED"||t.status==="RETURNED";return e.jsxs("div",{className:"flex gap-4 relative z-10",children:[e.jsx("div",{className:`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 transition-colors ${n?"bg-emerald-500 text-white":i?"bg-rose-500 text-white":"bg-amber-400 text-white"}`,children:n?e.jsx(ct,{size:10}):l?e.jsx(me,{size:10}):e.jsx(Re,{size:10})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex flex-col",children:[e.jsx("p",{className:"text-[10px] font-black text-slate-700 truncate capitalize",children:t.role.replace("_"," ")}),t.logbook_status&&e.jsxs("span",{className:"text-[8px] font-bold text-rose-500 animate-pulse",children:["Pejabat ",t.logbook_status]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${n?"bg-emerald-50 text-emerald-600":i?"bg-rose-50 text-rose-600":t.status==="BYPASSED"?"bg-slate-100 text-slate-500":"bg-amber-50 text-amber-600"}`,children:t.status==="PENDING"?"MENUNGGU":t.status}),((a==null?void 0:a.tipe_user_id)===1||((a==null?void 0:a.tipe_user_id)===2||(a==null?void 0:a.tipe_user_id)===3)&&R.bidang_id===(a==null?void 0:a.bidang_id))&&t.status==="PENDING"&&e.jsx("button",{onClick:()=>Vt(t.id,t.approver_name),className:"w-4 h-4 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-amber-500 hover:text-white rounded-md transition-all group/bypass shadow-sm",title:"Lompati Tahap Ini (Bypass)",children:e.jsx(Aa,{size:8})})]})]}),e.jsx("p",{className:"text-[11px] font-bold text-slate-800 truncate",children:t.approver_name||"..."}),t.reason&&e.jsx("div",{className:`mt-1.5 p-2 rounded-lg border ${t.status==="BYPASSED"?"bg-slate-50 border-slate-100":"bg-rose-50 border-rose-100"}`,children:e.jsxs("p",{className:`text-[9px] font-bold italic leading-snug ${t.status==="BYPASSED"?"text-slate-500":"text-rose-700"}`,children:['"',t.reason,'"']})})]})]},r)})]})]}),V&&Y&&ut.createPortal(e.jsx("div",{ref:be,className:"fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200",style:{top:`${Y.y}px`,left:`${Y.x-Y.width}px`,width:`${Y.width}px`,transform:Y.direction==="up"?"translateY(-100%)":"none"},children:(()=>{const t=U.find(n=>n.id===V);if(!t)return null;const r=(o||m&&t.instansi_id===a.instansi_id||t.bidang_id===a.bidang_id)&&t.approval_status!=="APPROVED";return e.jsxs(e.Fragment,{children:[r&&e.jsxs("button",{onClick:()=>{t.tipe_surat==="internal"&&!t.dokumen_id?(localStorage.setItem("edit_surat_id",String(t.id)),s&&s("surat-maker")):Se(t.tipe_surat,t),P(null)},className:"w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors",children:[e.jsx(pt,{size:14,className:"text-blue-500"}),"Ubah Data"]}),(t.approval_status==="APPROVED"||t.tipe_surat==="internal"&&t.approval_status==="WAITING_APPROVAL"&&t.isi_surat)&&e.jsxs("button",{onClick:async()=>{var n;if(t.approval_status==="APPROVED"&&t.file_path){window.open(t.file_path,"_blank"),P(null);return}try{const l=await _.internalInstansi.get(a.instansi_id);let i=null;if(t.jenis_surat_id){const k=await _.suratTemplate.getById(t.jenis_surat_id);k.success&&(i=k.data)}const w=(t.perihal||"").toLowerCase().includes("cuti")||(t.jenis_surat_nama||"").toLowerCase().includes("cuti")||(i==null?void 0:i.has_detail_cuti),c=(n=l.data)==null?void 0:n.instansiDetail;let N="";const L=i?i.is_kop_surat_required:!0,oe=w||(i==null?void 0:i.logo_path)==="none";if(L&&c)if(oe)N=`
                                                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                                                <span style="text-decoration: underline;">${String((c==null?void 0:c.nama_instansi_kop)||(c==null?void 0:c.instansi)||"")}</span>
                                                            </div>
                                                        `;else{const k=(i==null?void 0:i.kop_line_style)||"double";let I="";k==="single"?I='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>':k==="thick"?I='<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>':k==="double"||k==="heavy-light"||k==="light-heavy"?I=`
                                                                <div style="border-bottom: ${k==="double"||k==="heavy-light"?"2.25pt":"0.75pt"} solid #000; margin-top: 4pt;"></div>
                                                                <div style="border-bottom: ${k==="double"||k==="heavy-light"?"0.75pt":"2.25pt"} solid #000; margin-top: 2pt;"></div>
                                                            `:k!=="none"&&(I='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>'),N=`
                                                            <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                                                    <tr>
                                                                        <td style="width: 95px; text-align: left; vertical-align: middle;">
                                                                            ${c.logo_kop_path?`<img src="${c.logo_kop_path}" style="width: 85px; height: auto; display: block;" />`:""}
                                                                        </td>
                                                                        <td style="text-align: center; vertical-align: middle; padding: 0 5px;">
                                                                            <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                                                            <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                                                ${(c.nama_instansi_kop||c.instansi||"").toUpperCase().replace(" RISET","<br/>RISET")}
                                                                            </div>
                                                                            <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                                                ${c.alamat||""} Kode Pos ${c.kode_pos||""} Telp: ${c.telepon_kop||""} Faks: ${c.faks_kop||""}<br/>
                                                                                Laman: ${c.website_kop||"-"} | Pos-el: ${c.email_kop||"-"}
                                                                            </div>
                                                                        </td>
                                                                        <td style="width: 95px;"></td>
                                                                    </tr>
                                                                </table>
                                                                ${I}
                                                            </div>
                                                        `}const W=window.open("","_blank");if(W){const k=!!(i!=null&&i.use_global_settings),I=(i==null?void 0:i.margin_top)??t.margin_top??20,E=(i==null?void 0:i.margin_bottom)??t.margin_bottom??20,Q=(i==null?void 0:i.margin_left)??t.margin_left??30,y=(i==null?void 0:i.margin_right)??t.margin_right??20,de=(i==null?void 0:i.paper_size)??t.paper_size??"A4",ce=(i==null?void 0:i.font_size)??t.font_size??12,ie=(i==null?void 0:i.line_height)??t.line_height??1.5,Ae=(i==null?void 0:i.text_align)??t.text_align??"justify",De=(i==null?void 0:i.paragraph_spacing_before)||(k?v==null?void 0:v.paragraph_spacing_before:0)||0,ze=(i==null?void 0:i.paragraph_spacing_after)||(k?v==null?void 0:v.paragraph_spacing_after:0)||0,Ce=(i==null?void 0:i.first_line_indent)||(k?v==null?void 0:v.first_line_indent:0)||0,Ee=new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),Ie=((c==null?void 0:c.kecamatan)||"Cibinong").charAt(0).toUpperCase()+((c==null?void 0:c.kecamatan)||"Cibinong").slice(1).toLowerCase(),Pe=w?"":`
                                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: Arial, sans-serif; font-size: ${ce}pt;">
                                                            <tr style="vertical-align: top;">
                                                                <td style="width: 15%;">Nomor</td>
                                                                <td style="width: 2%;">:</td>
                                                                <td style="width: 48%;">${t.nomor_surat||"..."}</td>
                                                                <td style="width: 35%;">Kepada</td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Sifat</td>
                                                                <td>:</td>
                                                                <td>${t.sifat||"Biasa"}</td>
                                                                <td rowspan="3" style="padding-top: 0;">
                                                                    Yth. ${t.tujuan_surat||"..."}<br/>
                                                                    di<br/>
                                                                    <span style="display: inline-block; margin-left: 1.5rem;">${(c==null?void 0:c.lokasi)||"Tempat"}</span>
                                                                </td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Lampiran</td>
                                                                <td>:</td>
                                                                <td>${t.lampiran||"-"}</td>
                                                            </tr>
                                                            <tr style="vertical-align: top;">
                                                                <td>Hal</td>
                                                                <td>:</td>
                                                                <td><strong>${t.perihal||"..."}</strong></td>
                                                            </tr>
                                                        </table>
                                                    `,C=(i==null?void 0:i.nama_jenis_surat)||t.jenis_surat_nama||"Surat",S=t.nama_pengusul||"Internal",it=t.tanggal_acara||t.tanggal_surat,rt=new Date(it).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),pa=`${C} - ${S} - ${rt}`,ma=`${String(window.location.origin)}?v=${t.verification_slug||""}`,xa=typeof(c==null?void 0:c.logo_kop_path)=="string"?c.logo_kop_path:"",ua=t.verification_slug?ma:"PREVIEW_ONLY",ha=`
                                                        <div class="qr-footer">
                                                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                                                <img src="${g(ua,xa)}" style="width: 60px; height: 60px; display: block;" />
                                                            </div>
                                                        </div>
                                                    `;W.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>${pa}</title>
                                                                <style>
                                                                    body { 
                                                                        font-family: ${(i==null?void 0:i.font_family)||k&&(v==null?void 0:v.font_family)||"Arial, sans-serif"}; 
                                                                        font-size: ${ce}pt; 
                                                                        padding: ${I}mm ${y}mm ${E}mm ${Q}mm; 
                                                                        margin: 0; 
                                                                        line-height: ${ie}; 
                                                                        text-align: ${Ae}; 
                                                                        box-sizing: border-box;
                                                                    }
                                                                    @page { 
                                                                        size: ${Z(de).width} ${Z(de).height}; 
                                                                        margin: 0; 
                                                                    }
                                                                    ${Te({paragraph_spacing_before:De,paragraph_spacing_after:ze,first_line_indent:Ce})}
                                                                    .qr-footer {
                                                                        position: fixed;
                                                                        bottom: 5mm;
                                                                        left: 5mm;
                                                                        z-index: 100;
                                                                    }
                                                                    .qr-footer img {
                                                                        width: 60px;
                                                                        height: 60px;
                                                                        opacity: 1;
                                                                    }
                                                                    @media print { 
                                                                        body { 
                                                                            padding: ${I}mm ${y}mm ${E}mm ${Q}mm; 
                                                                            margin: 0; 
                                                                        } 
                                                                        .no-print { display: none; }
                                                                        .qr-footer { display: flex !important; }
                                                                    }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                ${N}
                                                                <div style="text-align: right; margin-bottom: 20px;">
                                                                    ${Ie}, ${Ee}
                                                                </div>
                                                                ${Pe}
                                                                <div class="document-content">
                                                                    ${t.isi_surat}
                                                                </div>
                                                                ${ha}
                                                            </body>
                                                        </html>
                                                    `),W.document.close(),setTimeout(()=>{W.print()},1500)}}catch(l){console.error("Failed to print document:",l),u.error("Gagal menyiapkan dokumen cetak.")}P(null)},className:"w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors",children:[e.jsx(Da,{size:14,className:"text-amber-500"}),"Cetak Dokumen"]}),x&&e.jsxs("button",{onClick:()=>{ta(t.id),P(null)},className:`w-full px-4 py-2.5 text-left text-xs font-black flex items-center gap-2 transition-colors border-t border-slate-100 ${t.approval_status==="APPROVED"?"text-amber-600 hover:bg-amber-50":"text-rose-600 hover:bg-rose-50"}`,children:[e.jsx(q,{size:14}),t.approval_status==="APPROVED"?"Batalkan Dokumen":"Hapus Dokumen"]})]})})()}),document.body),e.jsx(Ta,{isOpen:Ct,onClose:()=>Ye(!1),fileUrl:Et,fileName:Je||"Dokumen"}),Pt&&e.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center p-4",children:[e.jsx("div",{className:"absolute inset-0 bg-slate-900/60 backdrop-blur-sm",onClick:()=>fe(!1)}),e.jsxs("div",{className:"relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[95vh]",children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-indigo-50 text-indigo-600 rounded-lg",children:e.jsx(K,{size:20})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-bold text-slate-800 tracking-tight leading-none",children:Je}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1",children:"Pratinjau Draft Dokumen"})]})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("div",{className:"flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm",children:[e.jsx("button",{onClick:()=>ge(t=>Math.max(.5,t-.1)),className:"w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all",children:e.jsx(za,{size:16})}),e.jsxs("div",{className:"w-12 text-center text-[10px] font-black text-slate-600 tabular-nums",children:[Math.round(he*100),"%"]}),e.jsx("button",{onClick:()=>ge(t=>Math.min(2,t+.1)),className:"w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all",children:e.jsx(Ca,{size:16})})]}),e.jsx("button",{onClick:()=>{fe(!1),ge(.7)},className:"w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95",children:e.jsx(Oe,{size:18})})]})]}),e.jsx("div",{className:"flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8 flex flex-col items-center",children:e.jsxs("div",{className:"bg-white shadow-xl text-black transition-all duration-300 relative",style:{transform:`scale(${he})`,transformOrigin:"top center",marginBottom:`${parseFloat(Z(z.paperSize).height)*he-parseFloat(Z(z.paperSize).height)}mm`,width:Z(z.paperSize).width,height:Z(z.paperSize).height,padding:`${z.marginTop}mm ${z.marginRight}mm ${z.marginBottom}mm ${z.marginLeft}mm`,fontFamily:z.fontFamily,fontSize:`${z.fontSize}pt`,boxSizing:"border-box",lineHeight:z.lineHeight||"1.5",textAlign:z.textAlign||"justify",color:"black"},children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:Te({paragraph_spacing_before:z.paragraphSpacingBefore,paragraph_spacing_after:z.paragraphSpacingAfter,first_line_indent:z.firstLineIndent})}}),e.jsx("div",{dangerouslySetInnerHTML:{__html:Tt}})]})})]})]}),e.jsx(vs,{isOpen:Dt,onClose:()=>zt(!1),onRestore:()=>O()}),e.jsx("input",{type:"file",ref:J,className:"hidden",accept:".pdf,.doc,.docx",onChange:Zt}),e.jsx(ws,{isOpen:!!se,onClose:()=>{Ne(null),_e(null),J.current&&(J.current.value="")},onConfirm:Xt,file:se,fileName:$e,setFileName:tt,isSubmitting:Qt}),T&&e.jsx("div",{ref:ye,className:"fixed z-[10000] transition-opacity duration-200 animate-in fade-in zoom-in-95",style:Ft,onMouseEnter:Xe,onMouseLeave:et,children:e.jsxs("div",{className:"bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 min-w-[320px] max-w-[380px] overflow-hidden relative pointer-events-auto",children:[e.jsx("div",{className:"absolute top-0 left-0 w-1.5 h-full bg-slate-400"}),e.jsxs("div",{className:"flex items-center gap-3 mb-3 pb-3 border-b border-slate-50 px-1",children:[e.jsx("div",{className:"w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400",children:e.jsx(dt,{size:16})}),e.jsxs("div",{className:"flex flex-col min-w-0",children:[e.jsx("span",{className:"text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none",children:"Riwayat Perubahan"}),e.jsx("span",{className:"text-[9px] font-bold text-slate-400 truncate mt-1 italic uppercase tracking-tighter",children:T.subject})]})]}),e.jsx("div",{className:"space-y-4 max-h-[250px] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent",children:[...T.history].sort((t,r)=>new Date(r.created_at).getTime()-new Date(t.created_at).getTime()).map((t,r)=>e.jsxs("div",{className:"relative pl-6 pb-4 last:pb-0",children:[r<T.history.length-1&&e.jsx("div",{className:"absolute left-[9px] top-[18px] bottom-0 w-px bg-slate-100"}),e.jsx("div",{className:`absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${t.aksi==="create"?"bg-emerald-500":t.aksi==="delete"?"bg-rose-500":t.aksi==="restore"?"bg-indigo-500":"bg-slate-400"}`,children:t.aksi==="create"?e.jsx(nt,{size:10,className:"text-white"}):t.aksi==="delete"?e.jsx(q,{size:10,className:"text-white"}):t.aksi==="restore"?e.jsx(Ea,{size:10,className:"text-white"}):e.jsx(pt,{size:10,className:"text-white"})}),e.jsxs("div",{className:"flex flex-col",children:[e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsx("span",{className:"text-[10px] font-black text-slate-800 uppercase tracking-tight",children:t.aksi==="create"?"DIBUAT":t.aksi==="edit"?"DIUBAH":t.aksi==="delete"?"DIHAPUS":t.aksi==="restore"?"DIPULIHKAN":t.aksi.toUpperCase()}),e.jsxs("span",{className:"text-[9px] font-bold text-slate-300",children:[new Date(t.created_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short"})," • ",new Date(t.created_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})]})]}),e.jsx("p",{className:"text-[10px] font-bold text-slate-500 mt-0.5 leading-snug",children:t.keterangan}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1.5",children:[e.jsx("div",{className:"w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center",children:e.jsx(Ia,{size:8,className:"text-slate-400"})}),e.jsxs("span",{className:"text-[9px] font-black text-slate-400 uppercase tracking-tighter",children:[t.user_nama," ",e.jsxs("span",{className:"font-bold opacity-60",children:["(",t.user_bidang,")"]})]})]})]})]},r))})]})})]})}export{As as default};
