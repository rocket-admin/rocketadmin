export function toPrettyErrorsMsg(errorArray: Array<string>): string {
  let result = '';
  for (let i = 0; i < errorArray.length; i++) {
    if (i != errorArray.length - 1) {
      result += errorArray.at(i) + ', ';
    } else {
      result += errorArray.at(i);
    }
  }
  return result.trim();
}
