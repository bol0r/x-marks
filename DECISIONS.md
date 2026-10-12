# Decyzje agenta

- Kolory zostają wyłącznie w `src/styles/tokens.css`; `node scripts/check-tokens.mjs` wywala build, gdy w komponentach pojawi się kolor na sztywno (wyjątek: nakładka na zdjęcie).
- Mapa Fazy 0 używa MapLibre i OpenFreeMap (bez klucza), bo publiczne kafelki CARTO zwracają już tylko znak wodny „API key required”; filtr sepii i nocy zostaje jak w v0.4, własne style pergaminu wchodzą w Fazie 3.

