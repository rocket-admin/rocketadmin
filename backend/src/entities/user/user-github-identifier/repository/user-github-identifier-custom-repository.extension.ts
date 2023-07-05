import { GitHubUserIdentifierEntity } from '../github-user-identifier.entity.js';
import { IUserGitHubIdentifierRepository } from './user-github-identifier-repository.interface.js';

export const userGitHubIdentifierCustomRepositoryExtension: IUserGitHubIdentifierRepository = {
  async saveGitHubIdentifierEntity(
    gitHubIdentifierEntity: GitHubUserIdentifierEntity,
  ): Promise<GitHubUserIdentifierEntity> {
    return await this.save(gitHubIdentifierEntity);
  },

  async removeGitHubIdentifierEntity(
    gitHubIdentifierEntity: GitHubUserIdentifierEntity,
  ): Promise<GitHubUserIdentifierEntity> {
    return await this.remove(gitHubIdentifierEntity);
  },
};
