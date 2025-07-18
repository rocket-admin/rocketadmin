import { format } from 'date-fns'

export function formatFieldValue(value, type) {
    const dateTimeTypes = [
      'timestamp without time zone',
      'timestamp with time zone',
      'abstime',
      'realtime',
      'datetime',
      'timestamp'
    ]

    if (value && type === 'time') {
      return value
    } else if (value && type === 'date') {
      const datetimeValue = new Date(value);
      return format(datetimeValue, "P")
    } else if (value && dateTimeTypes.includes(type)) {
      const datetimeValue = new Date(value);
      return format(datetimeValue, "P p")
    } else if (type === 'boolean') {
      if (value || value ===  1) return true
      else if (value === false || value === 0) return false
      else return '—'
    } else if (type === 'json' || type === 'jsonb' || type === 'object' || type === 'array' || type === 'interval') {
      return JSON.stringify(value)
    }

    return value;
  }
