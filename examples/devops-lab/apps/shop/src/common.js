// Shared by the api, the worker and the load generator: config from the environment,
// JSON logs to stdout, retries for dependencies that are not up yet, graceful shutdown.

import RequestQueue from 'kafkajs/src/network/requestQueue/index.js';

// A fix for kafkajs 2.2.4, its last release. While a broker connection is idle and not throttled,
// the library re-arms a timer with a negative delay, which Node runs every 1 ms, forever: an idle
// pod then uses about 80m of CPU, and the autoscaler scales the API to its maximum with no traffic.
// Found by running the lab: `kubectl top pods` showed idle pods at 80% of their CPU request.
// Here the check is scheduled only when there is something to wait for.
RequestQueue.prototype.scheduleCheckPendingRequests = function () {
	if (this.throttleCheckTimeoutId) return;
	const throttledFor = this.throttledUntil - Date.now();
	if (throttledFor <= 0 && this.pending.length === 0) return;
	this.throttleCheckTimeoutId = setTimeout(() => {
		this.throttleCheckTimeoutId = null;
		this.checkPendingRequests();
	}, throttledFor > 0 ? throttledFor : 10);
};

export const config = {
	port: Number(process.env.PORT ?? 8080),
	databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/shop',
	redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
	kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
	searchUrl: process.env.SEARCH_URL ?? '', // empty = search is switched off
	topic: 'orders',
	version: process.env.APP_VERSION ?? 'dev',
};

/** One JSON object per line: the format log collectors expect. */
export function log(level, message, fields = {}) {
	console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }));
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Keep trying until a dependency answers. Pods start in any order, so nothing may assume the database is already up. */
export async function retry(name, fn, { delayMs = 2000 } = {}) {
	for (let attempt = 1; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			log('warn', `waiting for ${name}`, { attempt, error: error.message });
			await sleep(delayMs);
		}
	}
}

/** Kubernetes sends SIGTERM, waits (30s by default), then kills. Finish the open work in that window. */
export function onShutdown(cleanup) {
	let stopping = false;
	for (const signal of ['SIGTERM', 'SIGINT']) {
		process.on(signal, async () => {
			if (stopping) return;
			stopping = true;
			log('info', 'shutting down', { signal });
			try {
				await cleanup();
			} catch (error) {
				log('error', 'error during shutdown', { error: error.message });
			}
			process.exit(0);
		});
	}
}

/** Kafka's own logs, in the same JSON format (and without the noise below "warn"). */
export const kafkaLogCreator = () => ({ level, log: entry }) => {
	if (level <= 2) log(level === 1 ? 'error' : 'warn', entry.message, { component: 'kafka' });
};
