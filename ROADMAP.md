# X Marks — plan rozwoju

> **X Marks the Spot** · by Dead Net x Claude
> Live: https://bol0r.github.io/x-marks/ · Repo: `bol0r/x-marks`

Ten plan jest napisany dla agenta w Cursorze. Każdy punkt `- [ ]` to jedno zadanie
z warunkiem „Gotowe gdy”. Agent bierze punkty **po kolei, od góry**, zgodnie z `.cursor/rules/x-marks.mdc`.

---

## 1. O co chodzi w tej apce

Jestem gdzieś albo jadę autem i widzę fajne miejsce. Jedno stuknięcie i jest X na mapie:
pozycja, godzina, kategoria. Później wracam do tych miejsc: lecę dronem, jadę odpocząć, idę na kawę.

**Trzy obietnice, których nie wolno złamać:**
1. **Zapis w 1 sekundę, jednym kciukiem, bez patrzenia.** Żadna nowa funkcja nie może dodać kroku do zapisu.
2. **Działa offline.** Zapis, lista, zdjęcia i wyszukiwanie po swoich miejscach działają bez internetu.
3. **Dane należą do mnie.** Domyślnie wszystko zostaje na telefonie. Chmura tylko po włączeniu. Pełny eksport zawsze.

**Grupa docelowa (kolejność):** ja (dron + auto + Wrocław) → znajomi z dronami i fotografowie → ludzie, którzy lubią odkrywać okolicę.

---

## 2. Tożsamość wizualna (obowiązuje w każdej fazie)

Klimat: **nowoczesna mapa skarbów**, nie kostium pirata. Lekko, czytelnie, z przygodą w detalach.

| Element | Zasada |
|---|---|
| Tła | Dzień: pergamin `--bg #efe6d2` z ziarnem i warstwicami. Noc: nocna mapa morska `--bg #0d1820`. |
| Akcent | Czerwony X `--mark` tylko dla rzeczy „to jest miejsce / ważne”. Nie do dekoracji. |
| Kategorie | Dron `--dron` (niebieski), Chill `--chill` (morska zieleń), Cozy `--cozy` (bursztyn). |
| Fonty | Nagłówki i nazwy miejsc: **Fraunces**. UI: **Bricolage Grotesque**. Cytaty/notatki i „the Spot”: **Instrument Serif** italic. Współrzędne: mono. |
| Motywy | X (dwa pociągnięcia pędzla), przerywany szlak, warstwice, pieczątka z przerywaną ramką, róża wiatrów (do dodania). |
| Ruch | Jeden wyraźny moment na akcję (pieczęć X przy zapisie). Zawsze respektuj `prefers-reduced-motion`. |
| Język | Polski, krótko, z lekkim przymrużeniem oka. Bez „Ahoj, majtku”. Przyciski mówią, co się stanie („Zapisz kopię”, „Prowadź”). |

Wszystkie kolory przez tokeny CSS. Każdy ekran sprawdzony w jasnym i ciemnym motywie oraz na szerokości 375 px.

---

## 3. Stan obecny (v0.4)

Jeden plik `_fragment.html` (UI + logika) + `olc.js` (Plus Code i parser wklejania) → `npm run build` → `index.html`.

- Zapis z GPS jednym stuknięciem (3 pieczątki), pieczęć X, dymek z Foto / Opis / Cofnij
- Widoki: Lista (szlak z X-ami), Kafelki (album ze zdjęciami okładek), Mapa (Leaflet + CARTO w sepii, X-y, szlak do najbliższego)
- Zdjęcie okładki (IndexedDB, zmniejszane do 1400 px), nazwa, notatka, kategoria
- Przesunięcie na liście: w lewo archiwum, w prawo usuń, z cofaniem
- Dodaj: „Udostępnij” z Map Google/Apple (także skrócony link z nazwą → wyszukiwanie w OSM), Plus Code, współrzędne, DMS, sama nazwa
- Najbliżej, filtry, archiwum, kopia zapasowa ze zdjęciami (Web Share → Pliki/Dysk), import, GPX
- PWA offline, skróty `#dron` `#chill` `#cozy`, `share_target` (Android), ekran startowy „X Marks the Spot”
- 22 testy jednostkowe (`npm test`)

---

## 4. Architektura docelowa (Faza 0)

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Build | **Vite + TypeScript (strict)** | Szybko, standard, Cursor zna to najlepiej |
| UI | **Preact + @preact/signals** | API jak React, 4 KB, dobre dla PWA na telefonie |
| Dane | **Dexie (IndexedDB)**: tabele `places`, `photos`, `flights`, `visits`, `meta` | Offline, duże ilości, migracje wersji |
| Mapa | **MapLibre GL** + **OpenFreeMap** (wektor, bez klucza) + własny styl „pergamin” i „noc” | Pełna kontrola wyglądu mapy skarbów |
| PWA | **vite-plugin-pwa** (Workbox) | Offline, aktualizacje, cache kafelków |
| Testy | **Vitest** (logika) + **Playwright** (e2e na 375×812, oba motywy) | Agent sam sprawdza, czy nie zepsuł |
| Deploy | **GitHub Actions → GitHub Pages** po każdym pushu na `main` (testy muszą przejść) | Zero ręcznej roboty |

Struktura po Fazie 0:
```
src/
  app.tsx, main.tsx
  core/        geo.ts (dystans, DMS), olc.ts, parse.ts, sun.ts, weather.ts
  data/        db.ts (Dexie + migracje), backup.ts, sync/ (Faza 4)
  ui/          components/ (Pad, Card, Tile, Sheet, Toast, Stamp, Chip…), screens/
  map/         MapView.tsx, styles/parchment.json, styles/night.json
  styles/      tokens.css, base.css
tests/         unit/*.test.ts, e2e/*.spec.ts
public/        icons, manifest
```

---

## 5. Fazy

### Faza 0 — Fundament (bez zmian dla użytkownika)
- [x] **Vite + TS + Preact.** Przenieś aplikację 1:1 do struktury z sekcji 4. Gotowe gdy: `npm run dev` działa, wygląd i funkcje jak w v0.4, stary `_fragment.html` usunięty, `build.py` usunięty.
- [x] **Tokeny.** Wszystkie kolory, fonty, promienie i cienie w `src/styles/tokens.css`. Gotowe gdy: w komponentach nie ma żadnego literalnego koloru (poza nakładką na zdjęcie).
- [x] **Dexie + migracja.** Tabele z sekcji 4. Przy pierwszym uruchomieniu przenieś `localStorage["xmarks.v1"]` (i `pinezki.v1`) oraz zdjęcia z bazy `xmarks/photos`. Gotowe gdy: test migracji przechodzi na danych z v0.4, nic nie ginie.
- [x] **Testy.** Przenieś 22 testy do Vitest. Dodaj e2e Playwright: zapis z GPS (mock), Dodaj z nazwy (mock Nominatim), przesunięcie + cofnij, zdjęcie okładki, kopia → import. Gotowe gdy: `npm test` i `npm run e2e` zielone.
- [ ] **CI/CD.** GitHub Actions: lint + testy + build + deploy na Pages. Gotowe gdy: push na `main` aktualizuje stronę, czerwony test blokuje deploy.
- [x] **Jakość.** ESLint + Prettier, `tsc --noEmit` w CI, Lighthouse PWA ≥ 90, bundle startowy < 120 KB gzip (mapa ładowana leniwie).

### Faza 1 — Teren i auto
- [x] Samouczek (coach marks). Po pierwszym uruchomieniu, zaraz po ekranie startowym, ekran przygasa,
  a podświetlony zostaje tylko jeden element (wycięcie w przyciemnieniu, przerywana ramka w kolorze --mark).
  Obok dymek w stylu mapy skarbów: ikonka, krótki tytuł, 1–2 zdania po polsku, kropki postępu (np. 3/7),
  przyciski Wstecz / Dalej / Pomiń. Kroki:
  1) pieczątki Dron/Chill/Cozy: zapis jednym stuknięciem, pozycja i godzina same,
  2) status GPS w nagłówku,
  3) Dodaj: wklej „Udostępnij” z Map Google, Plus Code albo wpisz nazwę,
  4) przełącznik Lista / Kafelki / Mapa,
  5) filtry kategorii i Archiwum,
  6) przesunięcie karty: w lewo archiwum, w prawo usuń, z cofaniem (krótka animacja dłoni na karcie;
     gdy lista jest pusta, pokaż to na przykładowej karcie oznaczonej „przykład”, która znika po samouczku),
  7) Dane: kopia zapasowa, bo miejsca są tylko na tym telefonie.
  Bez zewnętrznej biblioteki. Działa w jasnym i ciemnym motywie, na 375 px, przy obrocie ekranu i przewijaniu.
  Esc i Pomiń zamykają, fokus zostaje w dymku, prefers-reduced-motion wyłącza animacje.
  Stan „samouczek obejrzany” zapisany w Dexie (meta) z numerem wersji, żeby przy nowych funkcjach dało się
  pokazać tylko nowe kroki. W Dane przycisk „Pokaż samouczek” odpala go od nowa.
  Samouczek nigdy nie blokuje zapisu: stuknięcie w pieczątkę podczas samouczka zapisuje miejsce i zamyka samouczek.
  Gotowe gdy: e2e Playwright sprawdza pierwsze uruchomienie, Pomiń, brak samouczka po przeładowaniu,
  ponowne uruchomienie z Dane i zrzuty w obu motywach.
- [x] **Radar.** Pełnoekranowy widok: najbliższe X w wybranej kategorii, duża odległość, strzałka kierunku (DeviceOrientation; na iOS przycisk „Włącz kompas” → `requestPermission`). Wake Lock, gdy otwarty. Gotowe gdy: strzałka wskazuje cel z dokładnością do ~15° na telefonie.
- [x] **Zapis w ruchu.** Gdy prędkość > 30 km/h: zapisz też `heading` i `speed`, oznacz miejsce jako „przybliżone”, pokaż w liście „do sprawdzenia”. Gotowe gdy: miejsce z jazdy ma znacznik i da się je „poprawić na mapie” przeciągnięciem pinezki.
- [ ] **Popraw pozycję.** W edycji: mapa z przeciąganym X. Gotowe gdy: przeciągnięcie zmienia współrzędne i adres.
- [ ] **Notatka głosowa.** Przycisk mikrofonu w dymku i edycji (Web Speech API `pl-PL`; gdy brak, ukryj). Gotowe gdy: mówię, tekst ląduje w notatce.
- [ ] **Więcej zdjęć.** Galeria do 6 zdjęć na miejsce, pierwsze = okładka, przeciąganie kolejności. Gotowe gdy: kafelek pokazuje okładkę, edycja galerię.
- [ ] **Własne kategorie.** Do 6 kategorii: nazwa, kolor z palety tokenów, ikona z zestawu. Pieczątki na dole biorą 3 ulubione. Gotowe gdy: dodanie kategorii „Widok” działa w filtrach, kafelkach, mapie i eksporcie.
- [ ] **Tagi i ocena.** Ocena 1–3 X, tagi (np. „parking”, „woda”, „zachód słońca”). Filtr po tagach. Gotowe gdy: filtr „woda + 3X” zwraca właściwe miejsca.
- [ ] **Wyszukiwarka.** Pole szukania po nazwie, notatce, adresie i tagach (bez polskich znaków też: „lakowa” → „łąkowa”). Gotowe gdy: działa offline.
- [ ] **Offline mapa okolicy.** Przycisk „Zapisz mapę okolicy” cache’uje kafelki w promieniu ~10 km od zapisanych miejsc (limit MB, licznik). Gotowe gdy: w trybie samolotowym mapa się wyświetla.

### Faza 2 — Dron Ops (najmocniejsza funkcja)
- [ ] **Pogoda dronowa.** Dla miejsc Dron: wiatr i porywy na 10 m, 80 m, 120 m, opady, chmury, widzialność, temperatura (Open-Meteo, bez klucza). Gotowe gdy: karta pokazuje dane na teraz i +6 h, z cache 30 min.
- [ ] **Werdykt lotu.** „Lecisz / Ryzyko / Odpuść” wg progów zależnych od drona (ustawienia: model, limit wiatru, np. klasa C0 ~10 m/s). Uwzględnia porywy, opady, temperaturę < 0 °C, indeks Kp (NOAA SWPC). Gotowe gdy: testy jednostkowe progów + czytelna przyczyna („porywy 13 m/s na 80 m”).
- [ ] **Okno lotów.** Najlepsze godziny w ciągu 48 h dla każdego miejsca Dron, z wschodem/zachodem, złotą i niebieską godziną (SunCalc). Gotowe gdy: widok „Kiedy lecieć” sortuje miejsca po najbliższym dobrym oknie.
- [ ] **Złota godzina wszędzie.** Na każdej karcie: dzisiejszy zachód i złota godzina dla tego miejsca. Gotowe gdy: liczone offline.
- [ ] **Strefy.** Przycisk „Sprawdź strefę” otwiera mapę PAŻP (DroneMap) dla współrzędnych miejsca; jeśli da się, pokaż ostrzeżenie dla znanych stref (CTR Wrocław) z lokalnego GeoJSON. Gotowe gdy: miejsce w CTR dostaje widoczny znacznik.
- [ ] **Checklista przedlotowa.** Edytowalna lista (baterie, karta, śmigła, strefa, zgoda właściciela terenu). Gotowe gdy: odhaczanie przed lotem, reset po locie.
- [ ] **Dziennik lotów.** Przy miejscu: lot (data, czas, bateria, notatka, zdjęcia/klipy). Statystyki: liczba lotów, łączny czas, ulubione miejsce. Gotowe gdy: eksport CSV dziennika.
- [ ] **Profil drona.** Model, masa, klasa, limit wiatru, numer operatora (lokalnie). Gotowe gdy: werdykt korzysta z profilu.

### Faza 3 — Przygoda (zaangażowanie)
- [ ] **Mapa skarbów z prawdziwego zdarzenia.** MapLibre + własne style „pergamin” (dzień) i „noc”: woda w tuszu, lasy kreskowaniem, drogi jak szlaki, etykiety Fraunces. X-y jako warstwa symboli. Gotowe gdy: mapa wygląda jak nasza, nie jak Google.
- [ ] **Mgła wojny.** Gdy apka jest otwarta, odkrywaj obszar (komórki geohash 7) wokół mojej trasy. Na mapie nieodkryte = mgła pergaminu. Licznik „odkryto X km² Wrocławia”. Gotowe gdy: przejazd odsłania pas mapy, dane tylko lokalnie.
- [ ] **Dokąd dziś?** Losowanie miejsca: kategoria, maks. odległość, pogoda (dla Dron), „jeszcze nie byłem”. Animacja zwoju mapy. Gotowe gdy: wynik + „Prowadź”.
- [ ] **Odznaki.** Pierwszy X, 10/50/100 X-ów, Nocny marek (zapis 0–4), Złota godzina (zapis w złotej godzinie), Kartograf (5 dzielnic), Lotnik (10 lotów), Odkrywca (1 km² mgły). Pieczątki w „Dzienniku kapitana”. Gotowe gdy: każda odznaka ma test warunku.
- [ ] **Wyprawy.** Grupuj miejsca w trasę (np. „Sobótka i okolice”), kolejność, szlak na mapie, czas dojazdu (OSRM demo), eksport GPX. Gotowe gdy: wyprawa ma własny widok i link do nawigacji z kolejnymi punktami.
- [ ] **Wizyty.** „Byłem tu” z datą; licznik odwiedzin; miejsca nieodwiedzane od dawna podpowiadane w „Dokąd dziś?”.
- [ ] **Róża wiatrów i szczegóły.** Róża wiatrów w nagłówku mapy, kierunek wiatru na kartach Dron jako strzałka, mikroanimacje szlaku. Gotowe gdy: reduced-motion wyłącza animacje.

### Faza 4 — Dane i załoga (chmura opcjonalna)
- [ ] **Własna domena.** Np. `xmarks.deadnet.ovh` (CNAME w repo + DNS). Zrobić PRZED publikacją dla innych, bo dane w przeglądarce są przypisane do adresu. Przy zmianie: ekran „przenieś dane” (kopia → import).
- [ ] **Synchronizacja.** Supabase: logowanie linkiem z e-maila, tabele `places`, `photos` (Storage), RLS „widzę tylko swoje”. Local-first: kolejka zmian offline, scalanie per pole (ostatni zapis wygrywa), usunięcia jako „tombstone”. Gotowe gdy: dwa urządzenia widzą te same miejsca po 5 s, bez duplikatów. *Wymaga konta Supabase → agent przygotowuje kod za flagą `VITE_SYNC=1` i oznacza krok konfiguracji jako ZABLOKOWANE.*
- [ ] **Udostępnij miejsce.** Link `…/?add=<base64url {lat,lng,cat,name,note}>`; u odbiorcy podgląd i „Dodaj do moich X”. Gotowe gdy: działa bez chmury.
- [ ] **Załoga.** Wspólna mapa z przyjaciółmi (zaproszenie linkiem), każdy dodaje X-y, widać autora. *Wymaga synchronizacji.*
- [ ] **Import z Google.** Google Takeout „Zapisane miejsca” (GeoJSON/CSV) i listy Map Google (CSV) → wybór kategorii. Gotowe gdy: import 100+ miejsc bez duplikatów.
- [ ] **Eksport.** GeoJSON, KML (Google Earth), CSV, GPX; pełna kopia ZIP (JSON + zdjęcia jako pliki).
- [ ] **Polityka prywatności.** Strona `/privacy` (PL/EN): co jest lokalnie, co idzie do Nominatim/Open-Meteo/CARTO, co do chmury po włączeniu.

### Faza 5 — Sprytne dodatki (AI i kontekst)
- [ ] **Co tu jest?** Przy miejscu: najbliższe parkingi, woda, toalety, punkty widokowe (Overpass API, cache). Gotowe gdy: działa dla Wrocławia w < 2 s.
- [ ] **Opis ze zdjęcia.** Przycisk „Podpowiedz” wysyła zdjęcie okładki do funkcji serwerowej (Cloudflare Worker) z Claude API → propozycja nazwy, kategorii i tagów. Klucz tylko na serwerze. *Wymaga konta → ZABLOKOWANE do konfiguracji.*
- [ ] **Szukanie po znaczeniu.** „Ciche miejsce nad wodą na zachód słońca” → lokalne dopasowanie po tagach/notatkach; z chmurą: embeddingi.
- [ ] **Rozwijanie skróconych linków.** Worker idzie za przekierowaniem `maps.app.goo.gl` i zwraca współrzędne. Gotowe gdy: wklejony sam skrócony link działa.

### Faza 6 — Sklepy i natywne moce
- [ ] **Google Play (TWA).** Bubblewrap/PWABuilder, `assetlinks.json` w domenie z Fazy 4, ikony, zrzuty ekranu, opis sklepu PL/EN. Pamiętać: nowe konto prywatne = test zamknięty z min. 12 testerami przez 14 dni.
- [ ] **Capacitor (iOS + Android).** Geofencing w tle: „Jesteś 500 m od X” (opt-in), widżet „Zaznacz X” na ekranie głównym, akcje Siri/Skróty. Gotowe gdy: powiadomienie przy zbliżeniu działa przy zablokowanym telefonie.
- [ ] **CarPlay / Android Auto (badanie).** Sprawdzić, czy da się zrobić prosty przycisk „Zaznacz X” w aucie. Wynik w `DECISIONS.md`.

### Faza 7 — Dla ludzi (opcjonalnie, decyzja Olo)
- [ ] **Atlas dronowy.** Publiczne strony wybranych miejsc (opt-in, bez dokładnych współrzędnych domów prywatnych): opis, zdjęcie, pogoda, strefy. SEO pod „gdzie latać dronem [miasto]”, link do wroclawzdrona.pl.
- [ ] **Landing page + PL/EN.** Strona produktu, zrzuty, „Dodaj do ekranu”, link do Play.

---

## 6. Definicja „gotowe” dla każdego punktu
1. Działa na iPhonie (Safari, PWA z ekranu początkowego) i Androidzie (Chrome).
2. Jasny i ciemny motyw, 375 px szerokości, bez poziomego przewijania.
3. Działa offline albo czytelnie mówi, czego brakuje.
4. Testy: logika w Vitest, nowy przepływ w Playwright.
5. Zapis miejsca nadal zajmuje jedno stuknięcie.
6. Wpis w `CHANGELOG.md` (jedna linia po polsku).

## 7. Zasady prywatności
- Bez analityki śledzącej. Ewentualnie liczniki bez cookies (np. Plausible) dopiero po decyzji Olo.
- Zewnętrzne usługi tylko te z listy w polityce prywatności.
- Kopie i eksport zawsze kompletne i czytelne (JSON).
