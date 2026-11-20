import React, { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  SlidersHorizontal,
  SunMoon,
} from 'lucide-react';
import { MorningBriefingSection } from '../components/MorningBriefingSection';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { isSampleTask } from '../services/storage';
import { CalendarEventItem } from '../services/workspaceApis';
import {
  AIDailyPlan,
  JobApplication,
  NavTab,
  OverloadedDayWarning,
  StudentProfile,
  Task,
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
  isTaskOverdue,
  toLocalDateKey,
} from '../utils/dateUtils';
import { CATEGORY_COLOR, PRIORITY_COLOR } from '../utils/semanticColors';

interface DashboardViewProps {
  profile: StudentProfile;
  tasks: Task[];
  applications: JobApplication[];
  overloadedDays: OverloadedDayWarning[];
  followUpsDueToday: JobApplication[];
  followUpsOverdue: JobApplication[];
  workloadMetrics: WorkloadMetrics;
  aiDailyPlan: AIDailyPlan;
  isPlanningAI: boolean;
  calendarConnected: boolean;
  calendarEvents: CalendarEventItem[];
  calendarBusyMinutes: number;
  firstName: string;
  emailSetupReady: boolean;
  planAcceptedToday: boolean;
  onToggleTask: (id: string) => void;
  onAcceptPlan: () => void;
  onOpenPreferences: () => void;
  onOpenReplan: () => void;
  onOpenMiddayCheckIn: () => void;
  onRefreshAIPlan: () => void;
  onApprovePostpone: (taskId: string, newDeadline: string) => void;
  onApproveDeprioritise: (taskId: string, newPriority: TaskPriority) => void;
  onDismissPlanSuggestion: (taskId: string, kind: 'postpone' | 'deprioritise') => void;
  onNavigateTab: (tab: NavTab, taskFilter?: TaskViewFilter) => void;
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
  isPlanningAI,
  calendarConnected,
  calendarEvents,
  calendarBusyMinutes,
  firstName,
  emailSetupReady,
  planAcceptedToday,
  onToggleTask,
  onAcceptPlan,
  onOpenPreferences,
  onOpenReplan,
  onOpenMiddayCheckIn,
  onRefreshAIPlan,
  onApprovePostpone,
  onApproveDeprioritise,
  onDismissPlanSuggestion,
  onNavigateTab,
}) => {
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

  const upcomingPreview = upcomingTasks.slice(0, 3);

  return (
    <div className="space-y-3.5">
      {/* Compact Conversational Greeting & Quick Assistant Actions */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#D4C8F2] bg-[#FAF8FF] px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#6D4AFF]">{formatHeaderDate()}</p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#1E1B2E] sm:text-2xl text-balance">
            {firstName ? `${getGreetingForHour()}, ${firstName}` : getGreetingForHour()}
          </h1>
          <p className="mt-0.5 text-sm text-[#5B5570]">
            {dueTodayTasks.length === 0 && overdueTasks.length === 0
              ? 'Your day looks open — review what is coming up or plan ahead.'
              : 'Here is a snapshot of your day and what deserves your focus first.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onOpenReplan}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#C9B9F9] bg-[#EDE9FE] px-3.5 py-2 text-xs font-semibold text-[#4C2F96] hover:bg-[#DDD6FE] transition-colors whitespace-nowrap"
          >
            <CalendarClock className="h-3.5 w-3.5 text-[#6D4AFF]" />
            <span>Replan My Day</span>
          </button>

          <button
            type="button"
            onClick={onOpenMiddayCheckIn}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DFD7F2] bg-white px-3 py-2 text-xs font-medium text-[#1E1B2E] hover:bg-[#F5F1FF] transition-colors whitespace-nowrap"
          >
            <SunMoon className="h-3.5 w-3.5 text-[#0D9488]" />
            <span>Check-in</span>
          </button>

          <button
            type="button"
            onClick={onOpenPreferences}
            aria-label="Personalise NextUp"
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#DFD7F2] bg-white px-3 py-2 text-xs font-medium text-[#5B5570] hover:text-[#1E1B2E] hover:bg-[#F5F1FF] transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#6D4AFF]" />
            <span>Personalise</span>
          </button>
        </div>
      </section>

      {/* Urgent Alert Banners (Action-focused without repeating summary tile counts) */}
      {(overdueTasks.length > 0 || overloadedDays.length > 0) && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {overdueTasks.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5">
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
                className="min-h-[36px] shrink-0 rounded-xl border border-[#FECACA] bg-white px-3 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2] transition-colors whitespace-nowrap"
              >
                Review
              </button>
            </div>
          )}

          {overloadedDays.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" />
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
                className="min-h-[36px] shrink-0 rounded-xl border border-[#FED7AA] bg-white px-3 text-xs font-semibold text-[#9A3412] hover:bg-[#FFEDD5] transition-colors whitespace-nowrap"
              >
                Open Calendar
              </button>
            </div>
          )}
        </section>
      )}

      {/* Full-Width 4-Tile Task Status Strip (Primary home for task counts) */}
      <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'today')}
          className="rounded-2xl border border-[#D4C8F2] bg-[#F5F1FF] px-4 py-3 text-left hover:border-[#6D4AFF] transition-colors"
        >
          <span className="text-xs font-semibold text-[#4C2F96]">Due today</span>
          <p className="mt-0.5 text-2xl font-bold text-[#6D4AFF] tabular-nums">
            {dueTodayTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'overdue')}
          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
            overdueTasks.length > 0
              ? 'border-[#FECACA] bg-[#FEF2F2] hover:border-[#DC2626]'
              : 'border-[#F3DCDC] bg-[#FFF8F8] hover:border-[#FCA5A5]'
          }`}
        >
          <span className="text-xs font-semibold text-[#B91C1C]">Overdue</span>
          <p className="mt-0.5 text-2xl font-bold text-[#DC2626] tabular-nums">
            {overdueTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'upcoming')}
          className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-left hover:border-[#2563EB] transition-colors"
        >
          <span className="text-xs font-semibold text-[#1D4ED8]">Upcoming</span>
          <p className="mt-0.5 text-2xl font-bold text-[#2563EB] tabular-nums">
            {upcomingTasks.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'completed')}
          className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-left hover:border-[#16A34A] transition-colors"
        >
          <span className="text-xs font-semibold text-[#15803D]">Completed</span>
          <p className="mt-0.5 text-2xl font-bold text-[#16A34A] tabular-nums">
            {completedTasks.length}
          </p>
        </button>
      </section>

      {/* Main 2-Column Overview Bento */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Compact AI Morning Briefing + Clean Today's Focus (Top 2-3) */}
        <div className="space-y-4 lg:col-span-7">
          <MorningBriefingSection
            firstName={firstName}
            tasks={tasks}
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
            onOpenReplan={onOpenReplan}
            onOpenPreferences={onOpenPreferences}
            onApprovePostpone={onApprovePostpone}
            onApproveDeprioritise={onApproveDeprioritise}
            onDismissSuggestion={onDismissPlanSuggestion}
          />

          {/* Compact Today's Focus (Only Top 2-3 Priorities, Zero Edit/Dropdown Clutter) */}
          <section className="overflow-hidden rounded-2xl border border-[#FED7AA] bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-[#FDE8D3] bg-[#FFF7ED] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#EA580C]" />
                <h2 className="text-sm font-bold text-[#1E1B2E] sm:text-base">Today&apos;s Focus</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('tasks', 'today')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
              >
                <span>View All Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {focusTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
                <p className="mt-2 text-sm font-medium text-[#1E1B2E]">No pending focus tasks</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('tasks', 'today')}
                  className="mt-1.5 text-xs font-semibold text-[#6D4AFF] hover:underline"
                >
                  Open My Tasks
                </button>
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
                      className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 transition-colors ${
                        task.completed
                          ? 'bg-[#F0FDF4]/60 opacity-75'
                          : overdue
                            ? 'bg-[#FEF2F2]/50'
                            : 'bg-white'
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
                        className="flex h-10 w-10 -ml-1.5 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#6D4AFF]"
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
                        <p
                          className={`text-sm font-semibold truncate ${
                            task.completed ? 'line-through text-[#7C7594]' : 'text-[#1E1B2E]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums">
                          <span className={`font-medium ${catStyle.text}`}>{task.category}</span>
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

        {/* Right Column: Light Blue Upcoming Deadlines/Events + Soft Lavender Applications Overview */}
        <div className="space-y-4 lg:col-span-5">
          {/* Upcoming Events & Deadlines (Light Blue Accent) */}
          <section className="overflow-hidden rounded-2xl border border-[#BFDBFE] bg-[#F2F7FF]">
            <div className="flex items-center justify-between gap-2 border-b border-[#DBEAFE] bg-[#E8F1FF] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#1E1B2E]">Upcoming &amp; Events</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('upcoming')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                <span>Open Calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {calendarConnected && calendarEvents.length > 0 && (
                <div className="rounded-xl border border-[#BFDBFE] bg-white p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#1D4ED8]">
                    Today&apos;s Google Calendar ({calendarEvents.length})
                  </p>
                  {calendarEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 text-xs text-[#1E1B2E] tabular-nums"
                    >
                      <span className="truncate font-medium">{ev.summary}</span>
                      <span className="shrink-0 text-[#2563EB]">
                        {ev.isAllDay ? 'All day' : formatDuration(ev.durationMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
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
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#DBEAFE] bg-white px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1E1B2E] truncate">
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#5B5570] tabular-nums">
                            <span className={`font-medium ${cat.text}`}>{task.category}</span>
                            <span aria-hidden="true" className="mx-1.5 text-[#C9BFE3]">·</span>
                            <span>{formatFriendlyDateTime(task.deadline, task.deadlineTime, today)}</span>
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#1D4ED8] tabular-nums">
                          <Clock className="h-3 w-3" />
                          {formatDuration(task.estimatedMinutes)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Compact Applications Overview (Soft Lavender Accent) */}
          <section className="overflow-hidden rounded-2xl border border-[#D4C8F2] bg-[#F7F4FF]">
            <div className="flex items-center justify-between gap-2 border-b border-[#E4DCF7] bg-[#EFEAFF] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#6D4AFF]" />
                <h2 className="text-sm font-bold text-[#1E1B2E]">Applications</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('applications')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
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
                    onClick={() => onNavigateTab('applications')}
                    className="mt-2 text-xs font-semibold text-[#6D4AFF] hover:underline"
                  >
                    Go to Applications
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-[#E4DCF7] bg-white px-2 py-2.5">
                      <p className="text-base font-bold text-[#1E1B2E] tabular-nums">{appStats.active}</p>
                      <p className="text-[11px] text-[#5B5570]">Active</p>
                    </div>
                    <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-2 py-2.5">
                      <p className="text-base font-bold text-[#C2410C] tabular-nums">
                        {appStats.interviewsOrOA}
                      </p>
                      <p className="text-[11px] text-[#9A3412]">Interview/OA</p>
                    </div>
                    <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-2 py-2.5">
                      <p className="text-base font-bold text-[#15803D] tabular-nums">{appStats.offers}</p>
                      <p className="text-[11px] text-[#15803D]">Offers</p>
                    </div>
                  </div>

                  {allFollowUpsDue.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-[#4C2F96]">
                        Follow-ups due ({allFollowUpsDue.length})
                      </p>
                      {allFollowUpsDue.slice(0, 2).map((app) => {
                        const isLate = followUpsOverdue.some((o) => o.id === app.id);
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => onNavigateTab('applications')}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E4DCF7] bg-white px-3 py-2 text-left hover:border-[#6D4AFF] transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#1E1B2E] truncate">
                                {app.company} · {app.role}
                              </p>
                              <p className="text-[11px] text-[#5B5570]">{app.status}</p>
                            </div>
                            <span
                              className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                                isLate ? 'text-[#DC2626]' : 'text-[#6D4AFF]'
                              }`}
                            >
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
    </div>
  );
};
