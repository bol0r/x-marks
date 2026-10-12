import { render } from "preact";
import { App } from "./app";
import { boot, captureLaunch } from "./ui/controller";
import "./styles/tokens.css";
import "./styles/base.css";

captureLaunch();
const root = document.getElementById("app");
if (root) render(<App />, root);
void boot();
