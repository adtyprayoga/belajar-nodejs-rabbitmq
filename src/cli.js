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
