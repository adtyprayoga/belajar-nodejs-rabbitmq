import { connect, openChannel } from "./config.js";
import { CONSUMER_TAG, QUEUE } from "./topology.js";
import { isMain, runCli } from "./cli.js";

async function main() {
  const connection = await connect();
  let channel;
  try {
    channel = await openChannel(connection);
    // Fail fast with a 404 if `npm run setup` hasn't been run.
    await channel.checkQueue(QUEUE);
  } catch (err) {
    await connection.close().catch(() => {});
    throw err;
  }

  const closed = new Promise((resolve, reject) => {
    connection.on("close", resolve);
    connection.on("error", reject);
  });

  process.once("SIGINT", async () => {
    await channel.close().catch(() => {});
    await connection.close().catch(() => {});
  });

  // noAck: true mirrors autoAck=true in the Go consumer.
  await channel.consume(
    QUEUE,
    (message) => {
      if (message === null) {
        console.log("Consumer cancelled by server");
        connection.close().catch(() => {});
        return;
      }
      console.log("Routing Key:", message.fields.routingKey);
      console.log("Body:", message.content.toString());
    },
    { consumerTag: CONSUMER_TAG, noAck: true },
  );
  console.log(`Waiting for messages on queue=${QUEUE}. Press Ctrl+C to exit.`);

  await closed;
}

if (isMain(import.meta.url)) await runCli(main);
