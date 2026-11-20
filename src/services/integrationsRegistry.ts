import { IntegrationId } from '../types/nextup';

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  tagline: string;
  onboardingDescription: string;
  connectButtonLabel: string;
  availableInEnvironment: boolean;
  unavailableReason: string;
  permissionsSummary: string;
  capabilities: string[];
}

export const INTEGRATIONS_CATALOG: IntegrationDefinition[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    tagline: 'Sync classes, meetings, interviews, and available focus windows.',
    onboardingDescription:
      'Sync your classes, meetings, interviews and events. NextUp can use your schedule to understand your available time and recommend realistic plans.',
    connectButtonLabel: 'Connect Google Calendar',
    availableInEnvironment: false,
    unavailableReason:
      'Connection setup coming soon — official Google Calendar OAuth is not enabled in this workspace yet.',
    permissionsSummary: 'Read-only access to calendar events and free/busy availability (no password ever requested).',
    capabilities: [
      'View classes, meetings, and interviews in your Morning Briefing',
      'Calculate real available hours between scheduled events',
      'Spot conflicts between calendar commitments and task deadlines',
      'Suggest time blocks with your explicit approval',
    ],
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    tagline: 'Synchronise internship and job application spreadsheets.',
    onboardingDescription:
      'Track your job and internship applications, follow-ups and application status in one place.',
    connectButtonLabel: 'Connect Google Sheets',
    availableInEnvironment: false,
    unavailableReason:
      'Connection setup coming soon — official Google Sheets OAuth is not enabled in this workspace yet.',
    permissionsSummary: 'Read and update access limited to your chosen application tracking spreadsheet.',
    capabilities: [
      'Sync company, role, date applied, and status rows',
      'Keep follow-up dates aligned between NextUp and your sheet',
      'Share clean placement trackers with mentors or career coaches',
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    tagline: 'Surface interview invites, assessments, offers, and recruiter replies.',
    onboardingDescription:
      'Help NextUp identify interview invitations, assessment requests, recruiter updates, rejections and offers.',
    connectButtonLabel: 'Connect Gmail',
    availableInEnvironment: false,
    unavailableReason:
      'Connection setup coming soon — official Gmail read-only OAuth is not enabled in this workspace yet.',
    permissionsSummary: 'Read-only scan of application-related messages only; never sends emails or requests your password.',
    capabilities: [
      'Detect interview invitations and online assessment deadlines',
      'Spot recruiter follow-ups, offers, and application acknowledgements',
      'Suggest status updates and prep tasks for your approval',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    tagline: 'Receive briefings, midday check-ins, and deadline nudges.',
    onboardingDescription:
      'Receive your morning briefing, midday check-in and important reminders directly on WhatsApp.',
    connectButtonLabel: 'Connect WhatsApp',
    availableInEnvironment: false,
    unavailableReason:
      'Connection setup coming soon — an approved WhatsApp Business integration is required before messages can be delivered.',
    permissionsSummary: 'Opt-in notification delivery only via approved WhatsApp Business messaging; no WhatsApp credentials requested.',
    capabilities: [
      'Send Your Morning Briefing at your chosen briefing time',
      'Deliver Midday Check-in nudges to rebalance your afternoon',
      'Alert you on urgent deadlines and application follow-ups',
    ],
  },
];
