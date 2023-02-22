export function toPrettyErrorsMsg(errorArray: Array<string>): string {
  let result = '';
  for (let i = 0; i < errorArray.length; i++) {
    if (i != errorArray.length - 1) {
      result += errorArray[i] + ', ';
    } else {
      result += errorArray[i];
    }
  }
  return result.trim();
}
