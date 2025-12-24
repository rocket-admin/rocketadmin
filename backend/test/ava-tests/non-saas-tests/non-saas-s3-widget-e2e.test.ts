/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from "@faker-js/faker";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import test from "ava";
import { ValidationError } from "class-validator";
import cookieParser from "cookie-parser";
import request from "supertest";
import { ApplicationModule } from "../../../src/app.module.js";
import { WinstonLogger } from "../../../src/entities/logging/winston-logger.js";
import { AllExceptionsFilter } from "../../../src/exceptions/all-exceptions.filter.js";
import { ValidationException } from "../../../src/exceptions/custom-exceptions/validation-exception.js";
import { Messages } from "../../../src/exceptions/text/messages.js";
import { Cacher } from "../../../src/helpers/cache/cacher.js";
import { DatabaseModule } from "../../../src/shared/database/database.module.js";
import { DatabaseService } from "../../../src/shared/database/database.service.js";
import { MockFactory } from "../../mock.factory.js";
import { getRandomTestTableName } from "../../utils/get-random-test-table-name.js";
import { getTestData } from "../../utils/get-test-data.js";
import { getTestKnex } from "../../utils/get-test-knex.js";
import { registerUserAndReturnUserInfo } from "../../utils/register-user-and-return-user-info.js";
import { setSaasEnvVariable } from "../../utils/set-saas-env-variable.js";

const mockFactory = new MockFactory();
let app: INestApplication;
let currentTest: string;

// Helper to setup user with connection, secrets, table with S3 widget, and row data
async function setupS3WidgetTestEnvironment(
	options: {
		createSecrets?: boolean;
		createWidget?: boolean;
		s3FieldName?: string;
	} = {},
): Promise<{
	token: string;
	connectionId: string;
	tableName: string;
	fieldName: string;
	rowPrimaryKey: Record<string, unknown>;
}> {
	const {
		createSecrets = true,
		createWidget = true,
		s3FieldName = "file_key",
	} = options;

	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionToPostgres = getTestData(mockFactory).connectionToPostgres;

	// Create test table with S3 field
	const { testTableName } = await createTestTableWithS3Field(
		connectionToPostgres,
		s3FieldName,
	);

	// Create connection
	const createdConnection = await request(app.getHttpServer())
		.post("/connection")
		.send(connectionToPostgres)
		.set("Cookie", token)
		.set("masterpwd", "ahalaimahalai")
		.set("Content-Type", "application/json")
		.set("Accept", "application/json");

	const connectionId = JSON.parse(createdConnection.text).id;

	// Create secrets for AWS credentials
	if (createSecrets) {
		await request(app.getHttpServer())
			.post("/secrets")
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json")
			.send({
				slug: "test-aws-access-key",
				value: "AKIAIOSFODNN7EXAMPLE",
				masterEncryption: false,
			});

		await request(app.getHttpServer())
			.post("/secrets")
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json")
			.send({
				slug: "test-aws-secret-key",
				value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
				masterEncryption: false,
			});
	}

	// Create S3 widget for the field
	if (createWidget) {
		const s3WidgetParams = JSON.stringify({
			bucket: "test-bucket",
			prefix: "uploads",
			region: "us-east-1",
			aws_access_key_id_secret_name: "test-aws-access-key",
			aws_secret_access_key_secret_name: "test-aws-secret-key",
		});

		const widgetDto = {
			widgets: [
				{
					field_name: s3FieldName,
					widget_type: "S3",
					widget_params: s3WidgetParams,
					name: "S3 File Widget",
					description: "Test S3 widget",
				},
			],
		};

		await request(app.getHttpServer())
			.post(`/widget/${connectionId}?tableName=${testTableName}`)
			.send(widgetDto)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");
	}

	return {
		token,
		connectionId,
		tableName: testTableName,
		fieldName: s3FieldName,
		rowPrimaryKey: { id: 1 },
	};
}

// Create test table with S3 field
async function createTestTableWithS3Field(
	connectionParams: any,
	s3FieldName: string,
): Promise<{ testTableName: string; testTableColumnName: string }> {
	const testTableName = getRandomTestTableName();
	const testTableColumnName = "name";
	const Knex = getTestKnex(connectionParams);

	await Knex.schema.createTable(testTableName, (table) => {
		table.increments("id");
		table.string(testTableColumnName);
		table.string(s3FieldName); // Field to store S3 file key
		table.timestamps();
	});

	// Insert test row with file key
	await Knex(testTableName).insert({
		[testTableColumnName]: "Test User",
		[s3FieldName]: "uploads/test-file.pdf",
		created_at: new Date(),
		updated_at: new Date(),
	});

	return { testTableName, testTableColumnName };
}

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService],
	}).compile();
	app = moduleFixture.createNestApplication();

	app.use(cookieParser());
	app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
	app.useGlobalPipes(
		new ValidationPipe({
			exceptionFactory(validationErrors: ValidationError[] = []) {
				return new ValidationException(validationErrors);
			},
		}),
	);
	await app.init();
	app.getHttpServer().listen(0);
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error("After tests error " + e);
	}
});

// ==================== GET /s3/file/:connectionId Tests ====================

currentTest = "GET /s3/file/:connectionId";

test.serial(
	`${currentTest} - should return 403 when user tries to access another user's connection`,
	async (t) => {
		// First user creates connection
		const { connectionId, tableName, fieldName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment();

		// Second user tries to access first user's connection
		const { token: secondUserToken } = await registerUserAndReturnUserInfo(app);

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", secondUserToken)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - should return 403 when using fake connection ID`,
	async (t) => {
		const { token } = await registerUserAndReturnUserInfo(app);
		const fakeConnectionId = faker.string.uuid();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${fakeConnectionId}?tableName=test_table&fieldName=file_key&rowPrimaryKey=${JSON.stringify({ id: 1 })}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - should return 400 when tableName is missing`,
	async (t) => {
		const { token, connectionId, fieldName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
	},
);

test.serial(
	`${currentTest} - should return 400 when fieldName is missing`,
	async (t) => {
		const { token, connectionId, tableName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Field name is required");
	},
);

test.serial(
	`${currentTest} - should return 400 when rowPrimaryKey is missing`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Row primary key is required");
	},
);

test.serial(
	`${currentTest} - should return 400 when rowPrimaryKey has invalid JSON format`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=invalid-json`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Invalid row primary key format");
	},
);

test.serial(
	`${currentTest} - should return 400 when S3 widget is not configured for the field`,
	async (t) => {
		const { token, connectionId, tableName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment({
				createWidget: false,
			});

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=file_key&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "S3 widget not configured for this field");
	},
);

test.serial(
	`${currentTest} - should return 404 when row with primary key not found`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		// Use a primary key that doesn't exist
		const nonExistentPrimaryKey = { id: 99999 };

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(nonExistentPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 404);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, Messages.ROW_PRIMARY_KEY_NOT_FOUND);
	},
);

test.serial(
	`${currentTest} - should return 404 when AWS credentials secrets are not found`,
	async (t) => {
		const { token, connectionId, tableName, fieldName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment({
				createSecrets: false,
			});

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 404);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "AWS credentials secrets not found");
	},
);

// ==================== POST /s3/upload-url/:connectionId Tests ====================

currentTest = "POST /s3/upload-url/:connectionId";

test.serial(
	`${currentTest} - should return 403 when user tries to access another user's connection`,
	async (t) => {
		// First user creates connection
		const { connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		// Second user tries to access first user's connection
		const { token: secondUserToken } = await registerUserAndReturnUserInfo(app);

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", secondUserToken)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - should return 403 when using fake connection ID`,
	async (t) => {
		const { token } = await registerUserAndReturnUserInfo(app);
		const fakeConnectionId = faker.string.uuid();

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${fakeConnectionId}?tableName=test_table&fieldName=file_key`,
			)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - should return 400 when tableName is missing`,
	async (t) => {
		const { token, connectionId, fieldName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.post(`/s3/upload-url/${connectionId}?fieldName=${fieldName}`)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
	},
);

test.serial(
	`${currentTest} - should return 400 when fieldName is missing`,
	async (t) => {
		const { token, connectionId, tableName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.post(`/s3/upload-url/${connectionId}?tableName=${tableName}`)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Field name is required");
	},
);

test.serial(
	`${currentTest} - should return 400 when filename is missing`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.send({ contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Filename is required");
	},
);

test.serial(
	`${currentTest} - should return 400 when contentType is missing`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.send({ filename: "test.pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "Content type is required");
	},
);

test.serial(
	`${currentTest} - should return 400 when S3 widget is not configured for the field`,
	async (t) => {
		const { token, connectionId, tableName } =
			await setupS3WidgetTestEnvironment({
				createWidget: false,
			});

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=file_key`,
			)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 400);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "S3 widget not configured for this field");
	},
);

test.serial(
	`${currentTest} - should return 404 when AWS credentials secrets are not found`,
	async (t) => {
		const { token, connectionId, tableName, fieldName } =
			await setupS3WidgetTestEnvironment({
				createSecrets: false,
			});

		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 404);
		const responseBody = JSON.parse(response.text);
		t.is(responseBody.message, "AWS credentials secrets not found");
	},
);

// ==================== Authorization Tests - Multiple Users ====================

currentTest = "S3 Widget Authorization";

test.serial(
	`${currentTest} - user A cannot get file URL from user B's connection`,
	async (t) => {
		// User A sets up their environment
		const userA = await setupS3WidgetTestEnvironment();

		// User B registers
		const { token: userBToken } = await registerUserAndReturnUserInfo(app);

		// User B tries to get file URL from User A's connection
		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${userA.connectionId}?tableName=${userA.tableName}&fieldName=${userA.fieldName}&rowPrimaryKey=${JSON.stringify(userA.rowPrimaryKey)}`,
			)
			.set("Cookie", userBToken)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - user A cannot get upload URL from user B's connection`,
	async (t) => {
		// User A sets up their environment
		const userA = await setupS3WidgetTestEnvironment();

		// User B registers
		const { token: userBToken } = await registerUserAndReturnUserInfo(app);

		// User B tries to get upload URL from User A's connection
		const response = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${userA.connectionId}?tableName=${userA.tableName}&fieldName=${userA.fieldName}`,
			)
			.send({ filename: "malicious.pdf", contentType: "application/pdf" })
			.set("Cookie", userBToken)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(response.status, 403);
		t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
	},
);

test.serial(
	`${currentTest} - user can access their own connection successfully`,
	async (t) => {
		// User sets up their environment - this should work without permission errors
		// Note: The actual S3 call may fail (no real AWS), but we should not get 403
		const { token, connectionId, tableName, fieldName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment();

		const response = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Cookie", token)
			.set("masterpwd", "ahalaimahalai")
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		// Should not be 403 - may fail at S3 level but authorization passes
		t.not(response.status, 403);
	},
);

test.serial(
	`${currentTest} - unauthenticated user cannot access S3 endpoints`,
	async (t) => {
		const { connectionId, tableName, fieldName, rowPrimaryKey } =
			await setupS3WidgetTestEnvironment();

		// Try to access without authentication token
		const getFileResponse = await request(app.getHttpServer())
			.get(
				`/s3/file/${connectionId}?tableName=${tableName}&fieldName=${fieldName}&rowPrimaryKey=${JSON.stringify(rowPrimaryKey)}`,
			)
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(getFileResponse.status, 401);

		const uploadUrlResponse = await request(app.getHttpServer())
			.post(
				`/s3/upload-url/${connectionId}?tableName=${tableName}&fieldName=${fieldName}`,
			)
			.send({ filename: "test.pdf", contentType: "application/pdf" })
			.set("Content-Type", "application/json")
			.set("Accept", "application/json");

		t.is(uploadUrlResponse.status, 401);
	},
);
