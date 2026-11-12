import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** Start a CLI script (e.g. "setup") as a child process, collecting its output. */
export function start(script, env = {}) {
  const child = spawn(process.execPath, [`src/${script}.js`], {
    cwd: root,
    env: { ...process.env, ...env },
  });
  const proc = { child, stdout: "", stderr: "" };
  child.stdout.on("data", (d) => (proc.stdout += d));
  child.stderr.on("data", (d) => (proc.stderr += d));
  proc.exited = new Promise((resolve) => child.on("close", (code) => resolve(code)));
  return proc;
}

/** Run a CLI script to completion. Resolves { code, stdout, stderr }. */
export async function run(script, env) {
  const proc = start(script, env);
  const code = await proc.exited;
  return { code, stdout: proc.stdout, stderr: proc.stderr };
}

/** Poll until predicate() is true, or fail after timeoutMs. */
export async function waitFor(predicate, timeoutMs = 5000, what = "condition") {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
