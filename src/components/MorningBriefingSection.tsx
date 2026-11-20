import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  Moon,
  RefreshCw,
  Send,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { deterministicPrioritiser } from '../services/prioritiser';
import { CalendarEventItem } from '../services/workspaceApis';
import {
  AIDailyPlan,
  BriefingType,
  JobApplication,
  Task,
  TaskPriority,
  WorkloadMetrics,
} from '../types/nextup';
import {
  addDaysToDateKey,
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDate,
  formatFriendlyDateTime,
  formatTime12h,
  toDateKeyInTimeZone,
} from '../utils/dateUtils';
import { PRIORITY_COLOR } from '../utils/semanticColors';

interface MorningBriefingSectionProps {
  firstName: string;
  timeZone?: string;
  briefingMode: BriefingType;
  onChangeBriefingMode: (mode: BriefingType) => void;
  tasks: Task[];
  applications: JobApplication[];
  plan: AIDailyPlan;
  workload: WorkloadMetrics;
  isPlanningAI: boolean;
  calendarConnected: boolean;
  calendarEvents: CalendarEventItem[];
  calendarBusyMinutes: number;
  emailSetupReady: boolean;
  emailRemindersEnabled: boolean;
  morningBriefingEmailEnabled: boolean;
  morningBriefingTime: string;
  planAcceptedToday: boolean;
  onAcceptPlan: () => void;
  onRefreshPlan: () => void;
  onOpenPreferences: () => void;
  onApprovePostpone: (taskId: string, newDeadline: string) => void;
  onApproveDeprioritise: (taskId: string, newPriority: TaskPriority) => void;
  onDismissSuggestion: (taskId: string, kind: 'postpone' | 'deprioritise') => void;
}

export const MorningBriefingSection: React.FC<MorningBriefingSectionProps> = ({
  firstName,
  timeZone,
  briefingMode,
  onChangeBriefingMode,
  tasks,
  applications,
  plan,
  workload,
  isPlanningAI,
  calendarConnected,
  calendarEvents,
  calendarBusyMinutes,
  emailSetupReady,
  emailRemindersEnabled,
  morningBriefingEmailEnabled,
  morningBriefingTime,
  planAcceptedToday,
  onAcceptPlan,
  onRefreshPlan,
  onOpenPreferences,
  onApprovePostpone,
  onApproveDeprioritise,
  onDismissSuggestion,
}) => {
  const today = toDateKeyInTimeZone(new Date(), timeZone);
  const tomorrow = addDaysToDateKey(today, 1);
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const openMinutesAfterCalendar = calendarConnected
    ? Math.max(0, Math.round(workload.availableHoursToday * 60) - Math.round(calendarBusyMinutes * 0.5))
    : Math.round(workload.availableHoursToday * 60);

  const capacityRatio =
    openMinutesAfterCalendar > 0
      ? Math.min(100, Math.round((workload.remainingMinutesToday / openMinutesAfterCalendar) * 100))
      : workload.remainingMinutesToday > 0
        ? 100
        : 0;

  const isOverCapacity = workload.remainingMinutesToday > openMinutesAfterCalendar;
  const openTasksCount = tasks.filter((t) => !t.completed).length;

  const eveningData = useMemo(() => {
    const completedToday = tasks.filter(
      (t) =>
        t.completed &&
        (t.completedAt
          ? toDateKeyInTimeZone(new Date(t.completedAt), timeZone) === today
          : t.deadline === today)
    );
    const pendingTodayOrOverdue = tasks.filter((t) => !t.completed && t.deadline <= today);
    const upcoming = tasks
      .filter((t) => !t.completed && t.deadline > today)
      .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime));
    const followUpsDueOrTomorrow = applications.filter(
      (a) =>
        a.followUpDate &&
        a.followUpDate <= tomorrow &&
        a.status !== 'Rejected' &&
        a.status !== 'Offer'
    );
    const tomorrowPriorities = deterministicPrioritiser.rankTopPriorities(tasks, tomorrow, 3);
    return {
      completedToday,
      pendingTodayOrOverdue,
      upcoming,
      followUpsDueOrTomorrow,
      tomorrowPriorities,
    };
  }, [tasks, applications, today, tomorrow, timeZone]);

  const isEvening = briefingMode === 'evening';

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-2xs ${
        isEvening ? 'border-[#C7BDF0]' : 'border-[#D4C8F2]'
      }`}
    >
      {/* Tinted Morning / Evening Briefing Header */}
      <div
        className={`border-b px-4 py-3.5 sm:px-5 ${
          isEvening
            ? 'border-[#DDD6FE] bg-gradient-to-r from-[#EDE9FE] via-[#F2EEFF] to-[#FAF8FF]'
            : 'border-[#E4DCF7] bg-gradient-to-r from-[#F5F1FF] via-[#F1EBFF] to-[#FAF8FF]'
        }`}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${
                isEvening
                  ? 'border-[#C4B5FD] bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] text-[#5B38EE]'
                  : 'border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] text-[#EA580C]'
              }`}
            >
              {isEvening ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1E1B2E]">
                  {isEvening ? '🌙 AI Evening Briefing' : '☀️ AI Morning Briefing'}
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5B38EE]">
                  <Sparkles className="h-4 w-4" />
                  {plan.source === 'gemini'
                    ? isEvening
                      ? 'Gemini Evening Plan'
                      : 'Gemini Morning Plan'
                    : isEvening
                      ? 'Smart Evening Plan'
                      : 'Smart Morning Plan'}
                </span>
                {planAcceptedToday && !isEvening && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                    <Check className="h-3.5 w-3.5" />
                    Accepted
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-[#5B38EE]">
                {isEvening
                  ? firstName
                    ? `Good evening, ${firstName}!`
                    : 'Good evening!'
                  : firstName
                    ? `Good morning, ${firstName}!`
                    : 'Good morning!'}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-[#4C4563]">{plan.headlineSummary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Morning / Evening Briefing Mode Switch */}
            <div
              role="group"
              aria-label="Briefing mode"
              className="inline-flex rounded-xl border border-[#D4C8F2] bg-white/90 p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => onChangeBriefingMode('morning')}
                aria-pressed={!isEvening}
                className={`inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-lg px-2.5 font-medium transition-colors ${
                  !isEvening
                    ? 'bg-[#6D4AFF] text-white'
                    : 'text-[#5B5570] hover:text-[#1E1B2E]'
                }`}
              >
                <Sun className="h-3 w-3" aria-hidden="true" />
                <span>Morning</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeBriefingMode('evening')}
                aria-pressed={isEvening}
                className={`inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-lg px-2.5 font-medium transition-colors ${
                  isEvening
                    ? 'bg-[#5B38EE] text-white'
                    : 'text-[#5B5570] hover:text-[#1E1B2E]'
                }`}
              >
                <Moon className="h-3 w-3" aria-hidden="true" />
                <span>Evening</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onRefreshPlan}
              disabled={isPlanningAI}
              className="flex min-h-[36px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#D4C8F2] bg-white px-3 text-xs font-medium text-[#4C2F96] hover:bg-[#EDE9FE] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#6D4AFF] ${isPlanningAI ? 'animate-spin' : ''}`}
              />
              <span>{isPlanningAI ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Actionable Briefing Body */}
      <div className="p-4 sm:px-5 sm:py-4 space-y-3">
        {isEvening ? (
          <>
            {/* Evening Wrap-Up Snapshot */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/70 px-3 py-2.5">
                <span className="text-[11px] font-bold text-[#15803D]">🟢 Done today</span>
                <p className="mt-0.5 text-xl font-extrabold text-[#16A34A] tabular-nums">
                  {eveningData.completedToday.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]/70 px-3 py-2.5">
                <span className="text-[11px] font-bold text-[#9A3412]">⏳ Pending</span>
                <p className="mt-0.5 text-xl font-extrabold text-[#C2410C] tabular-nums">
                  {eveningData.pendingTodayOrOverdue.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/70 px-3 py-2.5">
                <span className="text-[11px] font-bold text-[#1D4ED8]">📅 Upcoming</span>
                <p className="mt-0.5 text-xl font-extrabold text-[#2563EB] tabular-nums">
                  {eveningData.upcoming.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#DDD6FE] bg-gradient-to-br from-[#F5F1FF] to-[#EDE9FE]/70 px-3 py-2.5">
                <span className="text-[11px] font-bold text-[#4C2F96]">📤 Follow-ups</span>
                <p className="mt-0.5 text-xl font-extrabold text-[#6D4AFF] tabular-nums">
                  {eveningData.followUpsDueOrTomorrow.length}
                </p>
              </div>
            </div>

            {eveningData.completedToday.length > 0 && (
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4]/70 px-3.5 py-2.5 text-xs space-y-1">
                <p className="inline-flex items-center gap-1.5 font-bold text-[#15803D]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>✅ Wrapped up today</span>
                </p>
                <p className="text-[#166534] line-clamp-2">
                  {eveningData.completedToday
                    .slice(0, 3)
                    .map((t) => t.title)
                    .join(' · ')}
                  {eveningData.completedToday.length > 3
                    ? ` (+${eveningData.completedToday.length - 3} more)`
                    : ''}
                </p>
              </div>
            )}

            {/* Next Day Priorities */}
            <div className="rounded-xl border border-[#E6E0F5] bg-[#FAF8FF] px-3.5 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#1E1B2E]">🌅 Priorities for tomorrow</span>
                {eveningData.followUpsDueOrTomorrow.length > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#6D4AFF] tabular-nums">
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {eveningData.followUpsDueOrTomorrow.length} follow-up(s)
                  </span>
                )}
              </div>
              {eveningData.tomorrowPriorities.length === 0 ? (
                <p className="text-xs text-[#5B5570]">
                  ✨ No pending tasks scheduled for tomorrow — enjoy your evening!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {eveningData.tomorrowPriorities.map((item, idx) => {
                    const t = item.task;
                    const prio = PRIORITY_COLOR[t.priority];
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#EDE9F6] bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F3EFFF] text-[11px] font-bold text-[#5B38EE] tabular-nums">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1E1B2E] truncate">{t.title}</p>
                            <p className="text-[11px] text-[#5B5570] truncate">
                              <span className={`font-medium ${prio.text}`}>{t.priority}</span> ·{' '}
                              {formatFriendlyDateTime(t.deadline, t.deadlineTime, today)}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#5B5570] tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-[#7C7594]" aria-hidden="true" />
                          {formatDuration(t.estimatedMinutes)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Workload & Calendar Capacity Meter */}
            <div className="rounded-xl border border-[#E6E0F5] bg-[#FAF8FF] px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                <span className="font-semibold text-[#1E1B2E]">
                  📊 Today&apos;s load:{' '}
                  <span
                    className={
                      isOverCapacity ? 'font-bold text-[#C2410C]' : 'font-bold text-[#15803D]'
                    }
                  >
                    {formatDuration(workload.remainingMinutesToday)}
                  </span>{' '}
                  / {formatDuration(openMinutesAfterCalendar)} open
                </span>

                <div className="flex items-center gap-2.5">
                  {calendarConnected && (
                    <span className="inline-flex items-center gap-1 font-medium text-[#1D4ED8]">
                      <Calendar className="h-4 w-4" />
                      {calendarEvents.length} events ({formatDuration(calendarBusyMinutes)})
                    </span>
                  )}
                  <span
                    className={`font-extrabold ${
                      isOverCapacity
                        ? 'text-[#C2410C]'
                        : capacityRatio >= 80
                          ? 'text-[#D97706]'
                          : 'text-[#15803D]'
                    }`}
                  >
                    {capacityRatio}%
                  </span>
                </div>
              </div>

              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E8E0F7]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverCapacity
                      ? 'bg-gradient-to-r from-[#EA580C] to-[#F97316]'
                      : capacityRatio >= 80
                        ? 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]'
                        : 'bg-gradient-to-r from-[#16A34A] to-[#22C55E]'
                  }`}
                  style={{ width: `${capacityRatio}%` }}
                />
              </div>
            </div>

            {/* Schedule Conflict or Assistant Capacity Guidance */}
            {plan.conflicts.length > 0 ? (
              <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3.5 py-2.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#C2410C]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>⚠️ Tight schedule alert</span>
                </div>
                <p className="text-[#9A3412]">{plan.conflicts[0]}</p>
              </div>
            ) : !isOverCapacity && openTasksCount > 0 ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                <p className="text-[#166534]">
                  <span className="font-bold">
                    {firstName ? `✅ On track, ${firstName}: ` : '✅ On track: '}
                  </span>
                  {formatDuration(Math.max(0, openMinutesAfterCalendar - workload.remainingMinutesToday))}{' '}
                  buffer open today — start with your #1 focus task below.
                </p>
              </div>
            ) : null}

            {/* Realistic Overload Adjustments (Only when triggered & requires explicit approval) */}
            {(plan.postponeSuggestions.length > 0 || plan.deprioritiseSuggestions.length > 0) && (
              <div className="space-y-2 rounded-xl border border-[#FED7AA] bg-[#FFFBF5] p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#9A3412]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#EA580C]" />
                  <span>Optional schedule adjustments</span>
                </p>

                {plan.postponeSuggestions.slice(0, 2).map((sug) => {
                  const task = taskMap.get(sug.taskId);
                  if (!task || task.completed) return null;
                  return (
                    <div
                      key={`postpone-${sug.taskId}`}
                      className="flex flex-col gap-2 rounded-lg border border-[#FDE6CE] bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-xs font-medium text-[#1E1B2E] min-w-0">
                        Move &ldquo;{task.title}&rdquo;{' '}
                        <ArrowRight className="inline h-3 w-3 text-[#6D4AFF]" />{' '}
                        <span className="font-semibold text-[#6D4AFF]">
                          {formatFriendlyDate(sug.suggestedDeadline, today)}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApprovePostpone(sug.taskId, sug.suggestedDeadline)}
                          className="flex min-h-[34px] items-center gap-1 rounded-lg bg-[#6D4AFF] px-2.5 text-xs font-medium text-white hover:bg-[#5B38EE]"
                        >
                          <Check className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissSuggestion(sug.taskId, 'postpone')}
                          className="flex min-h-[34px] items-center gap-1 rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F5F1FF]"
                        >
                          <X className="h-3 w-3" />
                          <span>Keep</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {plan.deprioritiseSuggestions.slice(0, 1).map((sug) => {
                  const task = taskMap.get(sug.taskId);
                  if (!task || task.completed) return null;
                  return (
                    <div
                      key={`deprio-${sug.taskId}`}
                      className="flex flex-col gap-2 rounded-lg border border-[#FDE6CE] bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-xs font-medium text-[#1E1B2E] min-w-0">
                        Lower &ldquo;{task.title}&rdquo; to{' '}
                        <span className="font-semibold text-[#5B5570]">{sug.suggestedPriority}</span>
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApproveDeprioritise(sug.taskId, sug.suggestedPriority)}
                          className="flex min-h-[34px] items-center gap-1 rounded-lg bg-[#6D4AFF] px-2.5 text-xs font-medium text-white hover:bg-[#5B38EE]"
                        >
                          <Check className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismissSuggestion(sug.taskId, 'deprioritise')}
                          className="flex min-h-[34px] items-center gap-1 rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F5F1FF]"
                        >
                          <X className="h-3 w-3" />
                          <span>Keep</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {!isEvening ? (
            <button
              type="button"
              onClick={onAcceptPlan}
              className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-colors ${
                planAcceptedToday
                  ? 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                  : 'bg-[#6D4AFF] text-white hover:bg-[#5B38EE]'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{planAcceptedToday ? 'Plan accepted' : 'Accept plan'}</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-[#5B5570]">
              Evening wrap-up · ready for tomorrow
            </span>
          )}

          <button
            type="button"
            onClick={onOpenPreferences}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#5B5570] hover:text-[#6D4AFF]"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {!emailSetupReady ? (
              <span>Email reminders setup required</span>
            ) : emailRemindersEnabled && morningBriefingEmailEnabled ? (
              <span>In-session daily email ({formatTime12h(morningBriefingTime)})</span>
            ) : (
              <span>Briefing emails off</span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
