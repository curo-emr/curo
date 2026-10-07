import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The same rules as the portals, so shared code is held to what its consumers are.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // A library has no pages directory to check links against.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);
