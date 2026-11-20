import {
  ApplicationStatus,
  JobApplication,
  JobPlatformId,
  JobPlatformSource,
} from '../types/nextup';
import { toLocalDateKey } from '../utils/dateUtils';

export interface JobPlatformSourceMeta {
  source: JobPlatformSource;
  shortLabel: string;
  color: string;
  barBg: string;
  textClass: string;
  platformId?: JobPlatformId;
}

export const JOB_PLATFORM_SOURCES: JobPlatformSourceMeta[] = [
  {
    source: 'LinkedIn Jobs',
    shortLabel: 'LinkedIn',
    color: '#0A66C2',
    barBg: 'bg-[#0A66C2]',
    textClass: 'text-[#0A66C2]',
    platformId: 'linkedin',
  },
  {
    source: 'Indeed',
    shortLabel: 'Indeed',
    color: '#2557A7',
    barBg: 'bg-[#2557A7]',
    textClass: 'text-[#1E40AF]',
    platformId: 'indeed',
  },
  {
    source: 'Naukri',
    shortLabel: 'Naukri',
    color: '#0F766E',
    barBg: 'bg-[#0F766E]',
    textClass: 'text-[#0F766E]',
    platformId: 'naukri',
  },
  {
    source: 'Glassdoor',
    shortLabel: 'Glassdoor',
    color: '#0CAA41',
    barBg: 'bg-[#0CAA41]',
    textClass: 'text-[#15803D]',
    platformId: 'glassdoor',
  },
  {
    source: 'Company Website',
    shortLabel: 'Company Site',
    color: '#6D4AFF',
    barBg: 'bg-[#6D4AFF]',
    textClass: 'text-[#5B38EE]',
  },
  {
    source: 'Referral / Other',
    shortLabel: 'Referral / Other',
    color: '#64748B',
    barBg: 'bg-[#64748B]',
    textClass: 'text-[#475569]',
  },
];

export interface JobPlatformSyncAdapter {
  id: JobPlatformId;
  platform: JobPlatformSource;
  name: string;
  directApiStatus: 'Not connected';
  directApiSummary: string;
  directApiRequirement: string;
  senderDomains: string[];
  gmailSearchQuery: string;
  officialExportTitle: string;
  officialExportHint: string;
  sampleCsvExample: string;
  accentBorder: string;
  accentBg: string;
}

export const JOB_PLATFORM_ADAPTERS: Record<JobPlatformId, JobPlatformSyncAdapter> = {
  linkedin: {
    id: 'linkedin',
    platform: 'LinkedIn Jobs',
    name: 'LinkedIn Jobs',
    directApiStatus: 'Not connected',
    directApiSummary:
      'LinkedIn does not offer an open consumer OAuth API for reading personal "Applied Jobs" history.',
    directApiRequirement:
      'Requires LinkedIn Talent Solutions / RSC partner agreement (employer/ATS-only). NextUp never asks for your LinkedIn password or scrapes your profile.',
    senderDomains: ['linkedin.com', 'jobs-noreply@linkedin.com'],
    gmailSearchQuery:
      '(from:linkedin.com OR "LinkedIn") ("application was sent" OR "applied to" OR "your application" OR interview OR assessment) newer_than:60d',
    officialExportTitle: 'Import LinkedIn "Job Applications.csv"',
    officialExportHint:
      'In LinkedIn: Settings & Privacy → Data Privacy → Get a copy of your data → Jobs → download "Job Applications.csv" and upload or paste it here.',
    sampleCsvExample:
      'Application Date,Company Name,Job Title,Job Url\n2025-05-10,Stripe,Software Engineering Intern,https://www.linkedin.com/jobs/view/123456',
    accentBorder: 'border-[#BFDBFE]',
    accentBg: 'bg-[#F5F9FF]',
  },
  indeed: {
    id: 'indeed',
    platform: 'Indeed',
    name: 'Indeed',
    directApiStatus: 'Not connected',
    directApiSummary:
      'Indeed does not provide a public candidate OAuth API to pull your personal applied-jobs feed.',
    directApiRequirement:
      'Indeed Apply / Disposition APIs are restricted to approved employer ATS partners. NextUp uses Gmail confirmation parsing & CSV import instead.',
    senderDomains: ['indeed.com', 'indeedapply@indeed.com', 'indeedemail.com'],
    gmailSearchQuery:
      '(from:indeed.com OR from:indeedemail.com OR "Indeed Application") ("application submitted" OR "applied" OR interview OR assessment OR "Indeed") newer_than:60d',
    officialExportTitle: 'Import Indeed Applications CSV',
    officialExportHint:
      'Upload or paste a CSV exported from your spreadsheet or Indeed application notes (Company, Role, Status, Applied Date, Link).',
    sampleCsvExample:
      'Company,Role,Status,Applied Date,Link\nNotion,Frontend Intern,Applied,2025-05-08,https://www.indeed.com/viewjob?jk=abc123',
    accentBorder: 'border-[#C7D2FE]',
    accentBg: 'bg-[#F5F7FF]',
  },
  naukri: {
    id: 'naukri',
    platform: 'Naukri',
    name: 'Naukri',
    directApiStatus: 'Not connected',
    directApiSummary:
      'Naukri does not expose an open consumer OAuth or candidate REST API for personal application sync.',
    directApiRequirement:
      'Automated syncing requires an official Naukri RMS/employer partner API integration. Use Gmail confirmation detection or CSV import safely.',
    senderDomains: ['naukri.com', 'info@naukri.com', 'noreply@naukri.com'],
    gmailSearchQuery:
      '(from:naukri.com OR "Naukri") ("successfully applied" OR "application" OR "recruiter" OR interview OR shortlisted) newer_than:60d',
    officialExportTitle: 'Import Naukri Applications CSV',
    officialExportHint:
      'Upload or paste a CSV of your Naukri applications (Company, Role, Status, Applied Date, Link).',
    sampleCsvExample:
      'Company,Role,Status,Applied Date,Link\nVercel,Developer Experience Intern,Applied,2025-05-12,https://www.naukri.com/job-listings-123',
    accentBorder: 'border-[#99F6E4]',
    accentBg: 'bg-[#F0FDFA]',
  },
  glassdoor: {
    id: 'glassdoor',
    platform: 'Glassdoor',
    name: 'Glassdoor',
    directApiStatus: 'Not connected',
    directApiSummary:
      'Glassdoor closed its public consumer API and has no OAuth endpoint for candidate applied-jobs history.',
    directApiRequirement:
      'Direct sync would require an official Glassdoor partner integration. NextUp supports Gmail confirmation scanning & CSV import.',
    senderDomains: ['glassdoor.com', 'noreply@glassdoor.com'],
    gmailSearchQuery:
      '(from:glassdoor.com OR "Glassdoor") ("application" OR "applied" OR interview OR assessment) newer_than:60d',
    officialExportTitle: 'Import Glassdoor Applications CSV',
    officialExportHint:
      'Upload or paste a CSV of your Glassdoor-tracked roles (Company, Role, Status, Applied Date, Link).',
    sampleCsvExample:
      'Company,Role,Status,Applied Date,Link\nFigma,Product Engineering Intern,Applied,2025-05-11,https://www.glassdoor.com/job-listing/123',
    accentBorder: 'border-[#BBF7D0]',
    accentBg: 'bg-[#F0FDF4]',
  },
};

export const JOB_PLATFORM_ADAPTER_LIST: JobPlatformSyncAdapter[] = [
  JOB_PLATFORM_ADAPTERS.linkedin,
  JOB_PLATFORM_ADAPTERS.indeed,
  JOB_PLATFORM_ADAPTERS.naukri,
  JOB_PLATFORM_ADAPTERS.glassdoor,
];

const VALID_SOURCES = new Set<JobPlatformSource>(
  JOB_PLATFORM_SOURCES.map((s) => s.source)
);

export function normalizePlatformSource(
  raw?: string,
  fallback: JobPlatformSource = 'Company Website'
): JobPlatformSource {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (VALID_SOURCES.has(trimmed as JobPlatformSource)) {
    return trimmed as JobPlatformSource;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('linkedin')) return 'LinkedIn Jobs';
  if (lower.includes('indeed')) return 'Indeed';
  if (lower.includes('naukri')) return 'Naukri';
  if (lower.includes('glassdoor')) return 'Glassdoor';
  if (lower.includes('referral')) return 'Referral / Other';
  if (lower.includes('company') || lower.includes('direct') || lower.includes('career')) {
    return 'Company Website';
  }
  return fallback;
}

export function inferPlatformFromUrl(
  url?: string,
  fallback: JobPlatformSource = 'Company Website'
): JobPlatformSource {
  if (!url || !url.trim()) return fallback;
  const lower = url.toLowerCase();
  if (lower.includes('linkedin.com')) return 'LinkedIn Jobs';
  if (lower.includes('indeed.com') || lower.includes('indeed.co') || lower.includes('indeed.in')) {
    return 'Indeed';
  }
  if (lower.includes('naukri.com')) return 'Naukri';
  if (lower.includes('glassdoor.com') || lower.includes('glassdoor.co')) return 'Glassdoor';
  return fallback;
}

export function resolveApplicationPlatform(
  app: Pick<JobApplication, 'sourcePlatform' | 'applicationLink'>
): JobPlatformSource {
  if (app.sourcePlatform && VALID_SOURCES.has(app.sourcePlatform)) {
    return app.sourcePlatform;
  }
  return inferPlatformFromUrl(app.applicationLink, 'Company Website');
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const cleaned = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && cleaned[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some((c) => c.length > 0)) {
    rows.push(row);
  }
  return rows;
}

function normalizeDateString(raw: string | undefined, fallbackDate: string): string {
  if (!raw || !raw.trim()) return fallbackDate;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Handle ISO timestamp or LinkedIn "5/10/25, 11:20 AM" or "2025-05-10 10:00"
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoPrefix) return isoPrefix[1];

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return toLocalDateKey(parsed);
  }
  return fallbackDate;
}

const VALID_STATUSES = new Set<ApplicationStatus>([
  'Saved',
  'Applied',
  'Assessment',
  'Interview',
  'Rejected',
  'Offer',
]);

function normalizeStatusString(raw?: string): ApplicationStatus {
  if (!raw || !raw.trim()) return 'Applied';
  const trimmed = raw.trim();
  if (VALID_STATUSES.has(trimmed as ApplicationStatus)) {
    return trimmed as ApplicationStatus;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('offer')) return 'Offer';
  if (lower.includes('interview')) return 'Interview';
  if (lower.includes('assess') || lower.includes('test') || lower.includes('oa')) {
    return 'Assessment';
  }
  if (lower.includes('reject') || lower.includes('closed') || lower.includes('declin')) {
    return 'Rejected';
  }
  if (lower.includes('save') || lower.includes('bookmark')) return 'Saved';
  return 'Applied';
}

export function parseApplicationsCsv(
  csvText: string,
  defaultPlatform: JobPlatformSource = 'LinkedIn Jobs'
): Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[] {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) return [];

  const headers = matrix[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const findCol = (aliases: string[]): number =>
    headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const companyCol = findCol(['company name', 'company', 'employer', 'organization']);
  const roleCol = findCol(['job title', 'role', 'title', 'position']);
  const statusCol = findCol(['status', 'stage']);
  const dateCol = findCol(['application date', 'applied date', 'date applied', 'date']);
  const followUpCol = findCol(['follow up date', 'followup date', 'follow up']);
  const urlCol = findCol(['job url', 'application link', 'job link', 'link', 'url']);
  const sourceCol = findCol(['source platform', 'platform', 'source']);
  const recruiterCol = findCol(['recruiter contact', 'recruiter', 'contact']);
  const nextActionCol = findCol(['next action', 'action']);
  const notesCol = findCol(['notes', 'note', 'resume name']);

  if (companyCol === -1 || roleCol === -1) {
    return [];
  }

  const today = toLocalDateKey();
  const parsed: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  for (const row of matrix.slice(1)) {
    const company = (row[companyCol] || '').trim();
    const role = (row[roleCol] || '').trim();
    if (!company || !role) continue;

    const rawLink = urlCol >= 0 ? (row[urlCol] || '').trim() : '';
    const applicationLink =
      rawLink && !/^https?:\/\//i.test(rawLink) ? `https://${rawLink}` : rawLink || undefined;

    const rawSource = sourceCol >= 0 ? row[sourceCol] : undefined;
    const sourcePlatform = rawSource
      ? normalizePlatformSource(rawSource, defaultPlatform)
      : inferPlatformFromUrl(applicationLink, defaultPlatform);

    const followUpRaw = followUpCol >= 0 ? row[followUpCol] : undefined;
    const followUpDate = followUpRaw ? normalizeDateString(followUpRaw, '') : undefined;

    parsed.push({
      company,
      role,
      status: normalizeStatusString(statusCol >= 0 ? row[statusCol] : undefined),
      applicationDate: normalizeDateString(dateCol >= 0 ? row[dateCol] : undefined, today),
      sourcePlatform,
      applicationLink,
      followUpDate: followUpDate || undefined,
      recruiterContact:
        recruiterCol >= 0 && row[recruiterCol]?.trim() ? row[recruiterCol].trim() : undefined,
      nextAction:
        nextActionCol >= 0 && row[nextActionCol]?.trim() ? row[nextActionCol].trim() : undefined,
      notes: notesCol >= 0 && row[notesCol]?.trim() ? row[notesCol].trim() : undefined,
    });
  }

  return parsed;
}
