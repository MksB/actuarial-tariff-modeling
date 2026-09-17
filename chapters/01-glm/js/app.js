const DATA_URL = "data/chapter1_glm.json";
const SPEC_URL = "data/chapter1_story_spec.json";

const EUR = (value, digits = 2) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value));

const NUMBER = (value, digits = 0) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value));

const RATE = (value) => Number(value).toFixed(4);

function resolvePath(root, ref) {
  if (!ref || !ref.startsWith("$.")) throw new Error(`Unsupported data path: ${ref}`);
  return ref.slice(2).split(".").reduce((acc, key) => {
    const index = key.match(/^(.+)\[(\d+)\]$/);
    if (index) return acc?.[index[1]]?.[Number(index[2])];
    return acc?.[key];
  }, root);
}

async function loadStoryData() {
  const [dataRes, specRes] = await Promise.all([fetch(DATA_URL), fetch(SPEC_URL)]);
  if (!dataRes.ok || !specRes.ok) throw new Error("Story data could not be loaded.");
  return { data: await dataRes.json(), spec: await specRes.json() };
}

const storyState = {
  data: null,
  spec: null,
  activeCurve: "driver_age",
  curves: {},
  chart: null,
  chartInitialized: false,
  lastMarkerIndex: -1,
  scrollTicking: false
};

function bindScene1() {
  const scene = storyState.spec.scenes.find(s => s.id === "ch1_s01_customer");
  const b = scene.data_bindings;

  const set = (id, ref, formatter = v => v) => {
    document.getElementById(id).textContent = formatter(resolvePath(storyState.data, ref));
  };

  set("policy-id", b.policy);
  set("driver-age", b.driver_age, v => NUMBER(v));
  set("bonus-malus", b.bonus_malus, v => NUMBER(v));
  set("vehicle-age", b.vehicle_age, v => NUMBER(v));
  set("vehicle-power", b.vehicle_power, v => NUMBER(v));
  set("vehicle-brand", b.vehicle_brand);
  set("area", b.area);
  set("density", b.density, v => NUMBER(v));
  set("region", b.region);
  set("exposure", b.exposure, v => NUMBER(v, 1));

  const heroRef = scene.display.hero_value.value_ref;
  document.getElementById("hero-price").textContent = EUR(resolvePath(storyState.data, heroRef));
}

function bindScene2() {
  const scene = storyState.spec.scenes.find(s => s.id === "ch1_s02_build_price");
  const f = resolvePath(storyState.data, scene.data_bindings.frequency);
  const s = resolvePath(storyState.data, scene.data_bindings.severity);
  const pp = resolvePath(storyState.data, scene.data_bindings.pure_premium);

  document.getElementById("scene2-title").textContent = scene.title;
  document.getElementById("frequency-value").textContent = RATE(f);
  document.getElementById("severity-value").textContent = EUR(s, 0);
  document.getElementById("pure-premium-value").textContent = EUR(pp);
  document.getElementById("stage-result").textContent = EUR(pp);
  document.getElementById("scene2-insight").textContent = scene.insight;

  storyState.formulaValues = { frequency: f, severity: s, purePremium: pp };
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .12 });

  document.querySelectorAll(".scene-reveal").forEach(el => observer.observe(el));
}

function setupFormulaScene() {
  const scene = document.querySelector(".formula-scene");
  const canvas = document.querySelector(".formula-canvas");
  const stepLabel = document.getElementById("formula-step-label");
  const parts = [...document.querySelectorAll(".formula-readout [data-step]")];
  const labels = [
    "01 · Frequency",
    "02 · Severity",
    "03 · Multiplication",
    "04 · Pure Premium"
  ];

  function update(progress) {
    let step = 1;
    if (progress >= .26) step = 2;
    if (progress >= .52) step = 3;
    if (progress >= .77) step = 4;

    scene.dataset.step = String(step);
    canvas.dataset.phase = String(step);

    parts.forEach(el => {
      const target = Number(el.dataset.step);
      const enabled = target === 3 ? step >= 3 : step >= target;
      el.classList.toggle("on", enabled);
    });

    stepLabel.textContent = labels[step - 1];

    // Camera movement stays in compositor-friendly CSS transforms.
    const focus = Math.min(1, Math.max(0, progress));
    const y = (focus - .5) * -18;
    const scale = 1 + focus * .025;
    const rotate = (focus - .5) * -.7;
    scene.style.setProperty("--camera-y", `${y.toFixed(2)}px`);
    scene.style.setProperty("--camera-scale", scale.toFixed(4));
    scene.style.setProperty("--camera-rotate", `${rotate.toFixed(3)}deg`);
  }

  storyState.formulaUpdate = update;
  update(0);
}

function prepareCurveData() {
  const scene = storyState.spec.scenes.find(s => s.id === "ch1_s03_alternative_scenarios");
  for (const scenario of scene.scenarios) {
    storyState.curves[scenario.id] = {
      spec: scenario,
      rows: resolvePath(storyState.data, scenario.data_ref),
      anchor: Number(resolvePath(storyState.data, scenario.story_anchor.value_ref))
    };
  }
}

function closestIndex(rows, field, value) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const distance = Math.abs(Number(rows[i][field]) - Number(value));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function updateCurveReadout(curveState, index) {
  const { spec, rows } = curveState;
  const row = rows[index];
  const anchorIndex = closestIndex(rows, spec.x_field, curveState.anchor);
  const anchorRow = rows[anchorIndex];

  const delta = ((Number(row.pure_premium_eur) / Number(anchorRow.pure_premium_eur)) - 1) * 100;

  document.getElementById("scenario-value").textContent = NUMBER(row[spec.x_field]);
  document.getElementById("scenario-price-value").textContent = EUR(row.pure_premium_eur);
  document.getElementById("scenario-insight").textContent =
    `${spec.insight} ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs. customer anchor.`;
  document.getElementById("chart-anchor-label").textContent =
    `customer anchor: ${NUMBER(curveState.anchor)}`;

  const pp = rows.map(r => Number(r.pure_premium_eur));
  document.getElementById("scenario-min").textContent = EUR(Math.min(...pp));
  document.getElementById("scenario-max").textContent = EUR(Math.max(...pp));
}

async function renderCurve(curveId) {
  const curveState = storyState.curves[curveId];
  if (!curveState || !window.Plotly) return;

  const { spec, rows, anchor } = curveState;
  const x = rows.map(r => Number(r[spec.x_field]));
  const pp = rows.map(r => Number(r.pure_premium_eur));
  const frequency = rows.map(r => Number(r.frequency));
  const severity = rows.map(r => Number(r.severity_eur));

  const ppMax = Math.max(...pp);
  const freqScale = ppMax / Math.max(...frequency);
  const sevScale = ppMax / Math.max(...severity);

  const anchorIndex = closestIndex(rows, spec.x_field, anchor);
  const anchorRow = rows[anchorIndex];

  const traces = [
    {
      x, y: pp, type: "scatter", mode: "lines",
      name: "Pure Premium",
      line: { width: 3.4, color: "#d8ff3e", shape: "spline", smoothing: .6 },
      hovertemplate: "%{x}<br>Pure Premium: €%{y:.2f}<extra></extra>"
    },
    {
      x, y: frequency.map(v => v * freqScale),
      customdata: frequency,
      type: "scatter", mode: "lines",
      name: "Frequency",
      line: { width: 1.4, color: "#7ad7ff", dash: "dot", shape: "spline", smoothing: .45 },
      hovertemplate: "%{x}<br>Frequency: %{customdata:.4f}<extra></extra>",
      opacity: .72
    },
    {
      x, y: severity.map(v => v * sevScale),
      customdata: severity,
      type: "scatter", mode: "lines",
      name: "Severity",
      line: { width: 1.4, color: "#ffb36b", dash: "dash", shape: "spline", smoothing: .45 },
      hovertemplate: "%{x}<br>Severity: €%{customdata:.0f}<extra></extra>",
      opacity: .72
    },
    {
      x: [Number(anchorRow[spec.x_field])],
      y: [Number(anchorRow.pure_premium_eur)],
      customdata: [[Number(anchorRow.frequency), Number(anchorRow.severity_eur)]],
      type: "scatter", mode: "markers",
      name: "Customer",
      marker: { size: 13, color: "#ffffff", line: { width: 2, color: "#d8ff3e" } },
      hovertemplate:
        `${spec.label}: %{x}<br>` +
        `Pure Premium: €%{y:.2f}<br>` +
        `Frequency: %{customdata[0]:.4f}<br>` +
        `Severity: €%{customdata[1]:.0f}<extra></extra>`
    }
  ];

  const layout = {
    margin: { l: 48, r: 14, t: 12, b: 44 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#9aa2aa", family: "Inter, system-ui, sans-serif", size: 10 },
    showlegend: false,
    xaxis: {
      range: [Math.min(...x), Math.max(...x)],
      gridcolor: "rgba(255,255,255,.055)",
      zerolinecolor: "rgba(255,255,255,.07)",
      tickfont: { color: "#7c848d" },
      title: { text: spec.label, font: { size: 10, color: "#707780" } }
    },
    yaxis: {
      range: [0, Math.max(...pp) * 1.1],
      gridcolor: "rgba(255,255,255,.055)",
      zerolinecolor: "rgba(255,255,255,.07)",
      tickfont: { color: "#7c848d" },
      title: { text: "Pure Premium (€)", font: { size: 10, color: "#707780" } }
    },
    hoverlabel: {
      bgcolor: "#11161a",
      bordercolor: "#30383f",
      font: { color: "#eef0eb", size: 11 }
    },
    shapes: [{
      type: "line",
      x0: Number(anchorRow[spec.x_field]),
      x1: Number(anchorRow[spec.x_field]),
      y0: 0,
      y1: Number(anchorRow.pure_premium_eur),
      line: { color: "rgba(216,255,62,.26)", width: 1, dash: "dot" }
    }]
  };

  const config = { responsive: true, displayModeBar: false };

  if (!storyState.chartInitialized) {
    await Plotly.newPlot("curve-chart", traces, layout, config);
    storyState.chart = document.getElementById("curve-chart");
    storyState.chartInitialized = true;
  } else {
    // Tab changes rebuild the base traces/layout once, never on scroll.
    await Plotly.react("curve-chart", traces, layout, config);
    storyState.chart = document.getElementById("curve-chart");
  }

  curveState.pp = pp;
  curveState.x = x;
  curveState.anchorIndex = anchorIndex;
  storyState.lastMarkerIndex = anchorIndex;

  updateCurveReadout(curveState, anchorIndex);
}

function moveCurveMarker(curveId, index) {
  const curveState = storyState.curves[curveId];
  const chart = storyState.chart;
  if (!curveState || !chart || !storyState.chartInitialized) return;
  if (index === storyState.lastMarkerIndex) return;

  const { rows, spec } = curveState;
  const row = rows[index];

  // Only trace 3 is changed. No trace data or layout is recomputed.
  Plotly.restyle(chart, {
    x: [[Number(row[spec.x_field])]],
    y: [[Number(row.pure_premium_eur)]],
    customdata: [[[Number(row.frequency), Number(row.severity_eur)]]]
  }, [3]);

  // Only update the one vertical guide line.
  Plotly.relayout(chart, {
    "shapes[0].x0": Number(row[spec.x_field]),
    "shapes[0].x1": Number(row[spec.x_field]),
    "shapes[0].y1": Number(row.pure_premium_eur)
  });

  storyState.lastMarkerIndex = index;
  updateCurveReadout(curveState, index);
}

function curveProgress() {
  const scene = document.querySelector(".curve-story");
  const rect = scene.getBoundingClientRect();
  const travel = Math.max(1, scene.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / travel));
  return progress;
}

function updateCurveFromScroll(progress) {
  const curveState = storyState.curves[storyState.activeCurve];
  if (!curveState) return;

  const rows = curveState.rows;
  const spec = curveState.spec;

  // Settle on the customer anchor first, then travel through the response curve.
  const local = Math.min(1, Math.max(0, (progress - .18) / .62));
  const continuousIndex = local * (rows.length - 1);
  const index = Math.round(continuousIndex);

  moveCurveMarker(storyState.activeCurve, index);

  const scene = document.querySelector(".curve-story");
  const cameraY = (progress - .5) * -22;
  const cameraScale = 1 + progress * .018;
  const cameraRotate = (progress - .5) * .48;
  scene.style.setProperty("--camera-y", `${cameraY.toFixed(2)}px`);
  scene.style.setProperty("--camera-scale", cameraScale.toFixed(4));
  scene.style.setProperty("--camera-rotate", `${cameraRotate.toFixed(3)}deg`);
}

function setActiveCurve(id) {
  storyState.activeCurve = id;
  document.querySelectorAll(".curve-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.curve === id);
  });

  // One intentional Plotly rebuild on interaction, not on every scroll frame.
  renderCurve(id).then(() => {
    updateCurveFromScroll(curveProgress());
  });
}

function setupCurveScene() {
  document.querySelectorAll(".curve-tab").forEach(button => {
    button.addEventListener("click", () => setActiveCurve(button.dataset.curve));
  });

  const waitForPlotly = () => {
    if (window.Plotly) {
      renderCurve(storyState.activeCurve).then(() => updateCurveFromScroll(curveProgress()));
      return;
    }
    window.setTimeout(waitForPlotly, 80);
  };

  waitForPlotly();
}

function setupScrollScheduler() {
  const formulaScene = document.querySelector(".formula-scene");
  const curveScene = document.querySelector(".curve-story");

  const update = () => {
    storyState.scrollTicking = false;

    const formulaRect = formulaScene.getBoundingClientRect();
    const formulaTravel = Math.max(1, formulaScene.offsetHeight - window.innerHeight);
    const formulaProgress = Math.min(1, Math.max(0, -formulaRect.top / formulaTravel));

    if (storyState.formulaUpdate) storyState.formulaUpdate(formulaProgress);
    updateCurveFromScroll(curveProgress());

    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const total = Math.min(1, Math.max(0, window.scrollY / max));
    document.getElementById("progress-bar").style.transform = `scaleX(${total})`;
  };

  const schedule = () => {
    if (storyState.scrollTicking) return;
    storyState.scrollTicking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}

async function main() {
  try {
    const { data, spec } = await loadStoryData();
    storyState.data = data;
    storyState.spec = spec;

    bindScene1();
    bindScene2();
    prepareCurveData();
    setupFormulaScene();
    setupCurveScene();
    setupRevealObserver();
    setupScrollScheduler();

    document.body.dataset.loaded = "true";
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:30px;color:#f1f0eb;background:#080a0c;font-family:system-ui">
        <div style="max-width:620px">
          <p style="color:#d8ff3e;letter-spacing:.15em;text-transform:uppercase;font-size:10px">TARIFF LAB</p>
          <h1>Story data could not be loaded.</h1>
          <p>GitHub Pages serves this build correctly. For local preview, use a local HTTP server instead of file://.</p>
          <code>${error.message}</code>
        </div>
      </main>`;
  }
}

main();
