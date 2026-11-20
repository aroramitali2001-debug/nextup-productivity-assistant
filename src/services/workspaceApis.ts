import {
  ApplicationStatus,
  JobApplication,
  JobPlatformId,
  JobPlatformSource,
  Task,
} from '../types/nextup';
import { addDaysToDateKey, parseDateKey, toLocalDateKey } from '../utils/dateUtils';
import {
  inferPlatformFromUrl,
  JOB_PLATFORM_ADAPTERS,
  normalizePlatformSource,
} from './jobPlatforms';

export interface CalendarEventItem {
  id: string;
  summary: string;
  startIso: string;
  endIso: string;
  isAllDay: boolean;
  durationMinutes: number;
  location?: string;
  htmlLink?: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: string[];
  url: string;
}

export interface RecruitmentEmailInsight {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  detectedType: 'Applied' | 'Interview' | 'Assessment' | 'Offer' | 'Rejection' | 'Update';
  sourcePlatform?: JobPlatformSource;
  suggestedCompany?: string;
  suggestedRole?: string;
  applicationDate?: string;
  detectedUrl?: string;
  suggestedAction: string;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

// ---------------------------------------------------------------------------
// 1. Google Calendar API
// ---------------------------------------------------------------------------

export async function fetchTodayCalendarEvents(
  accessToken: string,
  now: Date = new Date()
): Promise<{ events: CalendarEventItem[]; busyMinutes: number }> {
  const todayKey = toLocalDateKey(now);
  const startOfDay = parseDateKey(todayKey);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = parseDateKey(addDaysToDateKey(todayKey, 1));
  endOfDay.setHours(0, 0, 0, 0);

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', startOfDay.toISOString());
  url.searchParams.set('timeMax', endOfDay.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar error (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as {
    items?: {
      id: string;
      summary?: string;
      status?: string;
      location?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }[];
  };

  const events: CalendarEventItem[] = [];
  let busyMinutes = 0;

  for (const item of data.items ?? []) {
    if (item.status === 'cancelled') continue;
    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    const startIso = item.start?.dateTime || item.start?.date || '';
    const endIso = item.end?.dateTime || item.end?.date || '';
    let durationMinutes = 0;
    if (!isAllDay && startIso && endIso) {
      durationMinutes = Math.max(
        0,
        Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
      );
      busyMinutes += durationMinutes;
    }

    events.push({
      id: item.id,
      summary: item.summary || '(Untitled event)',
      startIso,
      endIso,
      isAllDay,
      durationMinutes,
      location: item.location,
      htmlLink: item.htmlLink,
    });
  }

  return { events, busyMinutes };
}

export async function addTaskToGoogleCalendar(
  accessToken: string,
  task: Task,
  startHour = 10
): Promise<{ htmlLink?: string }> {
  const [y, m, d] = task.deadline.split('-').map(Number);
  let startDt = new Date(y, m - 1, d, startHour, 0, 0, 0);

  if (task.deadlineTime) {
    const [hh, mm] = task.deadlineTime.split(':').map(Number);
    // Schedule the work block ending at deadlineTime (or starting at deadlineTime if short)
    const endCandidate = new Date(y, m - 1, d, hh || 17, mm || 0, 0, 0);
    startDt = new Date(endCandidate.getTime() - (task.estimatedMinutes || 30) * 60000);
  }

  const endDt = new Date(startDt.getTime() + (task.estimatedMinutes || 30) * 60000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `[NextUp · ${task.category}] ${task.title}`,
      description: [
        `Priority: ${task.priority}`,
        `Estimated time: ${task.estimatedMinutes} min`,
        task.notes ? `Notes: ${task.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      start: {
        dateTime: startDt.toISOString(),
        timeZone,
      },
      end: {
        dateTime: endDt.toISOString(),
        timeZone,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not create calendar event (${res.status}): ${errText}`);
  }

  return (await res.json()) as { htmlLink?: string };
}

// ---------------------------------------------------------------------------
// 2. Google Sheets API
// ---------------------------------------------------------------------------

export async function fetchSpreadsheetMetadata(
  accessToken: string,
  rawIdOrUrl: string
): Promise<SpreadsheetMetadata> {
  const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets error (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as {
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  };

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)),
    url:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

export async function createApplicationTrackerSheet(
  accessToken: string,
  applications: JobApplication[]
): Promise<SpreadsheetMetadata> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: 'NextUp — Applications Tracker' },
      sheets: [{ properties: { title: 'Applications' } }],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create spreadsheet (${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
  };

  await syncApplicationsToSheet(accessToken, created.spreadsheetId, 'Applications', applications);

  return {
    spreadsheetId: created.spreadsheetId,
    title: 'NextUp — Applications Tracker',
    sheets: ['Applications'],
    url: created.spreadsheetUrl,
  };
}

export async function syncApplicationsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  applications: JobApplication[]
): Promise<{ updatedRows: number }> {
  const safeRange = `'${sheetName.replace(/'/g, "''")}'!A1:J${applications.length + 1}`;
  const clearRange = `'${sheetName.replace(/'/g, "''")}'!A:J`;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(clearRange)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const values = [
    [
      'Company',
      'Role',
      'Status',
      'Applied Date',
      'Follow-up Date',
      'Recruiter Contact',
      'Next Action',
      'Link',
      'Notes',
      'Source Platform',
    ],
    ...applications.map((app) => [
      app.company,
      app.role,
      app.status,
      app.applicationDate,
      app.followUpDate ? `${app.followUpDate}${app.followUpTime ? ` ${app.followUpTime}` : ''}` : '',
      app.recruiterContact ?? '',
      app.nextAction ?? '',
      app.applicationLink ?? '',
      app.notes ?? '',
      app.sourcePlatform ?? inferPlatformFromUrl(app.applicationLink, 'Company Website'),
    ]),
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(safeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to sync to sheet (${updateRes.status}): ${errText}`);
  }

  return { updatedRows: applications.length };
}

export async function importApplicationsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[]> {
  const range = `'${sheetName.replace(/'/g, "''")}'!A1:J100`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Could not read sheet (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  if (rows.length <= 1) return [];

  const validStatuses = new Set<ApplicationStatus>([
    'Saved',
    'Applied',
    'Assessment',
    'Interview',
    'Rejected',
    'Offer',
  ]);
  const today = toLocalDateKey();

  return rows
    .slice(1)
    .filter((r) => r[0]?.trim() && r[1]?.trim())
    .map((r) => {
      const rawStatus = (r[2]?.trim() || 'Applied') as ApplicationStatus;
      const status = validStatuses.has(rawStatus) ? rawStatus : 'Applied';
      const followUpParts = (r[4] || '').trim().split(/\s+/);
      const followUpDate = /^\d{4}-\d{2}-\d{2}$/.test(followUpParts[0] || '')
        ? followUpParts[0]
        : undefined;
      const followUpTime = /^\d{2}:\d{2}$/.test(followUpParts[1] || '')
        ? followUpParts[1]
        : undefined;
      const applicationLink = r[7]?.trim() || undefined;
      const rawSource = r[9]?.trim();
      const sourcePlatform = rawSource
        ? normalizePlatformSource(rawSource, inferPlatformFromUrl(applicationLink, 'Company Website'))
        : inferPlatformFromUrl(applicationLink, 'Company Website');

      return {
        company: r[0].trim(),
        role: r[1].trim(),
        status,
        applicationDate: /^\d{4}-\d{2}-\d{2}$/.test((r[3] || '').trim())
          ? r[3].trim()
          : today,
        followUpDate,
        followUpTime,
        recruiterContact: r[5]?.trim() || undefined,
        nextAction: r[6]?.trim() || undefined,
        applicationLink,
        notes: r[8]?.trim() || undefined,
        sourcePlatform,
      };
    });
}

// ---------------------------------------------------------------------------
// 3. Gmail API (Read-only recruitment & application confirmation scan)
// ---------------------------------------------------------------------------

function detectEmailPlatform(from: string, subject: string, snippet: string): JobPlatformSource | undefined {
  const hay = `${from} ${subject} ${snippet}`.toLowerCase();
  if (hay.includes('linkedin.com') || hay.includes('linkedin jobs')) return 'LinkedIn Jobs';
  if (hay.includes('indeed.com') || hay.includes('indeedemail') || hay.includes('indeed application')) {
    return 'Indeed';
  }
  if (hay.includes('naukri.com') || /\bnaukri\b/.test(hay)) return 'Naukri';
  if (hay.includes('glassdoor.com') || /\bglassdoor\b/.test(hay)) return 'Glassdoor';
  return undefined;
}

function extractRoleAndCompany(
  subject: string,
  from: string,
  snippet: string
): { suggestedCompany?: string; suggestedRole?: string } {
  const cleanSubject = subject.trim();

  // Pattern 1: "Your application to <Role> at <Company>" or "Your application for <Role> at <Company>"
  const roleAtCompany =
    cleanSubject.match(
      /(?:your application (?:to|for)|applied (?:to|for)|application for)\s+(.+?)\s+(?:at|with)\s+([^|–—-]+?)(?:\s+(?:was sent|has been|is submitted)|[.!]?\s*$)/i
    ) ||
    snippet.match(
      /(?:your application (?:to|for)|you applied (?:to|for))\s+(.+?)\s+(?:at|with)\s+([A-Z][^.,;\n]{1,40}?)(?=\s+(?:was sent|has been|is submitted|successfully)|[.,;\n]|$)/i
    );
  if (roleAtCompany) {
    return {
      suggestedRole: roleAtCompany[1].trim(),
      suggestedCompany: roleAtCompany[2].replace(/\s+(?:was sent|has been|is submitted)$/i, '').trim(),
    };
  }

  // Pattern 2: "Mitali, your application was sent to <Company>" (LinkedIn classic format)
  const sentToCompany =
    cleanSubject.match(/your application was sent to\s+(.+?)(?:[!.]|\s*$)/i) ||
    snippet.match(/your application was sent to\s+([^.,;\n]+)/i);
  if (sentToCompany) {
    const company = sentToCompany[1].trim();
    const roleMatch = snippet.match(/(?:for|role[:\s]+)\s*([^.,;\n]{3,60}?)\s+(?:at|with)\s+/i);
    return {
      suggestedCompany: company,
      suggestedRole: roleMatch?.[1]?.trim(),
    };
  }

  // Pattern 3: "Thank you for applying to <Company>" / "Indeed Application: <Role>"
  const indeedRole = cleanSubject.match(/Indeed Application:\s*(.+?)(?:\s*-\s*(.+))?$/i);
  if (indeedRole) {
    return {
      suggestedRole: indeedRole[1]?.trim(),
      suggestedCompany: indeedRole[2]?.trim(),
    };
  }

  const thankApplying = cleanSubject.match(
    /thank you for applying (?:to|at|for)\s+(.+?)(?:\s+(?:at|-|–)\s+(.+))?$/i
  );
  if (thankApplying) {
    if (thankApplying[2]) {
      return {
        suggestedRole: thankApplying[1].trim(),
        suggestedCompany: thankApplying[2].trim(),
      };
    }
    return {
      suggestedCompany: thankApplying[1].trim(),
    };
  }

  // Fallback: sender display name if not a generic platform or noreply name
  const fromMatch = from.match(/^"?([^"<@]+?)"?\s*</);
  const rawSender = fromMatch?.[1]?.trim();
  const isGenericSender =
    !rawSender ||
    /noreply|no-reply|careers|recruiting|notifications|linkedin|indeed|naukri|glassdoor|jobs/i.test(
      rawSender
    );

  return {
    suggestedCompany: isGenericSender ? undefined : rawSender,
  };
}

export function classifyRecruitmentEmail(
  subject: string,
  from: string,
  snippet: string,
  dateHeader?: string
): Pick<
  RecruitmentEmailInsight,
  | 'detectedType'
  | 'sourcePlatform'
  | 'suggestedCompany'
  | 'suggestedRole'
  | 'applicationDate'
  | 'detectedUrl'
  | 'suggestedAction'
> {
  const combined = `${subject} ${snippet}`.toLowerCase();
  const sourcePlatform = detectEmailPlatform(from, subject, snippet);

  let detectedType: RecruitmentEmailInsight['detectedType'] = 'Update';
  let suggestedAction = 'Review email and update application status if needed';

  if (/\b(offer|congratulations|offer letter|compensation)\b/.test(combined)) {
    detectedType = 'Offer';
    suggestedAction = 'Update application status to Offer and review offer details';
  } else if (/\b(interview|schedule a call|availability|phone screen|technical round)\b/.test(combined)) {
    detectedType = 'Interview';
    suggestedAction = 'Update application status to Interview and create interview prep tasks';
  } else if (/\b(assessment|hackerrank|codility|codesignal|take-home|coding challenge)\b/.test(combined)) {
    detectedType = 'Assessment';
    suggestedAction = 'Update application status to Assessment and schedule time to complete it';
  } else if (/\b(unfortunately|not moving forward|other candidates|regret to inform)\b/.test(combined)) {
    detectedType = 'Rejection';
    suggestedAction = 'Mark application as Closed (Rejected)';
  } else if (
    /\b(application (?:was |has been )?(?:sent|submitted|received)|thank you for applying|successfully applied|you applied (?:to|for)|indeed application:)\b/.test(
      combined
    )
  ) {
    detectedType = 'Applied';
    suggestedAction = 'Import confirmation directly into Application Tracker under Applied';
  }

  const { suggestedCompany, suggestedRole } = extractRoleAndCompany(subject, from, snippet);

  let applicationDate = toLocalDateKey();
  if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!Number.isNaN(parsed.getTime())) {
      applicationDate = toLocalDateKey(parsed);
    }
  }

  const urlMatch = snippet.match(/https?:\/\/[^\s)>"']+/i);
  const detectedUrl =
    urlMatch && !/unsubscribe|preferences|tracking/i.test(urlMatch[0]) ? urlMatch[0] : undefined;

  return {
    detectedType,
    sourcePlatform,
    suggestedCompany,
    suggestedRole,
    applicationDate,
    detectedUrl,
    suggestedAction,
  };
}

export async function scanRecruitmentEmails(
  accessToken: string,
  platformFilter?: JobPlatformId
): Promise<RecruitmentEmailInsight[]> {
  const query = platformFilter
    ? JOB_PLATFORM_ADAPTERS[platformFilter].gmailSearchQuery
    : '("application was sent" OR "application submitted" OR "thank you for applying" OR interview OR assessment OR hackerrank OR recruiter OR offer) newer_than:45d';

  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('q', query);
  listUrl.searchParams.set('maxResults', '15');

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API error (${listRes.status}): ${errText || listRes.statusText}`);
  }

  const listData = (await listRes.json()) as {
    messages?: { id: string }[];
  };

  const messages = listData.messages ?? [];
  if (messages.length === 0) return [];

  const details = await Promise.all(
    messages.map(async (m) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!msgRes.ok) return null;
      const msg = (await msgRes.json()) as {
        id: string;
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject') || '(No subject)';
      const from = getHeader('From');
      const date = getHeader('Date');
      const snippet = msg.snippet || '';
      const classified = classifyRecruitmentEmail(subject, from, snippet, date);

      return {
        id: msg.id,
        subject,
        from,
        date,
        snippet,
        ...classified,
      } satisfies RecruitmentEmailInsight;
    })
  );

  return details.filter((d): d is RecruitmentEmailInsight => Boolean(d));
}
