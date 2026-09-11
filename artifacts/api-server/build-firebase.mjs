import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const source = new URL(".firebase-build/", root);
await mkdir(source, { recursive: true });
const pkg = JSON.parse(await readFile(new URL("package.json", import.meta.url), "utf8"));
const dependencies = Object.fromEntries(Object.entries(pkg.dependencies).filter(([name]) => !name.startsWith("@workspace/")));
await build({
  entryPoints: [fileURLToPath(new URL("src/functions.ts", import.meta.url))],
  outfile: fileURLToPath(new URL("index.cjs", source)),
  bundle: true, platform: "node", target: "node22", format: "cjs", sourcemap: true,
  external: Object.keys(dependencies),
  define: { "process.env.NODE_ENV": '"production"' },
});
await writeFile(new URL("package.json", source), JSON.stringify({ name: "ivf-directory-firebase", private: true, main: "index.cjs", engines: { node: "22" }, dependencies }, null, 2) + "\n");
