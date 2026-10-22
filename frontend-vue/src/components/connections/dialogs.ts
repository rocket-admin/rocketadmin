// Data the connect-db dialogs are opened with.
import type { Connection } from '@/models/connection';
import type { DbProvider } from './provider';

/** DbConnectionConfirmDialog: the test before saving failed. */
export interface DbConnectionConfirmDialogData {
	dbCreds: Connection;
	provider: DbProvider | null | undefined;
	masterKey: string | null;
	errorMessage: string;
}

/** DbConnectionIpAccessDialog: shown before a direct connection is added. */
export interface DbConnectionIpAccessDialogData {
	db: Connection;
	provider: DbProvider | null | undefined;
}

/** DbConnectionDeleteDialog is opened with the connection itself. */
export type DbConnectionDeleteDialogData = Pick<Connection, 'id' | 'title' | 'database'>;

/** What the IP-access dialog closes with once the user says access is given. */
export const IP_ACCESS_CONFIRMED = 'confirmed';
