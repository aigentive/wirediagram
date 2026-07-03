import { execFile } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(packageRoot, "dist");
const sourceCss = resolve(packageRoot, "src/styles.css");
const distCss = resolve(distDir, "styles.css");

async function clean() {
  await rm(distDir, { recursive: true, force: true });
}

function runTsc() {
  const tscPath = require.resolve("typescript/bin/tsc");
  return new Promise((resolveRun, rejectRun) => {
    execFile(
      process.execPath,
      [tscPath, "-p", "tsconfig.json"],
      { cwd: packageRoot },
      (error, stdout, stderr) => {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        if (error) {
          rejectRun(error);
          return;
        }
        resolveRun();
      }
    );
  });
}

async function copyCss() {
  await mkdir(distDir, { recursive: true });
  await copyFile(sourceCss, distCss);
}

if (process.argv.includes("--clean")) {
  await clean();
} else {
  await clean();
  await runTsc();
  await copyCss();
}
