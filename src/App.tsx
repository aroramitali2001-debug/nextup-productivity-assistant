import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Briefcase,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Plug,
  Plus,
} from 'lucide-react';
import { ApplicationFormModal } from './components/ApplicationFormModal';
import { ApplicationSuggestionsModal } from './components/ApplicationSuggestionsModal';
import { MiddayCheckInModal } from './components/MiddayCheckInModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import { PreferencesModal } from './components/PreferencesModal';
import { ReplanDayModal } from './components/ReplanDayModal';
import { TaskFormModal } from './components/TaskFormModal';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import {
  buildRuleBasedDailyPlan,
  generateAIDailyPlan,
  generateReplanMyDay,
  PlannerCalendarContext,
} from './services/aiPlanner';
import {
  generateAICareerInsights,
  getCuratedCareerInsights,
} from './services/careerGuidance';
import {
  suggestFollowUpForNewApplication,
  suggestTasksForStatusChange,
} from './services/applicationIntelligence';
import {
  buildBriefingEmailContent,
  buildTaskReminderEmailContent,
  buildTaskReminderKey,
  computeTaskReminderTriggerDate,
  getSentReminderKeys,
  hasSentMorningBriefingToday,
  markMorningBriefingSentToday,
  markReminderKeySent,
  sendGmailMessage,
} from './services/emailReminders';
import {
  computeWorkloadMetrics,
  detectOverloadedDays,
  getFollowUpsDue,
} from './services/prioritiser';
import { isSampleApplication, isSampleTask, storageService } from './services/storage';
import {
  formatFirebaseAuthError,
  GoogleSignInMode,
  googleSignIn,
  googleSignOut,
  hasCalendarPermission,
  hasGmailReadPermission,
  hasGmailSendPermission,
  hasSheetsPermission,
  initGoogleAuth,
} from './services/googleAuth';
import { CalendarEventItem, fetchTodayCalendarEvents } from './services/workspaceApis';
import {
  formatDuration,
  formatFriendlyDateTime,
  getBriefingPeriod,
  getLocalTimeHHmmInTimeZone,
  parseDateTimeLocal,
} from './utils/dateUtils';
import { extractFirstName, isPlaceholderName, resolveUserFirstName } from './utils/userName';
import {
  AIDailyPlan,
  ApplicationStatus,
  ApplicationViewFilter,
  BriefingType,
  CareerFocusCategory,
  CareerInsightsPlan,
  JobApplication,
  NavTab,
  ReplanResult,
  StudentProfile,
  SuggestedTaskDraft,
  Task,
  TaskCategory,
  TaskPriority,
  TaskViewFilter,
} from './types/nextup';
import { addDaysToDateKey, getHoursRemainingInDay, toLocalDateKey } from './utils/dateUtils';
import { ApplicationsView } from './views/ApplicationsView';
import { DashboardView } from './views/DashboardView';
import { IntegrationsView } from './views/IntegrationsView';
import { TasksView } from './views/TasksView';
import { UpcomingView } from './views/UpcomingView';

const NAV_ITEMS: { key: NavTab; label: string; mobileLabel: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard },
  { key: 'tasks', label: 'My Tasks', mobileLabel: 'Tasks', icon: CheckSquare },
  { key: 'applications', label: 'Applications', mobileLabel: 'Apps', icon: Briefcase },
  { key: 'upcoming', label: 'Calendar', mobileLabel: 'Calendar', icon: CalendarDays },
  { key: 'integrations', label: 'Integrations', mobileLabel: 'Connect', icon: Plug },
];

export default function App() {
  const initialData = useMemo(() => storageService.loadInitialData(), []);

  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [applications, setApplications] = useState<JobApplication[]>(initialData.applications);
  const [profile, setProfile] = useState<StudentProfile>(initialData.profile);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [taskViewFilter, setTaskViewFilter] = useState<TaskViewFilter>('today');
  const [appViewFilter, setAppViewFilter] = useState<ApplicationViewFilter>('All');

  // Task & App Form Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string | undefined>(undefined);

  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);

  // AI Daily Planner & Replan & Midday Check-in
  const [autoBriefingPeriod, setAutoBriefingPeriod] = useState<BriefingType>(() =>
    getBriefingPeriod(new Date(), initialData.profile.timezone)
  );
  const [manualBriefingMode, setManualBriefingMode] = useState<BriefingType | null>(null);
  const briefingMode: BriefingType = manualBriefingMode ?? autoBriefingPeriod;

  useEffect(() => {
    const syncPeriod = () => {
      const nextPeriod = getBriefingPeriod(new Date(), profile.timezone);
      setAutoBriefingPeriod((prev) => {
        if (prev !== nextPeriod) {
          setManualBriefingMode(null);
        }
        return nextPeriod;
      });
    };
    syncPeriod();
    const timer = window.setInterval(syncPeriod, 60_000);
    return () => window.clearInterval(timer);
  }, [profile.timezone]);
  const [aiPlansByMode, setAiPlansByMode] = useState<Partial<Record<BriefingType, AIDailyPlan>>>({});
  const [dismissedPlanKeys, setDismissedPlanKeys] = useState<Set<string>>(new Set());
  const [isPlanningAI, setIsPlanningAI] = useState(false);

  // Career Focus & AI Career Insights
  const [aiCareerInsightsByKey, setAiCareerInsightsByKey] = useState<
    Record<string, CareerInsightsPlan>
  >({});
  const [isLoadingCareerInsights, setIsLoadingCareerInsights] = useState(false);

  const [replanModalOpen, setReplanModalOpen] = useState(false);
  const [replanResult, setReplanResult] = useState<ReplanResult | null>(null);
  const [isReplanning, setIsReplanning] = useState(false);
  const [remainingHoursToday, setRemainingHoursToday] = useState<number>(() =>
    Math.min(profile.availableHoursToday ?? 4, getHoursRemainingInDay())
  );

  const [middayModalOpen, setMiddayModalOpen] = useState(false);

  // Application Suggestions Modal
  const [appSuggestionState, setAppSuggestionState] = useState<{
    isOpen: boolean;
    mode: 'new_followup' | 'status_change' | 'rejection_reflection';
    application: JobApplication | null;
    newStatus?: ApplicationStatus;
    drafts: SuggestedTaskDraft[];
  }>({
    isOpen: false,
    mode: 'new_followup',
    application: null,
    drafts: [],
  });

  // Lightweight undo toast
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);

  // Google Workspace Auth & Calendar State (access token held strictly in memory)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authOfferRedirect, setAuthOfferRedirect] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [calendarBusyMinutes, setCalendarBusyMinutes] = useState(0);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [planAcceptedToday, setPlanAcceptedToday] = useState(false);
  const [pendingManualReminderTask, setPendingManualReminderTask] = useState<Task | null>(null);
  const [isSendingManualEmail, setIsSendingManualEmail] = useState(false);

  const sendingReminderKeysRef = useRef<Set<string>>(new Set());
  const sendingBriefingRef = useRef(false);

  const firstName = useMemo(
    () => resolveUserFirstName(profile.name, googleUser?.displayName),
    [profile.name, googleUser?.displayName]
  );

  const calendarConnected = Boolean(
    googleUser && accessToken && hasCalendarPermission(grantedScopes)
  );
  const sheetsConnected = Boolean(
    googleUser && accessToken && hasSheetsPermission(grantedScopes)
  );
  const gmailReadConnected = Boolean(
    googleUser && accessToken && hasGmailReadPermission(grantedScopes)
  );
  const emailSetupReady = Boolean(
    googleUser &&
      accessToken &&
      googleUser.emailVerified &&
      googleUser.email &&
      hasGmailSendPermission(grantedScopes)
  );

  useEffect(() => {
    storageService.saveTasks(tasks);
    // Invalidate stale Gemini override when task list changes so plan stays accurate
    setAiPlansByMode({});
  }, [tasks]);

  useEffect(() => {
    storageService.saveApplications(applications);
  }, [applications]);

  useEffect(() => {
    storageService.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refreshCalendar = useCallback(
    async (tokenOverride?: string, scopesOverride?: string[]) => {
      const token = tokenOverride ?? accessToken;
      const scopesToCheck = scopesOverride ?? grantedScopes;
      if (!token || !hasCalendarPermission(scopesToCheck)) return;
      setIsLoadingCalendar(true);
      try {
        const res = await fetchTodayCalendarEvents(token);
        setCalendarEvents(res.events);
        setCalendarBusyMinutes(res.busyMinutes);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load Calendar events';
        setToast({ message });
      } finally {
        setIsLoadingCalendar(false);
      }
    },
    [accessToken, grantedScopes]
  );

  useEffect(() => {
    const unsubscribe = initGoogleAuth({
      onRedirectPendingChange: (pending) => {
        setIsSigningIn(pending);
      },
      onAuthSuccess: (user, token, scopes, meta) => {
        setGoogleUser(user);
        setAccessToken(token);
        setGrantedScopes(scopes);
        setAuthError(null);
        setAuthOfferRedirect(false);
        const authFirst = extractFirstName(user.displayName);
        if (authFirst) {
          setProfile((prev) =>
            isPlaceholderName(prev.name) ? { ...prev, name: authFirst } : prev
          );
        }
        if (meta?.fromRedirect) {
          if (meta.returnTab === 'integrations') {
            setActiveTab('integrations');
          }
          setToast({
            message: authFirst
              ? `Welcome, ${authFirst}! Connected Google account (${user.email ?? 'signed in'})`
              : `Connected Google account (${user.email ?? 'signed in'})`,
          });
          if (hasCalendarPermission(scopes)) {
            void refreshCalendar(token, scopes);
          }
        }
      },
      onAuthClear: (user) => {
        setGoogleUser(user);
        setAccessToken(null);
        setGrantedScopes([]);
        setCalendarEvents([]);
        setCalendarBusyMinutes(0);
      },
      onAuthError: (errorInfo, returnTab) => {
        setAuthError(errorInfo.message);
        setAuthOfferRedirect(errorInfo.offerRedirect);
        if (returnTab === 'integrations') {
          setActiveTab('integrations');
        }
        setToast({ message: errorInfo.message });
      },
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleSignIn = useCallback(
    async (mode: GoogleSignInMode = 'auto') => {
      setIsSigningIn(true);
      setAuthError(null);
      setAuthOfferRedirect(false);
      try {
        const res = await googleSignIn(mode, activeTab);
        if (res.status === 'redirecting') {
          // Browser is navigating away to Google sign-in
          return;
        }

        const { user, accessToken: freshToken, grantedScopes: freshScopes } = res;
        setGoogleUser(user);
        setAccessToken(freshToken);
        setGrantedScopes(freshScopes);
        const authFirst = extractFirstName(user.displayName);
        if (authFirst) {
          setProfile((prev) =>
            isPlaceholderName(prev.name) ? { ...prev, name: authFirst } : prev
          );
        }
        setToast({
          message: authFirst
            ? `Welcome, ${authFirst}! Connected Google account (${user.email ?? 'signed in'})`
            : `Connected Google account (${user.email ?? 'signed in'})`,
        });
        await refreshCalendar(freshToken, freshScopes);
      } catch (err) {
        const info = formatFirebaseAuthError(err);
        setAuthError(info.message);
        setAuthOfferRedirect(info.offerRedirect);
        setToast({ message: info.message });
      } finally {
        setIsSigningIn(false);
      }
    },
    [refreshCalendar, activeTab]
  );

  const handleGoogleSignOut = useCallback(async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    setGrantedScopes([]);
    setCalendarEvents([]);
    setCalendarBusyMinutes(0);
    setAuthError(null);
    setAuthOfferRedirect(false);
    setToast({ message: 'Disconnected Google Workspace' });
  }, []);

  const today = toLocalDateKey();

  const calendarContext: PlannerCalendarContext = useMemo(
    () => ({
      connected: calendarConnected,
      busyMinutes: calendarBusyMinutes,
      events: calendarEvents.map((e) => ({
        summary: e.summary,
        startIso: e.startIso,
        durationMinutes: e.durationMinutes,
      })),
    }),
    [calendarConnected, calendarBusyMinutes, calendarEvents]
  );

  const overloadedDays = useMemo(
    () => detectOverloadedDays(tasks, profile.dailyTaskWarningThreshold, 240, today),
    [tasks, profile.dailyTaskWarningThreshold, today]
  );

  const { dueToday: followUpsDueToday, overdue: followUpsOverdue } = useMemo(
    () => getFollowUpsDue(applications, today),
    [applications, today]
  );

  const workloadMetrics = useMemo(
    () => computeWorkloadMetrics(tasks, profile.availableHoursToday ?? 4),
    [tasks, profile.availableHoursToday]
  );

  const activeDailyPlan = useMemo(() => {
    const modeOverride = aiPlansByMode[briefingMode];
    const base =
      modeOverride && modeOverride.briefingType === briefingMode
        ? modeOverride
        : buildRuleBasedDailyPlan(
            tasks,
            applications,
            profile.availableHoursToday ?? 4,
            new Date(),
            calendarContext,
            firstName,
            briefingMode,
            profile.timezone
          );

    return {
      ...base,
      postponeSuggestions: base.postponeSuggestions.filter(
        (s) => !dismissedPlanKeys.has(`postpone:${s.taskId}`)
      ),
      deprioritiseSuggestions: base.deprioritiseSuggestions.filter(
        (s) => !dismissedPlanKeys.has(`deprioritise:${s.taskId}`)
      ),
    };
  }, [
    aiPlansByMode,
    briefingMode,
    tasks,
    applications,
    profile.availableHoursToday,
    profile.timezone,
    calendarContext,
    firstName,
    dismissedPlanKeys,
  ]);

  const careerFocus: CareerFocusCategory = profile.careerFocus || 'Product Management';
  const customCareerFocus = profile.customCareerFocus || '';
  const careerInsightCacheKey =
    careerFocus === 'Other'
      ? `Other::${customCareerFocus.trim().toLowerCase()}`
      : careerFocus;

  const activeCareerInsights = useMemo(() => {
    const aiCached = aiCareerInsightsByKey[careerInsightCacheKey];
    if (aiCached) return aiCached;
    return getCuratedCareerInsights(
      careerFocus,
      customCareerFocus,
      applications,
      tasks,
      firstName
    );
  }, [
    aiCareerInsightsByKey,
    careerInsightCacheKey,
    careerFocus,
    customCareerFocus,
    applications,
    tasks,
    firstName,
  ]);

  const handleSelectCareerFocus = useCallback((category: CareerFocusCategory) => {
    setProfile((prev) => ({ ...prev, careerFocus: category }));
    setToast({ message: `Career focus updated to ${category}` });
  }, []);

  const handleChangeCustomCareerFocus = useCallback((value: string) => {
    setProfile((prev) => ({ ...prev, customCareerFocus: value }));
  }, []);

  const handleRefreshCareerInsights = useCallback(async () => {
    setIsLoadingCareerInsights(true);
    const result = await generateAICareerInsights(
      careerFocus,
      customCareerFocus,
      applications,
      tasks,
      firstName
    );
    setAiCareerInsightsByKey((prev) => ({ ...prev, [careerInsightCacheKey]: result }));
    setIsLoadingCareerInsights(false);
    setToast({
      message:
        result.source === 'gemini'
          ? `AI Career Insights updated for ${careerFocus === 'Other' && customCareerFocus.trim() ? customCareerFocus.trim() : careerFocus}`
          : `Career insights refreshed for ${careerFocus}`,
    });
  }, [careerFocus, customCareerFocus, applications, tasks, firstName, careerInsightCacheKey]);

  // Task handlers
  const handleQuickAddTask = useCallback(
    (
      title: string,
      category: TaskCategory,
      priority: TaskPriority,
      deadline: string,
      deadlineTime?: string,
      estimatedMinutes = 30
    ) => {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        category,
        deadline,
        deadlineTime,
        priority,
        estimatedMinutes,
        completed: false,
        createdAt: new Date().toISOString(),
        isSample: false,
      };
      setTasks((prev) => [newTask, ...prev]);
      setToast({ message: `Added "${title}"` });
    },
    []
  );

  const handleSaveTask = useCallback(
    (data: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>, existingId?: string) => {
      if (existingId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === existingId ? { ...t, ...data, isSample: false } : t))
        );
        setToast({ message: 'Task updated' });
      } else {
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...data,
          completed: false,
          createdAt: new Date().toISOString(),
          isSample: false,
        };
        setTasks((prev) => [newTask, ...prev]);
        setToast({ message: `Added "${data.title}"` });
      }
    },
    []
  );

  const handleToggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              takingLonger: !t.completed ? false : t.takingLonger,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }, []);

  const handleToggleTakingLonger = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, takingLonger: !t.takingLonger } : t))
    );
  }, []);

  const handleDeleteTask = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (target) {
        setToast({
          message: `Deleted "${target.title}"`,
          undo: () => setTasks((prev) => [target, ...prev]),
        });
      }
    },
    [tasks]
  );

  const handleRescheduleTaskToday = useCallback(
    (id: string) => {
      const nowMs = Date.now();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const timePassedToday =
            Boolean(t.deadlineTime) &&
            parseDateTimeLocal(today, t.deadlineTime).getTime() <= nowMs;
          return {
            ...t,
            deadline: today,
            deadlineTime: timePassedToday ? undefined : t.deadlineTime,
          };
        })
      );
      setToast({ message: 'Moved deadline to Today' });
    },
    [today]
  );

  // AI Daily Planner actions
  const handleRefreshAIPlan = useCallback(async () => {
    setIsPlanningAI(true);
    setDismissedPlanKeys(new Set());
    const plan = await generateAIDailyPlan(
      tasks,
      applications,
      profile.availableHoursToday ?? 4,
      new Date(),
      calendarContext,
      firstName,
      briefingMode,
      profile.timezone
    );
    setAiPlansByMode((prev) => ({ ...prev, [briefingMode]: plan }));
    setIsPlanningAI(false);
    const label = briefingMode === 'evening' ? 'Evening briefing' : 'Morning briefing';
    setToast({
      message:
        plan.source === 'gemini'
          ? `${label} updated${firstName ? ` for ${firstName}` : ''}`
          : `${label} updated with local rules`,
    });
  }, [
    tasks,
    applications,
    profile.availableHoursToday,
    profile.timezone,
    briefingMode,
    calendarContext,
    firstName,
  ]);

  const handleApprovePostpone = useCallback(
    (taskId: string, newDeadline: string) => {
      const nowMs = Date.now();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const timePassedOnTarget =
            newDeadline === today &&
            Boolean(t.deadlineTime) &&
            parseDateTimeLocal(newDeadline, t.deadlineTime).getTime() <= nowMs;
          return {
            ...t,
            deadline: newDeadline,
            deadlineTime: timePassedOnTarget ? undefined : t.deadlineTime,
          };
        })
      );
      setToast({ message: 'Task deadline updated' });
    },
    [today]
  );

  const handleApproveDeprioritise = useCallback((taskId: string, newPriority: TaskPriority) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    setToast({ message: `Priority updated to ${newPriority}` });
  }, []);

  const handleAcceptPlan = useCallback(() => {
    if (activeDailyPlan.postponeSuggestions.length > 0) {
      const postponeMap = new Map(
        activeDailyPlan.postponeSuggestions.map((s) => [s.taskId, s.suggestedDeadline])
      );
      setTasks((prev) =>
        prev.map((t) => {
          const nextDeadline = postponeMap.get(t.id);
          return nextDeadline ? { ...t, deadline: nextDeadline } : t;
        })
      );
    }
    setPlanAcceptedToday(true);
    setToast({
      message: firstName
        ? `${firstName}, your plan for today is confirmed!`
        : "Today's suggested plan is confirmed!",
    });
  }, [activeDailyPlan.postponeSuggestions, firstName]);

  const handleDismissPlanSuggestion = useCallback(
    (taskId: string, kind: 'postpone' | 'deprioritise') => {
      setDismissedPlanKeys((prev) => new Set(prev).add(`${kind}:${taskId}`));
    },
    []
  );

  // Replan My Day actions
  const runReplan = useCallback(
    async (hrs: number) => {
      setIsReplanning(true);
      const completedToday = tasks.filter(
        (t) =>
          t.completed &&
          (t.completedAt ? toLocalDateKey(new Date(t.completedAt)) === today : t.deadline === today)
      ).length;
      const result = await generateReplanMyDay(
        tasks,
        hrs,
        completedToday,
        undefined,
        new Date(),
        firstName,
        profile.timezone
      );
      setReplanResult(result);
      setIsReplanning(false);
    },
    [tasks, today, firstName, profile.timezone]
  );

  const handleOpenReplan = useCallback(() => {
    const initialHrs = Math.min(profile.availableHoursToday ?? 4, getHoursRemainingInDay());
    setRemainingHoursToday(initialHrs);
    setReplanModalOpen(true);
    void runReplan(initialHrs);
  }, [profile.availableHoursToday, runReplan]);

  const handleApplyReplanSuggestion = useCallback(
    (
      taskId: string,
      updates: { deadline?: string; priority?: TaskPriority; reasonNote?: string }
    ) => {
      const nowMs = Date.now();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const nextNotes = updates.reasonNote
            ? [t.notes, `Replan note: ${updates.reasonNote}`].filter(Boolean).join('\n')
            : t.notes;
          const nextDeadline = updates.deadline ?? t.deadline;
          const timePassedOnTarget =
            nextDeadline === today &&
            Boolean(t.deadlineTime) &&
            parseDateTimeLocal(nextDeadline, t.deadlineTime).getTime() <= nowMs;
          return {
            ...t,
            deadline: nextDeadline,
            deadlineTime: timePassedOnTarget ? undefined : t.deadlineTime,
            priority: updates.priority ?? t.priority,
            notes: nextNotes,
          };
        })
      );
      setToast({ message: 'Schedule adjustment applied' });
    },
    [today]
  );

  const handleApplyAllReplan = useCallback(
    (
      batch: { taskId: string; deadline?: string; priority?: TaskPriority; reasonNote?: string }[]
    ) => {
      const nowMs = Date.now();
      const updateMap = new Map(batch.map((b) => [b.taskId, b]));
      setTasks((prev) =>
        prev.map((t) => {
          const u = updateMap.get(t.id);
          if (!u) return t;
          const nextNotes = u.reasonNote
            ? [t.notes, `Replan note: ${u.reasonNote}`].filter(Boolean).join('\n')
            : t.notes;
          const nextDeadline = u.deadline ?? t.deadline;
          const timePassedOnTarget =
            nextDeadline === today &&
            Boolean(t.deadlineTime) &&
            parseDateTimeLocal(nextDeadline, t.deadlineTime).getTime() <= nowMs;
          return {
            ...t,
            deadline: nextDeadline,
            deadlineTime: timePassedOnTarget ? undefined : t.deadlineTime,
            priority: u.priority ?? t.priority,
            notes: nextNotes,
          };
        })
      );
      setToast({ message: `Applied ${batch.length} schedule updates` });
    },
    [today]
  );

  // Application handlers + Intelligent Follow-up & Status Suggestions
  const triggerStatusIntelligence = useCallback(
    (app: JobApplication, newStatus: ApplicationStatus) => {
      if (newStatus === 'Rejected') {
        setAppSuggestionState({
          isOpen: true,
          mode: 'rejection_reflection',
          application: app,
          newStatus,
          drafts: [],
        });
        return;
      }
      const drafts = suggestTasksForStatusChange(app, newStatus);
      if (drafts.length > 0) {
        setAppSuggestionState({
          isOpen: true,
          mode: 'status_change',
          application: app,
          newStatus,
          drafts,
        });
      }
    },
    []
  );

  const handleSaveApplication = useCallback(
    (
      data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      const now = new Date().toISOString();
      if (existingId) {
        const previous = applications.find((a) => a.id === existingId);
        const updatedApp: JobApplication = {
          ...(previous as JobApplication),
          ...data,
          id: existingId,
          updatedAt: now,
          isSample: false,
        };
        setApplications((prev) =>
          prev.map((a) => (a.id === existingId ? updatedApp : a))
        );
        setToast({ message: `${data.company} application updated` });
        if (previous && previous.status !== data.status) {
          triggerStatusIntelligence(updatedApp, data.status);
        }
      } else {
        const newApp: JobApplication = {
          id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...data,
          createdAt: now,
          updatedAt: now,
          isSample: false,
        };
        setApplications((prev) => [newApp, ...prev]);
        setToast({ message: `Tracking ${data.company}` });

        // Suggest follow-up task with user confirmation
        const followUpDraft = suggestFollowUpForNewApplication(newApp);
        setAppSuggestionState({
          isOpen: true,
          mode: 'new_followup',
          application: newApp,
          drafts: [followUpDraft],
        });
      }
    },
    [applications, triggerStatusIntelligence]
  );

  const handleDeleteApplication = useCallback(
    (id: string) => {
      const target = applications.find((a) => a.id === id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      if (target) {
        setToast({
          message: `Removed ${target.company}`,
          undo: () => setApplications((prev) => [target, ...prev]),
        });
      }
    },
    [applications]
  );

  const handleUpdateApplicationStatus = useCallback(
    (id: string, status: ApplicationStatus) => {
      const target = applications.find((a) => a.id === id);
      if (!target || target.status === status) return;
      const updatedApp: JobApplication = {
        ...target,
        status,
        updatedAt: new Date().toISOString(),
        isSample: false,
      };
      setApplications((prev) => prev.map((a) => (a.id === id ? updatedApp : a)));
      triggerStatusIntelligence(updatedApp, status);
    },
    [applications, triggerStatusIntelligence]
  );

  const handleApproveSuggestedTasks = useCallback((drafts: SuggestedTaskDraft[]) => {
    const nowIso = new Date().toISOString();
    const created: Task[] = drafts.map((d, idx) => ({
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: d.title,
      category: d.category,
      deadline: d.deadline,
      deadlineTime: d.deadlineTime,
      priority: d.priority,
      estimatedMinutes: d.estimatedMinutes,
      notes: d.notes,
      completed: false,
      createdAt: nowIso,
      isSample: false,
    }));
    setTasks((prev) => [...created, ...prev]);
    setToast({
      message: `Created ${created.length} suggested ${created.length === 1 ? 'task' : 'tasks'}`,
    });
  }, []);

  const handleSaveRejectionReflection = useCallback((appId: string, reflection: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              reflectionNote: reflection || undefined,
              updatedAt: new Date().toISOString(),
              isSample: false,
            }
          : a
      )
    );
    if (reflection) {
      setToast({ message: 'Reflection saved' });
    }
  }, []);

  const handleSnoozeFollowUp = useCallback(
    (appId: string, days: number) => {
      const nextDate = addDaysToDateKey(today, days);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, followUpDate: nextDate, updatedAt: new Date().toISOString(), isSample: false }
            : a
        )
      );
      setToast({ message: `Follow-up moved +${days} days` });
    },
    [today]
  );

  const openNewTaskModal = useCallback((defaultDate?: string) => {
    setEditingTask(null);
    setTaskDefaultDate(defaultDate);
    setTaskModalOpen(true);
  }, []);

  const openEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskDefaultDate(undefined);
    setTaskModalOpen(true);
  }, []);

  const openNewAppModal = useCallback(() => {
    setEditingApp(null);
    setAppModalOpen(true);
  }, []);

  const openEditAppModal = useCallback((app: JobApplication) => {
    setEditingApp(app);
    setAppModalOpen(true);
  }, []);

  const handleNavigateTab = useCallback(
    (tab: NavTab, taskFilter?: TaskViewFilter, appFilter?: ApplicationViewFilter) => {
      setActiveTab(tab);
      if (taskFilter) setTaskViewFilter(taskFilter);
      if (appFilter) setAppViewFilter(appFilter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleResetSampleData = useCallback(() => {
    const sample = storageService.resetToSampleData();
    setTasks(sample.tasks);
    setApplications(sample.applications);
    setToast({ message: 'Sample student data restored' });
  }, []);

  const handleClearAllData = useCallback(() => {
    storageService.clearAllData();
    setTasks([]);
    setApplications([]);
    setToast({ message: 'Workspace cleared' });
  }, []);

  const handleClearSampleTasks = useCallback(() => {
    const snapshot = tasks;
    const removedCount = tasks.filter(isSampleTask).length;
    if (removedCount === 0) return;
    setTasks((prev) => prev.filter((t) => !isSampleTask(t)));
    setToast({
      message: `Cleared ${removedCount} sample ${removedCount === 1 ? 'task' : 'tasks'}`,
      undo: () => setTasks(snapshot),
    });
  }, [tasks]);

  const handleClearSampleApplications = useCallback(() => {
    const snapshot = applications;
    const removedCount = applications.filter(isSampleApplication).length;
    if (removedCount === 0) return;
    setApplications((prev) => prev.filter((a) => !isSampleApplication(a)));
    setToast({
      message: `Cleared ${removedCount} sample ${removedCount === 1 ? 'application' : 'applications'}`,
      undo: () => setApplications(snapshot),
    });
  }, [applications]);

  const handleCreateTaskFromIntegration = useCallback(
    (draft: {
      title: string;
      category: Task['category'];
      priority: Task['priority'];
      deadline: string;
      estimatedMinutes: number;
      notes?: string;
    }) => {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: draft.title,
        category: draft.category,
        deadline: draft.deadline,
        priority: draft.priority,
        estimatedMinutes: draft.estimatedMinutes,
        notes: draft.notes,
        completed: false,
        createdAt: new Date().toISOString(),
        isSample: false,
      };
      setTasks((prev) => [newTask, ...prev]);
      setToast({ message: `Added task "${draft.title}"` });
    },
    []
  );

  const handleImportApplications = useCallback(
    (imported: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const now = new Date().toISOString();
      const existingKeys = new Set(
        applications.map(
          (a) => `${a.company.trim().toLowerCase()}::${a.role.trim().toLowerCase()}`
        )
      );
      const toAdd: JobApplication[] = [];
      for (const item of imported) {
        const key = `${item.company.trim().toLowerCase()}::${item.role.trim().toLowerCase()}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        toAdd.push({
          id: `app-${Date.now()}-${toAdd.length}-${Math.random().toString(36).slice(2, 6)}`,
          ...item,
          createdAt: now,
          updatedAt: now,
          isSample: false,
        });
      }
      if (toAdd.length > 0) {
        setApplications((prev) => [...toAdd, ...prev]);
      }
      setToast({
        message:
          toAdd.length > 0
            ? `Imported ${toAdd.length} ${toAdd.length === 1 ? 'application' : 'applications'} from Google Sheets`
            : 'All rows from that sheet are already in your tracker',
      });
    },
    [applications]
  );

  // Open deep-linked task from email reminder URL (?task=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('task');
    if (!taskIdParam) return;
    const match = tasks.find((t) => t.id === taskIdParam);
    if (match) {
      setEditingTask(match);
      setTaskModalOpen(true);
    }
    params.delete('task');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMorningBriefingEmailNow = useCallback(async () => {
    if (!emailSetupReady || !accessToken || !googleUser?.email) {
      throw new Error('Email reminders setup required.');
    }
    const sendNow = new Date();
    const { subject, body, briefingType } = buildBriefingEmailContent(
      firstName,
      tasks,
      applications,
      activeDailyPlan,
      profile.availableHoursToday ?? 4,
      calendarBusyMinutes,
      Boolean(googleUser && accessToken),
      window.location.origin,
      sendNow,
      profile.timezone
    );
    await sendGmailMessage(accessToken, googleUser.email, subject, body);
    markMorningBriefingSentToday(sendNow, profile.timezone);
    setToast({
      message: `Sent ${briefingType === 'evening' ? 'Evening' : 'Morning'} Briefing email to ${googleUser.email}`,
    });
  }, [
    emailSetupReady,
    accessToken,
    googleUser,
    firstName,
    tasks,
    applications,
    activeDailyPlan,
    profile.availableHoursToday,
    profile.timezone,
    calendarBusyMinutes,
  ]);

  const handleConfirmSendTaskReminderNow = useCallback(async () => {
    if (!pendingManualReminderTask || !emailSetupReady || !accessToken || !googleUser?.email) {
      return;
    }
    const target = pendingManualReminderTask;
    const key = buildTaskReminderKey(target);
    setIsSendingManualEmail(true);
    try {
      const sendNow = new Date();
      const { subject, body } = buildTaskReminderEmailContent(
        target,
        firstName,
        window.location.origin,
        sendNow,
        profile.timezone
      );
      await sendGmailMessage(accessToken, googleUser.email, subject, body);
      markReminderKeySent(key);
      const sentAt = sendNow.toISOString();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === target.id ? { ...t, lastReminderSentKey: key, lastReminderSentAt: sentAt } : t
        )
      );
      setToast({ message: `Sent reminder email to ${googleUser.email}` });
      setPendingManualReminderTask(null);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to send email reminder.',
      });
    } finally {
      setIsSendingManualEmail(false);
    }
  }, [pendingManualReminderTask, emailSetupReady, accessToken, googleUser, firstName, profile.timezone]);

  // Duplicate-safe automatic email reminder scheduler (requires explicit opt-in & verified email)
  useEffect(() => {
    if (!emailSetupReady || !profile.emailRemindersEnabled || !accessToken || !googleUser?.email) {
      return;
    }

    const recipientEmail = googleUser.email;

    const checkAndSendDueReminders = async () => {
      const now = new Date();
      const sentKeys = getSentReminderKeys();

      // 1. Task deadline reminders
      if (profile.taskDeadlineRemindersEnabled) {
        for (const task of tasks) {
          if (task.completed || !task.emailReminderEnabled) continue;
          const triggerAt = computeTaskReminderTriggerDate(task);
          if (!triggerAt) continue;

          const diffMs = now.getTime() - triggerAt.getTime();
          // Trigger only if due now and within a 12-hour window
          if (diffMs < 0 || diffMs > 12 * 60 * 60 * 1000) continue;

          const key = buildTaskReminderKey(task);
          if (
            sentKeys.has(key) ||
            task.lastReminderSentKey === key ||
            sendingReminderKeysRef.current.has(key)
          ) {
            continue;
          }

          sendingReminderKeysRef.current.add(key);
          try {
            const sendNow = new Date();
            const { subject, body } = buildTaskReminderEmailContent(
              task,
              firstName,
              window.location.origin,
              sendNow,
              profile.timezone
            );
            await sendGmailMessage(accessToken, recipientEmail, subject, body);
            markReminderKeySent(key);
            const sentAt = sendNow.toISOString();
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, lastReminderSentKey: key, lastReminderSentAt: sentAt }
                  : t
              )
            );
            setToast({
              message: `${firstName ? `${firstName}, sent` : 'Sent'} email reminder for "${task.title}"`,
            });
          } catch {
            sendingReminderKeysRef.current.delete(key);
          }
        }
      }

      // 2. Daily briefing email (at or after configured time, evaluated at actual send time, max once/day)
      if (
        profile.morningBriefingEmailEnabled &&
        !hasSentMorningBriefingToday(now, profile.timezone) &&
        !sendingBriefingRef.current
      ) {
        const currentHHmm = getLocalTimeHHmmInTimeZone(now, profile.timezone);
        const targetHHmm = profile.morningBriefingTime || '07:00';
        if (currentHHmm >= targetHHmm) {
          sendingBriefingRef.current = true;
          try {
            const sendNow = new Date();
            const { subject, body, briefingType } = buildBriefingEmailContent(
              firstName,
              tasks,
              applications,
              activeDailyPlan,
              profile.availableHoursToday ?? 4,
              calendarBusyMinutes,
              Boolean(googleUser && accessToken),
              window.location.origin,
              sendNow,
              profile.timezone
            );
            await sendGmailMessage(accessToken, recipientEmail, subject, body);
            markMorningBriefingSentToday(sendNow, profile.timezone);
            setToast({
              message: `Sent ${briefingType === 'evening' ? 'Evening' : 'Morning'} Briefing email to ${recipientEmail}`,
            });
          } catch {
            sendingBriefingRef.current = false;
          }
        }
      }
    };

    void checkAndSendDueReminders();
    const interval = window.setInterval(() => void checkAndSendDueReminders(), 30000);
    return () => window.clearInterval(interval);
  }, [
    emailSetupReady,
    profile.emailRemindersEnabled,
    profile.taskDeadlineRemindersEnabled,
    profile.morningBriefingEmailEnabled,
    profile.morningBriefingTime,
    profile.availableHoursToday,
    profile.timezone,
    accessToken,
    googleUser,
    tasks,
    applications,
    activeDailyPlan,
    calendarBusyMinutes,
    firstName,
  ]);

  return (
    <div className="min-h-screen bg-[#EFEBF9] text-[#1E1B2E]">
      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#DAD0F0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 md:h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => handleNavigateTab('dashboard')}
            className="font-display text-lg font-bold tracking-tight text-[#1E1B2E] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#6D4AFF]"
          >
            Next<span className="text-[#6D4AFF]">Up</span>
          </button>

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-5 lg:gap-6">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigateTab(item.key)}
                  className={`relative inline-flex items-center gap-1.5 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#6D4AFF]'
                      : 'text-[#5B5570] hover:text-[#1E1B2E]'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-[#6D4AFF]' : 'text-[#7C7594]'
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#6D4AFF]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                activeTab === 'applications' ? openNewAppModal() : openNewTaskModal()
              }
              className="flex h-9 md:h-10 items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3.5 text-xs md:text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'applications' ? (
                <>
                  <span className="sm:hidden">Add App</span>
                  <span className="hidden sm:inline">Add Application</span>
                </>
              ) : (
                <span>Add Task</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pb-10 md:pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            tasks={tasks}
            applications={applications}
            overloadedDays={overloadedDays}
            followUpsDueToday={followUpsDueToday}
            followUpsOverdue={followUpsOverdue}
            workloadMetrics={workloadMetrics}
            aiDailyPlan={activeDailyPlan}
            briefingMode={briefingMode}
            onChangeBriefingMode={setManualBriefingMode}
            isPlanningAI={isPlanningAI}
            onToggleTask={handleToggleTask}
            onQuickAddTask={handleQuickAddTask}
            onEditTask={openEditTaskModal}
            onOpenPreferences={() => setPrefsModalOpen(true)}
            onOpenReplan={handleOpenReplan}
            onOpenMiddayCheckIn={() => setMiddayModalOpen(true)}
            onRefreshAIPlan={handleRefreshAIPlan}
            onApprovePostpone={handleApprovePostpone}
            onApproveDeprioritise={handleApproveDeprioritise}
            onDismissPlanSuggestion={handleDismissPlanSuggestion}
            careerFocus={careerFocus}
            customCareerFocus={customCareerFocus}
            careerInsights={activeCareerInsights}
            isLoadingCareerInsights={isLoadingCareerInsights}
            onSelectCareerFocus={handleSelectCareerFocus}
            onChangeCustomCareerFocus={handleChangeCustomCareerFocus}
            onRefreshCareerInsights={() => void handleRefreshCareerInsights()}
            onNavigateTab={handleNavigateTab}
            calendarConnected={calendarConnected}
            calendarEvents={calendarEvents}
            calendarBusyMinutes={calendarBusyMinutes}
            firstName={firstName}
            emailSetupReady={emailSetupReady}
            planAcceptedToday={planAcceptedToday}
            onAcceptPlan={handleAcceptPlan}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            activeFilter={taskViewFilter}
            onChangeFilter={setTaskViewFilter}
            onQuickAddTask={handleQuickAddTask}
            onToggleTask={handleToggleTask}
            onEditTask={openEditTaskModal}
            onDeleteTask={handleDeleteTask}
            onRescheduleToday={handleRescheduleTaskToday}
            onClearSampleTasks={handleClearSampleTasks}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsView
            applications={applications}
            activeFilter={appViewFilter}
            onChangeFilter={setAppViewFilter}
            onEditApplication={openEditAppModal}
            onDeleteApplication={handleDeleteApplication}
            onUpdateStatus={handleUpdateApplicationStatus}
            onClearSampleApplications={handleClearSampleApplications}
          />
        )}

        {activeTab === 'upcoming' && (
          <UpcomingView
            profile={profile}
            tasks={tasks}
            applications={applications}
            calendarConnected={calendarConnected}
            calendarEvents={calendarEvents}
            calendarBusyMinutes={calendarBusyMinutes}
            onOpenNewTaskForDate={(date) => openNewTaskModal(date)}
            onToggleTask={handleToggleTask}
            onEditTask={openEditTaskModal}
            onDeleteTask={handleDeleteTask}
            onRescheduleToday={handleRescheduleTaskToday}
            onEditApplication={openEditAppModal}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            googleUser={googleUser}
            accessToken={accessToken}
            isSigningIn={isSigningIn}
            authError={authError}
            authOfferRedirect={authOfferRedirect}
            calendarConnected={calendarConnected}
            sheetsConnected={sheetsConnected}
            gmailReadConnected={gmailReadConnected}
            emailSetupReady={emailSetupReady}
            emailRemindersOptIn={profile.emailRemindersEnabled}
            firstName={firstName}
            timeZone={profile.timezone}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            calendarEvents={calendarEvents}
            calendarBusyMinutes={calendarBusyMinutes}
            isLoadingCalendar={isLoadingCalendar}
            onRefreshCalendar={() => refreshCalendar()}
            tasks={tasks}
            applications={applications}
            onCreateTaskFromIntegration={handleCreateTaskFromIntegration}
            onImportApplications={handleImportApplications}
            onSendMorningBriefingEmailNow={handleSendMorningBriefingEmailNow}
            onOpenReminderPreferences={() => setPrefsModalOpen(true)}
            onNotify={(msg) => setToast({ message: msg })}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5DFF2] bg-white/95 backdrop-blur-md pb-safe md:hidden"
      >
        <div className="grid h-14 grid-cols-5 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigateTab(item.key)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-[#6D4AFF]' : 'text-[#5B5570]'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] leading-none tracking-tight whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />

      {/* Lightweight Toast with Optional Undo */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[#1E1B2E] px-4 py-2.5 text-sm text-white shadow-lg md:bottom-6">
          <span className="whitespace-nowrap">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
              className="font-semibold text-[#C4B5FD] hover:text-white whitespace-nowrap"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Modals & Bottom Sheets */}
      <TaskFormModal
        isOpen={taskModalOpen}
        initialTask={editingTask}
        availableDependencies={tasks}
        defaultDate={taskDefaultDate}
        emailSetupReady={emailSetupReady}
        emailRemindersOptIn={profile.emailRemindersEnabled}
        verifiedEmail={googleUser?.email}
        onSendReminderNow={(task) => setPendingManualReminderTask(task)}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      <ApplicationFormModal
        isOpen={appModalOpen}
        initialApplication={editingApp}
        onClose={() => setAppModalOpen(false)}
        onSave={handleSaveApplication}
      />

      <ApplicationSuggestionsModal
        isOpen={appSuggestionState.isOpen}
        mode={appSuggestionState.mode}
        application={appSuggestionState.application}
        newStatus={appSuggestionState.newStatus}
        initialDrafts={appSuggestionState.drafts}
        onClose={() => setAppSuggestionState((s) => ({ ...s, isOpen: false }))}
        onApproveTasks={handleApproveSuggestedTasks}
        onSaveReflection={handleSaveRejectionReflection}
      />

      <ReplanDayModal
        isOpen={replanModalOpen}
        firstName={firstName}
        replan={replanResult}
        isLoading={isReplanning}
        tasks={tasks}
        remainingHours={remainingHoursToday}
        onChangeRemainingHours={setRemainingHoursToday}
        onRegenerate={() => void runReplan(remainingHoursToday)}
        onClose={() => setReplanModalOpen(false)}
        onApplySuggestion={handleApplyReplanSuggestion}
        onApplyAll={handleApplyAllReplan}
      />

      <MiddayCheckInModal
        isOpen={middayModalOpen}
        firstName={firstName}
        tasks={tasks}
        remainingHours={remainingHoursToday}
        onChangeRemainingHours={setRemainingHoursToday}
        onToggleComplete={handleToggleTask}
        onToggleTakingLonger={handleToggleTakingLonger}
        onQuickAddUnexpected={handleQuickAddTask}
        onApplySuggestion={(taskId, newDeadline, newPriority) =>
          handleApplyReplanSuggestion(taskId, {
            deadline: newDeadline,
            priority: newPriority,
          })
        }
        onClose={() => setMiddayModalOpen(false)}
      />

      <PreferencesModal
        isOpen={prefsModalOpen}
        profile={profile}
        resolvedFirstName={firstName}
        verifiedEmail={googleUser?.email}
        emailSetupReady={emailSetupReady}
        onClose={() => setPrefsModalOpen(false)}
        onSaveProfile={setProfile}
        onOpenIntegrations={() => handleNavigateTab('integrations')}
        onResetSampleData={handleResetSampleData}
        onClearAllData={handleClearAllData}
      />

      {pendingManualReminderTask && (
        <WorkspaceConfirmModal
          isOpen={Boolean(pendingManualReminderTask)}
          title="Send task reminder email now?"
          description={`NextUp will send an email reminder to ${googleUser?.email} via Gmail.`}
          details={[
            `Task: ${pendingManualReminderTask.title}`,
            `Deadline: ${formatFriendlyDateTime(pendingManualReminderTask.deadline, pendingManualReminderTask.deadlineTime, today)}`,
            `Priority: ${pendingManualReminderTask.priority} · Est. ${formatDuration(pendingManualReminderTask.estimatedMinutes)}`,
          ]}
          confirmLabel="Send reminder email"
          isProcessing={isSendingManualEmail}
          onCancel={() => setPendingManualReminderTask(null)}
          onConfirm={handleConfirmSendTaskReminderNow}
        />
      )}
    </div>
  );
}
