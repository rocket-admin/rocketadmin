import { startCase, camelCase, capitalize } from "lodash";
import pluralize from "pluralize";

export function normalizeTableName(tableName) {
    return pluralize(startCase(camelCase(tableName)))
}

export function normalizeFieldName(fieldName) {
    return capitalize(startCase(camelCase(fieldName)))
}