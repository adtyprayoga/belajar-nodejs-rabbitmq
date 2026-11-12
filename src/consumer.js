import { connect, openChannel } from "./config.js";
import { CONSUMER_TAG, QUEUE } from "./topology.js";
import { runCli } from "./cli.js";

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

  let rejectClosed;
  const closed = new Promise((resolve, reject) => {
    rejectClosed = reject;
    connection.on("close", resolve);
    connection.on("error", reject);
  });

  let stopping = false;
  process.on("SIGINT", async () => {
    if (stopping) return; // ignore repeated Ctrl+C while we're already closing
    stopping = true;
    await channel.close().catch(() => {});
    await connection.close().catch(() => {});
  });

  // noAck: true mirrors autoAck=true in the Go consumer.
  await channel.consume(
    QUEUE,
    (message) => {
      if (message === null) {
        // The broker cancelled us, e.g. because the queue was deleted.
        rejectClosed(new Error("Consumer cancelled by server — was the queue deleted? Run npm run setup"));
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

await runCli(main);
