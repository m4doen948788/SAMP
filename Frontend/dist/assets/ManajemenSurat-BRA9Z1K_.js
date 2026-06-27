import{r as d,h as ma,c as $,j as e,aD as xa,d as rt,U as Le,a as Z,a1 as W,as as ua,at as ga,S as ha,aw as nt,au as fa,e as Oe,an as ba,_ as va,C as wa,aB as pe,a5 as lt,aq as ya,am as ot,o as dt,p as Te,aN as ja,P as ct,aO as ka,az as _a,aA as Na,X as Ue,ar as $a,z as Sa,aH as ce,b as Aa}from"./index-CTrWJo99.js";import{r as xt}from"./index-BaW3Sycy.js";import{S as pt}from"./SearchableSelect-WFBJ9Kvx.js";import{D as Da}from"./DocumentViewerModal-CUSywFIc.js";import{S as za}from"./SuratRegistrationModal-diFbVSnH.js";import{g as Q,a as Pe}from"./letterComposers-BaBvTYrY.js";import"./_commonjs-dynamic-modules-TDtrdbi3.js";let Ea={data:""},Ca=s=>{if(typeof window=="object"){let a=(s?s.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return a.nonce=window.__nonce__,a.parentNode||(s||document.head).appendChild(a),a.firstChild}return s||Ea},Ia=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Pa=/\/\*[^]*?\*\/|  +/g,mt=/\n+/g,F=(s,a)=>{let o="",m="",u="";for(let x in s){let p=s[x];x[0]=="@"?x[1]=="i"?o=x+" "+p+";":m+=x[1]=="f"?F(p,x):x+"{"+F(p,x[1]=="k"?"":a)+"}":typeof p=="object"?m+=F(p,a?a.replace(/([^,])+/g,g=>x.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,b=>/&/.test(b)?b.replace(/&/g,g):g?g+" "+b:b)):x):p!=null&&(x=/^--/.test(x)?x:x.replace(/[A-Z]/g,"-$&").toLowerCase(),u+=F.p?F.p(x,p):x+":"+p+";")}return o+(a&&u?a+"{"+u+"}":u)+m},B={},ut=s=>{if(typeof s=="object"){let a="";for(let o in s)a+=o+ut(s[o]);return a}return s},La=(s,a,o,m,u)=>{let x=ut(s),p=B[x]||(B[x]=(b=>{let h=0,N=11;for(;h<b.length;)N=101*N+b.charCodeAt(h++)>>>0;return"go"+N})(x));if(!B[p]){let b=x!==s?s:(h=>{let N,A,y=[{}];for(;N=Ia.exec(h.replace(Pa,""));)N[4]?y.shift():N[3]?(A=N[3].replace(mt," ").trim(),y.unshift(y[0][A]=y[0][A]||{})):y[0][N[1]]=N[2].replace(mt," ").trim();return y[0]})(s);B[p]=F(u?{["@keyframes "+p]:b}:b,o?"":"."+p)}let g=o&&B.g?B.g:null;return o&&(B.g=B[p]),((b,h,N,A)=>{A?h.data=h.data.replace(A,b):h.data.indexOf(b)===-1&&(h.data=N?b+h.data:h.data+b)})(B[p],a,m,g),p},Ta=(s,a,o)=>s.reduce((m,u,x)=>{let p=a[x];if(p&&p.call){let g=p(o),b=g&&g.props&&g.props.className||/^go/.test(g)&&g;p=b?"."+b:g&&typeof g=="object"?g.props?"":F(g,""):g===!1?"":g}return m+u+(p??"")},"");function me(s){let a=this||{},o=s.call?s(a.p):s;return La(o.unshift?o.raw?Ta(o,[].slice.call(arguments,1),a.p):o.reduce((m,u)=>Object.assign(m,u&&u.call?u(a.p):u),{}):o,Ca(a.target),a.g,a.o,a.k)}let gt,Re,Me;me.bind({g:1});let O=me.bind({k:1});function Ra(s,a,o,m){F.p=a,gt=s,Re=o,Me=m}function H(s,a){let o=this||{};return function(){let m=arguments;function u(x,p){let g=Object.assign({},x),b=g.className||u.className;o.p=Object.assign({theme:Re&&Re()},g),o.o=/ *go\d+/.test(b),g.className=me.apply(o,m)+(b?" "+b:"");let h=s;return s[0]&&(h=g.as||s,delete g.as),Me&&h[0]&&Me(g),gt(h,g)}return u}}var Ma=s=>typeof s=="function",Be=(s,a)=>Ma(s)?s(a):s,Ba=(()=>{let s=0;return()=>(++s).toString()})(),Oa=(()=>{let s;return()=>{if(s===void 0&&typeof window<"u"){let a=matchMedia("(prefers-reduced-motion: reduce)");s=!a||a.matches}return s}})(),Ua=20,ht="default",ft=(s,a)=>{let{toastLimit:o}=s.settings;switch(a.type){case 0:return{...s,toasts:[a.toast,...s.toasts].slice(0,o)};case 1:return{...s,toasts:s.toasts.map(p=>p.id===a.toast.id?{...p,...a.toast}:p)};case 2:let{toast:m}=a;return ft(s,{type:s.toasts.find(p=>p.id===m.id)?1:0,toast:m});case 3:let{toastId:u}=a;return{...s,toasts:s.toasts.map(p=>p.id===u||u===void 0?{...p,dismissed:!0,visible:!1}:p)};case 4:return a.toastId===void 0?{...s,toasts:[]}:{...s,toasts:s.toasts.filter(p=>p.id!==a.toastId)};case 5:return{...s,pausedAt:a.time};case 6:let x=a.time-(s.pausedAt||0);return{...s,pausedAt:void 0,toasts:s.toasts.map(p=>({...p,pauseDuration:p.pauseDuration+x}))}}},Fa=[],Ha={toasts:[],pausedAt:void 0,settings:{toastLimit:Ua}},X={},bt=(s,a=ht)=>{X[a]=ft(X[a]||Ha,s),Fa.forEach(([o,m])=>{o===a&&m(X[a])})},vt=s=>Object.keys(X).forEach(a=>bt(s,a)),Ga=s=>Object.keys(X).find(a=>X[a].toasts.some(o=>o.id===s)),Fe=(s=ht)=>a=>{bt(a,s)},Va=(s,a="blank",o)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:a,ariaProps:{role:"status","aria-live":"polite"},message:s,pauseDuration:0,...o,id:(o==null?void 0:o.id)||Ba()}),ie=s=>(a,o)=>{let m=Va(a,s,o);return Fe(m.toasterId||Ga(m.id))({type:2,toast:m}),m.id},f=(s,a)=>ie("blank")(s,a);f.error=ie("error");f.success=ie("success");f.loading=ie("loading");f.custom=ie("custom");f.dismiss=(s,a)=>{let o={type:3,toastId:s};a?Fe(a)(o):vt(o)};f.dismissAll=s=>f.dismiss(void 0,s);f.remove=(s,a)=>{let o={type:4,toastId:s};a?Fe(a)(o):vt(o)};f.removeAll=s=>f.remove(void 0,s);f.promise=(s,a,o)=>{let m=f.loading(a.loading,{...o,...o==null?void 0:o.loading});return typeof s=="function"&&(s=s()),s.then(u=>{let x=a.success?Be(a.success,u):void 0;return x?f.success(x,{id:m,...o,...o==null?void 0:o.success}):f.dismiss(m),u}).catch(u=>{let x=a.error?Be(a.error,u):void 0;x?f.error(x,{id:m,...o,...o==null?void 0:o.error}):f.dismiss(m)}),s};var Wa=O`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Ka=O`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,qa=O`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ya=H("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${s=>s.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Wa} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Ka} 0.15s ease-out forwards;
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
    animation: ${qa} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Ja=O`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Qa=H("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${s=>s.secondary||"#e0e0e0"};
  border-right-color: ${s=>s.primary||"#616161"};
  animation: ${Ja} 1s linear infinite;
`,Za=O`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Xa=O`
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
}`,es=H("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${s=>s.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${Za} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Xa} 0.2s ease-out forwards;
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
`,ts=H("div")`
  position: absolute;
`,as=H("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ss=O`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,is=H("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ss} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,rs=({toast:s})=>{let{icon:a,type:o,iconTheme:m}=s;return a!==void 0?typeof a=="string"?d.createElement(is,null,a):a:o==="blank"?null:d.createElement(as,null,d.createElement(Qa,{...m}),o!=="loading"&&d.createElement(ts,null,o==="error"?d.createElement(Ya,{...m}):d.createElement(es,{...m})))},ns=s=>`
0% {transform: translate3d(0,${s*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,ls=s=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${s*-150}%,-1px) scale(.6); opacity:0;}
`,os="0%{opacity:0;} 100%{opacity:1;}",ds="0%{opacity:1;} 100%{opacity:0;}",cs=H("div")`
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
`,ps=H("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,ms=(s,a)=>{let o=s.includes("top")?1:-1,[m,u]=Oa()?[os,ds]:[ns(o),ls(o)];return{animation:a?`${O(m)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${O(u)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}};d.memo(({toast:s,position:a,style:o,children:m})=>{let u=s.height?ms(s.position||a||"top-center",s.visible):{opacity:0},x=d.createElement(rs,{toast:s}),p=d.createElement(ps,{...s.ariaProps},Be(s.message,s));return d.createElement(cs,{className:s.className,style:{...u,...o,...s.style}},typeof m=="function"?m({icon:x,message:p}):d.createElement(d.Fragment,null,x,p))});Ra(d.createElement);me`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;const xs=({isOpen:s,onClose:a,onRestore:o})=>{const[m,u]=d.useState([]),[x,p]=d.useState(!1),[g,b]=d.useState(null),h=async()=>{p(!0),b(null);try{const y=await $.dokumen.getTrash("surat");y.success?u(y.data):b(y.message)}catch(y){b(y.message)}finally{p(!1)}};d.useEffect(()=>{s&&h()},[s]);const N=async y=>{try{const D=await $.dokumen.restore(y);D.success?(h(),o()):f.error(D.message)}catch(D){f.error(D.message)}},A=async y=>{if(window.confirm("Hapus dokumen ini secara permanen? Aksi ini tidak dapat dibatalkan."))try{const D=await $.dokumen.permanentDelete(y);D.success?(h(),f.success("Dokumen berhasil dihapus permanen")):f.error(D.message)}catch(D){f.error(D.message)}};return s?xt.createPortal(e.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center p-4",children:[e.jsx("div",{className:"absolute inset-0 bg-slate-900/60 backdrop-blur-sm",onClick:a}),e.jsxs("div",{className:"relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",children:[e.jsxs("div",{className:"p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm",children:e.jsx(Z,{size:24})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-black text-slate-800 tracking-tight",children:"Tempat Sampah Surat"}),e.jsx("p",{className:"text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5",children:"Dokumen terhapus (Kategori: Surat)"})]})]}),e.jsx("button",{onClick:a,className:"w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95",children:e.jsx(Ue,{size:20})})]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent",children:x?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 gap-4",children:[e.jsx(Oe,{className:"animate-spin text-rose-500",size:40}),e.jsx("p",{className:"text-sm font-black text-slate-400 uppercase tracking-widest",children:"Memuat Data Sampah..."})]}):g?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 text-rose-500 bg-rose-50 rounded-3xl border border-rose-100 italic gap-2",children:[e.jsx(Te,{size:32}),e.jsx("p",{className:"font-bold",children:g})]}):m.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 text-slate-300 gap-4",children:[e.jsx("div",{className:"w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner",children:e.jsx(Z,{size:40})}),e.jsx("p",{className:"text-sm font-black uppercase tracking-widest text-slate-400",children:"Tempat sampah kosong"})]}):e.jsx("div",{className:"grid gap-3",children:m.map(y=>e.jsxs("div",{className:"flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group",children:[e.jsx("div",{className:"w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm group-hover:text-indigo-500 transition-colors",children:e.jsx(W,{size:20})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("h4",{className:"font-bold text-slate-700 truncate",children:y.nama_file}),e.jsxs("div",{className:"flex items-center gap-3 mt-1",children:[e.jsx("span",{className:"text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tight",children:y.jenis_dokumen_nama}),e.jsxs("span",{className:"text-[10px] font-bold text-slate-400 flex items-center gap-1",children:[e.jsx(pe,{size:10}),"Dihapus: ",new Date(y.deleted_at).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})]})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:()=>N(y.id),className:"px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold text-xs border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm",children:"Pulihkan"}),e.jsx("button",{onClick:()=>A(y.id),className:"p-2 bg-white text-rose-500 rounded-xl font-bold text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm",children:e.jsx(Z,{size:16})})]})]},y.id))})})]})]}),document.body):null},us=({isOpen:s,onClose:a,onConfirm:o,file:m,fileName:u,setFileName:x,isSubmitting:p})=>{if(!s||!m)return null;const g=m.name.split(".").pop();return e.jsx("div",{className:"fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300",children:e.jsxs("div",{className:"bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300",children:[e.jsxs("div",{className:"px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-emerald-50 text-emerald-600 rounded-xl",children:e.jsx(Le,{size:20})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-black text-slate-800 tracking-tight",children:"Unggah Dokumen Final"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1",children:"Konfirmasi nama file sistem"})]})]}),e.jsx("button",{onClick:a,className:"p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all",children:e.jsx(Ue,{size:20})})]}),e.jsxs("div",{className:"p-6 space-y-4",children:[e.jsxs("div",{className:"p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4",children:[e.jsx("div",{className:"p-3 bg-white rounded-2xl shadow-sm text-slate-400",children:e.jsx(W,{size:24})}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"text-xs font-black text-slate-700 truncate",children:m.name}),e.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest",children:"File Terpilih"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("label",{className:"text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1",children:"Nama File di Sistem"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("input",{type:"text",className:"w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-black text-slate-700 text-sm",value:u,onChange:b=>x(b.target.value),placeholder:"Masukkan nama file..."}),e.jsxs("div",{className:"h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400",children:[".",g]})]}),e.jsx("p",{className:"text-[9px] font-bold text-slate-400 ml-1 italic",children:"* Ekstensi file dikunci demi integritas data"})]})]}),e.jsxs("div",{className:"p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3",children:[e.jsx("button",{onClick:a,className:"px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:bg-white transition-all",children:"Batal"}),e.jsx("button",{onClick:o,disabled:p||!u.trim(),className:"px-6 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50",children:p?e.jsxs(e.Fragment,{children:[e.jsx(Oe,{size:14,className:"animate-spin"})," Mengunggah..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Aa,{size:14,strokeWidth:3})," Unggah Sekarang"]})})]})]})})};function js({onNavigate:s}){const{user:a}=ma(),o=(a==null?void 0:a.tipe_user_id)===1,m=(a==null?void 0:a.tipe_user_id)===2||((a==null?void 0:a.tipe_user_nama)||"").toLowerCase().includes("admin instansi");((a==null?void 0:a.jabatan_nama)||"").toLowerCase().includes("sekretaris");const u=((a==null?void 0:a.jabatan_nama)||"").toLowerCase().includes("arsiparis")||((a==null?void 0:a.tipe_user_nama)||"").toLowerCase().includes("arsiparis"),x=o||u,p=window.location.origin,g=(t,r)=>{const n=encodeURIComponent(t);let l=r||"";l.startsWith(window.location.origin)&&(l=l.replace(window.location.origin,"")),l&&!l.startsWith("/")&&!l.startsWith("http")&&(l="/"+l);const i=l?encodeURIComponent(l):"";return`${ce.endsWith("/api")?ce.substring(0,ce.length-4):ce}/api/public/qr/generate?text=${n}${i?`&logo=${i}`:""}&size=300`},b=(t,r)=>t&&t.replace(/https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=150x150&data=([^"'\s&]+)/g,(n,l)=>{try{const j=decodeURIComponent(l).match(/[?&]v=([^&]+)/);if(j){const c=j[1],_=`${p}${p.endsWith("/")?"":"/"}?v=${c}`;return g(_,r)}}catch{}return n}),[h,N]=d.useState("internal"),[A,y]=d.useState("all"),[D,He]=d.useState((a==null?void 0:a.bidang_id)||"all"),[U,wt]=d.useState([]),[yt,Ge]=d.useState(!0),[re,jt]=d.useState(""),[Ve,We]=d.useState("list"),[kt,xe]=d.useState(!1),[_t,Nt]=d.useState("masuk"),[$t,St]=d.useState(null),[At,Ke]=d.useState(!1),[Dt,qe]=d.useState(!1),[zt,Et]=d.useState(null),[Ye,Je]=d.useState(null),[ue,ge]=d.useState(.7),[Ct,he]=d.useState(!1),[It,Pt]=d.useState(""),[z,Lt]=d.useState({marginTop:20,marginBottom:20,marginLeft:30,marginRight:20,paperSize:"A4",fontSize:12,lineHeight:1.5,textAlign:"justify",fontFamily:"Arial, sans-serif",paragraphSpacingBefore:0,paragraphSpacingAfter:0,firstLineIndent:0}),[G,P]=d.useState(null),[K,Tt]=d.useState(null),fe=d.useRef(null),[R,ee]=d.useState(null),[L,be]=d.useState(null),[Rt,Qe]=d.useState({visibility:"hidden"}),[Mt,ve]=d.useState({visibility:"hidden"}),te=d.useRef(null),we=d.useRef(null),M=d.useRef(null);d.useLayoutEffect(()=>{if(R&&te.current){const t=te.current.getBoundingClientRect();let r=R.x,n=R.y-15,l="-50%",i="-100%";r-t.width/2<20?(r=20,l="0%"):r+t.width/2>window.innerWidth-20&&(r=window.innerWidth-t.width-20,l="0%"),n-t.height<20&&(n=R.y+15,i="0%"),Qe({left:`${r}px`,top:`${n}px`,transform:`translateX(${l}) translateY(${i})`,visibility:"visible"})}else Qe({visibility:"hidden"});if(L&&we.current){const t=we.current.getBoundingClientRect();let r=L.x,n=L.y-15,l="-50%",i="-100%";r-t.width/2<20?(r=20,l="0%"):r+t.width/2>window.innerWidth-20&&(r=window.innerWidth-t.width-20,l="0%"),n-t.height<20&&(n=L.y+15,i="0%"),ve({left:`${r}px`,top:`${n}px`,transform:`translateX(${l}) translateY(${i})`,visibility:"visible",opacity:1})}else ve(L?{visibility:"visible",opacity:0}:{visibility:"hidden",opacity:0})},[R,L]);const Bt=(t,r)=>{M.current&&clearTimeout(M.current),be(null);const n=t.currentTarget.getBoundingClientRect();let l=[];try{l=typeof r.approval_chain=="string"?JSON.parse(r.approval_chain):r.approval_chain}catch{l=[]}!l||l.length===0||ee({x:n.left+n.width/2,y:n.top,chain:l.filter(i=>i&&i.role),subject:r.perihal,bidang_id:r.bidang_id})},Ot=()=>{ye()},Ut=(t,r)=>{M.current&&clearTimeout(M.current),ee(null);const n=t.currentTarget.getBoundingClientRect();let l=r.edit_history||[];l.length===0&&(l=[{aksi:"create",keterangan:"Surat dicatat di sistem",created_at:r.created_at||new Date().toISOString(),user_nama:r.creator_nama||"System",user_bidang:r.singkatan_bidang||"-"}]),be({x:n.left+n.width/2,y:n.top,history:l,subject:r.perihal})},Ft=()=>{ye()},Ze=()=>{M.current&&clearTimeout(M.current)},Xe=()=>{ye()},ye=()=>{M.current&&clearTimeout(M.current),M.current=setTimeout(()=>{ee(null),be(null)},300)},Ht=async(t,r)=>{const n=window.prompt(`Lompati tahap persetujuan untuk ${r}? Masukkan alasan (opsional):`,"Pejabat berhalangan (Sakit/Cuti)");if(n!==null)try{const l=await $.suratApprovals.bypass(t,n);l.success?(f.success("Tahap persetujuan berhasil dilompati"),Y(),ee(null)):f.error(l.message||"Gagal melewati tahap persetujuan")}catch(l){console.error("Error bypassing approval:",l),f.error("Terjadi kesalahan koneksi")}};d.useEffect(()=>{const t=r=>{const n=r.target;te.current&&!te.current.contains(n)&&ee(null)};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]);const[Gt,Vt]=d.useState([]),[Wt,Kt]=d.useState([]),[je,qt]=d.useState([]),q=d.useRef(null),[ne,ke]=d.useState(null),[ae,_e]=d.useState(null),[Ne,et]=d.useState(""),[Yt,tt]=d.useState(!1),Jt=t=>{var n;const r=(n=t.target.files)==null?void 0:n[0];!r||!ne||(_e(r),et(r.name.split(".").slice(0,-1).join(".")))},Qt=async()=>{if(!ae||!ne||!Ne.trim())return;const t=U.find(i=>i.id===ne),r=je.length>0?je[0].id:1,n=je.find(i=>i.dokumen===(t==null?void 0:t.jenis_surat_nama)),l=(t==null?void 0:t.master_dokumen_id)||(n==null?void 0:n.id)||r;try{tt(!0);const i=new FormData;i.append("file",ae);const j=ae.name.split(".").pop(),c=`${Ne}.${j}`;i.append("nama_file",c),i.append("jenis_dokumen_id",String(l));const _=await $.dokumen.upload(i);if(_.success){const T=_.data.id;await $.suratApprovals.uploadFinal(ne,T),f.success("Dokumen final berhasil diunggah!"),_e(null),ke(null),Y()}else f.error(_.message||"Gagal mengunggah dokumen")}catch{f.error("Gagal mengunggah dokumen final")}finally{tt(!1),q.current&&(q.current.value="")}};d.useEffect(()=>{Y(),Zt()},[h,A,D]);const Y=async()=>{try{Ge(!0);const t={};A!=="all"&&(t.instansi_id=A),D!=="all"&&(t.bidang_id=D);const r=await $.surat.getAll(t);r.success&&wt(r.data)}catch(t){console.error("Failed to fetch surat:",t)}finally{Ge(!1)}},Zt=async()=>{try{const[t,r,n,l]=await Promise.all([$.bidangInstansi.getAll(),$.instansiDaerah.getAll(),$.jenisDokumen.getAll(),$.masterDataConfig.getDataByTable("master_dokumen")]);if(t.success){let i=t.data;(a==null?void 0:a.tipe_user_id)===1?A!=="all"&&(i=i.filter(c=>c.instansi_id===A)):i=i.filter(c=>c.instansi_id===(a==null?void 0:a.instansi_id)),Vt(i)}if(r.success&&Kt(r.data),n.success&&l.success){const i=n.data.find(j=>j.nama==="Surat");if(i){const j=l.data.filter(c=>c.jenis_dokumen_id===i.id);qt(j)}}}catch(t){console.error("Failed to fetch master data:",t)}},$e=(t,r)=>{Nt(t),St(r||null),xe(!0),P(null)},Xt=async t=>{const r=U.find(i=>i.id===t),n=(r==null?void 0:r.approval_status)==="APPROVED",l=n?'PERHATIAN: Surat ini sudah FINAL dan memiliki QR Code verifikasi. Menghapus surat ini akan membubuhkan status "DIBATALKAN" secara permanen pada sistem verifikasi. Apakah Anda yakin ingin membatalkan dokumen resmi ini?':"Apakah Anda yakin ingin menghapus catatan surat ini?";if(window.confirm(l))try{const i=await $.surat.delete(t);i.success?(f.success(n?"Dokumen resmi telah dibatalkan.":"Surat berhasil dihapus."),Y()):f.error("Gagal menghapus: "+i.message)}catch(i){console.error("Delete error:",i)}},[v,ea]=d.useState(null);d.useEffect(()=>{(async()=>{const r=await $.suratTemplate.getGlobal();r.success&&ea(r.data)})()},[]);const ta=async t=>{var V;let r=null;if(t.jenis_surat_id){const k=await $.suratTemplate.getById(t.jenis_surat_id);k.success&&(r=k.data)}const n=!!(r!=null&&r.use_global_settings),l=n&&v?v:r||t,i=l.font_size??12,j=l.line_height??1.5,c=l.text_align??"justify",_=(r==null?void 0:r.paragraph_spacing_before)||(n?v==null?void 0:v.paragraph_spacing_before:0)||0,T=(r==null?void 0:r.paragraph_spacing_after)||(n?v==null?void 0:v.paragraph_spacing_after:0)||0,le=(r==null?void 0:r.first_line_indent)||(n?v==null?void 0:v.first_line_indent:0)||0;if(Lt({marginTop:l.margin_top??20,marginBottom:l.margin_bottom??20,marginLeft:l.margin_left??30,marginRight:l.margin_right??20,paperSize:l.paper_size??"A4",fontSize:i,lineHeight:j,textAlign:c,fontFamily:l.font_family||n&&(v==null?void 0:v.font_family)||"Arial, sans-serif",paragraphSpacingBefore:_,paragraphSpacingAfter:T,firstLineIndent:le}),t.file_path)Et(t.file_path),Je(t.nama_file),qe(!0);else if(t.isi_surat){let k=t.isi_surat;try{const C=await $.internalInstansi.get(a.instansi_id),J=(t.perihal||"").toLowerCase().includes("cuti")||(t.jenis_surat_nama||"").toLowerCase().includes("cuti")||(r==null?void 0:r.has_detail_cuti);let w={};const oe=r?r.is_kop_surat_required:!0,de=J||(r==null?void 0:r.logo_path)==="none";C.success&&C.data&&C.data.instansiDetail&&(w=C.data.instansiDetail);let se="";if(oe&&w.nama_instansi_kop){if(de)se=`
                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                <span style="text-decoration: underline;">${String((w==null?void 0:w.nama_instansi_kop)||(w==null?void 0:w.instansi)||"")}</span>
                            </div>
                        `;else{const E=(r==null?void 0:r.kop_line_style)||"double";let S="";E==="single"?S='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>':E==="thick"?S='<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>':E==="double"?S=`
                                <div style="border-bottom: 2.25pt solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: 0.75pt solid #000; margin-top: 2pt;"></div>
                            `:E==="heavy-light"||E==="light-heavy"?S=`
                                <div style="border-bottom: ${E==="heavy-light"?"2.25pt":"0.75pt"} solid #000; margin-top: 4pt;"></div>
                                <div style="border-bottom: ${E==="heavy-light"?"0.75pt":"2.25pt"} solid #000; margin-top: 2pt;"></div>
                            `:E!=="none"&&(S='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>'),se=`
                            <div style="text-align: center; margin-bottom: 25px; position: relative;">
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
                                    <tr>
                                        <td style="width: 80px; text-align: left; vertical-align: middle; padding-right: 15px;">
                                            ${w.logo_kop_path?`<img src="${w.logo_kop_path}" style="width: 75px; height: auto; display: block;" />`:""}
                                        </td>
                                        <td style="text-align: center; vertical-align: middle; padding-right: 40px;">
                                            <div style="font-size: 13pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">PEMERINTAH KABUPATEN BOGOR</div>
                                            <div style="font-size: 15pt; font-weight: bold; line-height: 1.1; text-transform: uppercase;">
                                                ${(w.nama_instansi_kop||w.instansi||"").toUpperCase().replace(" RISET","<br/>RISET")}
                                            </div>
                                            <div style="font-size: 7pt; font-weight: normal; margin-top: 4px; line-height: 1.2;">
                                                ${w.alamat||""} Kode Pos ${w.kode_pos||""} Telp: ${w.telepon_kop||""} Faks: ${w.faks_kop||""}<br/>
                                                Laman: ${w.website_kop||"-"} | Pos-el: ${w.email_kop||"-"}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                ${S}
                            </div>
                        `}const Se=new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),Ae=(w.kecamatan||"Cibinong").charAt(0).toUpperCase()+(w.kecamatan||"Cibinong").slice(1).toLowerCase(),De=J?"":`
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
                                    <span style="display: inline-block; margin-left: 1.5rem;">${w.lokasi||"Tempat"}</span>
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
                    `,ze=`${String(window.location.origin)}?v=${t.verification_slug||""}`,Ee=typeof(w==null?void 0:w.logo_kop_path)=="string"?w.logo_kop_path:"",Ce=t.verification_slug?ze:"PREVIEW_ONLY",Ie=`
                        <div style="position: absolute; bottom: 5mm; left: 5mm; z-index: 50;">
                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                <img src="${g(Ce,Ee)}" style="width: 60px; height: 60px; display: block;" />
                            </div>
                        </div>
                    `;k=`
                        ${se}
                        <div style="text-align: right; margin-bottom: 20px; font-family: ${l.font_family||"Arial, sans-serif"}; font-size: ${i}pt;">
                            ${Ae}, ${Se}
                        </div>
                        ${De}
                        <div id="letter-content" style="font-family: ${n&&v?v.font_family:(r==null?void 0:r.font_family)||"Arial, sans-serif"}; font-size: ${i}pt; line-height: ${j}; text-align: ${c};">
                            <style>
                                ${Pe({paragraph_spacing_before:_,paragraph_spacing_after:T,first_line_indent:le})}
                            </style>
                            ${t.isi_surat||""}
                        </div>
                        ${Ie}
                        ${(()=>{let E=null;try{E=typeof t.metadata=="string"?JSON.parse(t.metadata):t.metadata}catch{}if(E&&E.eventData){const S=E.eventData;return`
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
                    `}}catch(C){console.error("Error fetching instance for preview:",C)}let I;try{const C=await $.internalInstansi.get(a.instansi_id);C.success&&(I=(V=C.data.instansiDetail)==null?void 0:V.logo_kop_path)}catch{}Pt(b(k,I)),Je(t.perihal||"Draft Surat"),he(!0)}else f.error("File fisik atau draft surat tidak tersedia.");P(null)},aa=(t,r)=>{if(t.stopPropagation(),G===r.id){P(null);return}const n=t.currentTarget.getBoundingClientRect(),l=window.innerHeight-n.bottom,i=n.top,c=l<120&&i>l?"up":"down";Tt({x:n.right,y:c==="down"?n.bottom+8:n.top-8,width:150,direction:c}),P(r.id)};d.useEffect(()=>{const t=n=>{G&&fe.current&&!fe.current.contains(n.target)&&P(null)},r=()=>P(null);return G&&(document.addEventListener("mousedown",t),window.addEventListener("scroll",r,!0)),()=>{document.removeEventListener("mousedown",t),window.removeEventListener("scroll",r,!0)}},[G]);const sa=({item:t})=>{const r=(i,j=!0,c)=>{switch(i){case"WAITING_APPROVAL":const _=c?c.replace("_"," ").replace(/\b\w/g,T=>T.toUpperCase()):j?"Persetujuan":"MENUNGGU";return{label:j?`Menunggu ${_}`:`MENUNGGU ${_.toUpperCase()}`,bg:"bg-amber-50",text:"text-amber-600",border:"border-amber-200"};case"APPROVED":return{label:j?"Disetujui":"DISETUJUI",bg:"bg-emerald-50",text:"text-emerald-600",border:"border-emerald-200"};case"REJECTED":return{label:j?"Ditolak":"DITOLAK",bg:"bg-rose-50",text:"text-rose-600",border:"border-rose-200"};case"RETURNED":return{label:j?"Dikembalikan":"DIKEMBALIKAN",bg:"bg-orange-50",text:"text-orange-600",border:"border-orange-200"};case"CANCELLED":return{label:j?"Batal":"BATAL",bg:"bg-slate-100",text:"text-slate-500",border:"border-slate-200"};default:return{label:i,bg:"bg-slate-50",text:"text-slate-600",border:"border-slate-200"}}};let n="";if(t.approval_status==="WAITING_APPROVAL")try{const i=typeof t.approval_chain=="string"?JSON.parse(t.approval_chain):t.approval_chain;if(Array.isArray(i)){const c=[...i].sort((_,T)=>_.urutan-T.urutan).find(_=>_.status!=="APPROVED");c&&(n=c.role)}}catch(i){console.error("Error parsing approval chain:",i)}const l=r(t.approval_status||"WAITING_APPROVAL",!0,n);return e.jsxs("div",{className:"flex items-center gap-2",children:[l&&e.jsx("div",{className:"group relative flex items-center",onMouseEnter:i=>Bt(i,t),onMouseLeave:Ot,children:e.jsxs("span",{className:`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${l.bg} ${l.text} ${l.border} flex items-center gap-1 cursor-help transition-all hover:scale-105 active:scale-95 shadow-sm`,children:[t.approval_status==="WAITING_APPROVAL"&&e.jsx(pe,{size:8}),t.approval_status==="APPROVED"&&e.jsx(dt,{size:8}),(t.approval_status==="REJECTED"||t.approval_status==="RETURNED")&&e.jsx(Te,{size:8}),l.label]})}),t.jenis_surat_nama&&e.jsx("span",{className:"text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase cursor-help transition-all hover:scale-105",onMouseEnter:i=>Ut(i,t),onMouseLeave:Ft,children:t.jenis_surat_nama})]})},at=U.filter(t=>{var l,i;const r=!re||((l=t.nomor_surat)==null?void 0:l.toLowerCase().includes(re.toLowerCase()))||((i=t.perihal)==null?void 0:i.toLowerCase().includes(re.toLowerCase()));return t.tipe_surat===h&&r}),ia=U.length,ra=U.filter(t=>t.tipe_surat==="masuk").length,na=U.filter(t=>t.tipe_surat==="keluar").length;return e.jsxs("div",{className:"space-y-2.5 p-4 pt-2",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-7 h-7 bg-ppm-slate rounded-lg flex items-center justify-center text-white shadow-lg shadow-ppm-slate/20 shrink-0",children:e.jsx(xa,{size:14})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base font-black text-slate-800 tracking-tight leading-none uppercase",children:"Manajemen Surat"}),e.jsx("p",{className:"text-slate-400 text-[9px] font-bold mt-0.5",children:"Arsip surat masuk & pembuatan surat otomatis."})]})]}),e.jsxs("div",{className:"flex flex-col md:flex-row items-start md:items-stretch gap-4",children:[e.jsxs("div",{className:"flex bg-slate-100/80 p-0.5 rounded-xl w-fit border border-slate-200/50 shadow-inner",children:[e.jsx("button",{onClick:()=>N("masuk"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${h==="masuk"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Masuk"}),e.jsx("button",{onClick:()=>N("keluar"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${h==="keluar"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Keluar"}),e.jsx("button",{onClick:()=>N("internal"),className:`px-4 h-7 rounded-lg font-black transition-all text-[9px] uppercase tracking-widest ${h==="internal"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-500 hover:text-slate-800"}`,children:"Surat Internal"})]}),e.jsxs("div",{className:"flex items-center gap-1.5 shrink-0 relative z-10",children:[e.jsxs("button",{onClick:()=>{(h==="keluar"||h==="internal")&&s?s("surat-maker"):$e(h)},className:"flex items-center gap-1 px-3 h-8 bg-ppm-slate text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-ppm-slate/30 transition-all active:scale-95",children:[e.jsx(rt,{size:12,strokeWidth:3}),h==="masuk"?"Registrasi Surat":h==="keluar"?"Buat Surat Keluar":"Buat Surat Internal"]}),(h==="internal"||h==="keluar")&&e.jsxs("button",{onClick:()=>$e(h),className:"flex items-center gap-1 px-3 h-8 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:shadow-lg hover:shadow-indigo-600/30 transition-all active:scale-95",children:[e.jsx(Le,{size:12,strokeWidth:3}),"Upload Surat"]}),x&&e.jsx("button",{onClick:()=>Ke(!0),className:"flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 border border-slate-200 shrink-0",title:"Tempat Sampah",children:e.jsx(Z,{size:14})})]})]})]}),e.jsx("div",{className:"bg-white p-1 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40",children:e.jsxs("div",{className:"flex flex-col lg:flex-row lg:items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-0.5 rounded-xl border border-slate-200/50 shadow-inner",children:[e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-white text-ppm-slate rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-100",children:e.jsx(W,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Total"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:ia})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(ua,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Masuk"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:ra})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(ga,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Keluar"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:na})]})]}),e.jsx("div",{className:"w-px h-5 bg-slate-200/50"}),e.jsxs("div",{className:"flex items-center gap-1.5 px-2",children:[e.jsx("div",{className:"w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm",children:e.jsx(W,{size:10})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none",children:"Internal"}),e.jsx("p",{className:"text-[10px] font-black text-slate-800 tabular-nums leading-tight",children:U.filter(t=>t.tipe_surat==="internal").length})]})]})]}),e.jsxs("div",{className:"flex flex-col md:flex-row items-center gap-3 flex-1 lg:justify-end pr-2",children:[(a==null?void 0:a.tipe_user_id)===1&&e.jsx("div",{className:"w-full md:w-56",children:e.jsx(pt,{label:"Instansi",placeholder:"Filter Instansi",value:A==="all"?null:A,options:[{id:"all",instansi:"Semua Instansi"},...Wt],displayField:"instansi",onChange:t=>{y(t==="all"?"all":Number(t)),He("all")},customClassName:"!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"})}),e.jsx("div",{className:"w-full md:w-56",children:e.jsx(pt,{label:"Bidang",placeholder:"Semua Bidang",value:D==="all"?null:D,options:[{id:"all",nama_bidang:"Semua Bidang"},...Gt],displayField:"nama_bidang",secondaryField:"singkatan",onChange:t=>He(t==="all"?"all":Number(t)),customClassName:"!h-[32px] !rounded-xl !bg-slate-50 !border-slate-100 !text-xs !font-bold shadow-inner"})}),e.jsxs("div",{className:"flex items-center gap-2 w-full md:w-auto",children:[e.jsxs("div",{className:"relative flex-1 md:w-64 group",children:[e.jsx(ha,{className:"absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors",size:14}),e.jsx("input",{type:"text",placeholder:"Cari surat / perihal...",className:"w-full h-8 pl-10 pr-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 text-[10px] shadow-inner",value:re,onChange:t=>jt(t.target.value)})]}),e.jsxs("div",{className:"flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 shadow-inner",children:[e.jsx("button",{onClick:()=>We("list"),className:`p-1 rounded-lg transition-all ${Ve==="list"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}`,title:"List View",children:e.jsx(nt,{size:14})}),e.jsx("button",{onClick:()=>We("grid"),className:`p-1 rounded-lg transition-all ${Ve==="grid"?"bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200":"text-slate-400 hover:text-slate-600"}`,title:"Grid View",children:e.jsx(fa,{size:14})})]})]})]})]})}),yt?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl",children:[e.jsx(Oe,{className:"animate-spin text-ppm-slate mb-4",size:40}),e.jsx("p",{className:"text-slate-500 font-extrabold text-sm uppercase tracking-widest",children:"Memuat Data Surat..."})]}):at.length===0?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center px-6",children:[e.jsx("div",{className:"w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border-4 border-white shadow-inner",children:e.jsx(W,{size:40})}),e.jsx("h3",{className:"text-xl font-black text-slate-800 mb-2",children:"Belum ada surat terdaftar"}),e.jsx("p",{className:"text-slate-500 max-w-xs font-medium",children:"Klik tombol di atas untuk mulai mencatat surat masuk atau membuat surat baru."})]}):e.jsx("div",{className:"bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden",children:e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-50/50 border-b border-slate-100 text-left",children:[e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Detail Surat"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Tagging/Tematik"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Dokumen"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center",children:"Status"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest",children:"Waktu"}),e.jsx("th",{className:"px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right",children:"Opsi"})]})}),e.jsx("tbody",{className:"divide-y divide-slate-50",children:at.map(t=>{var r;return e.jsxs("tr",{className:`group/row transition-all ${t.is_deleted?"bg-slate-50/40 opacity-60 grayscale-[0.5]":"hover:bg-slate-50/80"}`,children:[e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx("div",{className:`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.tipe_surat==="masuk"?"bg-blue-50 text-blue-500":t.tipe_surat==="keluar"?"bg-emerald-50 text-emerald-500":"bg-amber-50 text-amber-500"}`,children:e.jsx(ba,{size:18})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1",children:t.nomor_surat||"--"}),e.jsx("p",{className:"text-xs font-black text-slate-700 leading-tight group-hover/row:text-ppm-blue transition-colors capitalize",children:t.perihal.toLowerCase()}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-2 opacity-60 group-hover/row:opacity-100 transition-opacity",children:[e.jsx(va,{size:12,className:"text-slate-400"}),e.jsx("span",{className:"text-[10px] font-bold text-slate-500 truncate max-w-[200px]",children:t.tipe_surat==="internal"?t.nama_pengusul||"Internal":t.tipe_surat==="masuk"?t.asal_surat:t.tujuan_surat||t.asal_surat||"Internal"}),(t.singkatan_bidang||t.nama_bidang)&&e.jsx("span",{className:"text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter leading-none shrink-0",children:t.singkatan_bidang||t.nama_bidang})]})]})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"flex flex-col gap-1.5",children:[e.jsxs("div",{className:"flex items-center gap-2 text-slate-600",children:[e.jsx("div",{className:"p-1.5 bg-indigo-50 text-indigo-500 rounded-lg shrink-0",children:e.jsx(nt,{size:11,strokeWidth:3})}),e.jsx("span",{className:`text-[11px] font-black leading-tight max-w-[140px] truncate ${t.nama_kegiatan_terkait?"text-slate-900":"text-slate-400 italic font-medium"}`,children:t.nama_kegiatan_terkait||"Bebas"})]}),t.tematik_terkait&&e.jsx("div",{className:"flex flex-wrap gap-1",children:t.tematik_terkait.split(",").map((n,l)=>e.jsx("span",{className:"text-[8px] font-black uppercase tracking-tighter bg-indigo-100/50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-200/50 leading-none",children:n.trim()},l))})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{onClick:()=>ta(t),className:"flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-xl transition-all group/file",title:"Klik untuk Pratinjau",children:[e.jsx("div",{className:"p-2 bg-slate-50 rounded-lg text-slate-400 group-hover/file:bg-ppm-slate group-hover/file:text-white transition-all shadow-sm",children:e.jsx(W,{size:16})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-[11px] font-bold text-slate-600 break-all max-w-[180px] group-hover/file:text-ppm-blue transition-colors leading-tight",title:t.nama_file||"Dokumen",children:t.nama_file||(t.approval_status==="APPROVED"?"Surat Final":"Draf Surat")}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1",children:[e.jsx("p",{className:"text-[9px] font-black text-slate-400 uppercase tracking-tighter",children:(((r=t.nama_file)==null?void 0:r.split(".").pop())||(t.isi_surat?"":"PDF")).toUpperCase()}),t.is_deleted?e.jsx("span",{className:"text-[8px] font-black bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tighter leading-none",children:"Dibatalkan"}):e.jsx("span",{className:"text-[8px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter leading-none",children:"Digunakan"})]})]})]})}),e.jsx("td",{className:"px-4 py-3",children:e.jsx("div",{className:"flex justify-center",children:e.jsx(sa,{item:t})})}),e.jsx("td",{className:"px-4 py-3",children:e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex items-center gap-2 text-slate-600",children:[e.jsx(wa,{size:14,className:"text-slate-400"}),e.jsx("span",{className:"text-[11px] font-bold",children:new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})})]}),t.tanggal_acara&&e.jsxs("div",{className:"flex items-center gap-2 text-ppm-slate font-bold",children:[e.jsx(pe,{size:14}),e.jsxs("span",{className:"text-[10px] uppercase",children:["Acara: ",new Date(t.tanggal_acara).toLocaleDateString("id-ID",{day:"numeric",month:"short"})]})]})]})}),e.jsx("td",{className:"px-4 py-3 text-right",children:e.jsxs("div",{className:"flex items-center justify-end gap-2 transition-opacity",children:[!t.file_path&&e.jsx("button",{onClick:()=>{var n;ke(t.id),(n=q.current)==null||n.click()},className:"p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all",title:"Unggah Final (Fisik)",children:e.jsx(Le,{size:18})}),!t.file_path&&t.tipe_surat==="keluar"&&t.approval_status!=="APPROVED"?e.jsx("button",{className:"p-2 bg-slate-50 text-slate-300 rounded-xl cursor-not-allowed",title:"Belum dapat diunduh (Menunggu Persetujuan)",disabled:!0,children:e.jsx(lt,{size:18})}):e.jsx("a",{href:t.file_path||"#",download:t.nama_file||"dokumen",onClick:n=>{t.file_path||(n.preventDefault(),f.error("File fisik belum tersedia. Silakan cetak melalui menu opsi atau tunggu hingga disetujui."))},className:"p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all",title:"Unduh",children:e.jsx(lt,{size:18})}),e.jsx("div",{className:"relative",children:e.jsx("button",{onClick:n=>aa(n,t),className:`p-2 rounded-xl transition-all ${G===t.id?"bg-ppm-slate text-white":"bg-slate-100 text-slate-400 hover:bg-slate-200"}`,children:e.jsx(ya,{size:18})})})]})})]},t.id)})})]})})}),e.jsx(za,{isOpen:kt,onClose:()=>xe(!1),onSuccess:()=>{xe(!1),Y()},initialData:$t,defaultType:_t,user:a}),R&&e.jsxs("div",{ref:te,style:Rt,className:"fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[280px] max-w-[320px] overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200",onMouseEnter:Ze,onMouseLeave:Xe,children:[e.jsx("div",{className:"absolute top-0 left-0 w-1.5 h-full bg-blue-500"}),e.jsxs("div",{className:"flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 px-1",children:[e.jsx("div",{className:"p-1.5 bg-blue-50 text-blue-600 rounded-lg",children:e.jsx(ot,{size:16})}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-[11px] font-black text-slate-800 uppercase tracking-wider",children:"Riwayat Persetujuan"}),e.jsx("p",{className:"text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]",children:R.subject})]})]}),e.jsxs("div",{className:"space-y-4 relative",children:[e.jsx("div",{className:"absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100"}),R.chain.sort((t,r)=>t.urutan-r.urutan).map((t,r)=>{const n=t.status==="APPROVED",l=t.status==="PENDING"||t.status==="WAITING_APPROVAL",i=t.status==="REJECTED"||t.status==="RETURNED";return e.jsxs("div",{className:"flex gap-4 relative z-10",children:[e.jsx("div",{className:`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 transition-colors ${n?"bg-emerald-500 text-white":i?"bg-rose-500 text-white":"bg-amber-400 text-white"}`,children:n?e.jsx(dt,{size:10}):l?e.jsx(pe,{size:10}):e.jsx(Te,{size:10})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex flex-col",children:[e.jsx("p",{className:"text-[10px] font-black text-slate-700 truncate capitalize",children:t.role.replace("_"," ")}),t.logbook_status&&e.jsxs("span",{className:"text-[8px] font-bold text-rose-500 animate-pulse",children:["Pejabat ",t.logbook_status]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("span",{className:`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${n?"bg-emerald-50 text-emerald-600":i?"bg-rose-50 text-rose-600":t.status==="BYPASSED"?"bg-slate-100 text-slate-500":"bg-amber-50 text-amber-600"}`,children:t.status==="PENDING"?"MENUNGGU":t.status}),((a==null?void 0:a.tipe_user_id)===1||((a==null?void 0:a.tipe_user_id)===2||(a==null?void 0:a.tipe_user_id)===3)&&R.bidang_id===(a==null?void 0:a.bidang_id))&&t.status==="PENDING"&&e.jsx("button",{onClick:()=>Ht(t.id,t.approver_name),className:"w-4 h-4 flex items-center justify-center bg-slate-100 text-slate-400 hover:bg-amber-500 hover:text-white rounded-md transition-all group/bypass shadow-sm",title:"Lompati Tahap Ini (Bypass)",children:e.jsx(ja,{size:8})})]})]}),e.jsx("p",{className:"text-[11px] font-bold text-slate-800 truncate",children:t.approver_name||"..."}),t.reason&&e.jsx("div",{className:`mt-1.5 p-2 rounded-lg border ${t.status==="BYPASSED"?"bg-slate-50 border-slate-100":"bg-rose-50 border-rose-100"}`,children:e.jsxs("p",{className:`text-[9px] font-bold italic leading-snug ${t.status==="BYPASSED"?"text-slate-500":"text-rose-700"}`,children:['"',t.reason,'"']})})]})]},r)})]})]}),G&&K&&xt.createPortal(e.jsx("div",{ref:fe,className:"fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200",style:{top:`${K.y}px`,left:`${K.x-K.width}px`,width:`${K.width}px`,transform:K.direction==="up"?"translateY(-100%)":"none"},children:(()=>{const t=U.find(n=>n.id===G);if(!t)return null;const r=(o||m&&t.instansi_id===a.instansi_id||t.bidang_id===a.bidang_id)&&t.approval_status!=="APPROVED";return e.jsxs(e.Fragment,{children:[r&&e.jsxs("button",{onClick:()=>{t.tipe_surat==="internal"?(localStorage.setItem("edit_surat_id",String(t.id)),s&&s("surat-maker")):$e(t.tipe_surat,t),P(null)},className:"w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors",children:[e.jsx(ct,{size:14,className:"text-blue-500"}),"Ubah Data"]}),(t.approval_status==="APPROVED"||t.tipe_surat==="internal"&&t.approval_status==="WAITING_APPROVAL"&&t.isi_surat)&&e.jsxs("button",{onClick:async()=>{var n;if(t.approval_status==="APPROVED"&&t.file_path){window.open(t.file_path,"_blank"),P(null);return}try{const l=await $.internalInstansi.get(a.instansi_id);let i=null;if(t.jenis_surat_id){const k=await $.suratTemplate.getById(t.jenis_surat_id);k.success&&(i=k.data)}const j=(t.perihal||"").toLowerCase().includes("cuti")||(t.jenis_surat_nama||"").toLowerCase().includes("cuti")||(i==null?void 0:i.has_detail_cuti),c=(n=l.data)==null?void 0:n.instansiDetail;let _="";const T=i?i.is_kop_surat_required:!0,le=j||(i==null?void 0:i.logo_path)==="none";if(T&&c)if(le)_=`
                                                            <div style="text-align: left; font-weight: bold; margin-bottom: 2rem; text-transform: uppercase; line-height: 1.25;">
                                                                PEMERINTAH DAERAH KABUPATEN BOGOR<br/>
                                                                <span style="text-decoration: underline;">${String((c==null?void 0:c.nama_instansi_kop)||(c==null?void 0:c.instansi)||"")}</span>
                                                            </div>
                                                        `;else{const k=(i==null?void 0:i.kop_line_style)||"double";let I="";k==="single"?I='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>':k==="thick"?I='<div style="border-bottom: 3pt solid #000; margin-top: 4pt;"></div>':k==="double"||k==="heavy-light"||k==="light-heavy"?I=`
                                                                <div style="border-bottom: ${k==="double"||k==="heavy-light"?"2.25pt":"0.75pt"} solid #000; margin-top: 4pt;"></div>
                                                                <div style="border-bottom: ${k==="double"||k==="heavy-light"?"0.75pt":"2.25pt"} solid #000; margin-top: 2pt;"></div>
                                                            `:k!=="none"&&(I='<div style="border-bottom: 1.5pt solid #000; margin-top: 4pt;"></div>'),_=`
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
                                                        `}const V=window.open("","_blank");if(V){const k=!!(i!=null&&i.use_global_settings),I=(i==null?void 0:i.margin_top)??t.margin_top??20,C=(i==null?void 0:i.margin_bottom)??t.margin_bottom??20,J=(i==null?void 0:i.margin_left)??t.margin_left??30,w=(i==null?void 0:i.margin_right)??t.margin_right??20,oe=(i==null?void 0:i.paper_size)??t.paper_size??"A4",de=(i==null?void 0:i.font_size)??t.font_size??12,se=(i==null?void 0:i.line_height)??t.line_height??1.5,Se=(i==null?void 0:i.text_align)??t.text_align??"justify",Ae=(i==null?void 0:i.paragraph_spacing_before)||(k?v==null?void 0:v.paragraph_spacing_before:0)||0,De=(i==null?void 0:i.paragraph_spacing_after)||(k?v==null?void 0:v.paragraph_spacing_after:0)||0,ze=(i==null?void 0:i.first_line_indent)||(k?v==null?void 0:v.first_line_indent:0)||0,Ee=new Date(t.tanggal_surat).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),Ce=((c==null?void 0:c.kecamatan)||"Cibinong").charAt(0).toUpperCase()+((c==null?void 0:c.kecamatan)||"Cibinong").slice(1).toLowerCase(),Ie=j?"":`
                                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-family: Arial, sans-serif; font-size: ${de}pt;">
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
                                                    `,E=(i==null?void 0:i.nama_jenis_surat)||t.jenis_surat_nama||"Surat",S=t.nama_pengusul||"Internal",st=t.tanggal_acara||t.tanggal_surat,it=new Date(st).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),la=`${E} - ${S} - ${it}`,oa=`${String(window.location.origin)}?v=${t.verification_slug||""}`,da=typeof(c==null?void 0:c.logo_kop_path)=="string"?c.logo_kop_path:"",ca=t.verification_slug?oa:"PREVIEW_ONLY",pa=`
                                                        <div class="qr-footer">
                                                            <div style="padding: 4px; background: white; border: 1px solid #f1f5f9; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); display: flex; align-items: center; justify-content: center;">
                                                                <img src="${g(ca,da)}" style="width: 60px; height: 60px; display: block;" />
                                                            </div>
                                                        </div>
                                                    `;V.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>${la}</title>
                                                                <style>
                                                                    body { 
                                                                        font-family: ${(i==null?void 0:i.font_family)||k&&(v==null?void 0:v.font_family)||"Arial, sans-serif"}; 
                                                                        font-size: ${de}pt; 
                                                                        padding: ${I}mm ${w}mm ${C}mm ${J}mm; 
                                                                        margin: 0; 
                                                                        line-height: ${se}; 
                                                                        text-align: ${Se}; 
                                                                        box-sizing: border-box;
                                                                    }
                                                                    @page { 
                                                                        size: ${Q(oe).width} ${Q(oe).height}; 
                                                                        margin: 0; 
                                                                    }
                                                                    ${Pe({paragraph_spacing_before:Ae,paragraph_spacing_after:De,first_line_indent:ze})}
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
                                                                            padding: ${I}mm ${w}mm ${C}mm ${J}mm; 
                                                                            margin: 0; 
                                                                        } 
                                                                        .no-print { display: none; }
                                                                        .qr-footer { display: flex !important; }
                                                                    }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                ${_}
                                                                <div style="text-align: right; margin-bottom: 20px;">
                                                                    ${Ce}, ${Ee}
                                                                </div>
                                                                ${Ie}
                                                                <div class="document-content">
                                                                    ${t.isi_surat}
                                                                </div>
                                                                ${pa}
                                                            </body>
                                                        </html>
                                                    `),V.document.close(),setTimeout(()=>{V.print()},1500)}}catch(l){console.error("Failed to print document:",l),f.error("Gagal menyiapkan dokumen cetak.")}P(null)},className:"w-full px-4 py-2.5 text-left text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors",children:[e.jsx(ka,{size:14,className:"text-amber-500"}),"Cetak Dokumen"]}),x&&e.jsxs("button",{onClick:()=>{Xt(t.id),P(null)},className:`w-full px-4 py-2.5 text-left text-xs font-black flex items-center gap-2 transition-colors border-t border-slate-100 ${t.approval_status==="APPROVED"?"text-amber-600 hover:bg-amber-50":"text-rose-600 hover:bg-rose-50"}`,children:[e.jsx(Z,{size:14}),t.approval_status==="APPROVED"?"Batalkan Dokumen":"Hapus Dokumen"]})]})})()}),document.body),e.jsx(Da,{isOpen:Dt,onClose:()=>qe(!1),fileUrl:zt,fileName:Ye||"Dokumen"}),Ct&&e.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center p-4",children:[e.jsx("div",{className:"absolute inset-0 bg-slate-900/60 backdrop-blur-sm",onClick:()=>he(!1)}),e.jsxs("div",{className:"relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[95vh]",children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-indigo-50 text-indigo-600 rounded-lg",children:e.jsx(W,{size:20})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-bold text-slate-800 tracking-tight leading-none",children:Ye}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1",children:"Pratinjau Draft Dokumen"})]})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsxs("div",{className:"flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm",children:[e.jsx("button",{onClick:()=>ge(t=>Math.max(.5,t-.1)),className:"w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all",children:e.jsx(_a,{size:16})}),e.jsxs("div",{className:"w-12 text-center text-[10px] font-black text-slate-600 tabular-nums",children:[Math.round(ue*100),"%"]}),e.jsx("button",{onClick:()=>ge(t=>Math.min(2,t+.1)),className:"w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg transition-all",children:e.jsx(Na,{size:16})})]}),e.jsx("button",{onClick:()=>{he(!1),ge(.7)},className:"w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95",children:e.jsx(Ue,{size:18})})]})]}),e.jsx("div",{className:"flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8 flex flex-col items-center",children:e.jsxs("div",{className:"bg-white shadow-xl text-black transition-all duration-300 relative",style:{transform:`scale(${ue})`,transformOrigin:"top center",marginBottom:`${parseFloat(Q(z.paperSize).height)*ue-parseFloat(Q(z.paperSize).height)}mm`,width:Q(z.paperSize).width,height:Q(z.paperSize).height,padding:`${z.marginTop}mm ${z.marginRight}mm ${z.marginBottom}mm ${z.marginLeft}mm`,fontFamily:z.fontFamily,fontSize:`${z.fontSize}pt`,boxSizing:"border-box",lineHeight:z.lineHeight||"1.5",textAlign:z.textAlign||"justify",color:"black"},children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:Pe({paragraph_spacing_before:z.paragraphSpacingBefore,paragraph_spacing_after:z.paragraphSpacingAfter,first_line_indent:z.firstLineIndent})}}),e.jsx("div",{dangerouslySetInnerHTML:{__html:It}})]})})]})]}),e.jsx(xs,{isOpen:At,onClose:()=>Ke(!1),onRestore:()=>Y()}),e.jsx("input",{type:"file",ref:q,className:"hidden",accept:".pdf,.doc,.docx",onChange:Jt}),e.jsx(us,{isOpen:!!ae,onClose:()=>{_e(null),ke(null),q.current&&(q.current.value="")},onConfirm:Qt,file:ae,fileName:Ne,setFileName:et,isSubmitting:Yt}),L&&e.jsx("div",{ref:we,className:"fixed z-[10000] transition-opacity duration-200 animate-in fade-in zoom-in-95",style:Mt,onMouseEnter:Ze,onMouseLeave:Xe,children:e.jsxs("div",{className:"bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 min-w-[320px] max-w-[380px] overflow-hidden relative pointer-events-auto",children:[e.jsx("div",{className:"absolute top-0 left-0 w-1.5 h-full bg-slate-400"}),e.jsxs("div",{className:"flex items-center gap-3 mb-3 pb-3 border-b border-slate-50 px-1",children:[e.jsx("div",{className:"w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400",children:e.jsx(ot,{size:16})}),e.jsxs("div",{className:"flex flex-col min-w-0",children:[e.jsx("span",{className:"text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none",children:"Riwayat Perubahan"}),e.jsx("span",{className:"text-[9px] font-bold text-slate-400 truncate mt-1 italic uppercase tracking-tighter",children:L.subject})]})]}),e.jsx("div",{className:"space-y-4 max-h-[250px] overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent",children:[...L.history].sort((t,r)=>new Date(r.created_at).getTime()-new Date(t.created_at).getTime()).map((t,r)=>e.jsxs("div",{className:"relative pl-6 pb-4 last:pb-0",children:[r<L.history.length-1&&e.jsx("div",{className:"absolute left-[9px] top-[18px] bottom-0 w-px bg-slate-100"}),e.jsx("div",{className:`absolute left-0 top-0.5 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${t.aksi==="create"?"bg-emerald-500":t.aksi==="delete"?"bg-rose-500":t.aksi==="restore"?"bg-indigo-500":"bg-slate-400"}`,children:t.aksi==="create"?e.jsx(rt,{size:10,className:"text-white"}):t.aksi==="delete"?e.jsx(Z,{size:10,className:"text-white"}):t.aksi==="restore"?e.jsx($a,{size:10,className:"text-white"}):e.jsx(ct,{size:10,className:"text-white"})}),e.jsxs("div",{className:"flex flex-col",children:[e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsx("span",{className:"text-[10px] font-black text-slate-800 uppercase tracking-tight",children:t.aksi==="create"?"DIBUAT":t.aksi==="edit"?"DIUBAH":t.aksi==="delete"?"DIHAPUS":t.aksi==="restore"?"DIPULIHKAN":t.aksi.toUpperCase()}),e.jsxs("span",{className:"text-[9px] font-bold text-slate-300",children:[new Date(t.created_at).toLocaleDateString("id-ID",{day:"2-digit",month:"short"})," • ",new Date(t.created_at).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})]})]}),e.jsx("p",{className:"text-[10px] font-bold text-slate-500 mt-0.5 leading-snug",children:t.keterangan}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1.5",children:[e.jsx("div",{className:"w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center",children:e.jsx(Sa,{size:8,className:"text-slate-400"})}),e.jsxs("span",{className:"text-[9px] font-black text-slate-400 uppercase tracking-tighter",children:[t.user_nama," ",e.jsxs("span",{className:"font-bold opacity-60",children:["(",t.user_bidang,")"]})]})]})]})]},r))})]})})]})}export{js as default};
