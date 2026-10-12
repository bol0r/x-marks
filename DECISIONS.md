# Decyzje agenta

- Dobre okno to godzina z werdyktem Lecisz w najbliższych 48 h; wschód, zachód, złota i niebieska godzina są liczone lokalnie wzorami SunCalc, a Open-Meteo jest proszone o 3 doby, żeby wieczorem zostało dość godzin.
- Werdykt to Odpuść, gdy porywy albo wiatr osiągają limit (domyślnie 10 m/s, klasa C0), opad jest od 0,5 mm, temperatura spada poniżej 0 °C albo Kp jest co najmniej 5; Ryzyko zaczyna się od 70% limitu, słabszego opadu i Kp od 4, a brak Kp nie obniża werdyktu i limit jedzie w kopii JSON.
- Porywy na 80 m i 120 m powstają ze stosunku wiatru do porywów na 10 m, bo Open-Meteo podaje porywy tylko tam; cache 30 min jest w meta Dexie (współrzędne do 0,01°) i nie wchodzi do kopii miejsc.
- Kafelki okolicy (około 10 km, zoom 12–14) lądują w osobnej bazie `xmarks-map` z limitem 40 MB; w trybie samolotowym mapa bierze je stamtąd, a miejsca zostają w `xmarks-db`.
- Szukanie składa polskie znaki na telefonie (także „ł” → „l”) i patrzy w nazwę, notatkę, adres i tagi, bez sieci.
- Tagi i ocena 0–3 siedzą na miejscu; migracja Dexie v4 dopisuje puste tagi i zero X, filtr tagu jest dokładny bez wielkości liter, a kopia JSON niesie oba pola.
- Własne kategorie są w meta Dexie (do 6 razem z Dron/Chill/Cozy, kolor tylko z tokenów); pieczątki to trzy ulubione, a kopia JSON dopisuje nowe kategorie i nadal wczytuje stary plik bez nich.
- Galeria trzyma do 6 zdjęć w Dexie (`placeId` i `ord`); migracja v3 dopisuje starym zdjęciom kolejność 0, a kopia JSON niesie całą galerię i nadal wczytuje stary plik z jednym zdjęciem.
- Notatka głosowa używa Web Speech API `pl-PL` bez dodatkowej biblioteki; w dymku dopisuje się od razu do miejsca, w edycji do pola notatki, a brak API chowa przycisk.
- W edycji osobna mapa z przeciąganym X zapisuje nową pozycję także gdy palec puści poza mapą, a adres jest szukany od nowa; baza zostaje bez nowej wersji.
- Zapis powyżej 30 km/h trzyma prędkość w km/h, kurs i znacznik przybliżenia; po przesunięciu pinezki znacznik schodzi, a adres jest szukany od nowa. Migracja Dexie v2 dopisuje starym miejscom `approx: false` i niczego nie usuwa.
- Radar liczy azymut na telefonie i obraca strzałkę o różnicę azymutu oraz kompasu; na iOS kompas rusza dopiero po „Włącz kompas”, a Wake Lock trzyma ekran tylko gdy radar jest otwarty.
- Samouczek zapisuje w Dexie (`meta`, klucz `coach`, `{version}`) ostatnią obejrzaną wersję kroków, a gdy IndexedDB padnie — w localStorage, żeby po przeładowaniu nie wracał.
- Jakość: ESLint i Prettier w `npm run lint`, `tsc --noEmit` w CI, a service worker rejestruje się też na localhost, bo Lighthouse PWA na podglądzie dostał 100, a paczka startowa ma 58 KB gzip.
- ZABLOKOWANE: workflow `.github/workflows/ci.yml` wdraża `dist` na Pages tylko po zielonych testach, ale Pages nadal serwuje gałąź `main` (katalog `/`), a nie GitHub Actions — w ustawieniach repozytorium: Settings → Pages → Build and deployment → Source: GitHub Actions; bez tego merge na `main` podmieniłby działającą stronę na surowy `index.html` Vite.
- E2e Playwright idzie na 375×812 w jasnym i ciemnym motywie, z mockiem GPS i Nominatim; zmiana miejsca podmienia obiekt na liście, bo Signals pomija kartę przy mutacji w miejscu.
- Miejsca i zdjęcia są w Dexie (`xmarks-db`: `places`, `photos`, puste `flights` i `visits`, `meta`); stary `localStorage` i baza `xmarks/photos` zostają jednorazową kopią, a gdy IndexedDB padnie zapis wraca do `localStorage`.
- Kolory zostają wyłącznie w `src/styles/tokens.css`; `node scripts/check-tokens.mjs` wywala build, gdy w komponentach pojawi się kolor na sztywno (wyjątek: nakładka na zdjęcie).
- Mapa Fazy 0 używa MapLibre i OpenFreeMap (bez klucza), bo publiczne kafelki CARTO zwracają już tylko znak wodny „API key required”; filtr sepii i nocy zostaje jak w v0.4, własne style pergaminu wchodzą w Fazie 3.

