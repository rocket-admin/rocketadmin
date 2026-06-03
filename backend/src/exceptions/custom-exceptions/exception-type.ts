export type ExceptionType =
	| 'no_master_key'
	| 'invalid_master_key'
	| 'query_timeout'
	| 'foreign_key_violation'
	| 'db_permission_denied'
	| 'host_unreachable'
	| 'decryption_failed';
