import { safeRegex } from 'safe-regex2';

export function getValuesBetweenCurlies(str: string): Array<any> {
  const valuesArr = [];
  const regExp = /{{([^}}]+)}}/g;
  let tmpText: RegExpExecArray;
  while ((tmpText = regExp.exec(str))) {
    valuesArr.push(tmpText[1]);
  }
  return valuesArr;
}

export function replaceTextInCurlies(str: string, replaceArr: Array<string>, replaceWithArr: Array<string>): string {
  for (let i = 0; i < replaceArr.length; i++) {
    // added safe regexp check
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regExp = new RegExp('{{' + replaceArr.at(i) + '}}', 'gi');
    if (safeRegex(regExp)) {
      str = str.replace(regExp, replaceWithArr.at(i));
    }
  }
  return str;
}
