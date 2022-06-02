export class UpdateCustomFieldsDs {
  connectionId: string;
  masterPwd: string;
  tableName: string;
  updateFieldDto: {
    id: string;
    template_string: string;
    text: string;
    type: string;
  };
  userId: string;
}
