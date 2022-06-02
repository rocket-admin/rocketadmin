export class CreateCustomFieldsDs {
  connectionId: string;
  createFieldDto: CreateFieldDto;
  masterPwd: string;
  tableName: string;
  userId: string;
}

export class CreateFieldDto {
  template_string: string;
  text: string;
  type: string;
}
