# Tariff Lab — Chapter 2 / XGBoost

GitHub Pages scrollytelling chapter using the same architecture as Chapter 1 v3.

## Narrative principle

Chapter 2 does not claim that XGBoost is superior. It establishes that the same
1,000-policy portfolio produces a materially different policy-level pricing surface
when the model structure changes. Predictive superiority belongs to the later
model-comparison chapter.

## Scenes

1. Same portfolio. Different pure-premium surface.
2. Der Unterschied hat eine Form.
3. One policy. Two model-implied pure premiums.

## Performance

- one passive scroll listener
- one requestAnimationFrame scheduler
- compositor-friendly camera transforms
- Plotly `scattergl` for the 1,000-point portfolio cloud
- no Plotly rebuild during scrolling
- only the customer marker trace is updated while scrolling
- no scroll-driven blur/filter/layout animation

## GitHub Pages

Settings → Pages → Deploy from a branch → main → /(root).

## Local preview

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Data binding

The frontend reads:

```text
data/chapter2_xgb.json
data/chapter2_story_spec.json
```

Model outputs are not manually duplicated in the scene code.
