import { Response } from 'express';

export class CreateThreadWithAssistantDS {
  connectionId: string;
  tableName: string;
  user_id: string;
  master_password: string;
  user_message: string;
  response: Response;
}
