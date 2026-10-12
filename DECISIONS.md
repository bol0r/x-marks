# Decyzje agenta

- Miejsca i zdjęcia są w Dexie (`xmarks-db`: `places`, `photos`, puste `flights` i `visits`, `meta`); stary `localStorage` i baza `xmarks/photos` zostają jednorazową kopią, a gdy IndexedDB padnie zapis wraca do `localStorage`.
- Kolory zostają wyłącznie w `src/styles/tokens.css`; `node scripts/check-tokens.mjs` wywala build, gdy w komponentach pojawi się kolor na sztywno (wyjątek: nakładka na zdjęcie).
- Mapa Fazy 0 używa MapLibre i OpenFreeMap (bez klucza), bo publiczne kafelki CARTO zwracają już tylko znak wodny „API key required”; filtr sepii i nocy zostaje jak w v0.4, własne style pergaminu wchodzą w Fazie 3.

