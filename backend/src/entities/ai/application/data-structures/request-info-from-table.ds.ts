import { Response } from 'express';
export class RequestInfoFromTableDS {
  connectionId: string;
  tableName: string;
  user_message: string;
  user_id: string;
  master_password: string;
}

export class RequestInfoFromTableDSV2 extends RequestInfoFromTableDS {
  response: Response;
  previous_response_id?: string | null;
}
