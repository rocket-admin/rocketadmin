import { GitHubUserIdentifierEntity } from '../github-user-identifier.entity.js';

export interface IUserGitHubIdentifierRepository {
  saveGitHubIdentifierEntity(gitHubIdentifierEntity: GitHubUserIdentifierEntity): Promise<GitHubUserIdentifierEntity>;

  removeGitHubIdentifierEntity(gitHubIdentifierEntity: GitHubUserIdentifierEntity): Promise<GitHubUserIdentifierEntity>;
}
