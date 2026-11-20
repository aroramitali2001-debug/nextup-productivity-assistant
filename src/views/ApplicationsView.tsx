import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Briefcase,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FilterX,
  Mail,
  Pencil,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { getFollowUpsDue } from '../services/prioritiser';
import { isSampleApplication } from '../services/storage';
import { ApplicationStatus, ApplicationViewFilter, JobApplication } from '../types/nextup';
import { formatFriendlyDate, formatFriendlyDateTime, toLocalDateKey } from '../utils/dateUtils';
import { APPLICATION_STATUS_COLOR } from '../utils/semanticColors';

interface ApplicationsViewProps {
  applications: JobApplication[];
  activeFilter: ApplicationViewFilter;
  onChangeFilter: (filter: ApplicationViewFilter) => void;
  onEditApplication: (app: JobApplication) => void;
  onDeleteApplication: (id: string) => void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onClearSampleApplications: () => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
];

const VIEW_FILTERS: { key: ApplicationViewFilter; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'InterviewOrOA', label: 'Interview / OA' },
  { key: 'FollowUps', label: 'Follow-ups due' },
  { key: 'Interview', label: 'Interviews' },
  { key: 'Assessment', label: 'Assessments' },
  { key: 'Offer', label: 'Offers' },
  { key: 'Closed', label: 'Closed' },
];

const FILTER_DISPLAY_LABEL: Record<ApplicationViewFilter, string> = {
  All: 'All applications',
  Active: 'Active applications',
  InterviewOrOA: 'Interview & Assessment applications',
  FollowUps: 'Applications with follow-ups due',
  Interview: 'Interview-stage applications',
  Assessment: 'Assessment-stage applications',
  Offer: 'Offer-stage applications',
  Closed: 'Closed applications',
};

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  activeFilter,
  onChangeFilter,
  onEditApplication,
  onDeleteApplication,
  onUpdateStatus,
  onClearSampleApplications,
}) => {
  const today = toLocalDateKey();
  const [searchQuery, setSearchQuery] = useState('');

  const isActiveStatus = (s: ApplicationStatus) => s !== 'Rejected' && s !== 'Offer';

  const { followUpDueIds, followUpOverdueIds } = useMemo(() => {
    const { dueToday, overdue } = getFollowUpsDue(applications, today);
    return {
      followUpDueIds: new Set([...overdue, ...dueToday].map((a) => a.id)),
      followUpOverdueIds: new Set(overdue.map((a) => a.id)),
    };
  }, [applications, today]);

  const sampleCount = useMemo(
    () => applications.filter(isSampleApplication).length,
    [applications]
  );

  const counts = useMemo(() => {
    const interviewCount = applications.filter((a) => a.status === 'Interview').length;
    const assessmentCount = applications.filter((a) => a.status === 'Assessment').length;
    return {
      All: applications.length,
      Active: applications.filter((a) => isActiveStatus(a.status)).length,
      FollowUps: followUpDueIds.size,
      InterviewOrOA: interviewCount + assessmentCount,
      Interview: interviewCount,
      Assessment: assessmentCount,
      Offer: applications.filter((a) => a.status === 'Offer').length,
      Closed: applications.filter((a) => a.status === 'Rejected').length,
    };
  }, [applications, followUpDueIds]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applications
      .filter((a) => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Active') return isActiveStatus(a.status);
        if (activeFilter === 'FollowUps') return followUpDueIds.has(a.id);
        if (activeFilter === 'InterviewOrOA') {
          return a.status === 'Interview' || a.status === 'Assessment';
        }
        if (activeFilter === 'Closed') return a.status === 'Rejected';
        return a.status === activeFilter;
      })
      .filter((a) => {
        if (!q) return true;
        return (
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          (a.recruiterContact && a.recruiterContact.toLowerCase().includes(q)) ||
          (a.nextAction && a.nextAction.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aDue = followUpDueIds.has(a.id) ? 0 : 1;
        const bDue = followUpDueIds.has(b.id) ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [applications, activeFilter, searchQuery, followUpDueIds]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1B2E]">Applications</h1>
        <p className="mt-0.5 text-sm text-[#5B5570]">
          Track internships, interviews, recruiter contacts, and follow-up deadlines.
        </p>
      </div>

      {/* Interactive Pipeline Overview Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => onChangeFilter(activeFilter === 'Active' ? 'All' : 'Active')}
          className={`cursor-pointer rounded-2xl border bg-gradient-to-br from-white to-[#F7F4FF] px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#6D4AFF] hover:shadow-xs ${
            activeFilter === 'Active' ? 'border-[#6D4AFF] ring-2 ring-[#6D4AFF]/20' : 'border-[#DFD7F2]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#5B5570]">Active pipeline</span>
            <Briefcase className="h-4 w-4 text-[#6D4AFF]" aria-hidden="true" />
          </div>
          <p className="mt-0.5 text-xl font-bold text-[#1E1B2E] tabular-nums">{counts.Active}</p>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeFilter(activeFilter === 'InterviewOrOA' ? 'All' : 'InterviewOrOA')
          }
          className={`cursor-pointer rounded-2xl border bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]/65 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#EA580C] hover:shadow-xs ${
            activeFilter === 'InterviewOrOA'
              ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20'
              : 'border-[#FED7AA]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#9A3412]">Interviews &amp; OAs</span>
            <ClipboardCheck className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
          </div>
          <p className="mt-0.5 text-xl font-bold text-[#C2410C] tabular-nums">
            {counts.InterviewOrOA}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeFilter(activeFilter === 'FollowUps' ? 'All' : 'FollowUps')}
          className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-xs ${
            activeFilter === 'FollowUps'
              ? 'border-[#6D4AFF] bg-[#F3EFFF] ring-2 ring-[#6D4AFF]/20'
              : counts.FollowUps > 0
                ? 'border-[#DDD6FE] bg-gradient-to-br from-[#F5F2FF] to-[#EDE9FE]/70 hover:border-[#6D4AFF]'
                : 'border-[#E5DFF2] bg-white hover:border-[#C4B5FD]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-medium ${
                counts.FollowUps > 0 ? 'text-[#4C2F96]' : 'text-[#5B5570]'
              }`}
            >
              Follow-ups due
            </span>
            <Send
              className={`h-4 w-4 ${counts.FollowUps > 0 ? 'text-[#6D4AFF]' : 'text-[#7C7594]'}`}
              aria-hidden="true"
            />
          </div>
          <p
            className={`mt-0.5 text-xl font-bold tabular-nums ${
              counts.FollowUps > 0 ? 'text-[#6D4AFF]' : 'text-[#1E1B2E]'
            }`}
          >
            {counts.FollowUps}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeFilter(activeFilter === 'Offer' ? 'All' : 'Offer')}
          className={`cursor-pointer rounded-2xl border bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/65 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-xs ${
            activeFilter === 'Offer' ? 'border-[#16A34A] ring-2 ring-[#16A34A]/20' : 'border-[#BBF7D0]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#15803D]">Offers</span>
            <Award className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
          </div>
          <p className="mt-0.5 text-xl font-bold text-[#16A34A] tabular-nums">{counts.Offer}</p>
        </button>
      </div>

      {counts.FollowUps > 0 && activeFilter !== 'FollowUps' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#DDD6FE] bg-gradient-to-r from-[#F3EFFF] to-[#FAF8FF] px-4 py-3 text-sm text-[#4C2F96]">
          <div className="flex items-center gap-2.5">
            <Send className="h-4 w-4 shrink-0 text-[#6D4AFF]" />
            <span>
              <strong className="font-semibold tabular-nums">{counts.FollowUps}</strong>{' '}
              {counts.FollowUps === 1 ? 'application has' : 'applications have'} a follow-up due today or earlier.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChangeFilter('FollowUps')}
            className="cursor-pointer text-xs font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
          >
            Show due
          </button>
        </div>
      )}

      {/* Visual Filter Views, Clear Filter Action & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {VIEW_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onChangeFilter(f.key)}
              className={`min-h-[40px] shrink-0 cursor-pointer rounded-xl px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === f.key
                  ? 'bg-[#6D4AFF] text-white shadow-2xs'
                  : 'bg-white border border-[#E5DFF2] text-[#5B5570] hover:border-[#C4B5FD] hover:text-[#1E1B2E]'
              }`}
            >
              <span>{f.label}</span>
              <span className="ml-1.5 opacity-80 tabular-nums">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C7594]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, role, or recruiter..."
              aria-label="Search applications"
              className="min-h-[42px] w-full rounded-xl border border-[#E5DFF2] bg-white pl-9 pr-3 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:outline-none"
            />
          </div>

          {activeFilter !== 'All' && (
            <div className="flex items-center gap-2 rounded-xl border border-[#DDD6FE] bg-[#FAF8FF] px-3 py-1.5 text-xs">
              <span className="text-[#5B5570]">
                Showing: <strong className="font-semibold text-[#1E1B2E]">{FILTER_DISPLAY_LABEL[activeFilter]}</strong>
              </span>
              <button
                type="button"
                onClick={() => onChangeFilter('All')}
                className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear filter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {sampleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5DFF2] bg-[#FAF8FF] px-4 py-2.5 text-xs text-[#5B5570]">
          <span>
            Starter sample applications ({sampleCount}) are marked{' '}
            <strong className="font-semibold text-[#1E1B2E]">Sample</strong> so you can tell them apart from your own.
          </span>
          <button
            type="button"
            onClick={onClearSampleApplications}
            className="cursor-pointer font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
          >
            Clear sample applications
          </button>
        </div>
      )}

      {/* Applications Grid */}
      {filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5DFF2] bg-white px-6 py-12 text-center">
          <Briefcase className="h-9 w-9 text-[#C4B5FD]" />
          <h2 className="mt-3 text-base font-semibold text-[#1E1B2E]">
            {searchQuery || activeFilter !== 'All'
              ? 'No matching applications'
              : 'No applications tracked yet'}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[#5B5570]">
            {searchQuery || activeFilter !== 'All'
              ? 'Try clearing your filter or search to see all tracked applications.'
              : 'Use Add Application in the top bar to save roles, log interviews, and get suggested prep tasks.'}
          </p>
          {(searchQuery || activeFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                onChangeFilter('All');
                setSearchQuery('');
              }}
              className="mt-3 inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#DDD6FE] bg-[#F5F2FF] px-3.5 text-xs font-semibold text-[#5B38EE] hover:bg-[#EDE9FE] transition-colors"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Show all applications</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredApps.map((app) => {
            const isFollowUpDue = followUpDueIds.has(app.id);
            const isFollowUpLate = followUpOverdueIds.has(app.id);
            const statusStyle = APPLICATION_STATUS_COLOR[app.status];

            return (
              <article
                key={app.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-4 sm:p-5 transition-colors ${
                  isFollowUpLate
                    ? 'border-[#FECACA]'
                    : isFollowUpDue
                      ? 'border-[#DDD6FE]'
                      : 'border-[#E5DFF2]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#1E1B2E] truncate">
                        {app.company}
                      </h2>
                      <p className="text-sm text-[#5B5570] truncate">{app.role}</p>
                    </div>

                    <select
                      aria-label={`Status for ${app.company} ${app.role}`}
                      value={app.status}
                      onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                      className={`min-h-[38px] shrink-0 cursor-pointer rounded-xl border px-2.5 text-xs font-semibold focus:border-[#6D4AFF] focus:outline-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5B5570] tabular-nums">
                    <span>Applied {formatFriendlyDate(app.applicationDate, today)}</span>
                    {app.followUpDate && (
                      <>
                        <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                            isFollowUpLate
                              ? 'bg-[#FEF2F2] font-semibold text-[#DC2626]'
                              : isFollowUpDue
                                ? 'bg-[#F3EFFF] font-semibold text-[#6D4AFF]'
                                : 'text-[#5B5570]'
                          }`}
                        >
                          {isFollowUpLate ? (
                            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : isFollowUpDue ? (
                            <Send className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : (
                            <Clock className="h-3 w-3 shrink-0 opacity-75" aria-hidden="true" />
                          )}
                          <span>
                            {isFollowUpLate ? 'Follow-up overdue: ' : 'Follow-up '}
                            {formatFriendlyDateTime(app.followUpDate, app.followUpTime, today)}
                          </span>
                        </span>
                      </>
                    )}
                    {isSampleApplication(app) && (
                      <>
                        <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                        <span className="font-medium text-[#8E87A6]">Sample</span>
                      </>
                    )}
                  </div>

                  {app.recruiterContact && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#5B5570] truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-[#6D4AFF]" />
                      <span className="truncate">{app.recruiterContact}</span>
                    </p>
                  )}

                  {app.nextAction && (
                    <p className="mt-2.5 text-sm text-[#1E1B2E]">
                      <span className="font-medium text-[#5B5570]">Next: </span>
                      {app.nextAction}
                    </p>
                  )}

                  {app.notes && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5B5570] line-clamp-2">
                      {app.notes}
                    </p>
                  )}

                  {app.reflectionNote && app.status === 'Rejected' && (
                    <p className="mt-2 rounded-lg bg-[#FAF9FE] px-2.5 py-1.5 text-xs text-[#5B5570]">
                      Reflection: {app.reflectionNote}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#F1ECFA] pt-3">
                  <div>
                    {app.applicationLink ? (
                      <a
                        href={app.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 text-xs font-medium text-[#6D4AFF] hover:underline"
                      >
                        <span>Open posting</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-[#8E87A6]">No link saved</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 -mr-1.5">
                    <button
                      type="button"
                      onClick={() => onEditApplication(app)}
                      aria-label={`Edit ${app.company} application`}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-[#7C7594] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteApplication(app.id)}
                      aria-label={`Delete ${app.company} application`}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-[#7C7594] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
