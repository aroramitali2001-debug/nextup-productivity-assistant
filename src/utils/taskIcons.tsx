import React from 'react';
import {
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartPulse,
  Send,
  ShoppingBag,
  Tag,
  User,
  Video,
} from 'lucide-react';
import { Task, TaskCategory } from '../types/nextup';

interface IconProps {
  className?: string;
}

export const CategoryIcon: React.FC<IconProps & { category: TaskCategory }> = ({
  category,
  className = 'h-3.5 w-3.5 shrink-0',
}) => {
  switch (category) {
    case 'College':
      return <GraduationCap className={className} aria-hidden="true" />;
    case 'Career':
      return <Briefcase className={className} aria-hidden="true" />;
    case 'Personal':
      return <User className={className} aria-hidden="true" />;
    default:
      return <Tag className={className} aria-hidden="true" />;
  }
};

export type TaskIconKind =
  | 'interview'
  | 'assessment'
  | 'outreach'
  | 'submission'
  | 'coursework'
  | 'health'
  | 'errand'
  | 'category';

export function detectTaskIconKind(task: Pick<Task, 'title' | 'notes' | 'category'>): TaskIconKind {
  const text = `${task.title} ${task.notes ?? ''}`.toLowerCase();

  if (
    /\b(interview|mock interview|technical round|system design|phone screen|coffee chat|behavioral|screening|recruiter call)\b/.test(
      text
    )
  ) {
    return 'interview';
  }

  if (
    /\b(exam|midterm|final|quiz|assessment|hackerrank|codility|codesignal|take-home|take home|online test|oa)\b/.test(
      text
    )
  ) {
    return 'assessment';
  }

  if (
    /\b(follow[- ]?up|recruiter|thank[- ]?you|referral|outreach|email|linkedin|apply|application)\b/.test(
      text
    )
  ) {
    return 'outreach';
  }

  if (
    /\b(resume|cv|cover letter|portfolio|submit|submission|report|essay|paper|slides|presentation|demo)\b/.test(
      text
    )
  ) {
    return 'submission';
  }

  if (
    /\b(assignment|lab|homework|problem set|pset|reading|lecture|syllabus|study|notes|review|project|research|dsa|leetcode)\b/.test(
      text
    )
  ) {
    return 'coursework';
  }

  if (/\b(doctor|dentist|gym|workout|run|health|meds|therapy|sleep)\b/.test(text)) {
    return 'health';
  }

  if (/\b(groceries|grocery|errand|shopping|buy|pay|rent|laundry|clean|pack|renew)\b/.test(text)) {
    return 'errand';
  }

  return 'category';
}

export const TaskContextIcon: React.FC<
  IconProps & { task: Pick<Task, 'title' | 'notes' | 'category'> }
> = ({ task, className = 'h-3.5 w-3.5 shrink-0' }) => {
  const kind = detectTaskIconKind(task);

  switch (kind) {
    case 'interview':
      return <Video className={className} aria-hidden="true" />;
    case 'assessment':
      return <ClipboardCheck className={className} aria-hidden="true" />;
    case 'outreach':
      return <Send className={className} aria-hidden="true" />;
    case 'submission':
      return <FileText className={className} aria-hidden="true" />;
    case 'coursework':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'health':
      return <HeartPulse className={className} aria-hidden="true" />;
    case 'errand':
      return <ShoppingBag className={className} aria-hidden="true" />;
    default:
      return <CategoryIcon category={task.category} className={className} />;
  }
};
