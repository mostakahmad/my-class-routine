import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const www = resolve(root, "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
mkdirSync(resolve(www, "assets"), { recursive: true });

cpSync(resolve(root, "css"), resolve(www, "css"), { recursive: true });
cpSync(resolve(root, "icons"), resolve(www, "icons"), { recursive: true });
cpSync(resolve(root, "manifest.json"), resolve(www, "manifest.json"));

const html = readFileSync(resolve(root, "index.html"), "utf8");
writeFileSync(resolve(www, "index.html"), html);

await build({
  entryPoints: [resolve(root, "js/main.js")],
  bundle: true,
  format: "esm",
  outfile: resolve(www, "assets/app.js"),
  target: ["es2020"],
  sourcemap: true,
});

mkdirSync(resolve(root, "assets"), { recursive: true });
const bundle = readFileSync(resolve(www, "assets/app.js"), "utf8").replace(
  /\n\/\/# sourceMappingURL=.*\n?$/,
  "\n"
);
writeFileSync(resolve(root, "assets/app.js"), bundle);

await build({
  entryPoints: [resolve(root, "sw.js")],
  bundle: true,
  format: "iife",
  outfile: resolve(www, "sw.js"),
  target: ["es2020"],
});

console.log("Built www/ successfully");
