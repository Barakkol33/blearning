// The worker: reads order events from Kafka and "processes" each order.
// Processing is slow on purpose (WORK_MS), so that load builds up consumer lag you can watch and fix.
import http from 'node:http';
import pg from 'pg';
import { Kafka } from 'kafkajs';
import client from 'prom-client';
import { config, log, retry, sleep, onShutdown, kafkaLogCreator } from './common.js';

const WORK_MS = Number(process.env.WORK_MS ?? 100);
const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9100);

client.collectDefaultMetrics();
const processed = new client.Counter({ name: 'shop_orders_processed_total', help: 'Orders processed by the worker' });
const failures = new client.Counter({ name: 'shop_orders_failed_total', help: 'Orders the worker failed to process' });

const db = new pg.Pool({ connectionString: config.databaseUrl, max: 2 });
db.on('error', (error) => log('error', 'database pool error', { error: error.message }));

const kafka = new Kafka({ clientId: 'shop-worker', brokers: config.kafkaBrokers, logCreator: kafkaLogCreator });
// Workers in one group share the topic: each partition goes to exactly one of them
const consumer = kafka.consumer({ groupId: 'order-workers' });

async function indexForSearch(order) {
	if (!config.searchUrl) return;
	const response = await fetch(`${config.searchUrl}/orders/_doc/${order.id}`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ ...order, status: 'processed' }),
	});
	if (!response.ok) throw new Error(`search answered ${response.status}`);
}

async function handle(order) {
	await sleep(WORK_MS); // the "work": charging a card, sending an email...
	// Idempotent: handling the same order twice ends in the same state. Kafka delivers at least once.
	await db.query("UPDATE orders SET status = 'processed' WHERE id = $1", [order.id]);
	await indexForSearch(order);
}

async function start() {
	await retry('postgres', () => db.query('SELECT 1'));
	await retry('kafka', async () => {
		await consumer.connect();
		await consumer.subscribe({ topic: config.topic, fromBeginning: true });
	});
	await consumer.run({
		eachMessage: async ({ message, partition }) => {
			const order = JSON.parse(message.value.toString());
			try {
				await handle(order);
				processed.inc();
			} catch (error) {
				failures.inc();
				log('error', 'order failed', { order: order.id, partition, error: error.message });
				throw error; // not acknowledged: Kafka will deliver it again
			}
		},
	});
	log('info', 'worker ready', { workMs: WORK_MS, version: config.version });
}

// A tiny server for the probe and the metrics
const server = http.createServer(async (request, response) => {
	if (request.url === '/metrics') {
		response.writeHead(200, { 'content-type': client.register.contentType }).end(await client.register.metrics());
	} else {
		response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
	}
});
server.listen(METRICS_PORT);

onShutdown(async () => {
	await consumer.disconnect(); // leaves the group cleanly, so its partitions move to another worker at once
	await db.end();
	server.close();
});

start().catch((error) => {
	log('error', 'startup failed', { error: error.message });
	process.exit(1);
});
