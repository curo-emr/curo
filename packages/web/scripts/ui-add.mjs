// `npm run ui:add -w @curo/web -- <component...>`: runs `shadcn add`, then fixes
// the import the radix-vega registry ships broken. Its components import `cn`
// from "cn" rather than from the utils module beside them in src/ui.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

execFileSync("npx", ["shadcn", "add", ...process.argv.slice(2)], { stdio: "inherit" });

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
