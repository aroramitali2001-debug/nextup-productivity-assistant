import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
} from 'lucide-react';
import { TaskRow } from '../components/TaskRow';
import { isSampleApplication } from '../services/storage';
import { CalendarEventItem } from '../services/workspaceApis';
import { JobApplication, StudentProfile, Task } from '../types/nextup';
import {
  addDaysToDateKey,
  compareDeadlineDateTime,
  formatDuration,
  formatFriendlyDate,
  formatFriendlyDateTime,
  isDateTimePast,
  isTaskOverdue,
  parseDateKey,
  toLocalDateKey,
} from '../utils/dateUtils';
import { CATEGORY_COLOR } from '../utils/semanticColors';

function getCalendarEventDateKey(ev: CalendarEventItem): string {
  if (ev.isAllDay) return ev.startIso.slice(0, 10);
  const dt = new Date(ev.startIso);
  if (Number.isNaN(dt.getTime())) return ev.startIso.slice(0, 10);
  return toLocalDateKey(dt);
}

interface UpcomingViewProps {
  profile: StudentProfile;
  tasks: Task[];
  applications: JobApplication[];
  calendarConnected?: boolean;
  calendarEvents?: CalendarEventItem[];
  calendarBusyMinutes?: number;
  onOpenNewTaskForDate: (date: string) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onRescheduleToday: (id: string) => void;
  onEditApplication: (app: JobApplication) => void;
}

export const UpcomingView: React.FC<UpcomingViewProps> = ({
  profile,
  tasks,
  applications,
  calendarConnected = false,
  calendarEvents = [],
  calendarBusyMinutes = 0,
  onOpenNewTaskForDate,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onRescheduleToday,
  onEditApplication,
}) => {
  const today = toLocalDateKey();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'calendar'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const dt = parseDateKey(today);
    return new Date(dt.getFullYear(), dt.getMonth(), 1);
  });

  const nextSevenDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDateKey(today, i);
      const dt = parseDateKey(date);
      const dayTasks = tasks.filter((t) => !t.completed && t.deadline === date);
      const dayFollowUps = applications.filter(
        (a) =>
          a.followUpDate === date &&
          a.status !== 'Rejected' &&
          a.status !== 'Offer'
      );
      const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
      const isHeavy =
        dayTasks.length >= profile.dailyTaskWarningThreshold || totalMinutes >= 240;

      return {
        date,
        weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: dt.getDate(),
        taskCount: dayTasks.length,
        followUpCount: dayFollowUps.length,
        totalMinutes,
        isHeavy,
      };
    });
  }, [tasks, applications, today, profile.dailyTaskWarningThreshold]);

  // Build month calendar grid
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dateKey: string | null; dayNum?: number }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toLocalDateKey(new Date(year, month, d));
      cells.push({ dateKey: key, dayNum: d });
    }
    return cells;
  }, [calendarMonth]);

  const sections = useMemo(() => {
    const now = new Date();
    const activeTasks = tasks
      .filter((t) => !t.completed)
      .sort((a, b) => compareDeadlineDateTime(a.deadline, a.deadlineTime, b.deadline, b.deadlineTime));

    const activeAppsWithFollowUp = applications.filter(
      (a) => a.followUpDate && a.status !== 'Rejected' && a.status !== 'Offer'
    );

    if (selectedDay) {
      const dayEvents = calendarConnected
        ? calendarEvents.filter((ev) => getCalendarEventDateKey(ev) === selectedDay)
        : [];
      const dayCompleted = tasks.filter((t) => t.completed && t.deadline === selectedDay);

      return [
        {
          id: selectedDay,
          title: formatFriendlyDate(selectedDay, today),
          tasks: activeTasks.filter((t) => t.deadline === selectedDay),
          completedTasks: dayCompleted,
          followUps: activeAppsWithFollowUp.filter((a) => a.followUpDate === selectedDay),
          events: dayEvents,
          isOverdue: false,
        },
      ];
    }

    const tomorrow = addDaysToDateKey(today, 1);
    const weekEnd = addDaysToDateKey(today, 6);
    const todayEvents = calendarConnected
      ? calendarEvents.filter((ev) => getCalendarEventDateKey(ev) === today)
      : [];

    const groups = [
      {
        id: 'overdue',
        title: 'Overdue',
        tasks: activeTasks.filter((t) => isTaskOverdue(t, now)),
        completedTasks: [] as Task[],
        followUps: activeAppsWithFollowUp.filter((a) =>
          isDateTimePast(a.followUpDate!, a.followUpTime, now)
        ),
        events: [] as CalendarEventItem[],
        isOverdue: true,
      },
      {
        id: 'today',
        title: 'Today',
        tasks: activeTasks.filter((t) => t.deadline === today && !isTaskOverdue(t, now)),
        completedTasks: [] as Task[],
        followUps: activeAppsWithFollowUp.filter(
          (a) => a.followUpDate === today && !isDateTimePast(a.followUpDate!, a.followUpTime, now)
        ),
        events: todayEvents,
        isOverdue: false,
      },
      {
        id: 'tomorrow',
        title: 'Tomorrow',
        tasks: activeTasks.filter((t) => t.deadline === tomorrow),
        completedTasks: [] as Task[],
        followUps: activeAppsWithFollowUp.filter((a) => a.followUpDate === tomorrow),
        events: [] as CalendarEventItem[],
        isOverdue: false,
      },
      {
        id: 'this-week',
        title: 'Later this week',
        tasks: activeTasks.filter((t) => t.deadline > tomorrow && t.deadline <= weekEnd),
        completedTasks: [] as Task[],
        followUps: activeAppsWithFollowUp.filter(
          (a) => a.followUpDate! > tomorrow && a.followUpDate! <= weekEnd
        ),
        events: [] as CalendarEventItem[],
        isOverdue: false,
      },
      {
        id: 'later',
        title: 'Beyond this week',
        tasks: activeTasks.filter((t) => t.deadline > weekEnd),
        completedTasks: [] as Task[],
        followUps: activeAppsWithFollowUp.filter((a) => a.followUpDate! > weekEnd),
        events: [] as CalendarEventItem[],
        isOverdue: false,
      },
    ];

    return groups.filter(
      (g) => g.tasks.length > 0 || g.followUps.length > 0 || g.events.length > 0 || g.id === 'today'
    );
  }, [tasks, applications, selectedDay, today, calendarConnected, calendarEvents]);

  const selectedDayTasks = selectedDay
    ? tasks.filter((t) => !t.completed && t.deadline === selectedDay)
    : [];
  const selectedDayTotalMins = selectedDayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const selectedDayIsHeavy =
    Boolean(selectedDay) &&
    (selectedDayTasks.length >= profile.dailyTaskWarningThreshold || selectedDayTotalMins >= 240);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DDD6FE] bg-white text-[#6D4AFF] shadow-2xs">
            <Calendar className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1B2E]">📅 Calendar</h1>
            <p className="mt-0.5 text-sm text-[#5B5570]">
              Upcoming events, deadlines, and chronological workload timeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#DFD7F2] bg-[#ECE6FA] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`min-h-[38px] rounded-lg px-3 font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-[#1E1B2E] shadow-xs' : 'text-[#5B5570]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`min-h-[38px] rounded-lg px-3 font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white text-[#1E1B2E] shadow-xs' : 'text-[#5B5570]'
              }`}
            >
              7-Day Strip
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenNewTaskForDate(selectedDay || addDaysToDateKey(today, 1))}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#6D4AFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#5B38EE] transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{selectedDay ? `Add on ${formatFriendlyDate(selectedDay, today)}` : 'Schedule'}</span>
          </button>
        </div>
      </div>

      {calendarConnected && !selectedDay && (
        <section className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF]/75 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2563EB]" />
              <h2 className="text-sm font-semibold text-[#1E1B2E]">
                Today&apos;s Google Calendar commitments
              </h2>
            </div>
            <span className="text-xs font-medium text-[#1D4ED8] tabular-nums">
              {calendarEvents.length === 0
                ? 'Free schedule today'
                : `${calendarEvents.length} event(s) · ${formatDuration(calendarBusyMinutes)} booked`}
            </span>
          </div>

          {calendarEvents.length > 0 && (
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {calendarEvents.slice(0, 6).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#DBEAFE] bg-white px-3 py-2 text-xs"
                >
                  <span className="font-medium text-[#1E1B2E] truncate">{ev.summary}</span>
                  <span className="shrink-0 text-[#1D4ED8] tabular-nums">
                    {ev.isAllDay ? 'All day' : formatDuration(ev.durationMinutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Calendar or 7-Day Strip */}
      {viewMode === 'calendar' ? (
        <section className="rounded-2xl border border-[#E5DFF2] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1E1B2E]">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-xs font-medium text-[#6D4AFF] hover:underline"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5DFF2] text-[#5B5570] hover:bg-[#F1ECFA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const dt = parseDateKey(today);
                  setCalendarMonth(new Date(dt.getFullYear(), dt.getMonth(), 1));
                  setSelectedDay(today);
                }}
                className="min-h-[36px] rounded-xl border border-[#E5DFF2] px-2.5 text-xs font-medium text-[#5B5570] hover:bg-[#F1ECFA]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5DFF2] text-[#5B5570] hover:bg-[#F1ECFA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#7C7594] mb-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateKey) {
                return <div key={`empty-${idx}`} className="min-h-[54px] sm:min-h-[64px]" />;
              }
              const key = cell.dateKey;
              const dayTasks = tasks.filter((t) => !t.completed && t.deadline === key);
              const dayFollowUps = applications.filter(
                (a) => a.followUpDate === key && a.status !== 'Rejected' && a.status !== 'Offer'
              );
              const dayCalEvents = calendarConnected
                ? calendarEvents.filter((ev) => getCalendarEventDateKey(ev) === key)
                : [];
              const isToday = key === today;
              const isSelected = selectedDay === key;
              const hasOverdue = dayTasks.some((t) => isTaskOverdue(t));

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[54px] sm:min-h-[64px] flex-col items-center justify-between rounded-xl border p-1.5 transition-colors ${
                    isSelected
                      ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white'
                      : isToday
                        ? 'border-[#6D4AFF] bg-[#F3EFFF] text-[#1E1B2E]'
                        : hasOverdue
                          ? 'border-[#FECACA] bg-[#FEF2F2]/60 text-[#1E1B2E]'
                          : 'border-[#EDE9F6] bg-[#FAF9FE] text-[#1E1B2E] hover:border-[#C4B5FD]'
                  }`}
                >
                  <span className={`text-xs font-semibold tabular-nums ${isSelected ? 'text-white' : isToday ? 'text-[#6D4AFF]' : ''}`}>
                    {cell.dayNum}
                  </span>

                  <div className="flex flex-wrap items-center justify-center gap-0.5">
                    {dayTasks.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-white' : CATEGORY_COLOR[t.category].dot
                        }`}
                      />
                    ))}
                    {dayFollowUps.length > 0 && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-[#DDD6FE]' : 'bg-[#6D4AFF]'
                        }`}
                      />
                    )}
                    {dayCalEvents.length > 0 && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-[#BFDBFE]' : 'bg-[#2563EB]'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#E5DFF2] bg-white p-3 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B5570]">Next 7 days</span>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-medium text-[#6D4AFF] hover:underline"
              >
                Show full timeline
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {nextSevenDays.map((day) => {
              const isSelected = selectedDay === day.date;
              const loadCount = day.taskCount + day.followUpCount;
              const barPct =
                loadCount === 0
                  ? 0
                  : Math.min(
                      100,
                      Math.max(
                        20,
                        Math.round((loadCount / Math.max(profile.dailyTaskWarningThreshold, 3)) * 100)
                      )
                    );
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day.date)}
                  className={`flex min-h-[84px] flex-col items-center justify-between rounded-xl border p-2 transition-colors ${
                    isSelected
                      ? 'border-[#6D4AFF] bg-[#6D4AFF] text-white'
                      : day.isHeavy
                        ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#1E1B2E] hover:border-[#EA580C]'
                        : 'border-[#E5DFF2] bg-[#FAF9FE] text-[#1E1B2E] hover:border-[#C4B5FD]'
                  }`}
                >
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-white/85' : 'text-[#5B5570]'}`}>
                    {day.weekday}
                  </span>
                  <span className="text-base font-bold tabular-nums">{day.dayNumber}</span>
                  <div className="w-full space-y-1">
                    <div
                      className={`h-1.5 w-full overflow-hidden rounded-full ${
                        isSelected ? 'bg-white/25' : 'bg-[#EAE4F7]'
                      }`}
                    >
                      {barPct > 0 && (
                        <div
                          className={`h-full rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : day.isHeavy
                                ? 'bg-[#EA580C]'
                                : 'bg-[#6D4AFF]'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      )}
                    </div>
                    <span
                      className={`block text-[10px] tabular-nums ${
                        isSelected
                          ? 'text-white/95'
                          : day.isHeavy
                            ? 'font-semibold text-[#C2410C]'
                            : 'text-[#7C7594]'
                      }`}
                    >
                      {loadCount === 0 ? 'Free' : `${loadCount} due`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {selectedDayIsHeavy && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-xs font-medium text-[#9A3412]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#EA580C]" />
          <span className="tabular-nums">
            Heavy day on {formatFriendlyDate(selectedDay!, today)}: {selectedDayTasks.length} tasks ({formatDuration(selectedDayTotalMins)}) scheduled.
          </span>
        </div>
      )}

      {selectedDay && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#DDD6FE] bg-[#F5F1FF] px-4 py-2.5 text-xs">
          <span className="font-medium text-[#4C2F96]">
            Showing schedule for{' '}
            <strong className="font-semibold text-[#1E1B2E]">
              {formatFriendlyDate(selectedDay, today)}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
          >
            Show all dates
          </button>
        </div>
      )}

      {/* Grouped Chronological Timeline */}
      <div className="space-y-4">
        {sections.map((section) => {
          const totalItems =
            section.tasks.length + section.followUps.length + section.events.length;
          const totalMins = section.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

          return (
            <section key={section.id} className="rounded-2xl border border-[#E5DFF2] bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#F1ECFA] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <Calendar className={`h-4 w-4 ${section.isOverdue ? 'text-[#DC2626]' : 'text-[#6D4AFF]'}`} />
                  <h2 className={`text-base font-semibold ${section.isOverdue ? 'text-[#991B1B]' : 'text-[#1E1B2E]'}`}>
                    {section.title}
                  </h2>
                </div>
                <span className="text-xs text-[#5B5570] tabular-nums">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  {totalMins > 0 ? ` · ${formatDuration(totalMins)}` : ''}
                </span>
              </div>

              {totalItems === 0 && section.completedTasks.length === 0 ? (
                <div className="px-5 py-7 text-center text-sm text-[#5B5570]">
                  Nothing scheduled for {section.title.toLowerCase()}.
                </div>
              ) : (
                <div className="divide-y divide-[#F1ECFA]">
                  {section.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-3 bg-[#EFF6FF]/45 px-4 py-3 sm:px-5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1E1B2E] truncate">{ev.summary}</p>
                          <p className="text-xs text-[#1D4ED8] tabular-nums">
                            Google Calendar ·{' '}
                            {ev.isAllDay
                              ? 'All day'
                              : `${new Date(ev.startIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${formatDuration(ev.durationMinutes)})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {section.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      allTasks={tasks}
                      onToggleComplete={onToggleTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onRescheduleToday={onRescheduleToday}
                    />
                  ))}

                  {section.followUps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                      <button
                        type="button"
                        onClick={() => onEditApplication(app)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#6D4AFF]">
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1E1B2E] hover:text-[#6D4AFF] truncate">
                            Follow up: {app.company} ({app.role})
                          </p>
                          <p className="mt-0.5 text-xs text-[#5B5570] tabular-nums">
                            {app.status} · Due {formatFriendlyDateTime(app.followUpDate!, app.followUpTime, today)}
                            {app.nextAction ? ` · ${app.nextAction}` : ''}
                            {isSampleApplication(app) ? ' · Sample' : ''}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditApplication(app)}
                        className="min-h-[40px] shrink-0 rounded-xl px-3 text-xs font-medium text-[#6D4AFF] hover:bg-[#F1ECFA] transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))}

                  {section.completedTasks.length > 0 && (
                    <div className="bg-[#FAF8FF]/70">
                      <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[#15803D] sm:px-5">
                        Completed ({section.completedTasks.length})
                      </p>
                      <div className="divide-y divide-[#F1ECFA]">
                        {section.completedTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            allTasks={tasks}
                            onToggleComplete={onToggleTask}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
