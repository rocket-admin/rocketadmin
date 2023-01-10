export function findObjectsWithProperties<T, K extends keyof T>(objectsArray: T[], properties: Pick<T, K>): T[] {
  return objectsArray.filter((obj) => {
    return Object.entries(properties).every(([key, value]) => obj[key] === value);
  });
}
