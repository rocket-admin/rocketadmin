import { EncryptionAlgorithmEnum, WidgetTypeEnum } from '../../enums/index.js';

export interface ITableWidgetRO {
  id: string;
  field_name: string;
  widget_type?: WidgetTypeEnum;
  widget_params: string;
  name?: string;
  description?: string;
}

export interface IPasswordWidgetParams {
  encrypt: boolean;
  algorithm: EncryptionAlgorithmEnum;
}
