import { spawn } from 'node:child_process';
import process from 'node:process';

if (process.argv.length < 3) {
	console.error('Usage: node _run-with-timing.mjs <command> [args...]');
	process.exit(2);
}

const [, , command, ...args] = process.argv;
const start = process.hrtime.bigint();

const child = spawn(command, args, { stdio: 'inherit', shell: false });

const formatDuration = (ns) => {
	const totalSeconds = Number(ns) / 1e9;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds - minutes * 60;
	if (minutes > 0) {
		return `${minutes}m ${seconds.toFixed(1)}s`;
	}
	return `${seconds.toFixed(2)}s`;
};

const printTiming = (label) => {
	const elapsed = process.hrtime.bigint() - start;
	const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
	console.log(`\n[${stamp}] ${label} in ${formatDuration(elapsed)}`);
};

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
	process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
	if (signal) {
		printTiming(`Tests terminated by ${signal}`);
		process.exit(1);
		return;
	}
	printTiming(code === 0 ? 'Tests completed' : `Tests failed (exit ${code})`);
	process.exit(code ?? 1);
});

child.on('error', (err) => {
	console.error(`Failed to start child process: ${err.message}`);
	process.exit(1);
});
