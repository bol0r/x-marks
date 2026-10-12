# X Marks — plan rozwoju

> X Marks the Spot · by Dead Net x Claude · https://bol0r.github.io/x-marks/

Osobista apka (dawniej Pinezki) do szybkiego oznaczania ciekawych miejsc: jestem gdzieś albo jadę autem, stukam jedną kategorię, zapisuje się pozycja GPS + godzina. Notatkę dopisuję później.

## Stan: v0.1 (prototyp)

- `index.html` — cała apka w jednym pliku (vanilla JS, bez builda)
- 3 kategorie: **Dron**, **Chill**, **Cozy**
- Zapis jednym tapnięciem: `watchPosition` trzyma świeży fix w tle, więc zapis jest natychmiastowy
- Toast „Zapisano” z „Cofnij” i „Notatka” (6 s)
- Adres z Nominatim (OSM) dociągany w tle, offline zostają współrzędne
- Lista z filtrem kategorii, „Prowadź” (Google Maps), zmiana kategorii, usuwanie z potwierdzeniem
- Mapa: Leaflet + OSM, ładowana dopiero po otwarciu
- **Wklej**: link z Map Google/Apple (`!3d!4d`, `@lat,lng`, `q=`, `ll=`, `/search/`), `geo:`, Plus Code pełny (`9F3V425J+XR`) i krótki z miastem (`425J+XR Wrocław`, ~40 miast offline), stopnie/minuty, `51,07 17,07`. Podgląd na żywo przed dodaniem
- Skrócone linki `maps.app.goo.gl` nie mają współrzędnych — apka mówi, co skopiować zamiast nich (rozwinięcie wymagałoby serwera, patrz Etap 2)
- Plus Code każdej pinezki, odległość od Ciebie, sortowanie „Najbliżej”, przycisk Kopiuj
- Szybki zapis z adresu: `…/index.html#dron` (pod Skrót iOS albo ikonkę na ekranie)
- `olc.js` — Plus Codes + parser, testowalny w Node; `build.py` skleja `_fragment.html` + `olc.js` w `index.html`
- Dane: `localStorage` (`xmarks.v1`), eksport JSON / GPX, import JSON
- PWA: `manifest.webmanifest`, `sw.js` (działa offline), ikona

Model rekordu:
```json
{ "id": "lx9k2a1b", "cat": "dron", "lat": 51.1099, "lng": 17.032, "acc": 8,
  "ts": 1760190000000, "note": "", "addr": "Rynek, Wrocław" }
```

## Uruchomienie (GPS wymaga HTTPS)

Hostowane na GitHub Pages: https://bol0r.github.io/x-marks/ (repo `bol0r/x-marks`, gałąź `main`, katalog główny). Każdy push na `main` publikuje nową wersję po ~1 min.
Na iPhonie: Safari → Udostępnij → „Do ekranu początkowego”. Pierwsze stuknięcie zapyta o lokalizację.
- Kopia zapasowa: Dane → Zapisz kopię (menu udostępniania → Pliki/iCloud/Dysk Google), przypomnienie po 7 dniach

Lokalnie na Macu: `npx serve .` (localhost liczy się jako bezpieczny kontekst).

## Etap 1 — wygoda w aucie
- [ ] Zapis bez patrzenia: duży przycisk + wibracja + dźwięk potwierdzenia
- [ ] Skrót iOS „X Marks Dron” (Siri / ekran blokady) → otwiera `index.html#dron` (obsługa hasha już jest)
- [ ] Rozwijanie `maps.app.goo.gl`: mała funkcja serwerowa (Netlify/Cloudflare Worker) idzie za przekierowaniem i zwraca współrzędne
- [ ] Notatka głosowa (Web Speech API `SpeechRecognition`, pl-PL) zamiast pisania
- [ ] Zdjęcie do miejsca (`<input type="file" accept="image/*" capture>`, miniatura w IndexedDB)
- [ ] Kierunek jazdy i prędkość z `coords.heading/speed` — przy prędkości > 30 km/h zapisz punkt „przybliżony” i oznacz do weryfikacji

## Etap 2 — dane, które nie znikną
- [ ] Przenieść z `localStorage` do IndexedDB (zdjęcia, większe ilości)
- [ ] Synchronizacja: Supabase (darmowy plan, tabela `places`) albo Google Sheets przez Apps Script / Make.com webhook
- [ ] Automatyczna kopia: eksport GPX raz w tygodniu do Google Drive
- [ ] Własne kategorie (edytowalna lista, kolor, ikona) zamiast stałych trzech

## Etap 3 — pod drona (wroclawzdrona.pl)
- [ ] Przy kategorii Dron: sprawdzenie stref — link do mapy PAŻP (DroneMap / dronemap.pansa.pl) dla danego punktu
- [ ] Pola: wysokość startu, przeszkody, „czy wolno”, zdjęcie poglądowe
- [ ] Prognoza na dziś (wiatr, Kp) przy otwarciu pinezki — Open-Meteo API (darmowe, bez klucza)
- [ ] Widok „najbliższe miejsca do lotu” sortowany po odległości

## Etap 4 — ładniej / wygodniej
- [ ] Klastrowanie pinezek na mapie (Leaflet.markercluster)
- [ ] Ciemny podkład mapy (np. CARTO dark)
- [ ] Wyszukiwarka po notatkach i adresach
- [ ] Udostępnianie jednej pinezki linkiem (`?p=lat,lng,cat`)
- [ ] Ewentualnie przepisanie na Vite + TypeScript, gdy plik przekroczy ~800 linii

## Zasada bezpieczeństwa
Apka ma pozwalać zapisać miejsce jednym stuknięciem bez czytania ekranu. Notatki, zdjęcia i edycja tylko na postoju.
