export function toPrettyErrorsMsg(errorArray: Array<string>): string {
  return errorArray.join(', ').trim();
}
