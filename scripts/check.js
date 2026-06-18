import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "bin", "scripts", "test"];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await collect(path);
    } else if (extname(path) === ".js") {
      files.push(path);
    }
  }
}

for (const root of roots) {
  await collect(root);
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exitCode = result.status || 1;
    break;
  }
}

if (!process.exitCode) {
  console.log(`Syntax check passed for ${files.length} JavaScript files.`);
}
