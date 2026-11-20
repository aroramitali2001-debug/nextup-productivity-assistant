import React, { useState } from 'react';
import { Check, Clock, Plus, RefreshCw, X } from 'lucide-react';
import { ReplanResult, Task, TaskCategory, TaskPriority } from '../types/nextup';
import { generateReplanMyDay } from '../services/aiPlanner';
import { formatDuration, formatFriendlyDateTime, toLocalDateKey } from '../utils/dateUtils';
import { parseNaturalLanguageTask } from '../utils/nlTaskParser';

interface MiddayCheckInModalProps {
  isOpen: boolean;
  firstName: string;
  tasks: Task[];
  remainingHours: number;
  onChangeRemainingHours: (hrs: number) => void;
  onToggleComplete: (id: string) => void;
  onToggleTakingLonger: (id: string) => void;
  onQuickAddUnexpected: (
    title: string,
    category: TaskCategory,
    priority: TaskPriority,
    deadline: string,
    deadlineTime?: string,
    estimatedMinutes?: number
  ) => void;
  onApplySuggestion: (taskId: string, newDeadline?: string, newPriority?: TaskPriority) => void;
  onClose: () => void;
}

export const MiddayCheckInModal: React.FC<MiddayCheckInModalProps> = ({
  isOpen,
  firstName,
  tasks,
  remainingHours,
  onChangeRemainingHours,
  onToggleComplete,
  onToggleTakingLonger,
  onQuickAddUnexpected,
  onApplySuggestion,
  onClose,
}) => {
  const today = toLocalDateKey();
  const [unexpectedText, setUnexpectedText] = useState('');
  const [replan, setReplan] = useState<ReplanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handledIds, setHandledIds] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const todayTasks = tasks.filter((t) => t.deadline === today || (!t.completed && t.deadline < today));
  const completedToday = tasks.filter(
    (t) =>
      t.completed &&
      (t.completedAt ? toLocalDateKey(new Date(t.completedAt)) === today : t.deadline === today)
  );
  const remainingToday = todayTasks.filter((t) => !t.completed);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const handleAddUnexpected = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = unexpectedText.trim();
    if (!trimmed) return;
    const parsed = parseNaturalLanguageTask(trimmed);
    onQuickAddUnexpected(
      parsed.title,
      parsed.category,
      parsed.priority,
      parsed.deadline,
      parsed.deadlineTime,
      parsed.estimatedMinutes
    );
    setUnexpectedText('');
  };

  const handleGenerateAfternoonPlan = async () => {
    setIsLoading(true);
    setHandledIds({});
    const takingLongerNames = remainingToday
      .filter((t) => t.takingLonger)
      .map((t) => t.title)
      .join(', ');
    const note = takingLongerNames
      ? `Taking longer than expected: ${takingLongerNames}`
      : undefined;
    const result = await generateReplanMyDay(
      tasks,
      remainingHours,
      completedToday.length,
      note,
      new Date(),
      firstName
    );
    setReplan(result);
    setIsLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="midday-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-[#E5DFF2] pb-3">
          <div>
            <h2 id="midday-modal-title" className="text-lg font-semibold text-[#1E1B2E]">
              {firstName ? `${firstName}, Midday Check-in` : 'Midday Check-in'}
            </h2>
            <p className="mt-0.5 text-xs text-[#5B5570] tabular-nums">
              You completed {completedToday.length} task(s) today · {remainingToday.length} remaining
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close midday check-in"
            className="flex h-10 w-10 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {/* 1. Review Progress & Mark Taking Longer */}
          <div>
            <h3 className="text-xs font-semibold text-[#5B5570]">
              Update progress or flag tasks taking longer than expected
            </h3>
            {remainingToday.length === 0 ? (
              <p className="mt-2 rounded-xl bg-[#F0FDF4] px-3.5 py-2.5 text-xs font-medium text-[#15803D]">
                All tasks for today are completed!
              </p>
            ) : (
              <div className="mt-2 divide-y divide-[#F1ECFA] rounded-xl border border-[#E5DFF2]">
                {remainingToday.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(t.id)}
                        aria-label={`Mark "${t.title}" complete`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#C9BFE3] bg-white hover:border-[#6D4AFF]"
                      >
                        {t.completed && <Check className="h-3.5 w-3.5 text-[#16A34A]" />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1E1B2E] truncate">{t.title}</p>
                        <p className="text-[11px] text-[#5B5570] tabular-nums">
                          {formatDuration(t.estimatedMinutes)} · {formatFriendlyDateTime(t.deadline, t.deadlineTime, today)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleTakingLonger(t.id)}
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        t.takingLonger
                          ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
                          : 'bg-[#F7F5FC] text-[#5B5570] hover:text-[#1E1B2E]'
                      }`}
                    >
                      {t.takingLonger ? 'Taking longer' : 'Taking longer?'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Add Unexpected Task */}
          <form onSubmit={handleAddUnexpected} className="space-y-1.5">
            <label htmlFor="midday-unexpected-input" className="block text-xs font-semibold text-[#5B5570]">
              Add an unexpected task that came up today
            </label>
            <div className="flex items-center gap-2">
              <input
                id="midday-unexpected-input"
                type="text"
                value={unexpectedText}
                onChange={(e) => setUnexpectedText(e.target.value)}
                placeholder="e.g., Reply to recruiter today at 4 PM"
                className="min-h-[42px] flex-1 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!unexpectedText.trim()}
                className="flex min-h-[42px] items-center gap-1 rounded-xl bg-[#EDE9FE] px-3.5 text-xs font-medium text-[#4C2F96] hover:bg-[#DDD6FE] disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* 3. Remaining Hours & Generate Afternoon Plan */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F5FC] p-3.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#6D4AFF]" />
              <label htmlFor="midday-hours-input" className="text-xs font-medium text-[#1E1B2E]">
                Remaining time available today:
              </label>
              <input
                id="midday-hours-input"
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={remainingHours}
                onChange={(e) => onChangeRemainingHours(Math.max(0.5, Number(e.target.value) || 1))}
                className="w-16 rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs font-semibold text-[#1E1B2E] tabular-nums"
              />
              <span className="text-xs text-[#5B5570]">hrs</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateAfternoonPlan}
              disabled={isLoading}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-4 text-xs font-medium text-white hover:bg-[#5B38EE] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Planning...' : 'Plan rest of day'}</span>
            </button>
          </div>

          {/* 4. Generated Rest-of-Day Plan */}
          {replan && (
            <div className="space-y-3 rounded-xl border border-[#DDD6FE] bg-[#FAF9FE] p-4">
              <p className="text-sm font-medium text-[#1E1B2E]">{replan.summary}</p>
              <p className="text-xs text-[#5B5570]">{replan.overloadExplanation}</p>

              {replan.nextUpTaskId && taskMap.get(replan.nextUpTaskId) && (
                <div className="rounded-lg bg-white p-3 border border-[#E5DFF2]">
                  <p className="text-[11px] font-semibold text-[#6D4AFF]">Recommended next step</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#1E1B2E]">
                    {taskMap.get(replan.nextUpTaskId)?.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5B5570]">{replan.nextUpReason}</p>
                </div>
              )}

              {replan.suggestions
                .filter((s) => s.type !== 'keep_focus' && !handledIds[s.id])
                .map((sug) => {
                  const task = taskMap.get(sug.taskId);
                  if (!task) return null;
                  return (
                    <div
                      key={sug.id}
                      className="flex flex-col gap-2 rounded-lg bg-white p-3 border border-[#E5DFF2] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1E1B2E]">{task.title}</p>
                        <p className="mt-0.5 text-xs text-[#5B5570]">{sug.reason}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onApplySuggestion(sug.taskId, sug.suggestedDeadline, sug.suggestedPriority);
                            setHandledIds((prev) => ({ ...prev, [sug.id]: true }));
                          }}
                          className="rounded-lg bg-[#6D4AFF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5B38EE]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setHandledIds((prev) => ({ ...prev, [sug.id]: true }))}
                          className="rounded-lg border border-[#E5DFF2] px-2.5 py-1.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
