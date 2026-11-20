import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  Layers,
  ListTodo,
  PieChart,
  Send,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  ApplicationStatus,
  ApplicationViewFilter,
  JobApplication,
  NavTab,
  StudentProfile,
  Task,
  TaskCategory,
  TaskPriority,
  TaskViewFilter,
  WorkloadMetrics,
} from '../types/nextup';
import {
  addDaysToDateKey,
  formatDuration,
  isTaskOverdue,
  parseDateKey,
  toLocalDateKey,
} from '../utils/dateUtils';
import { CATEGORY_COLOR } from '../utils/semanticColors';

interface DashboardVisualAnalyticsProps {
  profile: StudentProfile;
  tasks: Task[];
  applications: JobApplication[];
  followUpsDueToday: JobApplication[];
  followUpsOverdue: JobApplication[];
  workloadMetrics: WorkloadMetrics;
  onNavigateTab: (
    tab: NavTab,
    taskFilter?: TaskViewFilter,
    appFilter?: ApplicationViewFilter
  ) => void;
}

interface DonutSegment {
  key: string;
  label: string;
  emoji: string;
  value: number;
  color: string;
  onClick?: () => void;
}

const SvgDonutChart: React.FC<{
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}> = ({ segments, centerValue, centerLabel, size = 136, strokeWidth = 16 }) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const activeSegment = hoveredKey ? segments.find((s) => s.key === hoveredKey) : null;

  let cumulativePercent = 0;

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#EFEAF9"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((seg) => {
              const fraction = seg.value / total;
              const dashLength = Math.max(0, fraction * circumference - (segments.filter((x) => x.value > 0).length > 1 ? 2 : 0));
              const dashOffset = -cumulativePercent * circumference;
              cumulativePercent += fraction;
              const isHovered = hoveredKey === seg.key;

              return (
                <circle
                  key={seg.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className={seg.onClick ? 'cursor-pointer transition-all duration-150' : 'transition-all duration-150'}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={seg.onClick}
                />
              );
            })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <span className="text-xl font-extrabold tracking-tight text-[#1E1B2E] tabular-nums leading-none">
          {activeSegment ? activeSegment.value : centerValue}
        </span>
        <span className="mt-1 text-[10px] font-semibold text-[#5B5570] leading-tight truncate max-w-[78px]">
          {activeSegment ? `${activeSegment.emoji} ${activeSegment.label}` : centerLabel}
        </span>
      </div>
    </div>
  );
};

const APPLICATION_STAGE_META: {
  status: ApplicationStatus;
  label: string;
  emoji: string;
  color: string;
  barBg: string;
  textColor: string;
  filter: ApplicationViewFilter;
}[] = [
  {
    status: 'Interview',
    label: 'Interview',
    emoji: '🎤',
    color: '#6D4AFF',
    barBg: 'bg-[#6D4AFF]',
    textColor: 'text-[#5B38EE]',
    filter: 'Interview',
  },
  {
    status: 'Assessment',
    label: 'Assessment',
    emoji: '🧪',
    color: '#EA580C',
    barBg: 'bg-[#EA580C]',
    textColor: 'text-[#C2410C]',
    filter: 'Assessment',
  },
  {
    status: 'Applied',
    label: 'Applied',
    emoji: '📤',
    color: '#2563EB',
    barBg: 'bg-[#2563EB]',
    textColor: 'text-[#1D4ED8]',
    filter: 'Active',
  },
  {
    status: 'Saved',
    label: 'Saved',
    emoji: '🔖',
    color: '#8B5CF6',
    barBg: 'bg-[#8B5CF6]',
    textColor: 'text-[#6D4AFF]',
    filter: 'Active',
  },
  {
    status: 'Offer',
    label: 'Offer',
    emoji: '🏆',
    color: '#16A34A',
    barBg: 'bg-[#16A34A]',
    textColor: 'text-[#15803D]',
    filter: 'Offer',
  },
  {
    status: 'Rejected',
    label: 'Closed',
    emoji: '📁',
    color: '#94A3B8',
    barBg: 'bg-[#94A3B8]',
    textColor: 'text-[#64748B]',
    filter: 'Closed',
  },
];

export const DashboardVisualAnalytics: React.FC<DashboardVisualAnalyticsProps> = ({
  profile,
  tasks,
  applications,
  followUpsDueToday,
  followUpsOverdue,
  onNavigateTab,
}) => {
  const today = toLocalDateKey();
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const totalTasks = tasks.length;
    const completed = tasks.filter((t) => t.completed);
    const remaining = tasks.filter((t) => !t.completed);
    const overdue = tasks.filter((t) => isTaskOverdue(t, now));
    const dueToday = tasks.filter(
      (t) => !t.completed && t.deadline === today && !isTaskOverdue(t, now)
    );
    const upcoming = tasks.filter((t) => !t.completed && t.deadline > today);

    const completionPct =
      totalTasks > 0 ? Math.round((completed.length / totalTasks) * 100) : 0;

    // Weekly productivity % grounded in current 7-day window + recently completed
    const weekStart = addDaysToDateKey(today, -6);
    const weekEnd = addDaysToDateKey(today, 6);
    const completedThisWeek = completed.filter((t) => {
      const doneKey = t.completedAt ? toLocalDateKey(new Date(t.completedAt)) : t.deadline;
      return doneKey >= weekStart;
    });
    const openThisWeek = remaining.filter((t) => t.deadline <= weekEnd);
    const weeklyDenominator = completedThisWeek.length + openThisWeek.length;
    const weeklyProductivityPct =
      weeklyDenominator > 0
        ? Math.round((completedThisWeek.length / weeklyDenominator) * 100)
        : completionPct;

    // Priority counts across remaining open tasks
    const priorityCounts: Record<TaskPriority, number> = {
      'Must Do': remaining.filter((t) => t.priority === 'Must Do').length,
      'Should Do': remaining.filter((t) => t.priority === 'Should Do').length,
      'Can Wait': remaining.filter((t) => t.priority === 'Can Wait').length,
    };

    // Category counts across open tasks
    const categoryCounts: Record<TaskCategory, number> = {
      College: remaining.filter((t) => t.category === 'College').length,
      Career: remaining.filter((t) => t.category === 'Career').length,
      Personal: remaining.filter((t) => t.category === 'Personal').length,
      Other: remaining.filter((t) => t.category === 'Other').length,
    };

    // Next 7 days workload bar data
    const weeklyDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDateKey(today, i);
      const dt = parseDateKey(date);
      const dayOpen = remaining.filter((t) => t.deadline === date);
      const dayDone = completed.filter((t) => t.deadline === date);
      const dayFollowUps = applications.filter(
        (a) =>
          a.followUpDate === date &&
          a.status !== 'Rejected' &&
          a.status !== 'Offer'
      ).length;
      const minutes = dayOpen.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const isHeavy =
        dayOpen.length >= profile.dailyTaskWarningThreshold || minutes >= 240;

      return {
        date,
        weekday: i === 0 ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: dt.getDate(),
        openCount: dayOpen.length,
        doneCount: dayDone.length,
        followUpCount: dayFollowUps,
        totalItems: dayOpen.length + dayFollowUps,
        minutes,
        isHeavy,
        isToday: i === 0,
      };
    });

    const maxDayItems = Math.max(
      profile.dailyTaskWarningThreshold,
      ...weeklyDays.map((d) => d.totalItems + d.doneCount),
      3
    );

    // Application analytics
    const totalApps = applications.length;
    const activeApps = applications.filter(
      (a) => a.status !== 'Rejected' && a.status !== 'Offer'
    ).length;
    const interviewsScheduled = applications.filter(
      (a) => a.status === 'Interview'
    ).length;
    const assessmentsCount = applications.filter(
      (a) => a.status === 'Assessment'
    ).length;
    const offersCount = applications.filter((a) => a.status === 'Offer').length;
    const followUpsDue = followUpsOverdue.length + followUpsDueToday.length;

    const statusCounts: Record<ApplicationStatus, number> = {
      Saved: applications.filter((a) => a.status === 'Saved').length,
      Applied: applications.filter((a) => a.status === 'Applied').length,
      Assessment: assessmentsCount,
      Interview: interviewsScheduled,
      Offer: offersCount,
      Rejected: applications.filter((a) => a.status === 'Rejected').length,
    };

    const submittedTotal =
      statusCounts.Applied +
      statusCounts.Assessment +
      statusCounts.Interview +
      statusCounts.Offer +
      statusCounts.Rejected;
    const progressRatePct =
      submittedTotal > 0
        ? Math.round(
            ((statusCounts.Assessment + statusCounts.Interview + statusCounts.Offer) /
              submittedTotal) *
              100
          )
        : 0;

    return {
      totalTasks,
      completedCount: completed.length,
      remainingCount: remaining.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      upcomingCount: upcoming.length,
      completionPct,
      weeklyProductivityPct,
      priorityCounts,
      categoryCounts,
      weeklyDays,
      maxDayItems,
      totalApps,
      activeApps,
      interviewsScheduled,
      assessmentsCount,
      offersCount,
      followUpsDue,
      statusCounts,
      progressRatePct,
    };
  }, [
    tasks,
    applications,
    today,
    profile.dailyTaskWarningThreshold,
    followUpsDueToday.length,
    followUpsOverdue.length,
  ]);

  const taskDonutSegments: DonutSegment[] = [
    {
      key: 'completed',
      label: 'Completed',
      emoji: '🟢',
      value: stats.completedCount,
      color: '#16A34A',
      onClick: () => onNavigateTab('tasks', 'completed'),
    },
    {
      key: 'today',
      label: 'Due Today',
      emoji: '⚡',
      value: stats.dueTodayCount,
      color: '#6D4AFF',
      onClick: () => onNavigateTab('tasks', 'today'),
    },
    {
      key: 'upcoming',
      label: 'Upcoming',
      emoji: '📅',
      value: stats.upcomingCount,
      color: '#2563EB',
      onClick: () => onNavigateTab('tasks', 'upcoming'),
    },
    {
      key: 'overdue',
      label: 'Overdue',
      emoji: '⏳',
      value: stats.overdueCount,
      color: '#DC2626',
      onClick: () => onNavigateTab('tasks', 'overdue'),
    },
  ];

  const appDonutSegments: DonutSegment[] = APPLICATION_STAGE_META.map((stage) => ({
    key: stage.status,
    label: stage.label,
    emoji: stage.emoji,
    value: stats.statusCounts[stage.status],
    color: stage.color,
    onClick: () => onNavigateTab('applications', undefined, stage.filter),
  }));

  const hoveredDay = hoveredDayKey
    ? stats.weeklyDays.find((d) => d.date === hoveredDayKey)
    : stats.weeklyDays[0];

  const priorityBarRows: {
    key: TaskPriority;
    emoji: string;
    count: number;
    barClass: string;
    textClass: string;
    bgClass: string;
  }[] = [
    {
      key: 'Must Do',
      emoji: '🔥',
      count: stats.priorityCounts['Must Do'],
      barClass: 'bg-[#EA580C]',
      textClass: 'text-[#C2410C]',
      bgClass: 'bg-[#FFF7ED]',
    },
    {
      key: 'Should Do',
      emoji: '⚡',
      count: stats.priorityCounts['Should Do'],
      barClass: 'bg-[#6D4AFF]',
      textClass: 'text-[#5B38EE]',
      bgClass: 'bg-[#F3EFFF]',
    },
    {
      key: 'Can Wait',
      emoji: '🌿',
      count: stats.priorityCounts['Can Wait'],
      barClass: 'bg-[#0D9488]',
      textClass: 'text-[#0F766E]',
      bgClass: 'bg-[#F0FDFA]',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Colorful 4-Tile Primary Visual KPI Cards + Progress Indicators */}
      <section aria-label="Productivity and career statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Card 1: Tasks Completed & Weekly Productivity % */}
        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'completed')}
          className="group cursor-pointer rounded-2xl border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] via-[#ECFDF5] to-[#DCFCE7]/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#15803D]">🟢 Tasks Completed</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#BBF7D0] bg-white text-[#16A34A] shadow-2xs">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#15803D] tabular-nums">
              {stats.completedCount}
              <span className="ml-1 text-sm font-semibold text-[#16A34A]/80">
                / {stats.totalTasks}
              </span>
            </p>
            <span className="text-xs font-bold text-[#15803D] tabular-nums">
              {stats.weeklyProductivityPct}% week
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/90">
            <div
              className="h-full rounded-full bg-[#16A34A] transition-all duration-300"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
        </button>

        {/* Card 2: Tasks Remaining & Due Today */}
        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'today')}
          className="group cursor-pointer rounded-2xl border border-[#D4C8F2] bg-gradient-to-br from-[#F7F4FF] via-[#F3EFFF] to-[#EDE9FE]/85 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#6D4AFF] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#4C2F96]">⚡ Tasks Remaining</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
              <ListTodo className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#5B38EE] tabular-nums">
              {stats.remainingCount}
            </p>
            <span className="text-xs font-semibold text-[#6D4AFF] tabular-nums">
              {stats.dueTodayCount} due today
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/90">
            <div
              className="h-full rounded-full bg-[#6D4AFF] transition-all duration-300"
              style={{
                width: `${
                  stats.remainingCount > 0
                    ? Math.max(12, Math.round((stats.dueTodayCount / stats.remainingCount) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </button>

        {/* Card 3: Deadlines & Overdue */}
        <button
          type="button"
          onClick={() =>
            onNavigateTab('tasks', stats.overdueCount > 0 ? 'overdue' : 'upcoming')
          }
          className={`group cursor-pointer rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-xs ${
            stats.overdueCount > 0
              ? 'border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] via-[#FFF5F5] to-[#FEE2E2]/80 hover:border-[#DC2626]'
              : 'border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] via-[#F0F7FF] to-[#DBEAFE]/80 hover:border-[#2563EB]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                stats.overdueCount > 0 ? 'text-[#991B1B]' : 'text-[#1D4ED8]'
              }`}
            >
              ⏳ Deadlines &amp; Overdue
            </span>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white shadow-2xs ${
                stats.overdueCount > 0
                  ? 'border-[#FECACA] text-[#DC2626]'
                  : 'border-[#BFDBFE] text-[#2563EB]'
              }`}
            >
              {stats.overdueCount > 0 ? (
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                stats.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#2563EB]'
              }`}
            >
              {stats.upcomingCount}
              <span className="ml-1 text-xs font-semibold opacity-80">upcoming</span>
            </p>
            <span
              className={`text-xs font-bold tabular-nums ${
                stats.overdueCount > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
              }`}
            >
              {stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : '0 overdue'}
            </span>
          </div>
          <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-white/90">
            {stats.overdueCount > 0 && (
              <div
                className="h-full bg-[#DC2626]"
                style={{
                  width: `${Math.max(
                    15,
                    Math.round(
                      (stats.overdueCount /
                        Math.max(1, stats.overdueCount + stats.upcomingCount)) *
                        100
                    )
                  )}%`,
                }}
              />
            )}
            <div
              className="h-full bg-[#2563EB]"
              style={{
                width: `${Math.round(
                  (stats.upcomingCount /
                    Math.max(1, stats.overdueCount + stats.upcomingCount)) *
                    100
                )}%`,
              }}
            />
          </div>
        </button>

        {/* Card 4: Active Applications & Interviews */}
        <button
          type="button"
          onClick={() => onNavigateTab('applications', undefined, 'Active')}
          className="group cursor-pointer rounded-2xl border border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] via-[#FFFBF5] to-[#FFEDD5]/85 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#EA580C] hover:shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#9A3412]">💼 Active Applications</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FED7AA] bg-white text-[#EA580C] shadow-2xs">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-[#C2410C] tabular-nums">
              {stats.activeApps}
            </p>
            <span className="text-xs font-bold text-[#6D4AFF] tabular-nums">
              🎤 {stats.interviewsScheduled} interviews
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#9A3412] tabular-nums">
            <span>🧪 {stats.assessmentsCount} OA</span>
            <span>📤 {stats.followUpsDue} follow-ups due</span>
          </div>
        </button>
      </section>

      {/* 2. Prominent Numerical Snapshot Ribbon (All 8 Key Statistics at a Glance) */}
      <section
        aria-label="Key numerical metrics"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-[#DFD7F2] bg-white p-3 shadow-2xs sm:grid-cols-4 lg:grid-cols-8"
      >
        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'today')}
          className="flex items-center gap-2 rounded-xl bg-[#FAF8FF] px-2.5 py-2 text-left hover:bg-[#F3EFFF] transition-colors cursor-pointer"
        >
          <Layers className="h-4 w-4 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#5B5570] truncate">Total Tasks</p>
            <p className="text-sm font-extrabold text-[#1E1B2E] tabular-nums">{stats.totalTasks}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'completed')}
          className="flex items-center gap-2 rounded-xl bg-[#F0FDF4] px-2.5 py-2 text-left hover:bg-[#DCFCE7] transition-colors cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#15803D] truncate">Completed</p>
            <p className="text-sm font-extrabold text-[#15803D] tabular-nums">{stats.completedCount}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'today')}
          className="flex items-center gap-2 rounded-xl bg-[#F5F3FF] px-2.5 py-2 text-left hover:bg-[#EDE9FE] transition-colors cursor-pointer"
        >
          <Clock className="h-4 w-4 shrink-0 text-[#5B38EE]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#4C2F96] truncate">Remaining</p>
            <p className="text-sm font-extrabold text-[#5B38EE] tabular-nums">{stats.remainingCount}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'upcoming')}
          className="flex items-center gap-2 rounded-xl bg-[#EFF6FF] px-2.5 py-2 text-left hover:bg-[#DBEAFE] transition-colors cursor-pointer"
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#1D4ED8] truncate">Deadlines</p>
            <p className="text-sm font-extrabold text-[#1D4ED8] tabular-nums">{stats.upcomingCount}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('applications', undefined, 'Active')}
          className="flex items-center gap-2 rounded-xl bg-[#FAF8FF] px-2.5 py-2 text-left hover:bg-[#F3EFFF] transition-colors cursor-pointer"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#5B5570] truncate">Active Apps</p>
            <p className="text-sm font-extrabold text-[#1E1B2E] tabular-nums">{stats.activeApps}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('applications', undefined, 'Interview')}
          className="flex items-center gap-2 rounded-xl bg-[#FFF7ED] px-2.5 py-2 text-left hover:bg-[#FFEDD5] transition-colors cursor-pointer"
        >
          <ClipboardCheck className="h-4 w-4 shrink-0 text-[#EA580C]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#9A3412] truncate">Interviews</p>
            <p className="text-sm font-extrabold text-[#C2410C] tabular-nums">
              {stats.interviewsScheduled}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('applications', undefined, 'FollowUps')}
          className="flex items-center gap-2 rounded-xl bg-[#F5F1FF] px-2.5 py-2 text-left hover:bg-[#EDE9FE] transition-colors cursor-pointer"
        >
          <Send className="h-4 w-4 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#4C2F96] truncate">Follow-ups</p>
            <p className="text-sm font-extrabold text-[#6D4AFF] tabular-nums">{stats.followUpsDue}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('tasks', 'completed')}
          className="flex items-center gap-2 rounded-xl bg-[#F0FDFA] px-2.5 py-2 text-left hover:bg-[#CCFBF1] transition-colors cursor-pointer"
        >
          <TrendingUp className="h-4 w-4 shrink-0 text-[#0D9488]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[#0F766E] truncate">Weekly Prod.</p>
            <p className="text-sm font-extrabold text-[#0F766E] tabular-nums">
              {stats.weeklyProductivityPct}%
            </p>
          </div>
        </button>
      </section>

      {/* 3. Visual Charts & Analytics Trio (Donut + Priority Bars, 7-Day Workload Chart, Application Funnel) */}
      <section aria-label="Productivity and application charts" className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Chart 1: Task Progress Donut + Priority & Category Distribution */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#D4C8F2] bg-white p-4 shadow-2xs sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F5F1FF] text-[#6D4AFF]">
                <PieChart className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#1E1B2E]">📊 Task Progress &amp; Priority</h2>
                <p className="text-[11px] text-[#5B5570]">Completed vs. pending breakdown</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tasks', 'today')}
              className="cursor-pointer text-[11px] font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
            >
              Tasks <ArrowRight className="inline h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
            <SvgDonutChart
              segments={taskDonutSegments}
              centerValue={`${stats.completionPct}%`}
              centerLabel="Complete"
            />

            <div className="w-full flex-1 space-y-1.5">
              {taskDonutSegments.map((seg) => {
                const pct =
                  stats.totalTasks > 0 ? Math.round((seg.value / stats.totalTasks) * 100) : 0;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={seg.onClick}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs hover:bg-[#FAF8FF] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#1E1B2E]">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span>
                        {seg.emoji} {seg.label}
                      </span>
                    </span>
                    <span className="font-bold text-[#1E1B2E] tabular-nums">
                      {seg.value}{' '}
                      <span className="text-[11px] font-medium text-[#7C7594]">({pct}%)</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Distribution Bars */}
          <div className="mt-4 border-t border-[#F1ECFA] pt-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold text-[#1E1B2E]">
                <Target className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden="true" />
                🎯 Open Task Priorities ({stats.remainingCount})
              </span>
              <span className="text-[#5B5570] tabular-nums">
                {(['College', 'Career', 'Personal'] as TaskCategory[])
                  .map((c) => `${c}: ${stats.categoryCounts[c]}`)
                  .join(' · ')}
              </span>
            </div>

            {stats.remainingCount === 0 ? (
              <p className="rounded-xl bg-[#F0FDF4] px-3 py-2 text-xs font-medium text-[#15803D]">
                🎉 All tasks complete! Zero pending priorities.
              </p>
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F3EFFF]">
                  {priorityBarRows.map((row) =>
                    row.count > 0 ? (
                      <div
                        key={row.key}
                        className={`${row.barClass} h-full transition-all duration-300`}
                        style={{
                          width: `${Math.round((row.count / stats.remainingCount) * 100)}%`,
                        }}
                        title={`${row.key}: ${row.count}`}
                      />
                    ) : null
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {priorityBarRows.map((row) => (
                    <div
                      key={row.key}
                      className={`rounded-xl px-2 py-1.5 text-center ${row.bgClass}`}
                    >
                      <p className={`text-[10px] font-semibold ${row.textClass}`}>
                        {row.emoji} {row.key}
                      </p>
                      <p className={`text-sm font-extrabold tabular-nums ${row.textClass}`}>
                        {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </article>

        {/* Chart 2: Weekly Workload 7-Day Column Bar Chart */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#BFDBFE] bg-white p-4 shadow-2xs sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#1E1B2E]">📅 Weekly Workload</h2>
                <p className="text-[11px] text-[#5B5570]">Next 7 days tasks &amp; follow-ups</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('upcoming')}
              className="cursor-pointer text-[11px] font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
            >
              Calendar <ArrowRight className="inline h-3 w-3" />
            </button>
          </div>

          {/* Interactive Selected/Hovered Day Readout */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-3 py-2 text-xs tabular-nums">
            <span className="font-bold text-[#1E3A8A]">
              {hoveredDay?.weekday} ({hoveredDay?.dayNum})
            </span>
            <span className="font-medium text-[#1D4ED8]">
              {hoveredDay
                ? `${hoveredDay.openCount} tasks · ${hoveredDay.followUpCount} follow-ups · ${formatDuration(hoveredDay.minutes)}`
                : ''}
            </span>
          </div>

          {/* 7-Day Vertical Column Bars */}
          <div className="mt-4 flex h-36 items-end justify-between gap-2 px-1">
            {stats.weeklyDays.map((day) => {
              const totalCount = day.totalItems;
              const openHeightPct = Math.round((totalCount / stats.maxDayItems) * 100);
              const doneHeightPct = Math.round((day.doneCount / stats.maxDayItems) * 100);
              const isSelected = hoveredDay?.date === day.date;

              return (
                <button
                  key={day.date}
                  type="button"
                  onMouseEnter={() => setHoveredDayKey(day.date)}
                  onFocus={() => setHoveredDayKey(day.date)}
                  onClick={() => onNavigateTab('upcoming')}
                  aria-label={`${day.weekday}: ${day.openCount} tasks, ${day.followUpCount} follow-ups`}
                  className="group flex flex-1 cursor-pointer flex-col items-center gap-1.5"
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      day.isHeavy
                        ? 'text-[#EA580C]'
                        : totalCount > 0
                          ? 'text-[#1D4ED8]'
                          : 'text-[#94A3B8]'
                    }`}
                  >
                    {totalCount > 0 ? totalCount : day.doneCount > 0 ? `✓${day.doneCount}` : '0'}
                  </span>

                  <div
                    className={`relative flex h-24 w-full max-w-[30px] flex-col justify-end overflow-hidden rounded-xl border p-0.5 transition-all ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#EFF6FF] shadow-2xs'
                        : 'border-[#E5EAF5] bg-[#F8FAFC] group-hover:border-[#93C5FD]'
                    }`}
                  >
                    {day.doneCount > 0 && (
                      <div
                        className="w-full rounded-t-md bg-[#16A34A]/75 transition-all duration-300"
                        style={{ height: `${Math.max(10, doneHeightPct)}%` }}
                      />
                    )}
                    {totalCount > 0 && (
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          day.isHeavy
                            ? 'bg-gradient-to-t from-[#EA580C] to-[#FB923C]'
                            : day.isToday
                              ? 'bg-gradient-to-t from-[#5B38EE] to-[#8B5CF6]'
                              : 'bg-gradient-to-t from-[#2563EB] to-[#60A5FA]'
                        }`}
                        style={{ height: `${Math.max(14, openHeightPct)}%` }}
                      />
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-semibold ${
                      day.isToday
                        ? 'text-[#5B38EE] font-bold'
                        : day.isHeavy
                          ? 'text-[#C2410C]'
                          : 'text-[#5B5570]'
                    }`}
                  >
                    {day.weekday}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EFF6FF] pt-2.5 text-[11px] text-[#5B5570]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#2563EB]" /> Normal
              <span className="ml-1.5 h-2.5 w-2.5 rounded-xs bg-[#EA580C]" /> Heavy (≥
              {profile.dailyTaskWarningThreshold})
              <span className="ml-1.5 h-2.5 w-2.5 rounded-xs bg-[#16A34A]" /> Done
            </span>
            <span className="font-semibold text-[#1D4ED8] tabular-nums">
              {stats.weeklyDays.reduce((s, d) => s + d.openCount, 0)} scheduled
            </span>
          </div>
        </article>

        {/* Chart 3: Application Activity & Status Breakdown */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#FED7AA] bg-white p-4 shadow-2xs sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C]">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#1E1B2E]">📈 Application Pipeline</h2>
                <p className="text-[11px] text-[#5B5570]">Status breakdown &amp; momentum</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('applications', undefined, 'All')}
              className="cursor-pointer text-[11px] font-semibold text-[#C2410C] hover:underline whitespace-nowrap"
            >
              Tracker <ArrowRight className="inline h-3 w-3" />
            </button>
          </div>

          {stats.totalApps === 0 ? (
            <div className="my-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#FED7AA] bg-[#FFFBF5] px-4 py-6 text-center">
              <Briefcase className="h-8 w-8 text-[#FB923C]" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-[#1E1B2E]">No applications tracked yet</p>
              <button
                type="button"
                onClick={() => onNavigateTab('applications', undefined, 'All')}
                className="mt-2 cursor-pointer text-xs font-semibold text-[#EA580C] hover:underline"
              >
                Add your first application
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                <SvgDonutChart
                  segments={appDonutSegments}
                  centerValue={`${stats.totalApps}`}
                  centerLabel="Tracked Apps"
                />

                <div className="w-full flex-1 space-y-1.5">
                  {APPLICATION_STAGE_META.map((stage) => {
                    const count = stats.statusCounts[stage.status];
                    const pct =
                      stats.totalApps > 0 ? Math.round((count / stats.totalApps) * 100) : 0;
                    return (
                      <button
                        key={stage.status}
                        type="button"
                        onClick={() => onNavigateTab('applications', undefined, stage.filter)}
                        className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-0.5 text-xs hover:bg-[#FFFBF5] transition-colors"
                      >
                        <span className="w-24 shrink-0 text-left font-medium text-[#1E1B2E] truncate">
                          {stage.emoji} {stage.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5EFEA]">
                          <div
                            className={`h-full rounded-full ${stage.barBg} transition-all duration-300`}
                            style={{ width: `${count > 0 ? Math.max(8, pct) : 0}%` }}
                          />
                        </div>
                        <span className={`w-6 text-right font-bold tabular-nums ${stage.textColor}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#FDE8D3] pt-3">
                <div className="rounded-xl bg-[#F5F1FF] px-2.5 py-2 text-center">
                  <p className="text-[10px] font-semibold text-[#4C2F96]">Advancement</p>
                  <p className="text-sm font-extrabold text-[#5B38EE] tabular-nums">
                    {stats.progressRatePct}%
                  </p>
                </div>
                <div className="rounded-xl bg-[#FFF7ED] px-2.5 py-2 text-center">
                  <p className="text-[10px] font-semibold text-[#9A3412]">Follow-ups</p>
                  <p className="text-sm font-extrabold text-[#C2410C] tabular-nums">
                    {stats.followUpsDue}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F0FDF4] px-2.5 py-2 text-center">
                  <p className="text-[10px] font-semibold text-[#15803D]">Offers</p>
                  <p className="text-sm font-extrabold text-[#15803D] tabular-nums">
                    <Award className="mr-0.5 inline h-3.5 w-3.5" aria-hidden="true" />
                    {stats.offersCount}
                  </p>
                </div>
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
};
