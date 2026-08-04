/**
 * Bundles the non-React parts of the extension:
 *  - content script  -> dist/content.js   (IIFE — MV3 requires classic scripts)
 *  - background      -> dist/background.js (ESM — module service worker)
 *
 * Run via:  node scripts/build-scripts.mjs [--watch]
 */
import { build, context } from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const entries = [
  {
    entryPoints: [resolve(root, "src/content/index.ts")],
    outfile: resolve(root, "dist/content.js"),
    format: "iife",
    target: "chrome116",
  },
  {
    entryPoints: [resolve(root, "src/background/service-worker.ts")],
    outfile: resolve(root, "dist/background.js"),
    format: "esm",
    target: "chrome116",
  },
  {
    entryPoints: [resolve(root, "src/options/options.ts")],
    outfile: resolve(root, "dist/options.js"),
    format: "iife",
    target: "chrome116",
  },
];

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  minify: false,
  sourcemap: false,
  logLevel: "info",
};

if (watch) {
  const contexts = await Promise.all(
    entries.map((e) => context({ ...common, ...e })),
  );
  await Promise.all(contexts.map((c) => c.watch()));
  console.log("watching extension scripts...");
} else {
  for (const e of entries) {
    await build({ ...common, ...e });
  }
  console.log("extension scripts built -> dist/content.js, dist/background.js, dist/options.js");
}
