export function isValidSQLQuery(query: string): boolean {
  const upperCaseQuery = query.toUpperCase();
  const forbiddenKeywords = ['DROP', 'DELETE', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE'];

  if (forbiddenKeywords.some((keyword) => upperCaseQuery.includes(keyword))) {
    return false;
  }

  const cleanedQuery = query.trim().replace(/;$/, '');

  const sqlInjectionPatterns = [/--/, /\/\*/, /\*\//];

  if (sqlInjectionPatterns.some((pattern) => pattern.test(cleanedQuery))) {
    return false;
  }

  if (cleanedQuery.split(';').length > 1) {
    return false;
  }

  const selectPattern = /^\s*SELECT\s+[\s\S]+\s+FROM\s+/i;
  if (!selectPattern.test(cleanedQuery)) {
    return false;
  }

  return true;
}

export function isValidMongoDbCommand(command: string): boolean {
  const upperCaseCommand = command.toUpperCase();
  const forbiddenKeywords = ['DROP', 'REMOVE', 'UPDATE', 'INSERT'];

  if (forbiddenKeywords.some((keyword) => upperCaseCommand.includes(keyword))) {
    return false;
  }

  const injectionPatterns = [/\/\*/, /\*\//];

  if (injectionPatterns.some((pattern) => pattern.test(command))) {
    return false;
  }

  return true;
}
