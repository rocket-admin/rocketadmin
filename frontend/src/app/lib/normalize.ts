import { startCase, camelCase, capitalize } from "lodash";
import pluralize from "pluralize";
import acronyms from '../consts/acronyms';

export function normalizeTableName(tableName: string) {
    return pluralize(startCase(camelCase(tableName)))
}

export function normalizeFieldName(fieldName: string) {
    const setOfAcronyms = new Set(acronyms);
    const setOfWords = capitalize(startCase(camelCase(fieldName))).split(' ');

    for (let [index, word] of setOfWords.entries()) {
        const upperCasedWord = word.toUpperCase();
        if (setOfAcronyms.has(upperCasedWord)) {
            setOfWords[index] = upperCasedWord;
        };
    };
    return setOfWords.join(' ');
}