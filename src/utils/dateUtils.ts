import { Task } from '../types/nextup';

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateKeyInTimeZone(date: Date = new Date(), timeZone?: string): string {
  if (timeZone) {
    try {
      const formatted = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
      }).format(date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
        return formatted;
      }
    } catch {
      // Fallback to local runtime timezone
    }
  }
  return toLocalDateKey(date);
}

export function getCurrentTimeHHmm(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalDateKey(dt);
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function parseDateTimeLocal(dateKey: string, timeStr?: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!timeStr) {
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

/**
 * A task is overdue ONLY after its actual deadline date and optional time have passed.
 */
export function isTaskOverdue(task: Pick<Task, 'completed' | 'deadline' | 'deadlineTime'>, now: Date = new Date()): boolean {
  if (task.completed || !task.deadline) return false;
  const todayKey = toLocalDateKey(now);
  if (task.deadline < todayKey) return true;
  if (task.deadline > todayKey) return false;
  if (!task.deadlineTime) return false; // Date-only task due today is not overdue until the day ends
  const deadlineMoment = parseDateTimeLocal(task.deadline, task.deadlineTime);
  return now.getTime() > deadlineMoment.getTime();
}

export function isDateTimePast(dateKey: string, timeStr?: string, now: Date = new Date()): boolean {
  if (!dateKey) return false;
  const todayKey = toLocalDateKey(now);
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  if (!timeStr) return false;
  return now.getTime() > parseDateTimeLocal(dateKey, timeStr).getTime();
}

export function compareDeadlineDateTime(
  aDate: string,
  aTime: string | undefined,
  bDate: string,
  bTime: string | undefined
): number {
  const dateCmp = aDate.localeCompare(bDate);
  if (dateCmp !== 0) return dateCmp;
  // Earlier time on same date comes first; tasks with an explicit time come before unspecified end-of-day
  const normA = aTime || '23:59';
  const normB = bTime || '23:59';
  return normA.localeCompare(normB);
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatFriendlyDate(dateKey: string, todayKey: string = toLocalDateKey()): string {
  if (!dateKey) return 'No date';
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToDateKey(todayKey, 1)) return 'Tomorrow';
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Yesterday';

  const dt = parseDateKey(dateKey);
  const today = parseDateKey(todayKey);
  const diffDays = getDayDifference(todayKey, dateKey);

  if (diffDays > 1 && diffDays <= 6) {
    return dt.toLocaleDateString('en-US', { weekday: 'long' });
  }

  const sameYear = dt.getFullYear() === today.getFullYear();
  return dt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatFriendlyDateTime(
  dateKey: string,
  timeStr?: string,
  todayKey: string = toLocalDateKey()
): string {
  const dateLabel = formatFriendlyDate(dateKey, todayKey);
  if (!timeStr) return dateLabel;
  return `${dateLabel}, ${formatTime12h(timeStr)}`;
}

export function formatHeaderDate(date: Date = new Date(), timeZone?: string): string {
  try {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

export function formatHoursDecimal(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}

export function getLocalHourInTimeZone(
  date: Date = new Date(),
  timeZone?: string
): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    if (hourPart !== undefined) {
      const parsed = Number(hourPart);
      if (!Number.isNaN(parsed)) return parsed % 24;
    }
  } catch {
    // Fallback to runtime local timezone if provided timezone string is invalid
  }
  return date.getHours();
}

export function getLocalTimeHHmmInTimeZone(
  date: Date = new Date(),
  timeZone?: string
): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === 'hour')?.value;
    const mm = parts.find((p) => p.type === 'minute')?.value;
    if (hh !== undefined && mm !== undefined) {
      return `${String(Number(hh) % 24).padStart(2, '0')}:${mm}`;
    }
  } catch {
    // Fallback to runtime local timezone
  }
  return getCurrentTimeHHmm(date);
}

export function getGreetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getGreetingForDate(
  date: Date = new Date(),
  timeZone?: string
): string {
  return getGreetingForHour(getLocalHourInTimeZone(date, timeZone));
}

export function formatPersonalizedGreeting(
  firstName?: string,
  date: Date = new Date(),
  timeZone?: string
): string {
  const greeting = getGreetingForDate(date, timeZone);
  const cleanName = firstName?.trim();
  return cleanName ? `${greeting}, ${cleanName}!` : `${greeting}!`;
}

export function getBriefingPeriod(
  date: Date = new Date(),
  timeZone?: string
): 'morning' | 'evening' {
  const hour = getLocalHourInTimeZone(date, timeZone);
  return hour >= 17 ? 'evening' : 'morning';
}

export function getDayDifference(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey).getTime();
  const to = parseDateKey(toKey).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function getWeekStartKey(dateKey: string = toLocalDateKey()): string {
  const dt = parseDateKey(dateKey);
  const day = dt.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  return toLocalDateKey(dt);
}

export function getHoursRemainingInDay(now: Date = new Date()): number {
  // Assume productive day winds down around 10:30 PM (22:30)
  const endOfDay = new Date(now);
  endOfDay.setHours(22, 30, 0, 0);
  const diffHrs = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.max(0.5, Math.round(diffHrs * 2) / 2);
}
