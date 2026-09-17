# Tariff Lab — GitHub Pages / Chapter 1

Cinematic scrollytelling frontend for the actuarial tariff modeling portfolio project. v3 adds compositor-friendly camera motion and throttled Plotly marker updates.

## Repository structure

```text
.
├── index.html
├── .nojekyll
├── README.md
├── css/
│   └── style.css
├── js/
│   └── app.js
└── data/
    ├── chapter1_glm.json
    └── chapter1_story_spec.json
```

## What is implemented

### Scene 01 — Meet the customer
The selected policy is loaded from the JSON model output and revealed as a visual profile card.

### Scene 02 — Build the pure premium
Scroll position drives the narrative state:
1. Frequency
2. Severity
3. Multiplication
4. Pure Premium

The values are bound to the story specification and the underlying chapter JSON.

### Scene 03 — Change one thing
The Plotly chart shows the precomputed GLM counterfactual curves. Scrolling moves the customer marker through the active curve. The buttons switch between Driver age, Bonus-Malus and Vehicle age.

The chart displays the pure premium on the y-axis while frequency and severity are visualized as normalized companion curves; their hover labels expose the actual model values.

## GitHub Pages

No build step is required.

In the GitHub repository:
- **Settings → Pages**
- **Deploy from a branch**
- choose the main branch
- choose `/ (root)`

## Local preview

Use a local HTTP server because the page loads JSON with `fetch()`:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Data binding

The frontend never duplicates the source model values manually. It resolves references such as:

```text
$.story_case.glm.pure_premium_eur
$.curves.driver_age
$.curves.bonus_malus
$.curves.vehicle_age
```

from `chapter1_story_spec.json` and `chapter1_glm.json`.


## Performance design

The v3 build intentionally separates visual motion from chart computation.

- Scroll events are collapsed into a single `requestAnimationFrame` loop.
- Camera movement uses `transform: translate3d(...) scale(...) rotate(...)` only.
- Plotly is not rebuilt during scrolling.
- During scrolling, only the customer marker (trace 3) and its vertical guide line are updated.
- A complete Plotly render/react happens only when the scenario changes via the three buttons.
- No scroll-driven blur, layout, box-shadow, or filter animation is used.

This keeps the cinematic layer visually active without turning the chart into a per-frame re-rendering workload.
