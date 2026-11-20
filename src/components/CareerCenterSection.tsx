import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  buildJobPlatformLinks,
  CAREER_FOCUS_OPTIONS,
  getDefaultSearchQueryForFocus,
  JobPlatformCardInfo,
} from '../services/careerGuidance';
import {
  CareerFocusCategory,
  CareerInsightsPlan,
  JobApplication,
  Task,
  TaskCategory,
  TaskPriority,
} from '../types/nextup';
import { addDaysToDateKey, toLocalDateKey } from '../utils/dateUtils';

interface CareerCenterSectionProps {
  firstName: string;
  careerFocus: CareerFocusCategory;
  customCareerFocus: string;
  insights: CareerInsightsPlan;
  isLoadingInsights: boolean;
  applications: JobApplication[];
  tasks: Task[];
  onSelectCareerFocus: (category: CareerFocusCategory) => void;
  onChangeCustomCareerFocus: (value: string) => void;
  onRefreshInsights: () => void;
  onQuickAddCareerTask: (
    title: string,
    category: TaskCategory,
    priority: TaskPriority,
    deadline: string,
    deadlineTime?: string,
    estimatedMinutes?: number
  ) => void;
}

type InsightTab = 'roles_skills' | 'prep_strategy' | 'resources_keywords';

const PlatformLogo: React.FC<{ id: JobPlatformCardInfo['id'] }> = ({ id }) => {
  switch (id) {
    case 'linkedin':
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A66C2] text-white shadow-2xs">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
            <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
          </svg>
        </span>
      );
    case 'indeed':
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2557A7] text-white shadow-2xs">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
            <circle cx="12" cy="5.5" r="2.2" />
            <path d="M9.8 10.2C9.8 9.4 10.8 8.8 12 8.8C13.2 8.8 14.2 9.4 14.2 10.2V19.5C14.2 20.3 13.2 21 12 21C10.8 21 9.8 20.3 9.8 19.5V10.2Z" />
          </svg>
        </span>
      );
    case 'naukri':
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-2xs">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 19V5l12 14V5" />
          </svg>
        </span>
      );
    case 'glassdoor':
      return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0CAA41] text-white shadow-2xs">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 5h9v3H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="M7 16h9v3H7a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z" />
            <path d="M16 8v8" />
          </svg>
        </span>
      );
  }
};

export const CareerCenterSection: React.FC<CareerCenterSectionProps> = ({
  firstName,
  careerFocus,
  customCareerFocus,
  insights,
  isLoadingInsights,
  applications,
  onSelectCareerFocus,
  onChangeCustomCareerFocus,
  onRefreshInsights,
  onQuickAddCareerTask,
}) => {
  const [activeTab, setActiveTab] = useState<InsightTab>('roles_skills');
  const [selectedSearchOverride, setSelectedSearchOverride] = useState<string>('');

  const today = toLocalDateKey();
  const inTwoDays = addDaysToDateKey(today, 2);

  const selectedOption = useMemo(
    () => CAREER_FOCUS_OPTIONS.find((o) => o.category === careerFocus) ?? CAREER_FOCUS_OPTIONS[0],
    [careerFocus]
  );

  const activeFocusLabel =
    careerFocus === 'Other' && customCareerFocus.trim()
      ? customCareerFocus.trim()
      : careerFocus;

  const activeQuery =
    selectedSearchOverride.trim() || getDefaultSearchQueryForFocus(careerFocus, customCareerFocus);

  const platformCards = useMemo(
    () => buildJobPlatformLinks(careerFocus, customCareerFocus, selectedSearchOverride),
    [careerFocus, customCareerFocus, selectedSearchOverride]
  );

  const activeAppCount = useMemo(
    () => applications.filter((a) => a.status !== 'Rejected' && a.status !== 'Offer').length,
    [applications]
  );

  const handleChooseCategory = (category: CareerFocusCategory) => {
    setSelectedSearchOverride('');
    onSelectCareerFocus(category);
  };

  return (
    <section aria-label="Career focus, insights, and opportunities" className="space-y-4">
      {/* 1. My Career Focus + 2. Career Insights Split / Unified Flow */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* My Career Focus Card */}
        <div className="overflow-hidden rounded-2xl border border-[#DDD6FE] bg-white shadow-2xs lg:col-span-5">
          <div className="flex items-center justify-between gap-2 border-b border-[#EDE9F6] bg-gradient-to-r from-[#F6F2FF] to-[#FAF8FF] px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6D4AFF] shadow-2xs border border-[#E5DFF2]">
                <Target className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#1E1B2E]">
                  🎯 My Career Focus
                </h2>
                <p className="text-xs text-[#5B5570]">
                  Choose your target track to personalize AI guidance &amp; job searches
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CAREER_FOCUS_OPTIONS.map((opt) => {
                const isSelected = careerFocus === opt.category;
                return (
                  <button
                    key={opt.category}
                    type="button"
                    onClick={() => handleChooseCategory(opt.category)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                      isSelected
                        ? 'border-[#6D4AFF] bg-[#F3EFFF] ring-2 ring-[#6D4AFF]/20 shadow-2xs'
                        : 'border-[#E5DFF2] bg-[#FAF9FE] hover:border-[#C4B5FD] hover:bg-white'
                    }`}
                  >
                    <span className="text-lg leading-none shrink-0" aria-hidden="true">
                      {opt.emoji}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-[#4C2F96]' : 'text-[#1E1B2E]'
                        }`}
                      >
                        {opt.category}
                      </p>
                      <p className="text-[11px] text-[#5B5570] truncate">{opt.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {careerFocus === 'Other' && (
              <div className="rounded-xl border border-[#DDD6FE] bg-[#FAF8FF] p-3">
                <label
                  htmlFor="custom-career-focus-input"
                  className="block text-xs font-semibold text-[#4C2F96]"
                >
                  Specify your custom target role or industry
                </label>
                <input
                  id="custom-career-focus-input"
                  type="text"
                  value={customCareerFocus}
                  onChange={(e) => {
                    setSelectedSearchOverride('');
                    onChangeCustomCareerFocus(e.target.value);
                  }}
                  placeholder="e.g., Software Engineering, UX Design, Biotech Research"
                  className="mt-1.5 min-h-[40px] w-full rounded-xl border border-[#DDD6FE] bg-white px-3 text-sm text-[#1E1B2E] placeholder:text-[#8E87A6] focus:border-[#6D4AFF] focus:outline-none"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EDE9F6] bg-[#FAF9FE] px-3.5 py-2.5 text-xs">
              <span className="text-[#5B5570]">
                Active focus:{' '}
                <strong className="font-semibold text-[#1E1B2E]">
                  {selectedOption.emoji} {activeFocusLabel}
                </strong>
              </span>
              <span className="font-medium text-[#6D4AFF] tabular-nums">
                {activeAppCount} active app{activeAppCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        {/* AI Career Insights Card */}
        <div className="overflow-hidden rounded-2xl border border-[#D4C8F2] bg-white shadow-2xs lg:col-span-7">
          <div className="flex flex-col gap-2.5 border-b border-[#E4DCF7] bg-gradient-to-r from-[#F5F1FF] via-[#F1EBFF] to-[#FAF8FF] px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-[#1E1B2E]">💡 Career Insights</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5B38EE]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {insights.source === 'gemini' ? 'Gemini AI Guidance' : 'Tailored Career Plan'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#6D4AFF]">
                  Personalized for {firstName ? `${firstName} · ` : ''}
                  {activeFocusLabel}
                </p>
                <p className="mt-1 text-sm leading-snug text-[#4C4563]">{insights.summary}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefreshInsights}
              disabled={isLoadingInsights}
              className="flex min-h-[38px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#D4C8F2] bg-white px-3 text-xs font-semibold text-[#4C2F96] hover:bg-[#EDE9FE] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw
                className={`h-4 w-4 text-[#6D4AFF] ${isLoadingInsights ? 'animate-spin' : ''}`}
              />
              <span>{isLoadingInsights ? 'Analyzing...' : 'Refresh AI Insights'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Compact Interactive Insight Tabs */}
            <div
              role="tablist"
              aria-label="Career insights categories"
              className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-[#F3EFFF] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'roles_skills'}
                onClick={() => setActiveTab('roles_skills')}
                className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'roles_skills'
                    ? 'bg-white text-[#5B38EE] shadow-2xs'
                    : 'text-[#5B5570] hover:text-[#1E1B2E]'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Roles, Skills &amp; Priorities</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'prep_strategy'}
                onClick={() => setActiveTab('prep_strategy')}
                className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'prep_strategy'
                    ? 'bg-white text-[#5B38EE] shadow-2xs'
                    : 'text-[#5B5570] hover:text-[#1E1B2E]'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Interview, Search &amp; Resume</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'resources_keywords'}
                onClick={() => setActiveTab('resources_keywords')}
                className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'resources_keywords'
                    ? 'bg-white text-[#5B38EE] shadow-2xs'
                    : 'text-[#5B5570] hover:text-[#1E1B2E]'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resources &amp; Keywords</span>
              </button>
            </div>

            {activeTab === 'roles_skills' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Recommended Roles */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1B2E]">
                        <Briefcase className="h-4 w-4 text-[#6D4AFF]" aria-hidden="true" />
                        <span>Recommended Roles</span>
                      </h3>
                      <span className="text-[11px] text-[#5B5570]">Click to search below</span>
                    </div>
                    <div className="space-y-1.5">
                      {insights.recommendedRoles.map((role) => {
                        const isSearchSelected = selectedSearchOverride === role;
                        return (
                          <div
                            key={role}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                              isSearchSelected
                                ? 'border-[#6D4AFF] bg-[#F3EFFF]'
                                : 'border-[#EDE9F6] bg-[#FAF9FE] hover:border-[#C4B5FD]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSearchOverride((prev) => (prev === role ? '' : role))
                              }
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left font-medium text-[#1E1B2E] hover:text-[#5B38EE]"
                            >
                              <Search className="h-3.5 w-3.5 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
                              <span className="truncate">{role}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onQuickAddCareerTask(
                                  `Explore & apply for ${role} openings`,
                                  'Career',
                                  'Should Do',
                                  inTwoDays,
                                  undefined,
                                  45
                                )
                              }
                              title={`Add task to apply for ${role}`}
                              aria-label={`Add task for ${role}`}
                              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#DDD6FE] bg-white px-2 text-[11px] font-medium text-[#5B38EE] hover:bg-[#EDE9FE]"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Task</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills to Develop */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1B2E]">
                        <Compass className="h-4 w-4 text-[#0D9488]" aria-hidden="true" />
                        <span>Skills to Develop</span>
                      </h3>
                      <span className="text-[11px] text-[#5B5570]">Track as task</span>
                    </div>
                    <div className="space-y-1.5">
                      {insights.skillsToDevelop.map((skill) => (
                        <div
                          key={skill}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA]/70 px-3 py-2 text-xs"
                        >
                          <span className="text-[#134E4A] leading-snug">{skill}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickAddCareerTask(
                                `Practice skill: ${skill}`,
                                'Career',
                                'Should Do',
                                inTwoDays,
                                undefined,
                                45
                              )
                            }
                            title={`Add study task for ${skill}`}
                            aria-label={`Add study task for ${skill}`}
                            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#99F6E4] bg-white px-2 text-[11px] font-medium text-[#0F766E] hover:bg-[#CCFBF1]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Prep</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Opportunity Priorities */}
                <div className="rounded-xl border border-[#FED7AA] bg-[#FFFBF5] p-3.5 space-y-2">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9A3412]">
                    <Sparkles className="h-4 w-4 text-[#EA580C]" aria-hidden="true" />
                    <span>AI Opportunity Priorities</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#7C2D12]">
                    {insights.opportunityPriorities.map((tip) => (
                      <li key={tip} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EA580C]" aria-hidden="true" />
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'prep_strategy' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {/* Interview Preparation */}
                  <div className="rounded-xl border border-[#DDD6FE] bg-[#FAF8FF] p-3.5 space-y-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4C2F96]">
                      <MessageSquare className="h-4 w-4 text-[#6D4AFF]" aria-hidden="true" />
                      <span>Interview Preparation</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-[#4C4563]">
                      {insights.interviewPrepTips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6D4AFF]" aria-hidden="true" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Job Search Strategies */}
                  <div className="rounded-xl border border-[#BFDBFE] bg-[#F5F9FF] p-3.5 space-y-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A]">
                      <Compass className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                      <span>Job Search Strategies</span>
                    </h3>
                    <ul className="space-y-2 text-xs text-[#1E40AF]">
                      {insights.jobSearchStrategies.map((strategy) => (
                        <li key={strategy} className="flex items-start gap-2 leading-relaxed">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
                          <span>{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Resume & Application Improvement Suggestions */}
                <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
                      <FileText className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
                      <span>Resume &amp; Application Improvements</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        onQuickAddCareerTask(
                          `Tailor resume bullets for ${activeFocusLabel} applications`,
                          'Career',
                          'Should Do',
                          inTwoDays,
                          undefined,
                          40
                        )
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#BBF7D0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#15803D] hover:bg-[#DCFCE7]"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add resume task</span>
                    </button>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#166534]">
                    {insights.resumeAndAppTips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" aria-hidden="true" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'resources_keywords' && (
              <div className="space-y-4">
                {/* Search Keywords */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1B2E]">
                      <Search className="h-4 w-4 text-[#6D4AFF]" aria-hidden="true" />
                      <span>Tailored Job Search Keywords</span>
                    </h3>
                    <span className="text-[11px] text-[#5B5570]">
                      Select any keyword to update job board links below
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {insights.searchKeywords.map((kw) => {
                      const active = selectedSearchOverride === kw;
                      return (
                        <button
                          key={kw}
                          type="button"
                          onClick={() =>
                            setSelectedSearchOverride((prev) => (prev === kw ? '' : kw))
                          }
                          className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors ${
                            active
                              ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white'
                              : 'border-[#DDD6FE] bg-[#FAF8FF] text-[#4C2F96] hover:bg-[#EDE9FE]'
                          }`}
                        >
                          <Search className="h-3 w-3" aria-hidden="true" />
                          <span>{kw}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Industry Articles & Learning Resources */}
                <div className="space-y-2">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1B2E]">
                    <BookOpen className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Industry Articles &amp; Learning Resources</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {insights.learningResources.map((res) => (
                      <a
                        key={res.url}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col justify-between rounded-xl border border-[#E5DFF2] bg-[#FAF9FE] p-3 transition-all hover:-translate-y-0.5 hover:border-[#6D4AFF] hover:bg-white hover:shadow-xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[11px] font-semibold text-[#6D4AFF]">
                              {res.source}
                            </span>
                            <ExternalLink
                              className="h-3.5 w-3.5 shrink-0 text-[#7C7594] group-hover:text-[#6D4AFF]"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="mt-1 text-xs font-bold text-[#1E1B2E] group-hover:text-[#5B38EE]">
                            {res.title}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-[#5B5570]">
                            {res.description}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Explore Job Opportunities (Clearly External Links, Distinct from Integrations) */}
      <section className="overflow-hidden rounded-2xl border border-[#DDD6FE] bg-white shadow-2xs">
        <div className="flex flex-col gap-2 border-b border-[#EDE9F6] bg-gradient-to-r from-[#F6F2FF] via-[#F2EEFF] to-[#FAF8FF] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1E1B2E]">
                🚀 Explore Job Opportunities
              </h2>
              <p className="text-xs text-[#5B5570]">
                External job boards pre-searched for{' '}
                <strong className="font-semibold text-[#4C2F96]">{activeQuery}</strong> · Opens in a
                new tab (not connected or synced)
              </p>
            </div>
          </div>

          {selectedSearchOverride && (
            <button
              type="button"
              onClick={() => setSelectedSearchOverride('')}
              className="self-start sm:self-auto cursor-pointer rounded-xl border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B38EE] hover:bg-[#EDE9FE] whitespace-nowrap"
            >
              Reset to {activeFocusLabel} default
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          {platformCards.map((platform) => (
            <article
              key={platform.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-xs ${platform.accentBorder} ${platform.accentBg}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <PlatformLogo id={platform.id} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#1E1B2E]">{platform.name}</h3>
                    <p className="text-[11px] font-medium text-[#5B5570]">External job search</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-[#4C4563]">{platform.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-medium text-[#5B5570]" title={platform.queryLabel}>
                  Search: {platform.queryLabel}
                </span>
                <a
                  href={platform.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white transition-colors whitespace-nowrap ${platform.buttonBg}`}
                >
                  <span>Explore jobs</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};
