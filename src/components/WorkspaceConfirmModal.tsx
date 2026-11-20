import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel?: string;
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  title,
  description,
  details = [],
  confirmLabel = 'Confirm',
  isProcessing = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/45 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws-confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#6D4AFF]">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="ws-confirm-title" className="text-base font-semibold text-[#1E1B2E]">
                {title}
              </h2>
              <p className="mt-1 text-sm text-[#5B5570]">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel action"
            className="flex h-9 w-9 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {details.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 text-xs text-[#1E1B2E]">
            {details.map((item, idx) => (
              <li key={idx} className="leading-snug">
                • {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-[#5B5570] hover:bg-[#F1ECFA] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="min-h-[44px] rounded-xl bg-[#6D4AFF] px-5 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
