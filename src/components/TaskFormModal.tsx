import React, { useEffect, useState } from 'react';
import { Bell, Clock, Link2, Mail, X } from 'lucide-react';
import { Task, TaskCategory, TaskPriority, TaskReminderTiming } from '../types/nextup';
import { addDaysToDateKey, formatTime12h, toLocalDateKey } from '../utils/dateUtils';
import { CATEGORY_COLOR } from '../utils/semanticColors';
import { CategoryIcon } from '../utils/taskIcons';

interface TaskFormModalProps {
  isOpen: boolean;
  initialTask?: Task | null;
  availableDependencies?: Task[];
  defaultDate?: string;
  emailSetupReady: boolean;
  emailRemindersOptIn: boolean;
  verifiedEmail?: string | null;
  onSendReminderNow?: (task: Task) => void;
  onClose: () => void;
  onSave: (
    data: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>,
    existingId?: string
  ) => void;
}

const CATEGORIES: TaskCategory[] = ['College', 'Career', 'Personal', 'Other'];
const PRIORITIES: TaskPriority[] = ['Must Do', 'Should Do', 'Can Wait'];
const TIME_PRESETS = [15, 30, 45, 60, 90, 120];

const REMINDER_OPTIONS: { value: TaskReminderTiming; label: string }[] = [
  { value: 'at_deadline', label: 'At the deadline' },
  { value: '1_hour_before', label: '1 hour before' },
  { value: '1_day_before', label: '1 day before' },
  { value: 'custom', label: 'Custom reminder time' },
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  initialTask,
  availableDependencies = [],
  defaultDate,
  emailSetupReady,
  emailRemindersOptIn,
  verifiedEmail,
  onSendReminderNow,
  onClose,
  onSave,
}) => {
  const today = toLocalDateKey();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('College');
  const [deadline, setDeadline] = useState(defaultDate || today);
  const [includeTime, setIncludeTime] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [priority, setPriority] = useState<TaskPriority>('Should Do');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [showDependencies, setShowDependencies] = useState(false);
  const [emailReminderEnabled, setEmailReminderEnabled] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<TaskReminderTiming>('1_hour_before');
  const [customReminderDate, setCustomReminderDate] = useState(defaultDate || today);
  const [customReminderTime, setCustomReminderTime] = useState('09:00');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(initialTask.category);
      setDeadline(initialTask.deadline);
      setIncludeTime(Boolean(initialTask.deadlineTime));
      setDeadlineTime(initialTask.deadlineTime || '17:00');
      setPriority(initialTask.priority);
      setEstimatedMinutes(initialTask.estimatedMinutes);
      setNotes(initialTask.notes ?? '');
      setDependencies(initialTask.dependencies ?? []);
      setShowDependencies(Boolean(initialTask.dependencies?.length));
      setEmailReminderEnabled(Boolean(initialTask.emailReminderEnabled));
      setReminderTiming(initialTask.reminderTiming ?? '1_hour_before');
      setCustomReminderDate(initialTask.customReminderDate || initialTask.deadline);
      setCustomReminderTime(initialTask.customReminderTime || '09:00');
    } else {
      setTitle('');
      setCategory('College');
      setDeadline(defaultDate || today);
      setIncludeTime(false);
      setDeadlineTime('17:00');
      setPriority('Should Do');
      setEstimatedMinutes(30);
      setNotes('');
      setDependencies([]);
      setShowDependencies(false);
      setEmailReminderEnabled(false);
      setReminderTiming('1_hour_before');
      setCustomReminderDate(defaultDate || today);
      setCustomReminderTime('09:00');
    }
    setError('');
  }, [isOpen, initialTask, defaultDate, today]);

  if (!isOpen) return null;

  const candidateDeps = availableDependencies.filter(
    (t) => !t.completed && t.id !== initialTask?.id
  );

  const toggleDependency = (depId: string) => {
    setDependencies((prev) =>
      prev.includes(depId) ? prev.filter((id) => id !== depId) : [...prev, depId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a task title.');
      return;
    }
    if (!deadline) {
      setError('Please select a deadline date.');
      return;
    }

    if (emailReminderEnabled && reminderTiming === 'custom' && !customReminderDate) {
      setError('Please select a custom reminder date.');
      return;
    }

    onSave(
      {
        title: trimmed,
        category,
        deadline,
        deadlineTime: includeTime && deadlineTime ? deadlineTime : undefined,
        priority,
        estimatedMinutes: Math.max(5, Number(estimatedMinutes) || 30),
        notes: notes.trim() || undefined,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        takingLonger: initialTask?.takingLonger,
        emailReminderEnabled,
        reminderTiming: emailReminderEnabled ? reminderTiming : undefined,
        customReminderDate:
          emailReminderEnabled && reminderTiming === 'custom' ? customReminderDate : undefined,
        customReminderTime:
          emailReminderEnabled && reminderTiming === 'custom' ? customReminderTime : undefined,
        lastReminderSentKey: initialTask?.lastReminderSentKey,
        lastReminderSentAt: initialTask?.lastReminderSentAt,
      },
      initialTask?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-center justify-between border-b border-[#E5DFF2] pb-3">
          <h2 id="task-modal-title" className="text-lg font-semibold text-[#1E1B2E]">
            {initialTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task form"
            className="flex h-11 w-11 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="task-title-input" className="block text-sm font-medium text-[#1E1B2E]">
              Task title
            </label>
            <input
              id="task-title-input"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Submit economics assignment"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2.5 text-[15px] text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            />
            {error && <p className="mt-1 text-xs font-medium text-[#B91C1C]">{error}</p>}
          </div>

          {/* Colour-Coded Categories */}
          <div>
            <span className="block text-sm font-medium text-[#1E1B2E]">Category</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 rounded-xl bg-[#F1ECFA] p-1">
              {CATEGORIES.map((cat) => {
                const style = CATEGORY_COLOR[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? `bg-white ${style.text} shadow-xs`
                        : 'text-[#5B5570] hover:text-[#1E1B2E]'
                    }`}
                  >
                    <CategoryIcon category={cat} className={`h-3.5 w-3.5 shrink-0 ${style.text}`} />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Only vs Date + Optional Exact Time */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="task-deadline-input" className="block text-sm font-medium text-[#1E1B2E]">
                Deadline
              </label>
              <div className="inline-flex rounded-lg bg-[#F1ECFA] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIncludeTime(false)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    !includeTime ? 'bg-white text-[#1E1B2E] shadow-xs' : 'text-[#5B5570]'
                  }`}
                >
                  Date only
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeTime(true)}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    includeTime ? 'bg-white text-[#6D4AFF] shadow-xs' : 'text-[#5B5570]'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  Date & time
                </button>
              </div>
            </div>

            <div className={`grid gap-2.5 ${includeTime ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <input
                id="task-deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
              {includeTime && (
                <div>
                  <input
                    id="task-time-input"
                    type="time"
                    aria-label="Deadline time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Today', key: today },
                  { label: 'Tomorrow', key: addDaysToDateKey(today, 1) },
                  { label: 'Next week', key: addDaysToDateKey(today, 7) },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDeadline(preset.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      deadline === preset.key
                        ? 'bg-[#EDE9FE] text-[#4C2F96]'
                        : 'bg-[#F7F5FC] text-[#5B5570] hover:bg-[#F1ECFA]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {includeTime && deadlineTime && (
                <span className="text-xs font-medium text-[#6D4AFF] tabular-nums">
                  {formatTime12h(deadlineTime)}
                </span>
              )}
            </div>
          </div>

          {/* Priority */}
          <div>
            <span className="block text-sm font-medium text-[#1E1B2E]">Priority</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-[#F1ECFA] p-1">
              {PRIORITIES.map((p) => {
                const active = priority === p;
                const activeColor =
                  p === 'Must Do'
                    ? 'text-[#C2410C]'
                    : p === 'Should Do'
                      ? 'text-[#5B38EE]'
                      : 'text-[#5B5570]';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`min-h-[40px] rounded-lg px-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      active ? `bg-white ${activeColor} shadow-xs` : 'text-[#5B5570] hover:text-[#1E1B2E]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="task-minutes-input" className="block text-sm font-medium text-[#1E1B2E]">
                Estimated time (minutes)
              </label>
              <span className="text-xs text-[#5B5570] tabular-nums">{estimatedMinutes} min</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {TIME_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedMinutes(mins)}
                  className={`min-h-[38px] rounded-lg px-3 text-xs font-medium tabular-nums transition-colors ${
                    estimatedMinutes === mins
                      ? 'bg-[#6D4AFF] text-white'
                      : 'bg-[#F1ECFA] text-[#5B5570] hover:text-[#1E1B2E]'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
              <input
                id="task-minutes-input"
                type="number"
                min={5}
                max={480}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-20 min-h-[38px] rounded-lg border border-[#E5DFF2] bg-[#FAF9FE] px-2.5 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Task Dependencies */}
          {candidateDeps.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDependencies((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6D4AFF] hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>
                  {showDependencies
                    ? 'Hide task dependencies'
                    : `Add task dependencies (${dependencies.length} selected)`}
                </span>
              </button>

              {showDependencies && (
                <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-2 space-y-1">
                  <p className="px-1.5 py-0.5 text-[11px] text-[#5B5570]">
                    Select tasks that must be finished before this one:
                  </p>
                  {candidateDeps.map((dep) => {
                    const checked = dependencies.includes(dep.id);
                    return (
                      <label
                        key={dep.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-[#1E1B2E] hover:bg-[#F1ECFA]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDependency(dep.id)}
                          className="h-4 w-4 rounded accent-[#6D4AFF]"
                        />
                        <span className="truncate">{dep.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Email Reminder Options */}
          <div className="rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="task-email-reminder-toggle"
                className="flex items-center gap-2 text-sm font-medium text-[#1E1B2E] cursor-pointer"
              >
                <Bell className="h-4 w-4 text-[#6D4AFF]" />
                <span>Send email reminder</span>
              </label>
              <input
                id="task-email-reminder-toggle"
                type="checkbox"
                checked={emailReminderEnabled}
                onChange={(e) => setEmailReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[#6D4AFF]"
              />
            </div>

            {emailReminderEnabled && (
              <div className="space-y-2.5 border-t border-[#EDE9F6] pt-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {REMINDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReminderTiming(opt.value)}
                      className={`min-h-[36px] rounded-lg px-2.5 text-xs font-medium transition-colors text-left ${
                        reminderTiming === opt.value
                          ? 'bg-[#6D4AFF] text-white'
                          : 'bg-white border border-[#E5DFF2] text-[#5B5570] hover:text-[#1E1B2E]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {reminderTiming === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      aria-label="Custom reminder date"
                      value={customReminderDate}
                      onChange={(e) => setCustomReminderDate(e.target.value)}
                      className="min-h-[40px] rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
                    />
                    <input
                      type="time"
                      aria-label="Custom reminder time"
                      value={customReminderTime}
                      onChange={(e) => setCustomReminderTime(e.target.value)}
                      className="min-h-[40px] rounded-lg border border-[#E5DFF2] bg-white px-2.5 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 text-[11px]">
                  <div className="flex items-start gap-1.5 text-[#5B5570]">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D4AFF]" />
                    {!emailSetupReady ? (
                      <span className="text-[#C2410C] font-medium">
                        Email reminders setup required — connect Google with Gmail permission in Integrations.
                      </span>
                    ) : !emailRemindersOptIn ? (
                      <span className="text-[#C2410C] font-medium">
                        Opt in to Email reminders in Personalise to send to {verifiedEmail}.
                      </span>
                    ) : (
                      <span>
                        Will notify <strong className="text-[#1E1B2E]">{verifiedEmail}</strong> (no duplicates).
                      </span>
                    )}
                  </div>

                  {initialTask && emailSetupReady && emailRemindersOptIn && onSendReminderNow && (
                    <button
                      type="button"
                      onClick={() => onSendReminderNow(initialTask)}
                      className="shrink-0 font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
                    >
                      Send now
                    </button>
                  )}
                </div>

                {initialTask?.lastReminderSentAt && (
                  <p className="text-[11px] text-[#15803D]">
                    Last reminder sent on{' '}
                    {new Date(initialTask.lastReminderSentAt).toLocaleString()}.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="task-notes-input" className="block text-sm font-medium text-[#1E1B2E]">
              Notes <span className="font-normal text-[#7C7594]">(optional)</span>
            </label>
            <textarea
              id="task-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Links, rubric reminders, or helpful context..."
              className="mt-1.5 w-full rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2.5 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors"
            >
              {initialTask ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
