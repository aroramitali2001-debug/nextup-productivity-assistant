import {
  AIDailyPlan,
  BriefingType,
  JobApplication,
  ReplanResult,
  ReplanSuggestion,
  Task,
  TaskPriority,
} from '../types/nextup';
import {
  addDaysToDateKey,
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDate,
  formatFriendlyDateTime,
  getBriefingPeriod,
  getDayDifference,
  getLocalTimeHHmmInTimeZone,
  isTaskOverdue,
  toDateKeyInTimeZone,
} from '../utils/dateUtils';
import { deterministicPrioritiser } from './prioritiser';

function normalizeValidTaskIdSet(tasks: Task[]): Set<string> {
  return new Set(tasks.map((t) => t.id));
}

export interface PlannerCalendarContext {
  connected: boolean;
  busyMinutes: number;
  events: { summary: string; startIso: string; durationMinutes: number }[];
}

export function buildRuleBasedDailyPlan(
  tasks: Task[],
  applications: JobApplication[],
  availableHoursToday = 4,
  now: Date = new Date(),
  calendarContext?: PlannerCalendarContext,
  userName?: string,
  briefingTypeOverride?: BriefingType,
  timeZone?: string
): AIDailyPlan {
  const todayKey = toDateKeyInTimeZone(now, timeZone);
  const briefingType: BriefingType = briefingTypeOverride ?? getBriefingPeriod(now, timeZone);
  const activeTasks = tasks.filter((t) => !t.completed);
  const activeIds = new Set(activeTasks.map((t) => t.id));
  const ranked = deterministicPrioritiser.rankTopPriorities(tasks, todayKey, activeTasks.length);

  const topThree = ranked.slice(0, 3).map((item) => ({
    taskId: item.task.id,
    reason: item.reason,
  }));

  const calendarBusyMins = calendarContext?.connected ? calendarContext.busyMinutes : 0;
  const effectiveOpenMinutes = calendarContext?.connected
    ? Math.max(30, Math.round(availableHoursToday * 60) - Math.round(calendarBusyMins * 0.5))
    : Math.max(30, Math.round(availableHoursToday * 60));
  const availableMinutes = effectiveOpenMinutes;
  let cumulativeMinutes = 0;

  const startImmediatelyIds: string[] = [];
  const unrealisticTodayIds: string[] = [];
  const postponeSuggestions: AIDailyPlan['postponeSuggestions'] = [];
  const deprioritiseSuggestions: AIDailyPlan['deprioritiseSuggestions'] = [];
  const recommendedOrder: AIDailyPlan['recommendedOrder'] = [];

  for (const item of ranked) {
    const t = item.task;
    const isBlocked = (t.dependencies ?? []).some((depId) => activeIds.has(depId));
    const overdue = isTaskOverdue(t, now);
    const dueTodayOrTomorrow = getDayDifference(todayKey, t.deadline) <= 1;

    if (!isBlocked && (overdue || (t.deadline === todayKey && t.priority === 'Must Do')) && startImmediatelyIds.length < 2) {
      startImmediatelyIds.push(t.id);
    }

    if (overdue || t.deadline === todayKey) {
      const fitsBudget = cumulativeMinutes + t.estimatedMinutes <= availableMinutes;
      if (fitsBudget || t.priority === 'Must Do') {
        const startHint =
          cumulativeMinutes === 0
            ? 'Start first'
            : cumulativeMinutes < 120
              ? 'Next block'
              : 'Later today';
        recommendedOrder.push({
          taskId: t.id,
          timingAdvice: `${startHint} · ${formatDuration(t.estimatedMinutes)}`,
          reason: item.reason,
        });
        cumulativeMinutes += t.estimatedMinutes;
      } else {
        unrealisticTodayIds.push(t.id);
        postponeSuggestions.push({
          taskId: t.id,
          suggestedDeadline: addDaysToDateKey(todayKey, 1),
          reason: `Exceeds your ${availableHoursToday}h available today (${formatDuration(cumulativeMinutes)} already queued).`,
        });
      }
    } else if (!dueTodayOrTomorrow && t.priority === 'Can Wait' && deprioritiseSuggestions.length < 2) {
      deprioritiseSuggestions.push({
        taskId: t.id,
        suggestedPriority: 'Can Wait',
        reason: `Due ${formatFriendlyDate(t.deadline, todayKey)}, so it can safely wait while you clear today’s priorities.`,
      });
    }
  }

  // Also check if high-load tomorrow/next days need an early start
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const tomorrowMorningHigh = activeTasks.find(
    (t) => t.deadline === tomorrowKey && t.priority === 'Must Do' && t.estimatedMinutes >= 60
  );
  if (tomorrowMorningHigh && !recommendedOrder.some((r) => r.taskId === tomorrowMorningHigh.id)) {
    recommendedOrder.push({
      taskId: tomorrowMorningHigh.id,
      timingAdvice: `Prep block · ${formatDuration(Math.min(60, tomorrowMorningHigh.estimatedMinutes))}`,
      reason: `Due ${formatFriendlyDateTime(tomorrowMorningHigh.deadline, tomorrowMorningHigh.deadlineTime, todayKey)} with ${formatDuration(tomorrowMorningHigh.estimatedMinutes)} estimated work.`,
    });
  }

  // Detect deadline/time conflicts
  const conflicts: string[] = [];
  const tasksWithTime = activeTasks
    .filter((t) => t.deadline >= todayKey && t.deadlineTime)
    .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime));

  for (let i = 0; i < tasksWithTime.length - 1; i++) {
    const a = tasksWithTime[i];
    const b = tasksWithTime[i + 1];
    if (a.deadline === b.deadline && a.deadlineTime && b.deadlineTime) {
      const [ah, am] = a.deadlineTime.split(':').map(Number);
      const [bh, bm] = b.deadlineTime.split(':').map(Number);
      const diffMins = (bh * 60 + bm) - (ah * 60 + am);
      if (diffMins <= Math.max(60, b.estimatedMinutes)) {
        conflicts.push(
          `"${a.title}" and "${b.title}" have tight deadlines on ${formatFriendlyDate(a.deadline, todayKey)} (${formatFriendlyDateTime(a.deadline, a.deadlineTime, todayKey)} & ${formatFriendlyDateTime(b.deadline, b.deadlineTime, todayKey)}).`
        );
      }
    }
  }

  const followUpsToday = applications.filter(
    (a) => a.followUpDate === todayKey && a.status !== 'Rejected' && a.status !== 'Offer'
  ).length;
  const followUpsTomorrow = applications.filter(
    (a) => a.followUpDate === tomorrowKey && a.status !== 'Rejected' && a.status !== 'Offer'
  ).length;
  const completedTodayCount = tasks.filter(
    (t) =>
      t.completed &&
      (t.completedAt
        ? toDateKeyInTimeZone(new Date(t.completedAt), timeZone) === todayKey
        : t.deadline === todayKey)
  ).length;
  const pendingTodayCount = activeTasks.filter(
    (t) => t.deadline === todayKey || isTaskOverdue(t, now)
  ).length;
  const tomorrowTasks = activeTasks
    .filter((t) => t.deadline === tomorrowKey)
    .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime));
  const leadTaskTitle = topThree[0]
    ? activeTasks.find((t) => t.id === topThree[0].taskId)?.title
    : undefined;
  const nextDayLeadTitle = tomorrowTasks[0]?.title || leadTaskTitle;

  const namePrefix = userName ? `${userName}, ` : '';
  const headlineSummary =
    briefingType === 'evening'
      ? activeTasks.length === 0
        ? `${namePrefix}you wrapped up ${completedTodayCount} task${completedTodayCount === 1 ? '' : 's'} today and cleared your queue. Rest up — tomorrow is wide open.`
        : `${namePrefix}you completed ${completedTodayCount} task${completedTodayCount === 1 ? '' : 's'} today${pendingTodayCount > 0 ? ` with ${pendingTodayCount} still open` : ''}. ${tomorrowTasks.length > 0 ? `Tomorrow features "${nextDayLeadTitle}"${followUpsTomorrow > 0 ? ` and ${followUpsTomorrow} follow-up${followUpsTomorrow === 1 ? '' : 's'}` : ''}.` : `Top carried-over priority for tomorrow: "${nextDayLeadTitle || 'review upcoming deadlines'}".`}`
      : activeTasks.length === 0
        ? `${namePrefix}your task queue is clear — a great window to review applications or plan ahead.`
        : unrealisticTodayIds.length > 0
          ? `${namePrefix}your plate is heavier than your ${availableHoursToday}h window${calendarContext?.connected && calendarBusyMins > 0 ? ` (with ${formatDuration(calendarBusyMins)} on Calendar)` : ''}. Protect "${leadTaskTitle || 'your top priority'}" first and consider shifting overflow items.`
          : `${namePrefix}start with "${leadTaskTitle || 'your top priority'}"${followUpsToday > 0 ? ` and keep time for ${followUpsToday} follow-up${followUpsToday === 1 ? '' : 's'} due today` : ''}${calendarContext?.connected && calendarBusyMins > 0 ? ` around ${formatDuration(calendarBusyMins)} of Calendar events` : ''}. Your workload fits comfortably in your open hours.`;

  return {
    source: 'rule-based',
    briefingType,
    generatedAt: now.toISOString(),
    headlineSummary,
    topThree,
    recommendedOrder: recommendedOrder.slice(0, 5),
    startImmediatelyIds,
    postponeSuggestions,
    unrealisticTodayIds,
    deprioritiseSuggestions,
    conflicts,
  };
}

export async function generateAIDailyPlan(
  tasks: Task[],
  applications: JobApplication[],
  availableHoursToday = 4,
  now: Date = new Date(),
  calendarContext?: PlannerCalendarContext,
  userName?: string,
  briefingTypeOverride?: BriefingType,
  timeZone?: string
): Promise<AIDailyPlan> {
  const briefingType: BriefingType = briefingTypeOverride ?? getBriefingPeriod(now, timeZone);
  const fallback = buildRuleBasedDailyPlan(
    tasks,
    applications,
    availableHoursToday,
    now,
    calendarContext,
    userName,
    briefingType,
    timeZone
  );
  if (tasks.filter((t) => !t.completed).length === 0) {
    return fallback;
  }

  const todayKey = toDateKeyInTimeZone(now, timeZone);
  try {
    const res = await fetch('/api/ai/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todayKey,
        tomorrowKey: addDaysToDateKey(todayKey, 1),
        currentTime: getLocalTimeHHmmInTimeZone(now, timeZone),
        briefingType,
        availableHoursToday,
        userName: userName || undefined,
        calendarContext,
        tasks: tasks.slice(0, 40),
        applications: applications.slice(0, 20),
      }),
    });

    if (!res.ok) return fallback;
    const data = (await res.json()) as { source?: string; plan?: Partial<AIDailyPlan> };
    if (!data.plan || !data.plan.headlineSummary) return fallback;

    const validIds = normalizeValidTaskIdSet(tasks);
    return {
      source: 'gemini',
      briefingType,
      generatedAt: now.toISOString(),
      headlineSummary: data.plan.headlineSummary,
      topThree: (data.plan.topThree ?? []).filter((x) => validIds.has(x.taskId)).slice(0, 3),
      recommendedOrder: (data.plan.recommendedOrder ?? []).filter((x) => validIds.has(x.taskId)),
      startImmediatelyIds: (data.plan.startImmediatelyIds ?? []).filter((id) => validIds.has(id)),
      postponeSuggestions: (data.plan.postponeSuggestions ?? []).filter((x) => validIds.has(x.taskId)),
      unrealisticTodayIds: (data.plan.unrealisticTodayIds ?? []).filter((id) => validIds.has(id)),
      deprioritiseSuggestions: (data.plan.deprioritiseSuggestions ?? [])
        .filter((x) => validIds.has(x.taskId))
        .map((x) => ({
          ...x,
          suggestedPriority: (['Must Do', 'Should Do', 'Can Wait'].includes(x.suggestedPriority)
            ? x.suggestedPriority
            : 'Can Wait') as TaskPriority,
        })),
      conflicts: data.plan.conflicts ?? [],
    };
  } catch {
    return fallback;
  }
}

export function buildRuleBasedReplan(
  tasks: Task[],
  remainingHoursToday: number,
  completedTodayCount: number,
  contextNote?: string,
  now: Date = new Date(),
  userName?: string,
  timeZone?: string
): ReplanResult {
  const todayKey = toDateKeyInTimeZone(now, timeZone);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const activeTasks = tasks.filter((t) => !t.completed);
  const ranked = deterministicPrioritiser.rankTopPriorities(tasks, todayKey, activeTasks.length);

  const todayAndOverdue = ranked.filter(
    (r) => isTaskOverdue(r.task, now) || r.task.deadline === todayKey
  );

  const totalRemainingMinutes = todayAndOverdue.reduce(
    (sum, r) => sum + (r.task.estimatedMinutes || 30) * (r.task.takingLonger ? 1.35 : 1),
    0
  );
  const budgetMinutes = Math.max(30, Math.round(remainingHoursToday * 60));
  const isOverloaded = totalRemainingMinutes > budgetMinutes;

  const suggestions: ReplanSuggestion[] = [];
  let runningMinutes = 0;
  let nextUpTaskId: string | undefined;
  let nextUpReason: string | undefined;

  for (const item of todayAndOverdue) {
    const t = item.task;
    const adjustedMins = Math.round((t.estimatedMinutes || 30) * (t.takingLonger ? 1.35 : 1));

    if (!nextUpTaskId) {
      nextUpTaskId = t.id;
      nextUpReason = t.takingLonger
        ? `Taking longer than expected and ${item.reason.toLowerCase()} — finish this first before switching context.`
        : `Highest impact remaining task (${item.reason}).`;
      runningMinutes += adjustedMins;
      continue;
    }

    if (runningMinutes + adjustedMins <= budgetMinutes || t.priority === 'Must Do') {
      runningMinutes += adjustedMins;
      suggestions.push({
        id: `replan-keep-${t.id}`,
        taskId: t.id,
        type: 'keep_focus',
        reason: `Keep for today (${formatDuration(adjustedMins)}) — ${item.reason}.`,
      });
    } else {
      const targetDate = t.deadline <= todayKey ? tomorrowKey : addDaysToDateKey(t.deadline, 1);
      suggestions.push({
        id: `replan-move-${t.id}`,
        taskId: t.id,
        type: t.priority === 'Can Wait' ? 'deprioritise' : 'move_date',
        suggestedDeadline: targetDate,
        suggestedPriority: t.priority === 'Should Do' ? 'Can Wait' : t.priority,
        reason: `Moving to ${formatFriendlyDate(targetDate, todayKey)} frees ${formatDuration(adjustedMins)} so you stay realistic inside your remaining ${remainingHoursToday}h today.`,
      });
    }
  }

  const overloadExplanation = isOverloaded
    ? `You have roughly ${formatDuration(Math.round(totalRemainingMinutes))} of work left for today across ${todayAndOverdue.length} tasks, compared to ${remainingHoursToday}h remaining.`
    : `Your remaining ${formatDuration(Math.round(totalRemainingMinutes))} fits within the ${remainingHoursToday}h you have left today.`;

  const realisticLead = userName
    ? `${userName}, here's what realistically fits into your day.`
    : "Here's what realistically fits into your day.";

  const summary =
    todayAndOverdue.length === 0
      ? `${realisticLead} You've completed ${completedTodayCount} task(s) today and have no remaining deadlines for today.`
      : isOverloaded
        ? `${realisticLead} You've completed ${completedTodayCount} task(s) today${contextNote ? ` (${contextNote})` : ''}. Let's protect your most urgent deadline and shift lower-urgency items.`
        : `${realisticLead} You've completed ${completedTodayCount} task(s) today and are on track to finish your remaining ${todayAndOverdue.length} task(s) in ${remainingHoursToday}h.`;

  return {
    source: 'rule-based',
    generatedAt: now.toISOString(),
    summary,
    isOverloaded,
    overloadExplanation,
    nextUpTaskId,
    nextUpReason,
    suggestions,
  };
}

export async function generateReplanMyDay(
  tasks: Task[],
  remainingHoursToday: number,
  completedTodayCount: number,
  contextNote?: string,
  now: Date = new Date(),
  userName?: string,
  timeZone?: string
): Promise<ReplanResult> {
  const fallback = buildRuleBasedReplan(
    tasks,
    remainingHoursToday,
    completedTodayCount,
    contextNote,
    now,
    userName,
    timeZone
  );

  const activeTasks = tasks.filter((t) => !t.completed);
  if (activeTasks.length === 0) return fallback;

  try {
    const res = await fetch('/api/ai/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todayKey: toDateKeyInTimeZone(now, timeZone),
        currentTime: getLocalTimeHHmmInTimeZone(now, timeZone),
        remainingHoursToday,
        completedTodayCount,
        userName: userName || undefined,
        contextNote,
        tasks: activeTasks.slice(0, 35),
      }),
    });

    if (!res.ok) return fallback;
    const data = (await res.json()) as { source?: string; replan?: Partial<ReplanResult> };
    if (!data.replan || !data.replan.summary) return fallback;

    const validIds = normalizeValidTaskIdSet(tasks);
    return {
      source: 'gemini',
      generatedAt: now.toISOString(),
      summary: data.replan.summary,
      isOverloaded: Boolean(data.replan.isOverloaded),
      overloadExplanation: data.replan.overloadExplanation || fallback.overloadExplanation,
      nextUpTaskId:
        data.replan.nextUpTaskId && validIds.has(data.replan.nextUpTaskId)
          ? data.replan.nextUpTaskId
          : fallback.nextUpTaskId,
      nextUpReason: data.replan.nextUpReason || fallback.nextUpReason,
      suggestions: (data.replan.suggestions ?? [])
        .filter((s) => validIds.has(s.taskId))
        .map((s, idx) => ({
          id: s.id || `gem-sug-${idx}`,
          taskId: s.taskId,
          type:
            s.type === 'move_date' || s.type === 'deprioritise' || s.type === 'keep_focus'
              ? s.type
              : 'move_date',
          suggestedDeadline: s.suggestedDeadline,
          suggestedPriority:
            s.suggestedPriority &&
            (['Must Do', 'Should Do', 'Can Wait'] as TaskPriority[]).includes(s.suggestedPriority)
              ? s.suggestedPriority
              : undefined,
          reason: s.reason,
        })),
    };
  } catch {
    return fallback;
  }
}
