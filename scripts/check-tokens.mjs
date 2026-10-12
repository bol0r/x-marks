// Pilnuje, że kolory są tylko w src/styles/tokens.css (poza nakładką na zdjęcie).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const color = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
const allowFile = new Set(["src/styles/tokens.css"]);
const allowLine = /nakładk|on-photo|scrim/;

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files(p, out);
    else if (/\.(css|tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const bad = [];
for (const file of files(join(root, "src"))) {
  const rel = file.slice(root.length).replaceAll("\\", "/");
  if (allowFile.has(rel)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (allowLine.test(line)) return;
    if (color.test(line)) bad.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
}
if (bad.length) {
  console.error("Kolor poza tokenami:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("tokeny: ok");
