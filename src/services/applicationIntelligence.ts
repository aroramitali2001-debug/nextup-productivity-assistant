import { ApplicationStatus, JobApplication, SuggestedTaskDraft } from '../types/nextup';
import { addDaysToDateKey, toLocalDateKey } from '../utils/dateUtils';

export function suggestFollowUpForNewApplication(app: JobApplication): SuggestedTaskDraft {
  const baseDate = app.applicationDate || toLocalDateKey();
  const suggestedDate = app.followUpDate || addDaysToDateKey(baseDate, 7);

  return {
    id: `sug-followup-${app.id}`,
    selected: true,
    title: `Follow up with ${app.company} (${app.role})`,
    category: 'Career',
    deadline: suggestedDate,
    deadlineTime: app.followUpTime,
    priority: 'Should Do',
    estimatedMinutes: 15,
    notes: app.recruiterContact
      ? `Contact: ${app.recruiterContact}`
      : `Check application portal or reach out on LinkedIn for ${app.company}.`,
  };
}

export function suggestTasksForStatusChange(
  app: JobApplication,
  newStatus: ApplicationStatus
): SuggestedTaskDraft[] {
  const today = toLocalDateKey();
  const inTwoDays = addDaysToDateKey(today, 2);
  const inThreeDays = addDaysToDateKey(today, 3);

  if (newStatus === 'Interview') {
    return [
      {
        id: `sug-int-1-${app.id}`,
        selected: true,
        title: `Research ${app.company} products, mission & recent news`,
        category: 'Career',
        deadline: today,
        priority: 'Must Do',
        estimatedMinutes: 30,
        notes: `Interview prep for ${app.role}`,
      },
      {
        id: `sug-int-2-${app.id}`,
        selected: true,
        title: `Review ${app.role} job description & align STAR stories`,
        category: 'Career',
        deadline: addDaysToDateKey(today, 1),
        priority: 'Must Do',
        estimatedMinutes: 45,
      },
      {
        id: `sug-int-3-${app.id}`,
        selected: true,
        title: `Practice technical & behavioral interview questions for ${app.company}`,
        category: 'Career',
        deadline: inTwoDays,
        priority: 'Must Do',
        estimatedMinutes: 60,
      },
      {
        id: `sug-int-4-${app.id}`,
        selected: true,
        title: `Prepare 3 thoughtful questions for ${app.company} interviewer`,
        category: 'Career',
        deadline: inTwoDays,
        priority: 'Should Do',
        estimatedMinutes: 20,
      },
    ];
  }

  if (newStatus === 'Assessment') {
    return [
      {
        id: `sug-oa-1-${app.id}`,
        selected: true,
        title: `Review ${app.company} assessment instructions & deadline`,
        category: 'Career',
        deadline: today,
        priority: 'Must Do',
        estimatedMinutes: 15,
      },
      {
        id: `sug-oa-2-${app.id}`,
        selected: true,
        title: `Prepare required materials & environment for ${app.company} assessment`,
        category: 'Career',
        deadline: addDaysToDateKey(today, 1),
        priority: 'Should Do',
        estimatedMinutes: 30,
      },
      {
        id: `sug-oa-3-${app.id}`,
        selected: true,
        title: `Complete ${app.company} ${app.role} assessment`,
        category: 'Career',
        deadline: app.followUpDate || inThreeDays,
        deadlineTime: app.followUpTime,
        priority: 'Must Do',
        estimatedMinutes: 90,
      },
    ];
  }

  if (newStatus === 'Offer') {
    return [
      {
        id: `sug-off-1-${app.id}`,
        selected: true,
        title: `Review ${app.company} offer letter, timeline & terms`,
        category: 'Career',
        deadline: today,
        priority: 'Must Do',
        estimatedMinutes: 30,
      },
      {
        id: `sug-off-2-${app.id}`,
        selected: true,
        title: `Compare compensation, benefits & growth for ${app.company}`,
        category: 'Career',
        deadline: addDaysToDateKey(today, 1),
        priority: 'Should Do',
        estimatedMinutes: 45,
      },
      {
        id: `sug-off-3-${app.id}`,
        selected: true,
        title: `Evaluate ${app.role} against career goals & prepare HR questions`,
        category: 'Career',
        deadline: inTwoDays,
        priority: 'Should Do',
        estimatedMinutes: 30,
      },
    ];
  }

  return [];
}
