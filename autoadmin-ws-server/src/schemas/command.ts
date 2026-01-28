import { z } from 'zod';
import { COMMAND_TYPE } from '../constants/command-type.js';

export const commandBodySchema = z
	.object({
		operationType: z.nativeEnum(COMMAND_TYPE).optional(),
		connectionToken: z.string().optional(),
		resId: z.string().optional(),
		// Allow additional properties for command-specific data
	})
	.passthrough();

export type CommandBody = z.infer<typeof commandBodySchema>;

export const wsMessageSchema = z
	.object({
		operationType: z.nativeEnum(COMMAND_TYPE).optional(),
		connectionToken: z.string().optional(),
		resId: z.string().optional(),
	})
	.passthrough();

export type WsMessage = z.infer<typeof wsMessageSchema>;
