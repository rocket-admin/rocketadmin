import test from 'ava';
import { CheckUsersActionsAndMailingUsersUseCase } from '../../../src/entities/user-actions/use-cases/check-users-actions-and-mailing-users.use.case.js';
import { UserActionEntity } from '../../../src/entities/user-actions/user-action.entity.js';
import { UserActionEnum } from '../../../src/enums/user-action.enum.js';

// `user_action.userId` is UNIQUE (one-to-one with `user`), so the 08:00 reminder cron must update a user's
// existing action row in place. The original code marked the row as sent and then fell through to insert a
// second row for the same user, which failed with
// `duplicate key value violates unique constraint "REL_c025478b45e60017ed10c77f99"` and dropped the email.

const USER = { id: 'a3f1c9d2-4b5e-4c7a-8d9e-0f1a2b3c4d5e', email: 'Person@Example.com' };

type Fixture = {
	useCase: CheckUsersActionsAndMailingUsersUseCase;
	saved: Array<UserActionEntity>;
};

function makeUseCase(
	actionsByUserId: Record<string, UserActionEntity | null | (() => never)>,
	users: Array<{ id: string; email: string }> = [USER],
): Fixture {
	const saved: Array<UserActionEntity> = [];
	const userActionRepository = {
		save: async (entity: UserActionEntity) => {
			saved.push(entity);
			return entity;
		},
	};
	const userRepository = {
		findOne: async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id) ?? null,
	};
	const useCase = new CheckUsersActionsAndMailingUsersUseCase(userActionRepository as any, userRepository as any);
	// The private lookups go through TypeORM query builders; replace them so the decision logic runs without a DB.
	Object.assign(useCase, {
		findDistinctUsersForProcessing: async () => users,
		findUserAction: async (userId: string) => {
			const entry = actionsByUserId[userId];
			return typeof entry === 'function' ? entry() : (entry ?? null);
		},
	});
	return { useCase, saved };
}

function existingAction(mailSent: boolean): UserActionEntity {
	const action = new UserActionEntity();
	action.id = 'existing-action-id';
	action.message = UserActionEnum.CONNECTION_CREATION_NOT_FINISHED;
	action.mail_sent = mailSent;
	return action;
}

test('an existing unsent action is marked sent in place and the user is emailed', async (t) => {
	const { useCase, saved } = makeUseCase({ [USER.id]: existingAction(false) });

	const emails = await useCase.execute();

	t.deepEqual(emails, ['person@example.com']);
	t.is(saved.length, 1, 'exactly one save — no second row for the same user');
	t.is(saved[0].id, 'existing-action-id');
	t.true(saved[0].mail_sent);
});

test('an existing already-sent action is left alone and the user is not emailed again', async (t) => {
	const { useCase, saved } = makeUseCase({ [USER.id]: existingAction(true) });

	const emails = await useCase.execute();

	t.deepEqual(emails, []);
	t.is(saved.length, 0);
});

test('a user without an action gets one created as already mailed and is emailed', async (t) => {
	const { useCase, saved } = makeUseCase({ [USER.id]: null });

	const emails = await useCase.execute();

	t.deepEqual(emails, ['person@example.com']);
	t.is(saved.length, 1);
	t.is(saved[0].id, undefined, 'a new row, not the existing one');
	t.is(saved[0].message, UserActionEnum.CONNECTION_CREATION_NOT_FINISHED);
	t.true(saved[0].mail_sent);
	t.is(saved[0].user.id, USER.id);
});

test('a user that no longer exists is skipped without an insert', async (t) => {
	const { useCase, saved } = makeUseCase({ [USER.id]: null }, []);
	Object.assign(useCase, { findDistinctUsersForProcessing: async () => [USER] });

	const emails = await useCase.execute();

	t.deepEqual(emails, []);
	t.is(saved.length, 0);
});

test('a failure for one user does not block the others', async (t) => {
	const other = { id: 'b4e2d0c3-5c6f-4d8b-9e0f-1a2b3c4d5e6f', email: 'other@example.com' };
	const { useCase, saved } = makeUseCase(
		{
			[USER.id]: () => {
				throw new Error('boom');
			},
			[other.id]: null,
		},
		[USER, other],
	);

	const emails = await useCase.execute();

	t.deepEqual(emails, ['other@example.com']);
	t.is(saved.length, 1);
	t.is(saved[0].user.id, other.id);
});
