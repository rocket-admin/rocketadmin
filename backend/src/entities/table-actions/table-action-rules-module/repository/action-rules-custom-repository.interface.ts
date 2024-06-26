import { ActionRulesEntity } from '../action-rules.entity.js';

export interface IActionRulesRepository {
  saveNewOrUpdatedActionRules(rules: ActionRulesEntity): Promise<ActionRulesEntity>;
}
