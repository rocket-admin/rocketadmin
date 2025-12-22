export class S3GetFileUrlDs {
	connectionId: string;
	tableName: string;
	fieldName: string;
	rowPrimaryKey: Record<string, unknown>;
	userId: string;
	masterPwd: string;
}

export class S3GetUploadUrlDs {
	connectionId: string;
	tableName: string;
	fieldName: string;
	userId: string;
	masterPwd: string;
	filename: string;
	contentType: string;
}

export class S3FileUrlResponseDs {
	url: string;
	key: string;
	expiresIn: number;
}

export class S3UploadUrlResponseDs {
	uploadUrl: string;
	key: string;
	expiresIn: number;
}
