# belajar-nodejs-rabbitmq

A Node.js port of [ProgrammerZamanNow/belajar-golang-rabbitmq](https://github.com/ProgrammerZamanNow/belajar-golang-rabbitmq).

A **producer** publishes 10 messages (`Hello 0` … `Hello 9`, header `sample: value`) to the exchange `notification` with routing key `email`. A **consumer** reads the queue `email` and prints each message's routing key and body.

The Go example expects you to create the exchange and queue by hand in the RabbitMQ UI. Here, `npm run setup` does it for you.

## Prerequisites

- Node.js 22.9 or newer (`node -v`)
- Docker with Compose v2 (`docker compose version`)

## Running

```bash
# 1. Install dependencies and create your local config
npm install
cp .env.example .env

# 2. Start RabbitMQ (waits until the broker is healthy)
docker compose up -d --wait

# 3. Create the exchange, queue and binding (safe to run again)
npm run setup
```

```
Topology ready: exchange=notification queue=email key=email
```

Then use two terminals:

```bash
# Terminal 1: listen for messages (Ctrl+C to stop)
npm run consumer
```

```bash
# Terminal 2: publish 10 messages
npm run producer
```

Terminal 2 prints:

```
Published 10 messages to exchange=notification key=email
```

Terminal 1 prints:

```
Waiting for messages on queue=email. Press Ctrl+C to exit.
Routing Key: email
Body: Hello 0
Routing Key: email
Body: Hello 1
...
Routing Key: email
Body: Hello 9
```

Run the producer as many times as you like while the consumer keeps running. If you run the producer while no consumer is running, the messages wait in the `email` queue and arrive when you start the consumer.

## RabbitMQ management UI

Open http://localhost:15672 and log in as `guest` / `guest`. You can watch the `notification` exchange, the `email` queue and message rates there.

## Configuration

| Variable   | Default                              | Meaning               |
| ---------- | ------------------------------------ | --------------------- |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672/` | Broker to connect to. |

The npm scripts read `.env` (copied from `.env.example` in step 1), so edit it there. An `AMQP_URL` you set in your shell takes precedence over `.env`, for example `AMQP_URL=amqp://user:pass@other-host:5672/ npm run producer`.

## Tests

The tests start the real `setup`, `producer` and `consumer` scripts against the RabbitMQ from step 2, so start it first:

```bash
docker compose up -d --wait
npm test
```

## Troubleshooting

| Message / problem | Fix |
| --- | --- |
| `Cannot connect to RabbitMQ at …. Is docker compose up?` | Start the broker: `docker compose up -d --wait`. Check `AMQP_URL` if you changed it. |
| `Queue/exchange missing — run npm run setup first` | Run `npm run setup`. |
| `Consumer cancelled by server — was the queue deleted? Run npm run setup` | The `email` queue was deleted while the consumer was running (for example, from the UI). Run `npm run setup`, then start the consumer again. |
| `.env not found. Continuing without it.` | Harmless. Run `cp .env.example .env` to silence it. |
| `Bind for 0.0.0.0:5672 failed: port is already allocated` | Another RabbitMQ is using port 5672 or 15672. Stop it, or change the left side of `ports:` in `docker-compose.yml` and set `AMQP_URL` to match. |

## Stopping

```bash
docker compose down      # stop RabbitMQ and keep its data
docker compose down -v   # stop RabbitMQ and delete its data (queues, messages)
```

## Project layout

| Node.js              | Go original        | What it does                                              |
| -------------------- | ------------------ | --------------------------------------------------------- |
| `src/producer.js`    | `producer/main.go` | Publishes `Hello 0`…`Hello 9` to `notification` / `email` |
| `src/consumer.js`    | `consumer/main.go` | Consumes queue `email`, prints routing key and body       |
| `src/setup.js`       | (manual UI steps)  | Declares exchange, queue and binding                      |
| `src/topology.js`    |                    | Exchange, queue, routing key and consumer tag names       |
| `src/config.js`      |                    | `AMQP_URL` (from `.env`), connecting and opening channels |
| `src/cli.js`         |                    | One-line errors and exit codes for the scripts            |
| `docker-compose.yml` |                    | RabbitMQ 4 with the management UI                         |
| `test/cli.test.js`   |                    | Runs the scripts against the real broker                  |
