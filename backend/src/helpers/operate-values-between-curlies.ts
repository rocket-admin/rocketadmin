// eslint-disable-next-line @typescript-eslint/no-var-requires
const safe = require('safe-regex');

export function getValuesBetweenCurlies(str: string): Array<any> {
  const valuesArr = [];
  const regExp = /{{([^}}]+)}}/g;
  let tmpText;
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
    if (safe(regExp)) {
      str = str.replace(regExp, replaceWithArr.at(i));
    }
  }
  return str;
}
