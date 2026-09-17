const DATA_URL="data/chapter3_shap.json";
const SPEC_URL="data/chapter3_story_spec.json";
const NUM=(v,d=4)=>new Intl.NumberFormat("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));

async function loadData(){
  const [a,b]=await Promise.all([fetch(DATA_URL),fetch(SPEC_URL)]);
  if(!a.ok||!b.ok)throw new Error("Chapter 3 data contract could not be loaded.");
  return{data:await a.json(),spec:await b.json()};
}

const state={data:null,spec:null,ticking:false,depReady:false,wfReady:false};

function setupReveal(){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.12});
  document.querySelectorAll(".scene-reveal").forEach(el=>observer.observe(el));
}

function setupScroll(){
  const scenes=[...document.querySelectorAll(".scrolly-scene")];
  const update=()=>{
    state.ticking=false;
    scenes.forEach(scene=>{
      const frame=scene.querySelector(".sticky-frame");
      const r=scene.getBoundingClientRect();
      const travel=Math.max(1,scene.offsetHeight-innerHeight);
      const p=Math.min(1,Math.max(0,-r.top/travel));
      frame.style.setProperty("--camera-y",`${((p-.5)*-18).toFixed(2)}px`);
      frame.style.setProperty("--camera-scale",(1+p*.014).toFixed(4));
      frame.style.setProperty("--camera-rotate",`${((p-.5)*.24).toFixed(3)}deg`);
    });
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    document.getElementById("progress-bar").style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/max))})`;
  };
  const schedule=()=>{if(state.ticking)return;state.ticking=true;requestAnimationFrame(update)};
  addEventListener("scroll",schedule,{passive:true});
  addEventListener("resize",schedule,{passive:true});
  schedule();
}

function isReady(data){
  const c=data&&data.story_contract;
  return !!c && data.status==="ready"
    && Array.isArray(c.global_importance&&c.global_importance.values) && c.global_importance.values.length>0
    && Array.isArray(c.feature_dependence&&c.feature_dependence.rows) && c.feature_dependence.rows.length>0
    && Array.isArray(c.individual_case&&c.individual_case.values) && c.individual_case.values.length>0;
}

function baseLayout(extra){
  return Object.assign({margin:{l:16,r:16,t:10,b:30},paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",
    font:{color:"#9aa2aa",family:"Inter,system-ui,sans-serif",size:10},showlegend:false},extra);
}

function accentBlend(t){
  const a=[122,215,255],b=[216,255,62];
  const c=a.map((v,i)=>Math.round(v+(b[i]-v)*Math.min(1,Math.max(0,t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function renderFeatureBars(values){
  const sorted=[...values].sort((a,b)=>a.mean_abs_shap-b.mean_abs_shap);
  const trace={x:sorted.map(v=>v.mean_abs_shap),y:sorted.map(v=>v.feature),type:"bar",orientation:"h",
    marker:{color:"#d8ff3e"},hovertemplate:"%{y}<br>Mean |SHAP|: %{x:.4f}<extra></extra>"};
  const layout=baseLayout({margin:{l:120,r:30,t:10,b:34},
    xaxis:{title:{text:"Mean |SHAP| (Log-Skala)",font:{size:9,color:"#707780"}},gridcolor:"rgba(255,255,255,.055)",zerolinecolor:"rgba(255,255,255,.07)"},
    yaxis:{automargin:true}});
  document.querySelector("#feature-bars .pending-state").hidden=true;
  document.getElementById("feature-bars-chart").hidden=false;
  Plotly.newPlot("feature-bars-chart",[trace],layout,{responsive:true,displayModeBar:false});
}

function beeswarmTraces(rows){
  return rows.map((row,i)=>{
    const vals=row.points.map(p=>p.feature_value);
    const lo=Math.min(...vals),hi=Math.max(...vals),span=(hi-lo)||1;
    const yBase=rows.length-1-i;
    return{
      x:row.points.map(p=>p.shap_value),
      y:row.points.map(()=>yBase+(Math.random()-0.5)*0.72),
      type:"scattergl",mode:"markers",
      marker:{size:5,opacity:.72,color:vals.map(v=>accentBlend((v-lo)/span))},
      customdata:row.points.map(p=>[p.policy,p.feature_value]),
      hovertemplate:`${row.feature}<br>Policy %{customdata[0]}<br>Value: %{customdata[1]:.2f}<br>SHAP: %{x:.4f}<extra></extra>`,
      name:row.feature
    };
  });
}

function dependenceTrace(row){
  return[{x:row.points.map(p=>p.feature_value),y:row.points.map(p=>p.shap_value),type:"scattergl",mode:"markers",
    marker:{size:6,color:"#7ad7ff",opacity:.6},customdata:row.points.map(p=>p.policy),
    hovertemplate:`Policy %{customdata}<br>${row.feature}: %{x:.2f}<br>SHAP: %{y:.4f}<extra></extra>`}];
}

function renderDependence(mode){
  const rows=state.data.story_contract.feature_dependence.rows;
  const topFeatures=state.data.story_contract.feature_dependence.top_features;
  const draw=state.depReady?Plotly.react:Plotly.newPlot;
  if(mode==="beeswarm"){
    const layout=baseLayout({margin:{l:100,r:20,t:10,b:34},
      xaxis:{title:{text:"SHAP-Value (Log-Skala)",font:{size:9,color:"#707780"}},zeroline:true,zerolinecolor:"rgba(255,255,255,.18)",gridcolor:"rgba(255,255,255,.05)"},
      yaxis:{tickvals:rows.map((_,i)=>rows.length-1-i),ticktext:topFeatures,range:[-0.6,rows.length-0.4]}});
    draw("dependence-chart",beeswarmTraces(rows),layout,{responsive:true,displayModeBar:false});
    document.getElementById("dependence-readout-value").textContent="Beeswarm · Top-5-Features";
  }else{
    const row=rows.find(r=>r.feature===mode);
    const layout=baseLayout({margin:{l:52,r:14,t:10,b:44},
      xaxis:{title:{text:mode,font:{size:9,color:"#707780"}},gridcolor:"rgba(255,255,255,.05)"},
      yaxis:{title:{text:"SHAP-Value",font:{size:9,color:"#707780"}},zeroline:true,zerolinecolor:"rgba(255,255,255,.18)",gridcolor:"rgba(255,255,255,.05)"}});
    draw("dependence-chart",dependenceTrace(row),layout,{responsive:true,displayModeBar:false});
    document.getElementById("dependence-readout-value").textContent=mode;
  }
  state.depReady=true;
  document.querySelectorAll(".dependence-pill").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
}

function setupDependence(){
  const top=state.data.story_contract.feature_dependence.top_features;
  const wrap=document.getElementById("dependence-pills");
  wrap.innerHTML=`<button class="case-tab dependence-pill active" data-mode="beeswarm">Beeswarm</button>`
    +top.map(f=>`<button class="case-tab dependence-pill" data-mode="${f}">${f}</button>`).join("");
  wrap.hidden=false;
  wrap.querySelectorAll(".dependence-pill").forEach(b=>b.addEventListener("click",()=>renderDependence(b.dataset.mode)));
  document.querySelector(".dependence-stage .curve-placeholder").hidden=true;
  document.getElementById("dependence-chart").hidden=false;
  renderDependence("beeswarm");
}

function waterfallTrace(caseObj,maxBars){
  const sorted=[...caseObj.contributions].sort((a,b)=>Math.abs(b.shap_value)-Math.abs(a.shap_value));
  const top=sorted.slice(0,maxBars),rest=sorted.slice(maxBars);
  const restSum=rest.reduce((acc,c)=>acc+c.shap_value,0);
  const labels=["Underlying asset",...top.map(c=>c.feature)];
  const values=[caseObj.base_value,...top.map(c=>c.shap_value)];
  const measure=["total",...top.map(()=>"relative")];
  if(rest.length){labels.push(`Other ${rest.length} Features`);values.push(restSum);measure.push("relative");}
  const finalLog=caseObj.base_value+sorted.reduce((acc,c)=>acc+c.shap_value,0);
  labels.push("Log-Prediction");values.push(finalLog);measure.push("total");
  return{finalLog,trace:{type:"waterfall",orientation:"v",x:labels,y:values,measure,
    connector:{line:{color:"rgba(255,255,255,.16)",width:1}},
    increasing:{marker:{color:"#7ad7ff"}},decreasing:{marker:{color:"rgba(240,241,235,.4)"}},totals:{marker:{color:"#d8ff3e"}},
    texttemplate:"%{y:.3f}",textposition:"outside",textfont:{size:9,color:"#9aa2aa"}}};
}

function renderWaterfall(caseKey){
  const caseObj=state.data.story_contract.individual_case.values.find(c=>c.case===caseKey);
  if(!caseObj)return;
  const{trace,finalLog}=waterfallTrace(caseObj,6);
  const freq=Math.exp(finalLog);
  const layout=baseLayout({margin:{l:48,r:20,t:34,b:76},
    xaxis:{tickangle:-28,tickfont:{size:9}},
    yaxis:{title:{text:"Log-Scale (linear predictor)",font:{size:9,color:"#707780"}},gridcolor:"rgba(255,255,255,.05)",zeroline:true,zerolinecolor:"rgba(255,255,255,.18)"},
    annotations:[{x:0,xref:"paper",xanchor:"left",y:1.12,yref:"paper",yanchor:"bottom",showarrow:false,
      text:`Policy ${caseObj.policy} · equals frequency ${NUM(freq)}`,font:{size:10,color:"#d8ff3e"}}]});
  const draw=state.wfReady?Plotly.react:Plotly.newPlot;
  draw("waterfall-chart",[trace],layout,{responsive:true,displayModeBar:false});
  state.wfReady=true;
  document.querySelectorAll(".case-tab[data-case]").forEach(b=>b.classList.toggle("active",b.dataset.case===caseKey));
}

function setupWaterfall(){
  document.querySelectorAll(".case-tab[data-case]").forEach(b=>b.addEventListener("click",()=>renderWaterfall(b.dataset.case)));
  document.querySelector(".waterfall-placeholder").hidden=true;
  document.getElementById("waterfall-chart").hidden=false;
  { const cs=state.data.story_contract.individual_case.values.slice().sort((a,b)=>a.predicted_frequency-b.predicted_frequency); renderWaterfall(cs[0].case); }
}

function renderResultLayer(){
  renderFeatureBars(state.data.story_contract.global_importance.values);
  setupDependence();
  setupWaterfall();
}

async function main(){
  try{
    const{data,spec}=await loadData();
    state.data=data;state.spec=spec;
    document.body.dataset.status=data.status;
    const st=document.getElementById("shap-data-status");
    if(st) st.textContent = data.status === "awaiting_shap_result_export"
      ? "SHAP DATA · RESULT EXPORT PENDING — NO SYNTHETIC VALUES"
      : "SHAP DATA · LOADED";
    setupReveal();setupScroll();
    const ordered=state.data.story_contract.individual_case.values.slice().sort((a,b)=>a.predicted_frequency-b.predicted_frequency);
    const labels=["Lower predicted frequency","Middle predicted frequency","Higher predicted frequency"];
    ordered.forEach((c,i)=>{const b=document.querySelector(`.case-tab[data-case="${c.case}"]`); if(b) b.textContent=labels[i];});
    if(isReady(data)){
      const wait=()=>window.Plotly?renderResultLayer():setTimeout(wait,80);
      wait();
    }
  }catch(e){
    console.error(e);
    document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:30px;color:#f1f0eb;background:#080a0c;font-family:system-ui"><div><p style="color:#d8ff3e;letter-spacing:.15em;text-transform:uppercase;font-size:10px">TARIFF LAB / 03</p><h1>Chapter 3 data contract could not be loaded.</h1><p>${e.message}</p></div></main>`;
  }
}
main();
