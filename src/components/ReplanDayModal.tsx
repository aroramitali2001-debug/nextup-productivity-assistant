import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { ReplanResult, ReplanSuggestion, Task, TaskPriority } from '../types/nextup';
import { formatDuration, formatFriendlyDateTime, toLocalDateKey } from '../utils/dateUtils';

interface ReplanDayModalProps {
  isOpen: boolean;
  firstName: string;
  replan: ReplanResult | null;
  isLoading: boolean;
  tasks: Task[];
  remainingHours: number;
  onChangeRemainingHours: (hours: number) => void;
  onRegenerate: () => void;
  onClose: () => void;
  onApplySuggestion: (
    taskId: string,
    updates: { deadline?: string; priority?: TaskPriority; reasonNote?: string }
  ) => void;
  onApplyAll: (
    updates: { taskId: string; deadline?: string; priority?: TaskPriority; reasonNote?: string }[]
  ) => void;
}

export const ReplanDayModal: React.FC<ReplanDayModalProps> = ({
  isOpen,
  firstName,
  replan,
  isLoading,
  tasks,
  remainingHours,
  onChangeRemainingHours,
  onRegenerate,
  onClose,
  onApplySuggestion,
  onApplyAll,
}) => {
  const today = toLocalDateKey();
  const [editedDates, setEditedDates] = useState<Record<string, string>>({});
  const [reasonNote, setReasonNote] = useState('');
  const [handledIds, setHandledIds] = useState<Record<string, 'accepted' | 'rejected'>>({});

  useEffect(() => {
    if (!isOpen || !replan) return;
    const initDates: Record<string, string> = {};
    for (const sug of replan.suggestions) {
      if (sug.suggestedDeadline) initDates[sug.id] = sug.suggestedDeadline;
    }
    setEditedDates(initDates);
    setHandledIds({});
    setReasonNote('');
  }, [isOpen, replan]);

  if (!isOpen) return null;

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const nextUpTask = replan?.nextUpTaskId ? taskMap.get(replan.nextUpTaskId) : undefined;

  const actionableSuggestions: ReplanSuggestion[] = (replan?.suggestions ?? []).filter(
    (s) => s.type !== 'keep_focus' && !handledIds[s.id]
  );

  const handleAcceptOne = (sug: ReplanSuggestion) => {
    const chosenDate = editedDates[sug.id] || sug.suggestedDeadline;
    onApplySuggestion(sug.taskId, {
      deadline: sug.type === 'move_date' || chosenDate ? chosenDate : undefined,
      priority: sug.type === 'deprioritise' ? sug.suggestedPriority : undefined,
      reasonNote: reasonNote.trim() || undefined,
    });
    setHandledIds((prev) => ({ ...prev, [sug.id]: 'accepted' }));
  };

  const handleRejectOne = (sugId: string) => {
    setHandledIds((prev) => ({ ...prev, [sugId]: 'rejected' }));
  };

  const handleAcceptAll = () => {
    const batch = actionableSuggestions.map((sug) => ({
      taskId: sug.taskId,
      deadline: editedDates[sug.id] || sug.suggestedDeadline,
      priority: sug.type === 'deprioritise' ? sug.suggestedPriority : undefined,
      reasonNote: reasonNote.trim() || undefined,
    }));
    onApplyAll(batch);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replan-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-[#E5DFF2] pb-3">
          <div>
            <h2 id="replan-modal-title" className="text-lg font-semibold text-[#1E1B2E]">
              Replan My Day
            </h2>
            <p className="mt-0.5 text-xs text-[#5B5570]">
              {firstName
                ? `${firstName}, here's what realistically fits into your day.`
                : "Here's what realistically fits into your day."}{' '}
              ({replan?.source === 'gemini' ? 'Gemini AI' : 'Smart local analysis'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close replan modal"
            className="flex h-10 w-10 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Remaining Hours Control */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F5FC] p-3">
          <div className="flex items-center gap-3">
            <label htmlFor="replan-hours-input" className="text-xs font-medium text-[#1E1B2E]">
              Time remaining today:
            </label>
            <input
              id="replan-hours-input"
              type="number"
              min={0.5}
              max={14}
              step={0.5}
              value={remainingHours}
              onChange={(e) => onChangeRemainingHours(Math.max(0.5, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-[#E5DFF2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
            />
            <span className="text-xs text-[#5B5570]">hours</span>
          </div>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white border border-[#E5DFF2] px-3 text-xs font-medium text-[#6D4AFF] hover:bg-[#F1ECFA] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Recalculate'}</span>
          </button>
        </div>

        {replan && (
          <div className="mt-4 space-y-4">
            {/* Overload Assessment */}
            <div
              className={`rounded-xl border px-3.5 py-3 ${
                replan.isOverloaded
                  ? 'border-[#FED7AA] bg-[#FFF7ED]'
                  : 'border-[#BBF7D0] bg-[#F0FDF4]'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                {replan.isOverloaded && <AlertTriangle className="h-4 w-4 text-[#C2410C]" />}
                <span className={replan.isOverloaded ? 'text-[#C2410C]' : 'text-[#15803D]'}>
                  {replan.isOverloaded ? 'Overloaded for remaining hours' : 'Realistic workload'}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#1E1B2E]">{replan.summary}</p>
              <p className="mt-1 text-xs text-[#5B5570]">{replan.overloadExplanation}</p>
            </div>

            {/* Next Up */}
            {nextUpTask && (
              <div className="rounded-xl border border-[#DDD6FE] bg-[#F3EFFF] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5B38EE]">
                  Do next
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#1E1B2E]">
                  {nextUpTask.title}{' '}
                  <span className="font-normal text-[#5B5570] tabular-nums">
                    ({formatDuration(nextUpTask.estimatedMinutes)})
                  </span>
                </p>
                {replan.nextUpReason && (
                  <p className="mt-1 text-xs text-[#4C2F96]">{replan.nextUpReason}</p>
                )}
              </div>
            )}

            {/* Reason for change */}
            {actionableSuggestions.length > 0 && (
              <div>
                <label htmlFor="replan-reason-input" className="block text-xs font-medium text-[#5B5570]">
                  Optional reason for schedule change (saved in task notes)
                </label>
                <input
                  id="replan-reason-input"
                  type="text"
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="e.g., Shifted to prioritise tomorrow's interview prep"
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 py-2 text-xs text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
                />
              </div>
            )}

            {/* Suggestions List */}
            <div className="space-y-2.5">
              {replan.suggestions.map((sug) => {
                const task = taskMap.get(sug.taskId);
                if (!task) return null;
                const status = handledIds[sug.id];

                if (sug.type === 'keep_focus') {
                  return (
                    <div
                      key={sug.id}
                      className="rounded-xl border border-[#E5DFF2] bg-white px-3.5 py-2.5"
                    >
                      <p className="text-sm font-medium text-[#1E1B2E]">Keep today: {task.title}</p>
                      <p className="mt-0.5 text-xs text-[#5B5570]">{sug.reason}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={sug.id}
                    className={`rounded-xl border p-3.5 transition-opacity ${
                      status ? 'border-[#E5DFF2] bg-[#FAF9FE] opacity-60' : 'border-[#DDD6FE] bg-[#FAF9FE]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1E1B2E]">{task.title}</p>
                        <p className="mt-0.5 text-xs text-[#5B5570] tabular-nums">
                          Currently {formatFriendlyDateTime(task.deadline, task.deadlineTime, today)} · {task.priority} · {formatDuration(task.estimatedMinutes)}
                        </p>
                      </div>
                      {status && (
                        <span className="text-xs font-semibold text-[#6D4AFF]">
                          {status === 'accepted' ? 'Applied' : 'Kept as is'}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs text-[#5B5570]">{sug.reason}</p>

                    {!status && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {(sug.type === 'move_date' || sug.suggestedDeadline) && (
                            <input
                              type="date"
                              aria-label={`Suggested date for ${task.title}`}
                              value={editedDates[sug.id] || sug.suggestedDeadline || today}
                              onChange={(e) =>
                                setEditedDates((prev) => ({ ...prev, [sug.id]: e.target.value }))
                              }
                              className="rounded-lg border border-[#E5DFF2] bg-white px-2.5 py-1.5 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
                            />
                          )}
                          {sug.type === 'deprioritise' && sug.suggestedPriority && (
                            <span className="text-xs font-medium text-[#5B5570]">
                              Priority → {sug.suggestedPriority}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAcceptOne(sug)}
                            className="flex min-h-[36px] items-center gap-1 rounded-lg bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE]"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectOne(sug.id)}
                            className="flex min-h-[36px] items-center gap-1 rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E5DFF2] pt-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
              >
                Done
              </button>
              {actionableSuggestions.length > 0 && (
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B38EE]"
                >
                  Accept entire suggested plan
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
