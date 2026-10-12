import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dir = "dist/assets";
const files = readdirSync(dir).filter((name) => /^index-.*\.js$/.test(name) && !name.includes("legacy"));
if (files.length !== 1) {
  console.error("bundle: oczekiwany jeden plik startowy index-*.js, jest:", files.join(", ") || "(brak)");
  process.exit(1);
}
const bytes = gzipSync(readFileSync(join(dir, files[0]))).length;
const kb = bytes / 1024;
console.log(`bundle startowy: ${kb.toFixed(1)} KB gzip (${files[0]})`);
if (bytes >= 120 * 1024) {
  console.error("bundle startowy ma mieć poniżej 120 KB gzip");
  process.exit(1);
}
