// `npm run ui:add -w @curo/web -- <component...>`: runs `shadcn add`, then undoes
// what the radix-vega registry gets wrong for us. Its components import `cn` from
// shadcn's "cn" package, which shadcn installs as a dependency; ours lives in the
// utils module beside them in src/ui. So the imports are pointed there and the
// unused package is removed again.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const run = (command, args) => execFileSync(command, args, { stdio: "inherit" });

run("npx", ["shadcn", "add", ...process.argv.slice(2)]);

const uiDir = new URL("../src/ui/", import.meta.url);
for (const name of readdirSync(uiDir).filter((n) => n.endsWith(".tsx"))) {
  const file = new URL(name, uiDir);
  const source = readFileSync(file, "utf8");
  const fixed = source.replaceAll('from "cn"', 'from "./utils"');
  if (fixed !== source) {
    writeFileSync(file, fixed);
    console.log(`Fixed the cn import in src/ui/${name}`);
  }
}

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (manifest.dependencies?.cn) {
  run("npm", ["uninstall", "cn"]);
  console.log('Removed the unused "cn" dependency');
}
