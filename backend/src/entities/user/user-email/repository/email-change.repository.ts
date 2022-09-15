import { EntityRepository, QueryRunner, Repository } from 'typeorm';
import { EmailChangeEntity } from '../email-change.entity';
import { IEmailChangeRepository } from './email-change.repository.interface';
import { Encryptor } from '../../../../helpers/encryption/encryptor';
import { UserEntity } from '../../user.entity';

@EntityRepository(EmailChangeEntity)
export class EmailChangeRepository extends Repository<EmailChangeEntity> implements IEmailChangeRepository {
  constructor() {
    super();
  }

  public async findEmailChangeWithVerificationString(verificationString: string): Promise<EmailChangeEntity> {
    const qb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('email_change')
      .from(EmailChangeEntity, 'email_change')
      .leftJoinAndSelect('email_change.user', 'user')
      .where('email_change.verification_string = :ver_string', { ver_string: verificationString });
    return await qb.getOne();
  }

  public async removeEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity> {
    return await this.remove(emailChangeEntity);
  }

  public async saveEmailChangeEntity(emailChangeEntity: EmailChangeEntity): Promise<EmailChangeEntity> {
    return await this.save(emailChangeEntity);
  }

  public async createOrUpdateEmailChangeEntity(user: UserEntity): Promise<EmailChangeEntity> {
    const qb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('email_change')
      .from(EmailChangeEntity, 'email_change')
      .leftJoinAndSelect('email_change.user', 'user')
      .where('user.id = :userId', { userId: user.id });
    const foundChange = await qb.getOne();
    if (foundChange) {
      await this.remove(foundChange);
    }
    const verificationString = Encryptor.generateRandomString();
    const newEmailChangeRequest = new EmailChangeEntity();
    newEmailChangeRequest.verification_string = verificationString;
    newEmailChangeRequest.user = user;
    return await this.save(newEmailChangeRequest);
  }

  private getCurrentQueryRunner(): QueryRunner {
    return this.manager.queryRunner;
  }
}
