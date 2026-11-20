import { AIDailyPlan, BriefingType, JobApplication, Task, TaskReminderTiming } from '../types/nextup';
import {
  addDaysToDateKey,
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDate,
  formatFriendlyDateTime,
  formatPersonalizedGreeting,
  getBriefingPeriod,
  isTaskOverdue,
  parseDateKey,
  toDateKeyInTimeZone,
} from '../utils/dateUtils';
import { deterministicPrioritiser } from './prioritiser';

const SENT_REMINDERS_KEY = 'nextup_v1_sent_reminders';
const BRIEFING_SENT_KEY = 'nextup_v1_briefing_email_date';

function toBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeMimeHeaderUtf8(value: string): string {
  // Use RFC 2047 UTF-8 Base64 encoding if non-ASCII chars exist
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export function getSentReminderKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(SENT_REMINDERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markReminderKeySent(key: string): void {
  const set = getSentReminderKeys();
  set.add(key);
  // Keep latest 300 keys to prevent unbounded growth
  const trimmed = Array.from(set).slice(-300);
  localStorage.setItem(SENT_REMINDERS_KEY, JSON.stringify(trimmed));
}

export function buildTaskReminderKey(task: Task): string {
  const timing: TaskReminderTiming = task.reminderTiming || '1_hour_before';
  return `${task.id}::${task.deadline}::${task.deadlineTime || 'allday'}::${timing}::${
    task.customReminderDate || ''
  }::${task.customReminderTime || ''}`;
}

export function computeTaskReminderTriggerDate(task: Task): Date | null {
  if (task.completed || !task.emailReminderEnabled) return null;
  const timing: TaskReminderTiming = task.reminderTiming || '1_hour_before';

  if (timing === 'custom') {
    if (!task.customReminderDate) return null;
    const dt = parseDateKey(task.customReminderDate);
    const [hh, mm] = (task.customReminderTime || '09:00').split(':').map(Number);
    dt.setHours(Number.isNaN(hh) ? 9 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
    return dt;
  }

  const deadlineDt = parseDateKey(task.deadline);
  if (task.deadlineTime) {
    const [hh, mm] = task.deadlineTime.split(':').map(Number);
    deadlineDt.setHours(Number.isNaN(hh) ? 9 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
  } else {
    // If date-only task, anchor morning reminder at 09:00 local time
    deadlineDt.setHours(9, 0, 0, 0);
  }

  if (timing === 'at_deadline') {
    return deadlineDt;
  }
  if (timing === '1_hour_before') {
    return new Date(deadlineDt.getTime() - 60 * 60 * 1000);
  }
  if (timing === '1_day_before') {
    return new Date(deadlineDt.getTime() - 24 * 60 * 60 * 1000);
  }
  return deadlineDt;
}

export function getTaskReminderTimingLabel(task: Task): string {
  const timing: TaskReminderTiming = task.reminderTiming || '1_hour_before';
  switch (timing) {
    case 'at_deadline':
      return 'At the deadline';
    case '1_hour_before':
      return '1 hour before';
    case '1_day_before':
      return '1 day before';
    case 'custom':
      return task.customReminderDate
        ? `Custom (${formatFriendlyDateTime(task.customReminderDate, task.customReminderTime)})`
        : 'Custom reminder time';
  }
}

export function buildTaskReminderEmailContent(
  task: Task,
  firstName: string,
  appOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
  sendTime: Date = new Date(),
  timeZone?: string
): { subject: string; body: string } {
  const todayKey = toDateKeyInTimeZone(sendTime, timeZone);
  const friendlyDate = formatFriendlyDate(task.deadline, todayKey);
  const friendlyDateTime = formatFriendlyDateTime(task.deadline, task.deadlineTime, todayKey);
  const taskUrl = appOrigin ? `${appOrigin}/?task=${encodeURIComponent(task.id)}` : '';

  const subjectDatePhrase =
    friendlyDate === 'Today'
      ? 'due today'
      : friendlyDate === 'Tomorrow'
        ? 'due tomorrow'
        : `due ${friendlyDate}`;

  const subject = `Reminder: ${task.title} is ${subjectDatePhrase}`;
  const greeting = formatPersonalizedGreeting(firstName, sendTime, timeZone);
  const dueSentence = task.deadlineTime
    ? `Your task "${task.title}" is due ${friendlyDateTime}.`
    : `Your task "${task.title}" is due ${friendlyDate}.`;

  const lines: string[] = [
    greeting,
    '',
    dueSentence,
    '',
    `Priority: ${task.priority}`,
    `Category: ${task.category}`,
    `Estimated time: approximately ${formatDuration(task.estimatedMinutes)}`,
  ];

  if (task.notes?.trim()) {
    lines.push('', `Details: ${task.notes.trim()}`);
  }

  lines.push(
    '',
    'Open NextUp to review your tasks and plan your day:',
    taskUrl || 'Open NextUp'
  );

  return { subject, body: lines.join('\n') };
}

export function buildBriefingEmailContent(
  firstName: string,
  tasks: Task[],
  applications: JobApplication[],
  plan: AIDailyPlan,
  availableHoursToday: number,
  calendarBusyMinutes: number,
  calendarConnected: boolean,
  appOrigin: string = typeof window !== 'undefined' ? window.location.origin : '',
  sendTime: Date = new Date(),
  timeZone?: string
): { subject: string; body: string; briefingType: BriefingType } {
  const todayKey = toDateKeyInTimeZone(sendTime, timeZone);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const briefingType = getBriefingPeriod(sendTime, timeZone);
  const greeting = formatPersonalizedGreeting(firstName, sendTime, timeZone);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const dueToday = tasks.filter(
    (t) => !t.completed && t.deadline === todayKey && !isTaskOverdue(t, sendTime)
  );
  const overdue = tasks.filter((t) => isTaskOverdue(t, sendTime));
  const upcoming = tasks
    .filter((t) => !t.completed && t.deadline > todayKey)
    .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime));
  const completedToday = tasks.filter(
    (t) =>
      t.completed &&
      (t.completedAt
        ? toDateKeyInTimeZone(new Date(t.completedAt), timeZone) === todayKey
        : t.deadline === todayKey)
  );
  const followUpsDue = applications.filter(
    (a) =>
      a.followUpDate &&
      a.followUpDate <= todayKey &&
      a.status !== 'Rejected' &&
      a.status !== 'Offer'
  );
  const followUpsTomorrow = applications.filter(
    (a) =>
      a.followUpDate === tomorrowKey &&
      a.status !== 'Rejected' &&
      a.status !== 'Offer'
  );

  if (briefingType === 'evening') {
    const tomorrowRanked = deterministicPrioritiser.rankTopPriorities(tasks, tomorrowKey, 3);
    const subject = `${greeting} — Your NextUp evening summary & tomorrow's plan`;

    const lines: string[] = [
      greeting,
      '',
      firstName
        ? `Here's your evening summary and priorities for tomorrow, ${firstName}.`
        : "Here's your evening summary and priorities for tomorrow.",
      '',
      `• Completed today: ${completedToday.length}`,
      `• Still pending for today: ${dueToday.length}${overdue.length > 0 ? ` (${overdue.length} overdue)` : ''}`,
      `• Upcoming deadlines: ${upcoming.length}`,
      `• Follow-ups due or coming tomorrow: ${followUpsDue.length + followUpsTomorrow.length}`,
    ];

    if (completedToday.length > 0) {
      lines.push('', 'Completed today:');
      completedToday.slice(0, 5).forEach((t) => {
        lines.push(`✓ ${t.title}`);
      });
    }

    const pendingNow = [...overdue, ...dueToday];
    if (pendingNow.length > 0) {
      lines.push('', 'Pending tasks to wrap up or carry forward:');
      pendingNow.slice(0, 5).forEach((t) => {
        lines.push(
          `• ${t.title} (${t.priority} · ${formatFriendlyDateTime(t.deadline, t.deadlineTime, todayKey)})`
        );
      });
    }

    if (followUpsDue.length > 0 || followUpsTomorrow.length > 0) {
      lines.push('', 'Application follow-ups:');
      [...followUpsDue, ...followUpsTomorrow].slice(0, 4).forEach((app) => {
        lines.push(
          `• ${app.company} (${app.role}) — ${formatFriendlyDateTime(app.followUpDate!, app.followUpTime, todayKey)}`
        );
      });
    }

    lines.push('', 'Top priorities for tomorrow:');
    if (tomorrowRanked.length === 0) {
      lines.push('No pending deadlines lined up for tomorrow.');
    } else {
      tomorrowRanked.forEach((item, idx) => {
        const t = item.task;
        lines.push(
          `${idx + 1}. ${t.title} (${t.priority} · ${formatDuration(t.estimatedMinutes)} · ${formatFriendlyDateTime(t.deadline, t.deadlineTime, todayKey)})`,
          `   Why: ${item.reason}`
        );
      });
    }

    lines.push('', 'Open NextUp to review or adjust tomorrow:', appOrigin || 'Open NextUp');
    return { subject, body: lines.join('\n'), briefingType };
  }

  // Morning / daytime planning briefing
  const subject = `${greeting} — Your NextUp plan for today`;
  const lines: string[] = [
    greeting,
    '',
    firstName ? `Here's your plan for today, ${firstName}.` : "Here's your plan for today.",
    '',
    `• Tasks due today: ${dueToday.length}`,
    `• Overdue tasks: ${overdue.length}`,
    `• Upcoming deadlines: ${upcoming.length}`,
    `• Application follow-ups due: ${followUpsDue.length}`,
    calendarConnected
      ? `• Calendar commitments: ${formatDuration(calendarBusyMinutes)} booked (${availableHoursToday}h study capacity)`
      : `• Available focus time configured: ${availableHoursToday}h`,
    '',
    'Your top priorities:',
  ];

  if (plan.topThree.length === 0) {
    lines.push('No pending priorities right now.');
  } else {
    plan.topThree.forEach((item, idx) => {
      const t = taskMap.get(item.taskId);
      if (!t) return;
      lines.push(
        `${idx + 1}. ${t.title} (${t.priority} · ${formatDuration(t.estimatedMinutes)} · ${formatFriendlyDateTime(t.deadline, t.deadlineTime, todayKey)})`,
        `   Why: ${item.reason}`
      );
    });
  }

  if (followUpsDue.length > 0) {
    lines.push('', 'Applications requiring attention:');
    followUpsDue.slice(0, 4).forEach((app) => {
      lines.push(
        `• Follow up with ${app.company} (${app.role}) — ${formatFriendlyDateTime(app.followUpDate!, app.followUpTime, todayKey)}`
      );
    });
  }

  lines.push('', 'Open NextUp to review or replan your day:', appOrigin || 'Open NextUp');

  return { subject, body: lines.join('\n'), briefingType };
}

export const buildMorningBriefingEmailContent = buildBriefingEmailContent;

export async function sendGmailMessage(
  accessToken: string,
  toEmail: string,
  subject: string,
  bodyText: string
): Promise<{ id: string }> {
  const rawMime = [
    `To: ${toEmail}`,
    `Subject: ${encodeMimeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyText,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: toBase64UrlUtf8(rawMime),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errText || res.statusText}`);
  }

  return (await res.json()) as { id: string };
}

export function hasSentMorningBriefingToday(
  now: Date = new Date(),
  timeZone?: string
): boolean {
  const todayKey = toDateKeyInTimeZone(now, timeZone);
  return localStorage.getItem(BRIEFING_SENT_KEY) === todayKey;
}

export function markMorningBriefingSentToday(
  now: Date = new Date(),
  timeZone?: string
): void {
  localStorage.setItem(BRIEFING_SENT_KEY, toDateKeyInTimeZone(now, timeZone));
}
