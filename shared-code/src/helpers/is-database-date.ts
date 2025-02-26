export function isMSSQLDateOrTimeType(dataType: string): boolean {
  return ['date', 'datetime', 'datetime2', 'datetimeoffset', 'smalldatetime', 'time'].includes(dataType);
}

export function isMSSQLDateStringByRegexp(value: string): boolean {
  return /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}.\d{3}Z)/.test(value);
}

export function isMySqlDateOrTimeType(dataType: string): boolean {
  return ['date', 'time', 'datetime', 'timestamp'].includes(dataType.toLowerCase());
}

export function isMySQLDateStringByRegexp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isOracleDateOrTimeType(type: string): boolean {
  if (type.toLowerCase().includes('timestamp')) {
    return true;
  }
  const dateTypes = [
    'date',
    'timestamp',
    'timestamp with time zone',
    'timestamp with local time zone',
    'timestamp(6) with local time zone',
    'timestamp(0) with local time zone',
  ];
  return dateTypes.includes(type.toLowerCase());
}

export function isOracleTimeType(type: string): boolean {
  return [
    'timestamp',
    'timestamp with time zone',
    'timestamp with local time zone',
    'timestamp(6) with local time zone',
    'timestamp(0) with local time zone',
  ].includes(type.toLowerCase());
}

export function isOracleDateType(type: string): boolean {
  return ['date'].includes(type.toLowerCase());
}

export function isOracleDateStringByRegexp(value: string): boolean {
  const dateRegexp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  return dateRegexp.test(value);
}

export function isPostgresDateOrTimeType(dataType: string): boolean {
  return ['date', 'time', 'timestamp', 'timestamptz', 'timestamp with time zone'].includes(dataType);
}
export function isPostgresDateStringByRegexp(value: string): boolean {
  const dateRegexp = /^(\d{4})-(\d{2})-(\d{2})$/;
  return dateRegexp.test(value);
}

export function formatOracleDate(date: Date) {
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear().toString().slice(-2);
  // eslint-disable-next-line security/detect-object-injection
  const resultString = `${day}-${monthNames[monthIndex]}-${year}`;
  return resultString;
}
