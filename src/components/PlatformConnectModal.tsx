import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { JOB_PLATFORM_ADAPTERS, parseApplicationsCsv } from '../services/jobPlatforms';
import { RecruitmentEmailInsight, scanRecruitmentEmails } from '../services/workspaceApis';
import {
  ApplicationStatus,
  JobApplication,
  JobPlatformId,
  JobPlatformSource,
} from '../types/nextup';
import { toLocalDateKey } from '../utils/dateUtils';
import { PlatformLogo } from './PlatformLogo';

interface PlatformConnectModalProps {
  platformId: JobPlatformId | null;
  accessToken: string | null;
  gmailReadConnected: boolean;
  isSigningIn: boolean;
  onClose: () => void;
  onConnectGoogle: () => Promise<void>;
  onImportApplications: (
    apps: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[],
    sourceLabel?: string
  ) => void;
  onOpenManualTrack: (platform: JobPlatformSource) => void;
}

function mapDetectedTypeToStatus(type: RecruitmentEmailInsight['detectedType']): ApplicationStatus {
  switch (type) {
    case 'Interview':
      return 'Interview';
    case 'Assessment':
      return 'Assessment';
    case 'Offer':
      return 'Offer';
    case 'Rejection':
      return 'Rejected';
    default:
      return 'Applied';
  }
}

export const PlatformConnectModal: React.FC<PlatformConnectModalProps> = ({
  platformId,
  accessToken,
  gmailReadConnected,
  isSigningIn,
  onClose,
  onConnectGoogle,
  onImportApplications,
  onOpenManualTrack,
}) => {
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState('');
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [scannedOnce, setScannedOnce] = useState(false);
  const [emailMatches, setEmailMatches] = useState<RecruitmentEmailInsight[]>([]);
  const [importedEmailIds, setImportedEmailIds] = useState<Set<string>>(new Set());

  const adapter = platformId ? JOB_PLATFORM_ADAPTERS[platformId] : null;

  const parsedCsvApps = useMemo(() => {
    if (!adapter || !csvText.trim()) return [];
    return parseApplicationsCsv(csvText, adapter.platform);
  }, [adapter, csvText]);

  if (!platformId || !adapter) return null;

  const handleScanGmail = async () => {
    if (!accessToken) return;
    setGmailLoading(true);
    setGmailError('');
    try {
      const results = await scanRecruitmentEmails(accessToken, platformId);
      setEmailMatches(results);
      setScannedOnce(true);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'Unable to scan Gmail.');
    } finally {
      setGmailLoading(false);
    }
  };

  const handleImportSingleEmail = (em: RecruitmentEmailInsight) => {
    const company = em.suggestedCompany || adapter.name;
    const role = em.suggestedRole || em.subject.slice(0, 60);
    onImportApplications(
      [
        {
          company,
          role,
          status: mapDetectedTypeToStatus(em.detectedType),
          applicationDate: em.applicationDate || toLocalDateKey(),
          sourcePlatform: em.sourcePlatform || adapter.platform,
          applicationLink: em.detectedUrl,
          notes: `Imported from Gmail (${em.subject})`,
        },
      ],
      `${adapter.name} Gmail confirmation`
    );
    setImportedEmailIds((prev) => new Set(prev).add(em.id));
  };

  const handleImportAllEmails = () => {
    const ready = emailMatches.filter((em) => !importedEmailIds.has(em.id));
    if (ready.length === 0) return;
    onImportApplications(
      ready.map((em) => ({
        company: em.suggestedCompany || adapter.name,
        role: em.suggestedRole || em.subject.slice(0, 60),
        status: mapDetectedTypeToStatus(em.detectedType),
        applicationDate: em.applicationDate || toLocalDateKey(),
        sourcePlatform: em.sourcePlatform || adapter.platform,
        applicationLink: em.detectedUrl,
        notes: `Imported from Gmail (${em.subject})`,
      })),
      `${adapter.name} Gmail scan`
    );
    setImportedEmailIds(new Set(emailMatches.map((em) => em.id)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCsvText(content);
      if (parseApplicationsCsv(content, adapter.platform).length === 0) {
        setCsvError(
          'Could not detect Company & Role columns. Check that your CSV includes header columns like "Company Name, Job Title" or "Company, Role".'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = () => {
    if (parsedCsvApps.length === 0) {
      setCsvError('Paste or upload a valid CSV with Company and Role columns first.');
      return;
    }
    onImportApplications(parsedCsvApps, `${adapter.name} CSV export`);
    setCsvText('');
    setCsvError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1E1B2E]/45 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="platform-connect-title"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5DFF2] sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E5DFF2] pb-4">
          <div className="flex items-center gap-3">
            <PlatformLogo id={platformId} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="platform-connect-title" className="text-lg font-bold text-[#1E1B2E]">
                  Connect {adapter.name}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#9A3412]">
                  Direct API: {adapter.directApiStatus}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#5B5570]">
                Smart Application Sync options &amp; official import alternatives
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close platform connection modal"
            className="flex h-10 w-10 -mr-2 items-center justify-center rounded-xl text-[#5B5570] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Honest Direct API Status Disclosure */}
          <div className="rounded-xl border border-[#FED7AA] bg-[#FFFBF5] p-3.5 text-xs text-[#7C2D12] space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-[#9A3412]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#EA580C]" />
              <span>Why direct automatic sync is not active</span>
            </p>
            <p className="leading-relaxed">{adapter.directApiSummary}</p>
            <p className="leading-relaxed text-[#9A3412]/90">{adapter.directApiRequirement}</p>
          </div>

          {/* Supported Alternative 1: Gmail Auto-Detection */}
          <section className="rounded-2xl border border-[#DDD6FE] bg-[#FAF8FF] p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF]">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B2E]">
                    1. Auto-detect via Gmail confirmations (Supported today)
                  </h3>
                  <p className="text-xs text-[#5B5570]">
                    Scans your authorized Gmail read-only for {adapter.name} application receipts,
                    assessments, and interview invites.
                  </p>
                </div>
              </div>

              {gmailReadConnected ? (
                <button
                  type="button"
                  onClick={() => void handleScanGmail()}
                  disabled={gmailLoading}
                  className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3.5 text-xs font-semibold text-white hover:bg-[#5B38EE] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${gmailLoading ? 'animate-spin' : ''}`} />
                  <span>{gmailLoading ? 'Scanning...' : `Scan ${adapter.name} emails`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onConnectGoogle()}
                  disabled={isSigningIn}
                  className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[#DDD6FE] bg-white px-3.5 text-xs font-semibold text-[#5B38EE] hover:bg-[#EDE9FE] disabled:opacity-50"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>

            {gmailError && (
              <p className="flex items-center gap-1.5 text-xs text-[#DC2626]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{gmailError}</span>
              </p>
            )}

            {scannedOnce && emailMatches.length === 0 && !gmailLoading && (
              <p className="rounded-xl border border-[#E5DFF2] bg-white px-3 py-2.5 text-xs text-[#5B5570]">
                No {adapter.name} application or update emails found in the last 60 days.
              </p>
            )}

            {emailMatches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#4C2F96]">
                    Found {emailMatches.length} {adapter.name} email
                    {emailMatches.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={handleImportAllEmails}
                    className="cursor-pointer font-semibold text-[#6D4AFF] hover:underline"
                  >
                    Import all to Tracker
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {emailMatches.map((em) => {
                    const alreadyImported = importedEmailIds.has(em.id);
                    return (
                      <div
                        key={em.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E5DFF2] bg-white p-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1E1B2E] truncate">
                            {em.suggestedCompany || adapter.name}
                            {em.suggestedRole ? ` · ${em.suggestedRole}` : ''}
                          </p>
                          <p className="text-[11px] text-[#5B5570] truncate">{em.subject}</p>
                          <p className="text-[11px] font-medium text-[#6D4AFF]">
                            Stage: {em.detectedType}
                            {em.applicationDate ? ` · ${em.applicationDate}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyImported}
                          onClick={() => handleImportSingleEmail(em)}
                          className={`inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-colors ${
                            alreadyImported
                              ? 'border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                              : 'cursor-pointer border border-[#DDD6FE] bg-[#F5F2FF] text-[#5B38EE] hover:bg-[#EDE9FE]'
                          }`}
                        >
                          {alreadyImported ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Imported</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>Import</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Supported Alternative 2: Official Export / CSV Import */}
          <section className="rounded-2xl border border-[#E5DFF2] bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B2E]">
                    2. {adapter.officialExportTitle} (Supported today)
                  </h3>
                  <p className="text-xs text-[#5B5570] leading-relaxed">
                    {adapter.officialExportHint}
                  </p>
                </div>
              </div>

              <label className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 text-xs font-semibold text-[#1E1B2E] hover:bg-[#F1ECFA]">
                <Upload className="h-3.5 w-3.5 text-[#6D4AFF]" />
                <span>Choose .csv file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (csvError) setCsvError('');
              }}
              placeholder={`Paste CSV rows here (example):\n${adapter.sampleCsvExample}`}
              aria-label={`Paste ${adapter.name} CSV rows`}
              className="w-full rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] px-3 py-2 font-mono text-xs text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:bg-white focus:outline-none"
            />

            {csvError && <p className="text-xs font-medium text-[#DC2626]">{csvError}</p>}

            {parsedCsvApps.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs">
                <span className="font-semibold text-[#15803D]">
                  Ready to import {parsedCsvApps.length} application
                  {parsedCsvApps.length === 1 ? '' : 's'} tagged as {adapter.platform}
                </span>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D]"
                >
                  Import {parsedCsvApps.length} to Tracker
                </button>
              </div>
            )}
          </section>

          {/* Supported Alternative 3: Log Manually with Platform Pre-Selected */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5DFF2] bg-[#FAF9FE] px-4 py-3">
            <p className="text-xs text-[#5B5570]">
              Applied directly on {adapter.name} just now? Log it in seconds with{' '}
              <strong className="font-semibold text-[#1E1B2E]">{adapter.platform}</strong> pre-selected.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenManualTrack(adapter.platform);
              }}
              className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3.5 text-xs font-semibold text-white hover:bg-[#5B38EE]"
            >
              <Plus className="h-4 w-4" />
              <span>Track {adapter.name} application</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
