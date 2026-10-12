# X Marks

**X Marks the Spot** · by Dead Net x Claude

Zaznacz ciekawe miejsce jednym stuknięciem: pozycja GPS, godzina i kategoria (Dron, Chill, Cozy).
Później wracasz do nich z listy, albumu albo mapy skarbów.

- Apka: https://bol0r.github.io/x-marks/ (iPhone: Safari → Udostępnij → Do ekranu początkowego)
- Plan rozwoju: [`ROADMAP.md`](ROADMAP.md)
- Decyzje agenta: [`DECISIONS.md`](DECISIONS.md) · Zmiany: [`CHANGELOG.md`](CHANGELOG.md)

## Uruchomienie lokalnie
```bash
npm test          # testy
npm run build     # składa index.html z _fragment.html + olc.js
npm run dev       # http://localhost:5173
```

## Praca w Cursorze
1. Otwórz ten folder w Cursorze.
2. Settings → Agents → Approvals & Execution → **Run Mode: Allowlist**; dodaj `npm`, `npx`, `node`, `python3`, `git add`, `git commit`, `git push`, `git checkout`.
3. Tryb **Agent**, wklej treść `CURSOR-START.md`.

Dane użytkownika zostają w przeglądarce telefonu (localStorage + IndexedDB). Repo zawiera tylko kod.
