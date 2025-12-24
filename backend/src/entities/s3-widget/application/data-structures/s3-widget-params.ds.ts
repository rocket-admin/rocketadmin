export interface S3WidgetParams {
  bucket: string;
  prefix?: string;
  region?: string;
  aws_access_key_id_secret_name: string;
  aws_secret_access_key_secret_name: string;
}
