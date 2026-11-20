import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { AIDailyPlan, Task, TaskPriority } from '../types/nextup';
import { formatDuration, formatFriendlyDate, formatFriendlyDateTime, toLocalDateKey } from '../utils/dateUtils';
import { CATEGORY_COLOR } from '../utils/semanticColors';

interface AIDailyPlannerSectionProps {
  firstName: string;
  plan: AIDailyPlan;
  tasks: Task[];
  isLoading: boolean;
  onRefreshPlan: () => void;
  onReplanMyDay: () => void;
  onToggleTask: (id: string) => void;
  onApprovePostpone: (taskId: string, newDeadline: string) => void;
  onApproveDeprioritise: (taskId: string, newPriority: TaskPriority) => void;
  onDismissSuggestion: (taskId: string, kind: 'postpone' | 'deprioritise') => void;
}

export const AIDailyPlannerSection: React.FC<AIDailyPlannerSectionProps> = ({
  firstName,
  plan,
  tasks,
  isLoading,
  onRefreshPlan,
  onReplanMyDay,
  onToggleTask,
  onApprovePostpone,
  onApproveDeprioritise,
  onDismissSuggestion,
}) => {
  const today = toLocalDateKey();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <section className="rounded-2xl border border-[#DDD6FE] bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#F1ECFA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#6D4AFF]" />
            <h2 className="text-base font-semibold text-[#1E1B2E] sm:text-lg">
              {firstName ? `Your priorities for today, ${firstName}.` : 'AI Daily Planner'}
            </h2>
            <span className="text-xs font-medium text-[#6D4AFF]">
              · {plan.source === 'gemini' ? 'Gemini AI' : 'Smart Local Analysis'}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#5B5570]">{plan.headlineSummary}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefreshPlan}
            disabled={isLoading}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 text-xs font-medium text-[#1E1B2E] hover:bg-[#F1ECFA] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#6D4AFF] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analysing...' : 'Analyse with AI'}</span>
          </button>

          <button
            type="button"
            onClick={onReplanMyDay}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3.5 text-xs font-medium text-white hover:bg-[#5B38EE] transition-colors whitespace-nowrap"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Replan My Day</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Potential Conflicts */}
        {plan.conflicts.length > 0 && (
          <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3.5 py-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Deadline conflict detected</span>
            </div>
            {plan.conflicts.map((conflict, idx) => (
              <p key={idx} className="text-xs text-[#9A3412]">
                {conflict}
              </p>
            ))}
          </div>
        )}

        {/* Recommended Order & Start Immediately */}
        {plan.recommendedOrder.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-[#5B5570]">
              Recommended order of completion
            </h3>
            <div className="mt-2.5 divide-y divide-[#F1ECFA] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE]">
              {plan.recommendedOrder.map((step, index) => {
                const task = taskMap.get(step.taskId);
                if (!task) return null;
                const startNow = plan.startImmediatelyIds.includes(task.id);
                const unrealistic = plan.unrealisticTodayIds.includes(task.id);
                const catStyle = CATEGORY_COLOR[task.category];

                return (
                  <div key={task.id} className="flex items-start gap-3 px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={`Toggle completion for ${task.title}`}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                        task.completed
                          ? 'border-[#16A34A] bg-[#16A34A] text-white'
                          : startNow
                            ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]'
                            : 'border-[#DDD6FE] bg-white text-[#5B38EE]'
                      }`}
                    >
                      {task.completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={`text-sm font-medium ${
                            task.completed ? 'line-through text-[#7C7594]' : 'text-[#1E1B2E]'
                          }`}
                        >
                          {task.title}
                        </span>
                        {startNow && !task.completed && (
                          <span className="text-xs font-semibold text-[#C2410C]">
                            · Start immediately
                          </span>
                        )}
                        {unrealistic && !task.completed && (
                          <span className="text-xs font-semibold text-[#B91C1C]">
                            · Tight fit today
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#5B5570] tabular-nums">
                        <span className={`font-medium ${catStyle.text}`}>{task.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {step.timingAdvice}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatFriendlyDateTime(task.deadline, task.deadlineTime, today)}</span>
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-[#5B5570]">{step.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested Adjustments (Require Explicit User Approval) */}
        {(plan.postponeSuggestions.length > 0 || plan.deprioritiseSuggestions.length > 0) && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#5B5570]">
                Suggested adjustments (nothing changes unless you approve)
              </h3>
            </div>

            {plan.postponeSuggestions.map((sug) => {
              const task = taskMap.get(sug.taskId);
              if (!task || task.completed) return null;
              return (
                <div
                  key={`postpone-${sug.taskId}`}
                  className="flex flex-col gap-2.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E1B2E]">
                      Move &ldquo;{task.title}&rdquo;{' '}
                      <ArrowRight className="inline h-3.5 w-3.5 text-[#6D4AFF]" />{' '}
                      <span className="text-[#6D4AFF]">
                        {formatFriendlyDate(sug.suggestedDeadline, today)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#5B5570]">
                      {sug.reason} ({formatDuration(task.estimatedMinutes)} freed today)
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onApprovePostpone(sug.taskId, sug.suggestedDeadline)}
                      className="flex min-h-[38px] items-center gap-1 rounded-lg bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE] transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismissSuggestion(sug.taskId, 'postpone')}
                      aria-label="Reject postponement suggestion"
                      className="flex min-h-[38px] items-center gap-1 rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Keep today</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {plan.deprioritiseSuggestions.map((sug) => {
              const task = taskMap.get(sug.taskId);
              if (!task || task.completed) return null;
              return (
                <div
                  key={`deprio-${sug.taskId}`}
                  className="flex flex-col gap-2.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E1B2E]">
                      Deprioritise &ldquo;{task.title}&rdquo; to{' '}
                      <span className="text-[#5B5570]">{sug.suggestedPriority}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#5B5570]">{sug.reason}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onApproveDeprioritise(sug.taskId, sug.suggestedPriority)}
                      className="flex min-h-[38px] items-center gap-1 rounded-lg bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE] transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDismissSuggestion(sug.taskId, 'deprioritise')}
                      aria-label="Reject deprioritisation suggestion"
                      className="flex min-h-[38px] items-center gap-1 rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
