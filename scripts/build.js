import { rm } from "node:fs/promises";
import { build } from "esbuild";

await rm("dist", { recursive: true, force: true });

await Promise.all([
  build({
    entryPoints: ["src/index.js"],
    outfile: "dist/index.js",
    bundle: true,
    external: ["@gradio/client"],
    format: "esm",
    platform: "node",
    target: "node18",
    legalComments: "none",
  }),
  build({
    entryPoints: ["src/index.js"],
    outfile: "dist/index.cjs",
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    legalComments: "none",
  }),
  build({
    entryPoints: ["src/cli.js"],
    outfile: "dist/cli.js",
    bundle: true,
    external: ["@gradio/client"],
    format: "esm",
    platform: "node",
    target: "node18",
    legalComments: "none",
  }),
]);
