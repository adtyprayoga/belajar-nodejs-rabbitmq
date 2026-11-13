# Demonstrate RabbitMQ from setup to live delivery

Use this 15–20 minute guide to show messages waiting in a queue, draining when a consumer starts, and arriving live. Use two terminals and a browser. The example prints messages; it does not send actual emails.

## Prepare before presenting

Use a disposable local broker. Install Node.js 22.9 or newer and Docker with Compose. Start Docker and make ports `5672` and `15672` available. Download dependencies and the Docker image before presenting if the venue's connection is unreliable.

Open both terminals in the repository root. On this workstation:

```bash
cd /home/adity/workspace/rabbitmq
```

Use your own checkout path on another machine. Label the terminals A and B. Terminal A runs setup and the producer. Terminal B runs the consumer.

## 1. Start RabbitMQ (5 minutes)

In Terminal A:

```bash
node -v
docker compose version
npm install
test -f .env || cp .env.example .env
docker compose up -d --wait
docker compose ps
npm run setup
```

Check that Docker reports a healthy broker. Setup prints:

```text
Topology ready: exchange=notification queue=email key=email
```

Say:

> RabbitMQ runs inside Docker. Our Node.js scripts connect to it. Setup creates the exchange, queue, and binding. Running setup again is safe.

For a rehearsal, run `npm test` now with all consumers stopped. Tests purge the `email` queue and delete and recreate topology. Run them only against the disposable demo broker, never during the presentation.

## 2. Show the message path (3 minutes)

```text
Producer → notification exchange → email queue → Consumer
               routing key: email
```

Open [the RabbitMQ dashboard](http://localhost:15672). Log in with username `guest` and password `guest`.

1. Open **Exchanges → notification**. Show its `direct` type and the binding to the `email` queue with binding key `email`.
2. Open **Queues and Streams → email**. Show the ready-message count and consumer count.
3. Confirm that there are zero consumers and zero ready messages before starting the demo.

If a consumer is running, stop it with Ctrl+C. If the queue contains leftover demo messages, start `npm run consumer`, let it drain, then stop it with Ctrl+C. Do this only with messages you intend to consume.

Say:

> The producer publishes to an exchange. A direct exchange routes messages using an exact routing-key match. The queue holds messages until a consumer receives them.

Point out that port `5672` handles application messaging and port `15672` serves the dashboard.

## 3. Publish with no consumer (3 minutes)

Leave Terminal B idle. In Terminal A:

```bash
npm run producer
```

Expected output:

```text
Published 10 messages to exchange=notification key=email
```

After the dashboard refreshes, show **Ready: 10** and **Consumers: 0**. Avoid **Get messages** in the dashboard because that action can change the queue contents.

Say:

> The producer has finished, but its messages are still waiting. The consumer does not have to be running when messages are published.

## 4. Drain the queue and publish live (4 minutes)

In Terminal B:

```bash
npm run consumer
```

The output includes the following lines. The ellipsis represents the remaining messages:

```text
Waiting for messages on queue=email. Press Ctrl+C to exit.
Routing Key: email
Body: Hello 0
...
Routing Key: email
Body: Hello 9
```

Show **Ready: 0** and **Consumers: 1** after the dashboard refreshes.

Keep Terminal B running. In Terminal A:

```bash
npm run producer
```

Watch another ten messages appear in Terminal B.

Say:

> Now the consumer is available, so messages are delivered immediately.

The ready-message count may stay at zero because consumption is faster than the dashboard refresh. Use the terminal output as evidence of delivery.

## 5. Pause, build a backlog, and close (3 minutes)

Stop Terminal B with Ctrl+C. In Terminal A:

```bash
npm run producer
npm run producer
```

Show **Ready: 20** and **Consumers: 0**. Restart the consumer in Terminal B:

```bash
npm run consumer
```

Watch 20 messages drain and the ready count return to zero. Each producer run starts numbering again at `Hello 0`.

Say:

> The producer and consumer work independently. RabbitMQ buffers messages while the consumer is stopped.

Explain the limits of this example before closing:

- The consumer uses automatic acknowledgement, `noAck: true`. This demo does not prove successful processing or retries after a crash.
- The exchange and queue are durable, but messages are not published as persistent. Do not promise message survival across broker restarts.
- Publisher confirms establish broker acceptance, not completed consumer work.

Stop the consumer with Ctrl+C. In Terminal A:

```bash
docker compose down
```

This retains the Docker volume. Use `docker compose down -v` only when you intend to delete the stored broker data.

## Check the rehearsal results

The walkthrough is ready when you observe all of these results:

- Ten messages wait with no consumer.
- Starting the consumer drains those ten messages.
- A running consumer receives the next ten messages.
- Pausing the consumer allows 20 messages to accumulate, then restarting it drains them.

If the broker cannot connect, check `docker compose ps` and `AMQP_URL` in `.env`. A shell-level `AMQP_URL` overrides `.env`. If the Docker socket reports permission denied, use a terminal with access to your Docker daemon. If the queue or exchange is missing, run `npm run setup` again. For port conflicts and other errors, see [README troubleshooting](../README.md#troubleshooting).
