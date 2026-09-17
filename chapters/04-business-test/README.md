# Tariff Lab — Chapter 4: Der Business-Test

Dieses Kapitel verbindet drei Ebenen:

1. Performance — relative Poisson-/Gamma-Deviance auf dem gehaltenen Testset.
2. Risikosortierung — Gini; Top-10%-Lift wird nur gezeigt, wenn die erforderlichen Punktdaten vorliegen.
3. Entscheidung — was bedeutet zusätzliche Modellkomplexität für die Tarifentscheidung?

## Datenbasis

Die Kennzahlen in diesem Kapitel stammen aus `data/master_comparison.csv`, dem hochgeladenen Phase-5-Vergleichsoutput. Die Tabelle zeigt exakt die dort enthaltenen Testset-Kennzahlen; die relative Deviance wird mit dem GLM-Testwert = 1,000 normiert.

Wichtig: Der GLM im Phase-5-Vergleich ist `sklearn.PoissonRegressor` auf der Frequenzrate mit Exposure-Gewichten. Er ist nicht dieselbe Fit-Implementierung wie der kanonische Statsmodels/BIC-GLM aus Kapitel 1.

Die aktuelle Datenbasis enthält keine vollständigen Lorenz-/Lift-Punktreihen. Deshalb wird kein Top-10%-Lift als verifizierte Kennzahl behauptet und keine künstliche Kurve erzeugt.
