import { IntegrationId, IntegrationState, JobApplication, StudentProfile, Task } from '../types/nextup';
import { addDaysToDateKey, toLocalDateKey } from '../utils/dateUtils';

const STORAGE_KEYS = {
  TASKS: 'nextup_v1_tasks',
  APPLICATIONS: 'nextup_v1_applications',
  PROFILE: 'nextup_v1_profile',
  INTEGRATIONS: 'nextup_v1_integrations',
  SEEDED: 'nextup_v1_seeded',
} as const;

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const DEFAULT_PROFILE: StudentProfile = {
  name: '',
  dailyTaskWarningThreshold: 4,
  availableHoursToday: 4,
  onboardingDismissed: false,
  remindersEnabled: false,
  emailRemindersEnabled: false,
  morningBriefingEmailEnabled: false,
  morningBriefingTime: '07:00',
  middayCheckInEnabled: true,
  middayCheckInTime: '12:30',
  taskDeadlineRemindersEnabled: true,
  preferredReminderFrequency: 'each_reminder',
  timezone: getDetectedTimezone(),
  careerFocus: 'Product Management',
  customCareerFocus: '',
};

export const DEFAULT_INTEGRATIONS: Record<IntegrationId, IntegrationState> = {
  google_calendar: { id: 'google_calendar', status: 'Not connected' },
  google_sheets: { id: 'google_sheets', status: 'Not connected' },
  gmail: { id: 'gmail', status: 'Not connected' },
  whatsapp: { id: 'whatsapp', status: 'Not connected' },
};

export function isSampleTask(task: Pick<Task, 'id' | 'isSample'>): boolean {
  if (typeof task.isSample === 'boolean') return task.isSample;
  return task.id.startsWith('task-sample-');
}

export function isSampleApplication(app: Pick<JobApplication, 'id' | 'isSample'>): boolean {
  if (typeof app.isSample === 'boolean') return app.isSample;
  return app.id.startsWith('app-sample-');
}

export function createSampleTasks(): Task[] {
  const today = toLocalDateKey();
  const yesterday = addDaysToDateKey(today, -1);
  const tomorrow = addDaysToDateKey(today, 1);
  const inTwoDays = addDaysToDateKey(today, 2);
  const inFourDays = addDaysToDateKey(today, 4);
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'task-sample-1',
      title: 'Submit Operating Systems Lab 4 report',
      category: 'College',
      deadline: today,
      deadlineTime: '23:59',
      priority: 'Must Do',
      estimatedMinutes: 75,
      notes: 'Double-check deadlock graphs and PDF formatting before uploading to Canvas.',
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-2',
      title: 'Prepare system design & graph questions for Stripe interview',
      category: 'Career',
      deadline: tomorrow,
      deadlineTime: '14:00',
      priority: 'Must Do',
      estimatedMinutes: 120,
      notes: 'Review BFS shortest path, rate limiter design, and STAR behavioral stories.',
      dependencies: ['task-sample-3'],
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-3',
      title: 'Confirm Stripe technical interview slot & test mic',
      category: 'Career',
      deadline: today,
      deadlineTime: '17:00',
      priority: 'Must Do',
      estimatedMinutes: 15,
      notes: 'Reply to campus recruiter email before 5 PM.',
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-4',
      title: 'Send thank-you note & portfolio link to Linear recruiter',
      category: 'Career',
      deadline: yesterday,
      deadlineTime: '18:00',
      priority: 'Should Do',
      estimatedMinutes: 20,
      notes: 'Follow up with campus recruiting team.',
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-5',
      title: 'Pick up prescription & groceries',
      category: 'Personal',
      deadline: today,
      priority: 'Should Do',
      estimatedMinutes: 40,
      notes: 'Oats, coffee beans, and fruit for the week.',
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-6',
      title: 'Review Linear Algebra lecture slides (Ch. 5)',
      category: 'College',
      deadline: tomorrow,
      deadlineTime: '09:00',
      priority: 'Should Do',
      estimatedMinutes: 45,
      notes: 'Eigenvalues quiz coming up early next week.',
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-7',
      title: 'Complete case competition slide outline',
      category: 'Other',
      deadline: inFourDays,
      priority: 'Can Wait',
      estimatedMinutes: 90,
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-8',
      title: 'Pay monthly campus transit pass',
      category: 'Personal',
      deadline: today,
      priority: 'Can Wait',
      estimatedMinutes: 10,
      completed: true,
      completedAt: nowIso,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'task-sample-9',
      title: 'Tailor resume bullets for Product Engineering Intern',
      category: 'Career',
      deadline: inTwoDays,
      deadlineTime: '18:00',
      priority: 'Should Do',
      estimatedMinutes: 45,
      completed: false,
      createdAt: nowIso,
      isSample: true,
    },
  ];
}

export function createSampleApplications(): JobApplication[] {
  const today = toLocalDateKey();
  const threeDaysAgo = addDaysToDateKey(today, -3);
  const sixDaysAgo = addDaysToDateKey(today, -6);
  const twoWeeksAgo = addDaysToDateKey(today, -14);
  const inTwoDays = addDaysToDateKey(today, 2);
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'app-sample-1',
      company: 'Stripe',
      role: 'Software Engineering Intern (Summer)',
      applicationDate: sixDaysAgo,
      applicationLink: 'https://stripe.com/jobs/university',
      status: 'Interview',
      followUpDate: today,
      followUpTime: '17:00',
      recruiterContact: 'university-recruiting@stripe.com',
      nextAction: 'Confirm technical interview slot & prepare systems round',
      notes: 'Passed HackerRank OA; 45-min coding & architecture round next.',
      updatedAt: nowIso,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'app-sample-2',
      company: 'Figma',
      role: 'Product Engineering Intern',
      applicationDate: threeDaysAgo,
      applicationLink: 'https://www.figma.com/careers/',
      status: 'Assessment',
      followUpDate: inTwoDays,
      followUpTime: '20:00',
      recruiterContact: 'campus@figma.com',
      nextAction: 'Complete take-home UI canvas prompt before Sunday night',
      notes: 'Focus on keyboard accessibility and clean component state.',
      updatedAt: nowIso,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'app-sample-3',
      company: 'Notion',
      role: 'Frontend Intern',
      applicationDate: twoWeeksAgo,
      applicationLink: 'https://www.notion.so/careers',
      status: 'Applied',
      followUpDate: today,
      nextAction: 'Message campus alumni referral on LinkedIn',
      notes: 'Submitted with campus referral.',
      updatedAt: nowIso,
      createdAt: nowIso,
      isSample: true,
    },
    {
      id: 'app-sample-4',
      company: 'Vercel',
      role: 'Developer Experience Intern',
      applicationDate: today,
      applicationLink: 'https://vercel.com/careers',
      status: 'Saved',
      nextAction: 'Polish open-source Next.js demo repo before submitting',
      notes: 'Applications close next Friday.',
      updatedAt: nowIso,
      createdAt: nowIso,
      isSample: true,
    },
  ];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storageService = {
  loadInitialData(): {
    tasks: Task[];
    applications: JobApplication[];
    profile: StudentProfile;
    integrations: Record<IntegrationId, IntegrationState>;
  } {
    const alreadySeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
    if (!alreadySeeded) {
      const sampleTasks = createSampleTasks();
      const sampleApps = createSampleApplications();
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleTasks));
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(sampleApps));
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
      localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(DEFAULT_INTEGRATIONS));
      localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
      return {
        tasks: sampleTasks,
        applications: sampleApps,
        profile: DEFAULT_PROFILE,
        integrations: DEFAULT_INTEGRATIONS,
      };
    }

    const storedProfile = safeParse<Partial<StudentProfile>>(
      localStorage.getItem(STORAGE_KEYS.PROFILE),
      DEFAULT_PROFILE
    );

    // Never keep legacy fictional placeholder names ("Alex" or "Student")
    const rawName = (storedProfile.name ?? '').trim();
    const sanitizedName =
      rawName.toLowerCase() === 'alex' || rawName.toLowerCase() === 'student'
        ? ''
        : rawName;

    const storedIntegrations = safeParse<Partial<Record<IntegrationId, IntegrationState>>>(
      localStorage.getItem(STORAGE_KEYS.INTEGRATIONS),
      DEFAULT_INTEGRATIONS
    );

    // Require explicit opt-in for email reminders unless user previously enabled emailRemindersEnabled
    const emailOptIn =
      typeof storedProfile.emailRemindersEnabled === 'boolean'
        ? storedProfile.emailRemindersEnabled
        : false;

    return {
      tasks: safeParse<Task[]>(localStorage.getItem(STORAGE_KEYS.TASKS), []),
      applications: safeParse<JobApplication[]>(localStorage.getItem(STORAGE_KEYS.APPLICATIONS), []),
      profile: {
        ...DEFAULT_PROFILE,
        ...storedProfile,
        name: sanitizedName,
        emailRemindersEnabled: emailOptIn,
        remindersEnabled: emailOptIn,
      },
      integrations: {
        ...DEFAULT_INTEGRATIONS,
        ...storedIntegrations,
      },
    };
  },

  saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  saveApplications(applications: JobApplication[]): void {
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
  },

  saveProfile(profile: StudentProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  saveIntegrations(integrations: Record<IntegrationId, IntegrationState>): void {
    localStorage.setItem(STORAGE_KEYS.INTEGRATIONS, JSON.stringify(integrations));
  },

  resetToSampleData(): {
    tasks: Task[];
    applications: JobApplication[];
  } {
    const sampleTasks = createSampleTasks();
    const sampleApps = createSampleApplications();
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleTasks));
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(sampleApps));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    return { tasks: sampleTasks, applications: sampleApps };
  },

  clearAllData(): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
  },
};
