# Tariff Lab — Chapter 3 / SHAP

GitHub Pages scrollytelling chapter for the explainability layer.

## Data status

The chapter now contains the actual Phase 4 SHAP result contract in `data/chapter3_shap.json`. The page therefore renders the exported global importance, dependence samples and three individual waterfall cases directly from JSON. No synthetic SHAP values are introduced by the frontend.

## Source-defined SHAP workflow

The source report documents:

- XGBoost Poisson claim-frequency model
- SHAP TreeExplainer
- global Mean |SHAP| importance
- dependence views for the top-5 features
- individual waterfall cases
- gain vs SHAP comparison
- GLM directional comparison

SHAP contributions in this chapter are interpreted on the model's log-frequency output scale. Dependence plots describe model association, not causality.

The three individual cases are ordered in the frontend by their reconstructed predicted frequency; this avoids implying a risk ordering that is not supported by the exported values.
