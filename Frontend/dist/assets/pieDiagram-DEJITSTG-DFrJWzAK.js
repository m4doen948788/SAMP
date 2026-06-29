import{P as S,S as R,aD as Q,g as Y,s as tt,a as et,b as at,t as rt,q as nt,_ as u,l as z,c as it,G as st,K as ot,a3 as lt,e as ct,z as pt,H as ut}from"./NayaxaAssistant-Wfxr0pVs.js";import{p as gt}from"./chunk-4BX2VUAB-KWCO8aOs.js";import{p as dt}from"./wardley-RL74JXVD-CNDTKWa5.js";import{d as _}from"./arc-Kwz39a1h.js";import{o as ft}from"./ordinal-Cboi1Yqb.js";import"./index-BYSFN7IR.js";import"./index-Br7REqB6.js";import"./xlsx-DBGoCrgj.js";import"./purify.es-CFh60W_8.js";import"./_getTag-DTWdVYoG.js";import"./DocumentViewerModal-Kx-fHk2-.js";import"./_commonjs-dynamic-modules-TDtrdbi3.js";import"./min-HQw1VlMJ.js";import"./_baseUniq-BE-N1b0a.js";import"./_baseIsEqual-BbYUx4tQ.js";import"./init-Gi6I4Gst.js";function mt(t,a){return a<t?-1:a>t?1:a>=t?0:NaN}function ht(t){return t}function vt(){var t=ht,a=mt,f=null,y=S(0),s=S(R),g=S(0);function o(e){var n,l=(e=Q(e)).length,d,m,v=0,c=new Array(l),i=new Array(l),x=+y.apply(this,arguments),w=Math.min(R,Math.max(-R,s.apply(this,arguments)-x)),h,C=Math.min(Math.abs(w)/l,g.apply(this,arguments)),$=C*(w<0?-1:1),p;for(n=0;n<l;++n)(p=i[c[n]=n]=+t(e[n],n,e))>0&&(v+=p);for(a!=null?c.sort(function(A,D){return a(i[A],i[D])}):f!=null&&c.sort(function(A,D){return f(e[A],e[D])}),n=0,m=v?(w-l*$)/v:0;n<l;++n,x=h)d=c[n],p=i[d],h=x+(p>0?p*m:0)+$,i[d]={data:e[d],index:n,value:p,startAngle:x,endAngle:h,padAngle:C};return i}return o.value=function(e){return arguments.length?(t=typeof e=="function"?e:S(+e),o):t},o.sortValues=function(e){return arguments.length?(a=e,f=null,o):a},o.sort=function(e){return arguments.length?(f=e,a=null,o):f},o.startAngle=function(e){return arguments.length?(y=typeof e=="function"?e:S(+e),o):y},o.endAngle=function(e){return arguments.length?(s=typeof e=="function"?e:S(+e),o):s},o.padAngle=function(e){return arguments.length?(g=typeof e=="function"?e:S(+e),o):g},o}var xt=ut.pie,W={sections:new Map,showData:!1},T=W.sections,F=W.showData,St=structuredClone(xt),yt=u(()=>structuredClone(St),"getConfig"),wt=u(()=>{T=new Map,F=W.showData,pt()},"clear"),At=u(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);T.has(t)||(T.set(t,a),z.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),Dt=u(()=>T,"getSections"),Ct=u(t=>{F=t},"setShowData"),$t=u(()=>F,"getShowData"),V={getConfig:yt,clear:wt,setDiagramTitle:nt,getDiagramTitle:rt,setAccTitle:at,getAccTitle:et,setAccDescription:tt,getAccDescription:Y,addSection:At,getSections:Dt,setShowData:Ct,getShowData:$t},Tt=u((t,a)=>{gt(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),bt={parse:u(async t=>{const a=await dt("pie",t);z.debug(a),Tt(a,V)},"parse")},kt=u(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),Et=kt,Mt=u(t=>{const a=[...t.values()].reduce((s,g)=>s+g,0),f=[...t.entries()].map(([s,g])=>({label:s,value:g})).filter(s=>s.value/a*100>=1);return vt().value(s=>s.value).sort(null)(f)},"createPieArcs"),Rt=u((t,a,f,y)=>{var O;z.debug(`rendering pie chart
`+t);const s=y.db,g=it(),o=st(s.getConfig(),g.pie),e=40,n=18,l=4,d=450,m=d,v=ot(a),c=v.append("g");c.attr("transform","translate("+m/2+","+d/2+")");const{themeVariables:i}=g;let[x]=lt(i.pieOuterStrokeWidth);x??(x=2);const w=o.textPosition,h=Math.min(m,d)/2-e,C=_().innerRadius(0).outerRadius(h),$=_().innerRadius(h*w).outerRadius(h*w);c.append("circle").attr("cx",0).attr("cy",0).attr("r",h+x/2).attr("class","pieOuterCircle");const p=s.getSections(),A=Mt(p),D=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let b=0;p.forEach(r=>{b+=r});const G=A.filter(r=>(r.data.value/b*100).toFixed(0)!=="0"),k=ft(D).domain([...p.keys()]);c.selectAll("mySlices").data(G).enter().append("path").attr("d",C).attr("fill",r=>k(r.data.label)).attr("class","pieCircle"),c.selectAll("mySlices").data(G).enter().append("text").text(r=>(r.data.value/b*100).toFixed(0)+"%").attr("transform",r=>"translate("+$.centroid(r)+")").style("text-anchor","middle").attr("class","slice");const U=c.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),L=[...p.entries()].map(([r,M])=>({label:r,value:M})),E=c.selectAll(".legend").data(L).enter().append("g").attr("class","legend").attr("transform",(r,M)=>{const I=n+l,X=I*L.length/2,Z=12*n,J=M*I-X;return"translate("+Z+","+J+")"});E.append("rect").attr("width",n).attr("height",n).style("fill",r=>k(r.label)).style("stroke",r=>k(r.label)),E.append("text").attr("x",n+l).attr("y",n-l).text(r=>s.getShowData()?`${r.label} [${r.value}]`:r.label);const j=Math.max(...E.selectAll("text").nodes().map(r=>(r==null?void 0:r.getBoundingClientRect().width)??0)),q=m+e+n+l+j,N=((O=U.node())==null?void 0:O.getBoundingClientRect().width)??0,H=m/2-N/2,K=m/2+N/2,P=Math.min(0,H),B=Math.max(q,K)-P;v.attr("viewBox",`${P} 0 ${B} ${d}`),ct(v,d,B,o.useMaxWidth)},"draw"),zt={draw:Rt},Zt={parser:bt,db:V,renderer:zt,styles:Et};export{Zt as diagram};
