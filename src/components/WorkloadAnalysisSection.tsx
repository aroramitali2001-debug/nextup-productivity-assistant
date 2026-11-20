import React from 'react';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { WeeklySummary, WorkloadMetrics } from '../types/nextup';
import { formatDuration, formatHoursDecimal } from '../utils/dateUtils';

interface WorkloadAnalysisSectionProps {
  workload: WorkloadMetrics;
  weeklySummary: WeeklySummary;
  dailyTaskWarningThreshold: number;
  calendarConnected?: boolean;
  calendarBusyMinutes?: number;
  onChangeAvailableHours: (hours: number) => void;
  onOpenReplan: () => void;
  onOpenUpcoming: () => void;
}

export const WorkloadAnalysisSection: React.FC<WorkloadAnalysisSectionProps> = ({
  workload,
  weeklySummary,
  dailyTaskWarningThreshold,
  calendarConnected = false,
  calendarBusyMinutes = 0,
  onChangeAvailableHours,
  onOpenReplan,
  onOpenUpcoming,
}) => {
  const maxBarTasks = Math.max(1, ...weeklySummary.days.map((d) => d.total));
  const capacityRatio =
    workload.availableHoursToday > 0
      ? Math.min(100, Math.round((workload.hoursToday / workload.availableHoursToday) * 100))
      : 100;

  return (
    <section className="rounded-2xl border border-[#E5DFF2] bg-white p-4 sm:p-5 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#1E1B2E]">Workload Analysis</h2>
          <p className="text-xs text-[#5B5570]">
            Comparing planned hours against your realistic available time
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 text-[#6D4AFF]" />
          <label htmlFor="dash-avail-hours" className="text-[#5B5570] whitespace-nowrap">
            Available today:
          </label>
          <select
            id="dash-avail-hours"
            value={workload.availableHoursToday}
            onChange={(e) => onChangeAvailableHours(Number(e.target.value))}
            className="rounded-lg border border-[#E5DFF2] bg-[#FAF9FE] px-2 py-1 text-xs font-semibold text-[#1E1B2E] tabular-nums focus:border-[#6D4AFF] focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((h) => (
              <option key={h} value={h}>
                {h}h
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Workload Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-[#F7F5FC] p-3">
          <p className="text-[11px] font-medium text-[#5B5570]">Hours today</p>
          <p className="mt-1 text-lg font-bold text-[#1E1B2E] tabular-nums">
            {formatHoursDecimal(workload.hoursToday)}
          </p>
          <p className="text-[11px] text-[#7C7594] tabular-nums">{workload.tasksDueToday} due today</p>
        </div>

        <div className="rounded-xl bg-[#F7F5FC] p-3">
          <p className="text-[11px] font-medium text-[#5B5570]">Hours this week</p>
          <p className="mt-1 text-lg font-bold text-[#1E1B2E] tabular-nums">
            {formatHoursDecimal(workload.hoursThisWeek)}
          </p>
          <p className="text-[11px] text-[#7C7594] tabular-nums">{workload.tasksDueThisWeek} due this week</p>
        </div>

        <div className="rounded-xl bg-[#FFF7ED] p-3">
          <p className="text-[11px] font-medium text-[#C2410C]">High priority</p>
          <p className="mt-1 text-lg font-bold text-[#C2410C] tabular-nums">
            {workload.highPriorityCount}
          </p>
          <p className="text-[11px] text-[#B45309] tabular-nums">
            {workload.overdueCount} overdue
          </p>
        </div>

        <div className="rounded-xl bg-[#F0FDF4] p-3">
          <p className="text-[11px] font-medium text-[#15803D]">Completed</p>
          <p className="mt-1 text-lg font-bold text-[#15803D] tabular-nums">
            {workload.completedTotalCount}
          </p>
          <p className="text-[11px] text-[#15803D] tabular-nums">
            {workload.completedTodayCount} done today
          </p>
        </div>
      </div>

      {calendarConnected && (
        <div className="flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs text-[#1D4ED8] tabular-nums">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            Google Calendar connected: {formatDuration(calendarBusyMinutes)} booked in calendar events today.
          </span>
        </div>
      )}

      {/* Capacity vs Available Time Bar + Actionable Guidance */}
      <div
        className={`rounded-xl border p-3.5 ${
          workload.isOverloadedToday
            ? 'border-[#FECACA] bg-[#FEF2F2]'
            : 'border-[#E5DFF2] bg-[#FAF9FE]'
        }`}
      >
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className={`font-semibold ${workload.isOverloadedToday ? 'text-[#B91C1C]' : 'text-[#1E1B2E]'}`}>
            Today&apos;s capacity: {formatDuration(workload.remainingMinutesToday)} planned / {workload.availableHoursToday}h available
          </span>
          <span className="font-semibold text-[#5B5570]">{capacityRatio}%</span>
        </div>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E5DFF2]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              workload.isOverloadedToday ? 'bg-[#DC2626]' : 'bg-[#6D4AFF]'
            }`}
            style={{ width: `${capacityRatio}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-xs leading-relaxed text-[#5B5570]">
            {workload.isOverloadedToday && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
            )}
            <p className={workload.isOverloadedToday ? 'text-[#991B1B]' : ''}>
              {workload.workloadGuidance}
            </p>
          </div>
          {workload.isOverloadedToday && (
            <button
              type="button"
              onClick={onOpenReplan}
              className="shrink-0 rounded-lg bg-white border border-[#FECACA] px-3 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2] whitespace-nowrap"
            >
              Replan
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Workload Visualisation */}
      <div>
        <div className="flex items-center justify-between text-xs text-[#5B5570]">
          <span className="font-medium text-[#1E1B2E]">This week&apos;s daily load</span>
          <button type="button" onClick={onOpenUpcoming} className="font-medium text-[#6D4AFF] hover:underline">
            Calendar view
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2 items-end">
          {weeklySummary.days.map((day) => {
            const barHeight = day.total === 0 ? 8 : Math.max(18, Math.round((day.total / maxBarTasks) * 68));
            const isHeavy = day.total >= dailyTaskWarningThreshold || day.minutes >= 240;

            return (
              <button
                key={day.date}
                type="button"
                onClick={onOpenUpcoming}
                className="flex flex-col items-center gap-1 rounded-xl py-1 hover:bg-[#F7F5FC] transition-colors"
              >
                <span className="text-[11px] font-medium text-[#7C7594] tabular-nums">
                  {day.total > 0 ? day.total : ''}
                </span>
                <div className="flex h-20 w-full items-end justify-center px-1">
                  <div
                    className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                      day.total === 0
                        ? 'bg-[#EDE9F6]'
                        : isHeavy
                          ? 'bg-[#EA580C]'
                          : day.isToday
                            ? 'bg-[#6D4AFF]'
                            : 'bg-[#A78BFA]'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <div className="text-center">
                  <p className={`text-[11px] font-medium ${day.isToday ? 'text-[#6D4AFF]' : 'text-[#5B5570]'}`}>
                    {day.shortDay}
                  </p>
                  <p className={`text-[11px] tabular-nums ${day.isToday ? 'font-bold text-[#6D4AFF]' : 'text-[#7C7594]'}`}>
                    {day.dayNum}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
