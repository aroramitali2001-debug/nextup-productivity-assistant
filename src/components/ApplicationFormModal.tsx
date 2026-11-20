import React, { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { ApplicationStatus, JobApplication } from '../types/nextup';
import { addDaysToDateKey, toLocalDateKey } from '../utils/dateUtils';

interface ApplicationFormModalProps {
  isOpen: boolean;
  initialApplication?: JobApplication | null;
  onClose: () => void;
  onSave: (
    data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void;
}

const STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
];

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  initialApplication,
  onClose,
  onSave,
}) => {
  const today = toLocalDateKey();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [applicationDate, setApplicationDate] = useState(today);
  const [applicationLink, setApplicationLink] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [followUpDate, setFollowUpDate] = useState('');
  const [includeFollowUpTime, setIncludeFollowUpTime] = useState(false);
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [recruiterContact, setRecruiterContact] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');
  const [reflectionNote, setReflectionNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialApplication) {
      setCompany(initialApplication.company);
      setRole(initialApplication.role);
      setApplicationDate(initialApplication.applicationDate);
      setApplicationLink(initialApplication.applicationLink ?? '');
      setStatus(initialApplication.status);
      setFollowUpDate(initialApplication.followUpDate ?? '');
      setIncludeFollowUpTime(Boolean(initialApplication.followUpTime));
      setFollowUpTime(initialApplication.followUpTime || '10:00');
      setRecruiterContact(initialApplication.recruiterContact ?? '');
      setNextAction(initialApplication.nextAction ?? '');
      setNotes(initialApplication.notes ?? '');
      setReflectionNote(initialApplication.reflectionNote ?? '');
    } else {
      setCompany('');
      setRole('');
      setApplicationDate(today);
      setApplicationLink('');
      setStatus('Applied');
      setFollowUpDate(addDaysToDateKey(today, 7));
      setIncludeFollowUpTime(false);
      setFollowUpTime('10:00');
      setRecruiterContact('');
      setNextAction('');
      setNotes('');
      setReflectionNote('');
    }
    setError('');
  }, [isOpen, initialApplication, today]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError('Company name and role are required.');
      return;
    }

    let formattedLink = applicationLink.trim();
    if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
      formattedLink = `https://${formattedLink}`;
    }

    onSave(
      {
        company: company.trim(),
        role: role.trim(),
        applicationDate: applicationDate || today,
        applicationLink: formattedLink || undefined,
        status,
        followUpDate: followUpDate || undefined,
        followUpTime:
          followUpDate && includeFollowUpTime && followUpTime ? followUpTime : undefined,
        recruiterContact: recruiterContact.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        notes: notes.trim() || undefined,
        reflectionNote: reflectionNote.trim() || undefined,
      },
      initialApplication?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-center justify-between border-b border-[#E5DFF2] pb-3">
          <h2 id="app-modal-title" className="text-lg font-semibold text-[#1E1B2E]">
            {initialApplication ? 'Edit Application' : 'Track Application'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application form"
            className="flex h-11 w-11 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="app-company-input" className="block text-sm font-medium text-[#1E1B2E]">
                Company name
              </label>
              <input
                id="app-company-input"
                type="text"
                autoFocus
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Stripe"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="app-role-input" className="block text-sm font-medium text-[#1E1B2E]">
                Role
              </label>
              <input
                id="app-role-input"
                type="text"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., SWE Intern"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-[#B91C1C]">{error}</p>}

          <div>
            <span className="block text-sm font-medium text-[#1E1B2E]">Status</span>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-[#F1ECFA] p-1">
              {STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`min-h-[38px] rounded-lg px-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    status === st
                      ? 'bg-white text-[#4C2F96] shadow-xs'
                      : 'text-[#5B5570] hover:text-[#1E1B2E]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="app-date-input" className="block text-sm font-medium text-[#1E1B2E]">
                Application date
              </label>
              <input
                id="app-date-input"
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="app-followup-input" className="block text-sm font-medium text-[#1E1B2E]">
                  Follow-up date
                </label>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={() => setIncludeFollowUpTime((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6D4AFF] hover:underline"
                  >
                    <Clock className="h-3 w-3" />
                    {includeFollowUpTime ? 'Remove time' : '+ Time'}
                  </button>
                )}
              </div>
              <input
                id="app-followup-input"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
              {followUpDate && includeFollowUpTime && (
                <input
                  type="time"
                  aria-label="Follow-up time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="mt-1.5 w-full min-h-[40px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-1.5 text-sm text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
                />
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFollowUpDate(today)}
                  className="rounded-lg bg-[#F7F5FC] px-2 py-1 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpDate(addDaysToDateKey(today, 7))}
                  className="rounded-lg bg-[#F7F5FC] px-2 py-1 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
                >
                  +7 days
                </button>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setFollowUpDate('');
                      setIncludeFollowUpTime(false);
                    }}
                    className="rounded-lg bg-[#F7F5FC] px-2 py-1 text-xs font-medium text-[#7C7594] hover:bg-[#F1ECFA]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="app-link-input" className="block text-sm font-medium text-[#1E1B2E]">
                Application link <span className="font-normal text-[#7C7594]">(optional)</span>
              </label>
              <input
                id="app-link-input"
                type="text"
                value={applicationLink}
                onChange={(e) => setApplicationLink(e.target.value)}
                placeholder="https://company.com/careers"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="app-recruiter-input" className="block text-sm font-medium text-[#1E1B2E]">
                Recruiter contact <span className="font-normal text-[#7C7594]">(optional)</span>
              </label>
              <input
                id="app-recruiter-input"
                type="text"
                value={recruiterContact}
                onChange={(e) => setRecruiterContact(e.target.value)}
                placeholder="Name, email, or LinkedIn"
                className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="app-next-action-input" className="block text-sm font-medium text-[#1E1B2E]">
              Next action <span className="font-normal text-[#7C7594]">(optional)</span>
            </label>
            <input
              id="app-next-action-input"
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Message campus recruiter or finish OA"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="app-notes-input" className="block text-sm font-medium text-[#1E1B2E]">
              Notes <span className="font-normal text-[#7C7594]">(optional)</span>
            </label>
            <textarea
              id="app-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referral name, interview details, or prep notes..."
              className="mt-1.5 w-full rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            />
          </div>

          {status === 'Rejected' && (
            <div>
              <label htmlFor="app-reflection-input" className="block text-sm font-medium text-[#1E1B2E]">
                Reflection note <span className="font-normal text-[#7C7594]">(optional)</span>
              </label>
              <textarea
                id="app-reflection-input"
                rows={2}
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="What went well or what would you try next time?"
                className="mt-1.5 w-full rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors"
            >
              {initialApplication ? 'Save changes' : 'Save application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
