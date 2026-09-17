# Tariff Lab — Fachlicher Content-Audit

## Grundlage

Prüfbasis waren die im Projekt enthaltenen Kapitel-JSONs/HTML/JS, `master_comparison.csv` Vergleichscode `actuarial_model_comparison(1).py`. Es wurden nur fachliche/quantitative Aussagen geprüft; keine Modellrechnung wurde verändert.

## Korrigiert

### Chapter 1 — GLM
- „price“ dort, wo tatsächlich der Pure Premium bzw. erwartete Schadenaufwand gemeint ist, auf „expected claim cost / pure premium“ präzisiert.
- Frequency × Severity = Pure Premium bleibt unverändert. Für den Story Case ergibt sich 0.03962845 × 872.36106 = 34.57032 €.
- Counterfactual-Logik bleibt: genau eine Einflussgröße ändern, übrige Story-Case-Merkmale konstant.

### Chapter 2 — XGBoost
- Preisunterschiede werden nicht mehr als „better/worse performance“ bezeichnet. Sie sind zunächst Unterschiede im modellierten Pure Premium.
- 64 % und 3,2 % bleiben als Portfolio-Zusammenfassung aus dem vorhandenen `chapter2_xgb.json` erhalten.
- Der Near-Agreement-Fall wird fachlich als nahezu gleiche Pure Premiums trotz stark unterschiedlicher Frequency/Severity-Komponenten beschrieben.

### Chapter 3 — SHAP
- Tatsächlich vorhandene SHAP-Daten werden jetzt als `ready` behandelt; die vorherige „pending“-Darstellung war sachlich veraltet.
- „most significantly“ wurde entfernt: Mean |SHAP| ist eine Importance-Größe, kein Signifikanztest.
- SHAP wird als additive Beitragsgröße relativ zum Baseline-Wert beschrieben.
- Abhängigkeitsplots werden nicht kausal interpretiert.
- Die drei Fälle werden nach rekonstruierter XGBoost-Frequenz beschriftet, weil die ursprünglichen Bezeichnungen low/median/high nicht in dieser Reihenfolge der tatsächlichen Vorhersage lagen.

### Chapter 4 — Business Test
Die Werte wurden gegen `master_comparison.csv` abgeglichen:

| Kennzahl | GLM | LightGBM | XGBoost |
|---|---:|---:|---:|
| Poisson Deviance (freq, test) | 0.2658 | 0.4325 | 0.2674 |
| Gini (freq, test) | 0.2385 | 0.3073 | 0.3615 |
| Gamma Deviance (sev, test) | 0.8162 | 1.3292 | 1.1245 |
| Gini (sev, test) | 0.0910 | -0.0650 | -0.0243 |

Die Website nutzt daraus relative Deviance-Werte mit GLM = 1.000:

- Frequency: GLM 1.000, LightGBM 1.6272, XGBoost 1.0060
- Severity: GLM 1.000, LightGBM 1.6285, XGBoost 1.3777

## Methodische Restgrenze

Der GLM im hochgeladenen Phase-5-Vergleichscode ist `sklearn.PoissonRegressor` auf der Zielgröße `ClaimNb / Exposure` mit Exposure als `sample_weight`. Das ist **nicht dieselbe Fit-Implementierung** wie der kanonische Statsmodels/BIC-GLM aus dem Phase-1-/Chapter-1-Kontext. Chapter 4 kennzeichnet diese Quelle deshalb ausdrücklich als Phase-5-Vergleich.

Außerdem werden im aktuellen Artefaktset keine vollständigen Punktreihen für Lorenz/Lift bereitgestellt. Deshalb wird keine künstliche Lorenz-/Lift-Kurve behauptet.

## Fachliche Kernaussage der überarbeiteten Seite

Die Daten unterstützen **keine pauschale Aussage „ML ist besser“**. Im vorliegenden Testset hat XGBoost die beste Frequency-Gini-Kennzahl (0.3615), während der GLM die niedrigste Frequency- und Severity-Deviance aufweist. Die beiden ML-Severity-Gini-Werte sind negativ. Die richtige Schlussfolgerung ist daher: Mehr Flexibilität verändert die Risikosortierung und die Pure-Premium-Oberfläche, verbessert aber nicht automatisch jede relevante Qualitätsdimension.
