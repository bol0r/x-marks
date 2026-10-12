# Decyzje agenta

- Zapis powyżej 30 km/h trzyma prędkość w km/h, kurs i znacznik przybliżenia; po przesunięciu pinezki znacznik schodzi, a adres jest szukany od nowa. Migracja Dexie v2 dopisuje starym miejscom `approx: false` i niczego nie usuwa.
- Radar liczy azymut na telefonie i obraca strzałkę o różnicę azymutu oraz kompasu; na iOS kompas rusza dopiero po „Włącz kompas”, a Wake Lock trzyma ekran tylko gdy radar jest otwarty.
- Samouczek zapisuje w Dexie (`meta`, klucz `coach`, `{version}`) ostatnią obejrzaną wersję kroków, a gdy IndexedDB padnie — w localStorage, żeby po przeładowaniu nie wracał.
- Jakość: ESLint i Prettier w `npm run lint`, `tsc --noEmit` w CI, a service worker rejestruje się też na localhost, bo Lighthouse PWA na podglądzie dostał 100, a paczka startowa ma 58 KB gzip.
- ZABLOKOWANE: workflow `.github/workflows/ci.yml` wdraża `dist` na Pages tylko po zielonych testach, ale Pages nadal serwuje gałąź `main` (katalog `/`), a nie GitHub Actions — w ustawieniach repozytorium: Settings → Pages → Build and deployment → Source: GitHub Actions; bez tego merge na `main` podmieniłby działającą stronę na surowy `index.html` Vite.
- E2e Playwright idzie na 375×812 w jasnym i ciemnym motywie, z mockiem GPS i Nominatim; zmiana miejsca podmienia obiekt na liście, bo Signals pomija kartę przy mutacji w miejscu.
- Miejsca i zdjęcia są w Dexie (`xmarks-db`: `places`, `photos`, puste `flights` i `visits`, `meta`); stary `localStorage` i baza `xmarks/photos` zostają jednorazową kopią, a gdy IndexedDB padnie zapis wraca do `localStorage`.
- Kolory zostają wyłącznie w `src/styles/tokens.css`; `node scripts/check-tokens.mjs` wywala build, gdy w komponentach pojawi się kolor na sztywno (wyjątek: nakładka na zdjęcie).
- Mapa Fazy 0 używa MapLibre i OpenFreeMap (bez klucza), bo publiczne kafelki CARTO zwracają już tylko znak wodny „API key required”; filtr sepii i nocy zostaje jak w v0.4, własne style pergaminu wchodzą w Fazie 3.

