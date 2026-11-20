import { ParsedTaskPreview, TaskCategory, TaskPriority } from '../types/nextup';
import { addDaysToDateKey, parseDateKey, toLocalDateKey } from './dateUtils';

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function inferCategory(text: string): TaskCategory {
  const lower = text.toLowerCase();
  if (
    /\b(interview|recruiter|resume|cv|internship|application|apply|offer|oa|assessment|linkedin|portfolio|case study|career|placement|follow up|follow-up)\b/.test(
      lower
    )
  ) {
    return 'Career';
  }
  if (
    /\b(assignment|exam|quiz|midterm|final|lab|lecture|slides|essay|paper|homework|hw|study|course|class|economics|math|cs|professor|canvas|thesis|capstone|project)\b/.test(
      lower
    )
  ) {
    return 'College';
  }
  if (
    /\b(groceries|prescription|doctor|dentist|gym|workout|laundry|rent|bill|bank|call mom|family|birthday|errand|clean|pharmacy)\b/.test(
      lower
    )
  ) {
    return 'Personal';
  }
  return 'Other';
}

function inferPriority(text: string): TaskPriority {
  const lower = text.toLowerCase();
  if (/\b(urgent|asap|critical|must|important|final|interview|exam|submit)\b/.test(lower)) {
    return 'Must Do';
  }
  if (/\b(maybe|whenever|optional|low priority|can wait)\b/.test(lower)) {
    return 'Can Wait';
  }
  return 'Should Do';
}

function inferEstimatedMinutes(text: string): number {
  const lower = text.toLowerCase();
  const minMatch = lower.match(/\b(\d+)\s*(min|mins|minute|minutes)\b/);
  if (minMatch) return Math.min(240, Math.max(10, Number(minMatch[1])));
  const hrMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (hrMatch) return Math.min(300, Math.max(15, Math.round(Number(hrMatch[1]) * 60)));

  if (/\b(follow up|follow-up|email|reply|confirm|pay|message|call)\b/.test(lower)) return 15;
  if (/\b(prepare|interview|essay|report|case study|project|lab)\b/.test(lower)) return 60;
  return 30;
}

export function parseNaturalLanguageTask(
  rawText: string,
  now: Date = new Date()
): ParsedTaskPreview {
  const todayKey = toLocalDateKey(now);
  let working = rawText.trim();
  let deadline = todayKey;
  let deadlineTime: string | undefined;
  let matchedDatePhrase: string | undefined;
  let matchedTimePhrase: string | undefined;

  // 1. Parse time expressions e.g. "at 5 PM", "at 2:30pm", "11:59 PM", "at noon"
  const timeRegex =
    /\b(?:at\s+|by\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:at\s+)?(noon|midnight)\b/i;
  const timeMatch = working.match(timeRegex);
  if (timeMatch) {
    matchedTimePhrase = timeMatch[0].trim();
    if (timeMatch[4]) {
      deadlineTime = timeMatch[4].toLowerCase() === 'noon' ? '12:00' : '23:59';
    } else {
      let hour = Number(timeMatch[1]);
      const mins = Number(timeMatch[2] || '0');
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      if (hour >= 0 && hour <= 23 && mins >= 0 && mins <= 59) {
        deadlineTime = `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      }
    }
    working = working.replace(timeMatch[0], ' ');
  }

  // 2. Parse date expressions
  const todayRegex = /\b(?:by\s+|on\s+|for\s+)?(today|tonight)\b/i;
  const tomorrowRegex = /\b(?:by\s+|on\s+|for\s+)?(tomorrow|tmrw)\b/i;
  const weekdayRegex =
    /\b(?:(next|this)\s+|(?:by|on|for)\s+)?(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i;
  const monthDayRegex =
    /\b(?:by\s+|on\s+|for\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;

  const todayMatch = working.match(todayRegex);
  const tomorrowMatch = working.match(tomorrowRegex);
  const weekdayMatch = working.match(weekdayRegex);
  const monthDayMatch = working.match(monthDayRegex);

  if (tomorrowMatch) {
    deadline = addDaysToDateKey(todayKey, 1);
    matchedDatePhrase = tomorrowMatch[0].trim();
    working = working.replace(tomorrowMatch[0], ' ');
  } else if (todayMatch) {
    deadline = todayKey;
    if (todayMatch[1].toLowerCase() === 'tonight' && !deadlineTime) {
      deadlineTime = '20:00';
    }
    matchedDatePhrase = todayMatch[0].trim();
    working = working.replace(todayMatch[0], ' ');
  } else if (monthDayMatch) {
    const monthIdx = MONTHS[monthDayMatch[1].toLowerCase()];
    const dayNum = Number(monthDayMatch[2]);
    if (monthIdx !== undefined && dayNum >= 1 && dayNum <= 31) {
      const todayDt = parseDateKey(todayKey);
      let year = todayDt.getFullYear();
      const candidate = new Date(year, monthIdx, dayNum);
      if (toLocalDateKey(candidate) < todayKey) {
        year += 1;
      }
      deadline = toLocalDateKey(new Date(year, monthIdx, dayNum));
      matchedDatePhrase = monthDayMatch[0].trim();
      working = working.replace(monthDayMatch[0], ' ');
    }
  } else if (weekdayMatch) {
    const modifier = weekdayMatch[1]?.toLowerCase();
    const targetDay = WEEKDAYS[weekdayMatch[2].toLowerCase()];
    const currentDay = parseDateKey(todayKey).getDay();
    let delta = (targetDay - currentDay + 7) % 7;
    if (delta === 0) delta = 7;
    if (modifier === 'next' && delta <= 7) {
      // "next Monday" when today is Wed -> Monday next week (if delta < 7, add 7 only if same week? Usually if today is Thu and user says "next Monday", Mon is 4 days away; if today is Mon and user says "next Mon", 7 days away)
      if (delta <= 2) delta += 7;
    }
    deadline = addDaysToDateKey(todayKey, delta);
    matchedDatePhrase = weekdayMatch[0].trim();
    working = working.replace(weekdayMatch[0], ' ');
  }

  // Clean trailing prepositions left over after stripping date/time phrases
  const cleanedTitle = working
    .replace(/\s+(?:at|on|by|for)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    title: cleanedTitle || rawText.trim(),
    category: inferCategory(rawText),
    deadline,
    deadlineTime,
    priority: inferPriority(rawText),
    estimatedMinutes: inferEstimatedMinutes(rawText),
    matchedDatePhrase,
    matchedTimePhrase,
  };
}

export async function parseTaskWithAI(
  rawText: string,
  now: Date = new Date()
): Promise<{ parsed: ParsedTaskPreview; source: 'gemini' | 'rule-based' }> {
  const localFallback = parseNaturalLanguageTask(rawText, now);
  try {
    const res = await fetch('/api/ai/parse-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: rawText,
        todayKey: toLocalDateKey(now),
        weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
      }),
    });
    if (!res.ok) {
      return { parsed: localFallback, source: 'rule-based' };
    }
    const data = (await res.json()) as {
      source?: string;
      parsed?: Partial<ParsedTaskPreview>;
    };
    if (!data.parsed?.title) {
      return { parsed: localFallback, source: 'rule-based' };
    }
    const validCat = (['College', 'Career', 'Personal', 'Other'] as TaskCategory[]).includes(
      data.parsed.category as TaskCategory
    )
      ? (data.parsed.category as TaskCategory)
      : localFallback.category;

    const validPrio = (['Must Do', 'Should Do', 'Can Wait'] as TaskPriority[]).includes(
      data.parsed.priority as TaskPriority
    )
      ? (data.parsed.priority as TaskPriority)
      : localFallback.priority;

    return {
      source: 'gemini',
      parsed: {
        title: data.parsed.title,
        category: validCat,
        deadline: data.parsed.deadline || localFallback.deadline,
        deadlineTime: data.parsed.deadlineTime || undefined,
        priority: validPrio,
        estimatedMinutes: data.parsed.estimatedMinutes || localFallback.estimatedMinutes,
      },
    };
  } catch {
    return { parsed: localFallback, source: 'rule-based' };
  }
}
