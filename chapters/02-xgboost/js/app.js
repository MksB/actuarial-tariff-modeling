const DATA_URL="data/chapter2_xgb.json";
const SPEC_URL="data/chapter2_story_spec.json";
const EUR=(v,d=2)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));
const PCT=(v,d=0)=>`${(Number(v)*100).toFixed(d)}%`;
const NUMBER=(v,d=0)=>new Intl.NumberFormat("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));
function resolvePath(root,ref){if(!ref||!ref.startsWith("$.") )throw new Error(`Unsupported data path: ${ref}`);return ref.slice(2).split(".").reduce((acc,key)=>{const i=key.match(/^(.+)\[(\d+)\]$/);return i?acc?.[i[1]]?.[Number(i[2])]:acc?.[key]},root)}
async function load(){const [a,b]=await Promise.all([fetch(DATA_URL),fetch(SPEC_URL)]);if(!a.ok||!b.ok)throw new Error("Chapter 2 data could not be loaded.");return{data:await a.json(),spec:await b.json()}}
const s={data:null,spec:null,portfolio:[],chart:null,chartReady:false,lastIndex:-1,scrollTicking:false};

function bind1(){const sc=s.spec.scenes.find(x=>x.id==="ch2_s01_same_book_different_surface"),b=sc.data_bindings,get=r=>resolvePath(s.data,r);
document.getElementById("policy-count").textContent=`${NUMBER(get(b.n_policies))} POLICIES · SAME INPUT`;
document.getElementById("glm-median").textContent=EUR(get(b.glm_median));
document.getElementById("xgb-median").textContent=EUR(get(b.xgb_median));
document.getElementById("xgb-higher").textContent=PCT(get(b.xgb_higher_share));
document.getElementById("within-10").textContent=PCT(get(b.within_10pct_share));
document.getElementById("median-diff").textContent=EUR(get(b.difference_median));
document.getElementById("surface-glm").textContent=EUR(get(b.glm_median));
document.getElementById("surface-xgb").textContent=EUR(get(b.xgb_median));
document.getElementById("surface-share").textContent=PCT(get(b.xgb_higher_share));}

function bind2(){const sc=s.spec.scenes.find(x=>x.id==="ch2_s02_the_disagreement"),g=r=>resolvePath(s.data,r);
document.getElementById("scatter-median").textContent=EUR(g(sc.data_bindings.difference_median));
document.getElementById("scatter-range").textContent=`${EUR(g(sc.data_bindings.difference_p05))} / ${EUR(g(sc.data_bindings.difference_p95))}`;
document.getElementById("scatter-data-status").textContent=`DATA · ${NUMBER(s.portfolio.length)} data points loaded`;}

async function drawScatter(){if(!window.Plotly||s.chartReady)return;
const pts=s.portfolio,x=pts.map(p=>+p.glm),y=pts.map(p=>+p.xgb),all=x.concat(y).filter(v=>v>0),lo=Math.max(Math.min(...all)*.8,.01),hi=Math.max(...all)*1.08;
const gm=resolvePath(s.data,"$.summary.glm_median"),xm=resolvePath(s.data,"$.summary.xgb_median");
const traces=[
{x:[lo,hi],y:[lo,hi],type:"scatter",mode:"lines",line:{color:"rgba(255,255,255,.18)",width:1,dash:"dot"},hoverinfo:"skip"},
{x,y,type:"scattergl",mode:"markers",customdata:pts.map(p=>[p.policy,p.difference,p.ratio]),marker:{size:6,color:"#7ad7ff",opacity:.56},hovertemplate:"Policy %{customdata[0]}<br>GLM: €%{x:.2f}<br>XGB: €%{y:.2f}<br>Δ: €%{customdata[1]:.2f}<br>Ratio: %{customdata[2]:.2f}×<extra></extra>"},
{x:[gm,gm],y:[lo,hi],type:"scatter",mode:"lines",line:{color:"rgba(255,255,255,.38)",width:1,dash:"dash"},hoverinfo:"skip"},
{x:[lo,hi],y:[xm,xm],type:"scatter",mode:"lines",line:{color:"rgba(114,213,197,.55)",width:1,dash:"dash"},hoverinfo:"skip"},
{x:[x[0]],y:[y[0]],type:"scatter",mode:"markers",marker:{size:16,color:"#fff",line:{width:2,color:"#d8ff3e"}},hoverinfo:"skip"}];
const layout={margin:{l:52,r:14,t:10,b:50},paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",font:{color:"#9aa2aa",family:"Inter,system-ui,sans-serif",size:10},showlegend:false,
xaxis:{type:"log",range:[Math.log10(lo),Math.log10(hi)],title:{text:"GLM Pure Premium (€)",font:{size:10,color:"#707780"}},gridcolor:"rgba(255,255,255,.055)",zerolinecolor:"rgba(255,255,255,.07)"},
yaxis:{type:"log",range:[Math.log10(lo),Math.log10(hi)],title:{text:"XGBoost Pure Premium (€)",font:{size:10,color:"#707780"}},gridcolor:"rgba(255,255,255,.055)",zerolinecolor:"rgba(255,255,255,.07)"}};
await Plotly.newPlot("scatter-chart",traces,layout,{responsive:true,displayModeBar:false});
s.chart=document.getElementById("scatter-chart");s.chartReady=true;updateMarker(0);}

function updateMarker(i){if(!s.chartReady||!s.chart)return;i=Math.max(0,Math.min(i,s.portfolio.length-1));if(i===s.lastIndex)return;const p=s.portfolio[i];
Plotly.restyle(s.chart,{x:[[+p.glm]],y:[[+p.xgb]]},[4]);s.lastIndex=i;
document.getElementById("scatter-counter").textContent=`POLICY ${NUMBER(i+1)} / ${NUMBER(s.portfolio.length)}`;}

function setupCases(){const sc=s.spec.scenes.find(x=>x.id==="ch2_s03_one_policy_two_prices");
const cases={agreement_case:resolvePath(s.data,sc.data_bindings.agreement_case),increase_case:resolvePath(s.data,sc.data_bindings.increase_case),decrease_case:resolvePath(s.data,sc.data_bindings.decrease_case)};
const captions={agreement_case:"A case in which the pure premiums are almost identical, despite very different frequency and severity components.",increase_case:"A case in which XGBoost implies a higher pure premium.",decrease_case:"A case in which XGBoost implies a lower pure premium."};
const render=id=>{const c=cases[id];document.querySelectorAll(".case-tab").forEach(b=>b.classList.toggle("active",b.dataset.case===id));
document.getElementById("case-caption").textContent=captions[id];document.getElementById("case-policy").textContent=String(c.policy);
document.getElementById("case-glm").textContent=EUR(c.glm_pure_premium_eur);document.getElementById("case-xgb").textContent=EUR(c.xgb_pure_premium_eur);
document.getElementById("case-diff").textContent=`${c.difference_eur>=0?"+":""}${EUR(c.difference_eur)}`;
document.getElementById("case-ratio").textContent=`${Number(c.ratio).toFixed(2)}×`;
document.getElementById("case-note").textContent=`Frequency ${Number(c.glm_frequency).toFixed(4)} → ${Number(c.xgb_frequency).toFixed(4)} · Severity ${EUR(c.glm_severity_eur,0)} → ${EUR(c.xgb_severity_eur,0)} · Exposure ${NUMBER(c.exposure,2)}.`};
document.querySelectorAll(".case-tab").forEach(b=>b.addEventListener("click",()=>render(b.dataset.case)));render("agreement_case");}

function setupScroll(){
const surface=document.querySelector(".surface-story"),scatter=document.querySelector(".scatter-story"),cases=document.querySelector(".cases-story");
const update=()=>{s.scrollTicking=false;
let r=surface.getBoundingClientRect(),p=Math.min(1,Math.max(0,-r.top/Math.max(1,surface.offsetHeight-innerHeight))),e=p*p*(3-2*p);
surface.querySelector(".bar-glm").style.transform=`scaleX(${1-.1*e})`;surface.querySelector(".bar-xgb").style.transform=`scaleX(${1+.2*e})`;
let f=surface.querySelector(".sticky-frame");f.style.setProperty("--camera-y",`${((p-.5)*-20).toFixed(2)}px`);f.style.setProperty("--camera-scale",(1+p*.016).toFixed(4));f.style.setProperty("--camera-rotate",`${((p-.5)*.35).toFixed(3)}deg`);
r=scatter.getBoundingClientRect();p=Math.min(1,Math.max(0,-r.top/Math.max(1,scatter.offsetHeight-innerHeight)));updateMarker(Math.round(p*(s.portfolio.length-1)));
f=scatter.querySelector(".sticky-frame");f.style.setProperty("--camera-y",`${((p-.5)*-20).toFixed(2)}px`);f.style.setProperty("--camera-scale",(1+p*.018).toFixed(4));f.style.setProperty("--camera-rotate",`${((p-.5)*.3).toFixed(3)}deg`);
r=cases.getBoundingClientRect();p=Math.min(1,Math.max(0,-r.top/Math.max(1,cases.offsetHeight-innerHeight)));f=cases.querySelector(".sticky-frame");f.style.setProperty("--camera-y",`${((p-.5)*-18).toFixed(2)}px`);f.style.setProperty("--camera-scale",(1+p*.014).toFixed(4));f.style.setProperty("--camera-rotate",`${((p-.5)*.25).toFixed(3)}deg`);
const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);document.getElementById("progress-bar").style.transform=`scaleX(${Math.min(1,Math.max(0,scrollY/max))})`;};
const schedule=()=>{if(s.scrollTicking)return;s.scrollTicking=true;requestAnimationFrame(update)};
addEventListener("scroll",schedule,{passive:true});addEventListener("resize",schedule,{passive:true});schedule();}

function reveal(){const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-visible");o.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll(".scene-reveal").forEach(x=>o.observe(x));}

async function main(){try{const {data,spec}=await load();s.data=data;s.spec=spec;s.portfolio=resolvePath(data,"$.portfolio");if(!Array.isArray(s.portfolio)||!s.portfolio.length)throw new Error("Portfolio data array is empty.");bind1();bind2();setupCases();reveal();setupScroll();
const wait=()=>window.Plotly?drawScatter():setTimeout(wait,80);wait();}catch(e){console.error(e);document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:30px;color:#f1f0eb;background:#080a0c;font-family:system-ui"><div><p style="color:#d8ff3e;letter-spacing:.15em;text-transform:uppercase;font-size:10px">TARIFF LAB / 02</p><h1>Story data could not be loaded.</h1><p>${e.message}</p></div></main>`}}
main();
