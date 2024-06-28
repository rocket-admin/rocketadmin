import { ActionRulesEntity } from '../action-rules.entity.js';

export interface IActionRulesRepository {
  saveNewOrUpdatedActionRule(rules: ActionRulesEntity): Promise<ActionRulesEntity>;
}
