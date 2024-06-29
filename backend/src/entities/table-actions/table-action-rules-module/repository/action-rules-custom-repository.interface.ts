import { ActionRulesEntity } from '../action-rules.entity.js';

export interface IActionRulesRepository {
  saveNewOrUpdatedActionRule(rules: ActionRulesEntity): Promise<ActionRulesEntity>;

  findAllFullActionRulesForTableInConnection(
    connectionId: string,
    tableName: string,
  ): Promise<Array<ActionRulesEntity>>;
}
