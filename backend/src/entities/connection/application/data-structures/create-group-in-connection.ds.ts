export class CreateGroupInConnectionDs {
	group_parameters: {
		title: string;
		connectionId: string;
		cedarPolicy?: string | null;
	};
	creation_info: {
		cognitoUserName: string;
	};
}
