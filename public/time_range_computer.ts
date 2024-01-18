interface TimeRangeInput {
  from: string;
  to: string;
}

interface TimeRangeOutput {
  duration: any;
  from: any;
  to: any;
}

function incrementDateUnit(date: Date, incrementCount: number, unit: string) {
  if (unit === 'y') {
    date.setFullYear(date.getFullYear() + incrementCount);
  }
  else if (unit === 'M') {
    const dayBefore = date.getDate();
    date.setMonth(date.getMonth() + incrementCount);
    const dayAfter = date.getDate();
    if (dayBefore !== dayAfter) {
      date.setDate(0);
    }
  }
  else if (unit === 'w') {
    date.setDate(date.getDate() + incrementCount * 7);
  }
  else if (unit === 'd') {
    date.setDate(date.getDate() + incrementCount);
  }
  else if (unit === 'h' || unit === 'H') {
    date.setHours(date.getHours() + incrementCount);
  }
  else if (unit === 'm') {
    date.setMinutes(date.getMinutes() + incrementCount);
  }
  else if (unit === 's') {
    date.setSeconds(date.getSeconds() + incrementCount);
  }
}

function roundDate(roundUnit: string, roundUp: boolean, date: Date, dayOfWeekNumber: number) {
  if (roundUp) {
    incrementDateUnit(date, 1, roundUnit);
  }
  if (roundUnit.match(/[y]/)) {
    date.setMonth(0);
  }
  if (roundUnit.match(/[yM]/)) {
    date.setDate(1);
  }
  if (roundUnit.match(/[w]/)) {
    const dayOfWeekToDay = Math.abs(date.getDay() - dayOfWeekNumber);
    date.setDate(date.getDate() - dayOfWeekToDay);
  }
  if (roundUnit.match(/[yMwd]/)) {
    date.setHours(0);
  }
  if (roundUnit.match(/[yMwdHh]/)) {
    date.setMinutes(0);
  }
  if (roundUnit.match(/[yMwdHhm]/)) {
    date.setSeconds(0);
  }
  if (roundUnit.match(/[yMwdHhms]/)) {
    date.setMilliseconds(0);
  }
}

function parseDathMathExpression(dateMathExpression: string, roundUp: boolean, nowReference: number, dayOfWeekNumber: number): Date {

  // initiate result date
  const date = new Date(nowReference);
  let decrementOneMs = false;

  // update date with +/- intervals and rounds
  const matches = dateMathExpression.match(/([+-/][0-9]*[yMwdHhms])/g);
  if (matches) {
    matches.forEach(match => {
      if (match.charAt(0) === '/') {
        const roundUnit = match.charAt(1);
        roundDate(roundUnit, roundUp, date, dayOfWeekNumber);
        decrementOneMs = roundUp;
      }
      else {
        const multiplier = parseInt(match.substring(0, 1) + '1', 10);
        const incrementCount = (match.length === 2) ? 1 : parseInt(match.substring(1, match.length - 1), 10);
        const unit = match.substring(match.length - 1);
        incrementDateUnit(date, incrementCount * multiplier, unit);
      }
    });
  }

  // decrement 1 ms if round up is requested
  if (decrementOneMs) {
    date.setMilliseconds(date.getMilliseconds() - 1);
  }

  // return result date
  return date;
}

function parseDate(date: string, roundUp: boolean, nowReference: number, dayOfWeekNumber: number): Date {
  if (date.startsWith('now')) {
    return parseDathMathExpression(date.substring(3), roundUp, nowReference, dayOfWeekNumber);
  }
  else if (date.indexOf('||') !== -1) {
    const doublePipeIndex: number = date.indexOf('||');
    const dateReference: Date = new Date(date.substring(0, doublePipeIndex));
    return parseDathMathExpression(date.substring(doublePipeIndex + 2), roundUp, dateReference.getTime(), dayOfWeekNumber);
  }
  else {
    return new Date(date);
  }
}

function computeDuration(from: Date, to: Date): any {
  const milliseconds = to.getTime() - from.getTime();
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.ceil(seconds / 60) + (from.getTimezoneOffset() - to.getTimezoneOffset());
  const hours = Math.ceil(minutes / 60);
  const days = Math.ceil(hours / 24);
  const weeks = Math.ceil(days / 7);

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months === 0 || to.getDate() > from.getDate()) {
    months += 1;
  }

  let years = to.getFullYear() - from.getFullYear();
  if (years === 0 || to.getMonth() > from.getMonth()) {
    years += 1;
  }

  return { milliseconds, seconds, minutes, hours, days, weeks, months, years };
}

function getDayOfWeekNumber(dayOfWeek?: string): number {
  if (dayOfWeek === 'Monday') {
    return 1;
  }
  else if (dayOfWeek === 'Tuesday') {
    return 2;
  }
  else if (dayOfWeek === 'Wednesday') {
    return 3;
  }
  else if (dayOfWeek === 'Thursday') {
    return 4;
  }
  else if (dayOfWeek === 'Friday') {
    return 5;
  }
  else if (dayOfWeek === 'Saturday') {
    return 6;
  }
  else {
    return 0;
  }
}

export function computeDateStructure(date: Date): any {
  return {
    fullYear: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    milliseconds: date.getMilliseconds(),
    time: date.getTime(),
    timezoneOffset: date.getTimezoneOffset(),
    dateString: date.toDateString(),
    isoString: date.toISOString(),
    localeDateString: date.toLocaleDateString(),
    localeString: date.toLocaleString(),
    localeTimeString: date.toLocaleTimeString(),
    string: date.toString(),
    timeString: date.toTimeString(),
    utcString: date.toUTCString()
  };
}

/**
 * compute time range between 'from' and 'to' (in time picker),
 * and return a structure containing all informations on 'from' Date, 'to' Date, and time range duration
 */
export function computeTimeRange(timeRange?: TimeRangeInput, dayOfWeek?: string): TimeRangeOutput | undefined {

  if (!timeRange) {
    return undefined;
  }

  try {
    const nowReference: number = Date.now();
    const dayOfWeekNumber: number = getDayOfWeekNumber(dayOfWeek);
    const from: Date = parseDate(timeRange.from, false, nowReference, dayOfWeekNumber);
    const to: Date = parseDate(timeRange.to, true, nowReference, dayOfWeekNumber);

    return {
      duration: computeDuration(from, to),
      from: computeDateStructure(from),
      to: computeDateStructure(to)
    };
  }
  catch (e) {
    console.error(e);
    return undefined;
  }

}
