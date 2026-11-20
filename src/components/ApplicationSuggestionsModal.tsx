import React, { useEffect, useState } from 'react';
import { Briefcase, Check, X } from 'lucide-react';
import { ApplicationStatus, JobApplication, SuggestedTaskDraft } from '../types/nextup';

interface ApplicationSuggestionsModalProps {
  isOpen: boolean;
  mode: 'new_followup' | 'status_change' | 'rejection_reflection';
  application: JobApplication | null;
  newStatus?: ApplicationStatus;
  initialDrafts: SuggestedTaskDraft[];
  onClose: () => void;
  onApproveTasks: (drafts: SuggestedTaskDraft[]) => void;
  onSaveReflection?: (appId: string, reflection: string) => void;
}

export const ApplicationSuggestionsModal: React.FC<ApplicationSuggestionsModalProps> = ({
  isOpen,
  mode,
  application,
  newStatus,
  initialDrafts,
  onClose,
  onApproveTasks,
  onSaveReflection,
}) => {
  const [drafts, setDrafts] = useState<SuggestedTaskDraft[]>(initialDrafts);
  const [reflection, setReflection] = useState(application?.reflectionNote ?? '');

  useEffect(() => {
    if (!isOpen) return;
    setDrafts(initialDrafts);
    setReflection(application?.reflectionNote ?? '');
  }, [isOpen, initialDrafts, application]);

  if (!isOpen || !application) return null;

  const toggleSelect = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const updateDraft = (id: string, patch: Partial<SuggestedTaskDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const selectedCount = drafts.filter((d) => d.selected && d.title.trim()).length;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'rejection_reflection') {
      if (onSaveReflection) {
        onSaveReflection(application.id, reflection.trim());
      }
      onClose();
      return;
    }

    const approved = drafts.filter((d) => d.selected && d.title.trim());
    if (approved.length > 0) {
      onApproveTasks(approved);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/40 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-[#E5DFF2] pb-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#6D4AFF]">
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#1E1B2E]">
                {mode === 'new_followup'
                  ? `Suggested follow-up for ${application.company}`
                  : mode === 'rejection_reflection'
                    ? `${application.company} marked as closed`
                    : `${application.company} moved to ${newStatus}`}
              </h2>
              <p className="mt-0.5 text-xs text-[#5B5570]">
                {mode === 'new_followup'
                  ? 'Customise or approve this follow-up task. Nothing is added without your confirmation.'
                  : mode === 'rejection_reflection'
                    ? 'No extra tasks were created. Capture an optional reflection while it is fresh.'
                    : `Select and edit the prep tasks you want to add for ${application.role}.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss suggestions"
            className="flex h-10 w-10 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="mt-4 space-y-3">
          {mode === 'rejection_reflection' ? (
            <div>
              <label htmlFor="rejection-reflection" className="block text-sm font-medium text-[#1E1B2E]">
                Reflection note <span className="font-normal text-[#7C7594]">(optional)</span>
              </label>
              <textarea
                id="rejection-reflection"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Any interview takeaways, feedback, or ideas for future applications..."
                className="mt-1.5 w-full rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3.5 py-2.5 text-sm text-[#1E1B2E] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    draft.selected
                      ? 'border-[#DDD6FE] bg-[#FAF9FE]'
                      : 'border-[#E5DFF2] bg-white opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSelect(draft.id)}
                      aria-label={draft.selected ? 'Deselect suggested task' : 'Select suggested task'}
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        draft.selected
                          ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white'
                          : 'border-[#C9BFE3] bg-white'
                      }`}
                    >
                      {draft.selected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
                        className="w-full rounded-lg border border-[#E5DFF2] bg-white px-2.5 py-1.5 text-sm font-medium text-[#1E1B2E] focus:border-[#6D4AFF] focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={draft.deadline}
                          onChange={(e) => updateDraft(draft.id, { deadline: e.target.value })}
                          className="rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
                        />
                        <input
                          type="time"
                          value={draft.deadlineTime || ''}
                          onChange={(e) =>
                            updateDraft(draft.id, { deadlineTime: e.target.value || undefined })
                          }
                          className="rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
                        />
                        <select
                          value={draft.priority}
                          onChange={(e) =>
                            updateDraft(draft.id, {
                              priority: e.target.value as SuggestedTaskDraft['priority'],
                            })
                          }
                          className="rounded-lg border border-[#E5DFF2] bg-white px-2 py-1 text-xs text-[#1E1B2E] focus:border-[#6D4AFF] focus:outline-none"
                        >
                          <option value="Must Do">Must Do</option>
                          <option value="Should Do">Should Do</option>
                          <option value="Can Wait">Can Wait</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA] transition-colors"
            >
              {mode === 'rejection_reflection' ? 'Close' : 'Skip'}
            </button>
            <button
              type="submit"
              disabled={mode !== 'rejection_reflection' && selectedCount === 0}
              className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] disabled:opacity-45 transition-colors"
            >
              {mode === 'rejection_reflection'
                ? 'Save reflection'
                : `Add ${selectedCount} ${selectedCount === 1 ? 'task' : 'tasks'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
