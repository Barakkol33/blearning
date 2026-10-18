// Local preview of public + private content together:
// runs `astro dev` with the private repo's content/ as an extra content root.
import { spawn } from 'node:child_process';

const extra = process.env.BLEARNING_EXTRA_CONTENT ?? '../../blearning/content';
spawn('npx', ['astro', 'dev', ...process.argv.slice(2)], {
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, BLEARNING_EXTRA_CONTENT: extra },
}).on('exit', (code) => process.exit(code ?? 0));
