import { connect, openChannel } from "./config.js";
import { EXCHANGE, ROUTING_KEY } from "./topology.js";
import { isMain, runCli } from "./cli.js";

const MESSAGE_COUNT = 10;

async function main() {
  const connection = await connect();
  try {
    // A confirm channel lets us wait until the broker has accepted every message
    // before closing; a plain channel can drop buffered publishes on exit.
    const channel = await openChannel(connection, { confirm: true });
    // Fail fast with a 404 if `npm run setup` hasn't been run, instead of the
    // broker silently closing the channel mid-publish.
    await channel.checkExchange(EXCHANGE);
    for (let i = 0; i < MESSAGE_COUNT; i++) {
      channel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(`Hello ${i}`), {
        headers: { sample: "value" },
      });
    }
    await channel.waitForConfirms();
    console.log(`Published ${MESSAGE_COUNT} messages to exchange=${EXCHANGE} key=${ROUTING_KEY}`);
  } finally {
    await connection.close();
  }
}

if (isMain(import.meta.url)) await runCli(main);
