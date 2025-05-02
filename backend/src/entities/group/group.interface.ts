export interface IGroupAccessRO {
  group: IGroupInfo;
  accessLevel: string;
}

export interface IGroupInfo {
  id: string;
  title: string;
  isMain: boolean;
}
