export class GetBucketFileUrlDs {
	connectionId: string;
	tableName: string;
	fieldName: string;
	rowPrimaryKey: Record<string, unknown>;
	userId: string;
	masterPwd: string;
}

export class GetBucketUploadUrlDs {
	connectionId: string;
	tableName: string;
	fieldName: string;
	userId: string;
	masterPwd: string;
	filename: string;
	contentType: string;
}

export class BucketFileUrlResponseDs {
	url: string;
	key: string;
	expiresIn: number;
}

export class BucketUploadUrlResponseDs {
	uploadUrl: string;
	key: string;
	expiresIn: number;
	previewUrl: string;
}
