/**
 * Internal exception codes for the RocketAdmin backend.
 *
 * Codes are grouped into numeric ranges by domain so the frontend can branch either
 * on a whole category (e.g. `code >= 1000 && code < 1100` → database error) or on a
 * specific code. These numbers are a stable wire contract: never renumber an existing
 * code, only append new ones inside the appropriate range.
 *
 * Ranges:
 *   1000–1099  Database / SQL
 *   1100–1199  Validation
 *   1200–1299  Authentication / access
 *   1300–1399  Not found
 *   1400–1499  Subscription / billing
 *   1500–1599  External services (SaaS gateway, agent)
 */
export enum ExceptionsInternalCodes {
	// --- 1000–1099: Database / SQL ---
	/** Generic / uncategorized SQL error. Legacy value, kept for backward compatibility. */
	UNKNOWN_SQL_EXCEPTION = 1000,
	/** Foreign key constraint violation (PostgreSQL, MySQL, MSSQL, Oracle). */
	FOREIGN_KEY_VIOLATION = 1001,
	/** Database user lacks permission to perform the operation. */
	DB_PERMISSION_DENIED = 1002,
	/** Could not reach the database within the timeout window. */
	CONNECTION_TIMEOUT = 1003,
	/** Database host could not be resolved or is unreachable (ENOTFOUND, ECONNREFUSED, etc.). */
	HOST_UNREACHABLE = 1004,
	/** Failed to decrypt the connection — usually a wrong/missing master password. */
	DECRYPTION_FAILED = 1005,
	/** Agent returned no data for the query. */
	AGENT_NO_DATA = 1006,

	// --- 1100–1199: Validation ---
	/** DTO / request validation failure. Legacy value 1007, kept for backward compatibility. */
	VALIDATOR_EXCEPTION = 1007,
	/** Required primary key was missing from the request. */
	PRIMARY_KEY_MISSING = 1101,

	// --- 1200–1299: Authentication / access ---
	/** Connection master password is required but was not provided. */
	MASTER_PASSWORD_MISSING = 1200,
	/** Provided connection master password is incorrect. */
	MASTER_PASSWORD_INCORRECT = 1201,
	/** Two-factor authentication is required to continue. */
	TWO_FA_REQUIRED = 1202,

	// --- 1300–1399: Not found ---
	/** Connection entity was not found. */
	CONNECTION_NOT_FOUND = 1300,
	/** Table was not found in the database. */
	TABLE_NOT_FOUND = 1301,

	// --- 1400–1499: Subscription / billing ---
	/** Feature is not available on the current (free) plan. */
	FEATURE_NON_AVAILABLE_IN_FREE_PLAN = 1400,

	// --- 1500–1599: External services ---
	/** An external dependency (SaaS gateway, agent) returned an error. */
	EXTERNAL_SERVICE_ERROR = 1500,
}
