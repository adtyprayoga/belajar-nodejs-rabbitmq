// Broker reply codes a learner is likely to hit, mapped to the fix.
const FRIENDLY_ERRORS = {
  // NOT_FOUND: the exchange or queue hasn't been declared yet.
  404: "Queue/exchange missing — run npm run setup first",
  // PRECONDITION_FAILED: it exists, but was created (e.g. in the UI) with other settings.
  406: "Exchange/queue exists with different settings — delete it in the UI or run docker compose down -v",
};

/** Run a CLI entry point: print any failure as one line on stderr and exit with code 1. */
export async function runCli(main) {
  try {
    await main();
  } catch (err) {
    console.error(FRIENDLY_ERRORS[err.code] ?? err.message);
    process.exitCode = 1;
  }
}
