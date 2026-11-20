export type TaskCategory = 'College' | 'Career' | 'Personal' | 'Other';

export type TaskPriority = 'Must Do' | 'Should Do' | 'Can Wait';

export type TaskViewFilter = 'today' | 'upcoming' | 'overdue' | 'completed';

export type TaskReminderTiming = 'at_deadline' | '1_hour_before' | '1_day_before' | 'custom';

export type ReminderFrequency = 'each_reminder' | 'hourly_digest' | 'daily_summary';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  deadline: string; // YYYY-MM-DD (local date)
  deadlineTime?: string; // Optional HH:mm (24-hour local time)
  priority: TaskPriority;
  estimatedMinutes: number;
  notes?: string;
  dependencies?: string[]; // Optional prerequisite task IDs
  takingLonger?: boolean; // Set during Midday Check-in
  emailReminderEnabled?: boolean;
  reminderTiming?: TaskReminderTiming;
  customReminderDate?: string; // YYYY-MM-DD
  customReminderTime?: string; // HH:mm
  lastReminderSentKey?: string;
  lastReminderSentAt?: string; // ISO timestamp
  completed: boolean;
  completedAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  isSample?: boolean;
}

export type ApplicationStatus =
  | 'Saved'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Rejected'
  | 'Offer';

export type ApplicationViewFilter =
  | 'All'
  | 'Active'
  | 'FollowUps'
  | 'InterviewOrOA'
  | 'Interview'
  | 'Assessment'
  | 'Offer'
  | 'Closed';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  applicationDate: string; // YYYY-MM-DD
  applicationLink?: string;
  status: ApplicationStatus;
  followUpDate?: string; // YYYY-MM-DD
  followUpTime?: string; // Optional HH:mm
  recruiterContact?: string;
  notes?: string;
  nextAction?: string;
  reflectionNote?: string;
  updatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  isSample?: boolean;
}

export type IntegrationId = 'google_calendar' | 'google_sheets' | 'gmail' | 'whatsapp';

export type IntegrationConnectionStatus =
  | 'Not connected'
  | 'Connecting'
  | 'Connected'
  | 'Syncing'
  | 'Connection error';

export interface IntegrationState {
  id: IntegrationId;
  status: IntegrationConnectionStatus;
  accountEmailOrLabel?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface IntegrationContextPayload {
  connectedIntegrations: IntegrationId[];
  calendarEvents?: {
    title: string;
    startIso: string;
    endIso: string;
  }[];
  gmailSignals?: {
    company?: string;
    type: 'interview' | 'assessment' | 'offer' | 'rejection' | 'recruiter_update';
    summary: string;
  }[];
  sheetSummary?: string;
}

export interface StudentProfile {
  name: string;
  dailyTaskWarningThreshold: number;
  availableHoursToday: number;
  onboardingDismissed: boolean;
  remindersEnabled: boolean; // Legacy alias kept synced with emailRemindersEnabled
  emailRemindersEnabled: boolean; // Master opt-in for sending email reminders
  morningBriefingEmailEnabled: boolean;
  morningBriefingTime: string; // HH:mm, default "07:00"
  middayCheckInEnabled: boolean;
  middayCheckInTime: string; // HH:mm, default "12:30"
  taskDeadlineRemindersEnabled: boolean;
  preferredReminderFrequency: ReminderFrequency;
  timezone: string;
}

export type NavTab = 'dashboard' | 'tasks' | 'applications' | 'upcoming' | 'integrations';

export interface PrioritisedFocusItem {
  task: Task;
  score: number;
  reason: string;
}

export interface OverloadedDayWarning {
  date: string;
  label: string;
  taskCount: number;
  totalMinutes: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  completedThisWeek: number;
  scheduledThisWeek: number;
  totalMinutesPlanned: number;
  activeApplications: number;
  days: {
    date: string;
    shortDay: string;
    dayNum: string;
    isToday: boolean;
    total: number;
    completed: number;
    minutes: number;
  }[];
}

export interface WorkloadMetrics {
  hoursToday: number;
  hoursThisWeek: number;
  tasksDueToday: number;
  tasksDueThisWeek: number;
  overdueCount: number;
  highPriorityCount: number;
  completedTodayCount: number;
  completedTotalCount: number;
  remainingMinutesToday: number;
  remainingMinutesWeek: number;
  availableHoursToday: number;
  isOverloadedToday: boolean;
  workloadGuidance: string;
}

export interface PlannedOrderItem {
  taskId: string;
  timingAdvice: string;
  reason: string;
}

export interface PostponeSuggestion {
  taskId: string;
  suggestedDeadline: string;
  reason: string;
}

export interface DeprioritiseSuggestion {
  taskId: string;
  suggestedPriority: TaskPriority;
  reason: string;
}

export type BriefingType = 'morning' | 'evening';

export interface AIDailyPlan {
  source: 'gemini' | 'rule-based';
  briefingType?: BriefingType;
  generatedAt: string;
  headlineSummary: string;
  topThree: { taskId: string; reason: string }[];
  recommendedOrder: PlannedOrderItem[];
  startImmediatelyIds: string[];
  postponeSuggestions: PostponeSuggestion[];
  unrealisticTodayIds: string[];
  deprioritiseSuggestions: DeprioritiseSuggestion[];
  conflicts: string[];
}

export interface ReplanSuggestion {
  id: string;
  taskId: string;
  type: 'move_date' | 'deprioritise' | 'keep_focus';
  suggestedDeadline?: string;
  suggestedPriority?: TaskPriority;
  reason: string;
}

export interface ReplanResult {
  source: 'gemini' | 'rule-based';
  generatedAt: string;
  summary: string;
  isOverloaded: boolean;
  overloadExplanation: string;
  nextUpTaskId?: string;
  nextUpReason?: string;
  suggestions: ReplanSuggestion[];
}

export interface SuggestedTaskDraft {
  id: string;
  selected: boolean;
  title: string;
  category: TaskCategory;
  deadline: string;
  deadlineTime?: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  notes?: string;
}

export interface ParsedTaskPreview {
  title: string;
  category: TaskCategory;
  deadline: string;
  deadlineTime?: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  matchedDatePhrase?: string;
  matchedTimePhrase?: string;
}

export interface BrainDumpParser {
  parse(rawText: string): Promise<Partial<Task>[]>;
}

export interface PrioritisationEngine {
  rankTopPriorities(tasks: Task[], referenceDate: string, limit?: number): PrioritisedFocusItem[];
}

export interface CalendarAdapter {
  exportTask(task: Task): Promise<void>;
  exportFollowUp(app: JobApplication): Promise<void>;
}

export interface NotificationAdapter {
  scheduleReminder(title: string, triggerAt: string): Promise<void>;
}
