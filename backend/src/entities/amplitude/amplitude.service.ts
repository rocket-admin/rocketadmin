import Amplitude from '@amplitude/node';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmplitudeEventTypeEnum } from '../../enums/index.js';
import { UserEntity } from '../user/user.entity.js';

@Injectable()
export class AmplitudeService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  public async formAndSendLogRecord(event_type: AmplitudeEventTypeEnum, user_id: string, options = null) {
    try {
      if (process.env.NODE_ENV === 'test') return;
      let user_email = (await this.userRepository.findOne({ where: { id: user_id } }))?.email;
      if (!user_email && options) {
        user_email = options?.user_email;
      }
      let event_properties = undefined;
      if (user_email) {
        event_properties = {
          user_properties: {
            email: user_email ? user_email : 'unknown',
            tablesCount: options?.tablesCount ? options.tablesCount : undefined,
            reason: options?.reason ? options?.reason : undefined,
            message: options?.message ? options.message : undefined,
          },
        };
      }
      if (options?.operationCount && options?.operationCount > 0) {
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

  private async sendLog(eventType, cognitoUserName, eventProperties) {
    const client = Amplitude.init(process.env.AMPLITUDE_API_KEY);
    try {
      client
        .logEvent({
          event_type: eventType,
          user_id: cognitoUserName,
          event_properties: eventProperties ? eventProperties : undefined,
        })
        .catch((e) => {
          throw new Error(e);
        });
      client.flush().catch((e) => {
        throw new Error(e);
      });
    } catch (e) {
      console.error(e);
    }
  }
}
