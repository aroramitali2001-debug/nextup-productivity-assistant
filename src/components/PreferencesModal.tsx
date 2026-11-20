import React, { useEffect, useState } from 'react';
import { Bell, Mail, RotateCcw, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { CAREER_FOCUS_OPTIONS } from '../services/careerGuidance';
import { CareerFocusCategory, ReminderFrequency, StudentProfile } from '../types/nextup';

interface PreferencesModalProps {
  isOpen: boolean;
  profile: StudentProfile;
  resolvedFirstName: string;
  verifiedEmail?: string | null;
  emailSetupReady: boolean;
  onClose: () => void;
  onSaveProfile: (updated: StudentProfile) => void;
  onOpenIntegrations: () => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  profile,
  resolvedFirstName,
  verifiedEmail,
  emailSetupReady,
  onClose,
  onSaveProfile,
  onOpenIntegrations,
  onResetSampleData,
  onClearAllData,
}) => {
  const [name, setName] = useState(profile.name);
  const [careerFocus, setCareerFocus] = useState<CareerFocusCategory>(
    profile.careerFocus || 'Product Management'
  );
  const [threshold, setThreshold] = useState(profile.dailyTaskWarningThreshold);
  const [availableHours, setAvailableHours] = useState(profile.availableHoursToday);

  // Reminder Preferences
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(profile.emailRemindersEnabled);
  const [morningBriefingEmailEnabled, setMorningBriefingEmailEnabled] = useState(
    profile.morningBriefingEmailEnabled
  );
  const [morningBriefingTime, setMorningBriefingTime] = useState(
    profile.morningBriefingTime || '07:00'
  );
  const [middayCheckInEnabled, setMiddayCheckInEnabled] = useState(profile.middayCheckInEnabled);
  const [middayCheckInTime, setMiddayCheckInTime] = useState(
    profile.middayCheckInTime || '12:30'
  );
  const [taskDeadlineRemindersEnabled, setTaskDeadlineRemindersEnabled] = useState(
    profile.taskDeadlineRemindersEnabled
  );
  const [preferredReminderFrequency, setPreferredReminderFrequency] = useState<ReminderFrequency>(
    profile.preferredReminderFrequency || 'each_reminder'
  );
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(profile.name || resolvedFirstName);
    setCareerFocus(profile.careerFocus || 'Product Management');
    setThreshold(profile.dailyTaskWarningThreshold);
    setAvailableHours(profile.availableHoursToday ?? 4);
    setEmailRemindersEnabled(Boolean(profile.emailRemindersEnabled));
    setMorningBriefingEmailEnabled(Boolean(profile.morningBriefingEmailEnabled));
    setMorningBriefingTime(profile.morningBriefingTime || '07:00');
    setMiddayCheckInEnabled(
      typeof profile.middayCheckInEnabled === 'boolean' ? profile.middayCheckInEnabled : true
    );
    setMiddayCheckInTime(profile.middayCheckInTime || '12:30');
    setTaskDeadlineRemindersEnabled(
      typeof profile.taskDeadlineRemindersEnabled === 'boolean'
        ? profile.taskDeadlineRemindersEnabled
        : true
    );
    setPreferredReminderFrequency(profile.preferredReminderFrequency || 'each_reminder');
    setConfirmClear(false);
  }, [isOpen, profile, resolvedFirstName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      name: name.trim(),
      careerFocus,
      dailyTaskWarningThreshold: Math.max(2, Math.min(12, threshold)),
      availableHoursToday: Math.max(0.5, Math.min(16, availableHours)),
      remindersEnabled: emailRemindersEnabled,
      emailRemindersEnabled,
      morningBriefingEmailEnabled,
      morningBriefingTime: morningBriefingTime || '07:00',
      middayCheckInEnabled,
      middayCheckInTime: middayCheckInTime || '12:30',
      taskDeadlineRemindersEnabled,
      preferredReminderFrequency,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prefs-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-center justify-between border-b border-[#E5DFF2] pb-3">
          <h2 id="prefs-modal-title" className="text-lg font-semibold text-[#1E1B2E]">
            Personalise & Reminder Preferences
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="flex h-11 w-11 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Name & Daily Capacity */}
          <div className="space-y-4">
            <div>
              <label htmlFor="student-name-input" className="block text-sm font-medium text-[#1E1B2E]">
                Your first name
              </label>
              <input
                id="student-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your first name (or leave blank)"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
              {resolvedFirstName && !profile.name && (
                <p className="mt-1 text-[11px] text-[#6D4AFF]">
                  Automatically retrieved from your Google account ({resolvedFirstName}).
                </p>
              )}
            </div>

            <div>
              <label htmlFor="career-focus-select" className="block text-sm font-medium text-[#1E1B2E]">
                Primary career focus
              </label>
              <select
                id="career-focus-select"
                value={careerFocus}
                onChange={(e) => setCareerFocus(e.target.value as CareerFocusCategory)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              >
                {CAREER_FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.category} value={opt.category}>
                    {opt.emoji} {opt.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="available-hours-input" className="block text-sm font-medium text-[#1E1B2E]">
                  Available study/focus hours today
                </label>
                <span className="text-xs font-semibold text-[#6D4AFF] tabular-nums">
                  {availableHours}h
                </span>
              </div>
              <input
                id="available-hours-input"
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
                className="mt-2 w-full accent-[#6D4AFF]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="overload-threshold-input" className="block text-sm font-medium text-[#1E1B2E]">
                  Daily overload warning threshold
                </label>
                <span className="text-xs font-medium text-[#6D4AFF] tabular-nums">
                  {threshold} tasks / day
                </span>
              </div>
              <input
                id="overload-threshold-input"
                type="range"
                min={2}
                max={8}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-[#6D4AFF]"
              />
            </div>
          </div>

          {/* Reminder Preferences */}
          <div className="border-t border-[#E5DFF2] pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#6D4AFF]" />
              <h3 className="text-sm font-semibold text-[#1E1B2E]">Reminder Preferences</h3>
            </div>

            {/* Honest Email Connection Status */}
            {emailSetupReady && verifiedEmail ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-xs text-[#15803D]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Verified email ready: {verifiedEmail}</p>
                  <p className="mt-0.5 text-[#166534]">
                    Reminders only send while you are signed in and have opted in below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2.5 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3 text-xs text-[#9A3412]">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#C2410C]" />
                  <div>
                    <p className="font-semibold">Email reminders setup required</p>
                    <p className="mt-0.5">
                      Sign in with Google and grant Gmail send permission in Integrations to deliver real emails to your verified address.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenIntegrations();
                  }}
                  className="shrink-0 rounded-lg bg-white border border-[#FED7AA] px-2.5 py-1.5 text-[11px] font-semibold text-[#9A3412] hover:bg-[#FFEDD5] whitespace-nowrap"
                >
                  Open Integrations
                </button>
              </div>
            )}

            <div className="space-y-2.5 rounded-xl border border-[#EDE9F6] bg-[#FAF9FE] p-3.5 text-xs">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="font-semibold text-[#1E1B2E] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#6D4AFF]" />
                    Email reminders (explicit opt-in)
                  </span>
                  <span className="block text-[11px] text-[#5B5570]">
                    Allow NextUp to send reminder emails to your verified email
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={emailRemindersEnabled}
                  onChange={(e) => setEmailRemindersEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6D4AFF]"
                />
              </label>

              <div className="border-t border-[#EDE9F6] pt-2.5 flex items-center justify-between gap-3">
                <label htmlFor="pref-morning-email" className="flex-1 cursor-pointer">
                  <span className="font-medium text-[#1E1B2E]">Daily briefing email</span>
                  <span className="block text-[11px] text-[#5B5570]">
                    Sends a Morning plan before 5 PM or an Evening wrap-up from 5 PM onward while NextUp is open
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label="Daily briefing time"
                    value={morningBriefingTime}
                    onChange={(e) => setMorningBriefingTime(e.target.value)}
                    className="rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs text-[#1E1B2E] tabular-nums"
                  />
                  <input
                    id="pref-morning-email"
                    type="checkbox"
                    checked={morningBriefingEmailEnabled}
                    onChange={(e) => setMorningBriefingEmailEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#6D4AFF]"
                  />
                </div>
              </div>

              <div className="border-t border-[#EDE9F6] pt-2.5 flex items-center justify-between gap-3">
                <label htmlFor="pref-midday-checkin" className="flex-1 cursor-pointer">
                  <span className="font-medium text-[#1E1B2E]">Midday check-in</span>
                  <span className="block text-[11px] text-[#5B5570]">
                    Nudge to review afternoon progress
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label="Midday check-in time"
                    value={middayCheckInTime}
                    onChange={(e) => setMiddayCheckInTime(e.target.value)}
                    className="rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs text-[#1E1B2E] tabular-nums"
                  />
                  <input
                    id="pref-midday-checkin"
                    type="checkbox"
                    checked={middayCheckInEnabled}
                    onChange={(e) => setMiddayCheckInEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#6D4AFF]"
                  />
                </div>
              </div>

              <label className="border-t border-[#EDE9F6] pt-2.5 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="font-medium text-[#1E1B2E]">Task deadline reminders</span>
                  <span className="block text-[11px] text-[#5B5570]">
                    Send reminders configured on individual tasks (no duplicates)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={taskDeadlineRemindersEnabled}
                  onChange={(e) => setTaskDeadlineRemindersEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6D4AFF]"
                />
              </label>

              <div className="border-t border-[#EDE9F6] pt-2.5 flex items-center justify-between gap-3">
                <label htmlFor="pref-reminder-freq" className="font-medium text-[#1E1B2E]">
                  Preferred reminder frequency
                </label>
                <select
                  id="pref-reminder-freq"
                  value={preferredReminderFrequency}
                  onChange={(e) =>
                    setPreferredReminderFrequency(e.target.value as ReminderFrequency)
                  }
                  className="rounded-lg border border-[#E5DFF2] bg-white px-2.5 py-1.5 text-xs text-[#1E1B2E] focus:border-[#6D4AFF] focus:outline-none"
                >
                  <option value="each_reminder">At each scheduled time</option>
                  <option value="hourly_digest">Hourly digest</option>
                  <option value="daily_summary">Daily summary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Workspace Local Data */}
          <div className="border-t border-[#E5DFF2] pt-4 space-y-2">
            <p className="text-xs font-medium text-[#5B5570]">Workspace data (stored locally)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  onClose();
                }}
                className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 py-2 text-xs font-medium text-[#1E1B2E] hover:bg-[#F1ECFA] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#6D4AFF]" />
                Load sample student data
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Start completely blank
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    onClose();
                  }}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#B91C1C] px-3 py-2 text-xs font-medium text-white hover:bg-[#991B1B] transition-colors"
                >
                  Confirm clear all tasks & apps
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors"
            >
              Save preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
