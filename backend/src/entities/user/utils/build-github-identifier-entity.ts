import { GitHubUserIdentifierEntity } from '../user-github-identifier/github-user-identifier.entity.js';
import { UserEntity } from '../user.entity.js';

export function buildUserGitHubIdentifierEntity(user: UserEntity, gitHubId: number): GitHubUserIdentifierEntity {
  const gitHubIdentifierEntity = new GitHubUserIdentifierEntity();
  gitHubIdentifierEntity.user = user;
  gitHubIdentifierEntity.gitHubId = gitHubId;
  return gitHubIdentifierEntity;
}
