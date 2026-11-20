import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  ListTodo,
  Moon,
  Plus,
  Send,
  SlidersHorizontal,
  Sun,
  SunMedium,
  SunMoon,
} from 'lucide-react';
import { CareerCenterSection } from '../components/CareerCenterSection';
import { MorningBriefingSection } from '../components/MorningBriefingSection';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { isSampleTask } from '../services/storage';
import { CalendarEventItem } from '../services/workspaceApis';
import {
  AIDailyPlan,
  ApplicationViewFilter,
  BriefingType,
  CareerFocusCategory,
  CareerInsightsPlan,
  JobApplication,
  NavTab,
  OverloadedDayWarning,
  StudentProfile,
  Task,
  TaskCategory,
  TaskPriority,
  TaskViewFilter,
  WorkloadMetrics,
} from '../types/nextup';
import {
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDateTime,
  formatHeaderDate,
  getGreetingForHour,
  getLocalHourInTimeZone,
  isTaskOverdue,
  toLocalDateKey,
} from '../utils/dateUtils';
import { parseNaturalLanguageTask } from '../utils/nlTaskParser';
import { CATEGORY_COLOR, PRIORITY_COLOR } from '../utils/semanticColors';
import { CategoryIcon, TaskContextIcon } from '../utils/taskIcons';

interface DashboardViewProps {
  profile: StudentProfile;
  tasks: Task[];
  applications: JobApplication[];
  overloadedDays: OverloadedDayWarning[];
  followUpsDueToday: JobApplication[];
  followUpsOverdue: JobApplication[];
  workloadMetrics: WorkloadMetrics;
  aiDailyPlan: AIDailyPlan;
  briefingMode: BriefingType;
  onChangeBriefingMode: (mode: BriefingType) => void;
  isPlanningAI: boolean;
  calendarConnected: boolean;
  calendarEvents: CalendarEventItem[];
  calendarBusyMinutes: number;
  firstName: string;
  emailSetupReady: boolean;
  planAcceptedToday: boolean;
  onToggleTask: (id: string) => void;
  onQuickAddTask: (
    title: string,
    category: TaskCategory,
    priority: TaskPriority,
    deadline: string,
    deadlineTime?: string,
    estimatedMinutes?: number
  ) => void;
  onEditTask: (task: Task) => void;
  onAcceptPlan: () => void;
  onOpenPreferences: () => void;
  onOpenReplan: () => void;
  onOpenMiddayCheckIn: () => void;
  onRefreshAIPlan: () => void;
  onApprovePostpone: (taskId: string, newDeadline: string) => void;
  onApproveDeprioritise: (taskId: string, newPriority: TaskPriority) => void;
  onDismissPlanSuggestion: (taskId: string, kind: 'postpone' | 'deprioritise') => void;
  careerFocus: CareerFocusCategory;
  customCareerFocus: string;
  careerInsights: CareerInsightsPlan;
  isLoadingCareerInsights: boolean;
  onSelectCareerFocus: (category: CareerFocusCategory) => void;
  onChangeCustomCareerFocus: (value: string) => void;
  onRefreshCareerInsights: () => void;
  onNavigateTab: (
    tab: NavTab,
    taskFilter?: TaskViewFilter,
    appFilter?: ApplicationViewFilter
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  tasks,
  applications,
  overloadedDays,
  followUpsDueToday,
  followUpsOverdue,
  workloadMetrics,
  aiDailyPlan,
  briefingMode,
  onChangeBriefingMode,
  isPlanningAI,
  calendarConnected,
  calendarEvents,
  calendarBusyMinutes,
  firstName,
  emailSetupReady,
  planAcceptedToday,
  onToggleTask,
  onQuickAddTask,
  onEditTask,
  onAcceptPlan,
  onOpenPreferences,
  onOpenReplan,
  onOpenMiddayCheckIn,
  onRefreshAIPlan,
  onApprovePostpone,
  onApproveDeprioritise,
  onDismissPlanSuggestion,
  careerFocus,
  customCareerFocus,
  careerInsights,
  isLoadingCareerInsights,
  onSelectCareerFocus,
  onChangeCustomCareerFocus,
  onRefreshCareerInsights,
  onNavigateTab,
}) => {
  const [currentHour, setCurrentHour] = useState(() =>
    getLocalHourInTimeZone(new Date(), profile.timezone)
  );
  const [quickTaskText, setQuickTaskText] = useState('');

  useEffect(() => {
    setCurrentHour(getLocalHourInTimeZone(new Date(), profile.timezone));
    const timer = window.setInterval(() => {
      const nextHour = getLocalHourInTimeZone(new Date(), profile.timezone);
      setCurrentHour((prev) => (prev === nextHour ? prev : nextHour));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [profile.timezone]);

  const today = toLocalDateKey();
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const { dueTodayTasks, upcomingTasks, overdueTasks, completedTasks } = useMemo(() => {
    const now = new Date();
    return {
      dueTodayTasks: tasks.filter((t) => !t.completed && t.deadline === today && !isTaskOverdue(t, now)),
      upcomingTasks: tasks
        .filter((t) => !t.completed && t.deadline > today)
        .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime)),
      overdueTasks: tasks.filter((t) => isTaskOverdue(t, now)),
      completedTasks: tasks.filter((t) => t.completed),
    };
  }, [tasks, today]);

  const focusTasks = useMemo(() => {
    const list: Task[] = [];
    for (const item of aiDailyPlan.topThree) {
      const t = taskMap.get(item.taskId);
      if (t) list.push(t);
      if (list.length === 3) break;
    }
    return list;
  }, [aiDailyPlan.topThree, taskMap]);

  const allFollowUpsDue = [...followUpsOverdue, ...followUpsDueToday];

  const appStats = useMemo(() => {
    const active = applications.filter((a) => a.status !== 'Rejected' && a.status !== 'Offer');
    const interviewsOrOA = applications.filter(
      (a) => a.status === 'Interview' || a.status === 'Assessment'
    );
    const offers = applications.filter((a) => a.status === 'Offer');
    return {
      total: applications.length,
      active: active.length,
      interviewsOrOA: interviewsOrOA.length,
      offers: offers.length,
    };
  }, [applications]);

  const quickTaskPreview = useMemo(() => {
    if (!quickTaskText.trim()) return null;
    return parseNaturalLanguageTask(quickTaskText);
  }, [quickTaskText]);

  const handleDashboardQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskPreview || !quickTaskText.trim()) return;
    onQuickAddTask(
      quickTaskPreview.title,
      quickTaskPreview.category,
      quickTaskPreview.priority,
      quickTaskPreview.deadline,
      quickTaskPreview.deadlineTime,
      quickTaskPreview.estimatedMinutes
    );
    setQuickTaskText('');
  };

  const upcomingPreview = upcomingTasks.slice(0, 3);
  const dynamicGreeting = getGreetingForHour(currentHour);
  const greetingEmoji = currentHour < 12 ? '☀️' : currentHour < 17 ? '🌤️' : '🌙';
  const TimeIcon = currentHour < 12 ? Sun : currentHour < 17 ? SunMedium : Moon;
  const timeIconColor =
    currentHour < 12 ? 'text-[#EA580C]' : currentHour < 17 ? 'text-[#D97706]' : 'text-[#5B38EE]';

  return (
    <div className="space-y-4">
      {/* Integrated Main Dashboard Header & Personalized Greeting */}
      <header className="flex flex-col gap-3 pt-0.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#6D4AFF]">
            <TimeIcon className={`h-4 w-4 ${timeIconColor}`} aria-hidden="true" />
            <span>{formatHeaderDate(new Date(), profile.timezone)}</span>
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#1E1B2E] sm:text-3xl text-balance">
            {firstName ? (
              <>
                {dynamicGreeting}, <span className="text-[#5B38EE]">{firstName}</span>!{' '}
                <span aria-hidden="true">{greetingEmoji}</span>
              </>
            ) : (
              <>
                {dynamicGreeting}! <span aria-hidden="true">{greetingEmoji}</span>
              </>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-[#5B5570]">
            {dueTodayTasks.length === 0 && overdueTasks.length === 0
              ? 'Your day looks clear — plan ahead or explore career opportunities below.'
              : 'Your daily command center — stay on top of priorities, deadlines, and your career search.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onOpenReplan}
            className="flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#C9B9F9] bg-gradient-to-r from-[#EDE9FE] to-[#F3EFFF] px-3.5 py-2 text-xs font-semibold text-[#4C2F96] hover:from-[#DDD6FE] hover:to-[#EDE9FE] transition-colors whitespace-nowrap"
          >
            <CalendarRange className="h-3.5 w-3.5 text-[#6D4AFF]" />
            <span>Replan My Day</span>
          </button>

          <button
            type="button"
            onClick={onOpenMiddayCheckIn}
            className="flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7F2] bg-white px-3 py-2 text-xs font-medium text-[#1E1B2E] hover:bg-[#F5F1FF] transition-colors whitespace-nowrap"
          >
            <SunMoon className="h-3.5 w-3.5 text-[#0D9488]" />
            <span>Check-in</span>
          </button>

          <button
            type="button"
            onClick={onOpenPreferences}
            aria-label="Personalise NextUp"
            className="flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7F2] bg-white px-3 py-2 text-xs font-medium text-[#5B5570] hover:text-[#1E1B2E] hover:bg-[#F5F1FF] transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#6D4AFF]" />
            <span>Personalise</span>
          </button>
        </div>
      </header>

      {/* Action-Focused Urgent Alert Banners */}
      {(overdueTasks.length > 0 || overloadedDays.length > 0) && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {overdueTasks.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-gradient-to-r from-[#FEF2F2] to-[#FFF5F5] px-4 py-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#991B1B]">
                    Past deadline — action needed
                  </p>
                  <p className="mt-0.5 text-xs text-[#B91C1C] truncate">
                    {overdueTasks[0].title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks', 'overdue')}
                className="min-h-[36px] shrink-0 cursor-pointer rounded-xl border border-[#FECACA] bg-white px-3 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2] transition-colors whitespace-nowrap"
              >
                Review
              </button>
            </div>
          )}

          {overloadedDays.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FED7AA] bg-gradient-to-r from-[#FFF7ED] to-[#FFFBF5] px-4 py-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#9A3412]">
                    Heavy day ahead: {overloadedDays[0].label}
                  </p>
                  <p className="mt-0.5 text-xs text-[#C2410C] tabular-nums">
                    {overloadedDays[0].taskCount} tasks · {formatDuration(overloadedDays[0].totalMinutes)} scheduled
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('upcoming')}
                className="min-h-[36px] shrink-0 cursor-pointer rounded-xl border border-[#FED7AA] bg-white px-3 text-xs font-semibold text-[#9A3412] hover:bg-[#FFEDD5] transition-colors whitespace-nowrap"
              >
                Open Calendar
              </button>
            </div>
          )}
        </section>
      )}

      {/* Full-Width 4-Tile Task Status Strip */}
      <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'today')}
          className="group cursor-pointer rounded-2xl border border-[#D4C8F2] bg-gradient-to-br from-[#F7F4FF] to-[#EDE9FE]/80 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#6D4AFF] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#4C2F96]">Due today</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#6D4AFF] shadow-2xs border border-[#E5DFF2]">
              <ListTodo className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[#6D4AFF] tabular-nums">
            {dueTodayTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'overdue')}
          className={`group cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-xs ${
            overdueTasks.length > 0
              ? 'border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2]/70 hover:border-[#DC2626]'
              : 'border-[#F3DCDC] bg-gradient-to-br from-[#FFF9F9] to-[#FEF2F2]/60 hover:border-[#FCA5A5]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#B91C1C]">Overdue</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#DC2626] shadow-2xs border border-[#FECACA]">
              <AlertCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[#DC2626] tabular-nums">
            {overdueTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'upcoming')}
          className="group cursor-pointer rounded-2xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]/70 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#1D4ED8]">Upcoming</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-2xs border border-[#BFDBFE]">
              <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[#2563EB] tabular-nums">
            {upcomingTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'completed')}
          className="group cursor-pointer rounded-2xl border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/70 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#15803D]">Completed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#16A34A] shadow-2xs border border-[#BBF7D0]">
              <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-[#16A34A] tabular-nums">
            {completedTasks.length}
          </p>
        </button>
      </section>

      {/* Main 2-Column Overview Bento */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: AI Morning Briefing + Today's Focus with Direct Inline Task Capture */}
        <div className="space-y-4 lg:col-span-7">
          <MorningBriefingSection
            firstName={firstName}
            timeZone={profile.timezone}
            briefingMode={briefingMode}
            onChangeBriefingMode={onChangeBriefingMode}
            tasks={tasks}
            applications={applications}
            plan={aiDailyPlan}
            workload={workloadMetrics}
            isPlanningAI={isPlanningAI}
            calendarConnected={calendarConnected}
            calendarEvents={calendarEvents}
            calendarBusyMinutes={calendarBusyMinutes}
            emailSetupReady={emailSetupReady}
            emailRemindersEnabled={profile.emailRemindersEnabled}
            morningBriefingEmailEnabled={profile.morningBriefingEmailEnabled}
            morningBriefingTime={profile.morningBriefingTime}
            planAcceptedToday={planAcceptedToday}
            onAcceptPlan={onAcceptPlan}
            onRefreshPlan={onRefreshAIPlan}
            onOpenPreferences={onOpenPreferences}
            onApprovePostpone={onApprovePostpone}
            onApproveDeprioritise={onApproveDeprioritise}
            onDismissSuggestion={onDismissPlanSuggestion}
          />

          {/* Compact Today's Focus + Direct Inline Quick Add */}
          <section className="overflow-hidden rounded-2xl border border-[#FED7AA] bg-white shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#FDE8D3] bg-gradient-to-r from-[#FFF7ED] to-[#FFEDD5]/55 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#EA580C] shadow-2xs border border-[#FED7AA]">
                  <Flame className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-bold text-[#1E1B2E] sm:text-base">
                  🔥 Today&apos;s Focus
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks', 'today')}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
              >
                <span>Open My Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Direct Quick Add Bar (No navigation required) */}
            <form
              onSubmit={handleDashboardQuickAdd}
              className="border-b border-[#F5EFEA] bg-[#FFFCF9] px-4 py-2.5 sm:px-5"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  placeholder='Add a task right here: e.g., "Prep interview questions tomorrow 4 PM"'
                  aria-label="Quick add task from dashboard"
                  className="min-h-[38px] flex-1 rounded-xl border border-[#E8DFD6] bg-white px-3 text-xs sm:text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickTaskText.trim()}
                  className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-[#6D4AFF] px-3 text-xs font-semibold text-white hover:bg-[#5B38EE] disabled:cursor-not-allowed disabled:opacity-45 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
              {quickTaskPreview && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#5B5570] tabular-nums">
                  <span className="font-semibold text-[#6D4AFF]">Will add:</span>
                  <span className="font-medium text-[#1E1B2E] truncate max-w-[200px]">
                    {quickTaskPreview.title}
                  </span>
                  <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${CATEGORY_COLOR[quickTaskPreview.category].text}`}>
                    <CategoryIcon category={quickTaskPreview.category} className="h-3 w-3 shrink-0" />
                    <span>{quickTaskPreview.category}</span>
                  </span>
                  <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                  <span>
                    {formatFriendlyDateTime(
                      quickTaskPreview.deadline,
                      quickTaskPreview.deadlineTime,
                      today
                    )}
                  </span>
                  <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                  <span className={`font-medium ${PRIORITY_COLOR[quickTaskPreview.priority].text}`}>
                    {quickTaskPreview.priority}
                  </span>
                </div>
              )}
            </form>

            {focusTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
                <p className="mt-2 text-sm font-medium text-[#1E1B2E]">No pending focus tasks</p>
                <p className="mt-0.5 text-xs text-[#5B5570]">
                  Add a task above or review upcoming deadlines in My Tasks.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F5EFEA]">
                {focusTasks.map((task) => {
                  const catStyle = CATEGORY_COLOR[task.category];
                  const prioStyle = PRIORITY_COLOR[task.priority];
                  const overdue = isTaskOverdue(task);

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 border-l-[3px] px-4 py-2.5 sm:px-5 transition-colors ${
                        task.completed
                          ? 'border-l-[#16A34A]/65 bg-[#F0FDF4]/60 opacity-75'
                          : overdue
                            ? 'border-l-[#DC2626] bg-[#FEF2F2]/60 hover:bg-[#FEF2F2]/85'
                            : task.priority === 'Must Do'
                              ? 'border-l-[#EA580C] bg-[#FFFDF9] hover:bg-[#FFF7ED]/70'
                              : 'border-l-[#7C5CFA] bg-white hover:bg-[#FAF8FF]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        aria-label={
                          task.completed
                            ? `Mark "${task.title}" as incomplete`
                            : `Mark "${task.title}" as complete`
                        }
                        className="flex h-10 w-10 -ml-1.5 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#6D4AFF]"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                            task.completed
                              ? 'border-[#16A34A] bg-[#16A34A] text-white'
                              : overdue
                                ? 'border-[#DC2626] bg-white hover:bg-[#FEF2F2]'
                                : task.priority === 'Must Do'
                                  ? 'border-[#EA580C] bg-[#FFF7ED] hover:bg-[#FFEDD5]'
                                  : 'border-[#C9BFE3] bg-white hover:border-[#6D4AFF]'
                          }`}
                        >
                          {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className={`block w-full text-left text-sm font-semibold truncate cursor-pointer transition-colors ${
                            task.completed
                              ? 'line-through text-[#7C7594]'
                              : 'text-[#1E1B2E] hover:text-[#6D4AFF]'
                          }`}
                        >
                          {task.title}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${catStyle.text}`}>
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border ${catStyle.softBg} ${catStyle.border}`}
                            >
                              <TaskContextIcon task={task} className="h-3.5 w-3.5 shrink-0" />
                            </span>
                            <span>{task.category}</span>
                          </span>
                          <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                          <span
                            className={`font-semibold ${
                              task.completed ? 'text-[#15803D]' : prioStyle.text
                            }`}
                          >
                            {task.completed ? 'Completed' : task.priority}
                          </span>
                          <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                          <span className={overdue ? 'font-semibold text-[#DC2626]' : 'text-[#5B5570]'}>
                            {overdue
                              ? `Overdue (${formatFriendlyDateTime(task.deadline, task.deadlineTime, today)})`
                              : formatFriendlyDateTime(task.deadline, task.deadlineTime, today)}
                          </span>
                          <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                          <span className="text-[#5B5570]">{formatDuration(task.estimatedMinutes)}</span>
                          {isSampleTask(task) && (
                            <>
                              <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                              <span className="font-medium text-[#8E87A6]">Sample</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Upcoming & Events + Interactive Applications Overview */}
        <div className="space-y-4 lg:col-span-5">
          {/* Upcoming Events & Deadlines (Light Blue Accent) */}
          <section className="overflow-hidden rounded-2xl border border-[#BFDBFE] bg-[#F2F7FF] shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#DBEAFE] bg-gradient-to-r from-[#E8F1FF] to-[#EFF6FF] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-2xs border border-[#BFDBFE]">
                  <Calendar className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-bold text-[#1E1B2E]">📅 Upcoming &amp; Events</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('upcoming')}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                <span>Open Calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {calendarConnected ? (
                calendarEvents.length > 0 && (
                  <div className="rounded-xl border border-[#BFDBFE] bg-white p-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#1D4ED8]">
                      Today&apos;s Google Calendar ({calendarEvents.length})
                    </p>
                    {calendarEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between gap-2 text-xs text-[#1E1B2E] tabular-nums"
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
                          <span className="truncate">{ev.summary}</span>
                        </span>
                        <span className="shrink-0 text-[#2563EB]">
                          {ev.isAllDay ? 'All day' : formatDuration(ev.durationMinutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab('integrations')}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-[#93C5FD] bg-white/80 px-3 py-2 text-left text-xs text-[#1D4ED8] hover:bg-white transition-colors"
                >
                  <span className="font-medium">Connect Google Calendar for live schedule sync</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}

              {upcomingPreview.length === 0 ? (
                <div className="rounded-xl border border-[#DBEAFE] bg-white px-4 py-5 text-center text-xs text-[#5B5570]">
                  No upcoming deadlines scheduled after today.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingPreview.map((task) => {
                    const cat = CATEGORY_COLOR[task.category];
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#DBEAFE] bg-white px-3.5 py-2.5 text-left hover:border-[#60A5FA] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1E1B2E] truncate">
                            {task.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[#5B5570] tabular-nums">
                            <span className={`inline-flex items-center gap-1 font-medium ${cat.text}`}>
                              <TaskContextIcon task={task} className="h-3 w-3 shrink-0" />
                              <span>{task.category}</span>
                            </span>
                            <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                            <span>{formatFriendlyDateTime(task.deadline, task.deadlineTime, today)}</span>
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#1D4ED8] tabular-nums">
                          <Clock className="h-3 w-3" />
                          {formatDuration(task.estimatedMinutes)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Interactive Applications Overview (Soft Lavender Accent) */}
          <section className="overflow-hidden rounded-2xl border border-[#D4C8F2] bg-[#F7F4FF] shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#E4DCF7] bg-gradient-to-r from-[#EFEAFF] to-[#F5F2FF] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#6D4AFF] shadow-2xs border border-[#DDD6FE]">
                  <Briefcase className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-bold text-[#1E1B2E]">💼 Applications</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('applications', undefined, 'All')}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
              >
                <span>Open Tracker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4">
              {appStats.total === 0 ? (
                <div className="rounded-xl border border-[#E4DCF7] bg-white px-4 py-5 text-center">
                  <p className="text-xs text-[#5B5570]">
                    No internship or job applications tracked yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('applications', undefined, 'All')}
                    className="mt-2 cursor-pointer text-xs font-semibold text-[#6D4AFF] hover:underline"
                  >
                    Go to Applications
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('applications', undefined, 'Active')}
                      aria-label={`View ${appStats.active} active applications`}
                      className="group cursor-pointer rounded-xl border border-[#DDD6FE] bg-gradient-to-br from-white to-[#F5F2FF] px-2.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-[#6D4AFF] hover:shadow-xs"
                    >
                      <div className="flex items-center justify-center gap-1 text-[#5B38EE]">
                        <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-[#5B5570] group-hover:text-[#4C2F96]">
                          Active
                        </span>
                      </div>
                      <p className="mt-0.5 text-lg font-bold text-[#1E1B2E] tabular-nums">
                        {appStats.active}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('applications', undefined, 'InterviewOrOA')}
                      aria-label={`View ${appStats.interviewsOrOA} interview and assessment applications`}
                      className="group cursor-pointer rounded-xl border border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5]/70 px-2.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-[#EA580C] hover:shadow-xs"
                    >
                      <div className="flex items-center justify-center gap-1 text-[#EA580C]">
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-[#9A3412]">
                          Interview/OA
                        </span>
                      </div>
                      <p className="mt-0.5 text-lg font-bold text-[#C2410C] tabular-nums">
                        {appStats.interviewsOrOA}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('applications', undefined, 'Offer')}
                      aria-label={`View ${appStats.offers} offer-stage applications`}
                      className="group cursor-pointer rounded-xl border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]/70 px-2.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-xs"
                    >
                      <div className="flex items-center justify-center gap-1 text-[#16A34A]">
                        <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-[#15803D]">Offers</span>
                      </div>
                      <p className="mt-0.5 text-lg font-bold text-[#15803D] tabular-nums">
                        {appStats.offers}
                      </p>
                    </button>
                  </div>

                  {allFollowUpsDue.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4C2F96]">
                          <Send className="h-3 w-3 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
                          <span>Follow-ups due ({allFollowUpsDue.length})</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('applications', undefined, 'FollowUps')}
                          className="cursor-pointer text-[11px] font-semibold text-[#6D4AFF] hover:underline"
                        >
                          Filter due
                        </button>
                      </div>
                      {allFollowUpsDue.slice(0, 2).map((app) => {
                        const isLate = followUpsOverdue.some((o) => o.id === app.id);
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => onNavigateTab('applications', undefined, 'FollowUps')}
                            className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                              isLate
                                ? 'border-[#FECACA] bg-[#FEF2F2]/75 hover:border-[#DC2626]'
                                : 'border-[#E4DCF7] bg-white hover:border-[#6D4AFF]'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#1E1B2E] truncate">
                                {app.company} · {app.role}
                              </p>
                              <p className="text-[11px] text-[#5B5570]">
                                {app.status}
                                {app.nextAction ? ` · ${app.nextAction}` : ''}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                                isLate ? 'text-[#DC2626]' : 'text-[#6D4AFF]'
                              }`}
                            >
                              {isLate ? 'Overdue · ' : ''}
                              {formatFriendlyDateTime(app.followUpDate!, app.followUpTime, today)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#5B5570]">No follow-ups due today.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Career Focus, AI Career Insights & External Job Opportunities */}
      <CareerCenterSection
        firstName={firstName}
        careerFocus={careerFocus}
        customCareerFocus={customCareerFocus}
        insights={careerInsights}
        isLoadingInsights={isLoadingCareerInsights}
        applications={applications}
        tasks={tasks}
        onSelectCareerFocus={onSelectCareerFocus}
        onChangeCustomCareerFocus={onChangeCustomCareerFocus}
        onRefreshInsights={onRefreshCareerInsights}
        onQuickAddCareerTask={onQuickAddTask}
      />
    </div>
  );
};
