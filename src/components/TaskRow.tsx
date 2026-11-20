import React, { useState } from 'react';
import { CalendarArrowUp, Check, ChevronDown, ChevronUp, Clock, Link2, Pencil, Trash2 } from 'lucide-react';
import { isSampleTask } from '../services/storage';
import { Task } from '../types/nextup';
import { formatDuration, formatFriendlyDateTime, isTaskOverdue, toLocalDateKey } from '../utils/dateUtils';
import { CATEGORY_COLOR, PRIORITY_COLOR } from '../utils/semanticColors';

interface TaskRowProps {
  task: Task;
  allTasks?: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onRescheduleToday?: (id: string) => void;
  priorityReason?: string;
  compact?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  allTasks = [],
  onToggleComplete,
  onEdit,
  onDelete,
  onRescheduleToday,
  priorityReason,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const today = toLocalDateKey();
  const overdue = isTaskOverdue(task);

  const catStyle = CATEGORY_COLOR[task.category];
  const prioStyle = PRIORITY_COLOR[task.priority];

  const dependencyNames = (task.dependencies ?? [])
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter((t): t is Task => Boolean(t));

  const hasExpandableDetails = Boolean(task.notes || dependencyNames.length > 0);
  const deadlineLabel = formatFriendlyDateTime(task.deadline, task.deadlineTime, today);

  return (
    <div
      className={`group transition-colors duration-150 ${
        compact ? 'py-3 px-4 sm:px-5' : 'px-4 py-3.5 sm:px-5'
      } ${
        task.completed
          ? 'bg-[#F0FDF4]/55 opacity-80'
          : overdue
            ? 'bg-[#FEF2F2]/65 hover:bg-[#FEF2F2]/90'
            : task.priority === 'Must Do'
              ? 'bg-[#FFFBF7] hover:bg-[#FFF7ED]/70'
              : 'bg-white hover:bg-[#FAF8FF]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Completion Checkbox (44px touch target) */}
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
          className="flex h-11 w-11 -ml-2 -mt-1.5 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D4AFF]"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors duration-150 ${
              task.completed
                ? 'border-[#16A34A] bg-[#16A34A] text-white'
                : overdue
                  ? 'border-[#DC2626] bg-white hover:bg-[#FEF2F2]'
                  : task.priority === 'Must Do'
                    ? 'border-[#EA580C] bg-white hover:bg-[#FFF7ED]'
                    : 'border-[#C9BFE3] bg-white hover:border-[#6D4AFF] hover:bg-[#F3EFFF]'
            }`}
          >
            {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
          </span>
        </button>

        {/* Main Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => (hasExpandableDetails ? setExpanded((v) => !v) : onEdit(task))}
              className={`text-left text-[15px] leading-snug font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#6D4AFF] ${
                task.completed
                  ? 'text-[#5B5570] line-through'
                  : 'text-[#1E1B2E] hover:text-[#5B38EE]'
              }`}
            >
              {task.title}
            </button>
          </div>

          {/* Semantic Metadata Row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] tabular-nums">
            <span className={`inline-flex items-center gap-1.5 font-medium ${catStyle.text}`}>
              <span className={`h-2 w-2 rounded-full ${catStyle.dot}`} aria-hidden="true" />
              {task.category}
            </span>
            <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
            {task.completed ? (
              <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-1.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
                Completed
              </span>
            ) : (
              <span
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${prioStyle.softBg} ${prioStyle.text} ${prioStyle.border}`}
              >
                {task.priority}
              </span>
            )}
            <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
            <span className="text-[#5B5570]">{formatDuration(task.estimatedMinutes)}</span>
            <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-[#DC2626]' : 'text-[#5B5570]'}`}>
              {task.deadlineTime && <Clock className="h-3 w-3 opacity-80" />}
              {overdue ? `Overdue (${deadlineLabel})` : deadlineLabel}
            </span>
            {task.takingLonger && !task.completed && (
              <>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className="font-medium text-[#C2410C]">Taking longer</span>
              </>
            )}
            {isSampleTask(task) && (
              <>
                <span aria-hidden="true" className="text-[#C9BFE3]">·</span>
                <span className="text-xs font-medium text-[#8E87A6]">Sample</span>
              </>
            )}
          </div>

          {priorityReason && !task.completed && (
            <p className="mt-1 text-xs font-medium text-[#6D4AFF] tabular-nums">
              Focus reason: {priorityReason}
            </p>
          )}

          {dependencyNames.length > 0 && !expanded && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[#5B5570]">
              <Link2 className="h-3 w-3 shrink-0 text-[#6D4AFF]" />
              <span className="truncate">
                Depends on: {dependencyNames.map((d) => d.title).join(', ')}
              </span>
            </p>
          )}

          {(expanded || (!compact && task.notes)) && hasExpandableDetails && (
            <div className="mt-2 space-y-1.5 text-[13px] text-[#5B5570]">
              {task.notes && (
                <p className={`leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{task.notes}</p>
              )}
              {dependencyNames.length > 0 && expanded && (
                <div className="text-xs text-[#5B5570]">
                  <span className="font-medium text-[#1E1B2E]">Prerequisites: </span>
                  {dependencyNames.map((d, i) => (
                    <span key={d.id} className={d.completed ? 'line-through text-[#15803D]' : ''}>
                      {i > 0 ? ', ' : ''}
                      {d.title} {d.completed ? '(done)' : '(pending)'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-0.5 -mr-1.5 -mt-1">
          {hasExpandableDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              className="flex h-11 w-9 items-center justify-center rounded-xl text-[#7C7594] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          {overdue && onRescheduleToday && (
            <button
              type="button"
              onClick={() => onRescheduleToday(task.id)}
              title="Move deadline to Today"
              aria-label={`Move "${task.title}" to Today`}
              className="flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium text-[#6D4AFF] hover:bg-[#EDE9FE] transition-colors whitespace-nowrap"
            >
              <CalendarArrowUp className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit "${task.title}"`}
            className="flex h-11 w-10 items-center justify-center rounded-xl text-[#7C7594] hover:bg-[#F1ECFA] hover:text-[#1E1B2E] transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            aria-label={`Delete "${task.title}"`}
            className="flex h-11 w-10 items-center justify-center rounded-xl text-[#7C7594] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
