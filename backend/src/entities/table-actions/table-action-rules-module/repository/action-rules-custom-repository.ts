import { ActionRulesEntity } from '../action-rules.entity.js';
import { IActionRulesRepository } from './action-rules-custom-repository.interface.js';

export const actionRulesCustomRepositoryExtension: IActionRulesRepository = {
  async saveNewOrUpdatedActionRules(triggers: ActionRulesEntity): Promise<ActionRulesEntity> {
    return await this.save(triggers);
  },
};
