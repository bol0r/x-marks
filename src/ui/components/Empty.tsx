import { TrailArt } from "./Icons";
import { filter } from "../state";

export function EmptyAll() {
  return (
    <div class="empty">
      <TrailArt />
      <h2>
        Mapa czeka na <em>pierwszy</em> X
      </h2>
      <ol class="steps">
        <li>
          Jesteś w fajnym miejscu: stuknij pieczątkę <b>Dron</b>, <b>Chill</b> albo <b>Cozy</b>. Pozycja i godzina zapiszą się same.
        </li>
        <li>
          Z dymka od razu dodasz <b>zdjęcie</b> albo opis.
        </li>
        <li>
          Miejsce z Map Google dodasz przez <b>Dodaj</b>: wklej udostępniony link albo wpisz nazwę.
        </li>
      </ol>
      <div class="formats">
        Dodaj rozumie:
        <br />
        „Udostępnij” z Map Google / Apple
        <br />
        nazwę miejsca: Hala Stulecia
        <br />
        Plus Code: 425J+XR Wrocław
        <br />
        51.10994, 17.03203 · 51°06'36"N 17°01'55"E
      </div>
    </div>
  );
}

export function EmptyFilter() {
  return (
    <div class="empty">
      <p class="hint">{filter.value === "arch" ? "Archiwum jest puste." : "Brak miejsc w tej kategorii."}</p>
    </div>
  );
}
