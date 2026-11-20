import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  LogOut,
  Mail,
  MessageSquare,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { WorkspaceConfirmModal } from '../components/WorkspaceConfirmModal';
import { GoogleSignInMode, isEmbeddedIframe } from '../services/googleAuth';
import {
  addTaskToGoogleCalendar,
  CalendarEventItem,
  createApplicationTrackerSheet,
  fetchSpreadsheetMetadata,
  importApplicationsFromSheet,
  RecruitmentEmailInsight,
  scanRecruitmentEmails,
  SpreadsheetMetadata,
  syncApplicationsToSheet,
} from '../services/workspaceApis';
import { JobApplication, Task } from '../types/nextup';
import {
  formatDuration,
  formatFriendlyDateTime,
  formatPersonalizedGreeting,
  getBriefingPeriod,
  toLocalDateKey,
} from '../utils/dateUtils';

interface IntegrationsViewProps {
  googleUser: User | null;
  accessToken: string | null;
  isSigningIn: boolean;
  authError: string | null;
  authOfferRedirect: boolean;
  calendarConnected: boolean;
  sheetsConnected: boolean;
  gmailReadConnected: boolean;
  emailSetupReady: boolean;
  emailRemindersOptIn: boolean;
  firstName: string;
  timeZone?: string;
  onGoogleSignIn: (mode?: GoogleSignInMode) => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  calendarEvents: CalendarEventItem[];
  calendarBusyMinutes: number;
  isLoadingCalendar: boolean;
  onRefreshCalendar: () => Promise<void>;
  tasks: Task[];
  applications: JobApplication[];
  onCreateTaskFromIntegration: (draft: {
    title: string;
    category: Task['category'];
    priority: Task['priority'];
    deadline: string;
    estimatedMinutes: number;
    notes?: string;
  }) => void;
  onImportApplications: (apps: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onSendMorningBriefingEmailNow: () => Promise<void>;
  onOpenReminderPreferences: () => void;
  onNotify: (msg: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  googleUser,
  accessToken,
  isSigningIn,
  authError,
  authOfferRedirect,
  calendarConnected,
  sheetsConnected,
  gmailReadConnected,
  emailSetupReady,
  emailRemindersOptIn,
  firstName,
  timeZone,
  onGoogleSignIn,
  onGoogleSignOut,
  calendarEvents,
  calendarBusyMinutes,
  isLoadingCalendar,
  onRefreshCalendar,
  tasks,
  applications,
  onCreateTaskFromIntegration,
  onImportApplications,
  onSendMorningBriefingEmailNow,
  onOpenReminderPreferences,
  onNotify,
}) => {
  const today = toLocalDateKey();
  const inIframe = isEmbeddedIframe();
  const hasSessionToken = Boolean(googleUser && accessToken);
  const isConnected = Boolean(
    hasSessionToken && (calendarConnected || sheetsConnected || gmailReadConnected || emailSetupReady)
  );

  // Calendar state
  const [selectedTaskIdForCal, setSelectedTaskIdForCal] = useState<string>('');
  const [calError, setCalError] = useState<string | null>(null);

  // Sheets state
  const [sheetInput, setSheetInput] = useState('');
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTabName, setSelectedTabName] = useState('');
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Gmail state
  const [emailInsights, setEmailInsights] = useState<RecruitmentEmailInsight[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [gmailScannedOnce, setGmailScannedOnce] = useState(false);

  // Confirmation modal state for mutating Workspace actions
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    details: string[];
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);
  const [isConfirmRunning, setIsConfirmRunning] = useState(false);

  const activeTasks = tasks.filter((t) => !t.completed);
  const taskToSchedule =
    activeTasks.find((t) => t.id === selectedTaskIdForCal) ?? activeTasks[0];

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setIsConfirmRunning(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } finally {
      setIsConfirmRunning(false);
    }
  };

  const handleRequestAddTaskToCalendar = () => {
    if (!accessToken || !taskToSchedule) return;
    setCalError(null);
    setConfirmState({
      isOpen: true,
      title: 'Add task to Google Calendar?',
      description: 'NextUp will create a new event on your primary Google Calendar.',
      details: [
        `Title: [NextUp · ${taskToSchedule.category}] ${taskToSchedule.title}`,
        `Date: ${formatFriendlyDateTime(taskToSchedule.deadline, taskToSchedule.deadlineTime, today)}`,
        `Duration: ${formatDuration(taskToSchedule.estimatedMinutes)}`,
      ],
      confirmLabel: 'Create calendar event',
      action: async () => {
        try {
          await addTaskToGoogleCalendar(accessToken, taskToSchedule);
          await onRefreshCalendar();
          onNotify(`Added "${taskToSchedule.title}" to Google Calendar`);
        } catch (err) {
          setCalError(err instanceof Error ? err.message : 'Failed to create event.');
        }
      },
    });
  };

  const handleLoadSpreadsheet = async () => {
    if (!accessToken || !sheetInput.trim()) return;
    setSheetsLoading(true);
    setSheetsError(null);
    try {
      const meta = await fetchSpreadsheetMetadata(accessToken, sheetInput);
      setSheetMeta(meta);
      setSelectedTabName(meta.sheets[0] || '');
      onNotify(`Loaded "${meta.title}"`);
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : 'Could not load spreadsheet.');
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleRequestCreateSheet = () => {
    if (!accessToken) return;
    setSheetsError(null);
    setConfirmState({
      isOpen: true,
      title: 'Create a new Google Sheet?',
      description:
        'NextUp will create a spreadsheet named "NextUp — Applications Tracker" in your Google Drive and write your tracked applications.',
      details: [
        `${applications.length} application(s) will be written to the "Applications" tab`,
        'Includes Company, Role, Status, Applied Date, Follow-up, Recruiter, Next Action, Link, and Notes',
      ],
      confirmLabel: 'Create & sync sheet',
      action: async () => {
        try {
          const meta = await createApplicationTrackerSheet(accessToken, applications);
          setSheetMeta(meta);
          setSelectedTabName(meta.sheets[0] || 'Applications');
          setSheetInput(meta.spreadsheetId);
          onNotify('Created NextUp tracker in Google Sheets');
        } catch (err) {
          setSheetsError(err instanceof Error ? err.message : 'Failed to create spreadsheet.');
        }
      },
    });
  };

  const handleRequestSyncToSheet = () => {
    if (!accessToken || !sheetMeta || !selectedTabName) return;
    setSheetsError(null);
    setConfirmState({
      isOpen: true,
      title: `Sync applications to "${sheetMeta.title}"?`,
      description: `This will replace the contents of columns A–I on the "${selectedTabName}" tab with your current NextUp applications.`,
      details: [
        `Spreadsheet: ${sheetMeta.title}`,
        `Tab: ${selectedTabName}`,
        `Rows to write: ${applications.length} application(s) plus header row`,
      ],
      confirmLabel: 'Sync to Google Sheets',
      action: async () => {
        try {
          const res = await syncApplicationsToSheet(
            accessToken,
            sheetMeta.spreadsheetId,
            selectedTabName,
            applications
          );
          onNotify(`Synced ${res.updatedRows} application(s) to Google Sheets`);
        } catch (err) {
          setSheetsError(err instanceof Error ? err.message : 'Sync failed.');
        }
      },
    });
  };

  const handleImportFromSheet = async () => {
    if (!accessToken || !sheetMeta || !selectedTabName) return;
    setSheetsLoading(true);
    setSheetsError(null);
    try {
      const imported = await importApplicationsFromSheet(
        accessToken,
        sheetMeta.spreadsheetId,
        selectedTabName
      );
      if (imported.length === 0) {
        setSheetsError('No application rows found (expected Company in column A and Role in column B).');
      } else {
        onImportApplications(imported);
      }
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleScanGmail = async () => {
    if (!accessToken) return;
    setGmailLoading(true);
    setGmailError(null);
    try {
      const results = await scanRecruitmentEmails(accessToken);
      setEmailInsights(results);
      setGmailScannedOnce(true);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'Could not scan Gmail.');
    } finally {
      setGmailLoading(false);
    }
  };

  const handleRequestSendBriefingEmail = () => {
    if (!emailSetupReady || !googleUser?.email) return;
    const now = new Date();
    const period = getBriefingPeriod(now, timeZone);
    const liveGreeting = formatPersonalizedGreeting(firstName, now, timeZone);
    const isEvening = period === 'evening';
    setConfirmState({
      isOpen: true,
      title: `Send ${isEvening ? 'Evening' : 'Morning'} Briefing email now?`,
      description: `NextUp will generate an ${period} briefing starting with "${liveGreeting}" based on your current local time and send it via Gmail.`,
      details: [
        `Recipient: ${googleUser.email}`,
        isEvening
          ? 'Includes today’s completed tasks, pending items, upcoming deadlines, follow-ups, and tomorrow’s top priorities'
          : 'Includes tasks due today, overdue items, upcoming deadlines, follow-ups, and top 3 priorities',
      ],
      confirmLabel: `Send ${period} briefing`,
      action: async () => {
        try {
          await onSendMorningBriefingEmailNow();
        } catch (err) {
          setGmailError(err instanceof Error ? err.message : 'Failed to send briefing email.');
        }
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
          <Plug className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E1B2E]">🔌 Integrations</h1>
          <p className="mt-0.5 text-sm text-[#5B5570]">
            Connect Google Calendar, Google Sheets, and Gmail securely via Google&apos;s official sign-in screen. NextUp never asks for your password and only mutates data when you confirm.
          </p>
        </div>
      </div>

      {/* Onboarding & Connection Card */}
      <section className="rounded-2xl border border-[#DDD6FE] bg-white p-4 sm:p-5 space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#6D4AFF]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#1E1B2E]">
                {isConnected
                  ? `Connected as ${googleUser?.displayName || googleUser?.email}`
                  : googleUser
                    ? `Signed in as ${googleUser.displayName || googleUser.email}`
                    : 'Connect your Google Workspace'}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-[#5B5570]">
                {isConnected
                  ? `Signed in (${googleUser?.email}) with verified Workspace permissions for this session.`
                  : googleUser
                    ? 'Your Google account stayed signed in across refresh. For security, Workspace API access tokens stay in memory only—verify permissions below to reconnect Calendar, Sheets, and Gmail.'
                    : 'Sign in with Google to enable live Calendar events, Sheets application sync, and Gmail recruitment scanning.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isConnected ? (
              <button
                type="button"
                onClick={onGoogleSignOut}
                className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <>
                <GoogleSignInButton
                  onClick={() => void onGoogleSignIn('auto')}
                  disabled={isSigningIn}
                  label={
                    isSigningIn
                      ? 'Connecting...'
                      : googleUser
                        ? 'Reconnect Google Workspace'
                        : 'Sign in with Google'
                  }
                />
                {googleUser && (
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    disabled={isSigningIn}
                    className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!isConnected && !inIframe && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F1ECFA] pt-2.5 text-xs text-[#5B5570]">
            <span>Having trouble with browser popups on this site?</span>
            <button
              type="button"
              onClick={() => void onGoogleSignIn('redirect')}
              disabled={isSigningIn}
              className="font-semibold text-[#6D4AFF] hover:underline disabled:opacity-50"
            >
              Sign in via full-page redirect instead
            </button>
          </div>
        )}

        {authError && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
              <p className="leading-relaxed">{authError}</p>
            </div>
            {authOfferRedirect && !inIframe && (
              <button
                type="button"
                onClick={() => void onGoogleSignIn('redirect')}
                disabled={isSigningIn}
                className="min-h-[36px] shrink-0 rounded-lg border border-[#FECACA] bg-white px-3 font-semibold text-[#991B1B] hover:bg-[#FEE2E2] transition-colors whitespace-nowrap"
              >
                Use redirect sign-in
              </button>
            )}
          </div>
        )}
      </section>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 1. Google Calendar */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#E5DFF2] bg-white p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]">
                  <Calendar className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#1E1B2E]">📅 Google Calendar</h2>
                  <p className="text-xs text-[#5B5570]">
                    View daily schedule, compare available time, and add approved tasks.
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  calendarConnected
                    ? 'text-[#15803D]'
                    : hasSessionToken
                      ? 'text-[#C2410C]'
                      : 'text-[#5B5570]'
                }`}
              >
                {calendarConnected
                  ? 'Connected'
                  : hasSessionToken
                    ? 'Permission needed'
                    : 'Ready to connect'}
              </span>
            </div>

            {calendarConnected ? (
              <div className="space-y-3 border-t border-[#F1ECFA] pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1E1B2E] tabular-nums">
                    Today&apos;s schedule: {calendarEvents.length} event(s) · {formatDuration(calendarBusyMinutes)} busy
                  </span>
                  <button
                    type="button"
                    onClick={onRefreshCalendar}
                    disabled={isLoadingCalendar}
                    className="inline-flex items-center gap-1 font-medium text-[#6D4AFF] hover:underline"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {calError && <p className="text-xs text-[#DC2626]">{calError}</p>}

                {calendarEvents.length === 0 ? (
                  <p className="rounded-xl bg-[#FAF9FE] px-3 py-2.5 text-xs text-[#5B5570]">
                    No calendar events remaining today. Your schedule is open for focus blocks.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto divide-y divide-[#F1ECFA] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE]">
                    {calendarEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="font-medium text-[#1E1B2E] truncate">{ev.summary}</span>
                        <span className="shrink-0 text-[#5B5570] tabular-nums">
                          {ev.isAllDay
                            ? 'All day'
                            : `${new Date(ev.startIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${formatDuration(ev.durationMinutes)})`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTasks.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <label htmlFor="cal-task-select" className="block text-xs font-medium text-[#5B5570]">
                      Schedule a NextUp task onto Google Calendar (requires confirmation):
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="cal-task-select"
                        value={taskToSchedule?.id || ''}
                        onChange={(e) => setSelectedTaskIdForCal(e.target.value)}
                        className="min-h-[40px] flex-1 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-2.5 text-xs text-[#1E1B2E] focus:border-[#6D4AFF] focus:outline-none"
                      >
                        {activeTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} ({formatFriendlyDateTime(t.deadline, t.deadlineTime, today)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRequestAddTaskToCalendar}
                        className="min-h-[40px] shrink-0 rounded-xl bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE] whitespace-nowrap"
                      >
                        Add event
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5 border-t border-[#F1ECFA] pt-3 text-xs text-[#5B5570]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>View daily schedule & feed busy hours into Workload Analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>Spot schedule conflicts and add tasks to Calendar with approval</span>
                </li>
              </ul>
            )}
          </div>
        </article>

        {/* 2. Google Sheets */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#E5DFF2] bg-white p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]">
                  <FileSpreadsheet className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#1E1B2E]">📊 Google Sheets</h2>
                  <p className="text-xs text-[#5B5570]">
                    Synchronise internships, statuses, and follow-ups with a spreadsheet.
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  sheetsConnected
                    ? 'text-[#15803D]'
                    : hasSessionToken
                      ? 'text-[#C2410C]'
                      : 'text-[#5B5570]'
                }`}
              >
                {sheetsConnected
                  ? 'Connected'
                  : hasSessionToken
                    ? 'Permission needed'
                    : 'Ready to connect'}
              </span>
            </div>

            {sheetsConnected ? (
              <div className="space-y-3 border-t border-[#F1ECFA] pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="Paste Google Sheet URL or ID..."
                    aria-label="Google Sheet URL or ID"
                    className="min-h-[40px] flex-1 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 text-xs text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleLoadSpreadsheet}
                    disabled={sheetsLoading || !sheetInput.trim()}
                    className="min-h-[40px] rounded-xl border border-[#E5DFF2] bg-white px-3 text-xs font-medium text-[#1E1B2E] hover:bg-[#F1ECFA] disabled:opacity-45"
                  >
                    Load sheet
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestCreateSheet}
                    className="min-h-[40px] rounded-xl bg-[#EDE9FE] px-3 text-xs font-medium text-[#4C2F96] hover:bg-[#DDD6FE]"
                  >
                    New tracker sheet
                  </button>
                </div>

                {sheetsError && <p className="text-xs text-[#DC2626]">{sheetsError}</p>}

                {sheetMeta && (
                  <div className="rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1E1B2E] truncate">
                        {sheetMeta.title}
                      </span>
                      <a
                        href={sheetMeta.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#6D4AFF] hover:underline shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="sheet-tab-select" className="text-xs text-[#5B5570]">
                        Tab:
                      </label>
                      <select
                        id="sheet-tab-select"
                        value={selectedTabName}
                        onChange={(e) => setSelectedTabName(e.target.value)}
                        className="rounded-lg border border-[#E5DFF2] bg-white px-2.5 py-1 text-xs text-[#1E1B2E]"
                      >
                        {sheetMeta.sheets.map((tab) => (
                          <option key={tab} value={tab}>
                            {tab}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleImportFromSheet}
                        disabled={sheetsLoading}
                        className="min-h-[38px] rounded-lg border border-[#E5DFF2] bg-white px-3 text-xs font-medium text-[#1E1B2E] hover:bg-[#F1ECFA]"
                      >
                        Import rows
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestSyncToSheet}
                        className="min-h-[38px] rounded-lg bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE]"
                      >
                        Sync {applications.length} apps
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5 border-t border-[#F1ECFA] pt-3 text-xs text-[#5B5570]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>Create a formatted NextUp Application Tracker in Google Sheets</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>Import or sync applications with explicit confirmation before writing</span>
                </li>
              </ul>
            )}
          </div>
        </article>

        {/* 3. Gmail */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#E5DFF2] bg-white p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]">
                  <Mail className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#1E1B2E]">✉️ Gmail & Email Reminders</h2>
                  <p className="text-xs text-[#5B5570]">
                    Scan recruitment emails and send task deadline reminders to your verified email.
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  emailSetupReady && gmailReadConnected
                    ? 'text-[#15803D]'
                    : hasSessionToken
                      ? 'text-[#C2410C]'
                      : 'text-[#5B5570]'
                }`}
              >
                {emailSetupReady && gmailReadConnected
                  ? 'Connected'
                  : hasSessionToken
                    ? 'Permission needed'
                    : 'Setup required'}
              </span>
            </div>

            {!emailSetupReady ? (
              <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2.5 text-xs text-[#9A3412] space-y-1">
                <p className="font-semibold">Email reminders setup required</p>
                <p>
                  {hasSessionToken
                    ? 'Reconnect with Google above and check Gmail permission to enable recruitment scanning and verified task reminders.'
                    : 'Sign in with Google above to enable recruitment scanning and verified email reminders.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#EDE9F6] bg-[#FAF9FE] px-3 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1E1B2E] truncate">
                    Reminders recipient: {googleUser?.email}
                  </p>
                  <p className="text-[11px] text-[#5B5570]">
                    {emailRemindersOptIn
                      ? 'Email reminders opted in · Duplicate sending prevented'
                      : 'Opt in under Reminder Preferences to enable automatic reminders'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenReminderPreferences}
                    className="min-h-[38px] rounded-lg border border-[#E5DFF2] bg-white px-3 text-xs font-medium text-[#1E1B2E] hover:bg-[#F1ECFA]"
                  >
                    Preferences
                  </button>
                  {emailRemindersOptIn && (
                    <button
                      type="button"
                      onClick={handleRequestSendBriefingEmail}
                      className="min-h-[38px] rounded-lg bg-[#EDE9FE] px-3 text-xs font-semibold text-[#4C2F96] hover:bg-[#DDD6FE]"
                    >
                      Send briefing now
                    </button>
                  )}
                </div>
              </div>
            )}

            {gmailReadConnected ? (
              <div className="space-y-3 border-t border-[#F1ECFA] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5B5570]">
                    Scans recent 30 days for recruitment emails without modifying your inbox.
                  </span>
                  <button
                    type="button"
                    onClick={handleScanGmail}
                    disabled={gmailLoading}
                    className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3 text-xs font-medium text-white hover:bg-[#5B38EE] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${gmailLoading ? 'animate-spin' : ''}`} />
                    <span>{gmailLoading ? 'Scanning...' : 'Scan emails'}</span>
                  </button>
                </div>

                {gmailError && <p className="text-xs text-[#DC2626]">{gmailError}</p>}

                {gmailScannedOnce && emailInsights.length === 0 && !gmailLoading && (
                  <p className="rounded-xl bg-[#FAF9FE] px-3 py-2.5 text-xs text-[#5B5570]">
                    No recruitment emails detected in the last 30 days.
                  </p>
                )}

                {emailInsights.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {emailInsights.map((em) => (
                      <div
                        key={em.id}
                        className="rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1E1B2E] line-clamp-1">
                            {em.subject}
                          </p>
                          <span className="shrink-0 text-[11px] font-semibold text-[#6D4AFF]">
                            {em.detectedType}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5B5570] truncate">{em.from}</p>
                        <p className="text-xs text-[#5B5570] line-clamp-2">{em.snippet}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-medium text-[#4C2F96]">
                            {em.suggestedAction}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onCreateTaskFromIntegration({
                                title: `${em.detectedType}: ${em.suggestedCompany || em.subject.slice(0, 45)}`,
                                category: 'Career',
                                priority:
                                  em.detectedType === 'Interview' || em.detectedType === 'Assessment'
                                    ? 'Must Do'
                                    : 'Should Do',
                                deadline: today,
                                estimatedMinutes: em.detectedType === 'Assessment' ? 60 : 30,
                                notes: `From Gmail (${em.from}): ${em.subject}`,
                              })
                            }
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white border border-[#DDD6FE] px-2.5 text-xs font-medium text-[#5B38EE] hover:bg-[#EDE9FE] shrink-0"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Create task</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-1.5 border-t border-[#F1ECFA] pt-3 text-xs text-[#5B5570]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>Identify interview invitations, assessments, offers, and updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                  <span>Turn detected recruiter emails into NextUp tasks with one tap</span>
                </li>
              </ul>
            )}
          </div>
        </article>

        {/* 4. WhatsApp (Still Coming Soon) */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#E5DFF2] bg-white p-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#99F6E4] bg-[#F0FDFA] text-[#0D9488]">
                  <MessageSquare className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#1E1B2E]">💬 WhatsApp</h2>
                  <p className="text-xs text-[#5B5570]">
                    Gentle daily briefings and deadline nudges on your phone.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#6D4AFF] whitespace-nowrap">
                Coming Soon
              </span>
            </div>

            <div className="mt-3 text-xs text-[#5B5570]">
              Status: <span className="font-semibold text-[#1E1B2E]">Not connected</span>
            </div>

            <ul className="mt-3 space-y-1.5 border-t border-[#F1ECFA] pt-3 text-xs text-[#5B5570]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                <span>Deliver your Morning or Evening Briefing at your chosen time</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
                <span>Send Midday Check-in prompts and urgent deadline alerts</span>
              </li>
            </ul>
          </div>

          <p className="mt-4 border-t border-[#F1ECFA] pt-3 text-[11px] text-[#7C7594]">
            WhatsApp messaging requires separate opt-in setup in a future release.
          </p>
        </article>
      </div>

      {/* Explicit Confirmation Modal for Mutating Workspace API Calls */}
      {confirmState && (
        <WorkspaceConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          description={confirmState.description}
          details={confirmState.details}
          confirmLabel={confirmState.confirmLabel}
          isProcessing={isConfirmRunning}
          onCancel={() => setConfirmState(null)}
          onConfirm={runConfirmedAction}
        />
      )}
    </div>
  );
};
