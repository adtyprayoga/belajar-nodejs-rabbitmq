import { connect, openChannel } from "./config.js";
import { EXCHANGE, QUEUE, ROUTING_KEY, setupTopology } from "./topology.js";
import { runCli } from "./cli.js";

async function main() {
  const connection = await connect();
  try {
    const channel = await openChannel(connection);
    await setupTopology(channel);
    console.log(`Topology ready: exchange=${EXCHANGE} queue=${QUEUE} key=${ROUTING_KEY}`);
  } finally {
    await connection.close().catch(() => {});
  }
}

await runCli(main);
