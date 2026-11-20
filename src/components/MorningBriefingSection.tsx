import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Mail,
  RefreshCw,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CalendarEventItem } from '../services/workspaceApis';
import {
  AIDailyPlan,
  Task,
  TaskPriority,
  WorkloadMetrics,
} from '../types/nextup';
import {
  formatDuration,
  formatFriendlyDate,
  formatTime12h,
  toLocalDateKey,
} from '../utils/dateUtils';

interface MorningBriefingSectionProps {
  firstName: string;
  tasks: Task[];
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
  tasks,
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
  const today = toLocalDateKey();
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

  return (
    <section className="overflow-hidden rounded-2xl border border-[#D4C8F2] bg-white shadow-2xs">
      {/* Tinted Morning Briefing Header */}
      <div className="border-b border-[#E4DCF7] bg-gradient-to-r from-[#F5F1FF] via-[#F1EBFF] to-[#FAF8FF] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] text-[#EA580C]">
              <Sun className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1E1B2E]">
                  AI Morning Briefing
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5B38EE]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {plan.source === 'gemini' ? 'Gemini AI' : 'Smart Plan'}
                </span>
                {planAcceptedToday && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                    <Check className="h-3.5 w-3.5" />
                    Accepted
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm leading-snug text-[#4C4563]">
                {plan.headlineSummary}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshPlan}
            disabled={isPlanningAI}
            className="flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#D4C8F2] bg-white px-3 text-xs font-medium text-[#4C2F96] hover:bg-[#EDE9FE] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#6D4AFF] ${isPlanningAI ? 'animate-spin' : ''}`} />
            <span>{isPlanningAI ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Compact Actionable Summary Body */}
      <div className="p-4 sm:px-5 sm:py-4 space-y-3">
        {/* Workload & Calendar Capacity Meter */}
        <div className="rounded-xl border border-[#E6E0F5] bg-[#FAF8FF] px-3.5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
            <span className="font-medium text-[#1E1B2E]">
              Today&apos;s load:{' '}
              <span className={isOverCapacity ? 'font-bold text-[#C2410C]' : 'font-semibold text-[#15803D]'}>
                {formatDuration(workload.remainingMinutesToday)}
              </span>{' '}
              planned of {formatDuration(openMinutesAfterCalendar)} open
            </span>

            {calendarConnected && (
              <span className="inline-flex items-center gap-1 font-medium text-[#1D4ED8]">
                <Calendar className="h-3.5 w-3.5" />
                {calendarEvents.length} Calendar event(s) ({formatDuration(calendarBusyMinutes)})
              </span>
            )}
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E8E0F7]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverCapacity
                  ? 'bg-[#EA580C]'
                  : capacityRatio >= 80
                    ? 'bg-[#F59E0B]'
                    : 'bg-[#16A34A]'
              }`}
              style={{ width: `${capacityRatio}%` }}
            />
          </div>
        </div>

        {/* Schedule Conflict or Assistant Capacity Guidance */}
        {plan.conflicts.length > 0 ? (
          <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3.5 py-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#C2410C]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Tight schedule alert</span>
            </div>
            <p className="text-[#9A3412]">{plan.conflicts[0]}</p>
          </div>
        ) : !isOverCapacity && openTasksCount > 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3.5 py-2.5 text-xs">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
            <p className="text-[#166534]">
              <span className="font-semibold">
                {firstName ? `On track, ${firstName}: ` : 'On track: '}
              </span>
              {formatDuration(Math.max(0, openMinutesAfterCalendar - workload.remainingMinutesToday))} of buffer remains in your daily budget — knock out your top focus item below while energy is high.
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

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
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

          <button
            type="button"
            onClick={onOpenPreferences}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5B5570] hover:text-[#6D4AFF]"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {!emailSetupReady ? (
              <span>Email reminders setup required</span>
            ) : emailRemindersEnabled && morningBriefingEmailEnabled ? (
              <span>Daily email active ({formatTime12h(morningBriefingTime)})</span>
            ) : (
              <span>Briefing emails off</span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
