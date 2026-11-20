import React from 'react';
import { Building2, Globe } from 'lucide-react';
import { JobPlatformId, JobPlatformSource } from '../types/nextup';

interface PlatformLogoProps {
  id: JobPlatformId;
  size?: 'sm' | 'md';
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({ id, size = 'md' }) => {
  const boxClass = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl';
  const svgClass = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  switch (id) {
    case 'linkedin':
      return (
        <span
          className={`flex shrink-0 items-center justify-center bg-[#0A66C2] text-white shadow-2xs ${boxClass}`}
        >
          <svg viewBox="0 0 24 24" className={`${svgClass} fill-current`} aria-hidden="true">
            <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
          </svg>
        </span>
      );
    case 'indeed':
      return (
        <span
          className={`flex shrink-0 items-center justify-center bg-[#2557A7] text-white shadow-2xs ${boxClass}`}
        >
          <svg viewBox="0 0 24 24" className={`${svgClass} fill-current`} aria-hidden="true">
            <circle cx="12" cy="5.5" r="2.2" />
            <path d="M9.8 10.2C9.8 9.4 10.8 8.8 12 8.8C13.2 8.8 14.2 9.4 14.2 10.2V19.5C14.2 20.3 13.2 21 12 21C10.8 21 9.8 20.3 9.8 19.5V10.2Z" />
          </svg>
        </span>
      );
    case 'naukri':
      return (
        <span
          className={`flex shrink-0 items-center justify-center bg-[#0F766E] text-white shadow-2xs ${boxClass}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`${svgClass} fill-none stroke-current`}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 19V5l12 14V5" />
          </svg>
        </span>
      );
    case 'glassdoor':
      return (
        <span
          className={`flex shrink-0 items-center justify-center bg-[#0CAA41] text-white shadow-2xs ${boxClass}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`${svgClass} fill-none stroke-current`}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 5h9v3H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="M7 16h9v3H7a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z" />
            <path d="M16 8v8" />
          </svg>
        </span>
      );
  }
};

const SOURCE_STYLE: Record<
  JobPlatformSource,
  { dotColor: string; textClass: string; bgClass: string; borderClass: string }
> = {
  'LinkedIn Jobs': {
    dotColor: '#0A66C2',
    textClass: 'text-[#0A66C2]',
    bgClass: 'bg-[#EFF6FF]',
    borderClass: 'border-[#BFDBFE]',
  },
  Indeed: {
    dotColor: '#2557A7',
    textClass: 'text-[#1E40AF]',
    bgClass: 'bg-[#EEF2FF]',
    borderClass: 'border-[#C7D2FE]',
  },
  Naukri: {
    dotColor: '#0F766E',
    textClass: 'text-[#0F766E]',
    bgClass: 'bg-[#F0FDFA]',
    borderClass: 'border-[#99F6E4]',
  },
  Glassdoor: {
    dotColor: '#0CAA41',
    textClass: 'text-[#15803D]',
    bgClass: 'bg-[#F0FDF4]',
    borderClass: 'border-[#BBF7D0]',
  },
  'Company Website': {
    dotColor: '#6D4AFF',
    textClass: 'text-[#5B38EE]',
    bgClass: 'bg-[#F5F2FF]',
    borderClass: 'border-[#DDD6FE]',
  },
  'Referral / Other': {
    dotColor: '#7C7594',
    textClass: 'text-[#5B5570]',
    bgClass: 'bg-[#FAF9FE]',
    borderClass: 'border-[#E5DFF2]',
  },
};

export const PlatformSourceBadge: React.FC<{ source: JobPlatformSource }> = ({ source }) => {
  const style = SOURCE_STYLE[source] ?? SOURCE_STYLE['Company Website'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${style.bgClass} ${style.borderClass} ${style.textClass}`}
    >
      {source === 'Company Website' ? (
        <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : source === 'Referral / Other' ? (
        <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <span
          className="h-2 w-2 rounded-xs shrink-0"
          style={{ backgroundColor: style.dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{source}</span>
    </span>
  );
};
