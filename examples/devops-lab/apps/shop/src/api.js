// The orders API.
//   POST /api/orders        insert into PostgreSQL, publish an event to Kafka
//   GET  /api/orders        latest orders, cached in Redis for a few seconds (cache-aside)
//   GET  /api/stats         how many orders are in each status
//   GET  /api/search?q=     full-text search in Elasticsearch (when search is switched on)
//   GET  /api/burn?ms=      burns CPU, to make the autoscaler react
//   GET  /api/fail?rate=    answers 500 for a share of requests, to make the error alert fire
//   GET  /healthz /readyz   liveness and readiness probes
//   GET  /metrics           Prometheus metrics
import http from 'node:http';
import os from 'node:os';
import pg from 'pg';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import client from 'prom-client';
import { config, log, retry, onShutdown, kafkaLogCreator } from './common.js';

const CACHE_KEY = 'orders:latest';
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 5);

// --- metrics -------------------------------------------------------------------------------
client.collectDefaultMetrics();
const requests = new client.Counter({
	name: 'http_requests_total',
	help: 'HTTP requests handled',
	labelNames: ['method', 'route', 'status'],
});
const duration = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration',
	labelNames: ['method', 'route'],
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});
const cacheLookups = new client.Counter({
	name: 'shop_cache_lookups_total',
	help: 'Lookups of the orders list in the Redis cache',
	labelNames: ['result'],
});
const ordersCreated = new client.Counter({ name: 'shop_orders_created_total', help: 'Orders created' });

// --- dependencies --------------------------------------------------------------------------
const db = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
db.on('error', (error) => log('error', 'database pool error', { error: error.message }));

const cache = createClient({ url: config.redisUrl });
cache.on('error', (error) => log('error', 'redis error', { error: error.message }));

const kafka = new Kafka({ clientId: 'shop-api', brokers: config.kafkaBrokers, logCreator: kafkaLogCreator });
const producer = kafka.producer();

async function start() {
	await retry('postgres', () =>
		db.query(`
			CREATE TABLE IF NOT EXISTS orders (
				id         serial PRIMARY KEY,
				item       text NOT NULL,
				quantity   integer NOT NULL,
				status     text NOT NULL DEFAULT 'new',
				created_at timestamptz NOT NULL DEFAULT now()
			)`),
	);
	await retry('redis', () => cache.connect());
	await retry('kafka', async () => {
		const admin = kafka.admin();
		await admin.connect();
		try {
			// 3 partitions: up to 3 workers can share the topic
			await admin.createTopics({ topics: [{ topic: config.topic, numPartitions: 3, replicationFactor: 1 }] });
		} finally {
			await admin.disconnect();
		}
		await producer.connect();
	});
	ready = true;
	log('info', 'api ready', { port: config.port, version: config.version });
}

// --- handlers ------------------------------------------------------------------------------
let ready = false;

const routes = {
	'GET /healthz': async () => ({ body: { status: 'ok' } }),

	// Ready = able to serve. A pod that is not ready gets no traffic, and is not restarted.
	'GET /readyz': async () => {
		if (!ready) return { status: 503, body: { status: 'starting' } };
		await db.query('SELECT 1');
		await cache.ping();
		return { body: { status: 'ready' } };
	},

	'GET /metrics': async () => ({ raw: await client.register.metrics(), type: client.register.contentType }),

	'GET /api/orders': async () => {
		const cached = await cache.get(CACHE_KEY);
		if (cached) {
			cacheLookups.inc({ result: 'hit' });
			return { body: JSON.parse(cached), headers: { 'x-cache': 'hit' } };
		}
		cacheLookups.inc({ result: 'miss' });
		const { rows } = await db.query('SELECT * FROM orders ORDER BY id DESC LIMIT 20');
		await cache.set(CACHE_KEY, JSON.stringify(rows), { EX: CACHE_TTL_SECONDS });
		return { body: rows, headers: { 'x-cache': 'miss' } };
	},

	'POST /api/orders': async ({ json }) => {
		const item = String(json?.item ?? '').trim();
		const quantity = Number(json?.quantity ?? 1);
		if (!item || !Number.isInteger(quantity) || quantity < 1) {
			return { status: 400, body: { error: 'item (text) and quantity (positive integer) are required' } };
		}
		const { rows } = await db.query('INSERT INTO orders (item, quantity) VALUES ($1, $2) RETURNING *', [item, quantity]);
		const order = rows[0];
		// The key decides the partition, so events of one order always stay in order
		await producer.send({ topic: config.topic, messages: [{ key: String(order.id), value: JSON.stringify(order) }] });
		await cache.del(CACHE_KEY); // invalidate
		ordersCreated.inc();
		return { status: 201, body: order };
	},

	'GET /api/stats': async () => {
		const { rows } = await db.query('SELECT status, count(*)::int AS count FROM orders GROUP BY status ORDER BY status');
		return { body: { served_by: os.hostname(), version: config.version, orders: rows } };
	},

	'GET /api/search': async ({ query }) => {
		if (!config.searchUrl) return { status: 501, body: { error: 'search is switched off (lab:search)' } };
		const response = await fetch(`${config.searchUrl}/orders/_search`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query: { match: { item: query.get('q') ?? '' } }, size: 20 }),
		});
		if (response.status === 404) return { body: [] }; // nothing indexed yet
		const result = await response.json();
		return { body: (result.hits?.hits ?? []).map((hit) => ({ score: hit._score, ...hit._source })) };
	},

	'GET /api/burn': async ({ query }) => {
		const ms = Math.min(Number(query.get('ms') ?? 200), 5000);
		const end = Date.now() + ms;
		let n = 0;
		while (Date.now() < end) n += Math.sqrt(n + 1); // blocks the event loop on purpose
		return { body: { burned_ms: ms } };
	},

	'GET /api/fail': async ({ query }) => {
		const rate = Number(query.get('rate') ?? 0.5);
		if (Math.random() < rate) throw new Error('failure injected by /api/fail');
		return { body: { status: 'lucky' } };
	},
};

async function readJson(request) {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	if (!chunks.length) return undefined;
	try {
		return JSON.parse(Buffer.concat(chunks).toString());
	} catch {
		return undefined;
	}
}

const server = http.createServer(async (request, response) => {
	const url = new URL(request.url, 'http://localhost');
	const route = `${request.method} ${url.pathname}`;
	const handler = routes[route];
	const label = handler ? url.pathname : 'other'; // unknown paths share one label: keeps cardinality low
	const stop = duration.startTimer({ method: request.method, route: label });
	let status = 200;
	try {
		if (!handler) {
			status = 404;
			response.writeHead(404, { 'content-type': 'application/json' }).end('{"error":"not found"}');
			return;
		}
		const result = await handler({ query: url.searchParams, json: request.method === 'POST' ? await readJson(request) : undefined });
		status = result.status ?? 200;
		if (result.raw !== undefined) {
			response.writeHead(status, { 'content-type': result.type }).end(result.raw);
		} else {
			response.writeHead(status, { 'content-type': 'application/json', ...result.headers }).end(JSON.stringify(result.body));
		}
	} catch (error) {
		status = 500;
		log('error', 'request failed', { route, error: error.message });
		response.writeHead(500, { 'content-type': 'application/json' }).end('{"error":"internal error"}');
	} finally {
		stop();
		requests.inc({ method: request.method, route: label, status });
	}
});

onShutdown(async () => {
	ready = false;
	await new Promise((resolve) => server.close(resolve)); // stop accepting, finish open requests
	await producer.disconnect();
	await cache.quit();
	await db.end();
});

server.listen(config.port, () => log('info', 'listening', { port: config.port }));
start().catch((error) => {
	log('error', 'startup failed', { error: error.message });
	process.exit(1);
});
