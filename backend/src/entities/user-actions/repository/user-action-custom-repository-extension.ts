import { UserActionEnum } from '../../../enums/user-action.enum.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { UserActionEntity } from '../user-action.entity.js';

export const userActionCustomRepositoryExtension = {
	async saveNewOrUpdatedUserAction(userAction: UserActionEntity): Promise<UserActionEntity> {
		return await this.save(userAction);
	},

	/**
	 * Atomically creates the user's action or overwrites its message.
	 * `user_action.userId` is UNIQUE (one-to-one with `user`); a read-then-insert races with itself when
	 * the same user sends two requests at once (e.g. two tabs opening "add connection") and the second
	 * insert fails with `duplicate key value violates unique constraint "REL_c025478b45e60017ed10c77f99"`.
	 * `INSERT … ON CONFLICT ("userId") DO UPDATE` makes the second request an update instead.
	 */
	async upsertUserAction(userId: string, message: string): Promise<UserActionEntity> {
		await this.createQueryBuilder()
			.insert()
			.into(UserActionEntity)
			.values({ user: { id: userId }, message })
			.orUpdate(['message'], ['userId'])
			.execute();
		return await this.createQueryBuilder('user_action')
			.innerJoin('user_action.user', 'user')
			.where('user.id = :userId', { userId })
			.getOne();
	},

	async findUserActionWithoutSentMail(userId: string): Promise<UserActionEntity> {
		const actionQb = this.createQueryBuilder('user_action')
			.leftJoinAndSelect('user_action.user', 'user')
			.andWhere('user.id = :user_id', { user_id: userId })
			.andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false });
		return await actionQb.getOne();
	},

	async findAllNonFinishedActionsTwoWeeksOld(): Promise<Array<UserActionEntity>> {
		const notFinishedActionsQb = this.createQueryBuilder('user_action')
			.leftJoinAndSelect('user_action.user', 'user')
			.andWhere('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
			.andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
			.andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
		return await notFinishedActionsQb.getMany();
	},
};
