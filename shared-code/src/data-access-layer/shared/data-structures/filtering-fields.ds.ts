import { FilterCriteriaEnum } from '../../../shared/enums/filter-criteria.enum.js';

export class FilteringFieldsDS {
  field: string;
  criteria: FilterCriteriaEnum;
  value: unknown;
}
