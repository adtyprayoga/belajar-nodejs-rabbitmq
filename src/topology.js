// Names taken verbatim from the Go example (producer/main.go, consumer/main.go).
export const EXCHANGE = "notification";
export const QUEUE = "email";
export const ROUTING_KEY = "email";
export const CONSUMER_TAG = "consumer-email";

/** Declare the exchange, queue and binding. Safe to call any number of times. */
export async function setupTopology(channel) {
  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
}
