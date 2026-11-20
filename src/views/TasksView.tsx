import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { TaskRow } from '../components/TaskRow';
import { isSampleTask } from '../services/storage';
import { Task, TaskCategory, TaskPriority, TaskViewFilter } from '../types/nextup';
import {
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDateTime,
  isTaskOverdue,
  toLocalDateKey,
} from '../utils/dateUtils';
import { parseNaturalLanguageTask, parseTaskWithAI } from '../utils/nlTaskParser';
import { CATEGORY_COLOR, PRIORITY_COLOR } from '../utils/semanticColors';
import { CategoryIcon } from '../utils/taskIcons';

type TaskSortOption = 'deadline' | 'priority' | 'duration' | 'category';

interface TasksViewProps {
  tasks: Task[];
  activeFilter: TaskViewFilter;
  onChangeFilter: (filter: TaskViewFilter) => void;
  onQuickAddTask: (
    title: string,
    category: TaskCategory,
    priority: TaskPriority,
    deadline: string,
    deadlineTime?: string,
    estimatedMinutes?: number
  ) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onRescheduleToday: (id: string) => void;
  onClearSampleTasks: () => void;
}

const VIEW_TABS: {
  key: TaskViewFilter;
  label: string;
  icon: typeof ListTodo;
  iconColor: string;
}[] = [
  { key: 'today', label: 'Today', icon: ListTodo, iconColor: 'text-[#6D4AFF]' },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarDays, iconColor: 'text-[#2563EB]' },
  { key: 'overdue', label: 'Overdue', icon: AlertCircle, iconColor: 'text-[#DC2626]' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, iconColor: 'text-[#16A34A]' },
];

const CATEGORIES: ('All' | TaskCategory)[] = ['All', 'College', 'Career', 'Personal', 'Other'];
const QUICK_CATEGORIES: TaskCategory[] = ['College', 'Career', 'Personal', 'Other'];
const QUICK_PRIORITIES: TaskPriority[] = ['Must Do', 'Should Do', 'Can Wait'];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  activeFilter,
  onChangeFilter,
  onQuickAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onRescheduleToday,
  onClearSampleTasks,
}) => {
  const today = toLocalDateKey();
  const [categoryFilter, setCategoryFilter] = useState<'All' | TaskCategory>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [sortBy, setSortBy] = useState<TaskSortOption>('deadline');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Capture state centralized here
  const [quickInput, setQuickInput] = useState('');
  const [overrideCategory, setOverrideCategory] = useState<TaskCategory | null>(null);
  const [overridePriority, setOverridePriority] = useState<TaskPriority | null>(null);
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [isSmartParsing, setIsSmartParsing] = useState(false);

  const livePreview = useMemo(() => {
    if (!quickInput.trim()) return null;
    const base = parseNaturalLanguageTask(quickInput);
    return {
      ...base,
      category: overrideCategory ?? base.category,
      priority: overridePriority ?? base.priority,
    };
  }, [quickInput, overrideCategory, overridePriority]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livePreview || !quickInput.trim()) return;
    onQuickAddTask(
      livePreview.title,
      livePreview.category,
      livePreview.priority,
      livePreview.deadline,
      livePreview.deadlineTime,
      livePreview.estimatedMinutes
    );
    setQuickInput('');
    setOverrideCategory(null);
    setOverridePriority(null);
    setShowQuickOptions(false);
  };

  const handleSmartAIParseAndAdd = async () => {
    if (!quickInput.trim()) return;
    setIsSmartParsing(true);
    const { parsed } = await parseTaskWithAI(quickInput);
    onQuickAddTask(
      parsed.title,
      overrideCategory ?? parsed.category,
      overridePriority ?? parsed.priority,
      parsed.deadline,
      parsed.deadlineTime,
      parsed.estimatedMinutes
    );
    setIsSmartParsing(false);
    setQuickInput('');
    setOverrideCategory(null);
    setOverridePriority(null);
    setShowQuickOptions(false);
  };

  const sampleCount = useMemo(() => tasks.filter(isSampleTask).length, [tasks]);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      today: tasks.filter((t) => !t.completed && t.deadline === today && !isTaskOverdue(t, now)).length,
      upcoming: tasks.filter((t) => !t.completed && t.deadline > today).length,
      overdue: tasks.filter((t) => isTaskOverdue(t, now)).length,
      completed: tasks.filter((t) => t.completed).length,
    };
  }, [tasks, today]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();
    const prioOrder: Record<TaskPriority, number> = {
      'Must Do': 0,
      'Should Do': 1,
      'Can Wait': 2,
    };

    return tasks
      .filter((t) => {
        if (activeFilter === 'today') return !t.completed && t.deadline === today && !isTaskOverdue(t, now);
        if (activeFilter === 'upcoming') return !t.completed && t.deadline > today;
        if (activeFilter === 'overdue') return isTaskOverdue(t, now);
        return t.completed;
      })
      .filter((t) => (categoryFilter === 'All' ? true : t.category === categoryFilter))
      .filter((t) => (priorityFilter === 'All' ? true : t.priority === priorityFilter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (activeFilter === 'completed') {
          return (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt);
        }
        if (sortBy === 'priority') {
          const pCmp = prioOrder[a.priority] - prioOrder[b.priority];
          if (pCmp !== 0) return pCmp;
          return compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime);
        }
        if (sortBy === 'duration') {
          const dCmp = (a.estimatedMinutes || 0) - (b.estimatedMinutes || 0);
          if (dCmp !== 0) return dCmp;
          return compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime);
        }
        if (sortBy === 'category') {
          const cCmp = a.category.localeCompare(b.category);
          if (cCmp !== 0) return cCmp;
          return compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime);
        }
        // Default: deadline (earliest first)
        const dateTimeCmp = compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime);
        if (dateTimeCmp !== 0) return dateTimeCmp;
        return prioOrder[a.priority] - prioOrder[b.priority];
      });
  }, [tasks, activeFilter, categoryFilter, priorityFilter, sortBy, searchQuery, today]);

  const emptyMessage: Record<TaskViewFilter, { title: string; subtitle: string }> = {
    today: {
      title: 'Nothing due today',
      subtitle: 'Capture a task above or check your upcoming schedule.',
    },
    upcoming: {
      title: 'No upcoming tasks scheduled',
      subtitle: 'Add future assignments, interview prep sessions, or errands.',
    },
    overdue: {
      title: 'Zero overdue tasks',
      subtitle: 'Nice work — you are completely caught up on past deadlines.',
    },
    completed: {
      title: 'No completed tasks yet',
      subtitle: 'Checked-off tasks will appear here so you can track your momentum.',
    },
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
          <ListTodo className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B2E]">My Tasks</h1>
          <p className="mt-0.5 text-sm text-[#5B5570]">
            Add, organise, prioritise, and track every deadline in one workspace.
          </p>
        </div>
      </div>

      {/* Centralized Quick Capture */}
      <section className="rounded-2xl border border-[#DDD6FE] bg-gradient-to-r from-[#FAF8FF] to-[#F3EFFF]/65 p-3.5 sm:p-4 shadow-2xs">
        <form onSubmit={handleQuickSubmit}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onFocus={() => setShowQuickOptions(true)}
              placeholder='Quick add: "Submit economics assignment tomorrow at 5 PM"'
              aria-label="Quick add task"
              className="min-h-[44px] flex-1 rounded-xl border border-[#E5DFF2] bg-white px-3.5 py-2.5 text-[15px] text-[#1E1B2E] placeholder:text-[#7C7594] focus:border-[#6D4AFF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!quickInput.trim() || isSmartParsing}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[#C9B9F9] bg-[#EDE9FE] px-4 py-2.5 text-sm font-semibold text-[#4C2F96] hover:bg-[#DDD6FE] disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4 text-[#6D4AFF]" />
              <span>Quick Add</span>
            </button>
          </div>

          {livePreview && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#1E1B2E] tabular-nums">
                <span className="font-semibold text-[#6D4AFF]">Detected:</span>
                <span className="font-medium">{livePreview.title}</span>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className={`inline-flex items-center gap-1 font-medium ${CATEGORY_COLOR[livePreview.category].text}`}>
                  <CategoryIcon category={livePreview.category} className="h-3.5 w-3.5 shrink-0" />
                  <span>{livePreview.category}</span>
                </span>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className="inline-flex items-center gap-1 text-[#5B5570]">
                  {livePreview.deadlineTime && <Clock className="h-3 w-3 text-[#6D4AFF]" />}
                  {formatFriendlyDateTime(livePreview.deadline, livePreview.deadlineTime, today)}
                </span>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className={`font-medium ${PRIORITY_COLOR[livePreview.priority].text}`}>
                  {livePreview.priority}
                </span>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className="text-[#5B5570]">{formatDuration(livePreview.estimatedMinutes)}</span>
              </div>

              <button
                type="button"
                onClick={handleSmartAIParseAndAdd}
                disabled={isSmartParsing}
                className="inline-flex items-center gap-1 font-medium text-[#6D4AFF] hover:underline whitespace-nowrap"
              >
                <Sparkles className="h-3 w-3" />
                <span>{isSmartParsing ? 'Parsing...' : 'AI Parse & Add'}</span>
              </button>
            </div>
          )}

          {showQuickOptions && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5DFF2] pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_CATEGORIES.map((cat) => {
                  const active = (overrideCategory ?? livePreview?.category) === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setOverrideCategory(overrideCategory === cat ? null : cat)}
                      className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                        active
                          ? `${CATEGORY_COLOR[cat].softBg} ${CATEGORY_COLOR[cat].text} border ${CATEGORY_COLOR[cat].border}`
                          : 'bg-white border border-[#E5DFF2] text-[#5B5570] hover:text-[#1E1B2E]'
                      }`}
                    >
                      <CategoryIcon
                        category={cat}
                        className={`h-3.5 w-3.5 shrink-0 ${CATEGORY_COLOR[cat].text}`}
                      />
                      <span>{cat}</span>
                    </button>
                  );
                })}
                <span aria-hidden="true" className="mx-1 text-[#D8D0EB]">|</span>
                {QUICK_PRIORITIES.map((prio) => {
                  const active = (overridePriority ?? livePreview?.priority) === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setOverridePriority(overridePriority === prio ? null : prio)}
                      className={`min-h-[34px] rounded-lg px-2.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#6D4AFF] text-white'
                          : 'bg-white border border-[#E5DFF2] text-[#5B5570] hover:text-[#1E1B2E]'
                      }`}
                    >
                      {prio}
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-[#7C7594]">
                Use Add Task in the top bar for specific times, notes, or dependencies.
              </span>
            </div>
          )}
        </form>
      </section>

      {/* Primary View Tabs */}
      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-[#D4C8F2] bg-[#E8E0F7] p-1">
        {VIEW_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key];
          const activeColor =
            tab.key === 'overdue'
              ? 'text-[#DC2626]'
              : tab.key === 'completed'
                ? 'text-[#16A34A]'
                : tab.key === 'upcoming'
                  ? 'text-[#2563EB]'
                  : 'text-[#6D4AFF]';

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeFilter(tab.key)}
              className={`inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:text-sm whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#1E1B2E] shadow-xs'
                  : 'text-[#5B5570] hover:text-[#1E1B2E]'
              }`}
            >
              <TabIcon
                className={`h-3.5 w-3.5 shrink-0 hidden sm:inline ${
                  isActive ? tab.iconColor : 'text-[#7C7594]'
                }`}
                aria-hidden="true"
              />
              <span>{tab.label}</span>
              <span
                className={`tabular-nums text-xs font-semibold ${
                  isActive
                    ? activeColor
                    : tab.key === 'overdue' && count > 0
                      ? 'text-[#DC2626]'
                      : 'text-[#7C7594] font-medium'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters, Search & Sort Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5DFF2] bg-white p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#6D4AFF] text-white'
                      : 'bg-[#FAF8FF] border border-[#E5DFF2] text-[#5B5570] hover:text-[#1E1B2E]'
                  }`}
                >
                  {cat !== 'All' && (
                    <CategoryIcon
                      category={cat}
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? 'text-white' : CATEGORY_COLOR[cat].text
                      }`}
                    />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Search, Priority Filter & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] sm:w-52 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C7594]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                className="min-h-[40px] w-full rounded-xl border border-[#E5DFF2] bg-[#FAF8FF] pl-9 pr-3 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>

            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'All' | TaskPriority)}
              className="min-h-[40px] rounded-xl border border-[#E5DFF2] bg-[#FAF8FF] px-3 text-xs font-medium text-[#1E1B2E] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            >
              <option value="All">All priorities</option>
              <option value="Must Do">Must Do</option>
              <option value="Should Do">Should Do</option>
              <option value="Can Wait">Can Wait</option>
            </select>

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF8FF] px-2.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#6D4AFF]" aria-hidden="true" />
              <select
                aria-label="Sort tasks"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TaskSortOption)}
                className="min-h-[40px] bg-transparent pr-1 text-xs font-medium text-[#1E1B2E] focus:outline-none"
              >
                <option value="deadline">Sort: Deadline</option>
                <option value="priority">Sort: Priority</option>
                <option value="duration">Sort: Shortest time</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {sampleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5DFF2] bg-[#FAF8FF] px-4 py-2.5 text-xs text-[#5B5570]">
          <span>
            Starter sample tasks ({sampleCount}) are marked{' '}
            <strong className="font-semibold text-[#1E1B2E]">Sample</strong> so you can tell them apart from your own.
          </span>
          <button
            type="button"
            onClick={onClearSampleTasks}
            className="font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
          >
            Clear sample tasks
          </button>
        </div>
      )}

      {/* Task List Card */}
      <div className="rounded-2xl border border-[#DFD7F2] bg-white overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <CheckCircle2 className="h-9 w-9 text-[#C4B5FD]" />
            <h2 className="mt-3 text-base font-semibold text-[#1E1B2E]">
              {searchQuery || categoryFilter !== 'All' || priorityFilter !== 'All'
                ? 'No matching tasks'
                : emptyMessage[activeFilter].title}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-[#5B5570]">
              {searchQuery || categoryFilter !== 'All' || priorityFilter !== 'All'
                ? 'Try clearing your search or switching category/priority filters.'
                : emptyMessage[activeFilter].subtitle}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EDE8F7]">
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                allTasks={tasks}
                onToggleComplete={onToggleTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onRescheduleToday={onRescheduleToday}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
