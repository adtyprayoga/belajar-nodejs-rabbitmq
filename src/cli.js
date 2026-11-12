import { pathToFileURL } from "node:url";

/** True when the calling module was started directly with `node <file>`. */
export function isMain(importMetaUrl) {
  return process.argv[1] !== undefined && importMetaUrl === pathToFileURL(process.argv[1]).href;
}

/** Run a CLI entry point: print any failure as one line on stderr and exit with code 1. */
export async function runCli(main) {
  try {
    await main();
  } catch (err) {
    // AMQP 404 NOT_FOUND: the exchange or queue hasn't been declared yet.
    const message = err.code === 404 ? "Queue/exchange missing — run npm run setup first" : err.message;
    console.error(message);
    process.exitCode = 1;
  }
}
