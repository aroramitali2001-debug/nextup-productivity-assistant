import { ApplicationStatus, TaskCategory, TaskPriority } from '../types/nextup';

export const CATEGORY_COLOR: Record<
  TaskCategory,
  {
    text: string;
    softBg: string;
    dot: string;
    border: string;
  }
> = {
  College: {
    text: 'text-[#1D4ED8]',
    softBg: 'bg-[#EFF6FF]',
    dot: 'bg-[#2563EB]',
    border: 'border-[#BFDBFE]',
  },
  Career: {
    text: 'text-[#5B38EE]',
    softBg: 'bg-[#F3EFFF]',
    dot: 'bg-[#6D4AFF]',
    border: 'border-[#DDD6FE]',
  },
  Personal: {
    text: 'text-[#0F766E]',
    softBg: 'bg-[#F0FDFA]',
    dot: 'bg-[#0D9488]',
    border: 'border-[#99F6E4]',
  },
  Other: {
    text: 'text-[#5B5570]',
    softBg: 'bg-[#F5F3FA]',
    dot: 'bg-[#8E87A6]',
    border: 'border-[#E5DFF2]',
  },
};

export const PRIORITY_COLOR: Record<
  TaskPriority,
  {
    text: string;
    softBg: string;
    border: string;
    bar: string;
    label: string;
  }
> = {
  'Must Do': {
    text: 'text-[#C2410C]',
    softBg: 'bg-[#FFF7ED]',
    border: 'border-[#FED7AA]',
    bar: 'bg-[#EA580C]',
    label: 'High priority',
  },
  'Should Do': {
    text: 'text-[#5B38EE]',
    softBg: 'bg-[#F3EFFF]',
    border: 'border-[#DDD6FE]',
    bar: 'bg-[#7C5CFA]',
    label: 'Standard',
  },
  'Can Wait': {
    text: 'text-[#64748B]',
    softBg: 'bg-[#F8FAFC]',
    border: 'border-[#E2E8F0]',
    bar: 'bg-[#94A3B8]',
    label: 'Low priority',
  },
};

export const APPLICATION_STATUS_COLOR: Record<
  ApplicationStatus,
  {
    text: string;
    bg: string;
    border: string;
  }
> = {
  Saved: {
    text: 'text-[#5B5570]',
    bg: 'bg-[#F5F3FA]',
    border: 'border-[#E5DFF2]',
  },
  Applied: {
    text: 'text-[#1D4ED8]',
    bg: 'bg-[#EFF6FF]',
    border: 'border-[#BFDBFE]',
  },
  Assessment: {
    text: 'text-[#C2410C]',
    bg: 'bg-[#FFF7ED]',
    border: 'border-[#FED7AA]',
  },
  Interview: {
    text: 'text-[#5B38EE]',
    bg: 'bg-[#F3EFFF]',
    border: 'border-[#DDD6FE]',
  },
  Offer: {
    text: 'text-[#15803D]',
    bg: 'bg-[#F0FDF4]',
    border: 'border-[#BBF7D0]',
  },
  Rejected: {
    text: 'text-[#6B7280]',
    bg: 'bg-[#F3F4F6]',
    border: 'border-[#E5E7EB]',
  },
};
