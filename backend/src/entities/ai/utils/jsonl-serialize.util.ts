export function toJSONL(data: Record<string, unknown> | Array<Record<string, unknown>>): string {
  const serializeObject = (obj: Record<string, unknown>): string => {
    return JSON.stringify(obj);
  };

  if (Array.isArray(data)) {
    return data.map((item) => serializeObject(item)).join('\n') + '\n';
  } else {
    return serializeObject(data) + '\n';
  }
}

export function fromJSONL(data: string): Record<string, unknown> | Array<Record<string, unknown>> {
  const jsonLines = data
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0);
  const objectsArray = jsonLines.map((line) => JSON.parse(line));
  return objectsArray;
}
