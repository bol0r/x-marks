import { Header, Hints } from "../components/Header";
import { Pads } from "../components/Pads";
import { PlaceList } from "../components/List";
import { Splash } from "../components/Splash";
import { Toast } from "../components/Toast";
import { Toolbar } from "../components/Toolbar";
import { DataSheet } from "../components/DataSheet";
import { EditSheet } from "../components/EditSheet";
import { PasteSheet } from "../components/PasteSheet";
import { MapView } from "../../map/MapView";
import { sheet, showSplash } from "../state";

export function Home() {
  const s = sheet.value;
  return (
    <>
      {showSplash.value ? <Splash /> : null}
      <div class="app">
        <Header />
        <Hints />
        <Toolbar />
        <main id="main">
          <PlaceList />
          <MapView />
        </main>
        <Pads />
      </div>
      <Toast />
      {s?.kind === "edit" ? <EditSheet id={s.id} /> : null}
      {s?.kind === "paste" ? <PasteSheet cat={s.cat} prefill={s.prefill} /> : null}
      {s?.kind === "data" ? <DataSheet /> : null}
    </>
  );
}
