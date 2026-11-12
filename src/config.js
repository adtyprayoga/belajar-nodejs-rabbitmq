import amqp from "amqplib";

export const AMQP_URL = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672/";

/** Hide the password so error messages are safe to print. */
function redact(url) {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");
}

/** Connect to RabbitMQ, turning a connection failure into a one-line, actionable error. */
export async function connect(url = AMQP_URL) {
  try {
    const connection = await amqp.connect(url);
    // Channel errors are re-emitted here when unhandled; the failing call's rejection reports them.
    connection.on("error", () => {});
    return connection;
  } catch (err) {
    const reason = err.code || err.message || String(err);
    throw new Error(`Cannot connect to RabbitMQ at ${redact(url)}: ${reason}. Is docker compose up?`);
  }
}

/**
 * Open a channel with an `error` listener attached. When the broker closes a
 * channel (e.g. 404 for a missing queue), amqplib rejects the failing call *and*
 * emits `error`; without a listener that event crashes the process with a stack
 * trace before the rejection can be reported. The rejection is what we surface.
 */
export async function openChannel(connection, { confirm = false } = {}) {
  const channel = confirm ? await connection.createConfirmChannel() : await connection.createChannel();
  channel.on("error", () => {});
  return channel;
}
