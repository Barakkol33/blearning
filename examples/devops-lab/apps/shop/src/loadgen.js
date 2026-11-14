// The load generator: a steady stream of customers.
// It is deployed with 0 replicas. Scale it up to put load on the system, and back to 0 to stop.
import { log, sleep, onShutdown } from './common.js';

const API_URL = process.env.API_URL ?? 'http://localhost:8080';
const ORDERS_PER_SECOND = Number(process.env.ORDERS_PER_SECOND ?? 20);
const BURN_MS = Number(process.env.BURN_MS ?? 0); // above 0: also call /api/burn, to load the CPU

const ITEMS = ['red bicycle', 'blue bicycle', 'coffee machine', 'coffee beans', 'desk lamp', 'office chair', 'notebook', 'water bottle'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let running = true;
onShutdown(async () => {
	running = false;
});

let sent = 0;
let failed = 0;

async function call(path, options) {
	try {
		const response = await fetch(`${API_URL}${path}`, { ...options, signal: AbortSignal.timeout(5000) });
		await response.arrayBuffer();
		if (!response.ok) failed++;
	} catch {
		failed++;
	}
	sent++;
}

setInterval(() => {
	log('info', 'load', { requests: sent, failed });
	sent = 0;
	failed = 0;
}, 10000).unref();

log('info', 'load generator started', { api: API_URL, ordersPerSecond: ORDERS_PER_SECOND, burnMs: BURN_MS });
while (running) {
	const tick = Date.now();
	for (let i = 0; i < ORDERS_PER_SECOND; i++) {
		call('/api/orders', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ item: pick(ITEMS), quantity: 1 + Math.floor(Math.random() * 3) }),
		});
		call('/api/orders'); // each customer also looks at the list
		if (BURN_MS > 0) call(`/api/burn?ms=${BURN_MS}`);
	}
	await sleep(Math.max(0, 1000 - (Date.now() - tick)));
}
