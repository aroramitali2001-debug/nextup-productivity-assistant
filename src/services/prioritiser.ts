import {
  JobApplication,
  OverloadedDayWarning,
  PrioritisationEngine,
  PrioritisedFocusItem,
  Task,
  TaskPriority,
  WeeklySummary,
  WorkloadMetrics,
} from '../types/nextup';
import {
  addDaysToDateKey,
  formatDuration,
  formatFriendlyDate,
  formatFriendlyDateTime,
  formatHoursDecimal,
  getDayDifference,
  getWeekStartKey,
  isDateTimePast,
  isTaskOverdue,
  parseDateKey,
  toLocalDateKey,
} from '../utils/dateUtils';

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  'Must Do': 100,
  'Should Do': 55,
  'Can Wait': 20,
};

function getTimeUrgencyBonus(deadlineTime?: string): number {
  if (!deadlineTime) return 0;
  const [hh, mm] = deadlineTime.split(':').map(Number);
  if (Number.isNaN(hh)) return 0;
  const minutesFromMidnight = hh * 60 + (mm || 0);
  // Earlier in the day (e.g. 09:00 = 540) gets a higher bonus than 23:59 (1439)
  return Math.round(((1440 - minutesFromMidnight) / 1440) * 24);
}

function detectTaskContextType(task: Task): {
  kind: 'interview' | 'assessment' | 'application' | 'assignment' | 'personal';
  bonus: number;
  label: string;
} {
  const text = `${task.title} ${task.notes ?? ''}`.toLowerCase();
  if (/\b(interview|mock interview|technical round|hr round|system design)\b/.test(text)) {
    return { kind: 'interview', bonus: 22, label: 'interview preparation or scheduling' };
  }
  if (/\b(assessment|oa|coding challenge|hackerrank|take[- ]home|test|exam|quiz|midterm|final)\b/.test(text)) {
    return { kind: 'assessment', bonus: 18, label: 'an upcoming assessment' };
  }
  if (/\b(apply|application|follow[- ]?up|recruiter|referral|resume|cover letter)\b/.test(text)) {
    return { kind: 'application', bonus: 14, label: 'an active career application' };
  }
  if (task.category === 'College' || /\b(lab|report|assignment|essay|project|homework|submit|canvas)\b/.test(text)) {
    return { kind: 'assignment', bonus: 10, label: 'coursework' };
  }
  return { kind: 'personal', bonus: 4, label: 'a personal commitment' };
}

export const deterministicPrioritiser: PrioritisationEngine = {
  rankTopPriorities(tasks: Task[], referenceDate: string = toLocalDateKey(), limit = 3): PrioritisedFocusItem[] {
    const now = new Date();
    const activeTasks = tasks.filter((t) => !t.completed);
    const activeIds = new Set(activeTasks.map((t) => t.id));
    const titleById = new Map(activeTasks.map((t) => [t.id, t.title]));

    // Count how many active tasks depend on each task
    const unblocksTitles = new Map<string, string[]>();
    for (const t of activeTasks) {
      for (const depId of t.dependencies ?? []) {
        if (activeIds.has(depId)) {
          const list = unblocksTitles.get(depId) ?? [];
          list.push(titleById.get(t.id) || 'another task');
          unblocksTitles.set(depId, list);
        }
      }
    }

    const scored: PrioritisedFocusItem[] = activeTasks.map((task) => {
      const daysUntil = getDayDifference(referenceDate, task.deadline);
      const overdue = isTaskOverdue(task, now);
      const context = detectTaskContextType(task);
      let score = PRIORITY_WEIGHTS[task.priority] + context.bonus;
      const reasonParts: string[] = [];

      if (overdue) {
        const overdueDays = Math.max(1, Math.abs(daysUntil));
        score += 135 + Math.min(overdueDays * 10, 50);
        reasonParts.push(
          daysUntil === 0
            ? `its deadline passed earlier today (${formatFriendlyDateTime(task.deadline, task.deadlineTime, referenceDate)})`
            : overdueDays === 1
              ? 'it is 1 day overdue'
              : `it is ${overdueDays} days overdue`
        );
      } else if (daysUntil === 0) {
        score += 90 + getTimeUrgencyBonus(task.deadlineTime);
        reasonParts.push(
          task.deadlineTime
            ? `the deadline is today at ${formatFriendlyDateTime(task.deadline, task.deadlineTime, referenceDate).replace(/^Today,\s*/i, '')}`
            : 'the deadline is today'
        );
      } else if (daysUntil === 1) {
        score += 50 + getTimeUrgencyBonus(task.deadlineTime);
        reasonParts.push(
          context.kind === 'interview'
            ? 'an interview is coming up tomorrow'
            : task.deadlineTime
              ? `it is due ${formatFriendlyDateTime(task.deadline, task.deadlineTime, referenceDate)}`
              : 'it is due tomorrow'
        );
      } else if (daysUntil <= 3) {
        score += 22 + Math.round(getTimeUrgencyBonus(task.deadlineTime) * 0.5);
        reasonParts.push(`it is due ${formatFriendlyDateTime(task.deadline, task.deadlineTime, referenceDate)}`);
      } else {
        score -= Math.min(daysUntil * 3, 25);
        reasonParts.push(`it is due ${formatFriendlyDate(task.deadline, referenceDate)}`);
      }

      if (task.priority === 'Must Do') {
        reasonParts.push('marked as high priority (Must Do)');
      } else if (task.priority === 'Should Do') {
        reasonParts.push('marked as Should Do');
      }

      if (context.kind === 'interview' && daysUntil > 1) {
        reasonParts.push('tied to an upcoming interview');
      } else if (context.kind === 'assessment') {
        reasonParts.push('connected to an assessment');
      }

      if (task.takingLonger) {
        score += 15;
        reasonParts.push('flagged as taking longer than expected');
      }

      const unblocked = unblocksTitles.get(task.id) ?? [];
      if (unblocked.length > 0) {
        score += 18 * unblocked.length;
        reasonParts.push(`finishing it unblocks "${unblocked[0]}"`);
      }

      // Penalise slightly if blocked by an incomplete dependency
      const hasIncompleteDep = (task.dependencies ?? []).some((depId) => activeIds.has(depId));
      if (hasIncompleteDep) {
        score -= 35;
        reasonParts.push('waiting on a prerequisite task first');
      }

      if (task.estimatedMinutes <= 25 && daysUntil <= 0) {
        score += 6;
      }

      const formattedReason =
        reasonParts.length > 0
          ? `Suggested because ${reasonParts.slice(0, 3).join(' and ')}.`
          : `Prioritised for ${context.label}.`;

      return {
        task,
        score,
        reason: formattedReason,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};

export function detectOverloadedDays(
  tasks: Task[],
  thresholdCount = 4,
  thresholdMinutes = 240,
  referenceDate: string = toLocalDateKey()
): OverloadedDayWarning[] {
  const byDate = new Map<string, { count: number; minutes: number }>();

  for (const task of tasks) {
    if (task.completed || !task.deadline) continue;
    if (task.deadline < referenceDate) continue;
    const current = byDate.get(task.deadline) ?? { count: 0, minutes: 0 };
    byDate.set(task.deadline, {
      count: current.count + 1,
      minutes: current.minutes + (task.estimatedMinutes || 0),
    });
  }

  const warnings: OverloadedDayWarning[] = [];
  for (const [date, stats] of byDate.entries()) {
    if (stats.count >= thresholdCount || stats.minutes >= thresholdMinutes) {
      warnings.push({
        date,
        label: formatFriendlyDate(date, referenceDate),
        taskCount: stats.count,
        totalMinutes: stats.minutes,
      });
    }
  }

  return warnings.sort((a, b) => a.date.localeCompare(b.date));
}

export function getFollowUpsDue(
  applications: JobApplication[],
  referenceDate: string = toLocalDateKey(),
  now: Date = new Date()
): { dueToday: JobApplication[]; overdue: JobApplication[] } {
  const activeStatuses = new Set(['Saved', 'Applied', 'Assessment', 'Interview']);
  const dueToday: JobApplication[] = [];
  const overdue: JobApplication[] = [];

  for (const app of applications) {
    if (!app.followUpDate || !activeStatuses.has(app.status)) continue;
    if (isDateTimePast(app.followUpDate, app.followUpTime, now)) {
      overdue.push(app);
    } else if (app.followUpDate === referenceDate) {
      dueToday.push(app);
    }
  }

  return { dueToday, overdue };
}

export function buildWeeklySummary(
  tasks: Task[],
  applications: JobApplication[],
  referenceDate: string = toLocalDateKey()
): WeeklySummary {
  const weekStart = getWeekStartKey(referenceDate);
  const weekEnd = addDaysToDateKey(weekStart, 6);

  const days = Array.from({ length: 7 }, (_, idx) => {
    const date = addDaysToDateKey(weekStart, idx);
    const dt = parseDateKey(date);
    const dayTasks = tasks.filter((t) => t.deadline === date);
    const completedCount = dayTasks.filter((t) => t.completed).length;
    const minutes = dayTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

    return {
      date,
      shortDay: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: String(dt.getDate()),
      isToday: date === referenceDate,
      total: dayTasks.length,
      completed: completedCount,
      minutes,
    };
  });

  const weekTasks = tasks.filter((t) => t.deadline >= weekStart && t.deadline <= weekEnd);
  const completedThisWeek = weekTasks.filter((t) => t.completed).length;
  const totalMinutesPlanned = weekTasks
    .filter((t) => !t.completed)
    .reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);

  const activeApplications = applications.filter(
    (app) => app.status !== 'Rejected' && app.status !== 'Offer'
  ).length;

  return {
    weekStart,
    weekEnd,
    completedThisWeek,
    scheduledThisWeek: weekTasks.length,
    totalMinutesPlanned,
    activeApplications,
    days,
  };
}

export function computeWorkloadMetrics(
  tasks: Task[],
  availableHoursToday = 4,
  now: Date = new Date()
): WorkloadMetrics {
  const todayKey = toLocalDateKey(now);
  const weekStart = getWeekStartKey(todayKey);
  const weekEnd = addDaysToDateKey(weekStart, 6);

  const activeTasks = tasks.filter((t) => !t.completed);
  const dueTodayActive = activeTasks.filter((t) => t.deadline === todayKey);
  const overdueTasks = activeTasks.filter((t) => isTaskOverdue(t, now));
  const dueThisWeekActive = activeTasks.filter((t) => t.deadline >= weekStart && t.deadline <= weekEnd);
  const highPriorityActive = activeTasks.filter((t) => t.priority === 'Must Do');

  const completedTodayCount = tasks.filter((t) => {
    if (!t.completed) return false;
    if (t.completedAt) {
      return toLocalDateKey(new Date(t.completedAt)) === todayKey;
    }
    return t.deadline === todayKey;
  }).length;

  const remainingMinutesToday = [...dueTodayActive, ...overdueTasks.filter((t) => t.deadline < todayKey)].reduce(
    (sum, t) => sum + (t.estimatedMinutes || 0),
    0
  );
  const remainingMinutesWeek = dueThisWeekActive.reduce(
    (sum, t) => sum + (t.estimatedMinutes || 0),
    0
  );

  const hoursToday = remainingMinutesToday / 60;
  const hoursThisWeek = remainingMinutesWeek / 60;
  const isOverloadedToday = hoursToday > availableHoursToday;

  let workloadGuidance: string;
  if (remainingMinutesToday === 0) {
    workloadGuidance =
      'Your task queue for today is clear. You can get ahead on tomorrow’s deadlines or take a well-earned break.';
  } else if (isOverloadedToday) {
    const excessMinutes = Math.round(remainingMinutesToday - availableHoursToday * 60);
    workloadGuidance = `You have ${formatDuration(remainingMinutesToday)} of planned and overdue work, but ${formatHoursDecimal(availableHoursToday)} available today (${formatDuration(excessMinutes)} over capacity). Focus on Must Do items and use Replan My Day to shift lower-urgency tasks.`;
  } else if (hoursToday >= availableHoursToday * 0.8) {
    workloadGuidance = `Your ${formatDuration(remainingMinutesToday)} of remaining tasks fits tightly inside your ${formatHoursDecimal(availableHoursToday)} available window. Avoid adding non-urgent work today.`;
  } else {
    workloadGuidance = `Your ${formatDuration(remainingMinutesToday)} of remaining work fits comfortably inside your ${formatHoursDecimal(availableHoursToday)} available today, leaving buffer for unexpected tasks or interview prep.`;
  }

  return {
    hoursToday,
    hoursThisWeek,
    tasksDueToday: dueTodayActive.length,
    tasksDueThisWeek: dueThisWeekActive.length,
    overdueCount: overdueTasks.length,
    highPriorityCount: highPriorityActive.length,
    completedTodayCount,
    completedTotalCount: tasks.filter((t) => t.completed).length,
    remainingMinutesToday,
    remainingMinutesWeek,
    availableHoursToday,
    isOverloadedToday,
    workloadGuidance,
  };
}
