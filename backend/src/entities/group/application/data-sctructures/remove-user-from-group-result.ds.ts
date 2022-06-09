export class RemoveUserFromGroupResultDs {
  id: string;
  title: string;
  isMain: boolean;
  users: Array<{
    id: string;
    email: string;
    createdAt: Date;
    isActive: boolean;
  }>;
}
