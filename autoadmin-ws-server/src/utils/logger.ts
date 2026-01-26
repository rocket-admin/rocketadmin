import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
	level: config.logLevel,
	transport: {
		target: 'pino/file',
		options: { destination: 1 }, // stdout
	},
	formatters: {
		level: (label) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});
