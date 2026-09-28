import { DataSource, QueryRunner } from 'typeorm';

/**
 * Serialises self-service registrations of one email address (plan 53).
 *
 * The `user` table cannot carry a unique index on `email` (invitations legitimately create one
 * row per company for the same address, and existing duplicates stay), so "does this address
 * already have an account?" followed by the INSERT is a check-then-act race: a double submit,
 * two tabs, or two backend instances could each see "no account" and both insert. Two layers
 * close it, each covering what the other cannot:
 *
 * - an in-process mutex keyed on the address — the same instance never interleaves two
 *   registrations of one address (this is also what a single-connection PGlite run relies on:
 *   a session advisory lock is re-entrant within one session, so it alone would not serialise
 *   two concurrent callers sharing that session);
 * - a Postgres session advisory lock (`pg_advisory_lock(hashtext(email))`) held on a dedicated
 *   query runner — instances behind a load balancer serialise on the database.
 *
 * Only the lookup + insert belong inside `fn`; everything that needs the new row but not the
 * address (demo data, company join, audit) stays outside so the lock is held for milliseconds.
 */
const inProcessLocks = new Map<string, Promise<void>>();

export function registrationEmailLockKey(email: string): string {
	return email.trim().toLowerCase();
}

export async function withRegistrationEmailLock<T>(
	dataSource: DataSource,
	email: string,
	fn: () => Promise<T>,
): Promise<T> {
	const key = registrationEmailLockKey(email);
	const previous = inProcessLocks.get(key) ?? Promise.resolve();
	const { current, release } = createTurn();
	// Chain behind whoever holds the key; a rejected predecessor must not poison the queue.
	const turn = previous.then(
		() => undefined,
		() => undefined,
	);
	inProcessLocks.set(key, current);
	await turn;
	try {
		return await withDatabaseLock(dataSource, key, fn);
	} finally {
		if (inProcessLocks.get(key) === current) {
			inProcessLocks.delete(key);
		}
		release();
	}
}

// A promise the holder settles when it is done, handed to whoever queues up behind it.
function createTurn(): { current: Promise<void>; release: () => void } {
	let release: () => void = () => undefined;
	const current = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { current, release };
}

async function withDatabaseLock<T>(dataSource: DataSource, key: string, fn: () => Promise<T>): Promise<T> {
	// A dedicated runner pins one connection for the lock's lifetime: session advisory locks belong
	// to the connection that took them, and the pool would otherwise hand the unlock to another one.
	const runner: QueryRunner = dataSource.createQueryRunner();
	await runner.connect();
	try {
		await runner.query('SELECT pg_advisory_lock(hashtext($1))', [key]);
		try {
			return await fn();
		} finally {
			await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [key]);
		}
	} finally {
		await runner.release();
	}
}
