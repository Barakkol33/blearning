// Shared by the api, the worker and the load generator: config from the environment,
// JSON logs to stdout, retries for dependencies that are not up yet, graceful shutdown.

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
