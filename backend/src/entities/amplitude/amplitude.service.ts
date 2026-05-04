import Amplitude from '@amplitude/node';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmplitudeEventTypeEnum } from '../../enums/amplitude-event-type.enum.js';
import { UserEntity } from '../user/user.entity.js';

export interface AmplitudeLogOptions {
	user_email?: string;
	tablesCount?: number;
	reason?: string;
	message?: string;
	operationCount?: number;
}

@Injectable()
export class AmplitudeService implements OnModuleInit {
	private client: ReturnType<typeof Amplitude.init>;

	constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
	) {}

	public onModuleInit(): void {
		if (process.env.AMPLITUDE_API_KEY) {
			this.client = Amplitude.init(process.env.AMPLITUDE_API_KEY);
		}
	}

	public async formAndSendLogRecord(
		event_type: AmplitudeEventTypeEnum,
		user_id: string,
		options?: AmplitudeLogOptions,
	): Promise<void> {
		try {
			if (process.env.NODE_ENV === 'test') return;
			let user_email = (await this.userRepository.findOne({ where: { id: user_id } }))?.email;
			if (!user_email && options) {
				user_email = options.user_email;
			}
			let event_properties: Record<string, unknown> | undefined;
			if (user_email) {
				event_properties = {
					user_properties: {
						email: user_email ?? 'unknown',
						tablesCount: options?.tablesCount,
						reason: options?.reason,
						message: options?.message,
					},
				};
			}
			if (options?.operationCount && options.operationCount > 0) {
				const promisesArr = Array.from(Array(options.operationCount), () =>
					this.sendLog(event_type, user_id, event_properties),
				);
				await Promise.allSettled(promisesArr);
				return;
			}
			await this.sendLog(event_type, user_id, event_properties);
		} catch (e) {
			console.error('Failed to send log: ' + e);
		}
	}

	private async sendLog(
		eventType: AmplitudeEventTypeEnum,
		userId: string,
		eventProperties?: Record<string, unknown>,
	): Promise<void> {
		if (!this.client) return;
		try {
			await this.client.logEvent({
				event_type: eventType,
				user_id: userId,
				event_properties: eventProperties,
			});
			await this.client.flush();
		} catch (e) {
			console.error(e);
		}
	}
}
