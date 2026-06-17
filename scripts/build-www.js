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
cpSync(resolve(root, "sw.js"), resolve(www, "sw.js"));

let html = readFileSync(resolve(root, "index.html"), "utf8");
html = html.replace(
  '<script type="module" src="/js/main.js"></script>',
  '<script type="module" src="./assets/app.js"></script>'
);
writeFileSync(resolve(www, "index.html"), html);

await build({
  entryPoints: [resolve(root, "js/main.js")],
  bundle: true,
  format: "esm",
  outfile: resolve(www, "assets/app.js"),
  target: ["es2020"],
  sourcemap: true,
});

console.log("Built www/ successfully");
