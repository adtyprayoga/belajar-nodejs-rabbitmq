import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import amqp from "amqplib";
import { run, start, waitFor } from "./helpers.js";

const URL = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672/";

/** Test fixture only: talk to the broker directly to reset state between tests. */
async function withChannel(fn) {
  const connection = await amqp.connect(URL);
  try {
    return await fn(await connection.createChannel());
  } finally {
    await connection.close();
  }
}

async function restoreTopology() {
  const r = await run("setup");
  assert.equal(r.code, 0, r.stderr);
}

beforeEach(async () => {
  await restoreTopology();
  await withChannel((ch) => ch.purgeQueue("email"));
});

test("setup is idempotent: two runs both exit 0", async () => {
  for (let i = 0; i < 2; i++) {
    const r = await run("setup");
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /Topology ready: exchange=notification queue=email key=email/);
  }
});

test("producer delivers Hello 0..9 to a running consumer, in order", async () => {
  const consumer = start("consumer");
  try {
    await waitFor(() => consumer.stdout.includes("Waiting for messages"), 5000, "consumer to start");

    const producer = await run("producer");
    assert.equal(producer.code, 0, producer.stderr);
    assert.match(producer.stdout, /Published 10 messages/);

    await waitFor(() => (consumer.stdout.match(/Body:/g) || []).length >= 10, 5000, "10 messages");
    const bodies = [...consumer.stdout.matchAll(/^Body: (.*)$/gm)].map((m) => m[1]);
    assert.deepEqual(bodies, ["Hello 0", "Hello 1", "Hello 2", "Hello 3", "Hello 4",
      "Hello 5", "Hello 6", "Hello 7", "Hello 8", "Hello 9"]);
    const keys = [...consumer.stdout.matchAll(/^Routing Key: (.*)$/gm)].map((m) => m[1]);
    assert.deepEqual(keys, Array(10).fill("email"));
  } finally {
    consumer.child.kill("SIGINT");
    await consumer.exited;
  }
});

test("producer reports an unreachable broker in one line and exits 1", async () => {
  const r = await run("producer", { AMQP_URL: "amqp://guest:guest@localhost:1/" });
  assert.equal(r.code, 1);
  assert.match(r.stderr.trim(), /^Cannot connect to RabbitMQ at amqp:\/\/guest:\*\*\*@localhost:1\/: .+\. Is docker compose up\?$/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "no stack trace");
});

test("consumer tells you to run setup when the queue is missing, exits 1", async () => {
  await withChannel((ch) => ch.deleteQueue("email"));
  try {
    const r = await run("consumer");
    assert.equal(r.code, 1);
    assert.equal(r.stderr.trim(), "Queue/exchange missing — run npm run setup first");
  } finally {
    await restoreTopology();
  }
});

test("producer tells you to run setup when the exchange is missing, exits 1", async () => {
  await withChannel((ch) => ch.deleteExchange("notification"));
  try {
    const r = await run("producer");
    assert.equal(r.code, 1);
    assert.equal(r.stderr.trim(), "Queue/exchange missing — run npm run setup first");
  } finally {
    await restoreTopology();
  }
});

test("Ctrl+C (SIGINT) stops the consumer cleanly with exit code 0", async () => {
  const consumer = start("consumer");
  try {
    await waitFor(() => consumer.stdout.includes("Waiting for messages"), 5000, "consumer to start");
    consumer.child.kill("SIGINT");
    consumer.child.kill("SIGINT"); // an impatient second Ctrl+C must not turn a clean exit into a crash
    assert.equal(await consumer.exited, 0, consumer.stderr);
  } finally {
    consumer.child.kill("SIGKILL");
  }
});

test("consumer exits 1 with a one-line error when the broker cancels it (queue deleted)", async () => {
  const consumer = start("consumer");
  try {
    await waitFor(() => consumer.stdout.includes("Waiting for messages"), 5000, "consumer to start");
    await withChannel((ch) => ch.deleteQueue("email"));
    assert.equal(await consumer.exited, 1);
    assert.equal(consumer.stderr.trim(), "Consumer cancelled by server — was the queue deleted? Run npm run setup");
  } finally {
    consumer.child.kill("SIGINT");
    await restoreTopology();
  }
});
